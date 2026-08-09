import {
  useEffect,
  useState,
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
  MapPin,
  Pencil,
  UserRound,
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

function formatDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const parsedDate =
    new Date(
      `${value}T00:00:00`,
    )

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

function durationText(
  minutes: number,
) {
  const hours =
    Math.floor(
      minutes / 60,
    )

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
  status: CloudWorkOrder['status'],
) {
  if (
    status === 'Završen'
  ) {
    return 'bg-emerald-500/15 text-emerald-400'
  }

  if (
    status === 'U tijeku'
  ) {
    return 'bg-violet-500/15 text-violet-400'
  }

  if (
    status === 'Zakazan'
  ) {
    return 'bg-amber-500/15 text-amber-400'
  }

  if (
    status === 'Otkazan'
  ) {
    return 'bg-red-500/15 text-red-400'
  }

  return 'bg-blue-500/15 text-blue-400'
}

function getPriorityClassName(
  priority:
    CloudWorkOrder['priority'],
) {
  if (
    priority === 'Hitno'
  ) {
    return 'bg-red-500/15 text-red-400'
  }

  if (
    priority === 'Visok'
  ) {
    return 'bg-orange-500/15 text-orange-400'
  }

  if (
    priority === 'Nizak'
  ) {
    return 'bg-slate-700 text-slate-300'
  }

  return 'bg-blue-500/15 text-blue-400'
}

export function WorkOrderDetailsPage() {
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
  ] = useState(true)

  const [
    loadError,
    setLoadError,
  ] = useState('')

  const [
    isDownloading,
    setIsDownloading,
  ] = useState(false)


  const [
    canEditThisOrder,
    setCanEditThisOrder,
  ] = useState(false)

  const [
    editAccessReason,
    setEditAccessReason,
  ] = useState('')

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
          await getWorkOrderById(
            id,
          )

        if (!cancelled) {
          setOrder(
            savedOrder,
          )

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
                setCanEditThisOrder(
                  false,
                )

                setEditAccessReason(
                  'Pravo uređivanja trenutno nije moguće provjeriti.',
                )
              }
            }
          } else if (
            !cancelled
          ) {
            setCanEditThisOrder(
              false,
            )
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
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <CircleAlert
            size={42}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-2xl font-bold text-white">
            Radni nalog nije
            moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
        <h1 className="text-2xl font-bold text-white">
          Radni nalog nije
          pronađen
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          Nalog ne postoji ili
          više nije dostupan.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/work-orders',
            )
          }
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
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

  return (
    <section className="mx-auto w-full max-w-[1450px]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                '/work-orders',
              )
            }
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft
              size={18}
            />

            Povratak na radne
            naloge
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">
              {
                order.orderNumber
              }
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                order.status,
              )}`}
            >
              {order.status}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClassName(
                order.priority,
              )}`}
            >
              {
                order.priority
              }
            </span>
          </div>

          <p className="mt-2 text-slate-400">
            {order.title}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canManageWorkOrders && canEditThisOrder && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/work-orders/${order.id}/edit`,
                )
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 font-semibold text-white transition hover:bg-slate-700"
            >
              <Pencil
                size={19}
              />

              Uredi nalog
            </button>
          )}

          <button
            type="button"
            disabled={
              isDownloading
            }
            onClick={
              handleDownloadPdf
            }
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download
              size={19}
            />

            {isDownloading
              ? 'Izrada PDF-a...'
              : 'Preuzmi PDF'}
          </button>
        </div>
      </div>

      {canManageWorkOrders &&
        !canEditThisOrder &&
        editAccessReason && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {editAccessReason}
          </div>
        )}

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Podaci o nalogu
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info
                icon={
                  <UserRound
                    size={18}
                  />
                }
                label="Kupac"
                value={
                  order.customerName
                }
              />

              <Info
                icon={
                  <MapPin
                    size={18}
                  />
                }
                label="Adresa"
                value={
                  order.address
                }
              />

              <Info
                icon={
                  <CalendarDays
                    size={18}
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
                    size={18}
                  />
                }
                label="Dolazak / odlazak"
                value={`${
                  order.arrivalTime ||
                  '—'
                } – ${
                  order.departureTime ||
                  '—'
                }`}
              />

              <Info
                icon={
                  <Clock3
                    size={18}
                  />
                }
                label="Trajanje"
                value={durationText(
                  order.durationMinutes,
                )}
              />

              <Info
                icon={
                  <UserRound
                    size={18}
                  />
                }
                label="Radnici"
                value={
                  order
                    .assignedWorkers
                    .length >
                  0
                    ? order.assignedWorkers.join(
                        ', ',
                      )
                    : 'Nije uneseno'
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Kontaktni podaci
              kupca
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info
                icon={
                  <UserRound
                    size={18}
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
                    size={18}
                  />
                }
                label="OIB"
                value={
                  order.customerOib
                }
              />

              <Info
                icon={
                  <UserRound
                    size={18}
                  />
                }
                label="Telefon"
                value={
                  order.customerPhone
                }
              />

              <Info
                icon={
                  <UserRound
                    size={18}
                  />
                }
                label="E-mail"
                value={
                  order.customerEmail
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Opis radova
            </h2>

            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">
              {order.description ||
                'Nema dodatnog opisa.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Materijal
            </h2>

            {order.materials
              .length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Nema
                evidentiranog
                materijala.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {order.materials.map(
                  (
                    material,
                  ) => (
                    <div
                      key={
                        material.id
                      }
                      className="flex flex-col gap-3 rounded-xl bg-slate-800/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {
                            material.name
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {
                            material.quantity
                          }{' '}
                          {
                            material.unit
                          }
                          {canViewPrices
                            ? ` × ${money(
                                material.unitPrice,
                              )}`
                            : ''}
                        </p>
                      </div>

                      {canViewPrices && (
                        <p className="font-bold text-white">
                          {money(
                            material.quantity *
                              material.unitPrice,
                          )}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <FileImage className="text-violet-400" />

              <h2 className="text-xl font-bold text-white">
                Fotografije (
                {
                  order.images
                    .length
                }
                )
              </h2>
            </div>

            {order.images
              .length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">
                Fotografije
                nisu dodane.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {order.images.map(
                  (image) => (
                    <a
                      key={
                        image.id
                      }
                      href={
                        image.dataUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:border-blue-500"
                    >
                      <img
                        src={
                          image.dataUrl
                        }
                        alt={
                          image.name
                        }
                        className="aspect-square w-full object-cover"
                      />

                      <p className="truncate px-3 py-2 text-xs text-slate-400">
                        {
                          image.name
                        }
                      </p>
                    </a>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Euro className="text-emerald-400" />

              <h2 className="text-xl font-bold text-white">
                Financije
              </h2>
            </div>

            <div className="mt-5 space-y-4 text-sm">
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
                    ? money(
                        vatValue,
                      )
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
              <div className="mt-5 rounded-xl bg-slate-800/70 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Napomena uz
                  cijenu
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {
                    order.priceNote
                  }
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Potpis
              investitora
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {order.investorName ||
                'Ime nije uneseno'}
            </p>

            {order.investorSignature ? (
              <div className="mt-4 overflow-hidden rounded-xl bg-white">
                <img
                  src={
                    order.investorSignature
                  }
                  alt="Potpis investitora"
                  className="h-40 w-full object-contain"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Potpis nije
                unesen.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-white">
              Evidencija
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <Row
                label="Izrađeno"
                value={new Intl.DateTimeFormat(
                  'hr-HR',
                  {
                    dateStyle:
                      'medium',

                    timeStyle:
                      'short',
                  },
                ).format(
                  new Date(
                    order.createdAt,
                  ),
                )}
              />

              <Row
                label="Zadnja izmjena"
                value={new Intl.DateTimeFormat(
                  'hr-HR',
                  {
                    dateStyle:
                      'medium',

                    timeStyle:
                      'short',
                  },
                ).format(
                  new Date(
                    order.updatedAt,
                  ),
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {isDownloading && (
        <FersysLoader
          fullScreen
          text="Izrada PDF dokumenta..."
        />
      )}
    </section>
  )
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-800/70 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-xs font-semibold uppercase">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words font-medium text-white">
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
      className={`flex justify-between gap-4 ${
        strong
          ? 'text-lg font-bold text-white'
          : 'text-slate-300'
      }`}
    >
      <span>{label}</span>

      <span className="text-right">
        {value}
      </span>
    </div>
  )
}