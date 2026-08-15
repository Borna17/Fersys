import bwipjs from '@bwip-js/browser'

export type Hub3PaymentData = {
  amount: number

  payerName: string
  payerStreet: string
  payerPostalCity: string

  recipientName: string
  recipientStreet: string
  recipientPostalCity: string

  iban: string
  model: string
  reference: string

  purposeCode?: string
  description: string
}

const HUB3_ALLOWED =
  /[^0-9A-Za-zČĆĐŠŽčćđšžQWXYqwxy ,.:+\-?'\/()]/g

function sanitizeHubText(
  value: string,
  maxLength: number,
) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(HUB3_ALLOWED, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalizeIban(
  value: string,
) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

function normalizeModel(
  value: string,
  hasReference: boolean,
) {
  const clean = String(
    value ?? '',
  )
    .replace(/\s+/g, '')
    .toUpperCase()

  if (
    /^HR\d{2}$/.test(clean)
  ) {
    return clean
  }

  if (/^\d{2}$/.test(clean)) {
    return `HR${clean}`
  }

  return hasReference
    ? 'HR00'
    : 'HR99'
}

function normalizeReference(
  value: string,
  model: string,
) {
  if (model === 'HR99') {
    return ''
  }

  return sanitizeHubText(
    value,
    22,
  )
}

function amountInCents(
  amount: number,
) {
  const cents = Math.round(
    Math.max(0, amount) *
      100,
  )

  return String(cents).padStart(
    15,
    '0',
  )
}

function assertHub3Data(
  data: Hub3PaymentData,
) {
  const iban =
    normalizeIban(data.iban)

  if (
    !/^HR\d{19}$/.test(iban)
  ) {
    throw new Error(
      'Za HUB3 brzo plaćanje potreban je ispravan hrvatski IBAN od 21 znaka.',
    )
  }

  if (
    !Number.isFinite(
      data.amount,
    ) ||
    data.amount <= 0
  ) {
    throw new Error(
      'Iznos računa mora biti veći od 0 EUR.',
    )
  }

  if (
    !data.recipientName.trim()
  ) {
    throw new Error(
      'Nedostaje naziv primatelja plaćanja.',
    )
  }
}

/**
 * HUB3 EUR – PDF417 payload.
 *
 * Redoslijed 14 polja prema službenoj HUB specifikaciji:
 * 1  HRVHUB30
 * 2  EUR
 * 3  iznos u centima, 15 znamenaka
 * 4  platitelj
 * 5  adresa platitelja
 * 6  poštanski broj i mjesto platitelja
 * 7  primatelj
 * 8  adresa primatelja
 * 9  poštanski broj i mjesto primatelja
 * 10 IBAN
 * 11 model
 * 12 poziv na broj
 * 13 šifra namjene
 * 14 opis plaćanja
 */
export function buildHub3Payload(
  data: Hub3PaymentData,
) {
  assertHub3Data(data)

  const iban =
    normalizeIban(data.iban)

  const rawReference =
    sanitizeHubText(
      data.reference,
      22,
    )

  const model =
    normalizeModel(
      data.model,
      Boolean(rawReference),
    )

  const reference =
    normalizeReference(
      rawReference,
      model,
    )

  const purposeCode =
    sanitizeHubText(
      data.purposeCode ||
        'OTHR',
      4,
    ).toUpperCase()

  const fields = [
    'HRVHUB30',
    'EUR',
    amountInCents(
      data.amount,
    ),

    sanitizeHubText(
      data.payerName,
      30,
    ),

    sanitizeHubText(
      data.payerStreet,
      27,
    ),

    sanitizeHubText(
      data.payerPostalCity,
      27,
    ),

    sanitizeHubText(
      data.recipientName,
      25,
    ),

    sanitizeHubText(
      data.recipientStreet,
      25,
    ),

    sanitizeHubText(
      data.recipientPostalCity,
      27,
    ),

    iban,

    model,

    reference,

    purposeCode,

    sanitizeHubText(
      data.description,
      35,
    ),
  ]

  return `${fields.join('\n')}\n`
}

/**
 * Generira pravi PDF417 barkod u browseru.
 *
 * HUB3 zahtjevi koje postavljamo:
 * - standardni PDF417
 * - 9 podatkovnih stupaca
 * - error correction level 4
 * - omjer visine modula 3:1
 * - UTF-8 (bwip-js to radi po defaultu)
 */
export function createHub3Pdf417DataUrl(
  data: Hub3PaymentData,
) {
  const payload =
    buildHub3Payload(data)

  const canvas =
    document.createElement(
      'canvas',
    )

  bwipjs.toCanvas(
    canvas,
    {
      bcid: 'pdf417',
      text: payload,

      columns: 9,
      eclevel: 4,
      rowmult: 3,

      scaleX: 4,
      scaleY: 4,

      paddingwidth: 3,
      paddingheight: 3,

      backgroundcolor:
        'FFFFFF',
    } as any,
  )

  return canvas.toDataURL(
    'image/png',
    1,
  )
}