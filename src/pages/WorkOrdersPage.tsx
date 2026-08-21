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

  const parsed =
    new Date(`${date}T00:00:00`)

  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat(
        'hr-HR',
      ).format(parsed)
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
  const safe =
    Number(minutes) || 0
  const hours =
    Math.floor(safe / 60)
  const rest =
    safe % 60

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) return `${hours} h`
  return `${rest} min`
}

function statusClass(
  status: CloudWorkOrderStatus,
) {
  if (status === 'Završen') {
    return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
  }
  if (status === 'U tijeku') {
    return 'border-violet-500/20 bg-violet-500/15 text-violet-300'
  }
  if (status === 'Zakazan') {
    return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
  }
  if (status === 'Otkazan') {
    return 'border-red-500/20 bg-red-500/15 text-red-300'
  }
  return 'border-blue-500/20 bg-blue-500/15 text-blue-300'
}

export function WorkOrdersPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewPrices =
    can('workOrders.viewPrices')
  const canManageWorkOrders =
    can('workOrders.manage')

  const [orders, setOrders] =
    useState<CloudWorkOrder[]>([])
  const [search, setSearch] =
    useState('')
  const [status, setStatus] =
    useState<
      'all' | CloudWorkOrderStatus
    >('all')
  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [
    downloadingId,
    setDownloadingId,
  ] = useState<string | null>(
    null,
  )
  const [
    savingStatusId,
    setSavingStatusId,
  ] = useState<string | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsLoading(true)
        setLoadError('')

        const saved =
          await getWorkOrders()

        if (!cancelled) {
          setOrders(saved)
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
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
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
          order.priority,
          ...(order.assignedWorkers ??
            []),
        ]
          .join(' ')
          .toLocaleLowerCase(
            'hr-HR',
          )

        return (
          matchesStatus &&
          (!needle ||
            text.includes(needle))
        )
      },
    )
  }, [
    orders,
    search,
    status,
  ])

  const stats = useMemo(
    () => ({
      total: orders.length,
      active: orders.filter(
        (order) =>
          [
            'Novi',
            'Zakazan',
            'U tijeku',
          ].includes(order.status),
      ).length,
      completed: orders.filter(
        (order) =>
          order.status ===
          'Završen',
      ).length,
      urgent: orders.filter(
        (order) =>
          order.priority ===
          'Hitno',
      ).length,
    }),
    [orders],
  )

  async function changeStatus(
    order: CloudWorkOrder,
    next: CloudWorkOrderStatus,
  ) {
    if (
      !canManageWorkOrders ||
      next === order.status ||
      savingStatusId === order.id
    ) {
      return
    }

    const previous =
      order.status

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status: next,
            }
          : item,
      ),
    )

    setSavingStatusId(order.id)

    try {
      await updateWorkOrderQuickStatus(
        order.id,
        next,
      )
    } catch (error) {
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: previous,
              }
            : item,
        ),
      )

      window.alert(
        error instanceof Error
          ? error.message
          : 'Status nije moguće spremiti.',
      )
    } finally {
      setSavingStatusId(null)
    }
  }

  async function downloadPdf(
    order: CloudWorkOrder,
  ) {
    try {
      setDownloadingId(order.id)

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
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje radnih naloga..." />
    )
  }

  if (loadError) {
    return (
      <ErrorState
        title="Radne naloge nije moguće učitati"
        message={loadError}
      />
    )
  }

  const cards: Array<{
    key: string
    label: string
    value: number
    Icon: LucideIcon
    className: string
    onClick: () => void
  }> = [
    {
      key: 'all',
      label: 'Ukupno',
      value: stats.total,
      Icon: ClipboardList,
      className:
        'text-blue-300 bg-blue-500/10',
      onClick: () =>
        setStatus('all'),
    },
    {
      key: 'active',
      label: 'Aktivni',
      value: stats.active,
      Icon: Clock3,
      className:
        'text-violet-300 bg-violet-500/10',
      onClick: () => {
        setStatus('all')
        setSearch('')
      },
    },
    {
      key: 'done',
      label: 'Završeni',
      value: stats.completed,
      Icon: CheckCircle2,
      className:
        'text-emerald-300 bg-emerald-500/10',
      onClick: () =>
        setStatus('Završen'),
    },
    {
      key: 'urgent',
      label: 'Hitni',
      value: stats.urgent,
      Icon: CircleAlert,
      className:
        'text-red-300 bg-red-500/10',
      onClick: () => {
        setStatus('all')
        setSearch('Hitno')
      },
    },
  ]

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-6 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              RADNI NALOZI
            </p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Terenski poslovi
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Brzi pregled naloga,
              statusa, termina i PDF-a.
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
              className="hidden h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white sm:flex"
            >
              <Plus size={20} />
              Novi nalog
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
            className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-black text-white sm:hidden"
          >
            <Plus size={20} />
            Novi radni nalog
          </button>
        )}

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {cards.map(
            ({
              key,
              label,
              value,
              Icon,
              className,
              onClick,
            }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-2 py-3 text-center active:scale-[0.98]"
              >
                <span
                  className={`mx-auto grid h-8 w-8 place-items-center rounded-xl ${className}`}
                >
                  <Icon size={16} />
                </span>
                <p className="mt-2 truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-xl font-black text-white">
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
            className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="fersys-scrollbar-hidden mt-3 flex gap-2 overflow-x-auto pb-1">
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
      </section>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            POPIS
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            {filtered.length}{' '}
            prikazano
          </h2>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {filtered.map((order) => (
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
                  {order.orderNumber}
                </p>
                <h3 className="mt-1 truncate font-black text-white">
                  {order.title ||
                    'Radni nalog'}
                </h3>
                <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                  {order.customerName}
                </p>
              </button>

              {canManageWorkOrders ? (
                <div className="relative shrink-0">
                  <select
                    value={order.status}
                    disabled={
                      savingStatusId ===
                      order.id
                    }
                    onChange={(event) =>
                      void changeStatus(
                        order,
                        event.target
                          .value as CloudWorkOrderStatus,
                      )
                    }
                    className={`min-w-[112px] appearance-none rounded-xl border px-2.5 py-2 pr-8 text-[11px] font-black outline-none ${statusClass(
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
                    order.id && (
                    <LoaderCircle
                      size={14}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin"
                    />
                  )}
                </div>
              ) : (
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(
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
              <Info
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
              <Info
                icon={
                  <Clock3 size={14} />
                }
                label="Vrijeme"
                value={`${order.arrivalTime || '—'} – ${order.departureTime || '—'}`}
              />
              <Info
                icon={
                  <MapPin size={14} />
                }
                label="Lokacija"
                value={
                  order.address || '—'
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
                        Number(
                          order.totalPrice,
                        ) || 0,
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
                  aria-label="Otvori nalog"
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
                    void downloadPdf(order)
                  }
                  className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
                  aria-label="Preuzmi PDF"
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
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Broj</th>
                <th className="px-6 py-4">Investitor i radovi</th>
                <th className="px-6 py-4">Termin</th>
                <th className="px-6 py-4">Lokacija</th>
                <th className="px-6 py-4">Ukupno</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Akcije</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filtered.map(
                (order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-5 font-bold text-blue-400">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-white">
                        {order.title ||
                          'Radni nalog'}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {order.customerName}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-300">
                      {formatDate(
                        order.date,
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {order.arrivalTime ||
                          '—'}{' '}
                        –{' '}
                        {order.departureTime ||
                          '—'}
                      </p>
                    </td>
                    <td className="max-w-72 px-6 py-5 text-sm text-slate-300">
                      {order.address || '—'}
                    </td>
                    <td className="px-6 py-5 font-black text-white">
                      {canViewPrices
                        ? money(
                            Number(
                              order.totalPrice,
                            ) || 0,
                          )
                        : 'Skriveno'}
                    </td>
                    <td className="px-6 py-5">
                      {canManageWorkOrders ? (
                        <select
                          value={
                            order.status
                          }
                          onChange={(event) =>
                            void changeStatus(
                              order,
                              event.target
                                .value as CloudWorkOrderStatus,
                            )
                          }
                          disabled={
                            savingStatusId ===
                            order.id
                          }
                          className={`rounded-xl border px-3 py-2 text-xs font-black ${statusClass(
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
                      ) : (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            order.status,
                          )}`}
                        >
                          {order.status}
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
                          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-200"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void downloadPdf(
                              order,
                            )
                          }
                          disabled={
                            downloadingId ===
                            order.id
                          }
                          className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
                        >
                          {downloadingId ===
                          order.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Download
                              size={16}
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
        <EmptyState text="Nema radnih naloga za odabrane filtre." />
      )}
    </section>
  )
}

function Info({
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
      className={`rounded-2xl bg-slate-800/55 p-3 ${className}`}
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

function ErrorState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
      <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center">
        <CircleAlert
          size={38}
          className="mx-auto text-red-400"
        />
        <h1 className="mt-5 text-xl font-black text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm text-red-300">
          {message}
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

function EmptyState({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
      <ClipboardList
        size={30}
        className="mx-auto text-slate-600"
      />
      <p className="mt-3 font-black text-white">
        {text}
      </p>
    </div>
  )
}

export default WorkOrdersPage
