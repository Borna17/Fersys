import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Euro,
  Headphones,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router'

import {
  getAdminStats,
  type AdminStats,
} from './services/admin.service'

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
  const [stats, setStats] =
    useState<AdminStats>(emptyStats)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [lastUpdatedAt, setLastUpdatedAt] =
    useState<Date | null>(null)

  const loadStats =
    useCallback(async (): Promise<void> => {
      try {
        setLoading(true)
        setError('')

        const nextStats =
          await getAdminStats()

        setStats(nextStats)
        setLastUpdatedAt(new Date())
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : 'Podatke nije moguće učitati.',
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const paidSubscriptions =
    useMemo(
      () =>
        stats.subscriptionsActive,
      [stats.subscriptionsActive],
    )

  const totalVisibleSubscriptions =
    useMemo(
      () =>
        stats.subscriptionsActive +
        stats.subscriptionsTrialing +
        stats.subscriptionsPastDue,
      [
        stats.subscriptionsActive,
        stats.subscriptionsTrialing,
        stats.subscriptionsPastDue,
      ],
    )

  const healthySubscriptionRate =
    useMemo(() => {
      if (totalVisibleSubscriptions === 0) {
        return 0
      }

      return Math.round(
        (
          (
            stats.subscriptionsActive +
            stats.subscriptionsTrialing
          ) /
          totalVisibleSubscriptions
        ) *
          100,
      )
    }, [
      stats.subscriptionsActive,
      stats.subscriptionsTrialing,
      totalVisibleSubscriptions,
    ])

  const annualRunRate =
    stats.estimatedMrrEur * 12

  return (
    <section className="mx-auto max-w-[1500px]">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
            <ShieldCheck size={15} />
            Super administrator
          </div>

          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            FERSYS kontrolni centar
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Pregled svih tvrtki, pretplata,
            prihoda i korisničke podrške na
            jednom mjestu.
          </p>

          {lastUpdatedAt && (
            <p className="mt-3 text-xs text-slate-600">
              Zadnje osvježavanje:{' '}
              {lastUpdatedAt.toLocaleTimeString(
                'hr-HR',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                },
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/companies"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <Building2 size={17} />
            Upravljaj tvrtkama
          </Link>

          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />
            Osvježi podatke
          </button>
        </div>
      </header>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Ukupno tvrtki"
          value={stats.companiesTotal}
          note={`+${stats.companiesCreatedThisMonth} ovaj mjesec`}
          icon={<Building2 size={22} />}
          loading={loading}
          accent="blue"
        />

        <Stat
          title="Aktivne pretplate"
          value={paidSubscriptions}
          note={`${stats.subscriptionsTrialing} u trialu`}
          icon={<CreditCard size={22} />}
          loading={loading}
          accent="green"
        />

        <Stat
          title="Procijenjeni MRR"
          value={formatCurrency(
            stats.estimatedMrrEur,
          )}
          note={`${formatCurrency(
            annualRunRate,
          )} godišnje`}
          icon={<Euro size={22} />}
          loading={loading}
          accent="violet"
        />

        <Stat
          title="Otvoreni ticketi"
          value={stats.openTickets}
          note={`${stats.urgentTickets} hitnih`}
          icon={<Headphones size={22} />}
          loading={loading}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <SectionTitle
            icon={<TrendingUp size={22} />}
            title="Zdravlje platforme"
            description="Brzi pregled aktivacije i stanja pretplata."
            accent="blue"
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Zdrave pretplate"
              value={`${healthySubscriptionRate}%`}
              description="Aktivne i probne pretplate"
              icon={
                <CheckCircle2 size={20} />
              }
            />

            <MetricCard
              label="Probno razdoblje"
              value={stats.subscriptionsTrialing}
              description="Tvrtke u 7-dnevnom trialu"
              icon={<Clock3 size={20} />}
            />

            <MetricCard
              label="Zaostala plaćanja"
              value={stats.subscriptionsPastDue}
              description="Potrebna provjera naplate"
              icon={
                <AlertTriangle size={20} />
              }
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-black">
                  Struktura pretplata
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Aktivne i probne tvrtke po
                  paketima
                </p>
              </div>

              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-slate-400">
                {stats.starterCount +
                  stats.businessCount +
                  stats.proCount}{' '}
                ukupno
              </span>
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <PlanLine
                label="Starter"
                value={stats.starterCount}
                total={
                  stats.starterCount +
                  stats.businessCount +
                  stats.proCount
                }
                badge="15 €"
                colorClass="bg-sky-500"
              />

              <PlanLine
                label="Business"
                value={stats.businessCount}
                total={
                  stats.starterCount +
                  stats.businessCount +
                  stats.proCount
                }
                badge="25 €"
                colorClass="bg-violet-500"
              />

              <PlanLine
                label="FERSYS Pro"
                value={stats.proCount}
                total={
                  stats.starterCount +
                  stats.businessCount +
                  stats.proCount
                }
                badge="45 €"
                colorClass="bg-fuchsia-500"
              />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <SectionTitle
            icon={<Sparkles size={22} />}
            title="Brze akcije"
            description="Najvažniji dijelovi administracije."
            accent="violet"
          />

          <div className="mt-6 space-y-3">
            <QuickAction
              to="/admin/companies"
              icon={<Building2 size={20} />}
              title="Pregled svih tvrtki"
              description="Paketi, trial, statusi i korištenje"
            />

            <QuickAction
              to="/admin/support"
              icon={<Headphones size={20} />}
              title="Korisnička podrška"
              description={`${stats.openTickets} otvorenih ticketa`}
            />

            <QuickAction
              to="/admin/companies"
              icon={<CircleDollarSign size={20} />}
              title="Pretplate i naplata"
              description={`${stats.subscriptionsPastDue} zahtijeva pažnju`}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-violet-500/15 bg-violet-500/5 p-4 text-sm leading-6 text-slate-400">
            <Rocket
              className="mr-2 inline text-violet-300"
              size={17}
            />
            Nakon Stripe povezivanja ovdje će
            se prikazivati stvarne transakcije,
            povrati novca i neuspjele naplate.
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <SectionTitle
            icon={<AlertTriangle size={22} />}
            title="Zahtijeva pažnju"
            description="Stavke koje treba uskoro provjeriti."
            accent="amber"
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <AttentionCard
              label="Neuspjele naplate"
              value={
                stats.subscriptionsPastDue
              }
              description="Tvrtke sa statusom past due"
              warning={
                stats.subscriptionsPastDue >
                0
              }
            />

            <AttentionCard
              label="Hitni ticketi"
              value={stats.urgentTickets}
              description="Prioritetni zahtjevi korisnika"
              warning={
                stats.urgentTickets > 0
              }
            />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <SectionTitle
            icon={<Users size={22} />}
            title="Rast platforme"
            description="Sažetak trenutnog rasta FERSYS-a."
            accent="green"
          />

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Nove tvrtke ovaj mjesec
                </p>

                <p className="mt-2 text-4xl font-black">
                  {loading
                    ? '—'
                    : stats.companiesCreatedThisMonth}
                </p>
              </div>

              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-green-500/10 text-green-300">
                <TrendingUp size={25} />
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-700"
                style={{
                  width: `${
                    stats.companiesTotal > 0
                      ? Math.min(
                          100,
                          (
                            stats.companiesCreatedThisMonth /
                            stats.companiesTotal
                          ) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Udio novih registracija u odnosu
              na ukupan broj tvrtki.
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}

function Stat({
  title,
  value,
  note,
  icon,
  loading,
  accent,
}: {
  title: string
  value: string | number
  note: string
  icon: ReactNode
  loading: boolean
  accent:
    | 'blue'
    | 'green'
    | 'violet'
    | 'amber'
}) {
  const accentClasses = {
    blue: 'bg-blue-500/10 text-blue-300',
    green:
      'bg-green-500/10 text-green-300',
    violet:
      'bg-violet-500/10 text-violet-300',
    amber:
      'bg-amber-500/10 text-amber-300',
  }

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black">
            {loading ? '—' : value}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {note}
          </p>
        </div>

        <div
          className={`grid h-11 w-11 place-items-center rounded-2xl ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </article>
  )
}

function SectionTitle({
  icon,
  title,
  description,
  accent,
}: {
  icon: ReactNode
  title: string
  description: string
  accent:
    | 'blue'
    | 'violet'
    | 'amber'
    | 'green'
}) {
  const accentClasses = {
    blue: 'bg-blue-500/10 text-blue-300',
    violet:
      'bg-violet-500/10 text-violet-300',
    amber:
      'bg-amber-500/10 text-amber-300',
    green:
      'bg-green-500/10 text-green-300',
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${accentClasses[accent]}`}
      >
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-black">
          {title}
        </h2>

        <p className="text-sm text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string
  value: string | number
  description: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>

        <span className="text-violet-300">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  )
}

function PlanLine({
  label,
  value,
  total,
  badge,
  colorClass,
}: {
  label: string
  value: number
  total: number
  badge: string
  colorClass: string
}) {
  const percentage =
    total > 0
      ? Math.min(
          100,
          (value / total) * 100,
        )
      : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold">
            {label}
          </span>

          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-400">
            {badge}
          </span>
        </div>

        <span className="font-black text-slate-300">
          {value}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}

function QuickAction({
  to,
  icon,
  title,
  description,
}: {
  to: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-violet-500/30 hover:bg-violet-500/5"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-black">
          {title}
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">
          {description}
        </p>
      </div>

      <ArrowRight
        size={18}
        className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-300"
      />
    </Link>
  )
}

function AttentionCard({
  label,
  value,
  description,
  warning,
}: {
  label: string
  value: number
  description: string
  warning: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-slate-800 bg-slate-950/40'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {label}
        </p>

        {warning ? (
          <AlertTriangle
            size={18}
            className="text-amber-300"
          />
        ) : (
          <CheckCircle2
            size={18}
            className="text-green-300"
          />
        )}
      </div>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  )
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}
