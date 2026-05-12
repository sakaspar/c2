"use client";

import { useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const transactions = ['Order BNPL-1001 settled', 'Order BNPL-1002 pending', 'Payout batch Friday'];

export default function MerchantPage() {
  const [merchantId, setMerchantId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [message, setMessage] = useState<string | null>(null);
  async function postProduct() {
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/merchants/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchantId, name, description, price: Number(price), stock: Number(stock) }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        setMessage(payload?.message ?? `Product creation failed with status ${response.status}`);
        return;
      }
      setMessage('Product published to the marketplace.');
      setName('');
      setDescription('');
      setPrice('');
      setStock('1');
    } catch {
      setMessage(`API is offline or unreachable at ${apiBaseUrl}.`);
    }
  }
  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex items-center justify-between"><div><p className="text-teal-300">Merchant portal</p><h1 className="text-4xl font-black">TunisTech Store</h1></div><a className="rounded-full border border-white/15 px-5 py-3" href="/">Home</a></header>
    <section className="mt-8 grid gap-5 md:grid-cols-3"><Tile label="Monthly BNPL sales" value="4,850 TND" /><Tile label="Settlement pending" value="920 TND" /><Tile label="Approval status" value="Approved" /></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Post item for BNPL checkout</h2><p className="mt-2 text-slate-300">Approved merchants can publish products that KYC-approved clients buy through loan creation.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Merchant ID" value={merchantId} onChange={(event) => setMerchantId(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Item name" value={name} onChange={(event) => setName(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none md:col-span-2" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Price TND" value={price} onChange={(event) => setPrice(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Stock" value={stock} onChange={(event) => setStock(event.target.value)} /></div><button className="mt-5 rounded-full bg-teal-300 px-6 py-3 font-black text-slate-950" onClick={() => void postProduct()}>Publish item</button>{message ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">{message}</div> : null}<a className="mt-4 block text-sm text-teal-200" href="/shop">View client marketplace</a></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Settlement activity</h2><div className="mt-5 space-y-3">{transactions.map((item) => <div className="rounded-2xl bg-white/5 p-4" key={item}>{item}</div>)}</div></section>
  </div></main>;
}
function Tile({ label, value }: { label: string; value: string }) { return <div className="glass rounded-3xl p-6"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>; }
