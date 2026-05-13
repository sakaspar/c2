"use client";

import { useEffect, useState } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const transactions = ['Order BNPL-1001 settled', 'Order BNPL-1002 pending', 'Payout batch Friday'];

interface MerchantOption { id: string; displayName: string }

export default function MerchantPage() {
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [merchantId, setMerchantId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [message, setMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const token = localStorage.getItem('bnpl_token');
    fetch(`${apiBaseUrl}/merchants/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then((data) => {
      setProducts(data.items ?? []);
    }).catch(() => {});
  }

  async function uploadImage(productId: string, file: File) {
    const token = localStorage.getItem('bnpl_token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${apiBaseUrl}/merchants/products/${productId}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        setMessage('Image uploaded successfully.');
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('bnpl_token');
    fetch(`${apiBaseUrl}/merchants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then((data: { items?: MerchantOption[] }) => {
      const list = data.items ?? [];
      setMerchants(list);
      if (list.length && !merchantId) setMerchantId(list[0].id);
    }).catch(() => {});
  }, []);

  async function postProduct() {
    setMessage(null);
    if (!merchantId) { setMessage('Please select a merchant.'); return; }
    const token = localStorage.getItem('bnpl_token');
    try {
      const response = await fetch(`${apiBaseUrl}/merchants/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ merchantId, name, description, price: Number(price), stock: Number(stock) })
      });
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
    <header className="flex items-center justify-between"><div><p className="text-teal-300">Merchant portal</p><h1 className="text-4xl font-black">TunisTech Store</h1></div><div className="flex gap-3"><a className="rounded-full border border-teal-300/50 px-5 py-3 text-teal-200" href="/merchant/login">Merchant Gmail login</a><a className="rounded-full border border-white/15 px-5 py-3" href="/">Home</a></div></header>
    <section className="mt-8 grid gap-5 md:grid-cols-3"><Tile label="Monthly BNPL sales" value="4,850 TND" /><Tile label="Settlement pending" value="920 TND" /><Tile label="Approval status" value="Approved" /></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Post item for BNPL checkout</h2><p className="mt-2 text-slate-300">Approved merchants can publish products that KYC-approved clients buy through loan creation.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" value={merchantId} onChange={(event) => setMerchantId(event.target.value)}>{merchants.length === 0 ? <option value="">Loading merchants…</option> : merchants.map(m => <option key={m.id} value={m.id}>{m.displayName} ({m.id})</option>)}</select><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Item name" value={name} onChange={(event) => setName(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none md:col-span-2" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Price TND" value={price} onChange={(event) => setPrice(event.target.value)} /><input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" placeholder="Stock" value={stock} onChange={(event) => setStock(event.target.value)} /></div><button className="mt-5 rounded-full bg-teal-300 px-6 py-3 font-black text-slate-950" onClick={() => void postProduct()}>Publish item</button>{message ? <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">{message}</div> : null}<a className="mt-4 block text-sm text-teal-200" href="/shop">View client marketplace</a></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Your Products</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
            <div className="aspect-video w-full rounded-xl bg-slate-800 overflow-hidden relative">
              {p.imageUrl ? <ProductImage url={`${apiBaseUrl.replace('/api/v1', '')}${p.imageUrl}`} alt={p.name} /> : <div className="w-full h-full flex items-center justify-center text-slate-500">No image</div>}
            </div>
            <div>
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-sm text-slate-400">{p.price.amount} {p.price.currency}</p>
            </div>
            <input type="file" className="hidden" id={`file-${p.id}`} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(p.id, file); }} />
            <label htmlFor={`file-${p.id}`} className="cursor-pointer text-xs bg-white/10 hover:bg-white/20 py-2 text-center rounded-lg transition">Upload Image</label>
          </div>
        ))}
      </div>
    </section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Settlement activity</h2><div className="mt-5 space-y-3">{transactions.map((item) => <div className="rounded-2xl bg-white/5 p-4" key={item}>{item}</div>)}</div></section>
  </div></main>;
}
function Tile({ label, value }: { label: string; value: string }) { return <div className="glass rounded-3xl p-6"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>; }

function ProductImage({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('bnpl_token');
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => setSrc(URL.createObjectURL(blob)))
      .catch(() => {});
  }, [url]);
  return src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-white/5" />;
}
