"use client";

import { useRef, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const kybDocs = [
  { type: 'commercial_register', label: 'Commercial Register (Registre de Commerce)' },
  { type: 'tax_certificate', label: 'Tax Certificate (Patente)' },
  { type: 'articles_of_association', label: 'Articles of Association (Statuts)' },
  { type: 'bank_rib', label: 'Bank RIB (Proof of Bank Account)' },
  { type: 'representative_cin', label: 'Representative CIN (ID of Legal Representative)' }
];

const categories = ['electronics', 'fashion', 'home_appliances', 'furniture', 'health', 'education', 'automotive', 'other'];

export default function MerchantRegisterPage() {
  const [step, setStep] = useState<'info' | 'kyb' | 'done'>('info');
  const [merchantId, setMerchantId] = useState('');
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('electronics');
  const [settlementIban, setSettlementIban] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  async function registerMerchant() {
    if (!legalName.trim() || !displayName.trim()) { setMessage({ type: 'error', text: 'Legal name and display name are required.' }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/merchants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalName, displayName, category, settlementIban: settlementIban || undefined, contactEmail: contactEmail || undefined, contactPhone: contactPhone || undefined })
      });
      if (!res.ok) {
        const p = await res.json().catch(() => null) as { message?: string } | null;
        setMessage({ type: 'error', text: p?.message ?? `Registration failed (${res.status})` });
        return;
      }
      const merchant = await res.json() as { id: string };
      setMerchantId(merchant.id);
      setStep('kyb');
      setMessage({ type: 'success', text: `Merchant registered as ${merchant.id}. Now upload your KYB documents.` });
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitKyb() {
    setSubmitting(true);
    setMessage(null);

    const uploads: { type: string; fileName: string; storagePath: string }[] = [];
    for (const doc of kybDocs) {
      const input = fileRefs.current.get(doc.type);
      const file = input?.files?.[0];
      if (!file) continue;
      const form = new FormData();
      form.append('file', file);
      form.append('type', doc.type);
      try {
        const res = await fetch(`${apiBaseUrl}/merchants/${merchantId}/kyb/upload`, { method: 'POST', body: form });
        if (!res.ok) {
          const p = await res.json().catch(() => null) as { message?: string } | null;
          setMessage({ type: 'error', text: p?.message ?? `Upload failed for ${doc.label}` });
          setSubmitting(false);
          return;
        }
        const uploaded = await res.json() as { type: string; fileName: string; storagePath: string };
        uploads.push(uploaded);
      } catch {
        setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
        setSubmitting(false);
        return;
      }
    }

    if (!uploads.length) { setMessage({ type: 'error', text: 'Please upload at least one document.' }); setSubmitting(false); return; }

    try {
      const res = await fetch(`${apiBaseUrl}/merchants/${merchantId}/kyb/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: uploads })
      });
      const payload = await res.json().catch(() => null) as { message?: string; missingDocuments?: string[] } | null;
      if (!res.ok) {
        const missing = (payload as { missingDocuments?: string[] })?.missingDocuments;
        setMessage({ type: 'error', text: missing?.length ? `Missing documents: ${missing.join(', ')}` : payload?.message ?? `Submission failed (${res.status})` });
        return;
      }
      setStep('done');
      setMessage({ type: 'success', text: 'KYB application submitted successfully. An admin will review your documents.' });
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-5xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div><p className="text-teal-300">Merchant onboarding</p><h1 className="text-4xl font-black">Register your business</h1><p className="mt-3 max-w-2xl text-slate-300">Register as a merchant to sell products through the BNPL marketplace. You must complete KYB verification before you can publish products.</p></div>
      <a className="rounded-full border border-white/15 px-5 py-3 text-center" href="/merchant">Merchant portal</a>
    </header>

    {message ? <div className={`mt-6 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}

    {step === 'info' && <section className="glass mt-8 rounded-3xl p-6">
      <h2 className="text-2xl font-black">Business information</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Legal name (e.g. TechStore SARL)" value={legalName} onChange={e => setLegalName(e.target.value)} />
        <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Display name (e.g. TechStore Tunis)" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>
        <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Settlement IBAN (e.g. TN59...)" value={settlementIban} onChange={e => setSettlementIban(e.target.value)} />
        <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Contact email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
        <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Contact phone (e.g. +216...)" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
      </div>
      <button className="mt-6 rounded-2xl bg-teal-300 px-6 py-3 font-black text-slate-950 disabled:opacity-60" disabled={submitting} onClick={() => void registerMerchant()}>
        {submitting ? 'Registering...' : 'Register merchant'}
      </button>
    </section>}

    {step === 'kyb' && <section className="glass mt-8 rounded-3xl p-6">
      <h2 className="text-2xl font-black">KYB document uploads</h2>
      <p className="mt-2 text-slate-300">Upload all required business verification documents. All 5 documents are mandatory.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {kybDocs.map(doc => (
          <label key={doc.type} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className="font-bold">{doc.label}</span>
            <input className="mt-3 block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-teal-300 file:px-4 file:py-2 file:font-bold file:text-slate-950" type="file" ref={el => { if (el) fileRefs.current.set(doc.type, el); }} />
            <p className="mt-2 text-xs text-slate-500">Type: {doc.type}</p>
          </label>
        ))}
      </div>
      <button className="mt-6 rounded-2xl bg-teal-300 px-6 py-3 font-black text-slate-950 disabled:opacity-60" disabled={submitting} onClick={() => void submitKyb()}>
        {submitting ? 'Submitting...' : 'Submit KYB for admin review'}
      </button>
    </section>}

    {step === 'done' && <section className="glass mt-8 rounded-3xl p-6 text-center">
      <div className="text-6xl">&#x2705;</div>
      <h2 className="mt-4 text-2xl font-black">KYB submitted</h2>
      <p className="mt-3 text-slate-300">Your merchant ID is <span className="font-mono text-teal-200">{merchantId}</span>. An admin will review your documents and approve your account.</p>
      <div className="mt-6 flex justify-center gap-4">
        <a className="rounded-full border border-white/15 px-5 py-3" href="/merchant">Go to merchant portal</a>
        <a className="rounded-full border border-white/15 px-5 py-3" href="/">Home</a>
      </div>
    </section>}
  </div></main>;
}
