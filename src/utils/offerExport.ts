import * as XLSX from 'xlsx'

import type {
  ExportMode,
  MonthlyOfferStatistics,
  Offer,
  OfferStatistics,
} from '../types/offers'

import {
  calculateItemBase,
  calculateItemDiscount,
  calculateItemNet,
  calculateItemTotal,
  calculateItemVat,
  calculateOfferBase,
  calculateOfferDiscount,
  calculateOfferNet,
  calculateOfferTotal,
  calculateOfferVat,
  calculateOfferStatistics,
  formatCurrency,
} from './offerCalculations'

import {
  formatDate,
  formatDateTime,
  getCustomersFromOffers,
  getMonthlyOfferStatistics,
} from './offerHelpers'

type ExportOffersOptions = {
  offers: Offer[]
  mode?: ExportMode
  customerName?: string
  dateFrom?: string
  dateTo?: string
  fileName?: string
  companyName?: string
}

type WorksheetColumnWidth = {
  wch: number
}

const DEFAULT_COMPANY_NAME = 'FERSYS'

function sanitiseFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

function getCurrentDateForFileName() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function setWorksheetColumnWidths(
  worksheet: XLSX.WorkSheet,
  widths: number[],
) {
  worksheet['!cols'] = widths.map(
    (width): WorksheetColumnWidth => ({
      wch: width,
    }),
  )
}

function setWorksheetAutoFilter(
  worksheet: XLSX.WorkSheet,
) {
  const range = worksheet['!ref']

  if (!range) {
    return
  }

  worksheet['!autofilter'] = {
    ref: range,
  }
}

function createWorksheetFromRows(
  rows: Record<string, string | number>[],
  widths: number[],
) {
  const worksheet = XLSX.utils.json_to_sheet(rows)

  setWorksheetColumnWidths(worksheet, widths)
  setWorksheetAutoFilter(worksheet)

  return worksheet
}

function getExportTitle(mode: ExportMode) {
  if (mode === 'selected') {
    return 'Odabrane ponude'
  }

  if (mode === 'all') {
    return 'Sve ponude'
  }

  if (mode === 'customer') {
    return 'Ponude investitora'
  }

  return 'Filtrirane ponude'
}

function getDateRangeLabel(
  dateFrom?: string,
  dateTo?: string,
) {
  if (dateFrom && dateTo) {
    return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
  }

  if (dateFrom) {
    return `Od ${formatDate(dateFrom)}`
  }

  if (dateTo) {
    return `Do ${formatDate(dateTo)}`
  }

  return 'Svi datumi'
}

function getSummaryRows(
  offers: Offer[],
  statistics: OfferStatistics,
  options: ExportOffersOptions,
) {
  const mode = options.mode ?? 'filtered'

  return [
    {
      Podatak: 'Naziv izvještaja',
      Vrijednost: getExportTitle(mode),
    },
    {
      Podatak: 'Tvrtka',
      Vrijednost:
        options.companyName ??
        DEFAULT_COMPANY_NAME,
    },
    {
      Podatak: 'Datum izvoza',
      Vrijednost: formatDateTime(
        new Date().toISOString(),
      ),
    },
    {
      Podatak: 'Razdoblje',
      Vrijednost: getDateRangeLabel(
        options.dateFrom,
        options.dateTo,
      ),
    },
    {
      Podatak: 'Investitor',
      Vrijednost:
        options.customerName || 'Svi investitori',
    },
    {
      Podatak: 'Broj ponuda',
      Vrijednost: offers.length,
    },
    {
      Podatak: 'Ukupna vrijednost',
      Vrijednost: formatCurrency(
        statistics.totalValue,
      ),
    },
    {
      Podatak: 'Prihvaćena vrijednost',
      Vrijednost: formatCurrency(
        statistics.acceptedValue,
      ),
    },
    {
      Podatak: 'Odbijena vrijednost',
      Vrijednost: formatCurrency(
        statistics.rejectedValue,
      ),
    },
    {
      Podatak: 'Vrijednost u obradi',
      Vrijednost: formatCurrency(
        statistics.pendingValue,
      ),
    },
    {
      Podatak: 'Prosječna vrijednost',
      Vrijednost: formatCurrency(
        statistics.averageValue,
      ),
    },
    {
      Podatak: 'Stopa uspješnosti',
      Vrijednost: `${statistics.successRate.toFixed(
        1,
      )}%`,
    },
    {
      Podatak: 'Nacrti',
      Vrijednost: statistics.drafts,
    },
    {
      Podatak: 'Poslano',
      Vrijednost: statistics.sent,
    },
    {
      Podatak: 'Pregledano',
      Vrijednost: statistics.viewed,
    },
    {
      Podatak: 'U tijeku',
      Vrijednost: statistics.inProgress,
    },
    {
      Podatak: 'Prihvaćeno',
      Vrijednost: statistics.accepted,
    },
    {
      Podatak: 'Odbijeno',
      Vrijednost: statistics.rejected,
    },
    {
      Podatak: 'Isteklo',
      Vrijednost: statistics.expired,
    },
    {
      Podatak: 'Otkazano',
      Vrijednost: statistics.cancelled,
    },
  ]
}

function getOfferRows(offers: Offer[]) {
  return offers.map((offer) => ({
    'Broj ponude': offer.offerNumber,
    Verzija: offer.version,
    Status: offer.status,

    Investitor: offer.customerName,
    'Vrsta investitora': offer.customerType,
    OIB: offer.oib,
    Email: offer.email,
    Telefon: offer.phone,
    Adresa: offer.address,
    'Poštanski broj': offer.postalCode ?? '',
    Grad: offer.city,
    'Kontakt osoba': offer.contactPerson ?? '',

    'Datum ponude': formatDate(offer.date),
    'Vrijedi do': formatDate(offer.validUntil),

    'Odgovorna osoba': offer.responsiblePerson,
    Opis: offer.description,
    'Napomena investitoru':
      offer.customerNote ?? '',
    'Interna napomena': offer.internalNote,
    'Uvjeti plaćanja': offer.paymentTerms,

    'Osnovica prije popusta':
      calculateOfferBase(offer),

    Popust: calculateOfferDiscount(offer),

    'Osnovica nakon popusta':
      calculateOfferNet(offer),

    PDV: calculateOfferVat(offer),

    Ukupno: calculateOfferTotal(offer),

    'Broj stavki': offer.items.length,
    'Broj privitaka':
      offer.attachments?.length ?? 0,

    'Datum izrade': formatDateTime(
      offer.createdAt,
    ),

    'Zadnja izmjena': formatDateTime(
      offer.updatedAt,
    ),

    Poslano: offer.sentAt
      ? formatDateTime(offer.sentAt)
      : '',

    Pregledano: offer.viewedAt
      ? formatDateTime(offer.viewedAt)
      : '',

    Prihvaćeno: offer.acceptedAt
      ? formatDateTime(offer.acceptedAt)
      : '',

    Odbijeno: offer.rejectedAt
      ? formatDateTime(offer.rejectedAt)
      : '',

    Otkazano: offer.cancelledAt
      ? formatDateTime(offer.cancelledAt)
      : '',

    'Razlog odbijanja':
      offer.rejectionReason ?? '',

    'Razlog otkazivanja':
      offer.cancellationReason ?? '',

    'Radni nalog': offer.workOrderId ?? '',
    Račun: offer.invoiceId ?? '',
  }))
}

function getOfferItemRows(offers: Offer[]) {
  return offers.flatMap((offer) =>
    offer.items.map((item, itemIndex) => ({
      'Broj ponude': offer.offerNumber,
      Investitor: offer.customerName,
      Status: offer.status,

      'Redni broj': itemIndex + 1,
      Stavka: item.name,
      Opis: item.description,
      Količina: item.quantity,
      Jedinica: item.unit,
      'Jedinična cijena': item.price,
      'Popust (%)': item.discount,
      'PDV (%)': item.vat,

      'Osnovica prije popusta':
        calculateItemBase(item),

      'Iznos popusta':
        calculateItemDiscount(item),

      'Osnovica nakon popusta':
        calculateItemNet(item),

      'Iznos PDV-a':
        calculateItemVat(item),

      Ukupno: calculateItemTotal(item),
    })),
  )
}

function getStatusRows(
  offers: Offer[],
  statistics: OfferStatistics,
) {
  const statusValues = [
    {
      Status: 'Nacrt',
      Broj: statistics.drafts,
    },
    {
      Status: 'Poslano',
      Broj: statistics.sent,
    },
    {
      Status: 'Pregledano',
      Broj: statistics.viewed,
    },
    {
      Status: 'U tijeku',
      Broj: offers.filter(
        (offer) => offer.status === 'U tijeku',
      ).length,
    },
    {
      Status: 'Prihvaćeno',
      Broj: statistics.accepted,
    },
    {
      Status: 'Odbijeno',
      Broj: statistics.rejected,
    },
    {
      Status: 'Isteklo',
      Broj: statistics.expired,
    },
    {
      Status: 'Otkazano',
      Broj: statistics.cancelled,
    },
  ]

  return statusValues.map((statusItem) => {
    const statusOffers = offers.filter(
      (offer) =>
        offer.status === statusItem.Status,
    )

    const totalValue = statusOffers.reduce(
      (total, offer) =>
        total + calculateOfferTotal(offer),
      0,
    )

    return {
      Status: statusItem.Status,
      'Broj ponuda': statusItem.Broj,
      'Ukupna vrijednost': totalValue,
      'Udio u ukupnom broju (%)':
        offers.length > 0
          ? Number(
              (
                (statusItem.Broj /
                  offers.length) *
                100
              ).toFixed(2),
            )
          : 0,
    }
  })
}

function getMonthlyRows(
  monthlyStatistics: MonthlyOfferStatistics[],
) {
  return monthlyStatistics.map((month) => ({
    Godina: month.year,
    Mjesec: month.month,
    Naziv: month.label,
    'Ukupno ponuda': month.totalCount,
    Prihvaćeno: month.acceptedCount,
    Odbijeno: month.rejectedCount,
    'Ukupna vrijednost': month.totalValue,
    'Prihvaćena vrijednost':
      month.acceptedValue,
    'Stopa uspješnosti (%)':
      month.acceptedCount +
        month.rejectedCount >
      0
        ? Number(
            (
              (month.acceptedCount /
                (month.acceptedCount +
                  month.rejectedCount)) *
              100
            ).toFixed(2),
          )
        : 0,
  }))
}

function getCustomerRows(offers: Offer[]) {
  const customers = getCustomersFromOffers(offers)

  return customers.map((customer) => {
    const customerOffers = offers.filter(
      (offer) =>
        (customer.oib &&
          offer.oib === customer.oib) ||
        (!customer.oib &&
          offer.customerName === customer.name),
    )

    const acceptedOffers =
      customerOffers.filter(
        (offer) =>
          offer.status === 'Prihvaćeno',
      )

    const rejectedOffers =
      customerOffers.filter(
        (offer) =>
          offer.status === 'Odbijeno',
      )

    const decidedCount =
      acceptedOffers.length +
      rejectedOffers.length

    return {
      Investitor: customer.name,
      OIB: customer.oib,
      Email: customer.email,
      'Broj ponuda': customer.offerCount,
      Prihvaćeno: acceptedOffers.length,
      Odbijeno: rejectedOffers.length,
      'Ukupna vrijednost':
        customer.totalValue,
      'Prihvaćena vrijednost':
        acceptedOffers.reduce(
          (total, offer) =>
            total +
            calculateOfferTotal(offer),
          0,
        ),
      'Stopa uspješnosti (%)':
        decidedCount > 0
          ? Number(
              (
                (acceptedOffers.length /
                  decidedCount) *
                100
              ).toFixed(2),
            )
          : 0,
    }
  })
}

function getHistoryRows(offers: Offer[]) {
  return offers.flatMap((offer) =>
    offer.history.map((historyItem) => ({
      'Broj ponude': offer.offerNumber,
      Investitor: offer.customerName,
      Status: offer.status,
      Datum: formatDateTime(
        historyItem.date,
      ),
      Događaj: historyItem.title,
      Opis: historyItem.description,
    })),
  )
}

function getAttachmentRows(offers: Offer[]) {
  return offers.flatMap((offer) =>
    (offer.attachments ?? []).map(
      (attachment) => ({
        'Broj ponude': offer.offerNumber,
        Investitor: offer.customerName,
        'Naziv datoteke': attachment.name,
        'Vrsta datoteke': attachment.type,
        'Veličina u bajtovima':
          attachment.size,
        'Datum dodavanja': formatDateTime(
          attachment.createdAt,
        ),
      }),
    ),
  )
}

function createSummaryWorksheet(
  offers: Offer[],
  statistics: OfferStatistics,
  options: ExportOffersOptions,
) {
  const rows = getSummaryRows(
    offers,
    statistics,
    options,
  )

  return createWorksheetFromRows(
    rows,
    [32, 32],
  )
}

function createOffersWorksheet(
  offers: Offer[],
) {
  return createWorksheetFromRows(
    getOfferRows(offers),
    [
      18,
      10,
      16,
      28,
      18,
      16,
      28,
      18,
      32,
      14,
      18,
      24,
      14,
      14,
      22,
      42,
      42,
      42,
      28,
      20,
      20,
      20,
      20,
      20,
      14,
      14,
      19,
      19,
      19,
      19,
      19,
      19,
      30,
      30,
      18,
      18,
    ],
  )
}

function createItemsWorksheet(
  offers: Offer[],
) {
  return createWorksheetFromRows(
    getOfferItemRows(offers),
    [
      18,
      28,
      16,
      12,
      30,
      42,
      12,
      14,
      18,
      14,
      12,
      24,
      20,
      24,
      18,
      18,
    ],
  )
}

function createStatusesWorksheet(
  offers: Offer[],
  statistics: OfferStatistics,
) {
  return createWorksheetFromRows(
    getStatusRows(offers, statistics),
    [18, 16, 22, 24],
  )
}

function createMonthlyWorksheet(
  monthlyStatistics: MonthlyOfferStatistics[],
) {
  return createWorksheetFromRows(
    getMonthlyRows(monthlyStatistics),
    [
      12,
      12,
      14,
      18,
      16,
      16,
      22,
      24,
      24,
    ],
  )
}

function createCustomersWorksheet(
  offers: Offer[],
) {
  return createWorksheetFromRows(
    getCustomerRows(offers),
    [
      30,
      18,
      30,
      16,
      16,
      16,
      22,
      24,
      24,
    ],
  )
}

function createHistoryWorksheet(
  offers: Offer[],
) {
  return createWorksheetFromRows(
    getHistoryRows(offers),
    [18, 30, 16, 20, 32, 55],
  )
}

function createAttachmentsWorksheet(
  offers: Offer[],
) {
  return createWorksheetFromRows(
    getAttachmentRows(offers),
    [18, 30, 40, 24, 24, 22],
  )
}

function appendWorksheetIfNotEmpty(
  workbook: XLSX.WorkBook,
  worksheet: XLSX.WorkSheet,
  name: string,
  hasRows: boolean,
) {
  if (!hasRows) {
    return
  }

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    name,
  )
}

export function exportOffersToExcel(
  options: ExportOffersOptions,
) {
  const offers = options.offers

  if (offers.length === 0) {
    throw new Error(
      'Nema ponuda za Excel izvoz.',
    )
  }

  const statistics =
    calculateOfferStatistics(offers)

  const years = offers
    .map((offer) =>
      new Date(
        `${offer.date}T12:00:00`,
      ).getFullYear(),
    )
    .filter((year) =>
      Number.isFinite(year),
    )

  const latestYear =
    years.length > 0
      ? Math.max(...years)
      : new Date().getFullYear()

  const monthlyStatistics =
    getMonthlyOfferStatistics(
      offers,
      latestYear,
    )

  const workbook = XLSX.utils.book_new()

  workbook.Props = {
    Title: getExportTitle(
      options.mode ?? 'filtered',
    ),
    Subject: 'FERSYS pregled ponuda',
    Author:
      options.companyName ??
      DEFAULT_COMPANY_NAME,
    Company:
      options.companyName ??
      DEFAULT_COMPANY_NAME,
    CreatedDate: new Date(),
  }

  XLSX.utils.book_append_sheet(
    workbook,
    createSummaryWorksheet(
      offers,
      statistics,
      options,
    ),
    'Sažetak',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    createOffersWorksheet(offers),
    'Ponude',
  )

  appendWorksheetIfNotEmpty(
    workbook,
    createItemsWorksheet(offers),
    'Stavke',
    offers.some(
      (offer) => offer.items.length > 0,
    ),
  )

  XLSX.utils.book_append_sheet(
    workbook,
    createStatusesWorksheet(
      offers,
      statistics,
    ),
    'Statusi',
  )

  XLSX.utils.book_append_sheet(
    workbook,
    createMonthlyWorksheet(
      monthlyStatistics,
    ),
    `Mjesečni pregled ${latestYear}`,
  )

  XLSX.utils.book_append_sheet(
    workbook,
    createCustomersWorksheet(offers),
    'Investitori',
  )

  appendWorksheetIfNotEmpty(
    workbook,
    createHistoryWorksheet(offers),
    'Povijest',
    offers.some(
      (offer) => offer.history.length > 0,
    ),
  )

  appendWorksheetIfNotEmpty(
    workbook,
    createAttachmentsWorksheet(offers),
    'Privitci',
    offers.some(
      (offer) =>
        (offer.attachments?.length ?? 0) >
        0,
    ),
  )

  const mode =
    options.mode ?? 'filtered'

  const defaultFileName = [
    'FERSYS',
    'Ponude',
    mode,
    options.customerName,
    getCurrentDateForFileName(),
  ]
    .filter(Boolean)
    .join('_')

  const fileName = sanitiseFileName(
    options.fileName || defaultFileName,
  )

  XLSX.writeFile(
    workbook,
    `${fileName}.xlsx`,
    {
      compression: true,
    },
  )
}

export function exportAllOffersToExcel(
  offers: Offer[],
) {
  exportOffersToExcel({
    offers,
    mode: 'all',
    fileName: `FERSYS_Sve_ponude_${getCurrentDateForFileName()}`,
  })
}

export function exportFilteredOffersToExcel(
  offers: Offer[],
  dateFrom?: string,
  dateTo?: string,
) {
  exportOffersToExcel({
    offers,
    mode: 'filtered',
    dateFrom,
    dateTo,
    fileName: `FERSYS_Filtrirane_ponude_${getCurrentDateForFileName()}`,
  })
}

export function exportSelectedOffersToExcel(
  offers: Offer[],
) {
  exportOffersToExcel({
    offers,
    mode: 'selected',
    fileName: `FERSYS_Odabrane_ponude_${getCurrentDateForFileName()}`,
  })
}

export function exportCustomerOffersToExcel(
  offers: Offer[],
  customerName: string,
) {
  const customerOffers = offers.filter(
    (offer) =>
      offer.customerName === customerName,
  )

  if (customerOffers.length === 0) {
    throw new Error(
      `Nema ponuda za investitora „${customerName}”.`,
    )
  }

  exportOffersToExcel({
    offers: customerOffers,
    mode: 'customer',
    customerName,
    fileName: `FERSYS_${customerName}_ponude_${getCurrentDateForFileName()}`,
  })
}

export function exportOffersByYearToExcel(
  offers: Offer[],
  year: number,
) {
  const yearlyOffers = offers.filter(
    (offer) =>
      new Date(
        `${offer.date}T12:00:00`,
      ).getFullYear() === year,
  )

  if (yearlyOffers.length === 0) {
    throw new Error(
      `Nema ponuda za ${year}. godinu.`,
    )
  }

  exportOffersToExcel({
    offers: yearlyOffers,
    mode: 'filtered',
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
    fileName: `FERSYS_Ponude_${year}`,
  })
}

export function exportOffersByMonthToExcel(
  offers: Offer[],
  year: number,
  month: number,
) {
  const monthlyOffers = offers.filter(
    (offer) => {
      const offerDate = new Date(
        `${offer.date}T12:00:00`,
      )

      return (
        offerDate.getFullYear() === year &&
        offerDate.getMonth() === month - 1
      )
    },
  )

  if (monthlyOffers.length === 0) {
    throw new Error(
      `Nema ponuda za odabrani mjesec.`,
    )
  }

  const paddedMonth = String(month).padStart(
    2,
    '0',
  )

  const lastDay = new Date(
    year,
    month,
    0,
  ).getDate()

  exportOffersToExcel({
    offers: monthlyOffers,
    mode: 'filtered',
    dateFrom: `${year}-${paddedMonth}-01`,
    dateTo: `${year}-${paddedMonth}-${String(
      lastDay,
    ).padStart(2, '0')}`,
    fileName: `FERSYS_Ponude_${year}_${paddedMonth}`,
  })
}
