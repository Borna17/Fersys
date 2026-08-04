import { AlertTriangle, Building2, CreditCard, Euro, Headphones, Rocket, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getAdminStats, type AdminStats } from './services/admin.service'

const emptyStats: AdminStats = {
  companiesTotal: 0,
  companiesCreatedThisMonth: 0,
  subscriptionsActive: 0,
  subscriptionsTrialing: 0,
  subscriptionsPastDue: 0,
  starterCount: 0,
  businessCount: 0,
  proCount: 0,
  estimatedMrrEur: 0,
  openTickets: 0,
  urgentTickets: 0,
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getAdminStats()
      .then(setStats)
      .catch((value) => setError(value instanceof Error ? value.message : 'Podatke nije moguće učitati.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto max-w-[1500px]">
      <header>
        <div className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
          Super administrator
        </div>
        <h1 className="mt-4 text-3xl font-black sm:text-4xl">FERSYS platforma</h1>
        <p className="mt-2 text-slate-400">Pregled tvrtki, pretplata, prihoda i podrške.</p>
      </header>

      {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Ukupno tvrtki" value={stats.companiesTotal} note={`+${stats.companiesCreatedThisMonth} ovaj mjesec`} icon={<Building2 size={22} />} loading={loading} />
        <Stat title="Aktivne pretplate" value={stats.subscriptionsActive} note={`${stats.subscriptionsTrialing} u probnom razdoblju`} icon={<CreditCard size={22} />} loading={loading} />
        <Stat title="Procijenjeni MRR" value={`${stats.estimatedMrrEur.toLocaleString('hr-HR')} €`} note="Bez jednokratnih naplata" icon={<Euro size={22} />} loading={loading} />
        <Stat title="Otvoreni ticketi" value={stats.openTickets} note={`${stats.urgentTickets} hitnih`} icon={<Headphones size={22} />} loading={loading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300"><Users size={22} /></div>
            <div>
              <h2 className="text-xl font-black">Pretplate po paketima</h2>
              <p className="text-sm text-slate-500">Aktivne i probne tvrtke</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <PlanLine label="Starter" value={stats.starterCount} total={stats.companiesTotal} />
            <PlanLine label="Business" value={stats.businessCount} total={stats.companiesTotal} />
            <PlanLine label="FERSYS Pro" value={stats.proCount} total={stats.companiesTotal} />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-300"><AlertTriangle size={22} /></div>
            <div>
              <h2 className="text-xl font-black">Zahtijeva pažnju</h2>
              <p className="text-sm text-slate-500">Pretplate i korisnička podrška</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <AttentionCard label="Neuspjele naplate" value={stats.subscriptionsPastDue} />
            <AttentionCard label="Hitni ticketi" value={stats.urgentTickets} />
          </div>
          <div className="mt-5 rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 text-sm leading-6 text-slate-400">
            <Rocket className="mr-2 inline text-violet-300" size={17} />
            Nakon Stripe povezivanja ovdje će se prikazivati stvarna plaćanja, povrati i neuspjele naplate.
          </div>
        </article>
      </div>
    </section>
  )
}

function Stat({ title, value, note, icon, loading }: { title: string; value: string | number; note: string; icon: React.ReactNode; loading: boolean }) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black">{loading ? '—' : value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">{icon}</div>
      </div>
    </article>
  )
}

function PlanLine({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-bold">{label}</span><span className="text-slate-400">{value}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-violet-500" style={{ width: `${percentage}%` }} /></div>
    </div>
  )
}

function AttentionCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>
}
