"use client";

import { useCallback, useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('bnpl_refresh');
  if (!refreshToken) return null;
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  const payload = await response.json().catch(() => null) as { accessToken?: string; refreshToken?: string; user?: unknown } | null;
  if (!response.ok || !payload?.accessToken) return null;
  localStorage.setItem('bnpl_token', payload.accessToken);
  localStorage.setItem('bnpl_refresh', payload.refreshToken ?? refreshToken);
  if (payload.user) localStorage.setItem('bnpl_user', JSON.stringify(payload.user));
  return payload.accessToken;
}

async function fetchWithAdminAuth(input: string, init: RequestInit = {}) {
  const token = localStorage.getItem('bnpl_token');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response = await fetch(input, { ...init, headers });
  if (response.status !== 401) return response;
  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;
  headers.set('Authorization', `Bearer ${refreshed}`);
  response = await fetch(input, { ...init, headers });
  return response;
}

type KybApp = {
  id: string;
  merchantId: string;
  state: string;
  documents: { type: string; fileName: string; storagePath?: string }[];
  missingDocuments: string[];
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

type Merchant = {
  id: string;
  legalName: string;
  displayName: string;
  category: string;
  state: string;
  contactEmail?: string;
  contactPhone?: string;
  settlementIban?: string;
};

const docLabels: Record<string, string> = {
  commercial_register: 'Commercial Register',
  tax_certificate: 'Tax Certificate',
  articles_of_association: 'Articles of Association',
  bank_rib: 'Bank RIB',
  representative_cin: 'Representative CIN'
};

export default function AdminMerchantsPage() {
  const [apps, setApps] = useState<KybApp[]>([]);
  const [merchants, setMerchants] = useState<Map<string, Merchant>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);

  async function openPreview(url: string) {
    const token = localStorage.getItem('bnpl_token');
    try {
      const res = await fetchWithAdminAuth(url);
      if (!res.ok) throw new Error('Failed to fetch document');
      const blob = await res.blob();
      setPreviewMime(blob.type);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setMessage('Could not load document preview.');
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kybRes, merchantRes] = await Promise.all([
        fetchWithAdminAuth(`${apiBaseUrl}/admin/kyb-applications`),
        fetchWithAdminAuth(`${apiBaseUrl}/merchants`)
      ]);
      if (!kybRes.ok || !merchantRes.ok) {
        const detail = [`KYB ${kybRes.status}`, `merchants ${merchantRes.status}`].join(', ');
        setMessage(kybRes.status === 401 ? 'Admin session expired. Please log in again with the admin account.' : kybRes.status === 403 ? 'Your account is signed in, but it is not an admin account. Log out and sign in with amira@example.tn / DemoPass123!.' : `API error: ${detail}`);
        return;
      }
      const kybData = await kybRes.json() as { items: KybApp[] };
      const merchantData = await merchantRes.json() as { items: Merchant[] };
      setApps(kybData.items ?? []);
      const map = new Map<string, Merchant>();
      (merchantData.items ?? []).forEach(m => map.set(m.id, m));
      setMerchants(map);
      setMessage(null);
    } catch {
      setMessage('API is offline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function approve(appId: string) {
    setMessage(null);
    const token = localStorage.getItem('bnpl_token');
    try {
      const res = await fetchWithAdminAuth(`${apiBaseUrl}/admin/kyb-applications/${appId}/approve`, { method: 'PATCH' });
      if (!res.ok) { const p = await res.json().catch(() => null) as { message?: string } | null; setMessage(p?.message ?? `Approve failed (${res.status})`); return; }
      setMessage('KYB approved. Merchant is now active.');
      void fetchData();
    } catch { setMessage('API is offline.'); }
  }

  async function reject(appId: string) {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    setMessage(null);
    const token = localStorage.getItem('bnpl_token');
    try {
      const res = await fetchWithAdminAuth(`${apiBaseUrl}/admin/kyb-applications/${appId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) { const p = await res.json().catch(() => null) as { message?: string } | null; setMessage(p?.message ?? `Reject failed (${res.status})`); return; }
      setMessage('KYB rejected.');
      void fetchData();
    } catch { setMessage('API is offline.'); }
  }

  return <main className="min-h-screen bg-[#050816] p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div><p className="text-violet-300">Risk operations</p><h1 className="text-4xl font-black">Merchant KYB review</h1><p className="mt-2 text-slate-300">Review business documents submitted by merchants for Know Your Business verification.</p></div>
      <a className="rounded-full border border-white/15 px-5 py-3" href="/admin">Admin home</a>
    </header>

    {message ? <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">{message}</div> : null}
    {loading ? <p className="mt-8 text-slate-400">Loading KYB applications...</p> : null}

    <section className="mt-8 space-y-4">
      {apps.map(app => {
        const merchant = merchants.get(app.merchantId);
        return <article className="glass rounded-3xl p-6" key={app.id}>
          <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr_.6fr] md:items-center">
            <div>
              <p className="text-sm text-slate-400">{app.id}</p>
              <h2 className="text-xl font-black">{merchant?.displayName ?? app.merchantId}</h2>
              {merchant && <p className="text-sm text-slate-400">{merchant.legalName} &middot; {merchant.category}</p>}
            </div>
            <Badge label={app.state} />
            <div className="text-sm">
              {merchant?.contactEmail && <p className="text-slate-300">{merchant.contactEmail}</p>}
              {merchant?.contactPhone && <p className="text-slate-400">{merchant.contactPhone}</p>}
            </div>
            <p className="text-sm text-slate-400">{merchant?.settlementIban ?? 'No IBAN'}</p>
            <p className="text-sm text-teal-200">{app.documents.length} docs</p>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-sm font-bold text-slate-400 mb-3">KYB documents</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {app.documents.map(doc => (
                <button key={doc.type} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer text-left w-full"
                  onClick={() => openPreview(`${apiBaseUrl}/admin/kyb-documents/${doc.storagePath ?? `merchants/${app.merchantId}/kyb/${doc.fileName}`}`)}>
                  <span className="text-lg">{doc.type === 'representative_cin' ? '\u{1FAAA}' : doc.type === 'bank_rib' ? '\u{1F3E6}' : '\u{1F4C4}'}</span>
                  <div>
                    <p className="text-sm font-bold">{docLabels[doc.type] ?? doc.type}</p>
                    <p className="text-xs text-teal-300 truncate max-w-[180px]">{doc.fileName}</p>
                  </div>
                </button>
              ))}
            </div>
            {app.missingDocuments.length ? <p className="mt-3 text-sm text-rose-300">Missing: {app.missingDocuments.map(d => docLabels[d] ?? d).join(', ')}</p> : null}
          </div>

          <div className="mt-5 flex gap-3">
            {app.state === 'under_review' || app.state === 'pending' ? <>
              <button className="rounded-2xl bg-teal-300 px-5 py-3 font-black text-slate-950" onClick={() => void approve(app.id)}>Approve</button>
              <button className="rounded-2xl border border-rose-300/40 px-5 py-3 font-black text-rose-200" onClick={() => void reject(app.id)}>Reject</button>
            </> : <span className="text-sm text-slate-400">{app.state === 'approved' ? '✓ Approved' : app.state === 'rejected' ? `✗ Rejected: ${app.rejectionReason ?? ''}` : app.state}</span>}
          </div>
        </article>;
      })}
      {!loading && !apps.length ? <p className="text-slate-400">No KYB applications yet.</p> : null}
    </section>

    {previewUrl ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => { setPreviewUrl(null); setPreviewMime(null); }}>
      <div className="relative h-[90vh] w-[90vw] rounded-2xl overflow-hidden bg-[#1a1c2e]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-sm font-bold">Document Preview</span>
          <button className="rounded-full bg-white/10 px-4 py-2 text-white text-sm hover:bg-white/20 transition" onClick={() => { setPreviewUrl(null); setPreviewMime(null); }}>✕ Close</button>
        </div>
        {previewMime === 'application/pdf'
          ? <iframe className="h-full w-full border-0" src={previewUrl} title="KYB PDF preview" />
          : <div className="flex h-full w-full items-center justify-center p-8"><img className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" src={previewUrl} alt="KYB document preview" /></div>}
      </div>
    </div> : null}
  </div></main>;
}

function Badge({ label }: { label: string }) { return <span className="w-fit rounded-full bg-violet-400/15 px-4 py-2 text-sm text-violet-200">{label}</span>; }
