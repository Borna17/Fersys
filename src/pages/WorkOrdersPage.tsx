import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import {
  getWorkOrders,
  redactWorkOrderPrices,
  type CloudWorkOrder,
  type CloudWorkOrderStatus,
} from '../services/workOrders.service'
import {
  updateWorkOrderQuickStatus,
} from '../services/quickStatus.service'
import {
  getWorkOrderBrandingFromCompanySettings,
} from '../services/workOrderBranding.service'
import { downloadWorkOrderPdf } from '../utils/workOrderPdf'

const workOrderStatuses:
readonly CloudWorkOrderStatus[] = [
  'Novi',
  'Zakazan',
  'U tijeku',
  'Završen',
  'Otkazan',
]

function formatDate(date: string) {
  if (!date) return '—'

  const parsedDate =
    new Date(`${date}T00:00:00`)

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return date
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(parsedDate)
}

function money(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function durationText(minutes: number) {
  const hours =
    Math.floor(minutes / 60)

  const rest =
    minutes % 60

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) {
    return `${hours} h`
  }

  return `${rest} min`
}

function getStatusClassName(
  status: CloudWorkOrderStatus,
) {
  if (status === 'Završen') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
  }

  if (status === 'U tijeku') {
    return 'bg-violet-500/15 text-violet-300 border-violet-500/20'
  }

  if (status === 'Zakazan') {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/20'
  }

  if (status === 'Otkazan') {
    return 'bg-red-500/15 text-red-300 border-red-500/20'
  }

  return 'bg-blue-500/15 text-blue-300 border-blue-500/20'
}

export function WorkOrdersPage() {
  const navigate =
    useNavigate()

  const { can } =
    useAuth()

  const canViewPrices =
    can(
      'workOrders.viewPrices',
    )

  const canManageWorkOrders =
    can(
      'workOrders.manage',
    )

  const [
    orders,
    setOrders,
  ] =
    useState<
      CloudWorkOrder[]
    >([])

  const [
    search,
    setSearch,
  ] =
    useState('')

  const [
    status,
    setStatus,
  ] =
    useState<
      | 'all'
      | CloudWorkOrderStatus
    >('all')

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    loadError,
    setLoadError,
  ] =
    useState('')

  const [
    downloadingId,
    setDownloadingId,
  ] =
    useState<string | null>(
      null,
    )

  const [
    savingStatusId,
    setSavingStatusId,
  ] =
    useState<string | null>(
      null,
    )

  useEffect(() => {
    let cancelled = false

    async function loadWorkOrders() {
      try {
        setIsLoading(true)
        setLoadError('')

        const savedOrders =
          await getWorkOrders()

        if (!cancelled) {
          setOrders(savedOrders)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Radne naloge nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadWorkOrders()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      return orders.filter(
        (order) => {
          const matchesStatus =
            status === 'all' ||
            order.status === status

          const text = [
            order.orderNumber,
            order.customerName,
            order.customerContactPerson,
            order.customerPhone,
            order.customerEmail,
            order.customerOib,
            order.title,
            order.description,
            order.address,
            order.assignedWorkers.join(
              ' ',
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'hr-HR',
            )

          return (
            matchesStatus &&
            (!needle ||
              text.includes(
                needle,
              ))
          )
        },
      )
    }, [
      orders,
      search,
      status,
    ])

  const stats =
    useMemo(
      () => ({
        total:
          orders.length,
        active:
          orders.filter(
            (order) =>
              [
                'Novi',
                'Zakazan',
                'U tijeku',
              ].includes(
                order.status,
              ),
          ).length,
        completed:
          orders.filter(
            (order) =>
              order.status ===
              'Završen',
          ).length,
        urgent:
          orders.filter(
            (order) =>
              order.priority ===
              'Hitno',
          ).length,
      }),
      [orders],
    )

  async function handleStatusChange(
    order: CloudWorkOrder,
    nextStatus:
      CloudWorkOrderStatus,
  ) {
    if (
      !canManageWorkOrders ||
      order.status ===
        nextStatus ||
      savingStatusId ===
        order.id
    ) {
      return
    }

    const previousStatus =
      order.status

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status:
                nextStatus,
            }
          : item,
      ),
    )

    setSavingStatusId(
      order.id,
    )

    try {
      await updateWorkOrderQuickStatus(
        order.id,
        nextStatus,
      )
    } catch (error) {
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status:
                  previousStatus,
              }
            : item,
        ),
      )

      window.alert(
        error instanceof Error
          ? error.message
          : 'Status radnog naloga nije moguće spremiti.',
      )
    } finally {
      setSavingStatusId(
        null,
      )
    }
  }

  async function handleDownloadPdf(
    order: CloudWorkOrder,
  ) {
    try {
      setDownloadingId(
        order.id,
      )

      const branding =
        await getWorkOrderBrandingFromCompanySettings()

      await downloadWorkOrderPdf(
        canViewPrices
          ? order
          : redactWorkOrderPrices(
              order,
            ),
        branding,
      )
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'PDF nije moguće izraditi.',
      )
    } finally {
      setDownloadingId(
        null,
      )
    }
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje radnih naloga..."
      />
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
            Radne naloge nije moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-red-300">
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

  const statCards = [
    {
      key: 'all',
      label: 'Ukupno',
      value: stats.total,
      Icon:
        ClipboardList,
      color:
        'text-blue-300',
      bg:
        'bg-blue-500/10',
      active:
        status === 'all',
      onClick: () =>
        setStatus('all'),
    },
    {
      key: 'active',
      label: 'Aktivni',
      value:
        stats.active,
      Icon: Clock3,
      color:
        'text-violet-300',
      bg:
        'bg-violet-500/10',
      active: false,
      onClick: () => {
        setStatus('all')
        setSearch('')
      },
    },
    {
      key: 'done',
      label: 'Završeni',
      value:
        stats.completed,
      Icon:
        CheckCircle2,
      color:
        'text-emerald-300',
      bg:
        'bg-emerald-500/10',
      active:
        status ===
        'Završen',
      onClick: () =>
        setStatus(
          'Završen',
        ),
    },
    {
      key: 'urgent',
      label: 'Hitni',
      value:
        stats.urgent,
      Icon:
        CircleAlert,
      color:
        'text-red-300',
      bg:
        'bg-red-500/10',
      active: false,
      onClick: () =>
        setSearch('Hitno'),
    },
  ] satisfies Array<{
    key: string
    label: string
    value: number
    Icon: LucideIcon
    color: string
    bg: string
    active: boolean
    onClick: () => void
  }>

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
              RADNI NALOZI
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Terenski poslovi
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Brzi pregled naloga, statusa, termina i PDF-a.
            </p>
          </div>

          {canManageWorkOrders && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/work-orders/new',
                )
              }
              className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 px-5 text-white shadow-lg shadow-blue-950/30 active:scale-95 sm:flex sm:gap-2"
            >
              <Plus size={21} />
              <span className="hidden text-sm font-black sm:inline">
                Novi nalog
              </span>
            </button>
          )}
        </div>

        {canManageWorkOrders && (
          <button
            type="button"
            onClick={() =>
              navigate(
                '/work-orders/new',
              )
            }
            className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white sm:hidden"
          >
            <Plus size={20} />
            Novi radni nalog
          </button>
        )}

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {statCards.map(
            ({
              key,
              label,
              value,
              Icon,
              color,
              bg,
              active,
              onClick,
            }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className={`min-w-0 rounded-2xl border px-2 py-3 text-center transition active:scale-[0.98] ${
                  active
                    ? 'border-blue-500/40 bg-blue-500/10'
                    : 'border-white/5 bg-white/[0.035]'
                }`}
              >
                <span
                  className={`mx-auto grid h-8 w-8 place-items-center rounded-xl ${bg} ${color}`}
                >
                  <Icon
                    size={16}
                  />
                </span>

                <p className="mt-2 truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
                  {label}
                </p>

                <p className="mt-1 text-xl font-black text-white sm:text-2xl">
                  {value}
                </p>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
        <div className="relative">
          <Search
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Broj naloga, investitor, adresa, radnik..."
            className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
          {[
            'all',
            ...workOrderStatuses,
          ].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setStatus(
                  value as
                    | 'all'
                    | CloudWorkOrderStatus,
                )
              }
              className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-black ${
                status === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {value === 'all'
                ? 'Svi'
                : value}
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as
                | 'all'
                | CloudWorkOrderStatus,
            )
          }
          className="mt-3 hidden h-12 min-w-52 rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600 sm:block"
        >
          <option value="all">
            Svi statusi
          </option>

          {workOrderStatuses.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ),
          )}
        </select>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            POPIS
          </p>

          <h2 className="mt-1 text-lg font-black text-white">
            {filtered.length}{' '}
            prikazano
          </h2>
        </div>

        <div className="space-y-3 lg:hidden">
          {filtered.map(
            (order) => (
              <article
                key={order.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/work-orders/${order.id}`,
                      )
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      {
                        order.orderNumber
                      }
                    </p>

                    <h3 className="mt-1 truncate font-black text-white">
                      {order.title}
                    </h3>

                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                      {
                        order.customerName
                      }
                    </p>
                  </button>

                  {canManageWorkOrders ? (
                    <div className="relative shrink-0">
                      <select
                        value={
                          order.status
                        }
                        disabled={
                          savingStatusId ===
                          order.id
                        }
                        onChange={(event) =>
                          void handleStatusChange(
                            order,
                            event.target
                              .value as CloudWorkOrderStatus,
                          )
                        }
                        className={`min-w-[112px] appearance-none rounded-xl border px-2.5 py-2 pr-8 text-[11px] font-black outline-none ${getStatusClassName(
                          order.status,
                        )}`}
                      >
                        {workOrderStatuses.map(
                          (value) => (
                            <option
                              key={value}
                              value={value}
                              className="bg-slate-900 text-white"
                            >
                              {value}
                            </option>
                          ),
                        )}
                      </select>

                      {savingStatusId ===
                      order.id ? (
                        <LoaderCircle
                          size={14}
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusClassName(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/work-orders/${order.id}`,
                    )
                  }
                  className="mt-4 grid w-full grid-cols-2 gap-2 text-left"
                >
                  <MobileInfo
                    icon={
                      <CalendarDays
                        size={14}
                      />
                    }
                    label="Datum"
                    value={formatDate(
                      order.date,
                    )}
                  />

                  <MobileInfo
                    icon={
                      <Clock3
                        size={14}
                      />
                    }
                    label="Vrijeme"
                    value={`${
                      order.arrivalTime ||
                      '—'
                    } – ${
                      order.departureTime ||
                      '—'
                    }`}
                  />

                  <MobileInfo
                    icon={
                      <MapPin
                        size={14}
                      />
                    }
                    label="Lokacija"
                    value={
                      order.address ||
                      '—'
                    }
                    className="col-span-2"
                  />
                </button>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-800 pt-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {canViewPrices
                        ? 'Ukupno'
                        : 'Financije'}
                    </p>

                    <p className="mt-1 truncate font-black text-white">
                      {canViewPrices
                        ? money(
                            order.totalPrice,
                          )
                        : 'Skriveno'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {durationText(
                        order.durationMinutes,
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/work-orders/${order.id}`,
                        )
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-200"
                    >
                      <Eye size={17} />
                    </button>

                    <button
                      type="button"
                      disabled={
                        downloadingId ===
                        order.id
                      }
                      onClick={() =>
                        void handleDownloadPdf(
                          order,
                        )
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
                    >
                      {downloadingId ===
                      order.id ? (
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Download
                          size={17}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">
                    Broj
                  </th>
                  <th className="px-6 py-4">
                    Investitor i radovi
                  </th>
                  <th className="px-6 py-4">
                    Termin
                  </th>
                  <th className="px-6 py-4">
                    Lokacija
                  </th>
                  <th className="px-6 py-4">
                    Trajanje
                  </th>
                  <th className="px-6 py-4">
                    Ukupno
                  </th>
                  <th className="px-6 py-4">
                    Status
                  </th>
                  <th className="px-6 py-4">
                    Akcije
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filtered.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5 font-bold text-blue-400">
                        {
                          order.orderNumber
                        }
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-semibold text-white">
                          {order.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {
                            order.customerName
                          }
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-300">
                        <p className="flex items-center gap-2">
                          <CalendarDays
                            size={15}
                          />
                          {formatDate(
                            order.date,
                          )}
                        </p>

                        <p className="mt-2 flex items-center gap-2 text-slate-500">
                          <Clock3
                            size={15}
                          />
                          {
                            order.arrivalTime ||
                            '—'
                          }{' '}
                          –{' '}
                          {
                            order.departureTime ||
                            '—'
                          }
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="flex max-w-72 items-start gap-2 text-sm text-slate-300">
                          <MapPin
                            size={15}
                            className="mt-0.5 shrink-0"
                          />
                          {
                            order.address ||
                            '—'
                          }
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-300">
                        {durationText(
                          order.durationMinutes,
                        )}
                      </td>

                      <td className="px-6 py-5 font-semibold text-white">
                        {canViewPrices
                          ? money(
                              order.totalPrice,
                            )
                          : 'Skriveno'}
                      </td>

                      <td className="px-6 py-5">
                        {canManageWorkOrders ? (
                          <div className="relative inline-block">
                            <select
                              value={
                                order.status
                              }
                              disabled={
                                savingStatusId ===
                                order.id
                              }
                              onChange={(event) =>
                                void handleStatusChange(
                                  order,
                                  event.target
                                    .value as CloudWorkOrderStatus,
                                )
                              }
                              className={`min-w-[125px] cursor-pointer appearance-none rounded-xl border px-3 py-2 pr-9 text-xs font-black outline-none transition focus:ring-2 focus:ring-blue-500/30 ${getStatusClassName(
                                order.status,
                              )}`}
                            >
                              {workOrderStatuses.map(
                                (
                                  value,
                                ) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                    className="bg-slate-900 text-white"
                                  >
                                    {
                                      value
                                    }
                                  </option>
                                ),
                              )}
                            </select>

                            {savingStatusId ===
                            order.id ? (
                              <LoaderCircle
                                size={14}
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
                              order.status,
                            )}`}
                          >
                            {
                              order.status
                            }
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/work-orders/${order.id}`,
                              )
                            }
                            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300"
                          >
                            <Eye
                              size={18}
                            />
                          </button>

                          <button
                            type="button"
                            disabled={
                              downloadingId ===
                              order.id
                            }
                            onClick={() =>
                              void handleDownloadPdf(
                                order,
                              )
                            }
                            className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
                          >
                            {downloadingId ===
                            order.id ? (
                              <LoaderCircle
                                size={18}
                                className="animate-spin"
                              />
                            ) : (
                              <Download
                                size={18}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
            <ClipboardList
              size={34}
              className="mx-auto text-slate-600"
            />

            <p className="mt-4 font-black text-white">
              {orders.length === 0
                ? 'Još nema radnih naloga'
                : 'Nema pronađenih radnih naloga'}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {orders.length === 0
                ? 'Izradi prvi radni nalog i kreni s radom.'
                : 'Promijeni pretragu ili odabrani status.'}
            </p>
          </div>
        )}
      </section>
    </section>
  )
}

function MobileInfo({
  icon,
  label,
  value,
  className = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl bg-slate-950/50 p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
        {icon}
        {label}
      </div>

      <p className="mt-1 truncate text-xs font-bold text-slate-300">
        {value}
      </p>
    </div>
  )
}
