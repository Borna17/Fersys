import {
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
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
  DatePreset,
  ExportMode,
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
  {
    badge: string
    dot: string
  }
> = {
  Nacrt: {
    badge:
      'bg-slate-500/15 text-slate-300 border-slate-500/20',
    dot: 'bg-slate-400',
  },
  Poslano: {
    badge:
      'bg-blue-500/15 text-blue-300 border-blue-500/20',
    dot: 'bg-blue-400',
  },
  Pregledano: {
    badge:
      'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    dot: 'bg-cyan-400',
  },
  'U tijeku': {
    badge:
      'bg-amber-500/15 text-amber-300 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  Prihvaćeno: {
    badge:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  Odbijeno: {
    badge:
      'bg-red-500/15 text-red-300 border-red-500/20',
    dot: 'bg-red-400',
  },
  Isteklo: {
    badge:
      'bg-orange-500/15 text-orange-300 border-orange-500/20',
    dot: 'bg-orange-400',
  },
  Otkazano: {
    badge:
      'bg-rose-500/15 text-rose-300 border-rose-500/20',
    dot: 'bg-rose-400',
  },
}

function calculateItemNet(
  item: OfferItem,
) {
  const baseAmount =
    item.quantity * item.price

  return (
    baseAmount -
    baseAmount *
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

function calculateOfferTotal(
  offer: Offer,
) {
  return offer.items.reduce(
    (total, item) =>
      total +
      calculateItemNet(item) +
      calculateItemVat(item),
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
  ).toLocaleDateString('hr-HR')
}

function getDateString(
  date: Date,
) {
  const year =
    date.getFullYear()
  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0')
  const day =
    String(
      date.getDate(),
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDateRange(
  preset: DatePreset,
) {
  const now =
    new Date()

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )

  if (preset === 'today') {
    const date =
      getDateString(today)

    return {
      from: date,
      to: date,
    }
  }

  if (preset === 'thisWeek') {
    const dayIndex =
      (today.getDay() + 6) % 7

    const monday =
      new Date(today)

    monday.setDate(
      today.getDate() -
        dayIndex,
    )

    return {
      from:
        getDateString(
          monday,
        ),
      to:
        getDateString(
          today,
        ),
    }
  }

  if (preset === 'thisMonth') {
    return {
      from:
        getDateString(
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          ),
        ),
      to:
        getDateString(
          new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
          ),
        ),
    }
  }

  if (preset === 'lastMonth') {
    return {
      from:
        getDateString(
          new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          ),
        ),
      to:
        getDateString(
          new Date(
            today.getFullYear(),
            today.getMonth(),
            0,
          ),
        ),
    }
  }

  if (preset === 'thisYear') {
    return {
      from:
        `${today.getFullYear()}-01-01`,
      to:
        `${today.getFullYear()}-12-31`,
    }
  }

  return {
    from: '',
    to: '',
  }
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
    isSaving,
    setIsSaving,
  ] =
    useState(false)

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
    datePreset,
    setDatePreset,
  ] =
    useState<DatePreset>(
      'all',
    )

  const [
    dateFrom,
    setDateFrom,
  ] =
    useState('')

  const [
    dateTo,
    setDateTo,
  ] =
    useState('')

  const [
    minimumAmount,
    setMinimumAmount,
  ] =
    useState('')

  const [
    maximumAmount,
    setMaximumAmount,
  ] =
    useState('')

  const [
    responsiblePerson,
    setResponsiblePerson,
  ] =
    useState('Svi')

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
    showFilters,
    setShowFilters,
  ] =
    useState(false)

  const [
    showExportMenu,
    setShowExportMenu,
  ] =
    useState(false)

  const exportMenuRef =
    useRef<HTMLDivElement | null>(
      null,
    )

  useEffect(() => {
    let cancelled = false

    async function loadOffers() {
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

    void loadOffers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showExportMenu) {
      return
    }

    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setShowExportMenu(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      )
    }
  }, [showExportMenu])

  useEffect(() => {
    document.body.style.overflow =
      showFilters
        ? 'hidden'
        : ''

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [showFilters])

  const responsiblePeople =
    useMemo(
      () =>
        Array.from(
          new Set(
            offers
              .map(
                (offer) =>
                  offer.responsiblePerson,
              )
              .filter(Boolean),
          ),
        ).sort(),
      [offers],
    )

  const filteredOffers =
    useMemo(() => {
      const normalized =
        searchQuery
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      const minimum =
        Number(minimumAmount)

      const maximum =
        Number(maximumAmount)

      return offers
        .filter((offer) => {
          const searchableText = [
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

          const total =
            calculateOfferTotal(
              offer,
            )

          return (
            (!normalized ||
              searchableText.includes(
                normalized,
              )) &&
            (selectedStatus ===
              'Svi' ||
              offer.status ===
                selectedStatus) &&
            (!dateFrom ||
              offer.date >=
                dateFrom) &&
            (!dateTo ||
              offer.date <=
                dateTo) &&
            (!minimumAmount ||
              Number.isNaN(
                minimum,
              ) ||
              total >=
                minimum) &&
            (!maximumAmount ||
              Number.isNaN(
                maximum,
              ) ||
              total <=
                maximum) &&
            (responsiblePerson ===
              'Svi' ||
              offer.responsiblePerson ===
                responsiblePerson)
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
      dateFrom,
      dateTo,
      minimumAmount,
      maximumAmount,
      responsiblePerson,
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
          (
            sum,
            offer,
          ) =>
            sum +
            calculateOfferTotal(
              offer,
            ),
          0,
        )

      const acceptedValue =
        accepted.reduce(
          (
            sum,
            offer,
          ) =>
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

  function applyDatePreset(
    preset: DatePreset,
  ) {
    setDatePreset(preset)

    if (
      preset === 'custom'
    ) {
      return
    }

    const range =
      getDateRange(preset)

    setDateFrom(range.from)
    setDateTo(range.to)
  }

  function resetFilters() {
    setSearchQuery('')
    setSelectedStatus('Svi')
    setDatePreset('all')
    setDateFrom('')
    setDateTo('')
    setMinimumAmount('')
    setMaximumAmount('')
    setResponsiblePerson(
      'Svi',
    )
  }

  async function updateOfferStatus(
    offerId: string,
    status: OfferStatus,
  ) {
    try {
      setIsSaving(true)

      const updated =
        await updateOfferStatusInCloud(
          offerId,
          status,
        )

      setOffers(
        (current) =>
          current.map(
            (offer) =>
              offer.id ===
              updated.id
                ? updated
                : offer,
          ),
      )
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

  async function applyBulkStatus() {
    if (
      selectedOfferIds.length ===
      0
    ) {
      return
    }

    try {
      setIsSaving(true)

      const updated =
        await updateMultipleOfferStatuses(
          selectedOfferIds,
          bulkStatus,
        )

      const byId =
        new Map(
          updated.map(
            (offer) => [
              offer.id,
              offer,
            ],
          ),
        )

      setOffers(
        (current) =>
          current.map(
            (offer) =>
              byId.get(
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
      setIsSaving(false)
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

  function getOffersForExport(
    mode: ExportMode,
  ) {
    if (mode === 'all') {
      return offers
    }

    if (
      mode === 'selected'
    ) {
      return offers.filter(
        (offer) =>
          selectedOfferIds.includes(
            offer.id,
          ),
      )
    }

    return filteredOffers
  }

  function exportOffers(
    mode: ExportMode,
  ) {
    const list =
      getOffersForExport(mode)

    if (list.length === 0) {
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
        'Vrijedi do':
          formatDate(
            offer.validUntil,
          ),
        Status:
          offer.status,
        'Odgovorna osoba':
          offer.responsiblePerson,
        'Ukupno s PDV-om':
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
      `FERSYS-Ponude-${getDateString(
        new Date(),
      )}.xlsx`,
    )

    setShowExportMenu(false)
  }

  function renderStatusBadge(
    status: OfferStatus,
  ) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[status].badge}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${statusStyles[status].dot}`}
        />
        {status}
      </span>
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
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <CircleAlert
            size={38}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-xl font-black text-white sm:text-2xl">
            Ponude nije moguće učitati
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-300">
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

  return (
    <>
      <section className="mx-auto w-full max-w-[1800px] space-y-4 pb-10 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                PONUDE
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Prodajni pregled
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Prati ponude, statuse i vrijednost poslova.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/offers/new',
                )
              }
              className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:gap-2"
              aria-label="Nova ponuda"
            >
              <Plus size={21} />
              <span className="hidden text-sm font-black sm:inline">
                Nova ponuda
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/offers/new')}
            className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
          >
            <Plus size={20} />
            Nova ponuda
          </button>

          <div className="relative mt-5 grid grid-cols-4 gap-2">
            <MetricButton
              label="Ukupno"
              value={statistics.total}
              active={
                selectedStatus ===
                'Svi'
              }
              onClick={() =>
                setSelectedStatus(
                  'Svi',
                )
              }
            />
            <MetricButton
              label="Poslano"
              value={statistics.sent}
              active={
                selectedStatus ===
                'Poslano'
              }
              onClick={() =>
                setSelectedStatus(
                  'Poslano',
                )
              }
            />
            <MetricButton
              label="U tijeku"
              value={
                statistics.inProgress
              }
              active={
                selectedStatus ===
                  'U tijeku' ||
                selectedStatus ===
                  'Pregledano'
              }
              onClick={() =>
                setSelectedStatus(
                  'U tijeku',
                )
              }
            />
            <MetricButton
              label="Prihvaćeno"
              value={
                statistics.accepted
              }
              active={
                selectedStatus ===
                'Prihvaćeno'
              }
              onClick={() =>
                setSelectedStatus(
                  'Prihvaćeno',
                )
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
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder="Broj ponude, investitor, OIB, stavka..."
              className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
            {[
              'Svi',
              ...offerStatuses,
            ].map(
              (value) => (
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
              ),
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  true,
                )
              }
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-slate-200 sm:flex-none"
            >
              <SlidersHorizontal
                size={17}
              />
              Filteri
            </button>

            <div
              ref={exportMenuRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() =>
                  setShowExportMenu(
                    (current) =>
                      !current,
                  )
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-slate-200"
              >
                <FileSpreadsheet
                  size={17}
                />
                <span className="hidden sm:inline">
                  Excel
                </span>
                <ChevronDown
                  size={15}
                />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                  <ExportButton
                    label="Filtrirane"
                    onClick={() =>
                      exportOffers(
                        'filtered',
                      )
                    }
                  />
                  <ExportButton
                    label={`Odabrane (${selectedOfferIds.length})`}
                    disabled={
                      selectedOfferIds.length ===
                      0
                    }
                    onClick={() =>
                      exportOffers(
                        'selected',
                      )
                    }
                  />
                  <ExportButton
                    label="Sve ponude"
                    onClick={() =>
                      exportOffers(
                        'all',
                      )
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {selectedOfferIds.length >
          0 && (
          <section className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm font-black text-violet-200">
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
                  disabled={isSaving}
                  onClick={() =>
                    void applyBulkStatus()
                  }
                  className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-50"
                >
                  Primijeni
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
                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
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

                      {renderStatusBadge(
                        offer.status,
                      )}
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
                      <select
                        value={offer.status}
                        disabled={isSaving}
                        onChange={(event) =>
                          void updateOfferStatus(
                            offer.id,
                            event.target
                              .value as OfferStatus,
                          )
                        }
                        className="h-11 min-w-0 flex-1 rounded-xl bg-slate-800 px-3 text-xs font-black text-white disabled:opacity-50"
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

                        <td className="px-5 py-4">
                          <p className="font-black text-violet-400">
                            {
                              offer.offerNumber
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-white">
                            {
                              offer.customerName
                            }
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {offer.oib}
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
                          {renderStatusBadge(
                            offer.status,
                          )}
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

              <p className="mt-2 text-sm text-slate-500">
                Promijeni pretragu ili filtere.
              </p>
            </div>
          )}
        </section>
      </section>

      {showFilters && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 p-4 pb-6 sm:max-w-xl sm:rounded-3xl sm:border sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  FILTERI
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Filtriraj ponude
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    false,
                  )
                }
                className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-400"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <FilterField label="Razdoblje">
                <select
                  value={datePreset}
                  onChange={(event) =>
                    applyDatePreset(
                      event.target
                        .value as DatePreset,
                    )
                  }
                  className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white"
                >
                  <option value="all">
                    Svi datumi
                  </option>
                  <option value="today">
                    Danas
                  </option>
                  <option value="thisWeek">
                    Ovaj tjedan
                  </option>
                  <option value="thisMonth">
                    Ovaj mjesec
                  </option>
                  <option value="lastMonth">
                    Prošli mjesec
                  </option>
                  <option value="thisYear">
                    Ova godina
                  </option>
                  <option value="custom">
                    Ručno
                  </option>
                </select>
              </FilterField>

              <div className="grid grid-cols-2 gap-3">
                <FilterField label="Od">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(
                        event.target.value,
                      )
                      setDatePreset(
                        'custom',
                      )
                    }}
                    className="h-12 w-full rounded-2xl bg-slate-800 px-3 text-white [color-scheme:dark]"
                  />
                </FilterField>

                <FilterField label="Do">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(
                        event.target.value,
                      )
                      setDatePreset(
                        'custom',
                      )
                    }}
                    className="h-12 w-full rounded-2xl bg-slate-800 px-3 text-white [color-scheme:dark]"
                  />
                </FilterField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FilterField label="Min. iznos">
                  <input
                    type="number"
                    min="0"
                    value={minimumAmount}
                    onChange={(event) =>
                      setMinimumAmount(
                        event.target.value,
                      )
                    }
                    className="h-12 w-full rounded-2xl bg-slate-800 px-3 text-white"
                  />
                </FilterField>

                <FilterField label="Max. iznos">
                  <input
                    type="number"
                    min="0"
                    value={maximumAmount}
                    onChange={(event) =>
                      setMaximumAmount(
                        event.target.value,
                      )
                    }
                    className="h-12 w-full rounded-2xl bg-slate-800 px-3 text-white"
                  />
                </FilterField>
              </div>

              <FilterField label="Odgovorna osoba">
                <select
                  value={
                    responsiblePerson
                  }
                  onChange={(event) =>
                    setResponsiblePerson(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white"
                >
                  <option value="Svi">
                    Sve osobe
                  </option>
                  {responsiblePeople.map(
                    (person) => (
                      <option
                        key={person}
                        value={person}
                      >
                        {person}
                      </option>
                    ),
                  )}
                </select>
              </FilterField>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 font-black text-white"
              >
                <RotateCcw
                  size={17}
                />
                Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    false,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 font-black text-white"
              >
                <Filter
                  size={17}
                />
                Primijeni
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje promjena..."
        />
      )}
    </>
  )
}

function MetricButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-2 py-3 text-center transition active:scale-[0.98] ${
        active
          ? 'border-violet-500/40 bg-violet-500/10'
          : 'border-white/5 bg-white/[0.035]'
      }`}
    >
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white sm:text-2xl">
        {value}
      </p>
    </button>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate text-lg font-black text-white sm:text-xl">
            {value}
          </p>
        </div>

        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
          {icon}
        </span>
      </div>
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

function ExportButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-black text-white hover:bg-slate-800 disabled:opacity-40"
    >
      <Download
        size={16}
        className="text-violet-400"
      />
      {label}
    </button>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label>
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>
      <div className="mt-2">
        {children}
      </div>
    </label>
  )
}
