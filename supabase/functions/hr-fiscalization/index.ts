import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash, createSign } from 'node:crypto'
import { SignedXml } from 'npm:xml-crypto@6.1.2'

const ADAPTER_VERSION = 'hr-fiscalization-gateway-v3'
const FISCAL_NAMESPACE = 'http://www.apis-it.hr/fin/2012/types/f73'
const TEST_ENDPOINT = 'https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest'
const LIVE_ENDPOINT = 'https://cis.porezna-uprava.hr:8449/FiskalizacijaService'
const C14N = 'http://www.w3.org/2001/10/xml-exc-c14n#'
const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256'
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'

type JsonRecord = Record<string, unknown>
type FiscalStatus =
  | 'NOT_SUBMITTED'
  | 'READY_FOR_TEST'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'NOT_APPLICABLE'
type PaymentCode = 'G' | 'K' | 'T' | 'O'

type VatGroup = {
  rate: number
  base: number
  tax: number
}

function json(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isOib(value: string) {
  return /^\d{11}$/.test(value)
}

function isPremiseCode(value: string) {
  return /^[A-Za-z0-9]{1,20}$/.test(value)
}

function isDeviceCode(value: string) {
  return /^[1-9]\d{0,19}$/.test(value)
}

function xml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function money(value: number) {
  if (!Number.isFinite(value)) throw new Error('Neispravan fiskalni iznos.')
  return value.toFixed(2)
}

function zagrebParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Neispravan datum fiskalnog računa.')
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zagreb',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || ''

  return {
    day: get('day'),
    month: get('month'),
    year: get('year'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function formatFiscalDateTime(value: string | Date, separator: 'T' | ' ') {
  const p = zagrebParts(value)
  return `${p.day}.${p.month}.${p.year}${separator}${p.hour}:${p.minute}:${p.second}`
}

function paymentCodeFromLabel(value: unknown): PaymentCode {
  const label = text(value).toLocaleLowerCase('hr-HR')
  if (label === 'gotovina' || label.includes('cash')) return 'G'
  if (label === 'kartica' || label.includes('card')) return 'K'
  if (
    label.includes('transakcijski') ||
    label.includes('internet bankarstvo') ||
    label.includes('virman') ||
    label.includes('bank transfer')
  ) {
    return 'T'
  }
  return 'O'
}

function calculateTotals(invoiceData: JsonRecord) {
  const items = Array.isArray(invoiceData.items) ? invoiceData.items : []
  let net = 0
  let vat = 0
  let total = 0

  for (const rawItem of items) {
    const item = asRecord(rawItem)
    const quantity = numberValue(item.quantity)
    const price = numberValue(item.price)
    const discountRate = numberValue(item.discount)
    const vatRate = numberValue(item.vat)
    const base = quantity * price
    const discount = base * (discountRate / 100)
    const lineNet = base - discount
    const lineVat = lineNet * (vatRate / 100)
    net += lineNet
    vat += lineVat
    total += lineNet + lineVat
  }

  return {
    net: Math.round(net * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

function buildVatGroups(invoiceData: JsonRecord): VatGroup[] {
  const items = Array.isArray(invoiceData.items) ? invoiceData.items : []
  const grouped = new Map<number, VatGroup>()

  for (const rawItem of items) {
    const item = asRecord(rawItem)
    const quantity = numberValue(item.quantity)
    const price = numberValue(item.price)
    const discountRate = numberValue(item.discount)
    const rate = numberValue(item.vat)
    const grossBase = quantity * price
    const netBase = grossBase - grossBase * (discountRate / 100)
    const tax = netBase * (rate / 100)
    const current = grouped.get(rate) ?? { rate, base: 0, tax: 0 }
    current.base += netBase
    current.tax += tax
    grouped.set(rate, current)
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.rate - b.rate)
    .map((group) => ({
      rate: Math.round(group.rate * 100) / 100,
      base: Math.round(group.base * 100) / 100,
      tax: Math.round(group.tax * 100) / 100,
    }))
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, '\n').trim()
}

function readFiscalSecrets() {
  const privateKeyPem = normalizePem(
    Deno.env.get('HR_FISCAL_PRIVATE_KEY_PEM') || '',
  )
  const certificatePem = normalizePem(
    Deno.env.get('HR_FISCAL_CERTIFICATE_PEM') || '',
  )

  if (
    !privateKeyPem ||
    (!privateKeyPem.includes('-----BEGIN PRIVATE KEY-----') &&
      !privateKeyPem.includes('-----BEGIN RSA PRIVATE KEY-----')) ||
    !certificatePem.includes('-----BEGIN CERTIFICATE-----')
  ) {
    throw new Error(
      'Sigurni PEM fiskalni privatni ključ i certifikat nisu konfigurirani na serveru.',
    )
  }

  return { privateKeyPem, certificatePem }
}

function certificateBody(certificatePem: string) {
  return certificatePem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s+/g, '')
}

function generateZki(args: {
  companyOib: string
  issuedAtForZki: string
  sequenceNumber: number
  premiseCode: string
  deviceCode: string
  total: number
  privateKeyPem: string
}) {
  const preimage =
    args.companyOib +
    args.issuedAtForZki +
    String(args.sequenceNumber) +
    args.premiseCode +
    args.deviceCode +
    money(args.total)

  const signer = createSign('RSA-SHA256')
  signer.update(preimage, 'utf8')
  signer.end()
  const signature = signer.sign(args.privateKeyPem)

  return createHash('md5').update(signature).digest('hex').toLowerCase()
}

function buildUnsignedRacunZahtjev(args: {
  messageId: string
  messageDateTime: string
  companyOib: string
  vatRegistered: boolean
  issuedAt: string
  sequenceScope: 'P' | 'N'
  sequenceNumber: number
  premiseCode: string
  deviceCode: string
  vatGroups: VatGroup[]
  total: number
  paymentCode: PaymentCode
  operatorOib: string
  zki: string
  recipientOib?: string
}) {
  const vatXml = args.vatGroups.length
    ? `<tns:Pdv>${args.vatGroups
        .map(
          (group) =>
            `<tns:Porez>` +
            `<tns:Stopa>${money(group.rate)}</tns:Stopa>` +
            `<tns:Osnovica>${money(group.base)}</tns:Osnovica>` +
            `<tns:Iznos>${money(group.tax)}</tns:Iznos>` +
            `</tns:Porez>`,
        )
        .join('')}</tns:Pdv>`
    : ''
  const recipient = args.recipientOib
    ? `<tns:OibPrimateljaRacuna>${xml(args.recipientOib)}</tns:OibPrimateljaRacuna>`
    : ''

  return (
    `<tns:RacunZahtjev Id="RacunZahtjev" xmlns:tns="${FISCAL_NAMESPACE}" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<tns:Zaglavlje>` +
    `<tns:IdPoruke>${xml(args.messageId)}</tns:IdPoruke>` +
    `<tns:DatumVrijeme>${xml(args.messageDateTime)}</tns:DatumVrijeme>` +
    `</tns:Zaglavlje>` +
    `<tns:Racun>` +
    `<tns:Oib>${args.companyOib}</tns:Oib>` +
    `<tns:USustPdv>${args.vatRegistered ? 'true' : 'false'}</tns:USustPdv>` +
    `<tns:DatVrijeme>${xml(args.issuedAt)}</tns:DatVrijeme>` +
    `<tns:OznSlijed>${args.sequenceScope}</tns:OznSlijed>` +
    `<tns:BrRac>` +
    `<tns:BrOznRac>${args.sequenceNumber}</tns:BrOznRac>` +
    `<tns:OznPosPr>${xml(args.premiseCode)}</tns:OznPosPr>` +
    `<tns:OznNapUr>${xml(args.deviceCode)}</tns:OznNapUr>` +
    `</tns:BrRac>` +
    vatXml +
    `<tns:IznosUkupno>${money(args.total)}</tns:IznosUkupno>` +
    `<tns:NacinPlac>${args.paymentCode}</tns:NacinPlac>` +
    `<tns:OibOper>${args.operatorOib}</tns:OibOper>` +
    `<tns:ZastKod>${args.zki}</tns:ZastKod>` +
    `<tns:NakDost>false</tns:NakDost>` +
    recipient +
    `</tns:Racun>` +
    `</tns:RacunZahtjev>`
  )
}

function signRacunZahtjev(
  unsignedXml: string,
  privateKeyPem: string,
  certificatePem: string,
) {
  const cert = certificateBody(certificatePem)
  const signature = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    canonicalizationAlgorithm: C14N,
    signatureAlgorithm: RSA_SHA256,
    getKeyInfoContent: () =>
      `<X509Data><X509Certificate>${cert}</X509Certificate></X509Data>`,
  })

  signature.addReference({
    xpath: "//*[local-name(.)='RacunZahtjev']",
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: SHA256,
  })
  signature.computeSignature(unsignedXml, {
    prefix: 'ds',
    location: {
      reference: "//*[local-name(.)='RacunZahtjev']",
      action: 'append',
    },
  })

  const signed = signature.getSignedXml()
  if (!signed.includes('<ds:Signature') || !signed.includes('rsa-sha256')) {
    throw new Error('XMLDSig potpis nije ispravno generiran.')
  }
  return signed
}

function soapEnvelope(signedXml: string) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    signedXml +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
  )
}

function firstXmlValue(source: string, localName: string) {
  const escaped = localName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(
    new RegExp(`<[^>]*:?${escaped}[^>]*>([^<]*)<\\/[^>]*:?${escaped}>`, 'i'),
  )
  return match?.[1]?.trim() || ''
}

function parseFiscalErrors(source: string) {
  const codes = Array.from(
    source.matchAll(/<[^>]*:?SifraGreske[^>]*>([^<]*)<\/[^>]*:?SifraGreske>/gi),
  ).map((match) => match[1].trim())
  const messages = Array.from(
    source.matchAll(/<[^>]*:?PorukaGreske[^>]*>([^<]*)<\/[^>]*:?PorukaGreske>/gi),
  ).map((match) => match[1].trim())

  return codes.map((code, index) => ({
    code,
    message: messages[index] || '',
  }))
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, {
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Dopušten je samo POST zahtjev.',
    })
  }

  const authorization = req.headers.get('Authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return json(401, {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Nedostaje prijava korisnika.',
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, {
      ok: false,
      code: 'SERVER_CONFIGURATION_ERROR',
      message: 'Fiskalizacijski server nije pravilno konfiguriran.',
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) {
    return json(401, {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Prijava korisnika nije valjana.',
    })
  }

  let body: JsonRecord
  try {
    body = asRecord(await req.json())
  } catch {
    return json(400, {
      ok: false,
      code: 'INVALID_JSON',
      message: 'Zahtjev nije ispravan JSON.',
    })
  }

  const invoiceId = text(body.invoiceId)
  if (!invoiceId) {
    return json(400, {
      ok: false,
      code: 'INVOICE_ID_REQUIRED',
      message: 'Nedostaje ID računa.',
    })
  }

  const { data: activeCompanyId, error: activeCompanyError } =
    await userClient.rpc('current_company_id')
  if (activeCompanyError || !activeCompanyId) {
    return json(403, {
      ok: false,
      code: 'ACTIVE_COMPANY_REQUIRED',
      message: 'Korisnik nema aktivnu tvrtku kojoj može pristupiti.',
    })
  }
  const companyId = String(activeCompanyId)

  const [invoiceResult, companyResult, fiscalSettingsResult, fiscalResult] =
    await Promise.all([
      serviceClient
        .from('invoices')
        .select('id, company_id, invoice_number, data, issue_date, status')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .maybeSingle(),
      serviceClient
        .from('companies')
        .select('id, country_code, tax_id, oib, currency')
        .eq('id', companyId)
        .maybeSingle(),
      serviceClient
        .from('company_fiscal_settings')
        .select(
          'company_id, operating_mode, fiscal_mode, provider, business_premise_code, device_code, operator_tax_id, vat_registered, sequence_scope, certificate_configured',
        )
        .eq('company_id', companyId)
        .maybeSingle(),
      serviceClient
        .from('invoice_fiscalization')
        .select(
          'invoice_id, company_id, country_code, channel, status, jir, zki, external_id, attempt_count, fiscal_sequence_number, fiscal_invoice_number, fiscal_issued_at, payment_code',
        )
        .eq('invoice_id', invoiceId)
        .eq('company_id', companyId)
        .maybeSingle(),
    ])

  if (
    invoiceResult.error ||
    companyResult.error ||
    fiscalSettingsResult.error ||
    fiscalResult.error
  ) {
    return json(500, {
      ok: false,
      code: 'DATABASE_READ_FAILED',
      message: 'Nije moguće učitati podatke potrebne za fiskalizaciju.',
    })
  }
  if (!invoiceResult.data) {
    return json(404, {
      ok: false,
      code: 'INVOICE_NOT_FOUND',
      message: 'Račun nije pronađen u aktivnoj tvrtki.',
    })
  }
  if (!companyResult.data || !fiscalSettingsResult.data) {
    return json(409, {
      ok: false,
      code: 'FISCAL_SETTINGS_MISSING',
      message: 'Nedostaju fiskalne postavke aktivne tvrtke.',
    })
  }

  const invoice = asRecord(invoiceResult.data)
  const invoiceData = asRecord(invoice.data)
  const company = asRecord(companyResult.data)
  const fiscalSettings = asRecord(fiscalSettingsResult.data)
  const fiscalRow = asRecord(fiscalResult.data)
  const complianceSnapshot = asRecord(invoiceData.complianceSnapshot)

  const countryCode =
    text(company.country_code) || text(complianceSnapshot.countryCode)
  const operatingMode = text(fiscalSettings.operating_mode)
  const fiscalMode = text(fiscalSettings.fiscal_mode)
  const channel = text(fiscalRow.channel) || 'NONE'
  const companyOib = text(company.tax_id || company.oib)
  const operatorOib = text(fiscalSettings.operator_tax_id)
  const premiseCode = text(fiscalSettings.business_premise_code).toUpperCase()
  const deviceCode = text(fiscalSettings.device_code)
  const sequenceScope = text(fiscalSettings.sequence_scope) || 'P'
  const vatRegistered = fiscalSettings.vat_registered === true
  const recipientOib = text(invoiceData.oib || invoiceData.customerTaxId)
  const paymentCode = paymentCodeFromLabel(invoiceData.paymentMethod)
  const totals = calculateTotals(invoiceData)
  const allVatGroups = buildVatGroups(invoiceData)
  const practiceDocument =
    operatingMode === 'LEARNING' || complianceSnapshot.practiceDocument === true

  let requestSnapshot: JsonRecord = {
    schemaVersion: 3,
    adapterVersion: ADAPTER_VERSION,
    specificationTarget: 'F1-v2.7',
    countryCode,
    environment: fiscalMode,
    channel,
    invoiceId,
    displayInvoiceNumber: text(invoice.invoice_number),
    paymentCode,
    currency: text(company.currency) || 'EUR',
    totals,
    vatGroups: allVatGroups,
    vatRegistered,
    sequenceScope,
    businessPremiseCode: premiseCode,
    deviceCode,
    operatorOib,
    companyOib,
    recipientOib: recipientOib || null,
    practiceDocument,
  }

  async function audit(args: {
    status?: FiscalStatus
    code: string
    message: string
    response?: JsonRecord
    extra?: JsonRecord
  }) {
    const now = new Date().toISOString()
    const payload = {
      invoice_id: invoiceId,
      company_id: companyId,
      country_code: countryCode || 'HR',
      channel,
      status: args.status || text(fiscalRow.status) || 'NOT_SUBMITTED',
      business_premise_code: premiseCode,
      device_code: deviceCode,
      operator_tax_id: operatorOib,
      payment_code: paymentCode,
      attempt_count: numberValue(fiscalRow.attempt_count) + 1,
      last_attempt_at: now,
      request_payload: requestSnapshot,
      response_payload: {
        code: args.code,
        message: args.message,
        ...(args.response || {}),
      },
      adapter_version: ADAPTER_VERSION,
      environment:
        fiscalMode === 'TEST' || fiscalMode === 'LIVE' ? fiscalMode : null,
      last_error: args.status === 'SUBMITTED' ? null : args.message,
      updated_at: now,
      ...(args.extra || {}),
    }
    const { error } = await serviceClient
      .from('invoice_fiscalization')
      .upsert(payload, { onConflict: 'invoice_id' })
    if (error) console.error('hr-fiscalization audit write failed', error.message)
  }

  if (practiceDocument) {
    const message = 'Probni dokument nije dopušteno slati u fiskalizaciju.'
    await audit({ status: 'NOT_APPLICABLE', code: 'PRACTICE_DOCUMENT', message })
    return json(409, { ok: false, code: 'PRACTICE_DOCUMENT', message })
  }
  if (countryCode !== 'HR') {
    const message = 'Hrvatski F1 adapter radi samo za hrvatsku tvrtku/obrt.'
    await audit({ status: 'NOT_APPLICABLE', code: 'NON_HR_COMPANY', message })
    return json(409, { ok: false, code: 'NON_HR_COMPANY', message })
  }
  if (fiscalMode === 'OFF') {
    const message = 'Fiskalizacija je isključena za aktivnu tvrtku.'
    await audit({ code: 'FISCALIZATION_OFF', message })
    return json(409, { ok: false, code: 'FISCALIZATION_OFF', message })
  }
  if (channel !== 'F1') {
    const message =
      channel === 'E_INVOICE'
        ? 'eRačun koristi zaseban UBL kanal i ne šalje se kroz F1.'
        : 'Račun nema F1 fiskalizacijski kanal.'
    await audit({ status: 'NOT_APPLICABLE', code: 'NOT_F1_CHANNEL', message })
    return json(409, { ok: false, code: 'NOT_F1_CHANNEL', message })
  }
  if (!isOib(companyOib)) {
    const message = 'Hrvatska tvrtka mora imati OIB od 11 znamenki.'
    await audit({ code: 'COMPANY_OIB_INVALID', message })
    return json(409, { ok: false, code: 'COMPANY_OIB_INVALID', message })
  }
  if (!isOib(operatorOib)) {
    const message = 'OIB operatora mora imati točno 11 znamenki.'
    await audit({ code: 'OPERATOR_OIB_INVALID', message })
    return json(409, { ok: false, code: 'OPERATOR_OIB_INVALID', message })
  }
  if (!isPremiseCode(premiseCode) || !isDeviceCode(deviceCode)) {
    const message = 'Poslovni prostor ili naplatni uređaj nisu ispravno označeni.'
    await audit({ code: 'FISCAL_IDENTITY_INVALID', message })
    return json(409, { ok: false, code: 'FISCAL_IDENTITY_INVALID', message })
  }
  if (sequenceScope !== 'P' && sequenceScope !== 'N') {
    const message = 'Slijed brojeva računa mora biti P ili N.'
    await audit({ code: 'SEQUENCE_SCOPE_INVALID', message })
    return json(409, { ok: false, code: 'SEQUENCE_SCOPE_INVALID', message })
  }
  if (recipientOib && !isOib(recipientOib)) {
    const message = 'OIB primatelja mora imati 11 znamenki.'
    await audit({ code: 'RECIPIENT_OIB_INVALID', message })
    return json(409, { ok: false, code: 'RECIPIENT_OIB_INVALID', message })
  }
  if (recipientOib && paymentCode === 'T') {
    const message =
      'F1 račun s OIB-om primatelja ne koristi način plaćanja T; koristi odgovarajući B2B/eRačun tok.'
    await audit({ code: 'RECIPIENT_OIB_WITH_TRANSFER_NOT_ALLOWED', message })
    return json(409, {
      ok: false,
      code: 'RECIPIENT_OIB_WITH_TRANSFER_NOT_ALLOWED',
      message,
    })
  }
  if (totals.total <= 0) {
    const message = 'Ukupan iznos računa mora biti veći od nule.'
    await audit({ code: 'INVOICE_TOTAL_INVALID', message })
    return json(409, { ok: false, code: 'INVOICE_TOTAL_INVALID', message })
  }

  const positiveVatGroups = allVatGroups.filter((group) => group.rate > 0)
  if (!vatRegistered && totals.vat > 0) {
    const message =
      'Tvrtka je označena izvan sustava PDV-a, ali račun sadrži PDV. Ispravite postavke ili stavke prije fiskalizacije.'
    await audit({ code: 'VAT_MEMBERSHIP_CONFLICT', message })
    return json(409, { ok: false, code: 'VAT_MEMBERSHIP_CONFLICT', message })
  }
  if (vatRegistered && totals.vat > 0 && positiveVatGroups.length === 0) {
    const message = 'PDV strukturu računa nije moguće izgraditi iz postojećih stavki.'
    await audit({ code: 'VAT_STRUCTURE_INVALID', message })
    return json(409, { ok: false, code: 'VAT_STRUCTURE_INVALID', message })
  }

  const certificateConfigured = fiscalSettings.certificate_configured === true
  if (!certificateConfigured) {
    const message = 'Fiskalni certifikat još nije označen kao konfiguriran.'
    await audit({ code: 'CERTIFICATE_NOT_CONFIGURED', message })
    return json(503, { ok: false, code: 'CERTIFICATE_NOT_CONFIGURED', message })
  }

  let secrets: { privateKeyPem: string; certificatePem: string }
  try {
    secrets = readFiscalSecrets()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fiskalni secrets nisu dostupni.'
    await audit({ code: 'CERTIFICATE_SECRETS_MISSING', message })
    return json(503, { ok: false, code: 'CERTIFICATE_SECRETS_MISSING', message })
  }

  const transportEnabled = Deno.env.get('HR_FISCAL_TRANSPORT_ENABLED') === 'true'
  if (!transportEnabled) {
    const message =
      'F1 podaci i certifikat su spremni, ali transport je sigurnosno zaključan dok ne pokrenemo kontrolirani TEST.'
    await audit({
      status: fiscalMode === 'TEST' ? 'READY_FOR_TEST' : 'NOT_SUBMITTED',
      code: 'TRANSPORT_LOCKED',
      message,
    })
    return json(503, {
      ok: false,
      code: 'TRANSPORT_LOCKED',
      message,
      environment: fiscalMode,
      channel,
      adapterVersion: ADAPTER_VERSION,
    })
  }

  if (fiscalMode === 'LIVE' && Deno.env.get('HR_FISCAL_LIVE_ENABLED') !== 'true') {
    const message =
      'LIVE slanje je dodatno zaključano. Prvo mora uspješno proći kontrolirani TEST.'
    await audit({ code: 'LIVE_LOCKED', message })
    return json(503, { ok: false, code: 'LIVE_LOCKED', message })
  }

  const { data: identityRows, error: identityError } = await userClient.rpc(
    'reserve_hr_fiscal_invoice_identity',
    { p_invoice_id: invoiceId },
  )
  if (identityError || !Array.isArray(identityRows) || !identityRows[0]) {
    const message = 'Nije moguće sigurno rezervirati službeni broj F1 računa.'
    await audit({ code: 'FISCAL_NUMBER_RESERVATION_FAILED', message })
    return json(500, { ok: false, code: 'FISCAL_NUMBER_RESERVATION_FAILED', message })
  }

  const identity = asRecord(identityRows[0])
  const sequenceNumber = numberValue(identity.fiscal_sequence_number)
  const fiscalInvoiceNumber = text(identity.fiscal_invoice_number)
  const fiscalIssuedAt = text(identity.fiscal_issued_at)
  const issuedXml = formatFiscalDateTime(fiscalIssuedAt, 'T')
  const issuedZki = formatFiscalDateTime(fiscalIssuedAt, ' ')
  const messageId = crypto.randomUUID()
  const messageDateTime = formatFiscalDateTime(new Date(), 'T')
  const zki = generateZki({
    companyOib,
    issuedAtForZki: issuedZki,
    sequenceNumber,
    premiseCode,
    deviceCode,
    total: totals.total,
    privateKeyPem: secrets.privateKeyPem,
  })

  requestSnapshot = {
    ...requestSnapshot,
    messageId,
    fiscalSequenceNumber: sequenceNumber,
    fiscalInvoiceNumber,
    fiscalIssuedAt,
    issuedXml,
    zki,
  }

  let signedXml = ''
  let envelope = ''
  try {
    const unsigned = buildUnsignedRacunZahtjev({
      messageId,
      messageDateTime,
      companyOib,
      vatRegistered,
      issuedAt: issuedXml,
      sequenceScope: sequenceScope as 'P' | 'N',
      sequenceNumber,
      premiseCode,
      deviceCode,
      vatGroups: vatRegistered ? positiveVatGroups : [],
      total: totals.total,
      paymentCode,
      operatorOib,
      zki,
      recipientOib: recipientOib || undefined,
    })
    signedXml = signRacunZahtjev(
      unsigned,
      secrets.privateKeyPem,
      secrets.certificatePem,
    )
    envelope = soapEnvelope(signedXml)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Nije moguće potpisati F1 XML.'
    await audit({
      status: 'FAILED',
      code: 'SIGNING_FAILED',
      message,
      extra: {
        zki,
        fiscal_sequence_number: sequenceNumber,
        fiscal_invoice_number: fiscalInvoiceNumber,
        fiscal_issued_at: fiscalIssuedAt,
        request_message_id: messageId,
      },
    })
    return json(500, { ok: false, code: 'SIGNING_FAILED', message })
  }

  const endpoint = fiscalMode === 'LIVE' ? LIVE_ENDPOINT : TEST_ENDPOINT
  await audit({
    status: 'SUBMITTING',
    code: 'SUBMITTING',
    message: 'Potpisani F1 zahtjev šalje se Poreznoj.',
    extra: {
      zki,
      fiscal_sequence_number: sequenceNumber,
      fiscal_invoice_number: fiscalInvoiceNumber,
      fiscal_issued_at: fiscalIssuedAt,
      request_message_id: messageId,
    },
  })

  let response: Response
  let responseText = ''
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        Accept: 'text/xml, application/xml',
      },
      body: envelope,
      signal: AbortSignal.timeout(20_000),
    })
    responseText = await response.text()
  } catch (error) {
    const message =
      error instanceof Error
        ? `Porezna TEST/LIVE transport nije uspio: ${error.message}`
        : 'Porezna TEST/LIVE transport nije uspio.'
    await audit({
      status: 'FAILED',
      code: 'TRANSPORT_FAILED',
      message,
      extra: {
        zki,
        fiscal_sequence_number: sequenceNumber,
        fiscal_invoice_number: fiscalInvoiceNumber,
        fiscal_issued_at: fiscalIssuedAt,
        request_message_id: messageId,
      },
    })
    return json(502, { ok: false, code: 'TRANSPORT_FAILED', message })
  }

  const jir = firstXmlValue(responseText, 'Jir')
  const responseMessageId = firstXmlValue(responseText, 'IdPoruke')
  const fiscalErrors = parseFiscalErrors(responseText)

  if (!response.ok || !jir) {
    const message =
      fiscalErrors.map((item) => `${item.code}: ${item.message}`).join(' | ') ||
      `Porezna nije vratila JIR (HTTP ${response.status}).`
    await audit({
      status: 'FAILED',
      code: 'POREZNA_REJECTED',
      message,
      response: {
        httpStatus: response.status,
        errors: fiscalErrors,
        responseMessageId: responseMessageId || null,
      },
      extra: {
        zki,
        fiscal_sequence_number: sequenceNumber,
        fiscal_invoice_number: fiscalInvoiceNumber,
        fiscal_issued_at: fiscalIssuedAt,
        request_message_id: messageId,
      },
    })
    return json(502, {
      ok: false,
      code: 'POREZNA_REJECTED',
      message,
      environment: fiscalMode,
      channel,
      adapterVersion: ADAPTER_VERSION,
    })
  }

  const successMessage = 'Račun je fiskaliziran i Porezna je vratila stvarni JIR.'
  await audit({
    status: 'SUBMITTED',
    code: 'SUBMITTED',
    message: successMessage,
    response: {
      httpStatus: response.status,
      responseMessageId: responseMessageId || null,
      jir,
    },
    extra: {
      jir,
      zki,
      external_id: responseMessageId || messageId,
      fiscal_sequence_number: sequenceNumber,
      fiscal_invoice_number: fiscalInvoiceNumber,
      fiscal_issued_at: fiscalIssuedAt,
      request_message_id: messageId,
      submitted_at: new Date().toISOString(),
    },
  })

  return json(200, {
    ok: true,
    code: 'SUBMITTED',
    message: successMessage,
    environment: fiscalMode,
    channel,
    adapterVersion: ADAPTER_VERSION,
    jir,
    zki,
    externalId: responseMessageId || messageId,
    fiscalInvoiceNumber,
  })
})
