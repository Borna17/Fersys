export const HR_FISCAL_NAMESPACE = 'http://www.apis-it.hr/fin/2012/types/f73'
export const HR_FISCAL_TEST_ENDPOINT =
  'https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest'
export const HR_FISCAL_LIVE_ENDPOINT =
  'https://cis.porezna-uprava.hr:8449/FiskalizacijaService'

export type HrFiscalPaymentCode = 'G' | 'K' | 'T' | 'O'
export type HrFiscalSequenceScope = 'P' | 'N'

export type HrFiscalVatGroup = {
  rate: number
  base: number
  tax: number
}

export type HrFiscalInvoiceRequest = {
  rootId?: string
  messageId: string
  messageDateTime: string
  companyOib: string
  vatRegistered: boolean
  issuedAt: string
  sequenceScope: HrFiscalSequenceScope
  sequenceNumber: number
  businessPremiseCode: string
  deviceCode: string
  vatGroups: HrFiscalVatGroup[]
  total: number
  paymentCode: HrFiscalPaymentCode
  operatorOib: string
  zki: string
  subsequentDelivery: boolean
  recipientOib?: string
}

function xml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function formatHrFiscalMoney(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error('Fiskalni iznos nije ispravan broj.')
  }

  return value.toFixed(2)
}

export function validateHrFiscalInvoiceRequest(
  input: HrFiscalInvoiceRequest,
) {
  if (!/^[0-9]{11}$/.test(input.companyOib)) {
    throw new Error('OIB obveznika mora imati 11 znamenki.')
  }
  if (!/^[0-9]{11}$/.test(input.operatorOib)) {
    throw new Error('OIB operatora mora imati 11 znamenki.')
  }
  if (
    input.recipientOib &&
    !/^[0-9]{11}$/.test(input.recipientOib)
  ) {
    throw new Error('OIB primatelja mora imati 11 znamenki.')
  }
  if (input.recipientOib && input.paymentCode === 'T') {
    throw new Error(
      'OIB primatelja nije dopušten uz način plaćanja T.',
    )
  }
  if (!/^[A-Za-z0-9]{1,20}$/.test(input.businessPremiseCode)) {
    throw new Error(
      'Oznaka poslovnog prostora mora imati 1–20 slova ili znamenki.',
    )
  }
  if (!/^[1-9][0-9]{0,19}$/.test(input.deviceCode)) {
    throw new Error(
      'Oznaka naplatnog uređaja mora biti broj bez vodećih nula.',
    )
  }
  if (!Number.isInteger(input.sequenceNumber) || input.sequenceNumber <= 0) {
    throw new Error(
      'Brojčana oznaka fiskalnog računa mora biti pozitivan cijeli broj.',
    )
  }
  if (input.sequenceScope !== 'P' && input.sequenceScope !== 'N') {
    throw new Error('Oznaka slijednosti mora biti P ili N.')
  }
  if (!['G', 'K', 'T', 'O'].includes(input.paymentCode)) {
    throw new Error('Način plaćanja nije podržan.')
  }
  if (!/^[0-9a-f]{32}$/.test(input.zki)) {
    throw new Error(
      'ZKI mora biti stvarni 32-znamenkasti zapis malim heksadecimalnim znakovima.',
    )
  }
  if (!input.messageId || input.messageId.length > 36) {
    throw new Error('ID poruke nije ispravan.')
  }
  if (!input.messageDateTime || !input.issuedAt) {
    throw new Error('Nedostaje datum i vrijeme fiskalnog zahtjeva.')
  }
  if (!Number.isFinite(input.total) || input.total <= 0) {
    throw new Error('Ukupan iznos računa mora biti veći od nule.')
  }
}

export function buildUnsignedHrRacunZahtjev(
  input: HrFiscalInvoiceRequest,
) {
  validateHrFiscalInvoiceRequest(input)

  const rootId = input.rootId?.trim() || 'RacunZahtjev'
  const vatXml = input.vatGroups.length
    ? `<tns:Pdv>${input.vatGroups
        .map(
          (group) =>
            `<tns:Porez>` +
            `<tns:Stopa>${formatHrFiscalMoney(group.rate)}</tns:Stopa>` +
            `<tns:Osnovica>${formatHrFiscalMoney(group.base)}</tns:Osnovica>` +
            `<tns:Iznos>${formatHrFiscalMoney(group.tax)}</tns:Iznos>` +
            `</tns:Porez>`,
        )
        .join('')}</tns:Pdv>`
    : ''

  const recipientXml = input.recipientOib
    ? `<tns:OibPrimateljaRacuna>${xml(input.recipientOib)}</tns:OibPrimateljaRacuna>`
    : ''

  return (
    `<tns:RacunZahtjev Id="${xml(rootId)}" ` +
    `xmlns:tns="${HR_FISCAL_NAMESPACE}" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<tns:Zaglavlje>` +
    `<tns:IdPoruke>${xml(input.messageId)}</tns:IdPoruke>` +
    `<tns:DatumVrijeme>${xml(input.messageDateTime)}</tns:DatumVrijeme>` +
    `</tns:Zaglavlje>` +
    `<tns:Racun>` +
    `<tns:Oib>${xml(input.companyOib)}</tns:Oib>` +
    `<tns:USustPdv>${input.vatRegistered ? 'true' : 'false'}</tns:USustPdv>` +
    `<tns:DatVrijeme>${xml(input.issuedAt)}</tns:DatVrijeme>` +
    `<tns:OznSlijed>${input.sequenceScope}</tns:OznSlijed>` +
    `<tns:BrRac>` +
    `<tns:BrOznRac>${input.sequenceNumber}</tns:BrOznRac>` +
    `<tns:OznPosPr>${xml(input.businessPremiseCode)}</tns:OznPosPr>` +
    `<tns:OznNapUr>${xml(input.deviceCode)}</tns:OznNapUr>` +
    `</tns:BrRac>` +
    vatXml +
    `<tns:IznosUkupno>${formatHrFiscalMoney(input.total)}</tns:IznosUkupno>` +
    `<tns:NacinPlac>${input.paymentCode}</tns:NacinPlac>` +
    `<tns:OibOper>${xml(input.operatorOib)}</tns:OibOper>` +
    `<tns:ZastKod>${input.zki}</tns:ZastKod>` +
    `<tns:NakDost>${input.subsequentDelivery ? 'true' : 'false'}</tns:NakDost>` +
    recipientXml +
    `</tns:Racun>` +
    `</tns:RacunZahtjev>`
  )
}

export function buildHrZkiInput(args: {
  companyOib: string
  issuedAtForZki: string
  sequenceNumber: number
  businessPremiseCode: string
  deviceCode: string
  total: number
}) {
  return (
    args.companyOib +
    args.issuedAtForZki +
    String(args.sequenceNumber) +
    args.businessPremiseCode +
    args.deviceCode +
    formatHrFiscalMoney(args.total)
  )
}

export const HR_FISCAL_SIGNATURE_PROFILE = {
  canonicalization:
    'http://www.w3.org/2001/10/xml-exc-c14n#',
  signatureMethod:
    'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  digestMethod:
    'http://www.w3.org/2001/04/xmlenc#sha256',
  transforms: [
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/2001/10/xml-exc-c14n#',
  ],
} as const
