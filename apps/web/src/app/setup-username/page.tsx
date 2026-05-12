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
        const user = JSON.parse(stored) as { id: string };
        if (user.id) setUserId(user.id);
      }
    } catch {}
  }, []);

  async function updateUsername() {
    if (!username.trim()) { setMessage({ type: 'error', text: 'Enter a valid username.' }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/${userId}/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json().catch(() => null) as { message?: string; user?: any };
      if (!res.ok) { setMessage({ type: 'error', text: data?.message ?? 'Failed to update username' }); return; }
      if (data?.user) {
        localStorage.setItem('bnpl_user', JSON.stringify(data.user));
        setMessage({ type: 'success', text: 'Username updated successfully!' });
        setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
      }
    } catch {
      setMessage({ type: 'error', text: 'API is offline.' });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white flex items-center justify-center"><div className="glass w-full max-w-md rounded-3xl p-8 text-center">
    <h1 className="text-3xl font-black">Choose your handle</h1>
    <p className="mt-3 text-slate-300">This will be your unique identifier on the platform. It can only be set once.</p>
    <div className="mt-8 text-left">
      <label className="text-sm text-slate-400">Username</label>
      <div className="mt-2 relative">
        <span className="absolute left-4 top-3 text-slate-500">@</span>
        <input className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 outline-none focus:border-teal-300/50 transition" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
      </div>
    </div>
    <button className="mt-8 w-full rounded-2xl bg-teal-300 py-4 font-black text-slate-950 disabled:opacity-60" disabled={submitting} onClick={() => void updateUsername()}>{submitting ? 'Updating...' : 'Set username'}</button>
    {message ? <div className={`mt-6 rounded-2xl border p-4 text-sm ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}
    <a className="mt-6 block text-sm text-slate-400" href="/dashboard">Skip for now</a>
  </div></main>;
}
