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
  canSubmit: boolean
  reason: string
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

  const certificateConfigured = Boolean(fiscalRow?.certificate_configured)

  // Važno: certifikat sam po sebi nije dovoljan. Adapter prema Poreznoj / ovlaštenom
  // informacijskom posredniku mora biti implementiran i proći testnu provjeru.
  const providerAdapterImplemented = false
  const canSubmit = enabled && certificateConfigured && providerAdapterImplemented

  let reason = ''
  if (!enabled) {
    reason = 'Fiskalizacija za aktivnu tvrtku nije uključena.'
  } else if (!certificateConfigured) {
    reason = 'Nije povezan fiskalni certifikat ili ovlašteni posrednik.'
  } else if (!providerAdapterImplemented) {
    reason = 'Produkcijski adapter za slanje Poreznoj još nije aktiviran i certificiran.'
  }

  return {
    enabled,
    countryCode: compliance.countryCode,
    mode: compliance.fiscalization.mode,
    provider: compliance.fiscalization.provider,
    certificateConfigured,
    canSubmit,
    reason,
  }
}

export async function submitInvoiceFiscalization(_invoiceId: string): Promise<never> {
  const state = await getFiscalizationGatewayState()

  throw new Error(
    state.reason ||
      'Produkcijsko slanje fiskalizacije nije aktivirano. Potrebno je povezati službeni certifikat/posrednika i proći testnu provjeru prije slanja stvarnih računa.',
  )
}
