import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Clock3,
  Download,
  Euro,
  FileImage,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  UserRound,
  UsersRound,
} from 'lucide-react'

import {
  useAuth,
} from '../auth/AuthProvider'

import FersysLoader from '../components/FersysLoader'

import {
  getWorkOrderById,
  redactWorkOrderPrices,
  type CloudWorkOrder,
} from '../services/workOrders.service'

import {
  getWorkOrderBrandingFromCompanySettings,
} from '../services/workOrderBranding.service'

import {
  getWorkOrderEditAccess,
} from '../services/workOrderAccess.service'

import {
  downloadWorkOrderPdf,
} from '../utils/workOrderPdf'

function money(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function formatDate(value: string) {
  if (!value) return '—'

  const parsedDate =
    new Date(`${value}T00:00:00`)

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(parsedDate)
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

function formatDateTime(value: string) {
  const parsed =
    new Date(value)

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(parsed)
}

function getStatusClassName(
  status: CloudWorkOrder['status'],
) {
  if (status === 'Završen') {
    return 'bg-emerald-500/15 text-emerald-300'
  }

  if (status === 'U tijeku') {
    return 'bg-violet-500/15 text-violet-300'
  }

  if (status === 'Zakazan') {
    return 'bg-amber-500/15 text-amber-300'
  }

  if (status === 'Otkazan') {
    return 'bg-red-500/15 text-red-300'
  }

  return 'bg-blue-500/15 text-blue-300'
}

function getPriorityClassName(
  priority: CloudWorkOrder['priority'],
) {
  if (priority === 'Hitno') {
    return 'bg-red-500/15 text-red-300'
  }

  if (priority === 'Visok') {
    return 'bg-orange-500/15 text-orange-300'
  }

  if (priority === 'Nizak') {
    return 'bg-slate-700 text-slate-300'
  }

  return 'bg-blue-500/15 text-blue-300'
}

export function WorkOrderDetailsPage() {
  const navigate =
    useNavigate()

  const { can } =
    useAuth()

  const canViewPrices =
    can('workOrders.viewPrices')

  const canManageWorkOrders =
    can('workOrders.manage')

  const { id } =
    useParams()

  const [
    order,
    setOrder,
  ] =
    useState<CloudWorkOrder | null>(
      null,
    )

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
    isDownloading,
    setIsDownloading,
  ] =
    useState(false)

  const [
    canEditThisOrder,
    setCanEditThisOrder,
  ] =
    useState(false)

  const [
    editAccessReason,
    setEditAccessReason,
  ] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      if (!id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setLoadError('')

        const savedOrder =
          await getWorkOrderById(id)

        if (!cancelled) {
          setOrder(savedOrder)

          if (
            savedOrder &&
            canManageWorkOrders
          ) {
            try {
              const access =
                await getWorkOrderEditAccess(
                  savedOrder,
                )

              if (!cancelled) {
                setCanEditThisOrder(
                  access.allowed,
                )
                setEditAccessReason(
                  access.reason,
                )
              }
            } catch (accessError) {
              console.error(
                'Pravo uređivanja naloga nije moguće provjeriti:',
                accessError,
              )

              if (!cancelled) {
                setCanEditThisOrder(false)
                setEditAccessReason(
                  'Pravo uređivanja trenutno nije moguće provjeriti.',
                )
              }
            }
          } else if (!cancelled) {
            setCanEditThisOrder(false)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Radni nalog nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadOrder()

    return () => {
      cancelled = true
    }
  }, [
    id,
    canManageWorkOrders,
  ])

  async function handleDownloadPdf() {
    if (
      !order ||
      isDownloading
    ) {
      return
    }

    try {
      setIsDownloading(true)

      const branding =
        await getWorkOrderBrandingFromCompanySettings()

      downloadWorkOrderPdf(
        canViewPrices
          ? order
          : redactWorkOrderPrices(
              order,
            ),
        branding,
      )
    } catch (error) {
      console.error(
        'Izrada PDF-a radnog naloga nije uspjela:',
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : 'PDF nije moguće izraditi.',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje radnog naloga..."
      />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <CircleAlert
            size={38}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-xl font-black text-white sm:text-2xl">
            Radni nalog nije moguće učitati
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

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center sm:p-10">
        <CircleAlert
          size={36}
          className="mx-auto text-slate-500"
        />

        <h1 className="mt-5 text-2xl font-black text-white">
          Radni nalog nije pronađen
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          Nalog ne postoji ili više nije dostupan.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/work-orders')
          }
          className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
        >
          Povratak
        </button>
      </div>
    )
  }

  const vatValue =
    order.totalPrice -
    order.materialPrice -
    order.labourPrice

  const hasPhone =
    Boolean(
      order.customerPhone?.trim(),
    )

  const hasEmail =
    Boolean(
      order.customerEmail?.trim(),
    )

  const hasAddress =
    Boolean(
      order.address?.trim(),
    )

  return (
    <>
      <section className="mx-auto w-full max-w-[1450px] space-y-4 sm:space-y-6">
        <button
          type="button"
          onClick={() =>
            navigate('/work-orders')
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Radni nalozi
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                  RADNI NALOG
                </p>

                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {order.orderNumber}
                </h1>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  {order.title}
                </p>
              </div>

              {canManageWorkOrders &&
                canEditThisOrder && (
                  <div className="sm:hidden" />
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black ${getStatusClassName(
                  order.status,
                )}`}
              >
                {order.status}
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black ${getPriorityClassName(
                  order.priority,
                )}`}
              >
                {order.priority}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <HeroMetric
                label="Datum"
                value={formatDate(
                  order.date,
                )}
              />

              <HeroMetric
                label="Trajanje"
                value={durationText(
                  order.durationMinutes,
                )}
              />

              <HeroMetric
                label={
                  canViewPrices
                    ? 'Ukupno'
                    : 'Cijena'
                }
                value={
                  canViewPrices
                    ? money(
                        order.totalPrice,
                      )
                    : 'Skriveno'
                }
                compact
              />
            </div>

{canManageWorkOrders &&
              canEditThisOrder && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/work-orders/${order.id}/edit`,
                )
              }
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white active:scale-[0.99] sm:hidden"
            >
              <Pencil size={18} />
              Uredi radni nalog
            </button>
              )}

            <div className="mt-4 hidden gap-3 sm:flex">
              {canManageWorkOrders &&
                canEditThisOrder && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/work-orders/${order.id}/edit`,
                      )
                    }
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 font-black text-white"
                  >
                    <Pencil size={18} />
                    Uredi nalog
                  </button>
                )}

              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownloadPdf}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white disabled:opacity-50"
              >
                <Download size={18} />
                {isDownloading
                  ? 'Izrada PDF-a...'
                  : 'Preuzmi PDF'}
              </button>
            </div>
          </div>
        </section>

        {canManageWorkOrders &&
          !canEditThisOrder &&
          editAccessReason && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-200">
              {editAccessReason}
            </div>
          )}

        <section className="grid grid-cols-3 gap-2">
          <ActionButton
            icon={<Phone size={19} />}
            label="Poziv"
            disabled={!hasPhone}
            onClick={() => {
              if (hasPhone) {
                window.location.href =
                  `tel:${order.customerPhone}`
              }
            }}
          />

          <ActionButton
            icon={<Mail size={19} />}
            label="E-mail"
            disabled={!hasEmail}
            onClick={() => {
              if (hasEmail) {
                window.location.href =
                  `mailto:${order.customerEmail}`
              }
            }}
          />

          <ActionButton
            icon={<Navigation size={19} />}
            label="Navigacija"
            disabled={!hasAddress}
            onClick={() => {
              if (hasAddress) {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    order.address,
                  )}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            }}
          />
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
          <div className="space-y-4 xl:col-span-2 xl:space-y-6">
            <Card title="Podaci o nalogu">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Info
                  icon={
                    <UserRound
                      size={17}
                    />
                  }
                  label="Investitor"
                  value={
                    order.customerName
                  }
                  className="col-span-2"
                />

                <Info
                  icon={
                    <CalendarDays
                      size={17}
                    />
                  }
                  label="Datum"
                  value={formatDate(
                    order.date,
                  )}
                />

                <Info
                  icon={
                    <Clock3
                      size={17}
                    />
                  }
                  label="Vrijeme"
                  value={`${order.arrivalTime || '—'} – ${order.departureTime || '—'}`}
                />

                <Info
                  icon={
                    <MapPin
                      size={17}
                    />
                  }
                  label="Adresa"
                  value={
                    order.address ||
                    'Nije uneseno'
                  }
                  className="col-span-2"
                />

                <Info
                  icon={
                    <UsersRound
                      size={17}
                    />
                  }
                  label="Radnici"
                  value={
                    order.assignedWorkers
                      .length > 0
                      ? order.assignedWorkers.join(
                          ', ',
                        )
                      : 'Nije uneseno'
                  }
                  className="col-span-2"
                />
              </div>
            </Card>

            <Card title="Kontakt investitora">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <Info
                  icon={
                    <UserRound
                      size={17}
                    />
                  }
                  label="Kontakt osoba"
                  value={
                    order.customerContactPerson ||
                    'Nije uneseno'
                  }
                />

                <Info
                  icon={
                    <UserRound
                      size={17}
                    />
                  }
                  label="OIB"
                  value={
                    order.customerOib ||
                    'Nije uneseno'
                  }
                />

                <Info
                  icon={
                    <Phone
                      size={17}
                    />
                  }
                  label="Telefon"
                  value={
                    order.customerPhone ||
                    'Nije uneseno'
                  }
                />

                <Info
                  icon={
                    <Mail
                      size={17}
                    />
                  }
                  label="E-mail"
                  value={
                    order.customerEmail ||
                    'Nije uneseno'
                  }
                />
              </div>
            </Card>

            <Card title="Opis radova">
              <div className="rounded-2xl bg-slate-800/60 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
                  {order.description ||
                    'Nema dodatnog opisa.'}
                </p>
              </div>
            </Card>

            <Card title={`Materijal (${order.materials.length})`}>
              {order.materials.length === 0 ? (
                <EmptyText>
                  Nema evidentiranog materijala.
                </EmptyText>
              ) : (
                <div className="space-y-2">
                  {order.materials.map(
                    (material) => (
                      <div
                        key={material.id}
                        className="rounded-2xl bg-slate-800/65 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-black text-white">
                              {material.name}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-400">
                              {material.quantity}{' '}
                              {material.unit}
                              {canViewPrices
                                ? ` × ${money(
                                    material.unitPrice,
                                  )}`
                                : ''}
                            </p>
                          </div>

                          {canViewPrices && (
                            <p className="shrink-0 text-sm font-black text-white">
                              {money(
                                material.quantity *
                                  material.unitPrice,
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </Card>

            <Card
              title={`Fotografije (${order.images.length})`}
              icon={
                <FileImage
                  size={20}
                  className="text-violet-400"
                />
              }
            >
              {order.images.length === 0 ? (
                <EmptyText>
                  Fotografije nisu dodane.
                </EmptyText>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
                  {order.images.map(
                    (image) => (
                      <a
                        key={image.id}
                        href={image.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 active:scale-[0.99]"
                      >
                        <img
                          src={image.dataUrl}
                          alt={image.name}
                          className="aspect-square w-full object-cover"
                        />

                        <p className="truncate px-3 py-2 text-[11px] font-semibold text-slate-400">
                          {image.name}
                        </p>
                      </a>
                    ),
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4 xl:space-y-6">
            <Card
              title="Financije"
              icon={
                <Euro
                  size={20}
                  className="text-emerald-400"
                />
              }
            >
              <div className="space-y-4 text-sm">
                <Row
                  label="Materijal"
                  value={
                    canViewPrices
                      ? money(
                          order.materialPrice,
                        )
                      : 'Skriveno'
                  }
                />

                <Row
                  label="Rad"
                  value={
                    canViewPrices
                      ? money(
                          order.labourPrice,
                        )
                      : 'Skriveno'
                  }
                />

                <Row
                  label={`PDV ${order.vatRate}%`}
                  value={
                    canViewPrices
                      ? money(vatValue)
                      : 'Skriveno'
                  }
                />

                <div className="border-t border-slate-700 pt-4">
                  <Row
                    label="UKUPNO"
                    value={
                      canViewPrices
                        ? money(
                            order.totalPrice,
                          )
                        : 'Skriveno'
                    }
                    strong
                  />
                </div>
              </div>

              {canViewPrices &&
                order.priceNote && (
                  <div className="mt-5 rounded-2xl bg-slate-800/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Napomena uz cijenu
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {order.priceNote}
                    </p>
                  </div>
                )}
            </Card>

            <Card title="Potpis investitora">
              <p className="text-sm font-semibold text-slate-400">
                {order.investorName ||
                  'Ime nije uneseno'}
              </p>

              {order.investorSignature ? (
                <div className="mt-4 overflow-hidden rounded-2xl bg-white p-2">
                  <img
                    src={
                      order.investorSignature
                    }
                    alt="Potpis investitora"
                    className="h-40 w-full object-contain"
                  />
                </div>
              ) : (
                <EmptyText>
                  Potpis nije unesen.
                </EmptyText>
              )}
            </Card>

            <Card title="Evidencija">
              <div className="space-y-4 text-sm">
                <Row
                  label="Izrađeno"
                  value={formatDateTime(
                    order.createdAt,
                  )}
                />

                <Row
                  label="Zadnja izmjena"
                  value={formatDateTime(
                    order.updatedAt,
                  )}
                />
              </div>
            </Card>
          </div>
        </div>

        <div className="h-20 sm:hidden" />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-xl gap-2">
          {canManageWorkOrders &&
            canEditThisOrder && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/work-orders/${order.id}/edit`,
                  )
                }
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white"
                aria-label="Uredi nalog"
              >
                <Pencil size={18} />
              </button>
            )}

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPdf}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
          >
            <Download size={18} />
            {isDownloading
              ? 'Izrada PDF-a...'
              : 'Preuzmi PDF'}
          </button>
        </div>
      </div>

      {isDownloading && (
        <FersysLoader
          fullScreen
          text="Izrada PDF dokumenta..."
        />
      )}
    </>
  )
}

function HeroMetric({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-1 truncate font-black text-white ${
          compact
            ? 'text-xs sm:text-lg'
            : 'text-sm sm:text-lg'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 text-xs font-black text-slate-200 transition active:scale-[0.98] disabled:opacity-35 sm:min-h-[86px] sm:text-sm"
    >
      <span className="text-blue-300">
        {icon}
      </span>
      {label}
    </button>
  )
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 className="text-lg font-black text-white sm:text-xl">
          {title}
        </h2>
      </div>

      <div className="mt-4 sm:mt-5">
        {children}
      </div>
    </section>
  )
}

function Info({
  icon,
  label,
  value,
  className = '',
}: {
  icon: ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl bg-slate-800/65 p-3.5 sm:p-4 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}

        <span className="truncate text-[10px] font-black uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-bold leading-5 text-white">
        {value || '—'}
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong
          ? 'text-lg font-black text-white'
          : 'text-slate-300'
      }`}
    >
      <span>{label}</span>

      <span className="text-right font-bold">
        {value}
      </span>
    </div>
  )
}

function EmptyText({
  children,
}: {
  children: ReactNode
}) {
  return (
    <p className="rounded-2xl bg-slate-800/40 p-4 text-sm leading-6 text-slate-500">
      {children}
    </p>
  )
}
