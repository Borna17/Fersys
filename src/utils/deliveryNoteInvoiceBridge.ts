import type {
  DeliveryNote,
} from '../types/deliveryNote'

const OFFERS_STORAGE_KEY =
  'fersys_offers'

function readOffers() {
  try {
    const parsed =
      JSON.parse(
        localStorage.getItem(
          OFFERS_STORAGE_KEY,
        ) ??
        '[]',
      )

    return Array.isArray(
      parsed,
    )
      ? parsed
      : []
  } catch {
    return []
  }
}

/**
 * NewInvoicePage već zna izraditi račun iz ?fromOffer=...
 * pa koristimo privremeni kompatibilni "offer bridge".
 * Ne mijenjamo postojeću stranicu računa i ne diramo pravi cloud offer.
 */
export function
prepareDeliveryNoteInvoiceBridge(
  note:
    DeliveryNote,
) {
  const id =
    `delivery-note-${note.id}`

  const bridge = {
    id,
    offerNumber:
      note.number,
    customerName:
      note.customerName,
    customerType:
      (
        note.customerType ||
        'Tvrtka'
      ),
    oib:
      note.customerOib,
    email:
      note.customerEmail,
    phone:
      note.customerPhone,
    address:
      note.deliveryAddress,
    city:
      note.deliveryPlace,
    responsiblePerson:
      note.deliveredBy,
    description:
      `Račun prema otpremnici ${note.number}`,
    internalNote:
      `Izvor: otpremnica ${note.number}`,
    paymentTerms: '',
    items:
      note.items.map(
        (item) => ({
          id:
            crypto.randomUUID(),
          name:
            item.name,
          description:
            [
              item.description,
              item.note,
            ]
              .filter(Boolean)
              .join(' · '),
          quantity:
            item.quantity,
          unit:
            item.unit,
          price:
            item.unitPrice,
          discount: 0,
          vat:
            item.vatRate ||
            25,
        }),
      ),
  }

  const current =
    readOffers()
      .filter(
        (
          item:
            Record<
              string,
              unknown
            >,
        ) =>
          item.id !==
          id,
      )

  localStorage.setItem(
    OFFERS_STORAGE_KEY,
    JSON.stringify([
      bridge,
      ...current,
    ]),
  )

  return `/invoices/new?fromOffer=${encodeURIComponent(
    id,
  )}`
}
