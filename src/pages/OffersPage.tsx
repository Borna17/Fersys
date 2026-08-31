import {
  Check,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Send,
  TrendingUp,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  getOffers,
  updateMultipleOfferStatuses,
  updateOfferStatus as updateOfferStatusInCloud,
} from '../services/offers.service'
import type {
  Offer,
  OfferItem,
  OfferStatus,
} from '../types/offers'

const offerStatuses:
readonly OfferStatus[] = [
  'Nacrt',
  'Poslano',
  'Pregledano',
  'U tijeku',
  'Prihvaćeno',
  'Odbijeno',
  'Isteklo',
  'Otkazano',
]

const statusStyles:
Record<OfferStatus, string> = {
  Nacrt:
    'border-slate-500/20 bg-slate-500/15 text-slate-300',
  Poslano:
    'border-blue-500/20 bg-blue-500/15 text-blue-300',
  Pregledano:
    'border-cyan-500/20 bg-cyan-500/15 text-cyan-300',
  'U tijeku':
    'border-amber-500/20 bg-amber-500/15 text-amber-300',
  Prihvaćeno:
    'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  Odbijeno:
    'border-red-500/20 bg-red-500/15 text-red-300',
  Isteklo:
    'border-orange-500/20 bg-orange-500/15 text-orange-300',
  Otkazano:
    'border-rose-500/20 bg-rose-500/15 text-rose-300',
}

function itemNet(item: OfferItem) {
  const base =
    Number(item.quantity) *
    Number(item.price)

  return (
    base -
    base *
      ((Number(item.discount) || 0) /
        100)
  )
}

function itemVat(item: OfferItem) {
  return (
    itemNet(item) *
    ((Number(item.vat) || 0) /
      100)
  )
}

function offerTotal(offer: Offer) {
  return offer.items.reduce(
    (sum, item) =>
      sum +
      itemNet(item) +
      itemVat(item),
    0,
  )
}

function currency(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function dateText(date: string) {
  if (!date) return '—'

  const parsed =
    new Date(`${date}T12:00:00`)

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(
        'hr-HR',
      )
}

export function OffersPage() {
  const navigate = useNavigate()

  const [offers, setOffers] =
    useState<Offer[]>([])
  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [
    searchQuery,
    setSearchQuery,
  ] = useState('')
  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    OfferStatus | 'Svi'
  >('Svi')
  const [
    selectedOfferIds,
    setSelectedOfferIds,
  ] = useState<string[]>([])
  const [
    bulkStatus,
    setBulkStatus,
  ] = useState<OfferStatus>(
    'Poslano',
  )
  const [
    savingOfferId,
    setSavingOfferId,
  ] = useState<string | null>(
    null,
  )
  const [
    isBulkSaving,
    setIsBulkSaving,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsLoading(true)
        setLoadError('')

        const saved =
          await getOffers()

        if (!cancelled) {
          setOffers(saved)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Ponude nije moguće učitati.',
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
    const query =
      searchQuery
        .trim()
        .toLocaleLowerCase(
          'hr-HR',
        )

    return offers
      .filter((offer) => {
        const text = [
          offer.offerNumber,
          offer.customerName,
          offer.oib,
          offer.email,
          offer.phone,
          offer.address,
          offer.city,
          offer.description,
          offer.responsiblePerson,
          ...offer.items.map(
            (item) => item.name,
          ),
        ]
          .join(' ')
          .toLocaleLowerCase(
            'hr-HR',
          )

        return (
          (selectedStatus ===
            'Svi' ||
            offer.status ===
              selectedStatus) &&
          (!query ||
            text.includes(query))
        )
      })
      .sort(
        (a, b) =>
          new Date(
            b.date,
          ).getTime() -
          new Date(
            a.date,
          ).getTime(),
      )
  }, [
    offers,
    searchQuery,
    selectedStatus,
  ])

  const stats = useMemo(() => {
    const accepted =
      filtered.filter(
        (offer) =>
          offer.status ===
          'Prihvaćeno',
      )
    const rejected =
      filtered.filter(
        (offer) =>
          offer.status ===
          'Odbijeno',
      )

    const totalValue =
      filtered.reduce(
        (sum, offer) =>
          sum + offerTotal(offer),
        0,
      )

    return {
      total: filtered.length,
      sent: filtered.filter(
        (offer) =>
          offer.status ===
          'Poslano',
      ).length,
      inProgress: filtered.filter(
        (offer) =>
          offer.status ===
            'Pregledano' ||
          offer.status ===
            'U tijeku',
      ).length,
      accepted: accepted.length,
      totalValue,
      acceptedValue:
        accepted.reduce(
          (sum, offer) =>
            sum + offerTotal(offer),
          0,
        ),
      successRate:
        accepted.length +
          rejected.length >
        0
          ? (accepted.length /
              (accepted.length +
                rejected.length)) *
            100
          : 0,
    }
  }, [filtered])

  async function changeStatus(
    offer: Offer,
    next: OfferStatus,
  ) {
    if (
      next === offer.status ||
      savingOfferId === offer.id
    ) {
      return
    }

    const previous =
      offer.status

    setOffers((current) =>
      current.map((item) =>
        item.id === offer.id
          ? {
              ...item,
              status: next,
            }
          : item,
      ),
    )

    setSavingOfferId(offer.id)

    try {
      const updated =
        await updateOfferStatusInCloud(
          offer.id,
          next,
        )

      setOffers((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      )
    } catch (error) {
      setOffers((current) =>
        current.map((item) =>
          item.id === offer.id
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
          : 'Status ponude nije moguće promijeniti.',
      )
    } finally {
      setSavingOfferId(null)
    }
  }

  function toggleSelection(
    id: string,
  ) {
    setSelectedOfferIds(
      (current) =>
        current.includes(id)
          ? current.filter(
              (value) =>
                value !== id,
            )
          : [...current, id],
    )
  }

  async function applyBulk() {
    if (
      selectedOfferIds.length ===
      0
    ) {
      return
    }

    try {
      setIsBulkSaving(true)

      const updated =
        await updateMultipleOfferStatuses(
          selectedOfferIds,
          bulkStatus,
        )

      const map =
        new Map(
          updated.map((offer) => [
            offer.id,
            offer,
          ]),
        )

      setOffers((current) =>
        current.map(
          (offer) =>
            map.get(offer.id) ??
            offer,
        ),
      )

      setSelectedOfferIds([])
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Statuse ponuda nije moguće promijeniti.',
      )
    } finally {
      setIsBulkSaving(false)
    }
  }

  async function exportOffers() {
    const list =
      selectedOfferIds.length
        ? filtered.filter(
            (offer) =>
              selectedOfferIds.includes(
                offer.id,
              ),
          )
        : filtered

    if (!list.length) {
      window.alert(
        'Nema ponuda za izvoz.',
      )
      return
    }

    const rows =
      list.map((offer) => ({
        'Broj ponude':
          offer.offerNumber,
        Investitor:
          offer.customerName,
        OIB: offer.oib,
        Datum: dateText(
          offer.date,
        ),
        Status: offer.status,
        'Odgovorna osoba':
          offer.responsiblePerson,
        Ukupno:
          offerTotal(offer),
      }))

    const XLSX = await import('xlsx')

    const workbook =
      XLSX.utils.book_new()
    const sheet =
      XLSX.utils.json_to_sheet(
        rows,
      )

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      'Ponude',
    )

    XLSX.writeFile(
      workbook,
      'FERSYS-Ponude.xlsx',
    )
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje ponuda..." />
    )
  }

  if (loadError) {
    return (
      <ErrorState
        message={loadError}
      />
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1800px] space-y-4 pb-6 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              PONUDE
            </p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Prodajni pregled
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Prati ponude, status i
              vrijednost poslova.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate('/offers/new')
            }
            className="hidden h-12 items-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white sm:flex"
          >
            <Plus size={20} />
            Nova ponuda
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate('/offers/new')
          }
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-black text-white sm:hidden"
        >
          <Plus size={20} />
          Nova ponuda
        </button>

        <div className="mt-5 grid grid-cols-4 gap-2">
          <Metric
            label="Ukupno"
            value={stats.total}
          />
          <Metric
            label="Poslano"
            value={stats.sent}
          />
          <Metric
            label="U tijeku"
            value={stats.inProgress}
          />
          <Metric
            label="Prihvaćeno"
            value={stats.accepted}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary
          icon={<FileText size={18} />}
          label="Vrijednost ponuda"
          value={currency(
            stats.totalValue,
          )}
        />
        <Summary
          icon={<Check size={18} />}
          label="Prihvaćena vrijednost"
          value={currency(
            stats.acceptedValue,
          )}
        />
        <Summary
          icon={
            <TrendingUp size={18} />
          }
          label="Uspješnost"
          value={`${stats.successRate.toFixed(
            0,
          )}%`}
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
        <div className="relative">
          <Search
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder="Broj ponude, investitor, OIB, stavka..."
            className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-violet-600"
          />
        </div>

        <div className="fersys-scrollbar-hidden mt-3 flex gap-2 overflow-x-auto pb-1">
          {[
            'Svi',
            ...offerStatuses,
          ].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setSelectedStatus(
                  value as
                    | OfferStatus
                    | 'Svi',
                )
              }
              className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-black ${
                selectedStatus === value
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="text-xs font-black text-white">
            {selectedOfferIds.length
              ? `${selectedOfferIds.length} odabrano`
              : `${filtered.length} ponuda`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Odaberi ponude za skupnu
            promjenu statusa ili izvoz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedOfferIds.length >
            0 && (
            <>
              <select
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(
                    event.target
                      .value as OfferStatus,
                  )
                }
                className="h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-white outline-none"
              >
                {offerStatuses.map(
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

              <button
                type="button"
                onClick={() =>
                  void applyBulk()
                }
                disabled={isBulkSaving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-black text-white disabled:opacity-50"
              >
                {isBulkSaving ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={15} />
                )}
                Primijeni
              </button>
            </>
          )}

          <button
            type="button"
            onClick={exportOffers}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
          >
            <FileSpreadsheet
              size={15}
            />
            Excel
          </button>
        </div>
      </section>

      <div className="space-y-3 lg:hidden">
        {filtered.map((offer) => {
          const selected =
            selectedOfferIds.includes(
              offer.id,
            )

          return (
            <article
              key={offer.id}
              className={`rounded-3xl border bg-slate-900 p-4 ${
                selected
                  ? 'border-violet-500/50'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleSelection(
                      offer.id,
                    )
                  }
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                    selected
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : 'border-slate-600 bg-slate-800 text-transparent'
                  }`}
                  aria-label="Odaberi ponudu"
                >
                  <Check size={14} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/offers/${offer.id}`,
                    )
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-400">
                    {offer.offerNumber}
                  </p>
                  <h3 className="mt-1 truncate font-black text-white">
                    {offer.customerName}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {offer.description ||
                      'Ponuda'}
                  </p>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <DataBox
                  label="Datum"
                  value={dateText(
                    offer.date,
                  )}
                />
                <DataBox
                  label="Vrijednost"
                  value={currency(
                    offerTotal(offer),
                  )}
                />
              </div>

              <div className="mt-4 border-t border-slate-800 pt-4">
                <div className="relative">
                  <select
                    value={offer.status}
                    disabled={
                      savingOfferId ===
                      offer.id
                    }
                    onChange={(event) =>
                      void changeStatus(
                        offer,
                        event.target
                          .value as OfferStatus,
                      )
                    }
                    className={`h-11 w-full rounded-xl border px-3 pr-10 text-xs font-black outline-none ${statusStyles[offer.status]}`}
                  >
                    {offerStatuses.map(
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

                  {savingOfferId ===
                    offer.id && (
                    <LoaderCircle
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                    />
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">
                  Odabir
                </th>
                <th className="px-5 py-4">
                  Ponuda
                </th>
                <th className="px-5 py-4">
                  Investitor
                </th>
                <th className="px-5 py-4">
                  Datum
                </th>
                <th className="px-5 py-4">
                  Vrijednost
                </th>
                <th className="px-5 py-4">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(
                (offer) => (
                  <tr
                    key={offer.id}
                    className="hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOfferIds.includes(
                          offer.id,
                        )}
                        onChange={() =>
                          toggleSelection(
                            offer.id,
                          )
                        }
                        className="h-4 w-4"
                      />
                    </td>
                    <td
                      className="cursor-pointer px-5 py-4 font-black text-violet-300"
                      onClick={() =>
                        navigate(
                          `/offers/${offer.id}`,
                        )
                      }
                    >
                      {offer.offerNumber}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {offer.customerName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {offer.description}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">
                      {dateText(
                        offer.date,
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-white">
                      {currency(
                        offerTotal(offer),
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={offer.status}
                        onChange={(event) =>
                          void changeStatus(
                            offer,
                            event.target
                              .value as OfferStatus,
                          )
                        }
                        disabled={
                          savingOfferId ===
                          offer.id
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${statusStyles[offer.status]}`}
                      >
                        {offerStatuses.map(
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
          <FileText
            size={30}
            className="mx-auto text-slate-600"
          />
          <p className="mt-3 font-black text-white">
            Nema pronađenih ponuda
          </p>
        </div>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-2 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-violet-300">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-lg font-black text-white">
        {value}
      </p>
    </div>
  )
}

function DataBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-800/55 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

function ErrorState({
  message,
}: {
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
          Ponude nije moguće učitati
        </h1>
        <p className="mt-3 text-sm text-red-300">
          {message}
        </p>
        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          className="mt-6 min-h-12 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          Pokušaj ponovno
        </button>
      </div>
    </section>
  )
}

export default OffersPage
