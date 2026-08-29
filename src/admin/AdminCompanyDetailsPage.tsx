import type {
  ReactNode,
} from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  FileInput,
  FileText,
  Mail,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Save,
  ShieldBan,
  Sparkles,
  Trash2,
  UserRound,
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
  deleteAdminCompany,
  getAdminCompany,
  getAdminCompanyInsights,
  getAdminTrialNotificationDelivery,
  updateCompanySubscription,
  type AdminCompany,
  type AdminCompanyInsights,
  type AdminTrialNotificationDelivery,
} from './services/admin.service'

const planLabels:
Record<
  AdminCompany['planId'],
  string
> = {
  starter: 'Starter',
  business: 'Business',
  pro: 'FERSYS Pro',
}

const statusLabels:
Record<string, string> = {
  trialing: 'Trial',
  active: 'Aktivno',
  past_due:
    'Neuspjela naplata',
  cancelled: 'Otkazano',
  expired: 'Isteklo',
  blocked: 'Blokirano',
}

const emptyInsights:
AdminCompanyInsights = {
  usersCount: 0,
  customersCount: 0,
  workOrdersCount: 0,
  offersCount: 0,
  invoicesCount: 0,
  incomingInvoicesCount: 0,
  vehiclesCount: 0,
  vehicleServicesCount: 0,
  users: [],
  activity: [],
  generatedAt: '',
}

export function AdminCompanyDetailsPage() {
  const {
    companyId,
  } =
    useParams<{
      companyId: string
    }>()

  const navigate =
    useNavigate()

  const [
    company,
    setCompany,
  ] =
    useState<
      AdminCompany | null
    >(null)

  const [
    insights,
    setInsights,
  ] =
    useState<
      AdminCompanyInsights
    >(emptyInsights)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const [
    planId,
    setPlanId,
  ] =
    useState<
      AdminCompany['planId']
    >('business')

  const [
    status,
    setStatus,
  ] =
    useState('trialing')

  const [
    trialDays,
    setTrialDays,
  ] = useState(7)

  const [note, setNote] =
    useState('')

  const [
    trialDeliveries,
    setTrialDeliveries,
  ] = useState<AdminTrialNotificationDelivery[]>([])

  const [deleteConfirmation, setDeleteConfirmation] =
    useState('')

  const [deletingCompany, setDeletingCompany] =
    useState(false)

  const loadCompany =
    useCallback(
      async () => {
        if (!companyId) {
          setError(
            'Nedostaje ID tvrtke.',
          )
          setLoading(false)
          return
        }

        try {
          setLoading(true)
          setError('')
          setSuccess('')

          const [
            nextCompany,
            nextInsights,
            nextTrialDeliveries,
          ] =
            await Promise.all([
              getAdminCompany(
                companyId,
              ),
              getAdminCompanyInsights(
                companyId,
              ),
              getAdminTrialNotificationDelivery(
                companyId,
              ),
            ])

          if (!nextCompany) {
            setCompany(null)
            setError(
              'Tražena tvrtka nije pronađena.',
            )
            return
          }

          setCompany(
            nextCompany,
          )
          setInsights(
            nextInsights,
          )
          setTrialDeliveries(
            nextTrialDeliveries,
          )
          setPlanId(
            nextCompany.planId,
          )
          setStatus(
            nextCompany.subscriptionStatus,
          )
        } catch (value) {
          setError(
            value instanceof
              Error
              ? value.message
              : 'Podatke tvrtke nije moguće učitati.',
          )
        } finally {
          setLoading(false)
        }
      },
      [companyId],
    )

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  const totalUsage =
    useMemo(
      () =>
        insights.customersCount +
        insights.workOrdersCount +
        insights.offersCount +
        insights.invoicesCount +
        insights.incomingInvoicesCount +
        insights.vehiclesCount,
      [insights],
    )

  const period =
    useMemo(
      () =>
        getSubscriptionPeriod(
          company,
        ),
      [company],
    )

  async function handleDeleteCompany() {
    if (!company) return

    const expectedName = company.companyName.trim()

    if (!expectedName) {
      setError('Tvrtka nema naziv i ne može se obrisati kroz ovu kontrolu.')
      return
    }

    if (deleteConfirmation.trim() !== expectedName) {
      setError('Za potvrdu upiši točan naziv tvrtke.')
      return
    }

    const confirmed = window.confirm(
      `Trajno obrisati tvrtku "${expectedName}" i sve njezine podatke? Ova radnja se ne može poništiti.`,
    )

    if (!confirmed) return

    try {
      setDeletingCompany(true)
      setError('')
      setSuccess('')

      const result = await deleteAdminCompany({
        companyId: company.companyId,
        confirmation: deleteConfirmation.trim(),
      })

      if (result.authWarnings.length > 0) {
        window.alert(
          `Tvrtka je obrisana, ali ${result.authWarnings.length} Auth korisnika nije automatski obrisano. Provjeri Supabase Auth.`,
        )
      }

      navigate('/admin/companies', { replace: true })
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Tvrtku nije moguće obrisati.',
      )
    } finally {
      setDeletingCompany(false)
    }
  }

  async function saveChanges() {
    if (!company) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await updateCompanySubscription({
        companyId:
          company.companyId,
        planId,
        status,
        trialDays:
          status ===
          'trialing'
            ? trialDays
            : undefined,
        note,
      })

      setSuccess(
        'Pretplata je uspješno ažurirana.',
      )

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
          Učitavanje Super Admin podataka...
        </div>
      </section>
    )
  }

  if (!company) {
    return (
      <section className="mx-auto max-w-[1500px]">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertTriangle
            size={34}
            className="mx-auto text-red-300"
          />

          <h1 className="mt-4 text-2xl font-black">
            Tvrtka nije pronađena
          </h1>

          <p className="mt-2 text-sm text-red-200/80">
            {error ||
              'Traženi zapis nije dostupan.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/admin/companies',
              )
            }
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white"
          >
            <ArrowLeft
              size={17}
            />
            Povratak
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1550px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            to="/admin/companies"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft
              size={17}
            />
            Natrag na tvrtke
          </Link>

          <div className="mt-5 flex items-start gap-4">
            <CompanyAvatar
              company={
                company
              }
            />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black sm:text-4xl">
                  {company.companyName ||
                    'Tvrtka bez naziva'}
                </h1>

                <StatusBadge
                  status={
                    company.subscriptionStatus
                  }
                />
              </div>

              <p className="mt-2 text-slate-400">
                OIB{' '}
                {company.companyOib ||
                  '—'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">
                  {
                    planLabels[
                      company.planId
                    ]
                  }
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${period.className}`}
                >
                  {
                    period.label
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadCompany()
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw
            size={17}
          />
          Osvježi
        </button>
      </div>

      {error && (
        <Message
          tone="error"
          icon={
            <AlertTriangle
              size={19}
            />
          }
        >
          {error}
        </Message>
      )}

      {success && (
        <Message
          tone="success"
          icon={
            <CheckCircle2
              size={19}
            />
          }
        >
          {success}
        </Message>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TopStat
          icon={<Clock3 />}
          label="Preostalo"
          value={
            period.shortLabel
          }
          note={
            period.dateLabel
          }
          accent={
            period.warning
              ? 'amber'
              : 'violet'
          }
        />

        <TopStat
          icon={<Users />}
          label="Korisnici"
          value={
            insights.usersCount
          }
          note="Članovi ove tvrtke"
          accent="blue"
        />

        <TopStat
          icon={<Building2 />}
          label="Investitori"
          value={
            insights.customersCount
          }
          note="Spremljeni investitori"
          accent="green"
        />

        <TopStat
          icon={<Activity />}
          label="Aktivnost"
          value={
            totalUsage
          }
          note="Poslovni zapisi"
          accent="violet"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="space-y-6">
          <Card>
            <SectionTitle
              icon={
                <Building2
                  size={21}
                />
              }
              title="Podaci o tvrtki"
              description="Identitet tvrtke i vlasnik FERSYS računa."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard
                label="Naziv"
                value={
                  company.companyName ||
                  '—'
                }
              />

              <InfoCard
                label="OIB"
                value={
                  company.companyOib ||
                  '—'
                }
              />

              <InfoCard
                label="Vlasnik / e-mail"
                value={
                  company.ownerEmail ||
                  'Nema e-maila'
                }
                icon={
                  <Mail
                    size={17}
                  />
                }
              />

              <InfoCard
                label="Registrirana"
                value={formatDate(
                  company.createdAt,
                )}
                icon={
                  <CalendarDays
                    size={17}
                  />
                }
              />
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={
                <Sparkles
                  size={21}
                />
              }
              title="Korištenje FERSYS-a"
              description="Stvarni broj podataka spremljenih za ovu tvrtku."
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <UsageCard
                icon={
                  <Users />
                }
                label="Korisnici"
                value={
                  insights.usersCount
                }
              />

              <UsageCard
                icon={
                  <Building2 />
                }
                label="Investitori"
                value={
                  insights.customersCount
                }
              />

              <UsageCard
                icon={
                  <Wrench />
                }
                label="Radni nalozi"
                value={
                  insights.workOrdersCount
                }
              />

              <UsageCard
                icon={
                  <FileText />
                }
                label="Ponude"
                value={
                  insights.offersCount
                }
              />

              <UsageCard
                icon={
                  <ReceiptText />
                }
                label="Izlazni računi"
                value={
                  insights.invoicesCount
                }
              />

              <UsageCard
                icon={
                  <FileInput />
                }
                label="Ulazni računi"
                value={
                  insights.incomingInvoicesCount
                }
              />

              <UsageCard
                icon={
                  <CarFront />
                }
                label="Vozila"
                value={
                  insights.vehiclesCount
                }
              />

              <UsageCard
                icon={
                  <Wrench />
                }
                label="Servisi vozila"
                value={
                  insights.vehicleServicesCount
                }
              />
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={
                <Users
                  size={21}
                />
              }
              title="Korisnici tvrtke"
              description="Članovi, uloge i zadnja poznata aktivnost."
            />

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
              {insights.users.length ===
              0 ? (
                <EmptyState
                  text="Nema dostupnih korisnika za ovu tvrtku."
                />
              ) : (
                <div className="divide-y divide-slate-800">
                  {insights.users.map(
                    (user) => (
                      <div
                        key={
                          user.id ||
                          user.userId
                        }
                        className="grid gap-3 bg-slate-950/35 p-4 sm:grid-cols-[1fr_170px_120px] sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                            <UserRound
                              size={18}
                            />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-black text-white">
                              {
                                user.name
                              }
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {user.email ||
                                'E-mail nije dostupan'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-black text-slate-300">
                            {
                              user.role
                            }
                          </p>

                          <p className="mt-1 text-[11px] text-slate-600">
                            {user.lastActiveAt
                              ? `Aktivnost ${formatRelativeDate(
                                  user.lastActiveAt,
                                )}`
                              : 'Aktivnost nije zabilježena'}
                          </p>
                        </div>

                        <span className="justify-self-start rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300 sm:justify-self-end">
                          {
                            user.status
                          }
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={
                <Activity
                  size={21}
                />
              }
              title="Zadnja aktivnost"
              description="Najnovije akcije unutar ove tvrtke."
            />

            <div className="mt-5 space-y-3">
              {insights.activity.length ===
              0 ? (
                <EmptyState
                  text="Aktivnost još nije zabilježena. Notification Center v2 će ovdje prikazivati nove događaje."
                />
              ) : (
                insights.activity.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                        <Activity
                          size={16}
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-slate-200">
                            {
                              item.title
                            }
                          </p>

                          <span className="text-[11px] text-slate-600">
                            {formatRelativeDate(
                              item.createdAt,
                            )}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-1 text-sm text-slate-500">
                            {
                              item.description
                            }
                          </p>
                        )}

                        {item.actorName && (
                          <p className="mt-2 text-[11px] font-bold text-slate-600">
                            {
                              item.actorName
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card accent>
            <SectionTitle
              icon={
                <PackageCheck
                  size={21}
                />
              }
              title="Pretplata"
              description="Paket, status i trajanje pristupa."
            />

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Trenutni paket
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {
                      planLabels[
                        company.planId
                      ]
                    }
                  </p>
                </div>

                <StatusBadge
                  status={
                    company.subscriptionStatus
                  }
                />
              </div>

              <div className="mt-5 border-t border-slate-800 pt-5">
                <p className="text-sm font-bold text-slate-500">
                  {
                    period.label
                  }
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {
                    period.dateLabel
                  }
                </p>
              </div>
            </div>
          </Card>

          <Card accent>
            <SectionTitle
              icon={
                <Sparkles
                  size={21}
                />
              }
              title="Upravljanje"
              description="Promijeni paket, status ili produži trial."
            />

            <div className="mt-6 space-y-4">
              <FieldLabel
                label="Paket"
              >
                <select
                  value={planId}
                  onChange={(event) =>
                    setPlanId(
                      event.target
                        .value as AdminCompany['planId'],
                    )
                  }
                  className={inputClass}
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
              </FieldLabel>

              <FieldLabel
                label="Status"
              >
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="trialing">
                    Trial
                  </option>
                  <option value="active">
                    Aktivno
                  </option>
                  <option value="past_due">
                    Neuspjela naplata
                  </option>
                  <option value="cancelled">
                    Otkazano
                  </option>
                  <option value="expired">
                    Isteklo
                  </option>
                  <option value="blocked">
                    Blokirano
                  </option>
                </select>
              </FieldLabel>

              {status ===
                'trialing' && (
                <div>
                  <p className="text-sm font-bold text-slate-300">
                    Produži trial
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      3,
                      7,
                      14,
                      30,
                    ].map(
                      (days) => (
                        <button
                          key={
                            days
                          }
                          type="button"
                          onClick={() =>
                            setTrialDays(
                              days,
                            )
                          }
                          className={`h-11 rounded-xl border text-sm font-black ${
                            trialDays ===
                            days
                              ? 'border-violet-500 bg-violet-600 text-white'
                              : 'border-slate-700 bg-slate-950 text-slate-400'
                          }`}
                        >
                          +
                          {
                            days
                          }{' '}
                          dana
                        </button>
                      ),
                    )}
                  </div>

                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={
                      trialDays
                    }
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
                    className={`${inputClass} mt-3`}
                  />
                </div>
              )}

              <FieldLabel
                label="Interna napomena"
              >
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target.value,
                    )
                  }
                  placeholder="Razlog promjene ili interna bilješka..."
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                />
              </FieldLabel>

              <button
                type="button"
                onClick={() =>
                  void saveChanges()
                }
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-black text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                <Save
                  size={18}
                />
                {saving
                  ? 'Spremanje...'
                  : 'Spremi promjene'}
              </button>
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<Mail size={21} />}
              title="Dostava trial obavijesti"
              description="Stvarni status zadnjih poruka poslanih nakon produženja triala."
            />

            <div className="mt-5 space-y-3">
              {trialDeliveries.length === 0 ? (
                <EmptyState text="Još nema poslanih trial obavijesti za ovu tvrtku." />
              ) : (
                trialDeliveries.slice(0, 5).map((delivery) => {
                  const notificationCreated = Boolean(delivery.notificationEventId)
                  const emailSent = delivery.emailStatus === 'sent'
                  const pushSent = delivery.pushSentCount > 0
                  const opened = delivery.readCount > 0

                  return (
                    <div
                      key={delivery.queueId}
                      className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-white">
                            +{delivery.daysAdded} dana triala
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {delivery.createdAt ? formatDate(delivery.createdAt) : '—'}
                          </p>
                        </div>

                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          delivery.queueStatus === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : delivery.queueStatus === 'failed'
                              ? 'bg-red-500/10 text-red-300'
                              : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {delivery.queueStatus === 'sent'
                            ? 'Obrađeno'
                            : delivery.queueStatus === 'failed'
                              ? 'Greška'
                              : 'Čeka slanje'}
                        </span>
                      </div>

                      {delivery.customMessage && (
                        <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-5 text-slate-400">
                          {delivery.customMessage}
                        </p>
                      )}

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <DeliveryStatus
                          label="FERSYS obavijest"
                          ok={notificationCreated}
                          text={notificationCreated ? 'Kreirana' : 'Nije kreirana'}
                        />
                        <DeliveryStatus
                          label="E-mail"
                          ok={emailSent}
                          text={emailSent ? 'Resend prihvatio' : delivery.emailStatus === 'failed' ? 'Slanje nije uspjelo' : 'Čeka slanje'}
                        />
                        <DeliveryStatus
                          label="Push"
                          ok={pushSent}
                          text={pushSent ? `Firebase prihvatio za ${delivery.pushSentCount} uređaj(a)` : 'Još nije potvrđen'}
                        />
                        <DeliveryStatus
                          label="Pročitano u FERSYS-u"
                          ok={opened}
                          text={opened ? `Otvoreno/pročitano (${delivery.readCount})` : 'Još nije otvoreno'}
                        />
                      </div>

                      {delivery.processedAt && (
                        <p className="mt-3 text-[11px] text-slate-600">
                          Obrada: {formatDate(delivery.processedAt)}
                        </p>
                      )}

                      {delivery.errorMessage && (
                        <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                          {delivery.errorMessage}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          <article className="rounded-3xl border border-red-500/25 bg-red-500/5 p-6">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-300">
                <Trash2 size={21} />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="font-black text-red-200">
                  Opasna zona
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Koristi samo za testne račune. Brisanjem se trajno uklanja tvrtka, njezini poslovni podaci, članstva i Auth računi korisnika koji nisu članovi drugih tvrtki.
                </p>

                <div className="mt-5 rounded-2xl border border-red-500/15 bg-slate-950/50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-red-300">
                    Za potvrdu upiši naziv tvrtke
                  </p>

                  <p className="mt-2 break-words text-sm font-black text-white">
                    {company.companyName}
                  </p>

                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    autoComplete="off"
                    placeholder="Upiši točan naziv tvrtke"
                    className="mt-3 h-12 w-full rounded-xl border border-red-500/20 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500"
                  />

                  <button
                    type="button"
                    onClick={() => void handleDeleteCompany()}
                    disabled={
                      deletingCompany ||
                      deleteConfirmation.trim() !== company.companyName.trim()
                    }
                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={18} />
                    {deletingCompany
                      ? 'Brisanje...'
                      : 'Trajno obriši testnu tvrtku'}
                  </button>
                </div>

                <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <ShieldBan
                    size={18}
                    className="mt-0.5 shrink-0 text-amber-300"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Ako samo želiš privremeno zaustaviti pristup, nemoj brisati tvrtku. Postavi status pretplate na <strong className="text-amber-200">Blokirano</strong>.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}

function DeliveryStatus({
  label,
  ok,
  text,
}: {
  label: string
  ok: boolean
  text: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
      <p className={`mt-2 text-xs font-bold ${ok ? 'text-emerald-300' : 'text-slate-500'}`}>
        {text}
      </p>
    </div>
  )
}

const inputClass =
  'mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-violet-500'

function getSubscriptionPeriod(
  company:
    AdminCompany | null,
) {
  if (!company) {
    return {
      label: '—',
      shortLabel: '—',
      dateLabel: '',
      warning: false,
      className:
        'bg-slate-800 text-slate-400',
    }
  }

  const date =
    company.subscriptionStatus ===
      'trialing'
      ? company.trialEndsAt
      : company.currentPeriodEnd

  if (!date) {
    if (
      company.subscriptionStatus ===
      'active'
    ) {
      return {
        label:
          'Aktivna pretplata',
        shortLabel:
          'Aktivno',
        dateLabel:
          'Datum isteka nije postavljen',
        warning: false,
        className:
          'bg-emerald-500/10 text-emerald-300',
      }
    }

    return {
      label:
        statusLabels[
          company.subscriptionStatus
        ] ??
        company.subscriptionStatus,
      shortLabel: '—',
      dateLabel:
        'Datum nije dostupan',
      warning: false,
      className:
        'bg-slate-800 text-slate-400',
    }
  }

  const target =
    new Date(date)

  const now =
    new Date()

  now.setHours(
    0,
    0,
    0,
    0,
  )

  target.setHours(
    0,
    0,
    0,
    0,
  )

  const days =
    Math.ceil(
      (
        target.getTime() -
        now.getTime()
      ) /
        86_400_000,
    )

  if (days < 0) {
    return {
      label:
        `Isteklo prije ${Math.abs(
          days,
        )} dana`,
      shortLabel:
        `${Math.abs(
          days,
        )} d kasni`,
      dateLabel:
        `Istek: ${formatDate(
          date,
        )}`,
      warning: true,
      className:
        'bg-red-500/10 text-red-300',
    }
  }

  if (days === 0) {
    return {
      label:
        'Istječe danas',
      shortLabel:
        'Danas',
      dateLabel:
        formatDate(date),
      warning: true,
      className:
        'bg-red-500/10 text-red-300',
    }
  }

  return {
    label:
      company.subscriptionStatus ===
      'trialing'
        ? `Trial traje još ${days} dana`
        : `Pretplata traje još ${days} dana`,
    shortLabel:
      `${days} dana`,
    dateLabel:
      `Do ${formatDate(
        date,
      )}`,
    warning:
      days <= 5,
    className:
      days <= 5
        ? 'bg-amber-500/10 text-amber-300'
        : 'bg-emerald-500/10 text-emerald-300',
  }
}

function CompanyAvatar({
  company,
}: {
  company: AdminCompany
}) {
  if (
    company.companyLogoUrl
  ) {
    return (
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl border border-slate-700 bg-white">
        <img
          src={
            company.companyLogoUrl
          }
          alt=""
          className="h-full w-full object-contain p-1.5"
        />
      </span>
    )
  }

  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-violet-500/10 text-xl font-black text-violet-300">
      {getInitials(
        company.companyName,
      )}
    </span>
  )
}

function Card({
  children,
  accent = false,
}: {
  children: ReactNode
  accent?: boolean
}) {
  return (
    <article
      className={`rounded-3xl bg-slate-900 p-6 ${
        accent
          ? 'border border-violet-500/20'
          : 'border border-slate-800'
      }`}
    >
      {children}
    </article>
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
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
        {icon}
      </span>

      <div>
        <h2 className="font-black">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
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
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-black text-slate-200">
        {value}
      </p>
    </div>
  )
}

function UsageCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <span className="text-violet-300">
        {icon}
      </span>

      <p className="mt-4 text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-500">
        {label}
      </p>
    </div>
  )
}

function TopStat({
  icon,
  label,
  value,
  note,
  accent,
}: {
  icon: ReactNode
  label: string
  value:
    | string
    | number
  note: string
  accent:
    | 'blue'
    | 'green'
    | 'violet'
    | 'amber'
}) {
  const classes = {
    blue:
      'bg-blue-500/10 text-blue-300',
    green:
      'bg-emerald-500/10 text-emerald-300',
    violet:
      'bg-violet-500/10 text-violet-300',
    amber:
      'bg-amber-500/10 text-amber-300',
  }

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-2xl font-black">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            {note}
          </p>
        </div>

        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${classes[accent]}`}
        >
          {icon}
        </span>
      </div>
    </article>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'active'
      ? 'bg-emerald-500/10 text-emerald-300'
      : status ===
          'trialing'
        ? 'bg-violet-500/10 text-violet-300'
        : [
              'past_due',
              'expired',
              'blocked',
            ].includes(
              status,
            )
          ? 'bg-red-500/10 text-red-300'
          : 'bg-slate-800 text-slate-400'

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {statusLabels[
        status
      ] ?? status}
    </span>
  )
}

function FieldLabel({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm font-bold text-slate-300">
      {label}
      {children}
    </label>
  )
}

function Message({
  tone,
  icon,
  children,
}: {
  tone:
    | 'error'
    | 'success'
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        tone ===
        'error'
          ? 'border-red-500/20 bg-red-500/10 text-red-300'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {icon}
      </span>

      {children}
    </div>
  )
}

function EmptyState({
  text,
}: {
  text: string
}) {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}

function getInitials(
  value: string,
) {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ??
          '',
      )
      .join('') ||
    'FT'
  )
}

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) return '—'

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(date)
}

function formatRelativeDate(
  value: string,
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  const diff =
    Date.now() -
    date.getTime()

  const minutes =
    Math.max(
      0,
      Math.floor(
        diff / 60_000,
      ),
    )

  if (minutes < 1) {
    return 'upravo sada'
  }

  if (minutes < 60) {
    return `prije ${minutes} min`
  }

  const hours =
    Math.floor(
      minutes / 60,
    )

  if (hours < 24) {
    return `prije ${hours} h`
  }

  const days =
    Math.floor(
      hours / 24,
    )

  if (days < 30) {
    return `prije ${days} d`
  }

  return formatDate(value)
}
