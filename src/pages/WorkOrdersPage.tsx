import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  Download,
  Eye,
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
import { downloadWorkOrderPdf } from '../utils/workOrderPdf'
import { readBranding } from '../utils/workOrderStorage'

function formatDate(date: string) {
  if (!date) {
    return '—'
  }

  const parsedDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('hr-HR').format(
    parsedDate,
  )
}

function money(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function durationText(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

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
    return 'bg-emerald-500/15 text-emerald-400'
  }

  if (status === 'U tijeku') {
    return 'bg-violet-500/15 text-violet-400'
  }

  if (status === 'Zakazan') {
    return 'bg-amber-500/15 text-amber-400'
  }

  if (status === 'Otkazan') {
    return 'bg-red-500/15 text-red-400'
  }

  return 'bg-blue-500/15 text-blue-400'
}

export function WorkOrdersPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewPrices =
    can('workOrders.viewPrices')

  const canManageWorkOrders =
    can('workOrders.manage')

  const [orders, setOrders] = useState<
    CloudWorkOrder[]
  >([])

  const [search, setSearch] = useState('')

  const [status, setStatus] = useState<
    'all' | CloudWorkOrderStatus
  >('all')

  const [isLoading, setIsLoading] =
    useState(true)

  const [loadError, setLoadError] =
    useState('')

  const [downloadingId, setDownloadingId] =
    useState<string | null>(null)

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

  const filtered = useMemo(() => {
    const needle = search
      .trim()
      .toLocaleLowerCase('hr-HR')

    return orders.filter((order) => {
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
        order.assignedWorkers.join(' '),
      ]
        .join(' ')
        .toLocaleLowerCase('hr-HR')

      return (
        matchesStatus &&
        (!needle || text.includes(needle))
      )
    })
  }, [
    orders,
    search,
    status,
  ])

  const stats = useMemo(
    () => ({
      total: orders.length,

      active: orders.filter((order) =>
        [
          'Novi',
          'Zakazan',
          'U tijeku',
        ].includes(order.status),
      ).length,

      completed: orders.filter(
        (order) =>
          order.status === 'Završen',
      ).length,

      urgent: orders.filter(
        (order) =>
          order.priority === 'Hitno',
      ).length,
    }),
    [orders],
  )

  function handleDownloadPdf(
    order: CloudWorkOrder,
  ) {
    try {
      setDownloadingId(order.id)

      downloadWorkOrderPdf(
        canViewPrices
          ? order
          : redactWorkOrderPrices(order),
        readBranding(),
      )
    } catch (error) {
      alert(
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
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <CircleAlert
            size={42}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-2xl font-bold text-white">
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
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  const statCards = [
    {
      label: 'Ukupno naloga',
      value: stats.total,
      Icon: ClipboardList,
      color: 'text-blue-400',
    },
    {
      label: 'Aktivni',
      value: stats.active,
      Icon: Clock3,
      color: 'text-violet-400',
    },
    {
      label: 'Završeni',
      value: stats.completed,
      Icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Hitni',
      value: stats.urgent,
      Icon: CircleAlert,
      color: 'text-red-400',
    },
  ] satisfies Array<{
    label: string
    value: number
    Icon: LucideIcon
    color: string
  }>

  return (
    <section className="mx-auto w-full max-w-[1600px]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Radni nalozi
          </h1>

          <p className="mt-2 text-slate-400">
            Upravljaj svim radnim nalozima,
            fotografijama i potpisima.
          </p>
        </div>

        {canManageWorkOrders && (
          <button
            type="button"
            onClick={() =>
              navigate('/work-orders/new')
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus size={20} />
            Novi radni nalog
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(
          ({
            label,
            value,
            Icon,
            color,
          }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    {label}
                  </p>

                  <p
                    className={`mt-2 text-3xl font-bold ${color}`}
                  >
                    {value}
                  </p>
                </div>

                <Icon
                  size={26}
                  className={color}
                />
              </div>
            </div>
          ),
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:flex-row">
        <div className="relative flex-1">
          <Search
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Pretraži broj naloga, investitora, radove, adresu ili radnika..."
            className="h-12 w-full rounded-xl bg-slate-800 pl-12 pr-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | 'all'
                | CloudWorkOrderStatus,
            )
          }
          className="h-12 min-w-52 rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">
            Svi statusi
          </option>

          {[
            'Novi',
            'Zakazan',
            'U tijeku',
            'Završen',
            'Otkazan',
          ].map((value) => (
            <option
              key={value}
              value={value}
            >
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="hidden overflow-x-auto lg:block">
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
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="transition hover:bg-slate-800/40"
                >
                  <td className="px-6 py-5 font-bold text-blue-400">
                    {order.orderNumber}
                  </td>

                  <td className="px-6 py-5">
                    <p className="font-semibold text-white">
                      {order.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {order.customerName}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-300">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={15} />
                      {formatDate(order.date)}
                    </p>

                    <p className="mt-2 flex items-center gap-2 text-slate-500">
                      <Clock3 size={15} />
                      {order.arrivalTime || '—'} –{' '}
                      {order.departureTime || '—'}
                    </p>
                  </td>

                  <td className="px-6 py-5">
                    <p className="flex max-w-72 items-start gap-2 text-sm text-slate-300">
                      <MapPin
                        size={15}
                        className="mt-0.5 shrink-0"
                      />

                      {order.address || '—'}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-300">
                    {durationText(
                      order.durationMinutes,
                    )}
                  </td>

                  <td className="px-6 py-5 font-semibold text-white">
                    {canViewPrices ? money(order.totalPrice) : 'Skriveno'}
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
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
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
                        title="Otvori"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        type="button"
                        disabled={
                          downloadingId === order.id
                        }
                        onClick={() =>
                          handleDownloadPdf(order)
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Preuzmi PDF"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-800 lg:hidden">
          {filtered.map((order) => (
            <article
              key={order.id}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-400">
                    {order.orderNumber}
                  </p>

                  <h2 className="mt-1 truncate font-semibold text-white">
                    {order.title}
                  </h2>

                  <p className="mt-1 truncate text-sm text-slate-400">
                    {order.customerName}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClassName(
                    order.status,
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <p className="flex items-center gap-2">
                  <CalendarDays
                    size={15}
                    className="shrink-0"
                  />
                  {formatDate(order.date)}
                </p>

                <p className="flex items-center gap-2">
                  <Clock3
                    size={15}
                    className="shrink-0"
                  />
                  {order.arrivalTime || '—'} –{' '}
                  {order.departureTime || '—'}
                </p>

                <p className="flex items-start gap-2">
                  <MapPin
                    size={15}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {order.address || '—'}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {canViewPrices
                      ? 'Ukupno'
                      : 'Financijski podaci'}
                  </p>

                  <p className="font-bold text-white">
                    {canViewPrices ? money(order.totalPrice) : 'Skriveno'}
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
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white"
                  >
                    <Eye size={17} />
                    Otvori
                  </button>

                  <button
                    type="button"
                    disabled={
                      downloadingId === order.id
                    }
                    onClick={() =>
                      handleDownloadPdf(order)
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-50"
                    aria-label="Preuzmi PDF"
                  >
                    <Download size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <ClipboardList
              size={36}
              className="mx-auto text-slate-600"
            />

            <p className="mt-4 font-semibold text-white">
              {orders.length === 0
                ? 'Još nema radnih naloga'
                : 'Nema pronađenih radnih naloga'}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              {orders.length === 0
                ? 'Klikni Novi radni nalog i izradi prvi nalog.'
                : 'Promijeni pojam pretrage ili odabrani status.'}
            </p>

            {orders.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  navigate('/work-orders/new')
                }
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white"
              >
                <Plus size={18} />
                Novi radni nalog
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1 border-t border-slate-800 px-4 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            Prikazano {filtered.length} od{' '}
            {orders.length}
          </span>

          <span>
            Podaci su spremljeni u Supabase
          </span>
        </div>
      </div>
    </section>
  )
}