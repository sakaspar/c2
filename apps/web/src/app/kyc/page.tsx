"use client";

import { useMemo, useState } from 'react';

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
  const [employmentStatus, setEmploymentStatus] = useState<'employed' | 'unemployed'>('unemployed');
  const docs = useMemo(() => employmentStatus === 'employed' ? [...baseDocs, ...bankDocs] : baseDocs, [employmentStatus]);
  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-6xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-teal-300">Client onboarding</p><h1 className="text-4xl font-black">Complete your KYC application</h1><p className="mt-3 max-w-2xl text-slate-300">Choose your employment status. If you are employed, you must upload KYC documents plus three months of bank statements.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/dashboard">Dashboard</a></header>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Are you employed?</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Choice active={employmentStatus === 'unemployed'} title="No, I am unemployed" note="Upload identity, selfie, and address documents." onClick={() => setEmploymentStatus('unemployed')} /><Choice active={employmentStatus === 'employed'} title="Yes, I have a job" note="Upload KYC documents and 3 months of bank statements." onClick={() => setEmploymentStatus('employed')} /></div></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Required uploads</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{docs.map((doc) => <UploadField key={doc.type} label={doc.label} type={doc.type} />)}</div><button className="mt-6 rounded-2xl bg-teal-300 px-6 py-3 font-black text-slate-950">Submit KYC for admin review</button><p className="mt-4 text-sm text-slate-400">Files are organized under data/clients/client-name/kyc and client information is mirrored in data/clients/client-name/profile.json.</p></section>
  </div></main>;
}
function Choice({ active, title, note, onClick }: { active: boolean; title: string; note: string; onClick: () => void }) { return <button className={`rounded-3xl border p-6 text-left transition ${active ? 'border-teal-300 bg-teal-300/10' : 'border-white/10 bg-white/5 hover:border-teal-300/50'}`} onClick={onClick} type="button"><span className="text-xl font-black">{title}</span><p className="mt-2 text-sm text-slate-300">{note}</p></button>; }
function UploadField({ label, type }: { label: string; type: string }) { return <label className="rounded-2xl border border-white/10 bg-white/5 p-4"><span className="font-bold">{label}</span><input className="mt-3 block w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-teal-300 file:px-4 file:py-2 file:font-bold file:text-slate-950" data-document-type={type} type="file" /><p className="mt-2 text-xs text-slate-500">Stored as client kyc document: {type}</p></label>; }
