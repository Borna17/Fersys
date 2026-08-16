import type { ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  Euro,
  Headphones,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  Users,
  Zap,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router'

import {
  getAdminCompanies,
  getAdminStats,
  type AdminCompany,
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

type AttentionItem = {
  id: string
  companyId: string
  companyName: string
  title: string
  description: string
  severity: 'danger' | 'warning' | 'info'
}

type UpgradeCandidate = {
  company: AdminCompany
  score: number
  reason: string
}

function parseDate(value: string | null) {
  if (!value) return null

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed
}

function daysUntil(value: string | null) {
  const date = parseDate(value)

  if (!date) return null

  const now = new Date()

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  const target = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )

  return Math.ceil(
    (target.getTime() - start.getTime()) /
      86_400_000,
  )
}

function formatDate(value: string | null) {
  const date = parseDate(value)

  if (!date) return '—'

  return date.toLocaleDateString('hr-HR')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value)
}

function planLabel(planId: AdminCompany['planId']) {
  if (planId === 'starter') return 'Starter'
  if (planId === 'business') return 'Business'
  return 'FERSYS Pro'
}

function workload(company: AdminCompany) {
  return (
    company.usersCount * 3 +
    company.customersCount +
    company.workOrdersCount * 2 +
    company.offersCount * 2
  )
}

function upgradeScore(company: AdminCompany) {
  if (company.planId === 'pro') {
    return 0
  }

  let score = 0

  if (company.planId === 'starter') {
    score += 18
  }

  if (company.planId === 'business') {
    score += 10
  }

  score += Math.min(company.usersCount * 5, 20)
  score += Math.min(company.customersCount / 2, 15)
  score += Math.min(company.workOrdersCount, 25)
  score += Math.min(company.offersCount, 22)

  return Math.round(score)
}

function upgradeReason(company: AdminCompany) {
  if (
    company.workOrdersCount >= 25 ||
    company.offersCount >= 25
  ) {
    return 'Visoko korištenje dokumenata'
  }

  if (company.usersCount >= 4) {
    return 'Više aktivnih korisnika'
  }

  if (company.customersCount >= 20) {
    return 'Veća baza investitora'
  }

  return 'Rast korištenja FERSYS-a'
}

export function AdminDashboardPage() {
  const [stats, setStats] =
    useState<AdminStats>(emptyStats)

  const [companies, setCompanies] =
    useState<AdminCompany[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [lastUpdatedAt, setLastUpdatedAt] =
    useState<Date | null>(null)

  const loadData =
    useCallback(async (): Promise<void> => {
      try {
        setLoading(true)
        setError('')

        const [
          nextStats,
          nextCompanies,
        ] = await Promise.all([
          getAdminStats(),
          getAdminCompanies(),
        ])

        setStats(nextStats)
        setCompanies(nextCompanies)
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
    void loadData()
  }, [loadData])

  const paidSubscriptions =
    stats.subscriptionsActive

  const totalVisibleSubscriptions =
    stats.subscriptionsActive +
    stats.subscriptionsTrialing +
    stats.subscriptionsPastDue

  const healthySubscriptionRate =
    totalVisibleSubscriptions > 0
      ? Math.round(
          ((
            stats.subscriptionsActive +
            stats.subscriptionsTrialing
          ) /
            totalVisibleSubscriptions) *
            100,
        )
      : 0

  const paidShare =
    totalVisibleSubscriptions > 0
      ? Math.round(
          (stats.subscriptionsActive /
            totalVisibleSubscriptions) *
            100,
        )
      : 0

  const annualRunRate =
    stats.estimatedMrrEur * 12

  const companiesOnPro = companies.filter(
    (company) => company.planId === 'pro',
  ).length

  const totalUsers = companies.reduce(
    (sum, company) =>
      sum + company.usersCount,
    0,
  )

  const totalCustomers = companies.reduce(
    (sum, company) =>
      sum + company.customersCount,
    0,
  )

  const totalWorkOrders = companies.reduce(
    (sum, company) =>
      sum + company.workOrdersCount,
    0,
  )

  const totalOffers = companies.reduce(
    (sum, company) =>
      sum + company.offersCount,
    0,
  )

  const trialExpiringSoon = useMemo(
    () =>
      companies
        .filter((company) => {
          if (
            company.subscriptionStatus !==
            'trialing'
          ) {
            return false
          }

          const days = daysUntil(
            company.trialEndsAt,
          )

          return (
            days !== null &&
            days >= 0 &&
            days <= 7
          )
        })
        .sort((a, b) => {
          const aDays =
            daysUntil(a.trialEndsAt) ?? 999
          const bDays =
            daysUntil(b.trialEndsAt) ?? 999

          return aDays - bDays
        }),
    [companies],
  )

  const attentionItems =
    useMemo<AttentionItem[]>(() => {
      const result: AttentionItem[] = []

      companies.forEach((company) => {
        if (
          company.subscriptionStatus ===
          'past_due'
        ) {
          result.push({
            id: `past-due-${company.companyId}`,
            companyId: company.companyId,
            companyName: company.companyName,
            title: 'Plaćanje kasni',
            description:
              'Pretplata ima status past_due i zahtijeva provjeru.',
            severity: 'danger',
          })
        }

        if (
          company.subscriptionStatus ===
          'trialing'
        ) {
          const days = daysUntil(
            company.trialEndsAt,
          )

          if (
            days !== null &&
            days >= 0 &&
            days <= 7
          ) {
            result.push({
              id: `trial-${company.companyId}`,
              companyId: company.companyId,
              companyName: company.companyName,
              title:
                days === 0
                  ? 'Trial istječe danas'
                  : `Trial istječe za ${days} d.`,
              description:
                'Dobar trenutak za kontakt i ponudu plaćenog paketa.',
              severity:
                days <= 2
                  ? 'warning'
                  : 'info',
            })
          }
        }
      })

      if (stats.urgentTickets > 0) {
        result.unshift({
          id: 'urgent-tickets',
          companyId: '',
          companyName: 'Korisnička podrška',
          title: `${stats.urgentTickets} hitnih ticketa`,
          description:
            'Otvoreni hitni zahtjevi trebaju prioritetnu obradu.',
          severity: 'danger',
        })
      }

      return result.slice(0, 8)
    }, [companies, stats.urgentTickets])

  const upgradeCandidates =
    useMemo<UpgradeCandidate[]>(
      () =>
        companies
          .filter(
            (company) =>
              company.planId !== 'pro' &&
              company.subscriptionStatus !==
                'past_due',
          )
          .map((company) => ({
            company,
            score: upgradeScore(company),
            reason: upgradeReason(company),
          }))
          .filter(
            (candidate) =>
              candidate.score >= 35,
          )
          .sort(
            (a, b) => b.score - a.score,
          )
          .slice(0, 6),
      [companies],
    )

  const topCompanies = useMemo(
    () =>
      [...companies]
        .sort(
          (a, b) =>
            workload(b) - workload(a),
        )
        .slice(0, 6),
    [companies],
  )

  const newestCompanies = useMemo(
    () =>
      [...companies]
        .sort((a, b) => {
          const aTime =
            parseDate(a.createdAt)?.getTime() ??
            0
          const bTime =
            parseDate(b.createdAt)?.getTime() ??
            0

          return bTime - aTime
        })
        .slice(0, 5),
    [companies],
  )

  const planTotal =
    stats.starterCount +
    stats.businessCount +
    stats.proCount

  return (
    <section className="mx-auto max-w-[1600px] pb-10">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
            <ShieldCheck size={15} />
            Super administrator
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            FERSYS kontrolni centar
          </h1>

          <p className="mt-2 max-w-3xl text-slate-400">
            Poslovni pregled platforme, pretplata,
            korištenja, prodajnih prilika i svega
            što zahtijeva tvoju pažnju.
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
            Sve tvrtke
          </Link>

          <Link
            to="/admin/support"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <Headphones size={17} />
            Podrška
          </Link>

          <button
            type="button"
            onClick={() => void loadData()}
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
            Osvježi
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
          )} ARR`}
          icon={<Euro size={22} />}
          loading={loading}
          accent="violet"
        />

        <Stat
          title="Korisnici"
          value={totalUsers}
          note={`u ${companies.length} tvrtki`}
          icon={<Users size={22} />}
          loading={loading}
          accent="cyan"
        />

        <Stat
          title="Zahtijeva pažnju"
          value={attentionItems.length}
          note={`${stats.urgentTickets} hitnih ticketa`}
          icon={<AlertTriangle size={22} />}
          loading={loading}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            icon={<TrendingUp size={22} />}
            title="Poslovno zdravlje"
            description="Ključne brojke za pretplate i rast FERSYS-a."
            accent="blue"
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Zdrave pretplate"
              value={`${healthySubscriptionRate}%`}
              description="Aktivne + trial"
              icon={<CheckCircle2 size={20} />}
            />

            <MetricCard
              label="Plaćeni udio"
              value={`${paidShare}%`}
              description="Aktivne od vidljivih pretplata"
              icon={<CircleMetric />}
            />

            <MetricCard
              label="FERSYS Pro"
              value={companiesOnPro}
              description="Tvrtke bez limita"
              icon={<Crown size={20} />}
            />

            <MetricCard
              label="Trial uskoro istječe"
              value={trialExpiringSoon.length}
              description="U sljedećih 7 dana"
              icon={<Clock3 size={20} />}
            />
          </div>

          <div className="mt-6">
            <p className="text-sm font-black text-white">
              Raspodjela paketa
            </p>

            <div className="mt-4 space-y-4">
              <PlanBar
                label="Starter"
                count={stats.starterCount}
                total={planTotal}
                price={19.99}
                tone="slate"
              />

              <PlanBar
                label="Business"
                count={stats.businessCount}
                total={planTotal}
                price={29.99}
                tone="blue"
              />

              <PlanBar
                label="FERSYS Pro"
                count={stats.proCount}
                total={planTotal}
                price={49.99}
                tone="violet"
              />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            icon={<AlertTriangle size={22} />}
            title="Zahtijeva pažnju"
            description="Stvari na koje bi admin trebao reagirati."
            accent="amber"
          />

          <div className="mt-5 space-y-3">
            {attentionItems.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={22} />}
                title="Sve izgleda dobro"
                description="Nema kritičnih pretplata ni triala koji uskoro istječu."
              />
            ) : (
              attentionItems.map((item) => (
                <AttentionRow
                  key={item.id}
                  item={item}
                />
              ))
            )}
          </div>

          {stats.openTickets > 0 && (
            <Link
              to="/admin/support"
              className="mt-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm font-black text-slate-300 transition hover:border-violet-500/30"
            >
              <span>
                Otvori svih {stats.openTickets}{' '}
                ticketa
              </span>
              <ArrowRight size={17} />
            </Link>
          )}
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            icon={<Crown size={22} />}
            title="Kandidati za FERSYS Pro"
            description="Tvrtke koje po korištenju imaju najveći potencijal za upgrade."
            accent="violet"
          />

          <div className="mt-5 space-y-3">
            {upgradeCandidates.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={22} />}
                title="Nema jakih kandidata"
                description="Kako korištenje raste, ovdje će se pojaviti tvrtke pogodne za upgrade."
              />
            ) : (
              upgradeCandidates.map(
                ({ company, score, reason }) => (
                  <Link
                    key={company.companyId}
                    to={`/admin/companies/${company.companyId}`}
                    className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-violet-500/30"
                  >
                    <CompanyAvatar
                      company={company}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-white">
                          {company.companyName}
                        </p>

                        <PlanBadge
                          planId={company.planId}
                        />
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {reason}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          {company.workOrdersCount}{' '}
                          naloga
                        </span>
                        <span>
                          {company.offersCount}{' '}
                          ponuda
                        </span>
                        <span>
                          {company.usersCount}{' '}
                          korisnika
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Score
                      </p>
                      <p className="mt-1 text-xl font-black text-violet-300">
                        {score}
                      </p>
                    </div>
                  </Link>
                ),
              )
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            icon={<Activity size={22} />}
            title="Najviše koriste FERSYS"
            description="Poredak prema trenutnom volumenu podataka i rada."
            accent="green"
          />

          <div className="mt-5 space-y-3">
            {topCompanies.length === 0 ? (
              <EmptyState
                icon={<Building2 size={22} />}
                title="Još nema podataka"
                description="Aktivnost tvrtki prikazat će se nakon korištenja aplikacije."
              />
            ) : (
              topCompanies.map(
                (company, index) => (
                  <Link
                    key={company.companyId}
                    to={`/admin/companies/${company.companyId}`}
                    className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-emerald-500/25"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-sm font-black text-emerald-300">
                      {index + 1}
                    </div>

                    <CompanyAvatar
                      company={company}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">
                        {company.companyName}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          {company.workOrdersCount}{' '}
                          RN
                        </span>
                        <span>
                          {company.offersCount}{' '}
                          ponuda
                        </span>
                        <span>
                          {company.customersCount}{' '}
                          investitora
                        </span>
                      </div>
                    </div>

                    <PlanBadge
                      planId={company.planId}
                    />
                  </Link>
                ),
              )
            )}
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            icon={<BarChart3 size={22} />}
            title="Korištenje platforme"
            description="Ukupan volumen podataka koje firme vode kroz FERSYS."
            accent="cyan"
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UsageCard
              label="Investitori"
              value={totalCustomers}
              icon={<Users size={19} />}
            />

            <UsageCard
              label="Radni nalozi"
              value={totalWorkOrders}
              icon={<Zap size={19} />}
            />

            <UsageCard
              label="Ponude"
              value={totalOffers}
              icon={<Rocket size={19} />}
            />

            <UsageCard
              label="Korisnici"
              value={totalUsers}
              icon={<UserRoundCheck size={19} />}
            />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <SectionTitle
            icon={<Rocket size={22} />}
            title="Nove tvrtke"
            description="Najnovije registrirane tvrtke na platformi."
            accent="violet"
          />

          <div className="mt-5 divide-y divide-slate-800">
            {newestCompanies.map((company) => (
              <Link
                key={company.companyId}
                to={`/admin/companies/${company.companyId}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <CompanyAvatar
                  company={company}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">
                    {company.companyName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">
                    {company.ownerEmail ||
                      'Nema emaila vlasnika'}
                  </p>
                </div>

                <div className="text-right">
                  <PlanBadge
                    planId={company.planId}
                  />
                  <p className="mt-1 text-[10px] text-slate-600">
                    {formatDate(company.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-violet-500/15 bg-gradient-to-r from-violet-950/35 via-slate-900 to-blue-950/30 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-300">
              <Sparkles size={20} />
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                Admin intelligence
              </span>
            </div>

            <h2 className="mt-2 text-xl font-black text-white">
              Fokus: pretvori aktivne Business
              korisnike u FERSYS Pro
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Dashboard izdvaja firme koje imaju
              veći broj radnih naloga, ponuda,
              investitora i korisnika. To su
              najbolji kandidati za paket bez
              ograničenja.
            </p>
          </div>

          <Link
            to="/admin/companies"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-violet-500"
          >
            Pregledaj tvrtke
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </section>
  )
}

function CircleMetric() {
  return (
    <div className="grid h-5 w-5 place-items-center rounded-full border-2 border-current">
      <div className="h-1.5 w-1.5 rounded-full bg-current" />
    </div>
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
  value: ReactNode
  note: string
  icon: ReactNode
  loading: boolean
  accent:
    | 'blue'
    | 'green'
    | 'violet'
    | 'amber'
    | 'cyan'
}) {
  const styles = {
    blue: 'border-blue-500/15 bg-blue-500/10 text-blue-300',
    green:
      'border-emerald-500/15 bg-emerald-500/10 text-emerald-300',
    violet:
      'border-violet-500/15 bg-violet-500/10 text-violet-300',
    amber:
      'border-amber-500/15 bg-amber-500/10 text-amber-300',
    cyan: 'border-cyan-500/15 bg-cyan-500/10 text-cyan-300',
  }[accent]

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${styles}`}>
        {icon}
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>

      <div className="mt-2 min-h-10">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-800" />
        ) : (
          <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {value}
          </p>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-600">
        {note}
      </p>
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
    | 'green'
    | 'violet'
    | 'amber'
    | 'cyan'
}) {
  const tone = {
    blue: 'bg-blue-500/10 text-blue-300',
    green:
      'bg-emerald-500/10 text-emerald-300',
    violet:
      'bg-violet-500/10 text-violet-300',
    amber:
      'bg-amber-500/10 text-amber-300',
    cyan: 'bg-cyan-500/10 text-cyan-300',
  }[accent]

  return (
    <div className="flex items-start gap-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-black text-white">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
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
  value: ReactNode
  description: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="text-slate-500">
        {icon}
      </div>

      <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-600">
        {description}
      </p>
    </div>
  )
}

function PlanBar({
  label,
  count,
  total,
  price,
  tone,
}: {
  label: string
  count: number
  total: number
  price: number
  tone: 'slate' | 'blue' | 'violet'
}) {
  const percentage =
    total > 0
      ? Math.round((count / total) * 100)
      : 0

  const barTone = {
    slate: 'bg-slate-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
  }[tone]

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="font-black text-white">
            {label}
          </span>
          <span className="ml-2 text-xs text-slate-600">
            {formatCurrency(price)}/mj.
          </span>
        </div>

        <div className="text-right">
          <strong className="text-white">
            {count}
          </strong>
          <span className="ml-2 text-xs text-slate-600">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${barTone}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}

function AttentionRow({
  item,
}: {
  item: AttentionItem
}) {
  const style = {
    danger:
      'border-red-500/15 bg-red-500/[0.07] text-red-300',
    warning:
      'border-amber-500/15 bg-amber-500/[0.07] text-amber-300',
    info: 'border-blue-500/15 bg-blue-500/[0.07] text-blue-300',
  }[item.severity]

  const content = (
    <>
      <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${style}`}>
        <AlertTriangle size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {item.title}
        </p>

        <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
          {item.companyName}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-600">
          {item.description}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="shrink-0 text-slate-700"
      />
    </>
  )

  if (!item.companyId) {
    return (
      <Link
        to="/admin/support"
        className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-slate-700"
      >
        {content}
      </Link>
    )
  }

  return (
    <Link
      to={`/admin/companies/${item.companyId}`}
      className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-slate-700"
    >
      {content}
    </Link>
  )
}

function CompanyAvatar({
  company,
}: {
  company: AdminCompany
}) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-800">
      {company.companyLogoUrl ? (
        <img
          src={company.companyLogoUrl}
          alt=""
          className="h-full w-full object-contain bg-white p-1"
        />
      ) : (
        <Building2
          size={19}
          className="text-slate-500"
        />
      )}
    </div>
  )
}

function PlanBadge({
  planId,
}: {
  planId: AdminCompany['planId']
}) {
  const tone =
    planId === 'pro'
      ? 'border-violet-500/20 bg-violet-500/10 text-violet-300'
      : planId === 'business'
        ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        : 'border-slate-700 bg-slate-800 text-slate-400'

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${tone}`}>
      {planLabel(planId)}
    </span>
  )
}

function UsageCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-cyan-300">
          {icon}
        </span>

        <span className="text-2xl font-black text-white">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-6 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-500">
        {icon}
      </div>

      <p className="mt-3 text-sm font-black text-slate-300">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-600">
        {description}
      </p>
    </div>
  )
}