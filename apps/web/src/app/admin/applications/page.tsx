const applications = [
  { id: 'KYC-2026-001', client: 'Amira Ben Youssef', status: 'Under review', employment: 'Employed', documents: '7/7 documents', risk: 'Low' },
  { id: 'KYC-2026-002', client: 'Yassine Trabelsi', status: 'Submitted', employment: 'Unemployed', documents: '4/4 documents', risk: 'Medium' }
];

export default function ApplicationsPage() {
  return <main className="min-h-screen bg-[#050816] p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-violet-300">Risk operations</p><h1 className="text-4xl font-black">KYC applications</h1><p className="mt-2 text-slate-300">Review identity, employment status, and required supporting documents.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/admin">Admin home</a></header>
    <section className="mt-8 space-y-4">{applications.map((app) => <article className="glass rounded-3xl p-6" key={app.id}><div className="grid gap-4 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr_.8fr] md:items-center"><div><p className="text-sm text-slate-400">{app.id}</p><h2 className="text-xl font-black">{app.client}</h2></div><Badge label={app.status} /><p>{app.employment}</p><p>{app.documents}</p><p className="text-teal-200">{app.risk} risk</p></div><div className="mt-5 flex gap-3"><button className="rounded-2xl bg-teal-300 px-5 py-3 font-black text-slate-950">Approve</button><button className="rounded-2xl border border-rose-300/40 px-5 py-3 font-black text-rose-200">Reject</button><button className="rounded-2xl border border-white/15 px-5 py-3 font-black">Open file</button></div></article>)}</section>
    <p className="mt-6 text-sm text-slate-400">API targets: GET /api/v1/admin/kyc-applications, PATCH /api/v1/kyc/applications/:applicationId/approve, PATCH /api/v1/kyc/applications/:applicationId/reject.</p>
  </div></main>;
}
function Badge({ label }: { label: string }) { return <span className="w-fit rounded-full bg-violet-400/15 px-4 py-2 text-sm text-violet-200">{label}</span>; }
