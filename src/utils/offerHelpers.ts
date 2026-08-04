import type {
  DatePreset,
  MonthlyOfferStatistics,
  Offer,
  OfferFilters,
  OfferSortField,
  SortDirection,
} from '../types/offers'

import {
  calculateOfferTotal,
} from './offerCalculations'

export function getDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDate(date: string) {
  if (!date) {
    return '—'
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString(
    'hr-HR',
  )
}

export function formatDateTime(date: string) {
  if (!date) {
    return '—'
  }

  return new Date(date).toLocaleString('hr-HR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function getDateRange(preset: DatePreset) {
  const now = new Date()

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  if (preset === 'today') {
    const date = getDateString(today)

    return {
      from: date,
      to: date,
    }
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
        new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        ),
      ),

      to: getDateString(
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
      from: getDateString(
        new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        ),
      ),

      to: getDateString(
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
      from: `${today.getFullYear()}-01-01`,
      to: `${today.getFullYear()}-12-31`,
    }
  }

  if (preset === 'lastYear') {
    const lastYear = today.getFullYear() - 1

    return {
      from: `${lastYear}-01-01`,
      to: `${lastYear}-12-31`,
    }
  }

  return {
    from: '',
    to: '',
  }
}

export function daysUntil(date: string) {
  if (!date) {
    return 0
  }

  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  const targetDate = new Date(`${date}T00:00:00`)

  const difference =
    targetDate.getTime() - currentDate.getTime()

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24),
  )
}

export function isOfferExpired(offer: Offer) {
  if (
    [
      'Prihvaćeno',
      'Odbijeno',
      'Isteklo',
      'Otkazano',
    ].includes(offer.status)
  ) {
    return offer.status === 'Isteklo'
  }

  return daysUntil(offer.validUntil) < 0
}

export function getOfferValidityLabel(
  offer: Offer,
) {
  if (offer.status === 'Prihvaćeno') {
    return 'Ponuda prihvaćena'
  }

  if (offer.status === 'Odbijeno') {
    return 'Ponuda odbijena'
  }

  if (offer.status === 'Otkazano') {
    return 'Ponuda otkazana'
  }

  const remainingDays = daysUntil(offer.validUntil)

  if (
    offer.status === 'Isteklo' ||
    remainingDays < 0
  ) {
    return `Isteklo prije ${Math.abs(
      remainingDays,
    )} dana`
  }

  if (remainingDays === 0) {
    return 'Istječe danas'
  }

  if (remainingDays === 1) {
    return 'Istječe sutra'
  }

  return `Još ${remainingDays} dana`
}

export function normaliseSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('hr-HR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getOfferSearchText(offer: Offer) {
  return normaliseSearchText(
    [
      offer.offerNumber,
      offer.customerName,
      offer.customerType,
      offer.oib,
      offer.email,
      offer.phone,
      offer.address,
      offer.postalCode,
      offer.city,
      offer.contactPerson,
      offer.description,
      offer.internalNote,
      offer.customerNote,
      offer.paymentTerms,
      offer.responsiblePerson,

      ...offer.items.map((item) => item.name),

      ...offer.items.map(
        (item) => item.description,
      ),
    ]
      .filter(Boolean)
      .join(' '),
  )
}

export function offerMatchesSearch(
  offer: Offer,
  searchQuery: string,
) {
  const normalisedQuery =
    normaliseSearchText(searchQuery)

  if (!normalisedQuery) {
    return true
  }

  return getOfferSearchText(offer).includes(
    normalisedQuery,
  )
}

export function filterOffers(
  offers: Offer[],
  filters: OfferFilters,
) {
  const minimum = Number(filters.minimumAmount)
  const maximum = Number(filters.maximumAmount)

  return offers.filter((offer) => {
    const matchesSearch = offerMatchesSearch(
      offer,
      filters.searchQuery,
    )

    const matchesStatus =
      filters.status === 'Svi' ||
      offer.status === filters.status

    const matchesDateFrom =
      !filters.dateFrom ||
      offer.date >= filters.dateFrom

    const matchesDateTo =
      !filters.dateTo ||
      offer.date <= filters.dateTo

    const offerTotal = calculateOfferTotal(offer)

    const matchesMinimum =
      !filters.minimumAmount ||
      Number.isNaN(minimum) ||
      offerTotal >= minimum

    const matchesMaximum =
      !filters.maximumAmount ||
      Number.isNaN(maximum) ||
      offerTotal <= maximum

    const matchesResponsiblePerson =
      filters.responsiblePerson === 'Svi' ||
      offer.responsiblePerson ===
        filters.responsiblePerson

    const matchesCustomerType =
      filters.customerType === 'Svi' ||
      offer.customerType === filters.customerType

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesMinimum &&
      matchesMaximum &&
      matchesResponsiblePerson &&
      matchesCustomerType
    )
  })
}

function compareText(
  firstValue: string,
  secondValue: string,
) {
  return firstValue.localeCompare(
    secondValue,
    'hr-HR',
    {
      sensitivity: 'base',
    },
  )
}

export function sortOffers(
  offers: Offer[],
  sortField: OfferSortField,
  sortDirection: SortDirection,
) {
  const multiplier =
    sortDirection === 'asc' ? 1 : -1

  return [...offers].sort((first, second) => {
    if (sortField === 'total') {
      return (
        (calculateOfferTotal(first) -
          calculateOfferTotal(second)) *
        multiplier
      )
    }

    if (sortField === 'date') {
      return (
        (new Date(first.date).getTime() -
          new Date(second.date).getTime()) *
        multiplier
      )
    }

    if (sortField === 'validUntil') {
      return (
        (new Date(first.validUntil).getTime() -
          new Date(second.validUntil).getTime()) *
        multiplier
      )
    }

    if (sortField === 'updatedAt') {
      return (
        (new Date(first.updatedAt).getTime() -
          new Date(second.updatedAt).getTime()) *
        multiplier
      )
    }

    if (sortField === 'offerNumber') {
      return (
        compareText(
          first.offerNumber,
          second.offerNumber,
        ) * multiplier
      )
    }

    if (sortField === 'customerName') {
      return (
        compareText(
          first.customerName,
          second.customerName,
        ) * multiplier
      )
    }

    if (sortField === 'status') {
      return (
        compareText(first.status, second.status) *
        multiplier
      )
    }

    return 0
  })
}

export function getResponsiblePeople(
  offers: Offer[],
) {
  return Array.from(
    new Set(
      offers
        .map((offer) => offer.responsiblePerson)
        .filter(Boolean),
    ),
  ).sort((first, second) =>
    first.localeCompare(second, 'hr-HR'),
  )
}

export function getCustomersFromOffers(
  offers: Offer[],
) {
  const customers = new Map<
    string,
    {
      name: string
      oib: string
      email: string
      offerCount: number
      totalValue: number
    }
  >()

  offers.forEach((offer) => {
    const customerKey =
      offer.oib || offer.customerName

    const existingCustomer =
      customers.get(customerKey)

    if (existingCustomer) {
      existingCustomer.offerCount += 1
      existingCustomer.totalValue +=
        calculateOfferTotal(offer)

      return
    }

    customers.set(customerKey, {
      name: offer.customerName,
      oib: offer.oib,
      email: offer.email,
      offerCount: 1,
      totalValue: calculateOfferTotal(offer),
    })
  })

  return Array.from(customers.values()).sort(
    (first, second) =>
      second.totalValue - first.totalValue,
  )
}

export function getMonthlyOfferStatistics(
  offers: Offer[],
  year = new Date().getFullYear(),
): MonthlyOfferStatistics[] {
  const monthLabels = [
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

  return monthLabels.map(
    (label, monthIndex) => {
      const monthOffers = offers.filter(
        (offer) => {
          const offerDate = new Date(
            `${offer.date}T12:00:00`,
          )

          return (
            offerDate.getFullYear() === year &&
            offerDate.getMonth() === monthIndex
          )
        },
      )

      const acceptedOffers =
        monthOffers.filter(
          (offer) =>
            offer.status === 'Prihvaćeno',
        )

      const rejectedOffers =
        monthOffers.filter(
          (offer) =>
            offer.status === 'Odbijeno',
        )

      return {
        year,
        month: monthIndex + 1,
        label,

        totalCount: monthOffers.length,

        acceptedCount:
          acceptedOffers.length,

        rejectedCount:
          rejectedOffers.length,

        totalValue: monthOffers.reduce(
          (total, offer) =>
            total + calculateOfferTotal(offer),
          0,
        ),

        acceptedValue:
          acceptedOffers.reduce(
            (total, offer) =>
              total +
              calculateOfferTotal(offer),
            0,
          ),
      }
    },
  )
}

export function getOfferAgeInDays(
  offer: Offer,
) {
  const createdDate = new Date(
    offer.createdAt,
  )

  const currentDate = new Date()

  const difference =
    currentDate.getTime() -
    createdDate.getTime()

  return Math.max(
    0,
    Math.floor(
      difference / (1000 * 60 * 60 * 24),
    ),
  )
}

export function getDaysSinceLastUpdate(
  offer: Offer,
) {
  const updatedDate = new Date(
    offer.updatedAt,
  )

  const currentDate = new Date()

  const difference =
    currentDate.getTime() -
    updatedDate.getTime()

  return Math.max(
    0,
    Math.floor(
      difference / (1000 * 60 * 60 * 24),
    ),
  )
}

export function getOfferPriority(
  offer: Offer,
):
  | 'normal'
  | 'attention'
  | 'urgent'
  | 'completed' {
  if (
    [
      'Prihvaćeno',
      'Odbijeno',
      'Otkazano',
    ].includes(offer.status)
  ) {
    return 'completed'
  }

  const remainingDays = daysUntil(
    offer.validUntil,
  )

  const daysWithoutUpdate =
    getDaysSinceLastUpdate(offer)

  if (
    remainingDays < 0 ||
    remainingDays <= 2 ||
    daysWithoutUpdate >= 14
  ) {
    return 'urgent'
  }

  if (
    remainingDays <= 7 ||
    daysWithoutUpdate >= 7
  ) {
    return 'attention'
  }

  return 'normal'
}
