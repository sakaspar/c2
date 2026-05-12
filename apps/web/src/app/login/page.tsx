"use client";

import { useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function login() {
    if (!identifier.trim() || !password) { setMessage({ type: 'error', text: 'Enter your email or phone and password.' }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
      const payload = await response.json().catch(() => null) as { accessToken?: string; user?: { id: string; fullName: string }; message?: string } | null;
      if (!response.ok) { setMessage({ type: 'error', text: payload?.message ?? `Login failed (${response.status})` }); return; }
      if (payload?.accessToken) localStorage.setItem('accessToken', payload.accessToken);
      setMessage({ type: 'success', text: `Welcome back, ${payload?.user?.fullName ?? identifier}.` });
      window.location.href = '/dashboard';
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.85fr]">
    <section><p className="text-teal-300">Welcome back</p><h1 className="mt-3 text-5xl font-black leading-tight">Log in to your BNPL account.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Sign in with your email or phone number and password. Google-registered users can use the registration page to sign in again.</p><div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">Don&apos;t have an account? <a className="text-teal-200 underline" href="/register">Register with Google</a> or contact support.</div></section>
    <section className="glass rounded-[2rem] p-8"><h2 className="text-2xl font-black">Sign in</h2><p className="mt-2 text-slate-400">Use the credentials you created during registration.</p>
      <div className="mt-8 space-y-4">
        <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Email or phone number" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void login(); }} />
        <button className="w-full rounded-2xl bg-teal-300 py-3 font-black text-slate-950 disabled:opacity-60" disabled={submitting} onClick={() => void login()}>{submitting ? 'Signing in...' : 'Sign in'}</button>
      </div>
      {message ? <div className={`mt-5 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}
      <a className="mt-6 block text-sm text-teal-200" href="/">Back to home</a>
    </section>
  </div></main>;
}
