import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  PackageCheck,
  RefreshCw,
  Save,
  ShieldBan,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router'

import {
  getAdminCompanies,
  updateCompanySubscription,
  type AdminCompany,
} from './services/admin.service'

const planLabels: Record<
  AdminCompany['planId'],
  string
> = {
  starter: 'Starter',
  business: 'Business',
  pro: 'FERSYS Pro',
}

const statusLabels: Record<string, string> = {
  trialing: 'Trial',
  active: 'Aktivno',
  past_due: 'Neuspjela naplata',
  cancelled: 'Otkazano',
  expired: 'Isteklo',
  blocked: 'Blokirano',
}

export function AdminCompanyDetailsPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()

  const [company, setCompany] = useState<AdminCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [planId, setPlanId] = useState<AdminCompany['planId']>('business')
  const [status, setStatus] = useState('trialing')
  const [trialDays, setTrialDays] = useState(7)
  const [note, setNote] = useState('')

  const loadCompany = useCallback(async (): Promise<void> => {
    if (!companyId) {
      setError('Nedostaje ID tvrtke.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const companies = await getAdminCompanies()
      const found = companies.find((item) => item.companyId === companyId) ?? null

      if (!found) {
        setCompany(null)
        setError('Tražena tvrtka nije pronađena.')
        return
      }

      setCompany(found)
      setPlanId(found.planId)
      setStatus(found.subscriptionStatus)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Podatke tvrtke nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  const totalUsage = useMemo(() => {
    if (!company) return 0

    return (
      company.usersCount +
      company.customersCount +
      company.workOrdersCount +
      company.offersCount
    )
  }, [company])

  async function saveChanges() {
    if (!company) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await updateCompanySubscription({
        companyId: company.companyId,
        planId,
        status,
        trialDays: status === 'trialing' ? trialDays : undefined,
        note,
      })

      setSuccess('Promjene su uspješno spremljene.')
      await loadCompany()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjene nije moguće spremiti.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-[1500px]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          Učitavanje podataka tvrtke...
        </div>
      </section>
    )
  }

  if (!company) {
    return (
      <section className="mx-auto max-w-[1500px]">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertTriangle size={34} className="mx-auto text-red-300" />
          <h1 className="mt-4 text-2xl font-black">Tvrtka nije pronađena</h1>
          <p className="mt-2 text-sm text-red-200/80">
            {error || 'Traženi zapis nije dostupan.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/companies')}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white"
          >
            <ArrowLeft size={17} />
            Povratak na tvrtke
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            to="/admin/companies"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Natrag na tvrtke
          </Link>

          <div className="mt-5 flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-violet-500/10 text-xl font-black text-violet-300">
              {getInitials(company.companyName)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black sm:text-4xl">
                  {company.companyName || 'Tvrtka bez naziva'}
                </h1>
                <StatusBadge status={company.subscriptionStatus} />
              </div>
              <p className="mt-2 text-slate-400">OIB {company.companyOib || '—'}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadCompany()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw size={17} />
          Osvježi
        </button>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <SectionTitle
              icon={<Building2 size={21} />}
              title="Podaci o tvrtki"
              description="Osnovni podaci i vlasnik računa."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard label="Naziv tvrtke" value={company.companyName || '—'} />
              <InfoCard label="OIB" value={company.companyOib || '—'} />
              <InfoCard
                label="Vlasnik / e-mail"
                value={company.ownerEmail || 'Nema e-maila'}
                icon={<Mail size={17} />}
              />
              <InfoCard
                label="Registrirana"
                value={formatDate(company.createdAt)}
                icon={<CalendarDays size={17} />}
              />
            </div>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <SectionTitle
              icon={<Sparkles size={21} />}
              title="Korištenje aplikacije"
              description="Broj zapisa koji pripadaju ovoj tvrtki."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <UsageCard label="Korisnici" value={company.usersCount} icon={<Users size={20} />} />
              <UsageCard label="Kupci" value={company.customersCount} icon={<Building2 size={20} />} />
              <UsageCard label="Radni nalozi" value={company.workOrdersCount} icon={<Wrench size={20} />} />
              <UsageCard label="Ponude" value={company.offersCount} icon={<FileText size={20} />} />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500">Ukupna aktivnost</p>
                <span className="text-lg font-black">{totalUsage}</span>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <SectionTitle
              icon={<PackageCheck size={21} />}
              title="Trenutna pretplata"
              description="Sažetak paketa i perioda."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoCard label="Paket" value={planLabels[company.planId]} />
              <InfoCard
                label="Status"
                value={statusLabels[company.subscriptionStatus] ?? company.subscriptionStatus}
              />
              <InfoCard label="Trial / period" value={getPeriodLabel(company)} />
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-3xl border border-violet-500/20 bg-slate-900 p-6">
            <SectionTitle
              icon={<Sparkles size={21} />}
              title="Upravljanje pretplatom"
              description="Promijeni paket, status ili produži trial."
            />

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-slate-300">
                Paket
                <select
                  value={planId}
                  onChange={(event) =>
                    setPlanId(event.target.value as AdminCompany['planId'])
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="starter">Starter — 15 €</option>
                  <option value="business">Business — 25 €</option>
                  <option value="pro">FERSYS Pro — 45 €</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="trialing">Trial</option>
                  <option value="active">Aktivno</option>
                  <option value="past_due">Neuspjela naplata</option>
                  <option value="cancelled">Otkazano</option>
                  <option value="expired">Isteklo</option>
                  <option value="blocked">Blokirano</option>
                </select>
              </label>

              {status === 'trialing' && (
                <div>
                  <p className="text-sm font-bold text-slate-300">Produži trial</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[7, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setTrialDays(days)}
                        className={`h-11 rounded-xl border text-sm font-black transition ${
                          trialDays === days
                            ? 'border-violet-500 bg-violet-600 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        +{days}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={trialDays}
                    onChange={(event) =>
                      setTrialDays(Math.max(1, Number(event.target.value) || 1))
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500"
                  />
                </div>
              )}

              <label className="block text-sm font-bold text-slate-300">
                Interna napomena
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Razlog promjene ili interna bilješka..."
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                />
              </label>

              <button
                type="button"
                onClick={() => void saveChanges()}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Spremanje...' : 'Spremi promjene'}
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-300">
                <ShieldBan size={21} />
              </div>

              <div>
                <h2 className="font-black">Administrativne akcije</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Blokiranje računa trenutno se radi promjenom statusa na „Blokirano”.
                  Brisanje tvrtke i prijava kao korisnik nisu još uključeni radi sigurnosti.
                </p>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.1em]">{label}</p>
      </div>
      <p className="mt-3 break-words font-black text-slate-200">{value}</p>
    </div>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <span className="text-violet-300">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-black">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'active'
      ? 'border-green-500/20 bg-green-500/10 text-green-300'
      : status === 'trialing'
        ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
        : status === 'past_due'
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
          : status === 'blocked'
            ? 'border-red-500/20 bg-red-500/10 text-red-300'
            : 'border-slate-700 bg-slate-800 text-slate-300'

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}

function getPeriodLabel(company: AdminCompany): string {
  if (company.subscriptionStatus === 'trialing' && company.trialEndsAt) {
    return `Trial do ${formatDate(company.trialEndsAt)}`
  }

  if (company.currentPeriodEnd) {
    return `Do ${formatDate(company.currentPeriodEnd)}`
  }

  return '—'
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'T'

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}