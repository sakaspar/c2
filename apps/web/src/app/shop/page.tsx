"use client";

import { useEffect, useState } from 'react';

type Product = {
  id: string;
  merchantName: string;
  name: string;
  description: string;
  price: { amount: number; currency: 'TND' };
  stock: number;
  state: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bnpl_user');
      if (stored) {
        const user = JSON.parse(stored) as { id: string };
        if (user.id) setUserId(user.id);
      }
    } catch {}
    fetch(`${apiBaseUrl}/merchants/products`)
      .then((response) => response.json())
      .then((payload: { items?: Product[] }) => setProducts(payload.items ?? []))
      .catch(() => setMessage(`API is offline or unreachable at ${apiBaseUrl}.`));
  }, []);

  async function buy(productId: string) {
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/loans/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, productId }) });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) {
        setMessage(payload?.message ?? `Checkout failed with status ${response.status}`);
        return;
      }
      setMessage('BNPL loan created. Your repayment schedule is now active.');
    } catch {
      setMessage(`API is offline or unreachable at ${apiBaseUrl}.`);
    }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-teal-300">Client marketplace</p><h1 className="text-4xl font-black">Buy now, repay weekly.</h1><p className="mt-2 text-slate-300">Only active clients with approved KYC can complete checkout.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/dashboard">Dashboard</a></header>
    <section className="glass mt-8 rounded-3xl p-6"><label className="text-sm text-slate-300">Your client user ID</label><input className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="client_amira_ben_youssef" value={userId} onChange={(event) => setUserId(event.target.value)} />{message ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">{message}</div> : null}</section>
    <section className="mt-8 grid gap-5 md:grid-cols-3">{products.filter((product) => product.state === 'active').map((product) => <article className="glass rounded-3xl p-6" key={product.id}><p className="text-sm text-teal-200">{product.merchantName}</p><h2 className="mt-3 text-2xl font-black">{product.name}</h2><p className="mt-3 min-h-16 text-slate-300">{product.description}</p><p className="mt-5 text-3xl font-black">{product.price.amount} {product.price.currency}</p><p className="mt-2 text-sm text-slate-400">Stock: {product.stock}</p><button className="mt-5 w-full rounded-2xl bg-teal-300 py-3 font-black text-slate-950 disabled:opacity-60" disabled={!userId} onClick={() => void buy(product.id)}>Buy with BNPL</button></article>)}{!products.length ? <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">No products loaded yet. Make sure the API is running.</div> : null}</section>
  </div></main>;
}
