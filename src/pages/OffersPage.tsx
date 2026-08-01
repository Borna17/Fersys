import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Hourglass,
  Mail,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'

import FersysLoader from '../components/FersysLoader'
import {
  getOffers,
  updateOfferStatus as updateOfferStatusInCloud,
  updateMultipleOfferStatuses,
} from '../services/offers.service'

type OfferStatus =
  | 'Nacrt'
  | 'Poslano'
  | 'Pregledano'
  | 'U tijeku'
  | 'Prihvaćeno'
  | 'Odbijeno'
  | 'Isteklo'
  | 'Otkazano'

type OfferItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
}

type OfferHistoryItem = {
  id: string
  date: string
  title: string
  description: string
}

type Offer = {
  id: string
  offerNumber: string
  customerName: string
  customerType: 'Fizička osoba' | 'Tvrtka' | 'Zgrada'
  oib: string
  email: string
  phone: string
  address: string
  city: string
  date: string
  validUntil: string
  status: OfferStatus
  responsiblePerson: string
  description: string
  internalNote: string
  paymentTerms: string
  items: OfferItem[]
  createdAt: string
  updatedAt: string
  sentAt?: string
  acceptedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  version: number
  history: OfferHistoryItem[]
}

type DatePreset =
  | 'all'
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom'

type ExportMode =
  | 'filtered'
  | 'selected'
  | 'all'
  | 'customer'

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
    border: string
    background: string
  }
> = {
  Nacrt: {
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
    dot: 'bg-slate-400',
    border: 'border-slate-500/20',
    background: 'bg-slate-500/10',
  },
  Poslano: {
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    dot: 'bg-blue-400',
    border: 'border-blue-500/20',
    background: 'bg-blue-500/10',
  },
  Pregledano: {
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    dot: 'bg-cyan-400',
    border: 'border-cyan-500/20',
    background: 'bg-cyan-500/10',
  },
  'U tijeku': {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    dot: 'bg-amber-400',
    border: 'border-amber-500/20',
    background: 'bg-amber-500/10',
  },
  Prihvaćeno: {
    badge:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/20',
    background: 'bg-emerald-500/10',
  },
  Odbijeno: {
    badge: 'bg-red-500/15 text-red-300 border-red-500/20',
    dot: 'bg-red-400',
    border: 'border-red-500/20',
    background: 'bg-red-500/10',
  },
  Isteklo: {
    badge:
      'bg-orange-500/15 text-orange-300 border-orange-500/20',
    dot: 'bg-orange-400',
    border: 'border-orange-500/20',
    background: 'bg-orange-500/10',
  },
  Otkazano: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
    dot: 'bg-rose-400',
    border: 'border-rose-500/20',
    background: 'bg-rose-500/10',
  },
}

function calculateItemNet(item: OfferItem) {
  const baseAmount = item.quantity * item.price
  return baseAmount - baseAmount * (item.discount / 100)
}

function calculateItemVat(item: OfferItem) {
  return calculateItemNet(item) * (item.vat / 100)
}

function calculateOfferNet(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemNet(item),
    0,
  )
}

function calculateOfferVat(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemVat(item),
    0,
  )
}

function calculateOfferTotal(offer: Offer) {
  return calculateOfferNet(offer) + calculateOfferVat(offer)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(date: string) {
  if (!date) {
    return '—'
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString('hr-HR')
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('hr-HR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDateRange(preset: DatePreset) {
  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  if (preset === 'today') {
    const date = getDateString(today)
    return { from: date, to: date }
  }

  if (preset === 'thisWeek') {
    const dayIndex = (today.getDay() + 6) % 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayIndex)

    return {
      from: getDateString(monday),
      to: getDateString(today),
    }
  }

  if (preset === 'thisMonth') {
    return {
      from: getDateString(
        new Date(today.getFullYear(), today.getMonth(), 1),
      ),
      to: getDateString(
        new Date(today.getFullYear(), today.getMonth() + 1, 0),
      ),
    }
  }

  if (preset === 'lastMonth') {
    return {
      from: getDateString(
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
      ),
      to: getDateString(
        new Date(today.getFullYear(), today.getMonth(), 0),
      ),
    }
  }

  if (preset === 'thisYear') {
    return {
      from: `${today.getFullYear()}-01-01`,
      to: `${today.getFullYear()}-12-31`,
    }
  }

  return {
    from: '',
    to: '',
  }
}

function daysUntil(date: string) {
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  const targetDate = new Date(`${date}T00:00:00`)
  const difference = targetDate.getTime() - currentDate.getTime()

  return Math.ceil(difference / (1000 * 60 * 60 * 24))
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<
    OfferStatus | 'Svi'
  >('Svi')

  const [datePreset, setDatePreset] =
    useState<DatePreset>('all')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [minimumAmount, setMinimumAmount] = useState('')
  const [maximumAmount, setMaximumAmount] = useState('')

  const [responsiblePerson, setResponsiblePerson] =
    useState('Svi')

  const [selectedOfferIds, setSelectedOfferIds] = useState<
    string[]
  >([])

  const [selectedOfferId, setSelectedOfferId] = useState<
    string | null
  >(null)

  const [showFilters, setShowFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOffersFromCloud() {
      try {
        setIsLoading(true)
        setLoadError('')
        const savedOffers = await getOffers()
        if (!cancelled) {
          setOffers(savedOffers)
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

    void loadOffersFromCloud()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showExportMenu) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowExportMenu(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showExportMenu])

  const [bulkStatus, setBulkStatus] =
    useState<OfferStatus>('Poslano')

  const [viewMode, setViewMode] = useState<
    'table' | 'cards'
  >('table')

  const responsiblePeople = useMemo(() => {
    return Array.from(
      new Set(
        offers
          .map((offer) => offer.responsiblePerson)
          .filter(Boolean),
      ),
    ).sort()
  }, [offers])

  const filteredOffers = useMemo(() => {
    const normalizedSearch = searchQuery
      .trim()
      .toLocaleLowerCase('hr-HR')

    const minimum = Number(minimumAmount)
    const maximum = Number(maximumAmount)

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
          ...offer.items.map((item) => item.name),
          ...offer.items.map((item) => item.description),
        ]
          .join(' ')
          .toLocaleLowerCase('hr-HR')

        const matchesSearch =
          !normalizedSearch ||
          searchableText.includes(normalizedSearch)

        const matchesStatus =
          selectedStatus === 'Svi' ||
          offer.status === selectedStatus

        const matchesDateFrom =
          !dateFrom || offer.date >= dateFrom

        const matchesDateTo = !dateTo || offer.date <= dateTo

        const offerTotal = calculateOfferTotal(offer)

        const matchesMinimum =
          !minimumAmount ||
          Number.isNaN(minimum) ||
          offerTotal >= minimum

        const matchesMaximum =
          !maximumAmount ||
          Number.isNaN(maximum) ||
          offerTotal <= maximum

        const matchesResponsiblePerson =
          responsiblePerson === 'Svi' ||
          offer.responsiblePerson === responsiblePerson

        return (
          matchesSearch &&
          matchesStatus &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesMinimum &&
          matchesMaximum &&
          matchesResponsiblePerson
        )
      })
      .sort(
        (first, second) =>
          new Date(second.date).getTime() -
          new Date(first.date).getTime(),
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

  const statistics = useMemo(() => {
    const totalValue = filteredOffers.reduce(
      (sum, offer) => sum + calculateOfferTotal(offer),
      0,
    )

    const acceptedOffers = filteredOffers.filter(
      (offer) => offer.status === 'Prihvaćeno',
    )

    const acceptedValue = acceptedOffers.reduce(
      (sum, offer) => sum + calculateOfferTotal(offer),
      0,
    )

    const completedDecisions = filteredOffers.filter(
      (offer) =>
        offer.status === 'Prihvaćeno' ||
        offer.status === 'Odbijeno',
    ).length

    const successRate =
      completedDecisions > 0
        ? (acceptedOffers.length / completedDecisions) * 100
        : 0

    return {
      total: filteredOffers.length,
      sent: filteredOffers.filter(
        (offer) => offer.status === 'Poslano',
      ).length,
      inProgress: filteredOffers.filter(
        (offer) =>
          offer.status === 'U tijeku' ||
          offer.status === 'Pregledano',
      ).length,
      accepted: acceptedOffers.length,
      rejected: filteredOffers.filter(
        (offer) => offer.status === 'Odbijeno',
      ).length,
      drafts: filteredOffers.filter(
        (offer) => offer.status === 'Nacrt',
      ).length,
      expired: filteredOffers.filter(
        (offer) => offer.status === 'Isteklo',
      ).length,
      totalValue,
      acceptedValue,
      successRate,
    }
  }, [filteredOffers])

  const monthlyChartData = useMemo(() => {
    const currentYear = new Date().getFullYear()

    const months = [
      'Sij',
      'Vel',
      'Ožu',
      'Tra',
      'Svi',
      'Lip',
      'Srp',
      'Kol',
      'Ruj',
      'Lis',
      'Stu',
      'Pro',
    ]

    return months.map((label, monthIndex) => {
      const monthOffers = offers.filter((offer) => {
        const date = new Date(`${offer.date}T12:00:00`)

        return (
          date.getFullYear() === currentYear &&
          date.getMonth() === monthIndex
        )
      })

      const total = monthOffers.reduce(
        (sum, offer) => sum + calculateOfferTotal(offer),
        0,
      )

      const accepted = monthOffers
        .filter((offer) => offer.status === 'Prihvaćeno')
        .reduce(
          (sum, offer) => sum + calculateOfferTotal(offer),
          0,
        )

      return {
        label,
        total,
        accepted,
      }
    })
  }, [offers])

  const chartMaximum = Math.max(
    ...monthlyChartData.map((month) => month.total),
    1,
  )

  const selectedOffer = useMemo(() => {
    return (
      offers.find((offer) => offer.id === selectedOfferId) ??
      null
    )
  }, [offers, selectedOfferId])

  const allFilteredSelected =
    filteredOffers.length > 0 &&
    filteredOffers.every((offer) =>
      selectedOfferIds.includes(offer.id),
    )

  function applyDatePreset(preset: DatePreset) {
    setDatePreset(preset)

    if (preset === 'custom') {
      return
    }

    const range = getDateRange(preset)
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
    setResponsiblePerson('Svi')
  }

  function toggleOfferSelection(offerId: string) {
    setSelectedOfferIds((current) =>
      current.includes(offerId)
        ? current.filter((id) => id !== offerId)
        : [...current, offerId],
    )
  }

  function toggleAllFilteredOffers() {
    if (allFilteredSelected) {
      const filteredIds = new Set(
        filteredOffers.map((offer) => offer.id),
      )

      setSelectedOfferIds((current) =>
        current.filter((id) => !filteredIds.has(id)),
      )

      return
    }

    setSelectedOfferIds((current) =>
      Array.from(
        new Set([
          ...current,
          ...filteredOffers.map((offer) => offer.id),
        ]),
      ),
    )
  }

  async function updateOfferStatus(
    offerId: string,
    status: OfferStatus,
  ) {
    try {
      setIsSaving(true)
      const updatedOffer =
        await updateOfferStatusInCloud(offerId, status)

      setOffers((current) =>
        current.map((offer) =>
          offer.id === updatedOffer.id
            ? updatedOffer
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
    if (selectedOfferIds.length === 0) {
      return
    }

    try {
      setIsSaving(true)
      const updatedOffers =
        await updateMultipleOfferStatuses(
          selectedOfferIds,
          bulkStatus,
        )

      const updatedById = new Map(
        updatedOffers.map((offer) => [offer.id, offer]),
      )

      setOffers((current) =>
        current.map(
          (offer) =>
            updatedById.get(offer.id) ?? offer,
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

  function getOffersForExport(mode: ExportMode) {
    if (mode === 'all') {
      return offers
    }

    if (mode === 'selected') {
      return offers.filter((offer) =>
        selectedOfferIds.includes(offer.id),
      )
    }

    if (mode === 'customer') {
      if (!selectedOffer) {
        return []
      }

      return offers.filter(
        (offer) =>
          offer.oib === selectedOffer.oib ||
          offer.customerName === selectedOffer.customerName,
      )
    }

    return filteredOffers
  }

  function exportOffers(mode: ExportMode) {
    const exportOffersList = getOffersForExport(mode)

    if (exportOffersList.length === 0) {
      window.alert('Nema ponuda za izvoz.')
      return
    }

    const offerRows = exportOffersList.map((offer) => ({
      'Broj ponude': offer.offerNumber,
      Verzija: offer.version,
      Kupac: offer.customerName,
      'Vrsta kupca': offer.customerType,
      OIB: offer.oib,
      Email: offer.email,
      Telefon: offer.phone,
      Adresa: offer.address,
      Grad: offer.city,
      'Datum ponude': formatDate(offer.date),
      'Vrijedi do': formatDate(offer.validUntil),
      Status: offer.status,
      'Odgovorna osoba': offer.responsiblePerson,
      Opis: offer.description,
      'Uvjeti plaćanja': offer.paymentTerms,
      'Iznos bez PDV-a': calculateOfferNet(offer),
      PDV: calculateOfferVat(offer),
      'Ukupno s PDV-om': calculateOfferTotal(offer),
      'Datum izrade': formatDateTime(offer.createdAt),
      'Zadnja promjena': formatDateTime(offer.updatedAt),
      'Datum slanja': offer.sentAt
        ? formatDateTime(offer.sentAt)
        : '',
      'Datum prihvaćanja': offer.acceptedAt
        ? formatDateTime(offer.acceptedAt)
        : '',
      'Datum odbijanja': offer.rejectedAt
        ? formatDateTime(offer.rejectedAt)
        : '',
      'Razlog odbijanja': offer.rejectionReason ?? '',
      'Interna napomena': offer.internalNote,
    }))

    const itemRows = exportOffersList.flatMap((offer) =>
      offer.items.map((item, itemIndex) => ({
        'Broj ponude': offer.offerNumber,
        Kupac: offer.customerName,
        OIB: offer.oib,
        'Redni broj stavke': itemIndex + 1,
        Stavka: item.name,
        Opis: item.description,
        Količina: item.quantity,
        'Jedinica mjere': item.unit,
        'Jedinična cijena': item.price,
        'Popust (%)': item.discount,
        'PDV (%)': item.vat,
        'Iznos bez PDV-a': calculateItemNet(item),
        PDV: calculateItemVat(item),
        Ukupno: calculateItemNet(item) + calculateItemVat(item),
      })),
    )

    const statusRows = offerStatuses.map((status) => {
      const statusOffers = exportOffersList.filter(
        (offer) => offer.status === status,
      )

      return {
        Status: status,
        'Broj ponuda': statusOffers.length,
        'Ukupna vrijednost': statusOffers.reduce(
          (sum, offer) => sum + calculateOfferTotal(offer),
          0,
        ),
      }
    })

    const totalValue = exportOffersList.reduce(
      (sum, offer) => sum + calculateOfferTotal(offer),
      0,
    )

    const acceptedOffers = exportOffersList.filter(
      (offer) => offer.status === 'Prihvaćeno',
    )

    const acceptedValue = acceptedOffers.reduce(
      (sum, offer) => sum + calculateOfferTotal(offer),
      0,
    )

    const summaryRows = [
      {
        Pokazatelj: 'Ukupan broj ponuda',
        Vrijednost: exportOffersList.length,
      },
      {
        Pokazatelj: 'Ukupna vrijednost ponuda',
        Vrijednost: totalValue,
      },
      {
        Pokazatelj: 'Broj prihvaćenih ponuda',
        Vrijednost: acceptedOffers.length,
      },
      {
        Pokazatelj: 'Vrijednost prihvaćenih ponuda',
        Vrijednost: acceptedValue,
      },
      {
        Pokazatelj: 'Broj odbijenih ponuda',
        Vrijednost: exportOffersList.filter(
          (offer) => offer.status === 'Odbijeno',
        ).length,
      },
      {
        Pokazatelj: 'Broj ponuda u tijeku',
        Vrijednost: exportOffersList.filter(
          (offer) =>
            offer.status === 'U tijeku' ||
            offer.status === 'Pregledano',
        ).length,
      },
      {
        Pokazatelj: 'Datum izvoza',
        Vrijednost: new Date().toLocaleString('hr-HR'),
      },
    ]

    const workbook = XLSX.utils.book_new()

    const summarySheet =
      XLSX.utils.json_to_sheet(summaryRows)

    const offersSheet = XLSX.utils.json_to_sheet(offerRows)
    const itemsSheet = XLSX.utils.json_to_sheet(itemRows)
    const statusesSheet =
      XLSX.utils.json_to_sheet(statusRows)

    summarySheet['!cols'] = [
      { wch: 34 },
      { wch: 24 },
    ]

    offersSheet['!cols'] = [
      { wch: 17 },
      { wch: 10 },
      { wch: 34 },
      { wch: 18 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 34 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 48 },
      { wch: 34 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ]

    itemsSheet['!cols'] = [
      { wch: 17 },
      { wch: 34 },
      { wch: 15 },
      { wch: 18 },
      { wch: 32 },
      { wch: 48 },
      { wch: 12 },
      { wch: 17 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
    ]

    statusesSheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
    ]

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      'Sažetak',
    )

    XLSX.utils.book_append_sheet(
      workbook,
      offersSheet,
      'Ponude',
    )

    XLSX.utils.book_append_sheet(
      workbook,
      itemsSheet,
      'Stavke',
    )

    XLSX.utils.book_append_sheet(
      workbook,
      statusesSheet,
      'Statusi',
    )

    const fileDate = getDateString(new Date())
    let fileName = `FERSYS-Ponude-${fileDate}.xlsx`

    if (mode === 'selected') {
      fileName = `FERSYS-Odabrane-ponude-${fileDate}.xlsx`
    }

    if (mode === 'customer' && selectedOffer) {
      const safeCustomerName = selectedOffer.customerName
        .replace(/[^a-zA-Z0-9čćžšđČĆŽŠĐ]+/g, '-')
        .replace(/^-|-$/g, '')

      fileName = `FERSYS-${safeCustomerName}-${fileDate}.xlsx`
    }

    XLSX.writeFile(workbook, fileName)
    setShowExportMenu(false)
  }

  if (isLoading) {
    return <FersysLoader text="Učitavanje ponuda..." />
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <XCircle size={42} className="mx-auto text-red-400" />
          <h1 className="mt-5 text-2xl font-black text-white">
            Ponude nije moguće učitati
          </h1>
          <p className="mt-3 break-words text-sm leading-6 text-red-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  function renderStatusBadge(status: OfferStatus) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyles[status].badge}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${statusStyles[status].dot}`}
        />
        {status}
      </span>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1800px] space-y-6 pb-12">
      <header className="relative z-30 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/10 lg:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-300">
                Prodajni centar
              </span>

              <span className="flex items-center gap-2 text-sm text-slate-500">
                <Activity size={15} />
                Podaci se ažuriraju automatski
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              Ponude
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              Upravljaj ponudama, prati uspješnost prodaje,
              analiziraj vrijednost poslova i izvozi izvještaje.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div ref={exportMenuRef} className="relative z-50">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={showExportMenu}
                onClick={() =>
                  setShowExportMenu((current) => !current)
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  showExportMenu
                    ? 'border-violet-500/50 bg-violet-500/10 text-white'
                    : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet size={18} />
                Excel izvoz
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    showExportMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showExportMenu && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+12px)] z-[100] w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/60"
                >
                  <div className="absolute -top-2 right-8 h-4 w-4 rotate-45 border-l border-t border-slate-700 bg-slate-900" />
                  <button
                    type="button"
                    onClick={() => exportOffers('filtered')}
                    role="menuitem"
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                  >
                    <Filter
                      size={18}
                      className="mt-0.5 text-blue-400"
                    />

                    <span>
                      <span className="block text-sm font-bold text-white">
                        Filtrirane ponude
                      </span>

                      <span className="mt-1 block text-xs text-slate-500">
                        Izvozi trenutno prikazane rezultate
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportOffers('selected')}
                    role="menuitem"
                    disabled={selectedOfferIds.length === 0}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check
                      size={18}
                      className="mt-0.5 text-emerald-400"
                    />

                    <span>
                      <span className="block text-sm font-bold text-white">
                        Označene ponude
                      </span>

                      <span className="mt-1 block text-xs text-slate-500">
                        Odabrano: {selectedOfferIds.length}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportOffers('all')}
                    role="menuitem"
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                  >
                    <Download
                      size={18}
                      className="mt-0.5 text-violet-400"
                    />

                    <span>
                      <span className="block text-sm font-bold text-white">
                        Sve ponude
                      </span>

                      <span className="mt-1 block text-xs text-slate-500">
                        Cijela evidencija bez obzira na filtre
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                window.alert(
                  'U sljedećem koraku povezujemo stranicu Nova ponuda.',
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.02]"
            >
              <Plus size={18} />
              Nova ponuda
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setSelectedStatus('Svi')}
          className={`group rounded-2xl border p-5 text-left transition ${
            selectedStatus === 'Svi'
              ? 'border-violet-500/40 bg-violet-500/10'
              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Ukupno ponuda
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.total}
              </p>
            </div>

            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <FileText size={22} />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-slate-500">
            Vrijednost {formatCurrency(statistics.totalValue)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('Poslano')}
          className={`group rounded-2xl border p-5 text-left transition ${
            selectedStatus === 'Poslano'
              ? 'border-blue-500/40 bg-blue-500/10'
              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Poslano
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.sent}
              </p>
            </div>

            <div className="rounded-xl bg-blue-500/15 p-3 text-blue-300">
              <Send size={22} />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-blue-400">
            Čeka odgovor kupca
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('U tijeku')}
          className={`group rounded-2xl border p-5 text-left transition ${
            selectedStatus === 'U tijeku'
              ? 'border-amber-500/40 bg-amber-500/10'
              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                U tijeku
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.inProgress}
              </p>
            </div>

            <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
              <Hourglass size={22} />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-amber-400">
            Pregledano ili u pregovorima
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('Prihvaćeno')}
          className={`group rounded-2xl border p-5 text-left transition ${
            selectedStatus === 'Prihvaćeno'
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Prihvaćeno
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.accepted}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-emerald-400">
            {formatCurrency(statistics.acceptedValue)}
          </p>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Uspješnost ponuda
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.successRate.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
              <TrendingUp size={22} />
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
              style={{
                width: `${Math.min(
                  statistics.successRate,
                  100,
                )}%`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelectedStatus('Odbijeno')}
          className={`rounded-2xl border p-5 text-left transition ${
            selectedStatus === 'Odbijeno'
              ? 'border-red-500/40 bg-red-500/10'
              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Odbijeno
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.rejected}
              </p>
            </div>

            <div className="rounded-xl bg-red-500/15 p-3 text-red-300">
              <XCircle size={22} />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-red-400">
            Evidentiraj razlog odbijanja
          </p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('Isteklo')}
          className={`rounded-2xl border p-5 text-left transition ${
            selectedStatus === 'Isteklo'
              ? 'border-orange-500/40 bg-orange-500/10'
              : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Isteklo
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {statistics.expired}
              </p>
            </div>

            <div className="rounded-xl bg-orange-500/15 p-3 text-orange-300">
              <Clock3 size={22} />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-orange-400">
            Nacrt: {statistics.drafts}
          </p>
        </button>
      </div>

      <section className="grid gap-6 2xl:grid-cols-[1fr_430px]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300">
                  <BarChart3 size={20} />
                </div>

                <div>
                  <h2 className="font-black text-white">
                    Vrijednost ponuda
                  </h2>

                  <p className="text-xs text-slate-500">
                    Mjesečni pregled za{' '}
                    {new Date().getFullYear()}.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs font-semibold">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
                Sve ponude
              </span>

              <span className="flex items-center gap-2 text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Prihvaćeno
              </span>
            </div>
          </div>

          <div className="mt-6 flex h-72 items-end gap-2 sm:gap-3">
            {monthlyChartData.map((month) => {
              const totalHeight =
                (month.total / chartMaximum) * 100

              const acceptedHeight =
                (month.accepted / chartMaximum) * 100

              return (
                <div
                  key={month.label}
                  className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                >
                  <div className="relative flex flex-1 items-end justify-center gap-1">
                    <div
                      className="w-full max-w-5 rounded-t-md bg-violet-500/80 transition group-hover:bg-violet-400"
                      style={{
                        height: `${Math.max(
                          totalHeight,
                          month.total > 0 ? 4 : 0,
                        )}%`,
                      }}
                      title={`Sve: ${formatCurrency(
                        month.total,
                      )}`}
                    />

                    <div
                      className="w-full max-w-5 rounded-t-md bg-emerald-500/80 transition group-hover:bg-emerald-400"
                      style={{
                        height: `${Math.max(
                          acceptedHeight,
                          month.accepted > 0 ? 4 : 0,
                        )}%`,
                      }}
                      title={`Prihvaćeno: ${formatCurrency(
                        month.accepted,
                      )}`}
                    />
                  </div>

                  <p className="mt-3 text-center text-[10px] font-bold text-slate-500 sm:text-xs">
                    {month.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 lg:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300">
              <CircleDollarSign size={20} />
            </div>

            <div>
              <h2 className="font-black text-white">
                Financijski sažetak
              </h2>

              <p className="text-xs text-slate-500">
                Prema trenutačnim filtrima
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ukupna vrijednost
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {formatCurrency(statistics.totalValue)}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Prihvaćena vrijednost
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-200">
                {formatCurrency(statistics.acceptedValue)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">
                  Prosječna ponuda
                </p>

                <p className="mt-2 font-black text-white">
                  {formatCurrency(
                    statistics.total > 0
                      ? statistics.totalValue /
                          statistics.total
                      : 0,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">
                  Konverzija
                </p>

                <p className="mt-2 font-black text-white">
                  {statistics.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1 xl:max-w-2xl">
              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Pretraži broj ponude, kupca, OIB, adresu, e-mail ili stavku..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowFilters((current) => !current)
                }
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  showFilters
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal size={18} />
                Napredni filtri
              </button>

              <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    viewMode === 'table'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Tablica
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    viewMode === 'cards'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Kartice
                </button>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw size={17} />
                Poništi
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Sve' },
              { id: 'today', label: 'Danas' },
              { id: 'thisWeek', label: 'Ovaj tjedan' },
              { id: 'thisMonth', label: 'Ovaj mjesec' },
              { id: 'lastMonth', label: 'Prošli mjesec' },
              { id: 'thisYear', label: 'Ova godina' },
              { id: 'custom', label: 'Prilagođeno' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  applyDatePreset(preset.id as DatePreset)
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  datePreset === preset.id
                    ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                    : 'border-slate-700 bg-slate-950 text-slate-500 hover:text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </label>

                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(
                      event.target.value as
                        | OfferStatus
                        | 'Svi',
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="Svi">Svi statusi</option>

                  {offerStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Datum od
                </label>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value)
                    setDatePreset('custom')
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Datum do
                </label>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value)
                    setDatePreset('custom')
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Iznos od
                </label>

                <input
                  type="number"
                  min="0"
                  value={minimumAmount}
                  onChange={(event) =>
                    setMinimumAmount(event.target.value)
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Iznos do
                </label>

                <input
                  type="number"
                  min="0"
                  value={maximumAmount}
                  onChange={(event) =>
                    setMaximumAmount(event.target.value)
                  }
                  placeholder="Bez ograničenja"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Odgovorna osoba
                </label>

                <select
                  value={responsiblePerson}
                  onChange={(event) =>
                    setResponsiblePerson(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="Svi">Sve osobe</option>

                  {responsiblePeople.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {selectedOfferIds.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-blue-500/20 bg-blue-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-black text-white">
                {selectedOfferIds.length}
              </div>

              <p className="text-sm font-bold text-blue-200">
                Odabrane ponude
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(
                    event.target.value as OfferStatus,
                  )
                }
                className="rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                {offerStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={applyBulkStatus}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                Promijeni status
              </button>

              <button
                type="button"
                onClick={() => exportOffers('selected')}
                className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 transition hover:bg-blue-500/20"
              >
                Izvezi označene
              </button>

              <button
                type="button"
                onClick={() => setSelectedOfferIds([])}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 text-blue-300 transition hover:bg-blue-500/20"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-left">
                  <th className="w-14 px-5 py-4 lg:px-6">
                    <button
                      type="button"
                      onClick={toggleAllFilteredOffers}
                      className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                        allFilteredSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-600 bg-slate-900 text-transparent'
                      }`}
                    >
                      <Check size={14} />
                    </button>
                  </th>

                  {[
                    'Broj ponude',
                    'Kupac',
                    'Datum',
                    'Vrijedi do',
                    'Vrijednost',
                    'Status',
                    'Odgovorna osoba',
                    'Zadnja promjena',
                    '',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredOffers.map((offer) => {
                  const total = calculateOfferTotal(offer)
                  const remainingDays = daysUntil(
                    offer.validUntil,
                  )

                  const isSelected =
                    selectedOfferIds.includes(offer.id)

                  return (
                    <tr
                      key={offer.id}
                      className={`border-b border-slate-800/80 transition hover:bg-slate-800/30 ${
                        isSelected ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <td className="px-5 py-4 lg:px-6">
                        <button
                          type="button"
                          onClick={() =>
                            toggleOfferSelection(offer.id)
                          }
                          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-slate-600 bg-slate-950 text-transparent'
                          }`}
                        >
                          <Check size={14} />
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOfferId(offer.id)
                          }
                          className="text-left"
                        >
                          <p className="font-black text-white hover:text-blue-300">
                            {offer.offerNumber}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Verzija {offer.version}
                          </p>
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-60 truncate font-bold text-slate-200">
                          {offer.customerName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          OIB: {offer.oib || '—'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                        {formatDate(offer.date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="text-sm text-slate-300">
                          {formatDate(offer.validUntil)}
                        </p>

                        {![
                          'Prihvaćeno',
                          'Odbijeno',
                          'Isteklo',
                          'Otkazano',
                        ].includes(offer.status) && (
                          <p
                            className={`mt-1 text-xs font-bold ${
                              remainingDays < 0
                                ? 'text-red-400'
                                : remainingDays <= 7
                                  ? 'text-orange-400'
                                  : 'text-slate-500'
                            }`}
                          >
                            {remainingDays < 0
                              ? `Isteklo prije ${Math.abs(
                                  remainingDays,
                                )} dana`
                              : remainingDays === 0
                                ? 'Istječe danas'
                                : `Još ${remainingDays} dana`}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="font-black text-white">
                          {formatCurrency(total)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Bez PDV-a{' '}
                          {formatCurrency(
                            calculateOfferNet(offer),
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={offer.status}
                          onChange={(event) =>
                            updateOfferStatus(
                              offer.id,
                              event.target
                                .value as OfferStatus,
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold outline-none ${statusStyles[offer.status].badge}`}
                        >
                          {offerStatuses.map((status) => (
                            <option
                              key={status}
                              value={status}
                              className="bg-slate-900 text-white"
                            >
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-slate-300">
                            {offer.responsiblePerson
                              .split(' ')
                              .map((word) => word[0])
                              .slice(0, 2)
                              .join('')}
                          </div>

                          <span className="text-sm text-slate-300">
                            {offer.responsiblePerson}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="text-sm text-slate-300">
                          {formatDateTime(offer.updatedAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOfferId(offer.id)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
                            title="Pregled ponude"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                            title="Više mogućnosti"
                          >
                            <MoreHorizontal size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredOffers.length === 0 && (
              <div className="px-6 py-20 text-center">
                <Search
                  size={42}
                  className="mx-auto text-slate-700"
                />

                <h3 className="mt-4 font-black text-white">
                  Nema pronađenih ponuda
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Promijeni kriterije pretrage ili poništi filtre.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 lg:p-6">
            {filteredOffers.map((offer) => {
              const total = calculateOfferTotal(offer)
              const isSelected =
                selectedOfferIds.includes(offer.id)

              return (
                <article
                  key={offer.id}
                  className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10 ${
                    isSelected
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        toggleOfferSelection(offer.id)
                      }
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-600 text-transparent'
                      }`}
                    >
                      <Check size={14} />
                    </button>

                    {renderStatusBadge(offer.status)}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedOfferId(offer.id)
                    }
                    className="mt-5 block w-full text-left"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      {offer.offerNumber} • V{offer.version}
                    </p>

                    <h3 className="mt-2 truncate text-lg font-black text-white">
                      {offer.customerName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      OIB: {offer.oib || '—'}
                    </p>

                    <p className="mt-5 text-2xl font-black text-white">
                      {formatCurrency(total)}
                    </p>
                  </button>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-xs">
                    <div>
                      <p className="text-slate-600">
                        Datum ponude
                      </p>

                      <p className="mt-1 font-bold text-slate-300">
                        {formatDate(offer.date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-600">
                        Vrijedi do
                      </p>

                      <p className="mt-1 font-bold text-slate-300">
                        {formatDate(offer.validUntil)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedOfferId(offer.id)
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-sm font-bold text-slate-300 transition group-hover:border-blue-500/30 group-hover:text-blue-300"
                  >
                    Otvori ponudu
                    <ChevronRight size={16} />
                  </button>
                </article>
              )
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p className="text-slate-500">
            Prikazano{' '}
            <span className="font-bold text-slate-300">
              {filteredOffers.length}
            </span>{' '}
            od{' '}
            <span className="font-bold text-slate-300">
              {offers.length}
            </span>{' '}
            ponuda
          </p>

          <p className="font-bold text-slate-300">
            Ukupno filtrirano:{' '}
            <span className="text-white">
              {formatCurrency(statistics.totalValue)}
            </span>
          </p>
        </div>
      </section>

      {selectedOffer && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Zatvori pregled"
            onClick={() => setSelectedOfferId(null)}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 px-5 py-5 backdrop-blur-xl lg:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-black text-blue-400">
                      {selectedOffer.offerNumber}
                    </p>

                    {renderStatusBadge(selectedOffer.status)}
                  </div>

                  <h2 className="mt-3 text-2xl font-black text-white">
                    {selectedOffer.customerName}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Verzija {selectedOffer.version} • Izradio{' '}
                    {selectedOffer.responsiblePerson}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOfferId(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5 lg:p-7">
              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Ukupna vrijednost
                  </p>

                  <p className="mt-2 text-lg font-black text-white">
                    {formatCurrency(
                      calculateOfferTotal(selectedOffer),
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    Bez PDV-a
                  </p>

                  <p className="mt-2 text-lg font-black text-white">
                    {formatCurrency(
                      calculateOfferNet(selectedOffer),
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-500">
                    PDV
                  </p>

                  <p className="mt-2 text-lg font-black text-white">
                    {formatCurrency(
                      calculateOfferVat(selectedOffer),
                    )}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-center gap-3">
                  <UserRound
                    size={19}
                    className="text-violet-400"
                  />

                  <h3 className="font-black text-white">
                    Podaci kupca
                  </h3>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-600">
                      Naziv kupca
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {selectedOffer.customerName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Vrsta kupca
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {selectedOffer.customerType}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      OIB
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {selectedOffer.oib || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Telefon
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {selectedOffer.phone || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      E-mail
                    </p>

                    <p className="mt-1 break-all font-bold text-slate-200">
                      {selectedOffer.email || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Adresa
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {selectedOffer.address},{' '}
                      {selectedOffer.city}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-center gap-3">
                  <CalendarDays
                    size={19}
                    className="text-blue-400"
                  />

                  <h3 className="font-black text-white">
                    Podaci ponude
                  </h3>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-600">
                      Datum ponude
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {formatDate(selectedOffer.date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Vrijedi do
                    </p>

                    <p className="mt-1 font-bold text-slate-200">
                      {formatDate(selectedOffer.validUntil)}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Opis
                    </p>

                    <p className="mt-1 leading-6 text-slate-300">
                      {selectedOffer.description || '—'}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-600">
                      Uvjeti plaćanja
                    </p>

                    <p className="mt-1 leading-6 text-slate-300">
                      {selectedOffer.paymentTerms || '—'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-950/40">
                <div className="border-b border-slate-800 px-5 py-4">
                  <h3 className="font-black text-white">
                    Stavke ponude
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedOffer.items.length} stavki
                  </p>
                </div>

                <div className="divide-y divide-slate-800">
                  {selectedOffer.items.map(
                    (item, itemIndex) => (
                      <div
                        key={item.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-blue-400">
                              Stavka {itemIndex + 1}
                            </p>

                            <h4 className="mt-1 font-black text-white">
                              {item.name}
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {item.description}
                            </p>
                          </div>

                          <p className="whitespace-nowrap font-black text-white">
                            {formatCurrency(
                              calculateItemNet(item) +
                                calculateItemVat(item),
                            )}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
                          <span className="rounded-lg bg-slate-800 px-2.5 py-1.5">
                            {item.quantity} {item.unit}
                          </span>

                          <span className="rounded-lg bg-slate-800 px-2.5 py-1.5">
                            {formatCurrency(item.price)} /{' '}
                            {item.unit}
                          </span>

                          {item.discount > 0 && (
                            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-300">
                              Popust {item.discount}%
                            </span>
                          )}

                          <span className="rounded-lg bg-slate-800 px-2.5 py-1.5">
                            PDV {item.vat}%
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              {selectedOffer.internalNote && (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Interna napomena
                  </p>

                  <p className="mt-2 leading-6 text-amber-100">
                    {selectedOffer.internalNote}
                  </p>
                </section>
              )}

              <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <h3 className="font-black text-white">
                  Povijest ponude
                </h3>

                <div className="mt-5 space-y-5">
                  {[...selectedOffer.history]
                    .reverse()
                    .map((historyItem, index) => (
                      <div
                        key={historyItem.id}
                        className="relative flex gap-4"
                      >
                        {index <
                          selectedOffer.history.length -
                            1 && (
                          <div className="absolute left-[7px] top-5 h-[calc(100%+10px)] w-px bg-slate-800" />
                        )}

                        <div className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-slate-900 bg-blue-500" />

                        <div>
                          <p className="font-bold text-slate-200">
                            {historyItem.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {formatDateTime(historyItem.date)}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {historyItem.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 border-t border-slate-800 bg-slate-900/95 p-5 backdrop-blur-xl lg:px-7">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => exportOffers('customer')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <FileSpreadsheet size={17} />
                  Excel za ovog kupca
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-black text-white"
                >
                  <Mail size={17} />
                  Pošalji ponudu
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje promjena..."
        />
      )}
    </section>
  )
}