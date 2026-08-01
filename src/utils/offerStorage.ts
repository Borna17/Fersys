import type {
  Offer,
  OfferHistoryItem,
  OfferStatus,
} from '../types/offers'

export const OFFERS_STORAGE_KEY = 'fersys_offers'

export function createOfferId() {
  return `offer-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function createOfferItemId() {
  return `item-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function createOfferHistoryId() {
  return `history-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function createOfferHistoryItem(
  title: string,
  description: string,
): OfferHistoryItem {
  return {
    id: createOfferHistoryId(),
    date: new Date().toISOString(),
    title,
    description,
  }
}

export function createStatusHistoryItem(
  status: OfferStatus,
): OfferHistoryItem {
  return createOfferHistoryItem(
    `Status promijenjen: ${status}`,
    `Status ponude promijenjen je u „${status}”.`,
  )
}

export function loadOffers(
  fallbackOffers: Offer[] = [],
): Offer[] {
  try {
    const storedOffers = localStorage.getItem(
      OFFERS_STORAGE_KEY,
    )

    if (!storedOffers) {
      if (fallbackOffers.length > 0) {
        saveOffers(fallbackOffers)
      }

      return fallbackOffers
    }

    const parsedOffers = JSON.parse(storedOffers) as Offer[]

    if (!Array.isArray(parsedOffers)) {
      return fallbackOffers
    }

    return parsedOffers
  } catch (error) {
    console.error(
      'Greška pri učitavanju ponuda:',
      error,
    )

    return fallbackOffers
  }
}

export function saveOffers(offers: Offer[]) {
  try {
    localStorage.setItem(
      OFFERS_STORAGE_KEY,
      JSON.stringify(offers),
    )
  } catch (error) {
    console.error(
      'Greška pri spremanju ponuda:',
      error,
    )

    throw new Error(
      'Ponude nije moguće spremiti u preglednik.',
    )
  }
}

export function findOfferById(
  offers: Offer[],
  offerId: string,
) {
  return (
    offers.find((offer) => offer.id === offerId) ?? null
  )
}

export function findOfferByNumber(
  offers: Offer[],
  offerNumber: string,
) {
  return (
    offers.find(
      (offer) =>
        offer.offerNumber.toLocaleLowerCase('hr-HR') ===
        offerNumber.toLocaleLowerCase('hr-HR'),
    ) ?? null
  )
}

export function addOffer(
  offers: Offer[],
  newOffer: Offer,
) {
  const updatedOffers = [newOffer, ...offers]

  saveOffers(updatedOffers)

  return updatedOffers
}

export function updateOffer(
  offers: Offer[],
  updatedOffer: Offer,
) {
  const updatedOffers = offers.map((offer) =>
    offer.id === updatedOffer.id
      ? updatedOffer
      : offer,
  )

  saveOffers(updatedOffers)

  return updatedOffers
}

export function updateOfferById(
  offers: Offer[],
  offerId: string,
  updates: Partial<Offer>,
) {
  const updatedOffers = offers.map((offer) => {
    if (offer.id !== offerId) {
      return offer
    }

    return {
      ...offer,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  })

  saveOffers(updatedOffers)

  return updatedOffers
}

export function updateOfferStatus(
  offers: Offer[],
  offerId: string,
  status: OfferStatus,
) {
  const now = new Date().toISOString()

  const updatedOffers = offers.map((offer) => {
    if (offer.id !== offerId) {
      return offer
    }

    return {
      ...offer,
      status,
      updatedAt: now,

      sentAt:
        status === 'Poslano'
          ? offer.sentAt ?? now
          : offer.sentAt,

      viewedAt:
        status === 'Pregledano'
          ? offer.viewedAt ?? now
          : offer.viewedAt,

      acceptedAt:
        status === 'Prihvaćeno'
          ? now
          : offer.acceptedAt,

      rejectedAt:
        status === 'Odbijeno'
          ? now
          : offer.rejectedAt,

      cancelledAt:
        status === 'Otkazano'
          ? now
          : offer.cancelledAt,

      history: [
        ...offer.history,
        createStatusHistoryItem(status),
      ],
    }
  })

  saveOffers(updatedOffers)

  return updatedOffers
}

export function updateMultipleOfferStatuses(
  offers: Offer[],
  offerIds: string[],
  status: OfferStatus,
) {
  const selectedIds = new Set(offerIds)
  const now = new Date().toISOString()

  const updatedOffers = offers.map((offer) => {
    if (!selectedIds.has(offer.id)) {
      return offer
    }

    return {
      ...offer,
      status,
      updatedAt: now,

      sentAt:
        status === 'Poslano'
          ? offer.sentAt ?? now
          : offer.sentAt,

      viewedAt:
        status === 'Pregledano'
          ? offer.viewedAt ?? now
          : offer.viewedAt,

      acceptedAt:
        status === 'Prihvaćeno'
          ? now
          : offer.acceptedAt,

      rejectedAt:
        status === 'Odbijeno'
          ? now
          : offer.rejectedAt,

      cancelledAt:
        status === 'Otkazano'
          ? now
          : offer.cancelledAt,

      history: [
        ...offer.history,
        createStatusHistoryItem(status),
      ],
    }
  })

  saveOffers(updatedOffers)

  return updatedOffers
}

export function deleteOffer(
  offers: Offer[],
  offerId: string,
) {
  const updatedOffers = offers.filter(
    (offer) => offer.id !== offerId,
  )

  saveOffers(updatedOffers)

  return updatedOffers
}

export function deleteMultipleOffers(
  offers: Offer[],
  offerIds: string[],
) {
  const selectedIds = new Set(offerIds)

  const updatedOffers = offers.filter(
    (offer) => !selectedIds.has(offer.id),
  )

  saveOffers(updatedOffers)

  return updatedOffers
}

export function duplicateOffer(
  offers: Offer[],
  sourceOffer: Offer,
  newOfferNumber: string,
) {
  const now = new Date().toISOString()

  const duplicatedOffer: Offer = {
    ...sourceOffer,

    id: createOfferId(),

    offerNumber: newOfferNumber,

    version: 1,

    status: 'Nacrt',

    createdAt: now,
    updatedAt: now,

    sentAt: undefined,
    viewedAt: undefined,
    acceptedAt: undefined,
    rejectedAt: undefined,
    cancelledAt: undefined,

    rejectionReason: undefined,
    cancellationReason: undefined,

    workOrderId: undefined,
    invoiceId: undefined,

    items: sourceOffer.items.map((item) => ({
      ...item,
      id: createOfferItemId(),
    })),

    history: [
      createOfferHistoryItem(
        'Ponuda duplicirana',
        `Nova ponuda izrađena je prema ponudi ${sourceOffer.offerNumber}.`,
      ),
    ],
  }

  return addOffer(offers, duplicatedOffer)
}

export function getNextOfferNumber(
  offers: Offer[],
  year = new Date().getFullYear(),
) {
  const prefix = `P-${year}-`

  const numbers = offers
    .filter((offer) =>
      offer.offerNumber.startsWith(prefix),
    )
    .map((offer) => {
      const numericPart = offer.offerNumber.replace(
        prefix,
        '',
      )

      return Number.parseInt(numericPart, 10)
    })
    .filter((value) => Number.isFinite(value))

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

export function clearAllOffers() {
  localStorage.removeItem(OFFERS_STORAGE_KEY)
}
