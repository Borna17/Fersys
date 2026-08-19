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
import * as XLSX from 'xlsx'

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
Record<
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
    item.quantity *
    item.price

  return (
    base -
    base *
      (item.discount /
        100)
  )
}

function calculateItemVat(
  item: OfferItem,
) {
  return (
    calculateItemNet(
      item,
    ) *
    (item.vat / 100)
  )
}

function calculateOfferTotal(
  offer: Offer,
) {
  return offer.items.reduce(
    (total, item) =>
      total +
      calculateItemNet(
        item,
      ) +
      calculateItemVat(
        item,
      ),
    0,
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
  date: string,
) {
  if (!date) return '—'

  return new Date(
    `${date}T12:00:00`,
  ).toLocaleDateString(
    'hr-HR',
  )
}

export function OffersPage() {
  const navigate =
    useNavigate()

  const [
    offers,
    setOffers,
  ] =
    useState<Offer[]>([])

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
    searchQuery,
    setSearchQuery,
  ] =
    useState('')

  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState<
      OfferStatus | 'Svi'
    >('Svi')

  const [
    selectedOfferIds,
    setSelectedOfferIds,
  ] =
    useState<string[]>([])

  const [
    bulkStatus,
    setBulkStatus,
  ] =
    useState<OfferStatus>(
      'Poslano',
    )

  const [
    savingOfferId,
    setSavingOfferId,
  ] =
    useState<string | null>(
      null,
    )

  const [
    isBulkSaving,
    setIsBulkSaving,
  ] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
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
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredOffers =
    useMemo(() => {
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
              (item) =>
                item.name,
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'hr-HR',
            )

          return (
            (
              selectedStatus ===
                'Svi' ||
              offer.status ===
                selectedStatus
            ) &&
            (
              !query ||
              text.includes(
                query,
              )
            )
          )
        })
        .sort(
          (
            first,
            second,
          ) =>
            new Date(
              second.date,
            ).getTime() -
            new Date(
              first.date,
            ).getTime(),
        )
    }, [
      offers,
      searchQuery,
      selectedStatus,
    ])

  const statistics =
    useMemo(() => {
      const accepted =
        filteredOffers.filter(
          (offer) =>
            offer.status ===
            'Prihvaćeno',
        )

      const rejected =
        filteredOffers.filter(
          (offer) =>
            offer.status ===
            'Odbijeno',
        )

      const totalValue =
        filteredOffers.reduce(
          (sum, offer) =>
            sum +
            calculateOfferTotal(
              offer,
            ),
          0,
        )

      const acceptedValue =
        accepted.reduce(
          (sum, offer) =>
            sum +
            calculateOfferTotal(
              offer,
            ),
          0,
        )

      const decisionCount =
        accepted.length +
        rejected.length

      return {
        total:
          filteredOffers.length,
        sent:
          filteredOffers.filter(
            (offer) =>
              offer.status ===
              'Poslano',
          ).length,
        inProgress:
          filteredOffers.filter(
            (offer) =>
              offer.status ===
                'Pregledano' ||
              offer.status ===
                'U tijeku',
          ).length,
        accepted:
          accepted.length,
        totalValue,
        acceptedValue,
        successRate:
          decisionCount > 0
            ? (accepted.length /
                decisionCount) *
              100
            : 0,
      }
    }, [filteredOffers])

  async function updateOfferStatus(
    offer: Offer,
    status: OfferStatus,
  ) {
    if (
      offer.status ===
        status ||
      savingOfferId ===
        offer.id
    ) {
      return
    }

    const previousStatus =
      offer.status

    setOffers((current) =>
      current.map((item) =>
        item.id === offer.id
          ? {
              ...item,
              status,
            }
          : item,
      ),
    )

    setSavingOfferId(
      offer.id,
    )

    try {
      const updated =
        await updateOfferStatusInCloud(
          offer.id,
          status,
        )

      setOffers((current) =>
        current.map((item) =>
          item.id ===
          updated.id
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
                status:
                  previousStatus,
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
      setSavingOfferId(
        null,
      )
    }
  }

  async function applyBulkStatus() {
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
          updated.map(
            (offer) => [
              offer.id,
              offer,
            ],
          ),
        )

      setOffers((current) =>
        current.map(
          (offer) =>
            map.get(
              offer.id,
            ) ?? offer,
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

  function toggleSelection(
    offerId: string,
  ) {
    setSelectedOfferIds(
      (current) =>
        current.includes(
          offerId,
        )
          ? current.filter(
              (id) =>
                id !==
                offerId,
            )
          : [
              ...current,
              offerId,
            ],
    )
  }

  function exportOffers() {
    const list =
      selectedOfferIds.length
        ? filteredOffers.filter(
            (offer) =>
              selectedOfferIds.includes(
                offer.id,
              ),
          )
        : filteredOffers

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
        OIB:
          offer.oib,
        Datum:
          formatDate(
            offer.date,
          ),
        Status:
          offer.status,
        'Odgovorna osoba':
          offer.responsiblePerson,
        Ukupno:
          calculateOfferTotal(
            offer,
          ),
      }))

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
      <FersysLoader
        text="Učitavanje ponuda..."
      />
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
            Ponude nije moguće učitati
          </h1>

          <p className="mt-3 text-sm text-red-300">
            {loadError}
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

  return (
    <section className="mx-auto w-full max-w-[1800px] space-y-4 pb-10 sm:space-y-6">
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
              Prati ponude, status i vrijednost poslova.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/offers/new',
              )
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
            navigate(
              '/offers/new',
            )
          }
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-black text-white sm:hidden"
        >
          <Plus size={20} />
          Nova ponuda
        </button>

        <div className="mt-5 grid grid-cols-4 gap-2">
          <Metric
            label="Ukupno"
            value={
              statistics.total
            }
          />
          <Metric
            label="Poslano"
            value={
              statistics.sent
            }
          />
          <Metric
            label="U tijeku"
            value={
              statistics.inProgress
            }
          />
          <Metric
            label="Prihvaćeno"
            value={
              statistics.accepted
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Vrijednost ponuda"
          value={formatCurrency(
            statistics.totalValue,
          )}
          icon={
            <FileText
              size={18}
            />
          }
        />

        <SummaryCard
          label="Prihvaćena vrijednost"
          value={formatCurrency(
            statistics.acceptedValue,
          )}
          icon={
            <TrendingUp
              size={18}
            />
          }
        />

        <SummaryCard
          label="Uspješnost"
          value={`${statistics.successRate.toFixed(
            0,
          )}%`}
          icon={
            <Check
              size={18}
            />
          }
        />

        <SummaryCard
          label="Odabrano"
          value={String(
            selectedOfferIds.length,
          )}
          icon={
            <Send
              size={18}
            />
          }
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
            value={
              searchQuery
            }
            onChange={(event) =>
              setSearchQuery(
                event.target.value,
              )
            }
            placeholder="Broj ponude, investitor, OIB, stavka..."
            className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
                selectedStatus ===
                value
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={
              exportOffers
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-black text-white"
          >
            <FileSpreadsheet
              size={17}
            />
            Excel
          </button>
        </div>
      </section>

      {selectedOfferIds.length >
        0 && (
        <section className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="font-black text-violet-200">
              Odabrano{' '}
              {
                selectedOfferIds.length
              }{' '}
              ponuda
            </p>

            <div className="flex flex-1 gap-2 sm:justify-end">
              <select
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(
                    event.target
                      .value as OfferStatus,
                  )
                }
                className="h-11 min-w-0 flex-1 rounded-xl bg-slate-900 px-3 text-sm text-white sm:max-w-48"
              >
                {offerStatuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                disabled={
                  isBulkSaving
                }
                onClick={() =>
                  void applyBulkStatus()
                }
                className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-50"
              >
                {isBulkSaving
                  ? 'Spremanje...'
                  : 'Primijeni'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            POPIS
          </p>

          <h2 className="mt-1 text-lg font-black text-white">
            {
              filteredOffers.length
            }{' '}
            prikazano
          </h2>
        </div>

        <div className="space-y-3 lg:hidden">
          {filteredOffers.map(
            (offer) => {
              const selected =
                selectedOfferIds.includes(
                  offer.id,
                )

              return (
                <article
                  key={offer.id}
                  className={`rounded-3xl border p-4 ${
                    selected
                      ? 'border-violet-500/40 bg-violet-500/10'
                      : 'border-slate-800 bg-slate-900'
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
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                        selected
                          ? 'border-violet-500 bg-violet-600 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-500'
                      }`}
                    >
                      {selected && (
                        <Check
                          size={16}
                        />
                      )}
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
                        {
                          offer.offerNumber
                        }
                      </p>

                      <h3 className="mt-1 truncate font-black text-white">
                        {
                          offer.customerName
                        }
                      </h3>

                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {offer.description ||
                          'Bez opisa'}
                      </p>
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <SmallInfo
                      label="Datum"
                      value={formatDate(
                        offer.date,
                      )}
                    />
                    <SmallInfo
                      label="Vrijedi do"
                      value={formatDate(
                        offer.validUntil,
                      )}
                    />
                    <SmallInfo
                      label="Ukupno"
                      value={formatCurrency(
                        calculateOfferTotal(
                          offer,
                        ),
                      )}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-4">
                    <div className="relative min-w-0 flex-1">
                      <select
                        value={
                          offer.status
                        }
                        disabled={
                          savingOfferId ===
                          offer.id
                        }
                        onChange={(event) =>
                          void updateOfferStatus(
                            offer,
                            event.target
                              .value as OfferStatus,
                          )
                        }
                        className={`h-11 w-full rounded-xl border px-3 pr-9 text-xs font-black outline-none ${statusStyles[offer.status]}`}
                      >
                        {offerStatuses.map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                              className="bg-slate-900 text-white"
                            >
                              {status}
                            </option>
                          ),
                        )}
                      </select>

                      {savingOfferId ===
                      offer.id ? (
                        <LoaderCircle
                          size={15}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                        />
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/offers/${offer.id}`,
                        )
                      }
                      className="min-h-11 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                    >
                      Otvori
                    </button>
                  </div>
                </article>
              )
            },
          )}
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
                  <th className="px-5 py-4">
                    Akcija
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredOffers.map(
                  (offer) => (
                    <tr
                      key={offer.id}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleSelection(
                              offer.id,
                            )
                          }
                          className={`grid h-9 w-9 place-items-center rounded-xl border ${
                            selectedOfferIds.includes(
                              offer.id,
                            )
                              ? 'border-violet-500 bg-violet-600 text-white'
                              : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          {selectedOfferIds.includes(
                            offer.id,
                          ) && (
                            <Check
                              size={16}
                            />
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-4 font-black text-violet-400">
                        {
                          offer.offerNumber
                        }
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-white">
                          {
                            offer.customerName
                          }
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {
                            offer.oib
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatDate(
                          offer.date,
                        )}
                      </td>

                      <td className="px-5 py-4 font-black text-white">
                        {formatCurrency(
                          calculateOfferTotal(
                            offer,
                          ),
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="relative inline-block">
                          <select
                            value={
                              offer.status
                            }
                            disabled={
                              savingOfferId ===
                              offer.id
                            }
                            onChange={(event) =>
                              void updateOfferStatus(
                                offer,
                                event.target
                                  .value as OfferStatus,
                              )
                            }
                            className={`min-w-[135px] cursor-pointer rounded-xl border px-3 py-2 pr-9 text-xs font-black outline-none ${statusStyles[offer.status]}`}
                          >
                            {offerStatuses.map(
                              (
                                status,
                              ) => (
                                <option
                                  key={
                                    status
                                  }
                                  value={
                                    status
                                  }
                                  className="bg-slate-900 text-white"
                                >
                                  {
                                    status
                                  }
                                </option>
                              ),
                            )}
                          </select>

                          {savingOfferId ===
                          offer.id ? (
                            <LoaderCircle
                              size={15}
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                            />
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/offers/${offer.id}`,
                            )
                          }
                          className="min-h-10 rounded-xl bg-slate-800 px-4 text-xs font-black text-white"
                        >
                          Otvori
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredOffers.length ===
          0 && (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
            <FileText
              size={34}
              className="mx-auto text-slate-600"
            />
            <p className="mt-4 font-black text-white">
              Nema pronađenih ponuda
            </p>
          </div>
        )}
      </section>
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
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] px-2 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-violet-300">
        {icon}
      </div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate font-black text-white">
        {value}
      </p>
    </article>
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
    <div className="rounded-xl bg-slate-950/50 p-2.5">
      <p className="text-[9px] font-black uppercase text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-slate-300">
        {value}
      </p>
    </div>
  )
}
