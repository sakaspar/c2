const stats = ['100 TND starter limit', '4-week repayment cycle', 'KYC-first risk engine', 'Mock payment rails'];

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#134e4a,transparent_34%),radial-gradient(circle_at_top_right,#4c1d95,transparent_30%),#020617] px-6 py-6">
    <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
      <div className="text-xl font-black tracking-tight">Salafni<span className="text-teal-300">.tn</span></div>
      <div className="hidden gap-6 text-sm text-slate-300 md:flex"><a href="/dashboard">Customer</a><a href="/admin">Admin</a><a href="/merchant">Merchant</a></div>
      <div className="flex gap-3"><a className="rounded-full border border-white/15 px-5 py-2 text-sm font-bold text-white" href="/login">Login</a><a className="rounded-full bg-teal-300 px-5 py-2 text-sm font-bold text-slate-950" href="/register">Register with Gmail</a></div>
    </nav>
    <section className="mx-auto grid max-w-7xl gap-10 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
      <div>
        <p className="mb-5 inline-flex rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-sm text-teal-200">Tunisian Dinar BNPL infrastructure</p>
        <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">A premium BNPL platform built for Tunisia&apos;s next fintech wave.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Customer onboarding, KYC workflows, dynamic credit limits, merchant settlements, mock payment rails, audit logs, and a JSON data lake engineered behind repository/service boundaries.</p>
        <div className="mt-8 flex flex-wrap gap-3"><a className="rounded-full bg-white px-6 py-3 font-black text-slate-950" href="/login">Login</a><a className="rounded-full bg-teal-300 px-6 py-3 font-black text-slate-950" href="/register">Create account with Gmail</a><a className="rounded-full border border-white/15 px-6 py-3 font-black text-white" href="/dashboard">Launch demo</a></div>
        <div className="mt-8 flex flex-wrap gap-3">{stats.map((stat) => <span className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200" key={stat}>{stat}</span>)}</div>
      </div>
      <div className="glass rounded-[2rem] p-6 shadow-glow">
        <div className="rounded-[1.5rem] bg-gradient-to-br from-teal-300 to-violet-500 p-6 text-slate-950"><p className="text-sm font-bold">Available credit</p><p className="mt-4 text-6xl font-black">700 TND</p><p className="mt-6 font-semibold">Pay merchants today. Repay over 4 weeks.</p></div>
        <div className="mt-5 grid grid-cols-2 gap-4"><Metric label="Risk score" value="724" /><Metric label="Repayment" value="96%" /><Metric label="Exposure" value="18.4k" /><Metric label="Merchants" value="42" /></div>
      </div>
    </section>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-3xl bg-white/5 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
