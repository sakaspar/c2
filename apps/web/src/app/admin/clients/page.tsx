type Client = { id: string; fullName: string; email?: string; phone?: string; state: string; kycState: string; creditLimit?: { amount: number; currency: 'TND' } };
type Directory = { directory: string; profile: Record<string, unknown> | null };

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

async function getClients(): Promise<{ items: Client[]; directories: Directory[]; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/admin/clients`, { cache: 'no-store' });
    if (!response.ok) return { items: [], directories: [], error: `API returned ${response.status}` };
    return response.json();
  } catch {
    return { items: [], directories: [], error: 'API is offline or unreachable on port 4000' };
  }
}

export default async function ClientsPage() {
  const clients = await getClients();
  const rows = clients.items.length ? clients.items : clients.directories.flatMap((item) => item.profile ? [{ id: String(item.profile.id ?? item.directory), fullName: String(item.profile.fullName ?? item.directory), email: item.profile.email ? String(item.profile.email) : undefined, phone: item.profile.phone ? String(item.profile.phone) : undefined, state: String(item.profile.state ?? 'unknown'), kycState: String(item.profile.kycState ?? 'unknown'), creditLimit: item.profile.creditLimit as Client['creditLimit'] }] : []);
  return <main className="min-h-screen bg-[#050816] p-6 text-white"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-violet-300">Customer operations</p><h1 className="text-4xl font-black">All clients</h1><p className="mt-2 text-slate-300">Monitor every registered customer, KYC state, account state, and assigned credit.</p></div><a className="rounded-full border border-white/15 px-5 py-3" href="/admin">Admin home</a></header>
    {clients.error ? <div className="mt-8 rounded-3xl border border-rose-300/30 bg-rose-300/10 p-5 text-rose-100">{clients.error}. Start the API with pnpm --filter @bnpl/api dev.</div> : null}
    <section className="glass mt-8 overflow-hidden rounded-3xl"><div className="grid grid-cols-5 border-b border-white/10 p-4 text-sm font-bold text-slate-400"><span>Name</span><span>Email</span><span>Account</span><span>KYC</span><span>Credit limit</span></div>{rows.map((client) => <div className="grid grid-cols-5 border-b border-white/5 p-4 last:border-b-0" key={client.id}><b>{client.fullName}</b><span className="text-slate-300">{client.email ?? client.phone ?? 'No contact'}</span><span>{client.state}</span><span className="text-teal-200">{client.kycState}</span><span>{client.creditLimit ? `${client.creditLimit.amount} ${client.creditLimit.currency}` : '0 TND'}</span></div>)}{!rows.length ? <div className="p-5 text-slate-400">No clients found yet.</div> : null}</section>
    <section className="glass mt-8 rounded-3xl p-6"><h2 className="text-2xl font-black">Client data-lake directories</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{clients.directories.map((item) => <div className="rounded-2xl bg-white/5 p-4" key={item.directory}><b>data/clients/{item.directory}</b><p className="mt-2 text-sm text-slate-400">{item.profile ? 'profile.json loaded' : 'profile.json missing'}</p></div>)}{!clients.directories.length ? <p className="text-slate-400">No client directories found yet.</p> : null}</div></section>
    <p className="mt-6 text-sm text-slate-400">Live API target: GET /api/v1/admin/clients.</p>
  </div></main>;
}
