import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ADAPTER_VERSION = 'hr-fiscalization-gateway-v1'

type JsonRecord = Record<string, unknown>

type FiscalStatus =
  | 'NOT_SUBMITTED'
  | 'READY_FOR_TEST'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'NOT_APPLICABLE'

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

function canonicalRequestSnapshot(args: {
  invoice: JsonRecord
  invoiceData: JsonRecord
  company: JsonRecord
  fiscalSettings: JsonRecord
  fiscalRow: JsonRecord
}) {
  const { invoice, invoiceData, company, fiscalSettings, fiscalRow } = args
  const complianceSnapshot = asRecord(invoiceData.complianceSnapshot)

  return {
    schemaVersion: 1,
    adapterVersion: ADAPTER_VERSION,
    countryCode: text(company.country_code) || text(complianceSnapshot.countryCode) || 'HR',
    environment: text(fiscalSettings.fiscal_mode),
    channel: text(fiscalRow.channel) || 'NONE',
    invoiceId: text(invoice.id),
    invoiceNumber: text(invoice.invoice_number),
    issueDate: text(invoice.issue_date),
    customerScope: inferCustomerScope(invoiceData),
    paymentMethod: text(invoiceData.paymentMethod),
    currency: text(company.currency) || 'EUR',
    totals: calculateTotals(invoiceData),
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

  const { data: activeCompanyId, error: activeCompanyError } = await userClient.rpc(
    'current_company_id',
  )

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
          'company_id, operating_mode, fiscal_mode, provider, business_premise_code, device_code, operator_tax_id, certificate_configured',
        )
        .eq('company_id', companyId)
        .maybeSingle(),
      serviceClient
        .from('invoice_fiscalization')
        .select(
          'invoice_id, company_id, country_code, channel, status, business_premise_code, device_code, operator_tax_id, jir, zki, external_id, attempt_count',
        )
        .eq('invoice_id', invoiceId)
        .eq('company_id', companyId)
        .maybeSingle(),
    ])

  if (invoiceResult.error || companyResult.error || fiscalSettingsResult.error || fiscalResult.error) {
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

  const countryCode = text(company.country_code) || text(complianceSnapshot.countryCode)
  const operatingMode = text(fiscalSettings.operating_mode)
  const fiscalMode = text(fiscalSettings.fiscal_mode)
  const channel = text(fiscalRow.channel) || 'NONE'
  const practiceDocument =
    operatingMode === 'LEARNING' || complianceSnapshot.practiceDocument === true

  const requestSnapshot = canonicalRequestSnapshot({
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
      business_premise_code: text(fiscalSettings.business_premise_code),
      device_code: text(fiscalSettings.device_code),
      operator_tax_id: text(fiscalSettings.operator_tax_id),
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
      environment: fiscalMode === 'TEST' || fiscalMode === 'LIVE' ? fiscalMode : null,
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
    const message = 'Hrvatski fiskalizacijski adapter može obrađivati samo tvrtke iz Hrvatske.'
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
      'eRačun koristi zaseban UBL/posrednički kanal koji još nije povezan s produkcijskim transportom.'
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

  if (
    !text(fiscalSettings.business_premise_code) ||
    !text(fiscalSettings.device_code) ||
    !text(fiscalSettings.operator_tax_id)
  ) {
    const message =
      'Nedostaju poslovni prostor, naplatni uređaj ili porezni broj operatora (OIB).'
    await audit({ code: 'FISCAL_IDENTITY_INCOMPLETE', message })
    return json(409, { ok: false, code: 'FISCAL_IDENTITY_INCOMPLETE', message })
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

  // Deliberate hard stop: secrets are now server-side, but real Porezna XML/SOAP
  // signing and TEST transport must be implemented and verified before this flag
  // can ever allow a submission. We never generate fake ZKI/JIR values.
  const transportEnabled = Deno.env.get('HR_FISCAL_TRANSPORT_ENABLED') === 'true'
  const message = transportEnabled
    ? 'Porezna transport je zatražen, ali službeni XML/SOAP potpisni adapter još nije implementiran i verificiran.'
    : 'Server gateway je spreman, ali slanje Poreznoj ostaje zaključano dok TEST adapter i certifikat ne prođu provjeru.'

  await audit({
    status: fiscalMode === 'TEST' ? 'READY_FOR_TEST' : 'NOT_SUBMITTED',
    code: 'PROVIDER_ADAPTER_NOT_IMPLEMENTED',
    message,
    response: { transportEnabled },
  })

  return json(503, {
    ok: false,
    code: 'PROVIDER_ADAPTER_NOT_IMPLEMENTED',
    message,
    environment: fiscalMode,
    channel,
    adapterVersion: ADAPTER_VERSION,
  })
})
