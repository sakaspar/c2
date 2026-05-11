const transactions = ['Order BNPL-1001 settled', 'Order BNPL-1002 pending', 'Payout batch Friday'];

export default function MerchantPage() {
  return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex items-center justify-between"><div><p className="text-teal-300">Merchant portal</p><h1 className="text-4xl font-black">TunisTech Store</h1></div><a className="rounded-full border border-white/15 px-5 py-3" href="/">Home</a></header>
    <section className="mt-8 grid gap-5 md:grid-cols-3"><Tile label="Monthly BNPL sales" value="4,850 TND" /><Tile label="Settlement pending" value="920 TND" /><Tile label="Approval status" value="Approved" /></section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Settlement activity</h2><div className="mt-5 space-y-3">{transactions.map((item) => <div className="rounded-2xl bg-white/5 p-4" key={item}>{item}</div>)}</div></section>
  </div></main>;
}
function Tile({ label, value }: { label: string; value: string }) { return <div className="glass rounded-3xl p-6"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>; }
