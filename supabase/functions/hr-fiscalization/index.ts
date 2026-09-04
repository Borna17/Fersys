import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ADAPTER_VERSION = 'hr-fiscalization-gateway-v2'
const TEST_ENDPOINT = 'https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest'
const LIVE_ENDPOINT = 'https://cis.porezna-uprava.hr:8449/FiskalizacijaService'

type JsonRecord = Record<string, unknown>
type FiscalStatus =
  | 'NOT_SUBMITTED'
  | 'READY_FOR_TEST'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'NOT_APPLICABLE'
type PaymentCode = 'G' | 'K' | 'T' | 'O'

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

function inferCustomerScope(invoiceData: JsonRecord) {
  const customerType = text(invoiceData.customerType).toLocaleLowerCase('hr-HR')
  const taxId = text(invoiceData.oib || invoiceData.customerTaxId)

  if (
    customerType.includes('tvrt') ||
    customerType.includes('obrt') ||
    customerType.includes('company') ||
    customerType.includes('zgrad') ||
    taxId
  ) {
    return 'B2B'
  }

  return 'B2C'
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

function buildVatGroups(invoiceData: JsonRecord) {
  const items = Array.isArray(invoiceData.items) ? invoiceData.items : []
  const grouped = new Map<number, { rate: number; base: number; tax: number }>()

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

function canonicalRequestSnapshot(args: {
  invoice: JsonRecord
  invoiceData: JsonRecord
  company: JsonRecord
  fiscalSettings: JsonRecord
  fiscalRow: JsonRecord
}) {
  const { invoice, invoiceData, company, fiscalSettings, fiscalRow } = args
  const complianceSnapshot = asRecord(invoiceData.complianceSnapshot)
  const mode = text(fiscalSettings.fiscal_mode)
  const paymentCode = paymentCodeFromLabel(invoiceData.paymentMethod)

  return {
    schemaVersion: 2,
    adapterVersion: ADAPTER_VERSION,
    specificationTarget: 'F1-v2.7',
    countryCode:
      text(company.country_code) || text(complianceSnapshot.countryCode) || 'HR',
    environment: mode,
    endpoint: mode === 'LIVE' ? LIVE_ENDPOINT : TEST_ENDPOINT,
    channel: text(fiscalRow.channel) || 'NONE',
    invoiceId: text(invoice.id),
    displayInvoiceNumber: text(invoice.invoice_number),
    fiscalSequenceNumber: numberValue(fiscalRow.fiscal_sequence_number) || null,
    fiscalInvoiceNumber: text(fiscalRow.fiscal_invoice_number) || null,
    fiscalIssuedAt: text(fiscalRow.fiscal_issued_at) || null,
    customerScope: inferCustomerScope(invoiceData),
    recipientOib: text(invoiceData.oib || invoiceData.customerTaxId) || null,
    paymentMethod: text(invoiceData.paymentMethod),
    paymentCode,
    currency: text(company.currency) || 'EUR',
    totals: calculateTotals(invoiceData),
    vatGroups: buildVatGroups(invoiceData),
    vatRegistered: fiscalSettings.vat_registered === true,
    sequenceScope: text(fiscalSettings.sequence_scope) || 'P',
    businessPremiseCode: text(fiscalSettings.business_premise_code),
    deviceCode: text(fiscalSettings.device_code),
    operatorTaxId: text(fiscalSettings.operator_tax_id),
    companyTaxId: text(company.tax_id || company.oib),
    practiceDocument: complianceSnapshot.practiceDocument === true,
  }
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
          'invoice_id, company_id, country_code, channel, status, business_premise_code, device_code, operator_tax_id, jir, zki, external_id, attempt_count, fiscal_sequence_number, fiscal_invoice_number, fiscal_issued_at, payment_code',
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
  const recipientOib = text(invoiceData.oib || invoiceData.customerTaxId)
  const paymentCode = paymentCodeFromLabel(invoiceData.paymentMethod)
  const practiceDocument =
    operatingMode === 'LEARNING' || complianceSnapshot.practiceDocument === true

  let requestSnapshot = canonicalRequestSnapshot({
    invoice,
    invoiceData,
    company,
    fiscalSettings,
    fiscalRow,
  })

  async function audit(args: {
    status?: FiscalStatus
    code: string
    message: string
    response?: JsonRecord
  }) {
    const attemptCount = numberValue(fiscalRow.attempt_count) + 1
    const now = new Date().toISOString()
    const nextStatus = args.status || text(fiscalRow.status) || 'NOT_SUBMITTED'

    const payload = {
      invoice_id: invoiceId,
      company_id: companyId,
      country_code: countryCode || 'HR',
      channel,
      status: nextStatus,
      business_premise_code: premiseCode,
      device_code: deviceCode,
      operator_tax_id: operatorOib,
      payment_code: paymentCode,
      attempt_count: attemptCount,
      last_attempt_at: now,
      request_payload: requestSnapshot,
      response_payload: {
        ok: false,
        code: args.code,
        message: args.message,
        ...(args.response || {}),
      },
      adapter_version: ADAPTER_VERSION,
      environment:
        fiscalMode === 'TEST' || fiscalMode === 'LIVE' ? fiscalMode : null,
      last_error: args.message,
      updated_at: now,
    }

    const { error } = await serviceClient
      .from('invoice_fiscalization')
      .upsert(payload, { onConflict: 'invoice_id' })

    if (error) {
      console.error('hr-fiscalization audit write failed', error.message)
    }
  }

  if (practiceDocument) {
    const message = 'Probni dokument nije dopušteno slati u fiskalizaciju.'
    await audit({ status: 'NOT_APPLICABLE', code: 'PRACTICE_DOCUMENT', message })
    return json(409, { ok: false, code: 'PRACTICE_DOCUMENT', message })
  }

  if (countryCode !== 'HR') {
    const message =
      'Hrvatski fiskalizacijski adapter može obrađivati samo tvrtke iz Hrvatske.'
    await audit({ status: 'NOT_APPLICABLE', code: 'NON_HR_COMPANY', message })
    return json(409, { ok: false, code: 'NON_HR_COMPANY', message })
  }

  if (fiscalMode === 'OFF') {
    const message = 'Fiskalizacija je isključena za aktivnu tvrtku.'
    await audit({ code: 'FISCALIZATION_OFF', message })
    return json(409, { ok: false, code: 'FISCALIZATION_OFF', message })
  }

  if (channel === 'NONE') {
    const message = 'Račun nema fiskalizacijski kanal za slanje.'
    await audit({ status: 'NOT_APPLICABLE', code: 'CHANNEL_NOT_APPLICABLE', message })
    return json(409, { ok: false, code: 'CHANNEL_NOT_APPLICABLE', message })
  }

  if (channel === 'E_INVOICE') {
    const message =
      'eRačun koristi zaseban UBL/posrednički kanal i ne šalje se kroz F1 adapter.'
    await audit({ code: 'E_INVOICE_TRANSPORT_NOT_CONNECTED', message })
    return json(409, {
      ok: false,
      code: 'E_INVOICE_TRANSPORT_NOT_CONNECTED',
      message,
    })
  }

  if (channel !== 'F1') {
    const message = 'Nepoznat fiskalizacijski kanal.'
    await audit({ code: 'UNSUPPORTED_CHANNEL', message })
    return json(409, { ok: false, code: 'UNSUPPORTED_CHANNEL', message })
  }

  if (!isOib(companyOib)) {
    const message = 'Hrvatska tvrtka mora imati ispravan OIB od 11 znamenki.'
    await audit({ code: 'COMPANY_OIB_INVALID', message })
    return json(409, { ok: false, code: 'COMPANY_OIB_INVALID', message })
  }

  if (!isPremiseCode(premiseCode)) {
    const message =
      'Oznaka poslovnog prostora mora imati 1–20 slova ili znamenki.'
    await audit({ code: 'BUSINESS_PREMISE_INVALID', message })
    return json(409, { ok: false, code: 'BUSINESS_PREMISE_INVALID', message })
  }

  if (!isDeviceCode(deviceCode)) {
    const message =
      'Oznaka naplatnog uređaja mora biti broj bez vodećih nula, do 20 znamenki.'
    await audit({ code: 'DEVICE_CODE_INVALID', message })
    return json(409, { ok: false, code: 'DEVICE_CODE_INVALID', message })
  }

  if (!isOib(operatorOib)) {
    const message = 'Porezni broj operatora (OIB) mora imati točno 11 znamenki.'
    await audit({ code: 'OPERATOR_OIB_INVALID', message })
    return json(409, { ok: false, code: 'OPERATOR_OIB_INVALID', message })
  }

  if (sequenceScope !== 'P' && sequenceScope !== 'N') {
    const message = 'Slijed brojeva računa mora biti P ili N.'
    await audit({ code: 'SEQUENCE_SCOPE_INVALID', message })
    return json(409, { ok: false, code: 'SEQUENCE_SCOPE_INVALID', message })
  }

  if (recipientOib && !isOib(recipientOib)) {
    const message = 'OIB primatelja u hrvatskom F1 računu mora imati 11 znamenki.'
    await audit({ code: 'RECIPIENT_OIB_INVALID', message })
    return json(409, { ok: false, code: 'RECIPIENT_OIB_INVALID', message })
  }

  // Per the current F1 specification, recipient OIB is used for B2B fiscal
  // transactions paid by cash/card. Transaction-account payment uses the
  // eInvoice/business flow instead of sending recipient OIB through this field.
  if (recipientOib && paymentCode === 'T') {
    const message =
      'F1 račun s OIB-om primatelja ne može imati način plaćanja T. Za poslovni transakcijski račun koristi se odgovarajući eRačun/B2B kanal.'
    await audit({ code: 'RECIPIENT_OIB_WITH_TRANSFER_NOT_ALLOWED', message })
    return json(409, {
      ok: false,
      code: 'RECIPIENT_OIB_WITH_TRANSFER_NOT_ALLOWED',
      message,
    })
  }

  const totals = calculateTotals(invoiceData)
  if (totals.total <= 0) {
    const message = 'Ukupan iznos računa mora biti veći od nule.'
    await audit({ code: 'INVOICE_TOTAL_INVALID', message })
    return json(409, { ok: false, code: 'INVOICE_TOTAL_INVALID', message })
  }

  const certificateConfigured = fiscalSettings.certificate_configured === true
  const certificateBase64 = Deno.env.get('HR_FISCAL_CERT_P12_BASE64') || ''
  const certificatePassword = Deno.env.get('HR_FISCAL_CERT_PASSWORD') || ''

  if (!certificateConfigured || !certificateBase64 || !certificatePassword) {
    const message =
      'Službeni fiskalni certifikat nije sigurno konfiguriran na FERSYS serveru.'
    await audit({ code: 'CERTIFICATE_NOT_CONFIGURED', message })
    return json(503, { ok: false, code: 'CERTIFICATE_NOT_CONFIGURED', message })
  }

  const transportEnabled = Deno.env.get('HR_FISCAL_TRANSPORT_ENABLED') === 'true'

  if (!transportEnabled) {
    const message =
      'F1 podaci su validirani, ali slanje Poreznoj ostaje zaključano dok TEST XML potpis i transport ne prođu provjeru.'
    await audit({
      status: fiscalMode === 'TEST' ? 'READY_FOR_TEST' : 'NOT_SUBMITTED',
      code: 'TRANSPORT_LOCKED',
      message,
      response: {
        endpoint: fiscalMode === 'LIVE' ? LIVE_ENDPOINT : TEST_ENDPOINT,
      },
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

  // The official numeric fiscal identity must be reserved atomically, not
  // derived from FERSYS display numbers such as R-2026-001. We intentionally
  // reserve it only when transport has explicitly been enabled, immediately
  // before the future signed request would be created.
  const { data: identityRows, error: identityError } = await userClient.rpc(
    'reserve_hr_fiscal_invoice_identity',
    { p_invoice_id: invoiceId },
  )

  if (identityError || !Array.isArray(identityRows) || !identityRows[0]) {
    const message = 'Nije moguće sigurno rezervirati službeni broj F1 računa.'
    await audit({ code: 'FISCAL_NUMBER_RESERVATION_FAILED', message })
    return json(500, {
      ok: false,
      code: 'FISCAL_NUMBER_RESERVATION_FAILED',
      message,
    })
  }

  const identity = asRecord(identityRows[0])
  requestSnapshot = {
    ...requestSnapshot,
    fiscalSequenceNumber: numberValue(identity.fiscal_sequence_number),
    fiscalInvoiceNumber: text(identity.fiscal_invoice_number),
    fiscalIssuedAt: text(identity.fiscal_issued_at),
  }

  // Hard stop until cryptographic implementation is complete. The next adapter
  // must generate ZKI from the official values using the real private key,
  // sign RacunZahtjev with XMLDSig RSA-SHA256/SHA-256 and only persist JIR from
  // the actual Porezna response. No placeholders or browser-side crypto.
  const message =
    'Službeni broj je rezerviran, ali XMLDSig/ZKI transport još nije verificiran pa zahtjev nije poslan Poreznoj.'
  await audit({
    status: 'READY_FOR_TEST',
    code: 'SIGNING_ADAPTER_NOT_IMPLEMENTED',
    message,
    response: {
      endpoint: fiscalMode === 'LIVE' ? LIVE_ENDPOINT : TEST_ENDPOINT,
      fiscalInvoiceNumber: text(identity.fiscal_invoice_number),
    },
  })

  return json(503, {
    ok: false,
    code: 'SIGNING_ADAPTER_NOT_IMPLEMENTED',
    message,
    environment: fiscalMode,
    channel,
    adapterVersion: ADAPTER_VERSION,
  })
})
