"use client";

import { useCallback, useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type KycApp = {
  id: string;
  userId: string;
  username?: string;
  employmentStatus: string;
  employerName?: string;
  monthlyIncomeTnd?: number;
  state: string;
  documents: { type: string; fileName: string; storagePath?: string }[];
  missingDocuments: string[];
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

const docLabels: Record<string, string> = {
  cin_front: 'CIN Front',
  cin_back: 'CIN Back',
  selfie: 'Selfie',
  proof_of_address: 'Proof of Address',
  bank_statement_month_1: 'Bank Statement M1',
  bank_statement_month_2: 'Bank Statement M2',
  bank_statement_month_3: 'Bank Statement M3'
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<KycApp[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/kyc-applications`);
      if (!res.ok) { setMessage(`API returned ${res.status}`); return; }
      const data = await res.json() as { items: KycApp[] };
      setApps(data.items ?? []);
      setMessage(null);
    } catch {
      setMessage('API is offline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchApps(); }, [fetchApps]);

  async function approve(appId: string) {
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/kyc/applications/${appId}/approve`, { method: 'PATCH' });
      if (!res.ok) { const p = await res.json().catch(() => null) as { message?: string } | null; setMessage(p?.message ?? `Approve failed (${res.status})`); return; }
      setMessage('Application approved. Client is now active.');
      void fetchApps();
    } catch { setMessage('API is offline.'); }
  }

  async function reject(appId: string) {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/kyc/applications/${appId}/reject`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      if (!res.ok) { const p = await res.json().catch(() => null) as { message?: string } | null; setMessage(p?.message ?? `Reject failed (${res.status})`); return; }
      setMessage('Application rejected.');
      void fetchApps();
    } catch { setMessage('API is offline.'); }
  }

  return <main className="min-h-screen bg-[#050816] p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-violet-300">Risk operations</p><h1 className="text-4xl font-black">KYC applications</h1><p className="mt-2 text-slate-300">Review identity, employment status, and required supporting documents.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/admin">Admin home</a></header>
    {message ? <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">{message}</div> : null}
    {loading ? <p className="mt-8 text-slate-400">Loading applications...</p> : null}
    <section className="mt-8 space-y-4">{apps.map((app) => <article className="glass rounded-3xl p-6" key={app.id}><div className="grid gap-4 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr] md:items-center"><div><p className="text-sm text-slate-400">{app.id}</p><h2 className="text-xl font-black">{app.username ?? app.userId}</h2></div><Badge label={app.state} /><p>{app.employmentStatus}</p><p>{app.documents.length} docs</p><p className="text-teal-200">{app.employerName ? `${app.employerName} · ${app.monthlyIncomeTnd} TND` : 'N/A'}</p></div>
      <div className="mt-4 border-t border-white/10 pt-4"><p className="text-sm font-bold text-slate-400 mb-3">Uploaded documents</p><div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{app.documents.map((doc) => <a key={doc.type} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer" href={`${apiBaseUrl}/admin/kyc-documents/${doc.storagePath ?? `clients/${app.userId}/kyc/${doc.fileName}`}`} target="_blank" rel="noreferrer"><span className="text-lg">{doc.type.includes('cin') ? '\u{1FAAA}' : doc.type === 'selfie' ? '\u{1F933}' : doc.type === 'proof_of_address' ? '\u{1F4C4}' : '\u{1F3E6}'}</span><div><p className="text-sm font-bold">{docLabels[doc.type] ?? doc.type}</p><p className="text-xs text-teal-300 truncate max-w-[180px]">{doc.fileName}</p></div></a>)}</div>{app.missingDocuments.length ? <p className="mt-3 text-sm text-rose-300">Missing: {app.missingDocuments.map((d) => docLabels[d] ?? d).join(', ')}</p> : null}</div>
      <div className="mt-5 flex gap-3">{app.state === 'under_review' || app.state === 'submitted' ? <><button className="rounded-2xl bg-teal-300 px-5 py-3 font-black text-slate-950" onClick={() => void approve(app.id)}>Approve</button><button className="rounded-2xl border border-rose-300/40 px-5 py-3 font-black text-rose-200" onClick={() => void reject(app.id)}>Reject</button></> : <span className="text-sm text-slate-400">{app.state === 'approved' ? '✓ Approved' : app.state === 'rejected' ? `✗ Rejected: ${app.rejectionReason ?? ''}` : app.state}</span>}</div></article>)}
    {!loading && !apps.length ? <p className="text-slate-400">No KYC applications yet.</p> : null}</section>
    <p className="mt-6 text-sm text-slate-400">API targets: GET /api/v1/admin/kyc-applications, PATCH /api/v1/kyc/applications/:applicationId/approve, PATCH /api/v1/kyc/applications/:applicationId/reject.</p>
  </div></main>;
}
function Badge({ label }: { label: string }) { return <span className="w-fit rounded-full bg-violet-400/15 px-4 py-2 text-sm text-violet-200">{label}</span>; }
