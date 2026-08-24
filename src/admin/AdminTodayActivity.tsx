import {
  Activity,
  BriefcaseBusiness,
  CalendarRange,
  Clock3,
  Eye,
  RefreshCw,
  Search,
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
  getAdminActivityRange,
  type AdminActivityRange,
  type AdminActivityUser,
  type AdminTodayActivity,
} from './services/adminActivity.service'

type Preset = {
  id: string
  label: string
  mode: 'day' | 'range'
  value: number
}

const presets: Preset[] = [
  { id: 'today', label: 'Danas', mode: 'day', value: 0 },
  { id: 'yesterday', label: 'Jučer', mode: 'day', value: 1 },
  { id: 'day-2', label: 'Prije 2 dana', mode: 'day', value: 2 },
  { id: 'day-3', label: 'Prije 3 dana', mode: 'day', value: 3 },
  { id: 'day-4', label: 'Prije 4 dana', mode: 'day', value: 4 },
  { id: 'day-5', label: 'Prije 5 dana', mode: 'day', value: 5 },
  { id: 'range-7', label: '7 dana', mode: 'range', value: 7 },
  { id: 'range-10', label: '10 dana', mode: 'range', value: 10 },
  { id: 'range-30', label: '30 dana', mode: 'range', value: 30 },
]

function startOfLocalDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function rangeForPreset(preset: Preset): AdminActivityRange {
  const today = startOfLocalDay()

  if (preset.mode === 'day') {
    const start = addDays(today, -preset.value)
    return {
      start,
      end: addDays(start, 1),
    }
  }

  return {
    start: addDays(today, -(preset.value - 1)),
    end: addDays(today, 1),
  }
}

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function routeLabel(route: string) {
  if (route.startsWith('/work-orders')) return 'Radni nalozi'
  if (route.startsWith('/offers')) return 'Ponude'
  if (route.startsWith('/customers')) return 'Investitori'
  if (route.startsWith('/invoices')) return 'Računi'
  if (route.startsWith('/incoming-invoices')) return 'Ulazni računi'
  if (route.startsWith('/calendar')) return 'Kalendar'
  if (route.startsWith('/inventory')) return 'Skladište'
  if (route.startsWith('/vehicles')) return 'Vozila'
  if (route.startsWith('/settings')) return 'Postavke'
  if (route.startsWith('/ai')) return 'AI pomoćnik'
  if (route.startsWith('/admin')) return 'Admin'
  if (route.startsWith('/dashboard')) return 'Početna'
  return route || '—'
}

function UserRow({
  user,
  periodLabel,
}: {
  user: AdminActivityUser
  periodLabel: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="grid w-full gap-4 text-left lg:grid-cols-[minmax(0,1.45fr)_1fr_.8fr_.8fr_1fr] lg:items-center"
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
          <p className="mt-2 text-[11px] font-bold text-slate-600">
            {user.pageViews} otvaranja · {user.businessActions} poslovnih radnji · {user.sessionsCount} sesija
          </p>
        </div>

        <InfoCell label="Zadnja stranica" value={routeLabel(user.lastRoute)} strong />
        <InfoCell label="Prvi ulaz" value={formatTime(user.firstSeenAt)} />
        <InfoCell label="Zadnje aktivan" value={formatTime(user.lastSeenAt)} />
        <InfoCell label="Vrijeme" value={formatDuration(user.durationSeconds)} accent />
      </button>

      {expanded && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Aktivnost · {periodLabel}
            </p>
            <span className="text-xs text-slate-600">
              Zadnjih {user.recentEvents.length} događaja u rasponu
            </span>
          </div>

          {user.recentEvents.length === 0 ? (
            <p className="text-sm text-slate-500">Nema detaljnih događaja u ovom razdoblju.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {user.recentEvents.map((event, index) => (
                <div
                  key={`${event.createdAt}-${index}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-200">
                      {event.label || routeLabel(event.route)}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        event.type === 'action'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-blue-500/10 text-blue-300'
                      }`}
                    >
                      {event.type === 'action' ? 'Radnja' : 'Stranica'}
                    </span>
                  </div>
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
  const todayRange = useMemo(() => rangeForPreset(presets[0]), [])

  const [data, setData] = useState<AdminTodayActivity | null>(null)
  const [range, setRange] = useState<AdminActivityRange>(todayRange)
  const [activePreset, setActivePreset] = useState('today')
  const [customFrom, setCustomFrom] = useState(dateInputValue(todayRange.start))
  const [customTo, setCustomTo] = useState(dateInputValue(todayRange.start))
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'time' | 'actions'>('recent')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const periodLabel = useMemo(() => {
    const preset = presets.find((item) => item.id === activePreset)
    if (preset) return preset.label

    return `${new Date(range.start).toLocaleDateString('hr-HR')} – ${addDays(range.end, -1).toLocaleDateString('hr-HR')}`
  }, [activePreset, range])

  const load = useCallback(async (nextRange = range) => {
    try {
      setLoading(true)
      setError('')
      setData(await getAdminActivityRange(nextRange))
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Aktivnost korisnika nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void load(range)
  }, [range])

  useEffect(() => {
    if (activePreset !== 'today') return
    const timer = window.setInterval(() => void load(range), 60_000)
    return () => window.clearInterval(timer)
  }, [activePreset, load, range])

  const users = useMemo(() => {
    const query = search.trim().toLowerCase()
    const next = (data?.users ?? []).filter((user) => {
      if (!query) return true
      return [user.userName, user.email, user.companyName].some((value) =>
        value.toLowerCase().includes(query),
      )
    })

    return [...next].sort((a, b) => {
      if (sortBy === 'time') return b.durationSeconds - a.durationSeconds
      if (sortBy === 'actions') return b.businessActions - a.businessActions
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    })
  }, [data, search, sortBy])

  function choosePreset(preset: Preset) {
    const nextRange = rangeForPreset(preset)
    setActivePreset(preset.id)
    setRange(nextRange)
    setCustomFrom(dateInputValue(nextRange.start))
    setCustomTo(dateInputValue(addDays(nextRange.end, -1)))
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) return

    const start = new Date(`${customFrom}T00:00:00`)
    const lastDay = new Date(`${customTo}T00:00:00`)

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(lastDay.getTime()) ||
      lastDay < start
    ) {
      setError('Odaberi ispravan raspon datuma.')
      return
    }

    const end = addDays(lastDay, 1)
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000)

    if (days > 93) {
      setError('Najveći raspon za jedan pregled je 93 dana.')
      return
    }

    setActivePreset('custom')
    setRange({ start, end })
  }

  return (
    <section className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-slate-900 p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300">
            <Activity size={20} />
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Aktivnost korisnika
            </p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            Tko koristi FERSYS i što radi
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Sesije, vrijeme aktivnosti, otvoreni moduli i poslovne radnje. Ne bilježimo lozinke, tekst koji korisnici upisuju, fotografije ni sadržaj dokumenata.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(range)}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm font-bold text-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Osvježi
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <CalendarRange size={17} />
          <p className="text-xs font-black uppercase tracking-[0.14em]">Razdoblje</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset)}
              className={`min-h-9 rounded-xl border px-3 text-xs font-black transition ${
                activePreset === preset.id
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
            Od datuma
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-white outline-none"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
            Do datuma
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-white outline-none"
            />
          </label>
          <button
            type="button"
            onClick={applyCustomRange}
            className="min-h-11 self-end rounded-xl bg-slate-800 px-5 text-sm font-black text-white hover:bg-slate-700"
          >
            Prikaži raspon
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={<Users size={18} />} label="Korisnika" value={data?.uniqueUsers ?? 0} />
        <Metric icon={<Wifi size={18} />} label="Aktivno sada" value={data?.onlineNow ?? 0} />
        <Metric icon={<Clock3 size={18} />} label="Ukupno vrijeme" value={formatDuration(data?.totalSeconds ?? 0)} />
        <Metric icon={<Eye size={18} />} label="Otvaranja" value={data?.pageViews ?? 0} />
        <Metric icon={<BriefcaseBusiness size={18} />} label="Poslovne radnje" value={data?.businessActions ?? 0} />
        <Metric icon={<Activity size={18} />} label="Sesije" value={data?.sessions ?? 0} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pretraži korisnika, e-mail ili tvrtku..."
            className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-11 pr-4 text-sm text-white outline-none"
          />
        </label>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          className="h-11 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm font-bold text-slate-300"
        >
          <option value="recent">Zadnje aktivni</option>
          <option value="time">Najviše vremena</option>
          <option value="actions">Najviše radnji</option>
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {loading && !data ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
            Učitavanje aktivnosti...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
            Nema zabilježene aktivnosti za odabrano razdoblje ili pretragu.
          </div>
        ) : (
          users.map((user) => (
            <UserRow
              key={`${user.companyId}-${user.userId}`}
              user={user}
              periodLabel={periodLabel}
            />
          ))
        )}
      </div>
    </section>
  )
}

function InfoCell({
  label,
  value,
  strong = false,
  accent = false,
}: {
  label: string
  value: ReactNode
  strong?: boolean
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${
          accent
            ? 'font-black text-violet-300'
            : strong
              ? 'font-bold text-slate-300'
              : 'text-slate-300'
        }`}
      >
        {value}
      </p>
    </div>
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
