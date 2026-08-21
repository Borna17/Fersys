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

function localDate(
  date = new Date(),
) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function monthRange() {
  const now = new Date()

  return {
    from: localDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ),
    ),
    to: localDate(
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ),
    ),
  }
}

function money(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    },
  ).format(value)
}

function time(value: string) {
  return value
    ? value.slice(0, 5)
    : '—'
}

function statusClass(
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

    void (async () => {
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
          typeof user?.user_metadata
            ?.full_name === 'string'
            ? user.user_metadata.full_name
            : ''
        const emailName =
          user?.email
            ?.split('@')[0]
            ?.replace(
              /[._-]+/g,
              ' ',
            )
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
    })()

    return () => {
      cancelled = true
    }
  }, [
    canViewEmployees,
    canViewOffers,
  ])

  const dashboard = useMemo(() => {
    const today = localDate()
    const range = monthRange()

    const activeOrders =
      data.workOrders.filter(
        (order) =>
          [
            'Novi',
            'Zakazan',
            'U tijeku',
          ].includes(
            order.status,
          ),
      )

    const completedThisMonth =
      data.workOrders.filter(
        (order) =>
          order.status ===
            'Završen' &&
          order.date >= range.from &&
          order.date <= range.to,
      )

    const acceptedOffers =
      data.offers.filter(
        (offer) =>
          offer.status ===
            'Prihvaćeno' &&
          offer.date >= range.from &&
          offer.date <= range.to,
      )

    const todayOrders =
      data.workOrders
        .filter(
          (order) =>
            order.date === today &&
            order.status !==
              'Otkazan',
        )
        .sort((a, b) =>
          (
            a.arrivalTime ||
            '99:99'
          ).localeCompare(
            b.arrivalTime ||
              '99:99',
          ),
        )

    const urgentOrders =
      activeOrders.filter(
        (order) =>
          order.priority ===
          'Hitno',
      )

    const overdueOrders =
      activeOrders.filter(
        (order) =>
          order.date < today,
      )

    const pendingOffers =
      data.offers.filter(
        (offer) =>
          [
            'Nacrt',
            'Poslano',
            'Pregledano',
            'U tijeku',
          ].includes(
            offer.status,
          ),
      )

    return {
      activeOrders,
      completedThisMonth,
      acceptedOfferValue:
        acceptedOffers.reduce(
          (sum, offer) =>
            sum +
            calculateOfferTotal(
              offer,
            ),
          0,
        ),
      todayOrders,
      urgentOrders,
      overdueOrders,
      pendingOffers,
      activeEmployees:
        data.employees.filter(
          (employee) =>
            employee.status ===
            'active',
        ).length,
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
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center">
          <CircleAlert
            size={38}
            className="mx-auto text-red-400"
          />
          <h1 className="mt-5 text-xl font-black text-white">
            Dashboard nije moguće
            učitati
          </h1>
          <p className="mt-3 text-sm text-red-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  const firstName =
    data.userName
      .trim()
      .split(/\s+/)[0] ||
    data.userName

  const stats = [
    {
      title: 'Aktivni nalozi',
      value: String(
        dashboard.activeOrders
          .length,
      ),
      description:
        dashboard.urgentOrders
          .length > 0
          ? `${dashboard.urgentOrders.length} hitnih`
          : 'Bez hitnih',
      icon: Wrench,
      route: '/work-orders',
    },
    {
      title: 'Investitori',
      value: String(
        data.customers.length,
      ),
      description:
        canViewEmployees
          ? `${dashboard.activeEmployees} aktivnih zaposlenika`
          : 'CRM baza',
      icon: Users,
      route: '/customers',
    },
    ...(canViewFinance
      ? [
          {
            title:
              'Prihvaćene ponude',
            value: money(
              dashboard.acceptedOfferValue,
            ),
            description:
              dashboard
                .pendingOffers
                .length > 0
                ? `${dashboard.pendingOffers.length} u obradi`
                : 'Sve obrađeno',
            icon:
              CircleDollarSign,
            route: '/offers',
          },
        ]
      : []),
    {
      title: 'Završeni poslovi',
      value: String(
        dashboard
          .completedThisMonth
          .length,
      ),
      description:
        dashboard.overdueOrders
          .length > 0
          ? `${dashboard.overdueOrders.length} kasni`
          : 'Bez kašnjenja',
      icon: CheckCircle2,
      route: '/work-orders',
    },
  ]

  const quickActions = [
    {
      title: 'Novi nalog',
      icon: Wrench,
      route: '/work-orders/new',
      visible:
        canManageWorkOrders,
    },
    {
      title: 'Investitor',
      icon: Users,
      route: '/customers',
      visible:
        canManageCustomers,
    },
    {
      title: 'Nova ponuda',
      icon: FileText,
      route: '/offers/new',
      visible: canManageOffers,
    },
    {
      title: 'Materijal',
      icon: Package,
      route:
        '/inventory/items/new',
      visible:
        canManageInventory,
    },
  ].filter(
    (item) => item.visible,
  )

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-6 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
            FERSYS
          </p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Bok, {firstName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Danas prvo vidi što
            treba odraditi. Detaljne
            analize ostaju za desktop.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    navigate(
                      item.route,
                    )
                  }
                  className="rounded-2xl border border-white/5 bg-white/[0.035] p-3 text-left active:scale-[0.98]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                    <Icon size={18} />
                  </span>
                  <p className="mt-3 truncate text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-white">
                    {item.value}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-slate-500">
                    {item.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {quickActions.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                BRZE AKCIJE
              </p>
              <h2 className="mt-1 font-black text-white">
                Napravi odmah
              </h2>
            </div>
            <Plus
              size={18}
              className="text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map(
              (action) => {
                const Icon =
                  action.icon

                return (
                  <button
                    key={
                      action.title
                    }
                    type="button"
                    onClick={() =>
                      navigate(
                        action.route,
                      )
                    }
                    className="flex min-h-[82px] items-center gap-3 rounded-2xl bg-slate-800/70 p-3 text-left active:scale-[0.98]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Icon size={19} />
                    </span>
                    <span className="text-sm font-black text-white">
                      {action.title}
                    </span>
                  </button>
                )
              },
            )}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                DANAS
              </p>
              <h2 className="mt-1 text-lg font-black text-white">
                Današnji poslovi
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/calendar')
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
            >
              <CalendarDays
                size={16}
              />
              Kalendar
            </button>
          </div>

          {dashboard.todayOrders
            .length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center">
              <Clock3
                size={26}
                className="mx-auto text-slate-600"
              />
              <p className="mt-3 font-black text-white">
                Nema poslova za danas
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
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
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-3 text-left active:scale-[0.995]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Clock3
                        size={18}
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white">
                        {order.title ||
                          order.customerName}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {time(
                          order.arrivalTime,
                        )}{' '}
                        ·{' '}
                        {
                          order.customerName
                        }
                      </span>
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${statusClass(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>

                    <ArrowRight
                      size={16}
                      className="shrink-0 text-slate-600"
                    />
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            navigate('/ai')
          }
          className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-slate-900 p-5 text-left active:scale-[0.995]"
        >
          <Sparkles
            size={24}
            className="text-violet-300"
          />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
            FERSYS AI
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Reci što treba napraviti
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Otvori AI pomoćnika za
            kalendar, investitore,
            naloge i ponude.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet-300">
            Otvori AI
            <ArrowRight size={16} />
          </span>
        </button>
      </section>

      <MissionCenter />
    </section>
  )
}

export default DashboardPage
