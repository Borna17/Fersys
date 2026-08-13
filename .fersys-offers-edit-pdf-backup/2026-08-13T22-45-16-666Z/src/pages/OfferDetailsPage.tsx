import {
  ArrowLeft,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  UserRound,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  getOfferById,
  updateOfferStatus,
} from '../services/offers.service'
import type {
  Offer,
  OfferItem,
  OfferStatus,
} from '../types/offers'

const offerStatuses: OfferStatus[] = [
  'Nacrt',
  'Poslano',
  'Pregledano',
  'U tijeku',
  'Prihvaćeno',
  'Odbijeno',
  'Isteklo',
  'Otkazano',
]

const statusStyles: Record<
  OfferStatus,
  string
> = {
  Nacrt:
    'bg-slate-500/15 text-slate-300 border-slate-500/20',
  Poslano:
    'bg-blue-500/15 text-blue-300 border-blue-500/20',
  Pregledano:
    'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  'U tijeku':
    'bg-amber-500/15 text-amber-300 border-amber-500/20',
  Prihvaćeno:
    'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  Odbijeno:
    'bg-red-500/15 text-red-300 border-red-500/20',
  Isteklo:
    'bg-orange-500/15 text-orange-300 border-orange-500/20',
  Otkazano:
    'bg-rose-500/15 text-rose-300 border-rose-500/20',
}

function calculateItemNet(
  item: OfferItem,
) {
  const base =
    item.quantity * item.price

  return (
    base -
    base *
      (item.discount / 100)
  )
}

function calculateItemVat(
  item: OfferItem,
) {
  return (
    calculateItemNet(item) *
    (item.vat / 100)
  )
}

function calculateOfferNet(
  offer: Offer,
) {
  return offer.items.reduce(
    (sum, item) =>
      sum +
      calculateItemNet(item),
    0,
  )
}

function calculateOfferVat(
  offer: Offer,
) {
  return offer.items.reduce(
    (sum, item) =>
      sum +
      calculateItemVat(item),
    0,
  )
}

function calculateOfferTotal(
  offer: Offer,
) {
  return (
    calculateOfferNet(offer) +
    calculateOfferVat(offer)
  )
}

function formatCurrency(
  value: number,
) {
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
  if (!value) return '—'

  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString(
    'hr-HR',
  )
}

function formatDateTime(
  value?: string,
) {
  if (!value) return '—'

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(date)
}

export function OfferDetailsPage() {
  const navigate =
    useNavigate()

  const {
    offerId,
  } =
    useParams()

  const [
    offer,
    setOffer,
  ] =
    useState<Offer | null>(
      null,
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false)

  const [
    loadError,
    setLoadError,
  ] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadOffer() {
      if (!offerId) {
        setLoadError(
          'Ponuda nije pronađena.',
        )
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setLoadError('')

        const saved =
          await getOfferById(
            offerId,
          )

        if (!cancelled) {
          setOffer(saved)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Ponudu nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadOffer()

    return () => {
      cancelled = true
    }
  }, [offerId])

  const totals =
    useMemo(() => {
      if (!offer) {
        return {
          net: 0,
          vat: 0,
          total: 0,
        }
      }

      return {
        net:
          calculateOfferNet(
            offer,
          ),
        vat:
          calculateOfferVat(
            offer,
          ),
        total:
          calculateOfferTotal(
            offer,
          ),
      }
    }, [offer])

  async function handleStatusChange(
    status: OfferStatus,
  ) {
    if (!offer) return

    try {
      setIsSaving(true)

      const updated =
        await updateOfferStatus(
          offer.id,
          status,
        )

      setOffer(updated)
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Status ponude nije moguće promijeniti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje ponude..."
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
            Ponudu nije moguće učitati
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/offers')
            }
            className="mt-6 min-h-12 rounded-2xl bg-violet-600 px-5 font-black text-white"
          >
            Povratak na ponude
          </button>
        </div>
      </section>
    )
  }

  if (!offer) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center sm:p-8">
          <FileText
            size={38}
            className="mx-auto text-slate-500"
          />

          <h1 className="mt-5 text-xl font-black text-white sm:text-2xl">
            Ponuda nije pronađena
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate('/offers')
            }
            className="mt-6 min-h-12 rounded-2xl bg-violet-600 px-5 font-black text-white"
          >
            Povratak
          </button>
        </div>
      </section>
    )
  }

  const fullAddress =
    [
      offer.address,
      offer.postalCode,
      offer.city,
    ]
      .filter(Boolean)
      .join(', ')

  return (
    <>
      <section className="mx-auto w-full max-w-[1450px] space-y-4 pb-24 sm:space-y-6 sm:pb-10">
        <button
          type="button"
          onClick={() =>
            navigate('/offers')
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Ponude
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                  PONUDA
                </p>

                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {offer.offerNumber}
                </h1>

                <p className="mt-2 truncate text-sm font-semibold text-slate-300">
                  {offer.customerName}
                </p>
              </div>

              <div className="sm:hidden" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusStyles[offer.status]}`}
              >
                {offer.status}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-400">
                Verzija {offer.version}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <HeroMetric
                label="Datum"
                value={formatDate(
                  offer.date,
                )}
              />

              <HeroMetric
                label="Vrijedi do"
                value={formatDate(
                  offer.validUntil,
                )}
              />

              <HeroMetric
                label="Ukupno"
                value={formatCurrency(
                  totals.total,
                )}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/offers/${offer.id}/edit`,
                )
              }
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white active:scale-[0.99] sm:hidden"
            >
              <Pencil size={18} />
              Uredi ponudu
            </button>
            <div className="mt-4 hidden gap-3 sm:flex">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/offers/${offer.id}/edit`,
                  )
                }
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 font-black text-white"
              >
                <Pencil size={18} />
                Uredi ponudu
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <ActionButton
            icon={<Phone size={19} />}
            label="Poziv"
            disabled={!offer.phone}
            onClick={() => {
              if (offer.phone) {
                window.location.href =
                  `tel:${offer.phone}`
              }
            }}
          />

          <ActionButton
            icon={<Mail size={19} />}
            label="E-mail"
            disabled={!offer.email}
            onClick={() => {
              if (offer.email) {
                window.location.href =
                  `mailto:${offer.email}`
              }
            }}
          />

          <ActionButton
            icon={<MapPin size={19} />}
            label="Adresa"
            disabled={!fullAddress}
            onClick={() => {
              if (fullAddress) {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    fullAddress,
                  )}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            }}
          />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                STATUS
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Promijeni status ponude
              </h2>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {offerStatuses.map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    void handleStatusChange(
                      status,
                    )
                  }
                  className={`min-h-11 shrink-0 rounded-xl border px-4 text-xs font-black transition disabled:opacity-50 ${
                    offer.status ===
                    status
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_0.75fr]">
          <div className="space-y-4">
            <Card title="Investitor">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Info
                  icon={<UserRound size={17} />}
                  label="Naziv"
                  value={offer.customerName}
                />

                <Info
                  icon={<FileText size={17} />}
                  label="OIB"
                  value={offer.oib || 'Nije uneseno'}
                />

                <Info
                  icon={<Phone size={17} />}
                  label="Telefon"
                  value={offer.phone || 'Nije uneseno'}
                />

                <Info
                  icon={<Mail size={17} />}
                  label="E-mail"
                  value={offer.email || 'Nije uneseno'}
                />

                <Info
                  icon={<MapPin size={17} />}
                  label="Adresa"
                  value={fullAddress || 'Nije uneseno'}
                  className="sm:col-span-2"
                />

                <Info
                  icon={<UserRound size={17} />}
                  label="Odgovorna osoba"
                  value={offer.responsiblePerson || 'Nije uneseno'}
                  className="sm:col-span-2"
                />
              </div>
            </Card>

            <Card title={`Stavke (${offer.items.length})`}>
              <div className="space-y-3">
                {offer.items.map(
                  (item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-xs font-black text-violet-300">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-white">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <SmallInfo
                          label="Količina"
                          value={`${item.quantity} ${item.unit}`}
                        />
                        <SmallInfo
                          label="Cijena"
                          value={formatCurrency(
                            item.price,
                          )}
                        />
                        <SmallInfo
                          label="Ukupno"
                          value={formatCurrency(
                            calculateItemNet(
                              item,
                            ) +
                              calculateItemVat(
                                item,
                              ),
                          )}
                        />
                      </div>

                      {item.imageDataUrl && (
                        <a
                          href={item.imageDataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 block overflow-hidden rounded-2xl border border-slate-700"
                        >
                          <img
                            src={item.imageDataUrl}
                            alt={item.imageName || item.name}
                            className="max-h-64 w-full object-cover"
                          />
                        </a>
                      )}
                    </div>
                  ),
                )}
              </div>
            </Card>

            <Card title="Opis i napomene">
              <TextBlock
                label="Opis ponude"
                value={offer.description}
              />

              <div className="mt-3">
                <TextBlock
                  label="Napomena investitoru"
                  value={offer.customerNote || ''}
                />
              </div>

              <div className="mt-3">
                <TextBlock
                  label="Interna napomena"
                  value={offer.internalNote}
                />
              </div>
            </Card>

            <Card title={`Povijest (${offer.history.length})`}>
              {offer.history.length === 0 ? (
                <p className="rounded-2xl bg-slate-800/40 p-4 text-sm text-slate-500">
                  Nema evidentiranih promjena.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...offer.history]
                    .reverse()
                    .map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-2xl bg-slate-800/45 p-4"
                        >
                          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                            <Clock3 size={16} />
                          </span>

                          <div>
                            <p className="font-black text-white">
                              {item.title}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {item.description}
                            </p>

                            <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-600">
                              {formatDateTime(
                                item.date,
                              )}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Vrijednost ponude">
              <div className="space-y-4">
                <FinanceRow
                  label="Bez PDV-a"
                  value={formatCurrency(
                    totals.net,
                  )}
                />

                <FinanceRow
                  label="PDV"
                  value={formatCurrency(
                    totals.vat,
                  )}
                />

                <div className="border-t border-slate-700 pt-4">
                  <FinanceRow
                    label="UKUPNO"
                    value={formatCurrency(
                      totals.total,
                    )}
                    strong
                  />
                </div>
              </div>
            </Card>

            <Card title="Uvjeti">
              <TextBlock
                label="Uvjeti plaćanja"
                value={offer.paymentTerms}
              />
            </Card>

            <Card title="Povezani dokumenti">
              <LinkedRow
                icon={<ClipboardList size={18} />}
                label="Radni nalog"
                value={
                  offer.workOrderId
                    ? 'Povezan'
                    : 'Nije povezan'
                }
                disabled={!offer.workOrderId}
                onClick={() => {
                  if (
                    offer.workOrderId
                  ) {
                    navigate(
                      `/work-orders/${offer.workOrderId}`,
                    )
                  }
                }}
              />

              <div className="mt-2">
                <LinkedRow
                  icon={<ReceiptText size={18} />}
                  label="Račun"
                  value={
                    offer.invoiceId
                      ? 'Povezan'
                      : 'Nije povezan'
                  }
                  disabled={!offer.invoiceId}
                  onClick={() => {
                    if (
                      offer.invoiceId
                    ) {
                      navigate(
                        `/invoices/${offer.invoiceId}/edit`,
                      )
                    }
                  }}
                />
              </div>
            </Card>

            <Card title="Evidencija">
              <div className="space-y-3">
                <FinanceRow
                  label="Izrađeno"
                  value={formatDateTime(
                    offer.createdAt,
                  )}
                />

                <FinanceRow
                  label="Izmijenjeno"
                  value={formatDateTime(
                    offer.updatedAt,
                  )}
                />

                <FinanceRow
                  label="Poslano"
                  value={formatDateTime(
                    offer.sentAt,
                  )}
                />

                <FinanceRow
                  label="Pregledano"
                  value={formatDateTime(
                    offer.viewedAt,
                  )}
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={() =>
            navigate(
              `/offers/${offer.id}/edit`,
            )
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          <Pencil size={18} />
          Uredi ponudu
        </button>
      </div>

      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje statusa..."
        />
      )}
    </>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-white sm:text-sm">
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
      className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 text-xs font-black text-slate-200 active:scale-[0.98] disabled:opacity-35"
    >
      <span className="text-violet-300">
        {icon}
      </span>
      {label}
    </button>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <h2 className="text-lg font-black text-white sm:text-xl">
        {title}
      </h2>

      <div className="mt-4">
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
    <div className={`rounded-2xl bg-slate-800/60 p-4 ${className}`}>
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}

        <span className="text-[10px] font-black uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  )
}

function SmallInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-950/50 p-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-black text-white">
        {value}
      </p>
    </div>
  )
}

function FinanceRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? 'font-black text-white'
            : 'text-sm text-slate-400'
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? 'text-lg font-black text-white'
            : 'text-right text-sm font-black text-white'
        }
      >
        {value}
      </span>
    </div>
  )
}

function TextBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-800/55 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {value || 'Nije uneseno'}
      </p>
    </div>
  )
}

function LinkedRow({
  icon,
  label,
  value,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  value: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-slate-800/55 px-4 text-left disabled:opacity-40"
    >
      <span className="text-violet-300">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black text-white">
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] text-slate-500">
          {value}
        </span>
      </span>
    </button>
  )
}
