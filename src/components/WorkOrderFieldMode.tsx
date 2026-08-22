import {
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Play,
  Square,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import {
  finishWorkOrderFromField,
  markWorkOrderArrival,
  markWorkOrderDeparture,
} from '../services/workOrderField.service'
import {
  updateWorkOrderQuickStatus,
} from '../services/quickStatus.service'
import {
  getWorkOrderById,
  type CloudWorkOrder,
} from '../services/workOrders.service'

function displayTime(
  value: string,
) {
  return value?.trim()
    ? value.slice(0, 5)
    : '—'
}

function durationText(
  minutes: number,
) {
  if (!minutes) {
    return '—'
  }

  const hours =
    Math.floor(
      minutes / 60,
    )
  const rest =
    minutes % 60

  if (
    hours && rest
  ) {
    return `${hours} h ${rest} min`
  }

  if (hours) {
    return `${hours} h`
  }

  return `${rest} min`
}

export default function WorkOrderFieldMode() {
  const location =
    useLocation()
  const navigate =
    useNavigate()
  const { can } =
    useAuth()

  const [open, setOpen] =
    useState(false)
  const [action, setAction] =
    useState('')
  const [error, setError] =
    useState('')
  const [order, setOrder] =
    useState<CloudWorkOrder | null>(
      null,
    )

  const orderId =
    useMemo(() => {
      const match =
        location.pathname.match(
          /^\/work-orders\/([^/]+)$/,
        )

      if (
        !match ||
        match[1] === 'new'
      ) {
        return ''
      }

      return match[1]
    }, [location.pathname])

  const canManage =
    can('workOrders.manage')

  async function loadOrder() {
    if (!orderId) {
      setOrder(null)
      return
    }

    try {
      setError('')

      setOrder(
        await getWorkOrderById(
          orderId,
        ),
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Radni nalog nije moguće učitati.',
      )
    }
  }

  useEffect(() => {
    setOpen(false)
    void loadOrder()
  }, [orderId])

  useEffect(() => {
    function refresh() {
      void loadOrder()
    }

    window.addEventListener(
      'fersys:work-order-field-refresh',
      refresh,
    )

    return () => {
      window.removeEventListener(
        'fersys:work-order-field-refresh',
        refresh,
      )
    }
  }, [orderId])

  useEffect(() => {
    document.body.style.overflow =
      open ? 'hidden' : ''

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [open])

  if (
    !orderId ||
    !order
  ) {
    return null
  }

  const customerPhone =
    String(
      order.customerPhone ?? '',
    ).trim()

  const address =
    String(
      order.address ?? '',
    ).trim()

  const hasPhone =
    customerPhone.length > 0

  const hasAddress =
    address.length > 0
  const isFinished =
    order.status === 'Završen'
  const isCancelled =
    order.status === 'Otkazan'
  const isLocked =
    isFinished || isCancelled

  function callCustomer() {
    if (!hasPhone) return

    window.location.href =
      `tel:${customerPhone.replace(/\s+/g, '')}`
  }

  function openMaps() {
    if (!hasAddress) return

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address,
      )}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function run(
    name: string,
    task: () => Promise<void>,
  ) {
    if (action) return

    try {
      setAction(name)
      setError('')
      await task()
      await loadOrder()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setAction('')
    }
  }

  async function finish() {
    if (!order) return

    const confirmed =
      window.confirm(
        `Završiti radni nalog ${order.orderNumber}?`,
      )

    if (!confirmed) return

    await run(
      'finish',
      () =>
        finishWorkOrderFromField(
          order,
        ),
    )
  }

  return (
    <>
      <div className="fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom))] left-1/2 z-[56] flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl shadow-black/45 backdrop-blur-xl md:bottom-6 md:left-6 md:translate-x-0">
        <SmallAction
          label="Poziv"
          icon={<Phone size={17} />}
          disabled={!hasPhone}
          onClick={callCustomer}
        />

        <SmallAction
          label="Ruta"
          icon={<Navigation size={17} />}
          disabled={!hasAddress}
          onClick={openMaps}
        />

        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white active:scale-95"
        >
          <Wrench size={17} />
          Rad
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[170] flex items-end md:items-center md:justify-center md:p-5">
          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Zatvori radni način"
          />

          <section className="relative z-10 max-h-[86dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:w-[31rem] md:rounded-3xl md:border md:p-5">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700 md:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  RAD NA TERENU
                </p>

                <h2 className="mt-1 truncate text-xl font-black text-white">
                  {order.orderNumber}
                </h2>

                <p className="mt-1 truncate text-sm font-semibold text-slate-400">
                  {order.customerName}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric
                label="Status"
                value={order.status}
              />
              <Metric
                label="Dolazak"
                value={displayTime(
                  order.arrivalTime,
                )}
              />
              <Metric
                label="Trajanje"
                value={durationText(
                  order.durationMinutes,
                )}
              />
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
                {error}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <FieldButton
                icon={<Phone size={19} />}
                label="Nazovi"
                description={
                  hasPhone
                    ? customerPhone
                    : 'Nema broja telefona'
                }
                disabled={!hasPhone}
                onClick={callCustomer}
              />

              <FieldButton
                icon={<MapPin size={19} />}
                label="Navigacija"
                description={
                  hasAddress
                    ? address
                    : 'Nema adrese'
                }
                disabled={!hasAddress}
                onClick={openMaps}
              />
            </div>

            {canManage && (
              <div className="mt-4 space-y-2">
                {!isLocked && (
                  <>
                    {!order.arrivalTime && (
                      <WideButton
                        icon={
                          action === 'arrival'
                            ? <Loader2 size={19} className="animate-spin" />
                            : <Play size={19} />
                        }
                        label="Stigao sam — zabilježi dolazak"
                        description="Postavlja trenutno vrijeme i status U tijeku."
                        disabled={Boolean(action)}
                        onClick={() =>
                          void run(
                            'arrival',
                            async () => {
                              await markWorkOrderArrival(order)
                            },
                          )
                        }
                      />
                    )}

                    {order.arrivalTime &&
                      !order.departureTime && (
                      <WideButton
                        icon={
                          action === 'departure'
                            ? <Loader2 size={19} className="animate-spin" />
                            : <Square size={19} />
                        }
                        label="Odlazim — zabilježi odlazak"
                        description="Postavlja trenutno vrijeme i automatski računa trajanje."
                        disabled={Boolean(action)}
                        onClick={() =>
                          void run(
                            'departure',
                            async () => {
                              await markWorkOrderDeparture(order)
                            },
                          )
                        }
                      />
                    )}

                    {order.status !== 'U tijeku' && (
                      <WideButton
                        icon={
                          action === 'progress'
                            ? <Loader2 size={19} className="animate-spin" />
                            : <Clock3 size={19} />
                        }
                        label="Označi kao U tijeku"
                        description="Mijenja samo status naloga."
                        disabled={Boolean(action)}
                        onClick={() =>
                          void run(
                            'progress',
                            () =>
                              updateWorkOrderQuickStatus(
                                order.id,
                                'U tijeku',
                              ),
                          )
                        }
                      />
                    )}

                    <WideButton
                      icon={
                        action === 'finish'
                          ? <Loader2 size={19} className="animate-spin" />
                          : <CheckCircle2 size={19} />
                      }
                      label="Završi radni nalog"
                      description="Traži potvrdu. Ako odlazak nije zabilježen, koristi trenutno vrijeme."
                      disabled={Boolean(action)}
                      important
                      onClick={() =>
                        void finish()
                      }
                    />
                  </>
                )}

                <WideButton
                  icon={<Pencil size={19} />}
                  label="Uredi puni radni nalog"
                  description="Fotografije, materijal, opis, potpis, cijene i ostali podaci."
                  onClick={() => {
                    setOpen(false)
                    navigate(
                      `/work-orders/${order.id}/edit`,
                    )
                  }}
                />
              </div>
            )}

            {isFinished && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
                Ovaj radni nalog je završen. Brzi teren ostaje dostupan za poziv, navigaciju i pregled.
              </div>
            )}

            {isCancelled && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
                Ovaj radni nalog je otkazan. Podaci se ne mijenjaju iz radnog načina.
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function SmallAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 min-w-10 place-items-center rounded-xl px-2 text-[10px] font-black text-slate-300 active:bg-slate-800 disabled:opacity-30"
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className="hidden min-[390px]:inline">
          {label}
        </span>
      </span>
    </button>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

function FieldButton({
  icon,
  label,
  description,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  description: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-24 rounded-2xl border border-slate-800 bg-slate-950/55 p-3 text-left transition active:scale-[0.99] disabled:opacity-35"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
        {icon}
      </span>
      <span className="mt-3 block text-sm font-black text-white">
        {label}
      </span>
      <span className="mt-1 block truncate text-[10px] font-semibold text-slate-500">
        {description}
      </span>
    </button>
  )
}

function WideButton({
  icon,
  label,
  description,
  disabled,
  important,
  onClick,
}: {
  icon: ReactNode
  label: string
  description: string
  disabled?: boolean
  important?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[68px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] disabled:opacity-50 ${
        important
          ? 'border-emerald-500/20 bg-emerald-500/10'
          : 'border-slate-800 bg-slate-950/55'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          important
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-blue-500/10 text-blue-300'
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">
          {label}
        </span>
        <span className="mt-1 block text-[10px] leading-4 text-slate-500">
          {description}
        </span>
      </span>
    </button>
  )
}
