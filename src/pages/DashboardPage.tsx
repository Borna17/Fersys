import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  FileText,
  Package,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import MissionCenter from '../components/MissionCenter'
import {
  getCustomers,
} from '../services/customers.service'
import {
  getEmployees,
  type CompanyEmployee,
} from '../services/employees.service'
import {
  getOffers,
} from '../services/offers.service'
import {
  getWorkOrders,
  type CloudWorkOrder,
} from '../services/workOrders.service'
import type {
  Customer,
} from '../types/customer'
import type {
  Offer,
} from '../types/offers'
import {
  calculateOfferTotal,
} from '../utils/offerCalculations'
import { supabase } from '../lib/supabase'

type DashboardData = {
  customers: Customer[]
  workOrders: CloudWorkOrder[]
  offers: Offer[]
  employees: CompanyEmployee[]
  userName: string
}

type MonthlyValue = {
  key: string
  label: string
  value: number
}

const monthLabels = [
  'Sij',
  'Velj',
  'Ožu',
  'Tra',
  'Svi',
  'Lip',
  'Srp',
  'Kol',
  'Ruj',
  'Lis',
  'Stu',
  'Pro',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Nema podatka'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('hr-HR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '—'
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentMonthRange() {
  const now = new Date()

  const firstDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  )

  const lastDay = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  )

  return {
    from: getLocalDateString(firstDay),
    to: getLocalDateString(lastDay),
  }
}

function getLastSevenMonths(): MonthlyValue[] {
  const now = new Date()

  return Array.from(
    {
      length: 7,
    },
    (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (6 - index),
        1,
      )

      return {
        key: `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, '0')}`,
        label: monthLabels[date.getMonth()],
        value: 0,
      }
    },
  )
}

function getStatusClassName(
  status: CloudWorkOrder['status'],
) {
  if (status === 'Završen') {
    return 'bg-emerald-500/15 text-emerald-400'
  }

  if (status === 'U tijeku') {
    return 'bg-blue-500/15 text-blue-400'
  }

  if (status === 'Otkazan') {
    return 'bg-red-500/15 text-red-400'
  }

  return 'bg-amber-500/15 text-amber-400'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewOffers =
    can('offers.view')

  const canViewFinance =
    can('finance.view') ||
    can('offers.viewPrices')

  const canViewEmployees =
    can('employees.view')

  const canManageCustomers =
    can('customers.manage')

  const canManageWorkOrders =
    can('workOrders.manage')

  const canManageOffers =
    can('offers.manage')

  const canManageInventory =
    can('inventory.manage')

  const [data, setData] =
    useState<DashboardData>({
      customers: [],
      workOrders: [],
      offers: [],
      employees: [],
      userName: '',
    })

  const [isLoading, setIsLoading] =
    useState(true)

  const [loadError, setLoadError] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setIsLoading(true)
        setLoadError('')

        const [
          customers,
          workOrders,
          offers,
          employees,
          userResult,
        ] = await Promise.all([
          getCustomers(),
          getWorkOrders(),
          canViewOffers
            ? getOffers()
            : Promise.resolve([]),
          canViewEmployees
            ? getEmployees()
            : Promise.resolve([]),
          supabase.auth.getUser(),
        ])

        if (userResult.error) {
          throw userResult.error
        }

        const user =
          userResult.data.user

        const metadataName =
          typeof user?.user_metadata?.full_name ===
          'string'
            ? user.user_metadata.full_name
            : ''

        const emailName =
          user?.email
            ?.split('@')[0]
            ?.replace(/[._-]+/g, ' ')
            ?.trim() ?? ''

        if (!cancelled) {
          setData({
            customers,
            workOrders,
            offers,
            employees,
            userName:
              metadataName.trim() ||
              emailName ||
              'korisniče',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Dashboard nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [canViewEmployees, canViewOffers])

  const dashboard = useMemo(() => {
    const today =
      getLocalDateString()

    const monthRange =
      getCurrentMonthRange()

    const activeOrders =
      data.workOrders.filter((order) =>
        [
          'Novi',
          'Zakazan',
          'U tijeku',
        ].includes(order.status),
      )

    const completedThisMonth =
      data.workOrders.filter(
        (order) =>
          order.status === 'Završen' &&
          order.date >= monthRange.from &&
          order.date <= monthRange.to,
      )

    const acceptedOffersThisMonth =
      data.offers.filter(
        (offer) =>
          offer.status === 'Prihvaćeno' &&
          offer.date >= monthRange.from &&
          offer.date <= monthRange.to,
      )

    const acceptedOfferValue =
      acceptedOffersThisMonth.reduce(
        (sum, offer) =>
          sum + calculateOfferTotal(offer),
        0,
      )

    const todayOrders =
      data.workOrders
        .filter(
          (order) =>
            order.date === today &&
            order.status !== 'Otkazan',
        )
        .sort((first, second) =>
          (
            first.arrivalTime || '99:99'
          ).localeCompare(
            second.arrivalTime || '99:99',
          ),
        )

    const recentOrders = [
      ...data.workOrders,
    ]
      .sort((first, second) =>
        second.createdAt.localeCompare(
          first.createdAt,
        ),
      )
      .slice(0, 5)

    const urgentOrders =
      activeOrders.filter(
        (order) =>
          order.priority === 'Hitno',
      )

    const overdueOrders =
      activeOrders.filter(
        (order) =>
          order.date < today,
      )

    const pendingOffers =
      data.offers.filter((offer) =>
        [
          'Nacrt',
          'Poslano',
          'Pregledano',
          'U tijeku',
        ].includes(offer.status),
      )

    const monthlyValues =
      getLastSevenMonths()

    data.offers
      .filter(
        (offer) =>
          offer.status === 'Prihvaćeno',
      )
      .forEach((offer) => {
        const key =
          offer.date.slice(0, 7)

        const month =
          monthlyValues.find(
            (item) => item.key === key,
          )

        if (month) {
          month.value +=
            calculateOfferTotal(offer)
        }
      })

    const maxMonthlyValue =
      Math.max(
        ...monthlyValues.map(
          (month) => month.value,
        ),
        0,
      )

    const activeEmployees =
      data.employees.filter(
        (employee) =>
          employee.status === 'active',
      ).length

    return {
      activeOrders,
      completedThisMonth,
      acceptedOfferValue,
      todayOrders,
      recentOrders,
      urgentOrders,
      overdueOrders,
      pendingOffers,
      monthlyValues,
      maxMonthlyValue,
      activeEmployees,
    }
  }, [data])

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje dashboarda..." />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <CircleAlert
            size={42}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-2xl font-black text-white">
            Dashboard nije moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  const statistics = [
    {
      title: 'Aktivni radni nalozi',
      value: String(
        dashboard.activeOrders.length,
      ),
      description:
        dashboard.urgentOrders.length > 0
          ? `${dashboard.urgentOrders.length} hitnih naloga`
          : 'Nema hitnih naloga',
      icon: Wrench,
      iconClass:
        'bg-blue-500/15 text-blue-400',
      accentClass:
        'from-blue-500/20 to-transparent',
    },
    {
      title: 'Ukupno kupaca',
      value: String(
        data.customers.length,
      ),
      description:
        data.customers.length === 0
          ? 'Još nema unesenih kupaca'
          : `${dashboard.activeEmployees} aktivnih korisnika`,
      icon: Users,
      iconClass:
        'bg-violet-500/15 text-violet-400',
      accentClass:
        'from-violet-500/20 to-transparent',
    },
    ...(canViewFinance
      ? [
          {
            title: 'Prihvaćene ponude ovaj mjesec',
            value: formatCurrency(
              dashboard.acceptedOfferValue,
            ),
            description:
              dashboard.pendingOffers.length > 0
                ? `${dashboard.pendingOffers.length} ponuda u obradi`
                : 'Nema ponuda u obradi',
            icon: CircleDollarSign,
            iconClass:
              'bg-emerald-500/15 text-emerald-400',
            accentClass:
              'from-emerald-500/20 to-transparent',
          },
        ]
      : []),
    {
      title: 'Završeni poslovi ovaj mjesec',
      value: String(
        dashboard.completedThisMonth.length,
      ),
      description:
        dashboard.overdueOrders.length > 0
          ? `${dashboard.overdueOrders.length} naloga kasni`
          : 'Nema zakašnjelih naloga',
      icon: CheckCircle2,
      iconClass:
        'bg-amber-500/15 text-amber-400',
      accentClass:
        'from-amber-500/20 to-transparent',
    },
  ]

  const quickActions = [
    {
      title: 'Novi radni nalog',
      description: 'Kreiraj novi posao',
      icon: Wrench,
      route: '/work-orders/new',
    },
    {
      title: 'Novi kupac',
      description: 'Dodaj osobu ili tvrtku',
      icon: Users,
      route: '/customers',
    },
    {
      title: 'Nova ponuda',
      description: 'Izradi ponudu kupcu',
      icon: FileText,
      route: '/offers/new',
    },
    {
      title: 'Dodaj materijal',
      description: 'Ažuriraj skladište',
      icon: Package,
      route: '/inventory/items/new',
    },
  ].filter((action) => {
    if (
      action.route === '/customers' &&
      !canManageCustomers
    ) {
      return false
    }

    if (
      action.route === '/work-orders/new' &&
      !canManageWorkOrders
    ) {
      return false
    }

    if (
      action.route === '/offers/new' &&
      !canManageOffers
    ) {
      return false
    }

    if (
      action.route === '/inventory/items/new' &&
      !canManageInventory
    ) {
      return false
    }

    return true
  })

  const hasAnyBusinessData =
    data.customers.length > 0 ||
    data.workOrders.length > 0 ||
    data.offers.length > 0

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">
            Pregled poslovanja
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
            Dobro došao, {data.userName} 👋
          </h1>

          <p className="mt-3 max-w-2xl text-base text-slate-400">
            Ovo su stvarni podaci tvoje tvrtke spremljeni u
            Supabaseu.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canManageCustomers && (
            <button
              type="button"
              onClick={() =>
                navigate('/customers')
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <Users size={18} />
              Novi kupac
            </button>
          )}

          {canManageWorkOrders && (
            <button
              type="button"
              onClick={() =>
                navigate('/work-orders/new')
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.02]"
            >
              <Plus size={18} />
              Novi radni nalog
            </button>
          )}
        </div>
      </div>

      <MissionCenter />

      {!hasAnyBusinessData && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
          <h2 className="font-bold text-blue-300">
            Tvrtka je spremna za početak
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Trenutačno nema kupaca, radnih naloga ni ponuda.
            Dodaj prvog kupca i kreni s radom.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
        {statistics.map((statistic) => {
          const Icon = statistic.icon

          return (
            <article
              key={statistic.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-700"
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${statistic.accentClass}`}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {statistic.title}
                  </p>

                  <p className="mt-4 text-3xl font-black tracking-tight text-white">
                    {statistic.value}
                  </p>

                  <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
                    <TrendingUp
                      size={15}
                      className="text-emerald-400"
                    />
                    {statistic.description}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${statistic.iconClass}`}
                >
                  <Icon size={23} />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        {canViewFinance && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-400">
                  Pregled prihvaćenih ponuda
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                Zadnjih 7 mjeseci
              </h2>
            </div>

            <div className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
              {formatCurrency(
                dashboard.monthlyValues.reduce(
                  (sum, month) =>
                    sum + month.value,
                  0,
                ),
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex h-64 items-end gap-2 sm:gap-3">
              {dashboard.monthlyValues.map(
                (month) => {
                  const height =
                    dashboard.maxMonthlyValue > 0
                      ? Math.max(
                          4,
                          (month.value /
                            dashboard.maxMonthlyValue) *
                            100,
                        )
                      : 0

                  return (
                    <div
                      key={month.key}
                      className="flex flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div
                        className="relative flex h-52 w-full items-end overflow-hidden rounded-xl bg-slate-800/60"
                        title={formatCurrency(
                          month.value,
                        )}
                      >
                        <div
                          className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-blue-500 transition hover:brightness-110"
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>

                      <span className="text-xs text-slate-500">
                        {month.label}
                      </span>
                    </div>
                  )
                },
              )}
            </div>
          </div>
          </section>
        )}

        <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-900 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
                <Sparkles size={24} />
              </div>

              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
                Automatski pregled
              </span>
            </div>

            <h2 className="mt-6 text-xl font-bold text-white">
              Trenutačno stanje
            </h2>

            <p className="mt-3 leading-7 text-slate-400">
              {dashboard.overdueOrders.length > 0
                ? `${dashboard.overdueOrders.length} aktivnih radnih naloga ima datum u prošlosti. Preporuka je provjeriti njihov status.`
                : dashboard.urgentOrders.length > 0
                  ? `${dashboard.urgentOrders.length} aktivnih naloga označeno je kao hitno.`
                  : hasAnyBusinessData
                    ? 'Nema zakašnjelih ni hitnih radnih naloga.'
                    : 'Dodaj prve poslovne podatke kako bi se ovdje prikazivale preporuke.'}
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-white">
                Ponude u obradi
              </p>

              <p className="mt-2 text-3xl font-black text-violet-400">
                {dashboard.pendingOffers.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/ai')
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
            >
              Otvori AI pomoćnika
              <ArrowUpRight size={18} />
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            Brze akcije
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Najčešće korištene funkcije na jednom mjestu.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.title}
                type="button"
                onClick={() =>
                  navigate(action.route)
                }
                className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-violet-500/40 hover:bg-slate-800"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition group-hover:bg-violet-500/15 group-hover:text-violet-400">
                  <Icon size={22} />
                </div>

                <div>
                  <p className="font-semibold text-white">
                    {action.title}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {action.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                Današnji raspored
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Radni nalozi zakazani za danas.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/calendar')
              }
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              <CalendarDays size={17} />
              Kalendar
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {dashboard.todayOrders.map(
              (order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/work-orders/${order.id}`,
                    )
                  }
                  className="flex w-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-slate-700 sm:flex-row sm:items-center"
                >
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 font-bold text-blue-400">
                    {formatTime(
                      order.arrivalTime,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">
                      {order.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {order.customerName}
                      {order.address
                        ? ` · ${order.address}`
                        : ''}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </button>
              ),
            )}

            {dashboard.todayOrders.length ===
              0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-12 text-center">
                <CalendarDays
                  size={34}
                  className="mx-auto text-slate-600"
                />

                <p className="mt-4 font-semibold text-white">
                  Danas nema zakazanih naloga
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Novi termin možeš dodati kroz radni nalog.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Zadnji radni nalozi
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Posljednje aktivnosti u sustavu.
              </p>
            </div>

            <Clock3
              size={20}
              className="text-slate-500"
            />
          </div>

          <div className="mt-6 space-y-3">
            {dashboard.recentOrders.map(
              (order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/work-orders/${order.id}`,
                    )
                  }
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-left transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-violet-400">
                        {order.orderNumber}
                      </p>

                      <h3 className="mt-1 truncate font-semibold text-white">
                        {order.customerName}
                      </h3>

                      <p className="mt-1 truncate text-sm text-slate-400">
                        {order.title}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {formatDateTime(
                      order.createdAt,
                    )}
                  </p>
                </button>
              ),
            )}

            {dashboard.recentOrders.length ===
              0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-12 text-center">
                <Wrench
                  size={34}
                  className="mx-auto text-slate-600"
                />

                <p className="mt-4 font-semibold text-white">
                  Još nema radnih naloga
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              navigate('/work-orders')
            }
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            Pogledaj sve naloge
            <ArrowUpRight size={18} />
          </button>
        </section>
      </div>
    </section>
  )
}