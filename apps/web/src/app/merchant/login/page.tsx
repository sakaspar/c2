"use client";

import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

type Merchant = { id: string; displayName: string; legalName: string; ownerEmail?: string; state: string };

export default function MerchantLoginPage() {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loginWithGoogle(idToken: string) {
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/merchants/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
      const merchant = await response.json().catch(() => null) as Merchant | { message?: string } | null;
      if (!response.ok || !merchant || !('id' in merchant)) {
        setMessage({ type: 'error', text: (merchant as { message?: string } | null)?.message ?? `Merchant Gmail login failed (${response.status})` });
        return;
      }
      localStorage.setItem('bnpl_merchant', JSON.stringify(merchant));
      setMessage({ type: 'success', text: `Welcome, ${merchant.displayName}.` });
      window.location.href = '/merchant/dashboard';
    } catch {
      setMessage({ type: 'error', text: `API is offline at ${apiBaseUrl}.` });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.85fr]">
    <section><p className="text-teal-300">Merchant access</p><h1 className="mt-3 text-5xl font-black leading-tight">Sign in with Gmail to manage your store.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Your Gmail account is linked to your merchant profile. If this is your first login, we create a pending merchant profile and you can complete KYB.</p></section>
    <section className="glass rounded-[2rem] p-8"><h2 className="text-2xl font-black">Merchant Gmail login</h2><p className="mt-2 text-slate-400">Use the Gmail account that owns the merchant business.</p><div className="mt-8">
      {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}><GoogleLogin onSuccess={(credential) => { if (!credential.credential) { setMessage({ type: 'error', text: 'Google did not return a credential.' }); return; } void loginWithGoogle(credential.credential); }} onError={() => setMessage({ type: 'error', text: 'Google sign-in failed or was cancelled.' })} /></GoogleOAuthProvider> : <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Gmail login.</div>}
    </div>{submitting ? <p className="mt-4 text-sm text-slate-400">Signing in...</p> : null}{message ? <div className={`mt-5 rounded-2xl border p-4 ${message.type === 'error' ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-teal-300/30 bg-teal-300/10 text-teal-100'}`}>{message.text}</div> : null}<a className="mt-6 block text-sm text-teal-200" href="/merchant">Back to merchant portal</a></section>
  </div></main>;
}
