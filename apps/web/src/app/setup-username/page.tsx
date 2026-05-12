"use client";

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function SetupUsernamePage() {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bnpl_user');
      if (stored) {
        const user = JSON.parse(stored) as { id: string; username?: string };
        if (user.username) { window.location.href = '/kyc'; return; }
        if (user.id) setUserId(user.id);
      } else {
        window.location.href = '/register';
      }
    } catch {
      window.location.href = '/register';
    }
  }, []);

  async function setMyUsername() {
    if (!username.trim()) { setMessage({ type: 'error', text: 'Enter a username.' }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/${userId}/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const payload = await response.json().catch(() => null) as { user?: { id: string; username?: string; fullName: string }; accessToken?: string; message?: string } | null;
      if (!response.ok) {
        setMessage({ type: 'error', text: payload?.message ?? `Failed (${response.status})` });
        return;
      }
      if (payload?.accessToken) {
        localStorage.setItem('bnpl_token', payload.accessToken);
        localStorage.setItem('bnpl_user', JSON.stringify(payload.user));
      }
      setMessage({ type: 'success', text: `Username @${payload?.user?.username} set. Redirecting to KYC...` });
      setTimeout(() => { window.location.href = '/kyc'; }, 1000);
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.85fr]">
    <section><p className="text-teal-300">Pick your identity</p><h1 className="mt-3 text-5xl font-black leading-tight">Choose your username.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">This is how you&apos;ll appear across the platform. You can only set it once, so pick wisely. 3-30 characters, lowercase letters, digits, hyphens, and underscores.</p><div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">Your username will be visible to merchants and admins. It cannot be changed later.</div></section>
    <section className="glass rounded-[2rem] p-8"><h2 className="text-2xl font-black">Set your username</h2><p className="mt-2 text-slate-400">One-time choice. No do-overs.</p>
      <div className="mt-8 space-y-4">
        <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><span className="text-slate-500">@</span><input className="ml-2 w-full bg-transparent outline-none" placeholder="yourname" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30))} onKeyDown={(e) => { if (e.key === 'Enter') void setMyUsername(); }} autoFocus /></div>
        <button className="w-full rounded-2xl bg-teal-300 py-3 font-black text-slate-950 disabled:opacity-60" disabled={submitting || username.length < 3} onClick={() => void setMyUsername()}>{submitting ? 'Saving...' : 'Claim this username'}</button>
      </div>
      {message ? <div className={`mt-5 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}
      <button className="mt-4 text-sm text-slate-400 underline" onClick={() => { window.location.href = '/kyc'; }}>Skip for now</button>
    </section>
  </div></main>;
}
