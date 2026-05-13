"use client";

import { useEffect, useRef, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const kybDocs = [
  { type: 'commercial_register', label: 'Commercial Register' },
  { type: 'tax_certificate', label: 'Tax Certificate' },
  { type: 'articles_of_association', label: 'Articles of Association' },
  { type: 'bank_rib', label: 'Bank RIB' },
  { type: 'representative_cin', label: 'Representative CIN' }
];

const categories = ['electronics', 'fashion', 'home_appliances', 'furniture', 'health', 'education', 'automotive', 'other'];

type Merchant = { id: string; legalName: string; displayName: string; category: string; state: string; settlementIban?: string; contactEmail?: string; contactPhone?: string; ownerEmail?: string };
type KybDoc = { type: string; fileName: string; storagePath?: string; uploadedAt?: string };
type KybApp = { id: string; state: string; documents: KybDoc[]; missingDocuments: string[]; rejectionReason?: string } | null;

export default function MerchantKybPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [kyb, setKyb] = useState<KybApp>(null);
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('other');
  const [settlementIban, setSettlementIban] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    const stored = localStorage.getItem('bnpl_merchant');
    if (!stored) { window.location.href = '/merchant/login'; return; }
    const saved = JSON.parse(stored) as Merchant;
    async function load() {
      try {
        const [merchantRes, kybRes] = await Promise.all([fetch(`${apiBaseUrl}/merchants/${saved.id}`), fetch(`${apiBaseUrl}/merchants/${saved.id}/kyb`)]);
        const fresh = await merchantRes.json() as Merchant;
        const latest = kybRes.ok ? await kybRes.json() as KybApp : null;
        setMerchant(fresh); setKyb(latest); localStorage.setItem('bnpl_merchant', JSON.stringify(fresh));
        setLegalName(fresh.legalName ?? ''); setDisplayName(fresh.displayName ?? ''); setCategory(fresh.category ?? 'other'); setSettlementIban(fresh.settlementIban ?? ''); setContactEmail(fresh.contactEmail ?? fresh.ownerEmail ?? ''); setContactPhone(fresh.contactPhone ?? '');
      } catch {
        setMerchant(saved); setLegalName(saved.legalName ?? ''); setDisplayName(saved.displayName ?? ''); setCategory(saved.category ?? 'other'); setContactEmail(saved.contactEmail ?? saved.ownerEmail ?? '');
      }
    }
    void load();
  }, []);

  async function saveKyb() {
    if (!merchant) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const merchantRes = await fetch(`${apiBaseUrl}/merchants/${merchant.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ legalName, displayName, category, settlementIban: settlementIban || undefined, contactEmail: contactEmail || undefined, contactPhone: contactPhone || undefined }) });
      if (!merchantRes.ok) { const p = await merchantRes.json().catch(() => null) as { message?: string } | null; setMessage({ type: 'error', text: p?.message ?? 'Could not update business info.' }); return; }
      const uploadedDocs: KybDoc[] = [];
      for (const doc of kybDocs) {
        const file = fileRefs.current.get(doc.type)?.files?.[0];
        if (!file) continue;
        const form = new FormData(); form.append('file', file); form.append('type', doc.type);
        const uploadRes = await fetch(`${apiBaseUrl}/merchants/${merchant.id}/kyb/upload`, { method: 'POST', body: form });
        if (!uploadRes.ok) { const p = await uploadRes.json().catch(() => null) as { message?: string } | null; setMessage({ type: 'error', text: p?.message ?? `Could not upload ${doc.label}.` }); return; }
        uploadedDocs.push(await uploadRes.json() as KybDoc);
      }
      const existingDocs = kyb?.documents ?? [];
      const merged = new Map(existingDocs.map((doc) => [doc.type, doc]));
      uploadedDocs.forEach((doc) => merged.set(doc.type, doc));
      const kybRes = await fetch(`${apiBaseUrl}/merchants/${merchant.id}/kyb`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: Array.from(merged.values()) }) });
      const latest = await kybRes.json().catch(() => null) as KybApp | { message?: string } | null;
      if (!kybRes.ok || !latest || !('documents' in latest)) { setMessage({ type: 'error', text: (latest as { message?: string } | null)?.message ?? 'Could not update KYB.' }); return; }
      setKyb(latest);
      setMessage({ type: 'success', text: latest.missingDocuments.length ? `Saved. Still missing: ${latest.missingDocuments.join(', ')}` : 'KYB updated and submitted for admin review.' });
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  if (!merchant) return <main className="min-h-screen bg-slate-950 p-6 text-white"><p>Loading KYB...</p></main>;

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-6xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-teal-300">Merchant KYB</p><h1 className="text-4xl font-black">Update your business verification</h1><p className="mt-2 text-slate-300">Existing details are pre-filled. Upload a new file only when you want to replace a document.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/merchant/dashboard">Dashboard</a></header>
    {message ? <div className={`mt-6 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}
    {kyb ? <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">Current KYB state: <span className="text-teal-200">{kyb.state}</span>{kyb.rejectionReason ? <span className="text-rose-200"> · rejected: {kyb.rejectionReason}</span> : null}</div> : null}
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Business information</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Legal name" /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" /><select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={settlementIban} onChange={e => setSettlementIban(e.target.value)} placeholder="Settlement IBAN" /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Contact email" /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Contact phone" /></div></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">KYB documents</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{kybDocs.map(doc => { const current = kyb?.documents.find(d => d.type === doc.type); return <label key={doc.type} className="rounded-2xl border border-white/10 bg-white/5 p-4"><span className="font-bold">{doc.label}</span>{current ? <p className="mt-2 text-sm text-teal-200">Current: {current.fileName}</p> : <p className="mt-2 text-sm text-rose-200">Missing</p>}<input className="mt-3 block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-teal-300 file:px-4 file:py-2 file:font-bold file:text-slate-950" type="file" ref={el => { if (el) fileRefs.current.set(doc.type, el); }} /><p className="mt-2 text-xs text-slate-500">Choose a new file to replace this document.</p></label>; })}</div><button className="mt-6 rounded-2xl bg-teal-300 px-6 py-3 font-black text-slate-950 disabled:opacity-60" disabled={submitting} onClick={() => void saveKyb()}>{submitting ? 'Saving...' : 'Save business info and submit KYB update'}</button></section>
  </div></main>;
}
