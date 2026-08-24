import {
  Activity,
  Clock3,
  Eye,
  RefreshCw,
  Users,
  Wifi,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getAdminTodayActivity,
  type AdminActivityUser,
  type AdminTodayActivity,
} from './services/adminActivity.service'

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function routeLabel(route: string) {
  if (route.startsWith('/work-orders')) return 'Radni nalozi'
  if (route.startsWith('/offers')) return 'Ponude'
  if (route.startsWith('/customers')) return 'Investitori'
  if (route.startsWith('/invoices')) return 'Računi'
  if (route.startsWith('/calendar')) return 'Kalendar'
  if (route.startsWith('/inventory')) return 'Skladište'
  if (route.startsWith('/vehicles')) return 'Vozila'
  if (route.startsWith('/settings')) return 'Postavke'
  if (route.startsWith('/ai')) return 'AI pomoćnik'
  if (route.startsWith('/admin')) return 'Admin'
  if (route.startsWith('/dashboard')) return 'Početna'
  return route || '—'
}

function UserRow({ user }: { user: AdminActivityUser }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="grid w-full gap-4 text-left lg:grid-cols-[minmax(0,1.5fr)_1fr_.8fr_.8fr_1fr] lg:items-center"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                user.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
            <strong className="truncate text-sm text-white">
              {user.userName}
            </strong>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">
            {user.email || 'Bez e-maila'} · {user.companyName}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Zadnja stranica
          </p>
          <p className="mt-1 text-sm font-bold text-slate-300">
            {routeLabel(user.lastRoute)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Prvi ulaz
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {formatTime(user.firstSeenAt)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Zadnje aktivan
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {formatTime(user.lastSeenAt)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Vrijeme danas
          </p>
          <p className="mt-1 text-sm font-black text-violet-300">
            {formatDuration(user.durationSeconds)}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Današnje kretanje kroz FERSYS
            </p>
            <span className="text-xs text-slate-600">
              {user.sessionsCount} sesija
            </span>
          </div>

          {user.recentEvents.length === 0 ? (
            <p className="text-sm text-slate-500">Još nema zabilježenih otvaranja stranica.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {user.recentEvents.map((event, index) => (
                <div
                  key={`${event.createdAt}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <p className="text-xs font-bold text-slate-200">
                    {event.label || routeLabel(event.route)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {formatTime(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminTodayActivity() {
  const [data, setData] = useState<AdminTodayActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setData(await getAdminTodayActivity())
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Aktivnost korisnika nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const users = useMemo(
    () => data?.users ?? [],
    [data],
  )

  return (
    <section className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-900 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300">
            <Activity size={20} />
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Aktivnost danas
            </p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            Tko je danas koristio FERSYS
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Prijave, vrijeme aktivnosti i otvoreni moduli. Bez sadržaja koji korisnici upisuju.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm font-bold text-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Osvježi
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users size={18} />} label="Korisnika danas" value={data?.uniqueUsers ?? 0} />
        <Metric icon={<Wifi size={18} />} label="Aktivno sada" value={data?.onlineNow ?? 0} />
        <Metric icon={<Clock3 size={18} />} label="Ukupno vrijeme" value={formatDuration(data?.totalSeconds ?? 0)} />
        <Metric icon={<Eye size={18} />} label="Otvaranja stranica" value={data?.pageViews ?? 0} />
      </div>

      <div className="mt-5 space-y-3">
        {loading && !data ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
            Učitavanje današnje aktivnosti...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
            Danas još nema zabilježene aktivnosti. Podaci će se početi puniti nakon što korisnici otvore novu verziju FERSYS-a.
          </div>
        ) : (
          users.map((user) => (
            <UserRow key={`${user.companyId}-${user.userId}`} user={user} />
          ))
        )}
      </div>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}
