"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const baseDocs = [
  { type: 'cin_front', label: 'CIN front' },
  { type: 'cin_back', label: 'CIN back' },
  { type: 'selfie', label: 'Selfie verification' },
  { type: 'proof_of_address', label: 'Proof of address' }
];
const bankDocs = [
  { type: 'bank_statement_month_1', label: 'Bank statement month 1' },
  { type: 'bank_statement_month_2', label: 'Bank statement month 2' },
  { type: 'bank_statement_month_3', label: 'Bank statement month 3' }
];

export default function KycPage() {
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'employed' | 'unemployed'>('unemployed');
  const [employerName, setEmployerName] = useState('');
  const [monthlyIncomeTnd, setMonthlyIncomeTnd] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const docs = useMemo(() => employmentStatus === 'employed' ? [...baseDocs, ...bankDocs] : baseDocs, [employmentStatus]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bnpl_user');
      if (stored) {
        const user = JSON.parse(stored) as { id: string; username?: string; fullName?: string };
        if (user.id) setUserId(user.id);
        setDisplayName(user.username ?? user.fullName ?? user.id);
      }
    } catch {}
  }, []);

  async function submitKyc() {
    if (!userId.trim()) { setMessage({ type: 'error', text: 'Enter your user ID (shown after registration).' }); return; }
    setSubmitting(true);
    setMessage(null);
    const documents = docs.map((doc) => {
      const input = fileRefs.current.get(doc.type);
      const fileName = input?.files?.[0]?.name ?? `${doc.type}.jpg`;
      return { type: doc.type, fileName, storagePath: `clients/${userId}/kyc/${fileName}` };
    });
    try {
      const response = await fetch(`${apiBaseUrl}/kyc/${userId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employmentStatus,
          employerName: employmentStatus === 'employed' ? employerName : undefined,
          monthlyIncomeTnd: employmentStatus === 'employed' ? Number(monthlyIncomeTnd) || undefined : undefined,
          documents
        })
      });
      const payload = await response.json().catch(() => null) as { message?: string; missingDocuments?: string[] } | null;
      if (!response.ok) {
        const missing = (payload as { missingDocuments?: string[] })?.missingDocuments;
        setMessage({ type: 'error', text: missing?.length ? `Missing documents: ${missing.join(', ')}` : payload?.message ?? `Submission failed (${response.status})` });
        return;
      }
      setMessage({ type: 'success', text: 'KYC application submitted. An admin will review it shortly.' });
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-6xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-teal-300">Client onboarding</p><h1 className="text-4xl font-black">Complete your KYC application</h1><p className="mt-3 max-w-2xl text-slate-300">Choose your employment status. If you are employed, you must upload KYC documents plus three months of bank statements.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/dashboard">Dashboard</a></header>
    {!userId ? <section className="glass mt-8 rounded-3xl p-6"><label className="text-sm text-slate-300">Your user ID</label><input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Enter your user ID" value={userId} onChange={(e) => setUserId(e.target.value)} /></section> : <section className="glass mt-8 rounded-3xl p-6"><p className="text-sm text-slate-300">Logged in as</p><p className="mt-2 text-teal-200 font-mono">{displayName}</p></section>}
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Are you employed?</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Choice active={employmentStatus === 'unemployed'} title="No, I am unemployed" note="Upload identity, selfie, and address documents." onClick={() => setEmploymentStatus('unemployed')} /><Choice active={employmentStatus === 'employed'} title="Yes, I have a job" note="Upload KYC documents and 3 months of bank statements." onClick={() => setEmploymentStatus('employed')} /></div>
      {employmentStatus === 'employed' ? <div className="mt-5 grid gap-4 md:grid-cols-2"><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Employer name" value={employerName} onChange={(e) => setEmployerName(e.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Monthly income TND" value={monthlyIncomeTnd} onChange={(e) => setMonthlyIncomeTnd(e.target.value)} /></div> : null}
    </section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Required uploads</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{docs.map((doc) => <UploadField key={doc.type} label={doc.label} type={doc.type} ref={(el) => { if (el) fileRefs.current.set(doc.type, el); }} />)}</div>
      <button className="mt-6 rounded-2xl bg-teal-300 px-6 py-3 font-black text-slate-950 disabled:opacity-60" disabled={submitting} onClick={() => void submitKyc()}>{submitting ? 'Submitting...' : 'Submit KYC for admin review'}</button>
      {message ? <div className={`mt-4 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}
      <p className="mt-4 text-sm text-slate-400">Files are organized under data/clients/client-name/kyc and client information is mirrored in data/clients/client-name/profile.json.</p>
    </section>
  </div></main>;
}
function Choice({ active, title, note, onClick }: { active: boolean; title: string; note: string; onClick: () => void }) { return <button className={`rounded-3xl border p-6 text-left transition ${active ? 'border-teal-300 bg-teal-300/10' : 'border-white/10 bg-white/5 hover:border-teal-300/50'}`} onClick={onClick} type="button"><span className="text-xl font-black">{title}</span><p className="mt-2 text-sm text-slate-300">{note}</p></button>; }
function UploadField({ label, type, ref }: { label: string; type: string; ref?: (el: HTMLInputElement) => void }) { return <label className="rounded-2xl border border-white/10 bg-white/5 p-4"><span className="font-bold">{label}</span><input className="mt-3 block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-teal-300 file:px-4 file:py-2 file:font-bold file:text-slate-950" data-document-type={type} type="file" ref={ref} /><p className="mt-2 text-xs text-slate-500">Stored as client kyc document: {type}</p></label>; }
