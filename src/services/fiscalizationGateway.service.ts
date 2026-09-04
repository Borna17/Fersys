import { supabase } from '../lib/supabase'
import {
  getCompanyComplianceSettings,
  isCroatianFiscalizationEnabled,
} from './companyCompliance.service'

export type FiscalizationGatewayState = {
  enabled: boolean
  countryCode: string
  mode: 'OFF' | 'TEST' | 'LIVE'
  provider: string
  certificateConfigured: boolean
  serverGatewayAvailable: boolean
  productionTransportReady: boolean
  canSubmit: boolean
  reason: string
}

export type FiscalizationSubmissionResult = {
  ok: boolean
  code: string
  message: string
  environment?: 'TEST' | 'LIVE'
  channel?: 'F1' | 'E_INVOICE' | 'NONE'
  adapterVersion?: string
  jir?: string
  zki?: string
  externalId?: string
}

function normalizeSubmissionResult(
  value: unknown,
): FiscalizationSubmissionResult | null {
  if (!value || typeof value !== 'object') return null

  const data = value as Record<string, unknown>
  const code =
    typeof data.code === 'string' ? data.code : ''
  const message =
    typeof data.message === 'string'
      ? data.message
      : ''

  if (!code && !message) return null

  const environment =
    data.environment === 'TEST' ||
    data.environment === 'LIVE'
      ? data.environment
      : undefined

  const channel =
    data.channel === 'F1' ||
    data.channel === 'E_INVOICE' ||
    data.channel === 'NONE'
      ? data.channel
      : undefined

  return {
    ok: data.ok === true,
    code: code || 'FISCALIZATION_ERROR',
    message:
      message ||
      'Fiskalizacijski server nije vratio opis greške.',
    environment,
    channel,
    adapterVersion:
      typeof data.adapterVersion === 'string'
        ? data.adapterVersion
        : undefined,
    jir:
      typeof data.jir === 'string'
        ? data.jir
        : undefined,
    zki:
      typeof data.zki === 'string'
        ? data.zki
        : undefined,
    externalId:
      typeof data.externalId === 'string'
        ? data.externalId
        : undefined,
  }
}

export async function getFiscalizationGatewayState(): Promise<FiscalizationGatewayState> {
  const compliance = await getCompanyComplianceSettings()
  const enabled = isCroatianFiscalizationEnabled(compliance)

  const { data: companyId, error: companyIdError } = await supabase.rpc(
    'current_company_id',
  )

  if (companyIdError) throw companyIdError

  const { data: fiscalRow, error } = companyId
    ? await supabase
        .from('company_fiscal_settings')
        .select('certificate_configured')
        .eq('company_id', String(companyId))
        .maybeSingle()
    : { data: null, error: null }

  if (error) throw error

  const certificateConfigured = Boolean(
    fiscalRow?.certificate_configured,
  )

  // Server-side gateway exists and owns all future certificate/signing work.
  // Production transport remains deliberately locked until the official
  // Porezna TEST XML/SOAP adapter is implemented and verified with a real
  // certificate. The browser must never receive a private key or certificate
  // password and can never invent JIR/ZKI values.
  const serverGatewayAvailable = true
  const productionTransportReady = false
  const canSubmit =
    enabled &&
    certificateConfigured &&
    serverGatewayAvailable &&
    productionTransportReady

  let reason = ''
  if (!enabled) {
    reason = 'Fiskalizacija za aktivnu tvrtku nije uključena.'
  } else if (!certificateConfigured) {
    reason =
      'Nije povezan službeni fiskalni certifikat na sigurnom FERSYS serveru.'
  } else if (!productionTransportReady) {
    reason =
      'Sigurni server gateway je postavljen, ali Porezna TEST/LIVE XML/SOAP adapter još nije verificiran.'
  }

  return {
    enabled,
    countryCode: compliance.countryCode,
    mode: compliance.fiscalization.mode,
    provider: compliance.fiscalization.provider,
    certificateConfigured,
    serverGatewayAvailable,
    productionTransportReady,
    canSubmit,
    reason,
  }
}

async function readFunctionError(
  error: unknown,
): Promise<FiscalizationSubmissionResult | null> {
  if (!error || typeof error !== 'object') return null

  const context = (
    error as {
      context?: unknown
    }
  ).context

  if (
    typeof Response !== 'undefined' &&
    context instanceof Response
  ) {
    try {
      const payload = await context.clone().json()
      return normalizeSubmissionResult(payload)
    } catch {
      return null
    }
  }

  return null
}

export async function submitInvoiceFiscalization(
  invoiceId: string,
): Promise<FiscalizationSubmissionResult> {
  const cleanInvoiceId = invoiceId.trim()
  if (!cleanInvoiceId) {
    throw new Error('Nedostaje ID računa za fiskalizaciju.')
  }

  const state = await getFiscalizationGatewayState()

  if (!state.enabled) {
    throw new Error(state.reason)
  }

  // Even before the real transport is enabled, invoking the authenticated
  // server boundary gives us one authoritative readiness/audit path. It still
  // refuses to submit until server secrets + the verified Porezna adapter are
  // available.
  const { data, error } = await supabase.functions.invoke(
    'hr-fiscalization',
    {
      body: {
        invoiceId: cleanInvoiceId,
      },
    },
  )

  if (error) {
    const serverError = await readFunctionError(error)
    if (serverError) {
      throw new Error(serverError.message)
    }

    throw new Error(
      error.message ||
        state.reason ||
        'Fiskalizacijski server nije dostupan.',
    )
  }

  const result = normalizeSubmissionResult(data)
  if (!result) {
    throw new Error(
      'Fiskalizacijski server vratio je neispravan odgovor.',
    )
  }

  if (!result.ok) {
    throw new Error(result.message)
  }

  // A successful result may only contain real values returned by the server
  // provider adapter. Client-side JIR/ZKI generation is intentionally absent.
  return result
}
