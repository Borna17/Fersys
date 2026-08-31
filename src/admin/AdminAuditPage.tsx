import { Activity, CalendarRange, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getAdminActivityRange,
  type AdminActivityEvent,
  type AdminActivityUser,
} from './services/adminActivity.service'

type AuditRow = AdminActivityEvent & {
  userName: string
  email: string
  companyName: string
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function rowsForUser(user: AdminActivityUser): AuditRow[] {
  return user.recentEvents
    .filter((event) => event.type === 'action')
    .map((event) => ({
      ...event,
      userName: user.userName,
      email: user.email,
      companyName: user.companyName,
    }))
}

export default function AdminAuditPage() {
  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setLoading(true)
        setError('')
        const today = startOfDay(new Date())
        const data = await getAdminActivityRange({
          start: addDays(today, -(days - 1)),
          end: addDays(today, 1),
        })

        if (cancelled) return

        setRows(
          data.users
            .flatMap(rowsForUser)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
        )
      } catch (value) {
        if (!cancelled) {
          setError(
            value instanceof Error
              ? value.message
              : 'Dnevnik radnji nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [days])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('hr-HR')
    if (!query) return rows

    return rows.filter((row) =>
      [
        row.label,
        row.route,
        row.userName,
        row.email,
        row.companyName,
      ]
        .join(' ')
        .toLocaleLowerCase('hr-HR')
        .includes(query),
    )
  }, [rows, search])

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-900 p-5 sm:p-7">
        <div className="flex items-center gap-3 text-violet-300">
          <ShieldCheck size={22} />
          <p className="text-xs font-black uppercase tracking-[0.18em]">
            Audit log
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          Dnevnik poslovnih radnji
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Tko je napravio poslovnu radnju, u kojoj tvrtki i kada. Ne prikazujemo sadržaj dokumenata, fotografije ni lozinke.
        </p>
      </header>

      <section className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[auto_1fr] sm:items-end sm:p-5">
        <label className="grid gap-1.5 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-2">
            <CalendarRange size={15} /> Razdoblje
          </span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-11 min-w-44 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none"
          >
            <option value={1}>Danas</option>
            <option value={7}>7 dana</option>
            <option value={30}>30 dana</option>
            <option value={90}>90 dana</option>
          </select>
        </label>

        <label className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pretraži korisnika, tvrtku ili radnju..."
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-500"
          />
        </label>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-violet-300" />
            <h2 className="font-black text-white">Poslovne radnje</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {filtered.length} zapisa
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Učitavanje dnevnika...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-black text-white">Nema zabilježenih poslovnih radnji</p>
            <p className="mt-2 text-sm text-slate-500">
              Nove radnje pojavit će se ovdje nakon što ih korisnici naprave u FERSYS-u.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((row, index) => (
              <article
                key={`${row.createdAt}-${row.userName}-${index}`}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <div className="min-w-0">
                  <p className="font-black text-white">{row.label || 'Poslovna radnja'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{row.route || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-200">{row.userName}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {row.companyName} · {row.email || 'bez e-maila'}
                  </p>
                </div>
                <time className="text-xs font-bold text-slate-500">
                  {formatTime(row.createdAt)}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
