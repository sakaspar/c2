"use client";

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type Merchant = { id: string; displayName: string; legalName: string; category: string; state: string; ownerEmail?: string; contactEmail?: string; latestKybApplicationId?: string };
type Product = { id: string; merchantId: string; name: string; description: string; price: { amount: number; currency: string }; stock: number; state: string };

export default function MerchantDashboardPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');

  useEffect(() => {
    const stored = localStorage.getItem('bnpl_merchant');
    if (!stored) { window.location.href = '/merchant/login'; return; }
    const parsed = JSON.parse(stored) as Merchant;
    fetch(`${apiBaseUrl}/merchants/${parsed.id}`).then(r => r.json()).then((fresh: Merchant) => { setMerchant(fresh); localStorage.setItem('bnpl_merchant', JSON.stringify(fresh)); }).catch(() => setMerchant(parsed));
    fetch(`${apiBaseUrl}/merchants/products`).then(r => r.json()).then((data: { items: Product[] }) => setProducts((data.items ?? []).filter(p => p.merchantId === parsed.id))).catch(() => setProducts([]));
  }, []);

  async function postProduct() {
    if (!merchant) return;
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/merchants/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchantId: merchant.id, name, description, price: Number(price), stock: Number(stock) }) });
      const payload = await response.json().catch(() => null) as Product | { message?: string } | null;
      if (!response.ok || !payload || !('id' in payload)) { setMessage((payload as { message?: string } | null)?.message ?? `Product creation failed (${response.status})`); return; }
      setProducts([payload, ...products]);
      setName(''); setDescription(''); setPrice(''); setStock('1');
      setMessage('Product posted successfully.');
    } catch { setMessage(`API is offline at ${apiBaseUrl}.`); }
  }

  if (!merchant) return <main className="min-h-screen bg-slate-950 p-6 text-white"><p>Loading merchant...</p></main>;

  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-teal-300">Merchant dashboard</p><h1 className="text-4xl font-black">{merchant.displayName}</h1><p className="mt-2 text-slate-300">{merchant.legalName} · {merchant.ownerEmail ?? merchant.contactEmail ?? 'No email'} · status: <span className="text-teal-200">{merchant.state}</span></p></div><div className="flex gap-3"><a className="rounded-full border border-teal-300/50 px-5 py-3 text-teal-200" href="/merchant/kyb">Update KYB</a><button className="rounded-full border border-white/15 px-5 py-3" onClick={() => { localStorage.removeItem('bnpl_merchant'); window.location.href = '/merchant/login'; }}>Logout</button></div></header>
    {message ? <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">{message}</div> : null}
    {merchant.state !== 'approved' ? <section className="mt-8 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-amber-100"><h2 className="text-xl font-black">KYB required</h2><p className="mt-2">You can edit your KYB information, but only approved merchants can publish active products.</p><a className="mt-4 inline-block rounded-full bg-amber-200 px-5 py-3 font-black text-slate-950" href="/merchant/kyb">Complete / update KYB</a></section> : null}
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Post new item</h2><p className="mt-2 text-slate-300">Approved merchants can publish products to the BNPL marketplace.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Item name" value={name} onChange={e => setName(e.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Price TND" value={price} onChange={e => setPrice(e.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none md:col-span-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Stock" value={stock} onChange={e => setStock(e.target.value)} /></div><button className="mt-5 rounded-full bg-teal-300 px-6 py-3 font-black text-slate-950" onClick={() => void postProduct()}>Post new item</button></section>
    <section className="mt-8"><h2 className="text-2xl font-black">Your products</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{products.map(product => <article className="glass rounded-3xl p-5" key={product.id}><p className="text-sm text-slate-400">{product.id}</p><h3 className="mt-2 text-xl font-black">{product.name}</h3><p className="mt-2 text-slate-300">{product.description}</p><p className="mt-4 text-teal-200">{product.price.amount} {product.price.currency} · stock {product.stock}</p></article>)}</div>{!products.length ? <p className="mt-4 text-slate-400">No products posted yet.</p> : null}</section>
  </div></main>;
}
