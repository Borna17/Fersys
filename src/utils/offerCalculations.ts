import type {
  Offer,
  OfferItem,
  OfferStatistics,
} from '../types/offers'

export function calculateItemBase(item: OfferItem) {
  return item.quantity * item.price
}

export function calculateItemDiscount(item: OfferItem) {
  return calculateItemBase(item) * (item.discount / 100)
}

export function calculateItemNet(item: OfferItem) {
  return calculateItemBase(item) - calculateItemDiscount(item)
}

export function calculateItemVat(item: OfferItem) {
  return calculateItemNet(item) * (item.vat / 100)
}

export function calculateItemTotal(item: OfferItem) {
  return calculateItemNet(item) + calculateItemVat(item)
}

export function calculateOfferBase(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemBase(item),
    0,
  )
}

export function calculateOfferDiscount(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemDiscount(item),
    0,
  )
}

export function calculateOfferNet(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemNet(item),
    0,
  )
}

export function calculateOfferVat(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemVat(item),
    0,
  )
}

export function calculateOfferTotal(offer: Offer) {
  return offer.items.reduce(
    (total, item) => total + calculateItemTotal(item),
    0,
  )
}

export function calculateOffersTotal(offers: Offer[]) {
  return offers.reduce(
    (total, offer) => total + calculateOfferTotal(offer),
    0,
  )
}

export function calculateOfferStatistics(
  offers: Offer[],
): OfferStatistics {
  const acceptedOffers = offers.filter(
    (offer) => offer.status === 'Prihvaćeno',
  )

  const rejectedOffers = offers.filter(
    (offer) => offer.status === 'Odbijeno',
  )

  const pendingOffers = offers.filter((offer) =>
    [
      'Nacrt',
      'Poslano',
      'Pregledano',
      'U tijeku',
    ].includes(offer.status),
  )

  const decidedOffersCount =
    acceptedOffers.length + rejectedOffers.length

  const totalValue = calculateOffersTotal(offers)

  const acceptedValue =
    calculateOffersTotal(acceptedOffers)

  const rejectedValue =
    calculateOffersTotal(rejectedOffers)

  const pendingValue =
    calculateOffersTotal(pendingOffers)

  return {
    total: offers.length,

    drafts: offers.filter(
      (offer) => offer.status === 'Nacrt',
    ).length,

    sent: offers.filter(
      (offer) => offer.status === 'Poslano',
    ).length,

    viewed: offers.filter(
      (offer) => offer.status === 'Pregledano',
    ).length,

    inProgress: offers.filter(
      (offer) =>
        offer.status === 'Pregledano' ||
        offer.status === 'U tijeku',
    ).length,

    accepted: acceptedOffers.length,

    rejected: rejectedOffers.length,

    expired: offers.filter(
      (offer) => offer.status === 'Isteklo',
    ).length,

    cancelled: offers.filter(
      (offer) => offer.status === 'Otkazano',
    ).length,

    totalValue,
    acceptedValue,
    rejectedValue,
    pendingValue,

    averageValue:
      offers.length > 0
        ? totalValue / offers.length
        : 0,

    successRate:
      decidedOffersCount > 0
        ? (acceptedOffers.length /
            decidedOffersCount) *
          100
        : 0,
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}
