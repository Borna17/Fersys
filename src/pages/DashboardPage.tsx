import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import {
  useAuth,
} from '../auth/AuthProvider'
import MissionCenter from '../components/MissionCenter'
import {
  EMPTY_DASHBOARD_DATA,
  getFastDashboardData,
  type FastDashboardData,
} from '../services/dashboardFast.service'

const CACHE_PREFIX =
  'fersys-fast-dashboard-v2'

type DashboardCache = {
  savedAt: string
  data: FastDashboardData
}

function cacheKey(
  companyId: string,
) {
  return `${CACHE_PREFIX}:${companyId || 'default'}`
}

function readCache(
  companyId: string,
): DashboardCache | null {
  try {
    const raw =
      localStorage.getItem(
        cacheKey(companyId),
      )

    if (!raw) {
      return null
    }

    const parsed =
      JSON.parse(
        raw,
      ) as DashboardCache

    if (
      !parsed ||
      !parsed.data
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeCache(
  companyId: string,
  data: FastDashboardData,
) {
  try {
    localStorage.setItem(
      cacheKey(companyId),
      JSON.stringify({
        savedAt:
          new Date()
            .toISOString(),
        data,
      } satisfies DashboardCache),
    )
  } catch {
    // Cache nije kritičan.
  }
}

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    },
  ).format(value)
}

function time(
  value: string,
) {
  return value
    ? value.slice(0, 5)
    : '—'
}

function statusClass(
  status:
    FastDashboardData[
      'todayOrders'
    ][number]['status'],
) {
  if (
    status === 'Završen'
  ) {
    return 'bg-emerald-500/15 text-emerald-300'
  }

  if (
    status ===
    'U tijeku'
  ) {
    return 'bg-blue-500/15 text-blue-300'
  }

  if (
    status === 'Otkazan'
  ) {
    return 'bg-red-500/15 text-red-300'
  }

  return 'bg-amber-500/15 text-amber-300'
}

export function DashboardPage() {
  const navigate =
    useNavigate()

  const {
    can,
    user,
    membership,
  } =
    useAuth()

  const companyId =
    membership?.companyId ??
    ''

  const initialCache =
    useMemo(
      () =>
        readCache(
          companyId,
        ),
      [companyId],
    )

  const [
    data,
    setData,
  ] =
    useState<FastDashboardData>(
      () =>
        initialCache?.data ??
        EMPTY_DASHBOARD_DATA,
    )

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)

  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0)

  const [
    hasSnapshot,
    setHasSnapshot,
  ] =
    useState(
      Boolean(
        initialCache,
      ),
    )

  useEffect(() => {
    const cached =
      readCache(
        companyId,
      )

    if (cached) {
      setData(
        cached.data,
      )
      setHasSnapshot(
        true,
      )
    }
  }, [companyId])

  useEffect(() => {
    let cancelled =
      false

    void (async () => {
      try {
        setRefreshing(
          true,
        )

        const next =
          await getFastDashboardData()

        if (cancelled) {
          return
        }

        setData(next)
        setHasSnapshot(
          true,
        )
        writeCache(
          companyId,
          next,
        )
      } catch (error) {
        console.warn(
          '[FERSYS] Dashboard background refresh nije uspio:',
          error,
        )
      } finally {
        if (!cancelled) {
          setRefreshing(
            false,
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    companyId,
    refreshKey,
  ])

  const canViewFinance =
    can('finance.view') ||
    can(
      'offers.viewPrices',
    )

  const canViewEmployees =
    can(
      'employees.view',
    )

  const canManageCustomers =
    can(
      'customers.manage',
    )

  const canManageWorkOrders =
    can(
      'workOrders.manage',
    )

  const canManageOffers =
    can(
      'offers.manage',
    )

  const canManageInventory =
    can(
      'inventory.manage',
    )

  const metadataName =
    typeof user
      ?.user_metadata
      ?.full_name ===
    'string'
      ? user
          .user_metadata
          .full_name
          .trim()
      : ''

  const emailName =
    user?.email
      ?.split('@')[0]
      ?.replace(
        /[._-]+/g,
        ' ',
      )
      ?.trim() ??
    ''

  const firstName =
    (
      metadataName ||
      emailName ||
      'korisniče'
    )
      .split(/\s+/)[0]

  const stats = [
    {
      title:
        'Aktivni nalozi',
      value:
        hasSnapshot
          ? String(
              data.activeOrdersCount,
            )
          : '—',
      description:
        hasSnapshot
          ? data
              .urgentOrdersCount >
            0
            ? `${data.urgentOrdersCount} hitnih`
            : 'Bez hitnih'
          : 'Učitavam...',
      icon: Wrench,
      route:
        '/work-orders',
    },
    {
      title:
        'Investitori',
      value:
        hasSnapshot
          ? String(
              data.customersCount,
            )
          : '—',
      description:
        hasSnapshot &&
        canViewEmployees
          ? `${data.activeEmployeesCount} aktivnih zaposlenika`
          : hasSnapshot
            ? 'CRM baza'
            : 'Učitavam...',
      icon: Users,
      route:
        '/customers',
    },
    ...(canViewFinance
      ? [
          {
            title:
              'Prihvaćene ponude',
            value:
              hasSnapshot
                ? money(
                    data.acceptedOfferValue,
                  )
                : '—',
            description:
              hasSnapshot
                ? data.pendingOffersCount >
                  0
                  ? `${data.pendingOffersCount} u obradi`
                  : 'Sve obrađeno'
                : 'Učitavam...',
            icon:
              CircleDollarSign,
            route:
              '/offers',
          },
        ]
      : []),
    {
      title:
        'Završeni poslovi',
      value:
        hasSnapshot
          ? String(
              data.completedThisMonthCount,
            )
          : '—',
      description:
        hasSnapshot
          ? data
              .unfinishedOrdersCount >
            0
            ? `${data.unfinishedOrdersCount} za provjeru`
            : 'Sve ažurno'
          : 'Učitavam...',
      icon:
        CheckCircle2,
      route:
        '/work-orders',
    },
  ]

  const quickActions =
    [
      {
        title:
          'Novi nalog',
        icon: Wrench,
        route:
          '/work-orders/new',
        visible:
          canManageWorkOrders,
      },
      {
        title:
          'Investitor',
        icon: Users,
        route:
          '/customers',
        visible:
          canManageCustomers,
      },
      {
        title:
          'Nova ponuda',
        icon:
          FileText,
        route:
          '/offers/new',
        visible:
          canManageOffers,
      },
      {
        title:
          'Materijal',
        icon: Package,
        route:
          '/inventory/items/new',
        visible:
          canManageInventory,
      },
    ].filter(
      (item) =>
        item.visible,
    )

  return (
    <section className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-hidden pb-6 sm:space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                FERSYS
              </p>

              <h1 className="mt-2 truncate text-2xl font-black text-white sm:text-3xl">
                Bok, {firstName}
              </h1>
            </div>

            {refreshing && (
              <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-500/10 px-3 py-2 text-[10px] font-black text-blue-300">
                <RefreshCw
                  size={13}
                  className="animate-spin"
                />
                Osvježavam
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Danas prvo vidi što treba odraditi. Detaljne analize ostaju za desktop.
          </p>

          <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map(
              (item) => {
                const Icon =
                  item.icon

                return (
                  <button
                    key={
                      item.title
                    }
                    type="button"
                    onClick={() =>
                      navigate(
                        item.route,
                      )
                    }
                    className="min-w-0 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.035] p-3 text-left active:scale-[0.98]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Icon
                        size={18}
                      />
                    </span>

                    <p className="mt-3 truncate text-[10px] font-black uppercase tracking-wide text-slate-500">
                      {item.title}
                    </p>

                    <p className="mt-1 truncate text-lg font-black text-white">
                      {item.value}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-slate-500">
                      {
                        item.description
                      }
                    </p>
                  </button>
                )
              },
            )}
          </div>

          {!hasSnapshot &&
            !refreshing && (
            <button
              type="button"
              onClick={() =>
                setRefreshKey(
                  (current) =>
                    current + 1,
                )
              }
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
            >
              <RefreshCw
                size={14}
              />
              Ponovno učitaj podatke
            </button>
          )}
        </div>
      </section>

      {quickActions.length >
        0 && (
        <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                BRZE AKCIJE
              </p>

              <h2 className="mt-1 font-black text-white">
                Napravi odmah
              </h2>
            </div>

            <Plus
              size={18}
              className="shrink-0 text-slate-600"
            />
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
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
                    className="flex min-h-[82px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-slate-800/70 p-3 text-left active:scale-[0.98]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Icon
                        size={19}
                      />
                    </span>

                    <span className="min-w-0 truncate text-sm font-black text-white">
                      {
                        action.title
                      }
                    </span>
                  </button>
                )
              },
            )}
          </div>
        </section>
      )}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                DANAS
              </p>

              <h2 className="mt-1 truncate text-lg font-black text-white">
                Današnji poslovi
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/calendar',
                )
              }
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
            >
              <CalendarDays
                size={16}
              />
              <span className="hidden xs:inline sm:inline">
                Kalendar
              </span>
            </button>
          </div>

          {!hasSnapshot ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center">
              <Clock3
                size={26}
                className="mx-auto text-slate-600"
              />
              <p className="mt-3 text-sm font-black text-slate-400">
                Učitavam današnje poslove u pozadini...
              </p>
            </div>
          ) : data.todayOrders
              .length ===
            0 ? (
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
            <div className="mt-4 min-w-0 space-y-2">
              {data.todayOrders.map(
                (order) => (
                  <button
                    key={
                      order.id
                    }
                    type="button"
                    onClick={() =>
                      navigate(
                        `/work-orders/${order.id}`,
                      )
                    }
                    className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/45 p-3 text-left active:scale-[0.995]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Clock3
                        size={18}
                      />
                    </span>

                    <span className="min-w-0 flex-1 overflow-hidden">
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
                      className={`hidden shrink-0 rounded-full px-2 py-1 text-[9px] font-black sm:inline-flex ${statusClass(
                        order.status,
                      )}`}
                    >
                      {
                        order.status
                      }
                    </span>

                    <ArrowRight
                      size={16}
                      className="hidden shrink-0 text-slate-600 sm:block"
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
          className="relative min-w-0 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-slate-900 p-4 text-left active:scale-[0.995] sm:p-5"
        >
          <div className="flex items-center gap-3 sm:block">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300 sm:h-auto sm:w-auto sm:bg-transparent">
              <Sparkles
                size={21}
              />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400 sm:mt-4">
                FERSYS AI
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-white sm:text-xl">
                Reci što treba napraviti
              </h2>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
            Otvori AI pomoćnika za kalendar, investitore, naloge i ponude.
          </p>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-black text-violet-300 sm:mt-5">
            Otvori AI
            <ArrowRight
              size={16}
            />
          </span>
        </button>
      </section>

      <MissionCenter />
    </section>
  )
}

export default DashboardPage
