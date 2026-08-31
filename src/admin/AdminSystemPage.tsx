import {
  Activity,
  Building2,
  Database,
  Eye,
  RefreshCw,
  ShieldCheck,
  Users,
  Wifi,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

import {
  getAdminActivityRange,
  type AdminTodayActivity,
} from './services/adminActivity.service'

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

export default function AdminSystemPage() {
  const [data, setData] = useState<AdminTodayActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const end = new Date()
      const start = new Date(end)
      start.setHours(start.getHours() - 24)
      setData(await getAdminActivityRange({ start, end }))
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Stanje sustava nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const companies = new Set(data?.users.map((user) => user.companyId) ?? []).size

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck size={22} />
              <p className="text-xs font-black uppercase tracking-[0.18em]">System health</p>
            </div>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Zdravlje FERSYS-a</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Brzi operativni pregled dostupnosti aplikacije i aktivnosti u zadnja 24 sata.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm font-black text-slate-300 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Osvježi
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat icon={<Database size={16} />} label="Admin API" value={error ? 'Greška' : 'OK'} />
        <Stat icon={<Wifi size={16} />} label="Online sada" value={String(data?.onlineNow ?? 0)} />
        <Stat icon={<Users size={16} />} label="Korisnici 24 h" value={String(data?.uniqueUsers ?? 0)} />
        <Stat icon={<Building2 size={16} />} label="Tvrtke 24 h" value={String(companies)} />
        <Stat icon={<Eye size={16} />} label="Otvaranja 24 h" value={String(data?.pageViews ?? 0)} />
        <Stat icon={<Activity size={16} />} label="Poslovne radnje" value={String(data?.businessActions ?? 0)} />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-black text-white">Operativni status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Baza i Admin RPC</p>
            <p className="mt-2 text-sm text-slate-300">
              {error ? 'Administratorski podaci trenutačno nisu dostupni.' : 'Veza radi i administratorski podaci se učitavaju.'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Sesije</p>
            <p className="mt-2 text-sm text-slate-300">{data?.sessions ?? 0} sesija zabilježeno je u promatranom razdoblju.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Praćenje privatnosti</p>
            <p className="mt-2 text-sm text-slate-300">Prate se korištenje modula i poslovne radnje, bez sadržaja dokumenata, fotografija i lozinki.</p>
          </div>
        </div>
      </section>
    </section>
  )
}
