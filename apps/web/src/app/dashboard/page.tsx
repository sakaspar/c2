"use client";

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type Loan = { id: string; merchantId: string; principal: { amount: number; currency: 'TND' }; outstanding: { amount: number; currency: 'TND' }; state: string; dueDate: string };

export default function DashboardPage() {
  const [userId, setUserId] = useState('');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [kycState, setKycState] = useState<string | null>(null);
  const [availableCredit, setAvailableCredit] = useState<number | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [userName, setUserName] = useState('Client');
  const [token, setToken] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bnpl_user');
      if (stored) {
        const user = JSON.parse(stored) as { id: string; fullName: string; username?: string };
        if (user.id) setUserId(user.id);
        if (user.fullName) setUserName(user.username ?? user.fullName);
      }
      const t = localStorage.getItem('bnpl_token');
      if (t) setToken(t);
    } catch {}
  }, []);

  useEffect(() => {
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    fetch(`${apiBaseUrl}/loans`, { headers }).then((r) => r.json()).then((d: { items: Loan[] }) => setLoans((d.items ?? []).filter((l) => l.state === 'active'))).catch(() => {});
    fetch(`${apiBaseUrl}/auth/me`, { headers }).then((r) => r.json()).then((u: { fullName: string; kycState: string; availableCredit?: { amount: number }; creditLimit?: { amount: number } }) => {
      if (u && u.fullName) {
        setUserName(u.fullName);
        setKycState(u.kycState);
        setAvailableCredit(u.availableCredit?.amount ?? null);
        setCreditLimit(u.creditLimit?.amount ?? null);
      }
    }).catch(() => {});
  }, [userId, token]);

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-teal-300">Customer dashboard</p><h1 className="text-4xl font-black">Welcome back, {userName}</h1></div><a className="rounded-full bg-white px-5 py-3 font-bold text-slate-950" href="/">Home</a></header>
    {token ? null : <section className="glass mt-6 rounded-3xl p-6"><label className="text-sm text-slate-300">Your user ID</label><input className="mt-2 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={userId} onChange={(e) => setUserId(e.target.value)} /></section>}
    <section className="mt-8 grid gap-5 lg:grid-cols-3"><Card title="Available credit" value={availableCredit !== null ? `${availableCredit} TND` : '—'} note={creditLimit !== null ? `Limit ${creditLimit} TND` : ''} /><Card title="Credit score" value={creditScore !== null ? String(creditScore) : '—'} note="Auto-calculated" /><Card title="KYC status" value={kycState ?? '—'} note="Identity verification" /></section>
    <section className="glass mt-8 rounded-3xl p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h2 className="text-2xl font-black">Identity verification</h2><p className="mt-2 text-slate-300">New clients must submit KYC. Employed clients also provide three months of bank statements.</p></div><div className="flex flex-wrap gap-3"><a className="rounded-2xl bg-teal-300 px-5 py-3 font-black text-slate-950" href="/kyc">Start or update KYC</a><a className="rounded-2xl border border-white/15 px-5 py-3 font-black text-white" href="/setup-username">Change username</a><a className="rounded-2xl border border-white/15 px-5 py-3 font-black text-white" href="/shop">Shop with BNPL</a></div></div></section>
    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]"><div className="glass rounded-3xl p-6"><h2 className="text-2xl font-black">Active repayments</h2><div className="mt-5 space-y-3">{loans.map((loan) => <div className="rounded-2xl bg-white/5 p-4" key={loan.id}><div className="flex justify-between"><b>{loan.merchantId}</b><span>{loan.outstanding.amount} / {loan.principal.amount} TND</span></div><p className="mt-2 text-sm text-slate-400">Due {loan.dueDate?.slice(0, 10)}</p></div>)}{!loans.length ? <p className="text-slate-400">No active loans.</p> : null}</div></div><div className="glass rounded-3xl p-6"><h2 className="text-2xl font-black">Notifications</h2><p className="mt-4 text-slate-300">Your next installment reminder will be sent by email and in-app notification.</p><a className="mt-6 block w-full rounded-2xl bg-teal-300 py-3 text-center font-black text-slate-950" href="/shop">Browse marketplace</a></div></section>
  </div></main>;
}
function Card({ title, value, note }: { title: string; value: string; note: string }) { return <div className="glass rounded-3xl p-6"><p className="text-sm text-slate-400">{title}</p><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-2 text-sm text-teal-200">{note}</p></div>; }
