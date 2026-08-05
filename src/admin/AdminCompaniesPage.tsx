import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  Settings2,
  ShieldBan,
  Sparkles,
  X,
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
  updateCompanySubscription,
  type AdminCompany,
} from './services/admin.service'

type PlanFilter = 'all' | AdminCompany['planId']

type StatusFilter =
  | 'all'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'blocked'

const statusLabels: Record<
  Exclude<StatusFilter, 'all'>,
  string
> = {
  trialing: 'Trial',
  active: 'Aktivno',
  past_due: 'Neuspjela naplata',
  cancelled: 'Otkazano',
  expired: 'Isteklo',
  blocked: 'Blokirano',
}

const planLabels: Record<
  AdminCompany['planId'],
  string
> = {
  starter: 'Starter',
  business: 'Business',
  pro: 'FERSYS Pro',
}

export function AdminCompaniesPage() {
  const [companies, setCompanies] =
    useState<AdminCompany[]>([])
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] =
    useState<PlanFilter>('all')
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] =
    useState<AdminCompany | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setCompanies(await getAdminCompanies())
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Tvrtke nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return companies.filter((company) => {
      const matchesSearch =
        !query ||
        [
          company.companyName,
          company.companyOib,
          company.ownerEmail,
          company.planName,
          company.subscriptionStatus,
        ].some((value) =>
          value.toLowerCase().includes(query),
        )

      const matchesPlan =
        planFilter === 'all' ||
        company.planId === planFilter

      const matchesStatus =
        statusFilter === 'all' ||
        company.subscriptionStatus ===
          statusFilter

      return (
        matchesSearch &&
        matchesPlan &&
        matchesStatus
      )
    })
  }, [
    companies,
    planFilter,
    search,
    statusFilter,
  ])

  const summary = useMemo(
    () => ({
      total: companies.length,
      active: companies.filter(
        (company) =>
          company.subscriptionStatus ===
          'active',
      ).length,
      trialing: companies.filter(
        (company) =>
          company.subscriptionStatus ===
          'trialing',
      ).length,
      attention: companies.filter(
        (company) =>
          [
            'past_due',
            'expired',
            'blocked',
          ].includes(
            company.subscriptionStatus,
          ),
      ).length,
    }),
    [companies],
  )

  const hasFilters =
    Boolean(search.trim()) ||
    planFilter !== 'all' ||
    statusFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setPlanFilter('all')
    setStatusFilter('all')
  }

  return (
    <section className="mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
            <Building2 size={15} />
            Upravljanje korisnicima
          </div>

          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            Tvrtke
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Upravljaj paketima, trialom,
            pristupom i korištenjem FERSYS-a
            za svaku registriranu tvrtku.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              loading ? 'animate-spin' : ''
            }
          />
          Osvježi podatke
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ukupno tvrtki"
          value={summary.total}
          note="Sve registrirane tvrtke"
          icon={<Building2 size={21} />}
          accent="blue"
        />
        <SummaryCard
          title="Aktivne"
          value={summary.active}
          note="Plaćene i aktivne pretplate"
          icon={<CheckCircle2 size={21} />}
          accent="green"
        />
        <SummaryCard
          title="U trialu"
          value={summary.trialing}
          note="7-dnevno probno razdoblje"
          icon={<Clock3 size={21} />}
          accent="violet"
        />
        <SummaryCard
          title="Zahtijeva pažnju"
          value={summary.attention}
          note="Past due, isteklo ili blokirano"
          icon={<AlertTriangle size={21} />}
          accent="amber"
        />
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <label className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={19}
            />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pretraži naziv, OIB, e-mail ili paket..."
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
            />
          </label>

          <label className="relative">
            <Filter
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <select
              value={planFilter}
              onChange={(event) =>
                setPlanFilter(
                  event.target
                    .value as PlanFilter,
                )
              }
              className="h-12 w-full appearance-none rounded-2xl border border-slate-800 bg-slate-950 pl-11 pr-4 text-sm font-bold text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="all">Svi paketi</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="pro">FERSYS Pro</option>
            </select>
          </label>

          <label className="relative">
            <ShieldBan
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={17}
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="h-12 w-full appearance-none rounded-2xl border border-slate-800 bg-slate-950 pl-11 pr-4 text-sm font-bold text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="all">
                Svi statusi
              </option>
              {Object.entries(
                statusLabels,
              ).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-black text-slate-400 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={17} />
            Očisti
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Prikazano{' '}
            <strong className="text-slate-300">
              {filtered.length}
            </strong>{' '}
            od{' '}
            <strong className="text-slate-300">
              {companies.length}
            </strong>{' '}
            tvrtki
          </span>

          <span>
            Klikni <strong>Uredi</strong> za
            promjenu paketa, triala ili statusa.
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/30 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-4">Tvrtka</th>
                <th className="px-5 py-4">Paket</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Korištenje</th>
                <th className="px-5 py-4">Trial / period</th>
                <th className="px-5 py-4">Registrirana</th>
                <th className="px-5 py-4 text-right">Akcije</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((company) => (
                <CompanyRow
                  key={company.companyId}
                  company={company}
                  onEdit={() =>
                    setEditing(company)
                  }
                />
              ))}

              {!loading &&
                filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                        <Building2 size={24} />
                      </div>
                      <p className="mt-4 font-black text-slate-300">
                        Nema pronađenih tvrtki
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Promijeni kriterije
                        pretrage ili filtere.
                      </p>
                    </td>
                  </tr>
                )}

              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    Učitavanje tvrtki...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditSubscriptionModal
          company={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      )}
    </section>
  )
}

function CompanyRow({
  company,
  onEdit,
}: {
  company: AdminCompany
  onEdit: () => void
}) {
  const periodLabel =
    company.subscriptionStatus ===
      'trialing' &&
    company.trialEndsAt
      ? `Trial do ${formatDate(
          company.trialEndsAt,
        )}`
      : company.currentPeriodEnd
        ? `Do ${formatDate(
            company.currentPeriodEnd,
          )}`
        : '—'

  return (
    <tr className="border-b border-slate-800/70 transition last:border-0 hover:bg-slate-800/20">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 font-black text-violet-300">
            {getInitials(
              company.companyName,
            )}
          </div>

          <div className="min-w-0">
            <p className="max-w-[270px] truncate font-black">
              {company.companyName ||
                'Tvrtka bez naziva'}
            </p>
            <p className="mt-1 max-w-[310px] truncate text-xs text-slate-500">
              {company.ownerEmail ||
                'Nema e-maila'}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              OIB {company.companyOib || '—'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <PlanBadge planId={company.planId} />
      </td>

      <td className="px-5 py-4">
        <StatusBadge
          status={company.subscriptionStatus}
        />
      </td>

      <td className="px-5 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <UsageLine
            label="Korisnici"
            value={company.usersCount}
          />
          <UsageLine
            label="Kupci"
            value={company.customersCount}
          />
          <UsageLine
            label="Nalozi"
            value={company.workOrdersCount}
          />
          <UsageLine
            label="Ponude"
            value={company.offersCount}
          />
        </div>
      </td>

      <td className="px-5 py-4 text-sm text-slate-400">
        {periodLabel}
      </td>

      <td className="px-5 py-4 text-sm text-slate-400">
        {formatDate(company.createdAt)}
      </td>

      <td className="px-5 py-4 text-right">
        <div className="inline-flex items-center gap-2">
          <Link
            to={`/admin/companies/${company.companyId}`}
            className="inline-flex h-10 items-center rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 text-sm font-black text-violet-300 transition hover:border-violet-500/40 hover:bg-violet-500/10"
          >
            Otvori
          </Link>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-black text-slate-200 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
          >
            <Settings2 size={16} />
            Uredi
          </button>
        </div>
      </td>
    </tr>
  )
}

function EditSubscriptionModal({
  company,
  onClose,
  onSaved,
}: {
  company: AdminCompany
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [planId, setPlanId] =
    useState(company.planId)
  const [status, setStatus] =
    useState(company.subscriptionStatus)
  const [trialDays, setTrialDays] =
    useState(7)
  const [note, setNote] = useState('')
  const [saving, setSaving] =
    useState(false)
  const [error, setError] = useState('')

  async function save() {
    try {
      setSaving(true)
      setError('')

      await updateCompanySubscription({
        companyId: company.companyId,
        planId,
        status,
        trialDays:
          status === 'trialing'
            ? trialDays
            : undefined,
        note,
      })

      await onSaved()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-5 border-b border-slate-800 p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-violet-300">
              <Sparkles size={14} />
              Upravljanje pretplatom
            </div>
            <h2 className="mt-4 text-2xl font-black">
              {company.companyName}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {company.ownerEmail ||
                'Nema e-maila'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            aria-label="Zatvori"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-300">
              Paket
              <select
                value={planId}
                onChange={(event) =>
                  setPlanId(
                    event.target
                      .value as AdminCompany['planId'],
                  )
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="starter">
                  Starter — 15 €
                </option>
                <option value="business">
                  Business — 25 €
                </option>
                <option value="pro">
                  FERSYS Pro — 45 €
                </option>
              </select>
            </label>

            <label className="text-sm font-bold text-slate-300">
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500"
              >
                <option value="trialing">Trial</option>
                <option value="active">Aktivno</option>
                <option value="past_due">
                  Neuspjela naplata
                </option>
                <option value="cancelled">Otkazano</option>
                <option value="expired">Isteklo</option>
                <option value="blocked">Blokirano</option>
              </select>
            </label>
          </div>

          {status === 'trialing' && (
            <div className="mt-4">
              <p className="text-sm font-bold text-slate-300">
                Produži trial
              </p>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() =>
                      setTrialDays(days)
                    }
                    className={`h-11 rounded-xl border text-sm font-black transition ${
                      trialDays === days
                        ? 'border-violet-500 bg-violet-600 text-white'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    +{days} dana
                  </button>
                ))}
              </div>

              <label className="mt-3 block text-xs font-bold text-slate-500">
                Ručni broj dana
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(event) =>
                    setTrialDays(
                      Math.max(
                        1,
                        Number(
                          event.target.value,
                        ) || 1,
                      ),
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>
          )}

          <label className="mt-4 block text-sm font-bold text-slate-300">
            Interna napomena
            <textarea
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Razlog promjene, dogovor s korisnikom ili interna bilješka..."
              className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
            />
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-700 bg-slate-800 px-4 font-bold text-slate-300 transition hover:bg-slate-700"
            >
              Odustani
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="h-11 rounded-xl bg-violet-600 px-5 font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Spremanje...'
                : 'Spremi promjene'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  note,
  icon,
  accent,
}: {
  title: string
  value: number
  note: string
  icon: ReactNode
  accent: 'blue' | 'green' | 'violet' | 'amber'
}) {
  const accentClasses = {
    blue: 'bg-blue-500/10 text-blue-300',
    green: 'bg-green-500/10 text-green-300',
    violet: 'bg-violet-500/10 text-violet-300',
    amber: 'bg-amber-500/10 text-amber-300',
  }

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black">
            {value}
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

function PlanBadge({
  planId,
}: {
  planId: AdminCompany['planId']
}) {
  const classes = {
    starter:
      'border-sky-500/20 bg-sky-500/10 text-sky-300',
    business:
      'border-violet-500/20 bg-violet-500/10 text-violet-300',
    pro:
      'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300',
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classes[planId]}`}
    >
      {planLabels[planId]}
    </span>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'active'
      ? 'border-green-500/20 bg-green-500/10 text-green-300'
      : status === 'trialing'
        ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        : status === 'past_due'
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
          : status === 'blocked'
            ? 'border-red-500/20 bg-red-500/10 text-red-300'
            : 'border-slate-600 bg-slate-800 text-slate-300'

  const label =
    statusLabels[
      status as Exclude<StatusFilter, 'all'>
    ] ?? status

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  )
}

function UsageLine({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/40 px-2 py-1.5">
      <span className="text-slate-500">
        {label}
      </span>
      <span className="font-black text-slate-300">
        {value}
      </span>
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitials(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'T'
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? '',
    )
    .join('')
}