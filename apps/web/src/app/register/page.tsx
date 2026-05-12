"use client";

import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function RegisterPage() {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  async function registerWithGoogle(idToken: string) {
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
      const payload = await response.json().catch(() => null) as { user?: { id: string; fullName: string; email?: string }; accessToken?: string; refreshToken?: string; message?: string } | null;
      if (!response.ok) {
        setMessage({ type: 'error', text: payload?.message ?? `Google registration failed with status ${response.status}` });
        return;
      }
      if (payload?.accessToken) {
        localStorage.setItem('bnpl_token', payload.accessToken);
        localStorage.setItem('bnpl_refresh', payload.refreshToken ?? '');
        localStorage.setItem('bnpl_user', JSON.stringify(payload.user));
      }
      setMessage({ type: 'success', text: `Welcome ${payload?.user?.fullName ?? ''}. Redirecting to KYC...` });
      setTimeout(() => { window.location.href = '/kyc'; }, 800);
    } catch {
      setMessage({ type: 'error', text: `API is offline or unreachable at ${apiBaseUrl}. Start the backend with pnpm --filter @bnpl/api dev.` });
    }
  }
  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.85fr]">
    <section><p className="text-teal-300">Secure onboarding</p><h1 className="mt-3 text-5xl font-black leading-tight">Register with Gmail, then complete KYC.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">We verify your Google ID token on the backend using Google&apos;s official verifier, create your client profile, and prepare your personal data-lake folder.</p><div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">After registration your folder is created under <span className="text-teal-200">data/clients/your-name</span> with <span className="text-teal-200">profile.json</span> and a KYC document directory.</div></section>
    <section className="glass rounded-[2rem] p-8"><h2 className="text-2xl font-black">Create your account</h2><p className="mt-2 text-slate-400">Use the Gmail account you want linked to your BNPL profile.</p><div className="mt-8">{googleClientId ? <GoogleOAuthProvider clientId={googleClientId}><GoogleLogin onSuccess={(credential) => { if (!credential.credential) { setMessage({ type: 'error', text: 'Google did not return a credential. Please retry.' }); return; } void registerWithGoogle(credential.credential); }} onError={() => setMessage({ type: 'error', text: 'Google authentication failed or was cancelled.' })} useOneTap /></GoogleOAuthProvider> : <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment to enable Gmail registration.</div>}</div>{message ? <div className={`mt-5 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}<a className="mt-6 block text-sm text-teal-200" href="/">Back to home</a></section>
  </div></main>;
}
