import {
  Activity,
  ArrowRight,
  Clock3,
  Users,
  Wifi,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import { Link } from 'react-router'

import {
  getAdminTodayActivity,
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

export default function AdminActivitySummary() {
  const [data, setData] = useState<AdminTodayActivity | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await getAdminTodayActivity()
        if (!cancelled) setData(result)
      } catch (error) {
        console.error('Admin activity summary:', error)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 60_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <section className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-slate-900 to-slate-900 p-5 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300">
            <Activity size={19} />
            <span className="text-xs font-black uppercase tracking-[0.16em]">
              Aktivnost danas
            </span>
          </div>
          <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
            Brzi pregled korištenja FERSYS-a
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Detaljna povijest i filteri nalaze se u posebnom odjeljku Aktivnost.
          </p>
        </div>

        <Link
          to="/admin/activity"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500"
        >
          Otvori detalje
          <ArrowRight size={17} />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Users size={17} />}
          label="Korisnika danas"
          value={data?.uniqueUsers ?? '—'}
        />
        <Metric
          icon={<Wifi size={17} />}
          label="Aktivno sada"
          value={data?.onlineNow ?? '—'}
        />
        <Metric
          icon={<Clock3 size={17} />}
          label="Ukupno vrijeme"
          value={data ? formatDuration(data.totalSeconds) : '—'}
        />
      </div>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  )
}
