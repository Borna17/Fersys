import {
  ArrowRight,
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
import { supabase } from '../lib/supabase'
import { getCustomers } from '../services/customers.service'
import {
  getEmployees,
  type CompanyEmployee,
} from '../services/employees.service'
import { getOffers } from '../services/offers.service'
import {
  getWorkOrders,
  type CloudWorkOrder,
} from '../services/workOrders.service'
import type { Customer } from '../types/customer'
import type { Offer } from '../types/offers'
import { calculateOfferTotal } from '../utils/offerCalculations'

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
  'Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip',
  'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value: string) {
  if (!value) return 'Nema podatka'

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
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentMonthRange() {
  const now = new Date()

  return {
    from: getLocalDateString(
      new Date(now.getFullYear(), now.getMonth(), 1),
    ),
    to: getLocalDateString(
      new Date(now.getFullYear(), now.getMonth() + 1, 0),
    ),
  }
}

function getLastSevenMonths(): MonthlyValue[] {
  const now = new Date()

  return Array.from({ length: 7 }, (_, index) => {
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
  })
}

function getStatusClassName(
  status: CloudWorkOrder['status'],
) {
  if (status === 'Završen') {
    return 'bg-emerald-500/15 text-emerald-300'
  }

  if (status === 'U tijeku') {
    return 'bg-blue-500/15 text-blue-300'
  }

  if (status === 'Otkazan') {
    return 'bg-red-500/15 text-red-300'
  }

  return 'bg-amber-500/15 text-amber-300'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewOffers = can('offers.view')
  const canViewFinance =
    can('finance.view') ||
    can('offers.viewPrices')
  const canViewEmployees = can('employees.view')

  const canManageCustomers = can('customers.manage')
  const canManageWorkOrders = can('workOrders.manage')
  const canManageOffers = can('offers.manage')
  const canManageInventory = can('inventory.manage')

  const [data, setData] = useState<DashboardData>({
    customers: [],
    workOrders: [],
    offers: [],
    employees: [],
    userName: '',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

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

        const user = userResult.data.user

        const metadataName =
          typeof user?.user_metadata?.full_name === 'string'
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
    const today = getLocalDateString()
    const monthRange = getCurrentMonthRange()

    const activeOrders = data.workOrders.filter((order) =>
      ['Novi', 'Zakazan', 'U tijeku'].includes(order.status),
    )

    const completedThisMonth = data.workOrders.filter(
      (order) =>
        order.status === 'Završen' &&
        order.date >= monthRange.from &&
        order.date <= monthRange.to,
    )

    const acceptedOffersThisMonth = data.offers.filter(
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

    const todayOrders = data.workOrders
      .filter(
        (order) =>
          order.date === today &&
          order.status !== 'Otkazan',
      )
      .sort((first, second) =>
        (first.arrivalTime || '99:99').localeCompare(
          second.arrivalTime || '99:99',
        ),
      )

    const recentOrders = [...data.workOrders]
      .sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      )
      .slice(0, 5)

    const urgentOrders = activeOrders.filter(
      (order) => order.priority === 'Hitno',
    )

    const overdueOrders = activeOrders.filter(
      (order) => order.date < today,
    )

    const pendingOffers = data.offers.filter((offer) =>
      ['Nacrt', 'Poslano', 'Pregledano', 'U tijeku'].includes(
        offer.status,
      ),
    )

    const monthlyValues = getLastSevenMonths()

    data.offers
      .filter((offer) => offer.status === 'Prihvaćeno')
      .forEach((offer) => {
        const key = offer.date.slice(0, 7)
        const month = monthlyValues.find(
          (item) => item.key === key,
        )

        if (month) {
          month.value += calculateOfferTotal(offer)
        }
      })

    const maxMonthlyValue = Math.max(
      ...monthlyValues.map((month) => month.value),
      0,
    )

    const activeEmployees = data.employees.filter(
      (employee) => employee.status === 'active',
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
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <CircleAlert
            size={38}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-xl font-black text-white sm:text-2xl">
            Dashboard nije moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  const statistics = [
    {
      title: 'Aktivni nalozi',
      value: String(dashboard.activeOrders.length),
      description:
        dashboard.urgentOrders.length > 0
          ? `${dashboard.urgentOrders.length} hitnih`
          : 'Bez hitnih',
      icon: Wrench,
      iconClass: 'bg-blue-500/15 text-blue-300',
      accent: 'from-blue-500/20',
      route: '/work-orders',
    },
    {
      title: 'Investitori',
      value: String(data.customers.length),
      description:
        data.customers.length === 0
          ? 'Nema unosa'
          : `${dashboard.activeEmployees} aktivnih korisnika`,
      icon: Users,
      iconClass: 'bg-violet-500/15 text-violet-300',
      accent: 'from-violet-500/20',
      route: '/customers',
    },
    ...(canViewFinance
      ? [
          {
            title: 'Prihvaćene ponude',
            value: formatCurrency(
              dashboard.acceptedOfferValue,
            ),
            description:
              dashboard.pendingOffers.length > 0
                ? `${dashboard.pendingOffers.length} u obradi`
                : 'Sve obrađeno',
            icon: CircleDollarSign,
            iconClass:
              'bg-emerald-500/15 text-emerald-300',
            accent: 'from-emerald-500/20',
            route: '/offers',
          },
        ]
      : []),
    {
      title: 'Završeni poslovi',
      value: String(
        dashboard.completedThisMonth.length,
      ),
      description:
        dashboard.overdueOrders.length > 0
          ? `${dashboard.overdueOrders.length} kasni`
          : 'Bez kašnjenja',
      icon: CheckCircle2,
      iconClass: 'bg-amber-500/15 text-amber-300',
      accent: 'from-amber-500/20',
      route: '/work-orders',
    },
  ]

  const quickActions = [
    {
      title: 'Novi nalog',
      subtitle: 'Radni nalog',
      icon: Wrench,
      route: '/work-orders/new',
      visible: canManageWorkOrders,
    },
    {
      title: 'Investitor',
      subtitle: 'Dodaj novog',
      icon: Users,
      route: '/customers',
      visible: canManageCustomers,
    },
    {
      title: 'Nova ponuda',
      subtitle: 'Izradi ponudu',
      icon: FileText,
      route: '/offers/new',
      visible: canManageOffers,
    },
    {
      title: 'Materijal',
      subtitle: 'Dodaj artikl',
      icon: Package,
      route: '/inventory/items/new',
      visible: canManageInventory,
    },
  ].filter((item) => item.visible)

  const hasAnyBusinessData =
    data.customers.length > 0 ||
    data.workOrders.length > 0 ||
    data.offers.length > 0

  const firstName =
    data.userName.trim().split(/\s+/)[0] ||
    data.userName

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 shadow-xl shadow-black/15 sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-400 sm:text-xs">
            FERSYS · DANAS
          </p>

          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                Pozdrav, {firstName} 👋
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Sve najvažnije za današnji rad na jednom mjestu.
              </p>
            </div>

            {canManageWorkOrders && (
              <button
                type="button"
                onClick={() =>
                  navigate('/work-orders/new')
                }
                className="hidden min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition active:scale-[0.98] sm:inline-flex"
              >
                <Plus size={18} />
                Novi nalog
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:hidden">
            <MiniMetric
              label="Danas"
              value={String(
                dashboard.todayOrders.length,
              )}
            />
            <MiniMetric
              label="Hitno"
              value={String(
                dashboard.urgentOrders.length,
              )}
            />
            <MiniMetric
              label="Kasni"
              value={String(
                dashboard.overdueOrders.length,
              )}
            />
          </div>
        </div>
      </section>

      <div className="md:hidden">
        <MissionCenter />
      </div>

      {!hasAnyBusinessData && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 sm:p-5">
          <p className="font-black text-blue-200">
            Tvrtka je spremna za početak
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Dodaj prvog investitora i napravi prvi radni nalog.
          </p>
        </div>
      )}

      {quickActions.length > 0 && (
        <section className="md:hidden">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            BRZE AKCIJE
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Što želiš napraviti?
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() =>
                    navigate(action.route)
                  }
                  className="min-h-[118px] rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition active:scale-[0.98] active:border-blue-500/40 active:bg-slate-800"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/12 text-blue-300">
                    <Icon size={21} />
                  </span>
                  <p className="mt-3 font-black text-white">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {action.subtitle}
                  </p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          PREGLED
        </p>
        <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
          Poslovanje
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.map((statistic) => {
            const Icon = statistic.icon

            return (
              <button
                key={statistic.title}
                type="button"
                onClick={() =>
                  navigate(statistic.route)
                }
                className="relative min-h-[132px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition active:scale-[0.99] sm:min-h-[155px] sm:p-5"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${statistic.accent} to-transparent`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-bold leading-4 text-slate-400 sm:text-sm">
                      {statistic.title}
                    </p>
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${statistic.iconClass}`}
                    >
                      <Icon size={18} />
                    </span>
                  </div>
                  <p className="mt-4 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {statistic.value}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500 sm:text-xs">
                    <TrendingUp
                      size={13}
                      className="text-emerald-400"
                    />
                    {statistic.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
              DANAS
            </p>
            <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
              Današnji raspored
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-300 sm:flex sm:w-auto sm:gap-2 sm:px-4"
            aria-label="Otvori kalendar"
          >
            <CalendarDays size={18} />
            <span className="hidden text-sm font-black sm:inline">
              Kalendar
            </span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {dashboard.todayOrders.slice(0, 5).map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() =>
                navigate(`/work-orders/${order.id}`)
              }
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-left transition active:scale-[0.99] active:border-blue-500/35"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-14 shrink-0 place-items-center rounded-2xl bg-blue-500/12 text-sm font-black text-blue-300">
                  {formatTime(order.arrivalTime)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-white">
                        {order.title}
                      </h3>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400 sm:text-sm">
                        {order.customerName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${getStatusClassName(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {order.address && (
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {order.address}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}

          {dashboard.todayOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-9 text-center">
              <CalendarDays
                size={30}
                className="mx-auto text-slate-600"
              />
              <p className="mt-3 font-black text-white">
                Danas nema zakazanih naloga
              </p>

              {canManageWorkOrders && (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/work-orders/new')
                  }
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
                >
                  <Plus size={17} />
                  Novi nalog
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="hidden md:block">
        <MissionCenter />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        {canViewFinance && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
                  PONUDE
                </p>
                <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
                  Zadnjih 7 mjeseci
                </h2>
              </div>

              <span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 sm:text-sm">
                {formatCurrency(
                  dashboard.monthlyValues.reduce(
                    (sum, month) => sum + month.value,
                    0,
                  ),
                )}
              </span>
            </div>

            <div className="mt-6 overflow-x-auto pb-1">
              <div className="flex min-w-[520px] items-end gap-2">
                {dashboard.monthlyValues.map((month) => {
                  const height =
                    dashboard.maxMonthlyValue > 0
                      ? Math.max(
                          5,
                          (month.value /
                            dashboard.maxMonthlyValue) *
                            100,
                        )
                      : 0

                  return (
                    <div
                      key={month.key}
                      className="flex flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="flex h-40 w-full items-end overflow-hidden rounded-xl bg-slate-800/70 sm:h-52">
                        <div
                          className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-blue-500"
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {month.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-slate-900 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Sparkles size={22} />
              </span>
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-300">
                Automatski pregled
              </span>
            </div>

            <h2 className="mt-5 text-xl font-black text-white">
              Trenutačno stanje
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {dashboard.overdueOrders.length > 0
                ? `${dashboard.overdueOrders.length} aktivnih naloga ima datum u prošlosti.`
                : dashboard.urgentOrders.length > 0
                  ? `${dashboard.urgentOrders.length} aktivnih naloga označeno je kao hitno.`
                  : hasAnyBusinessData
                    ? 'Nema zakašnjelih ni hitnih radnih naloga.'
                    : 'Dodaj prve poslovne podatke kako bi se ovdje prikazivale preporuke.'}
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ponude u obradi
              </p>
              <p className="mt-2 text-3xl font-black text-violet-300">
                {dashboard.pendingOffers.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/ai')}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 font-black text-white transition active:scale-[0.98]"
            >
              Otvori AI
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              AKTIVNOST
            </p>
            <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
              Zadnji radni nalozi
            </h2>
          </div>

          <Clock3
            size={19}
            className="text-slate-500"
          />
        </div>

        <div className="mt-4 space-y-3">
          {dashboard.recentOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() =>
                navigate(`/work-orders/${order.id}`)
              }
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-wider text-violet-400 sm:text-xs">
                    {order.orderNumber}
                  </p>
                  <h3 className="mt-1 truncate font-black text-white">
                    {order.customerName}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
                    {order.title}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${getStatusClassName(
                    order.status,
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <p className="mt-3 text-[11px] font-semibold text-slate-500">
                {formatDateTime(order.createdAt)}
              </p>
            </button>
          ))}

          {dashboard.recentOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-9 text-center">
              <Wrench
                size={30}
                className="mx-auto text-slate-600"
              />
              <p className="mt-3 font-black text-white">
                Još nema radnih naloga
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/work-orders')}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 font-black text-slate-200 transition active:scale-[0.99]"
        >
          Pogledaj sve naloge
          <ArrowRight size={18} />
        </button>
      </section>

      {quickActions.length > 0 && (
        <section className="hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 md:block">
          <h2 className="text-xl font-black text-white">
            Brze akcije
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Najčešće korištene funkcije.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => navigate(action.route)}
                  className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-blue-500/30 hover:bg-slate-800"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/12 text-blue-300">
                    <Icon size={21} />
                  </span>
                  <div>
                    <p className="font-black text-white">
                      {action.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {action.subtitle}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}

function MiniMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}
