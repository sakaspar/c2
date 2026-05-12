"use client";

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const rows = [
  { label: 'KYC review queue', href: '/admin/applications' },
  { label: 'All clients', href: '/admin/clients' },
  { label: 'Loan monitoring', href: '/admin' },
  { label: 'Merchant KYB review', href: '/admin/merchants' },
  { label: 'Fraud flags', href: '/admin' },
  { label: 'Manual credit controls', href: '/admin' }
];

type Analytics = { activeUsers: number; totalUsers: number; totalMerchants: number; approvedMerchants: number; totalIssuedLoansTnd: number; outstandingExposureTnd: number; totalRevenueTnd: number; repaymentRate: number; defaultRate: number };

export default function AdminPage() {
  const [a, setA] = useState<Analytics | null>(null);
  useEffect(() => { fetch(`${apiBaseUrl}/admin/analytics`).then((r) => r.json()).then(setA).catch(() => {}); }, []);
  return <main className="min-h-screen bg-[#050816] p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex items-center justify-between"><div><p className="text-violet-300">Risk operations</p><h1 className="text-4xl font-black">Admin command center</h1></div><a className="rounded-full border border-white/15 px-5 py-3" href="/">Home</a></header>
    <section className="mt-8 grid gap-5 md:grid-cols-5"><Kpi label="Active users" value={a ? String(a.activeUsers) : '—'} /><Kpi label="Repayment" value={a ? `${a.repaymentRate}%` : '—'} /><Kpi label="Default" value={a ? `${a.defaultRate}%` : '—'} /><Kpi label="Revenue TND" value={a ? String(a.totalRevenueTnd) : '—'} /><Kpi label="Exposure TND" value={a ? String(a.outstandingExposureTnd) : '—'} /></section>
    <section className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="glass rounded-3xl p-6"><h2 className="text-2xl font-black">Operations</h2><div className="mt-5 space-y-3">{rows.map((row) => <a className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-teal-300/50" href={row.href} key={row.label}>{row.label}</a>)}</div></div><div className="glass rounded-3xl p-6"><h2 className="text-2xl font-black">Risk overview</h2><div className="mt-6 rounded-3xl bg-gradient-to-br from-violet-500/30 via-teal-300/20 to-transparent p-6"><p className="text-slate-200">Total users: <b>{a?.totalUsers ?? '—'}</b> · Merchants: <b>{a?.totalMerchants ?? '—'}</b> · Approved: <b>{a?.approvedMerchants ?? '—'}</b></p><p className="mt-3 text-slate-200">Issued loans: <b>{a?.totalIssuedLoansTnd ?? '—'} TND</b> · Outstanding: <b>{a?.outstandingExposureTnd ?? '—'} TND</b></p></div></div></section>
  </div></main>;
}
function Kpi({ label, value }: { label: string; value: string }) { return <div className="glass rounded-3xl p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>; }
