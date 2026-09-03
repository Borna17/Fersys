import { supabase } from '../lib/supabase'
import { getTaxIdLabel } from './taxIdentity.service'

export type CompanyOperatingMode = 'LEARNING' | 'BUSINESS'
export type FiscalizationMode = 'OFF' | 'TEST' | 'LIVE'

export type CompanyCountryCode =
  | 'HR'
  | 'BA'
  | 'RS'
  | 'SI'
  | 'ME'
  | 'MK'
  | 'XK'
  | 'OTHER'

export type CompanyFiscalizationSettings = {
  mode: FiscalizationMode
  provider: string
  businessPremiseCode: string
  deviceCode: string
  operatorTaxId: string
  certificateConfigured: boolean
}

export type CompanyComplianceSettings = {
  schemaVersion: 1
  operatingMode: CompanyOperatingMode
  countryCode: CompanyCountryCode
  currency: string
  taxIdLabel: string
  fiscalization: CompanyFiscalizationSettings
}

const COUNTRY_ALIASES: Record<string, CompanyCountryCode> = {
  HR: 'HR',
  HRVATSKA: 'HR',
  CROATIA: 'HR',
  BA: 'BA',
  BIH: 'BA',
  BOSNA: 'BA',
  'BOSNA I HERCEGOVINA': 'BA',
  'BOSNIA AND HERZEGOVINA': 'BA',
  RS: 'RS',
  SRBIJA: 'RS',
  SERBIA: 'RS',
  SI: 'SI',
  SLOVENIJA: 'SI',
  SLOVENIA: 'SI',
  ME: 'ME',
  'CRNA GORA': 'ME',
  MONTENEGRO: 'ME',
  MK: 'MK',
  MAKEDONIJA: 'MK',
  'SJEVERNA MAKEDONIJA': 'MK',
  'NORTH MACEDONIA': 'MK',
  XK: 'XK',
  KOSOVO: 'XK',
}

const DEFAULT_CURRENCY: Record<CompanyCountryCode, string> = {
  HR: 'EUR',
  BA: 'BAM',
  RS: 'RSD',
  SI: 'EUR',
  ME: 'EUR',
  MK: 'MKD',
  XK: 'EUR',
  OTHER: 'EUR',
}

const COUNTRY_NAME: Record<CompanyCountryCode, string> = {
  HR: 'Hrvatska',
  BA: 'Bosna i Hercegovina',
  RS: 'Srbija',
  SI: 'Slovenija',
  ME: 'Crna Gora',
  MK: 'Sjeverna Makedonija',
  XK: 'Kosovo',
  OTHER: 'Druga država',
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeCompanyCountryCode(value: unknown): CompanyCountryCode {
  const normalized = text(value).toLocaleUpperCase('hr-HR')
  return COUNTRY_ALIASES[normalized] ?? 'OTHER'
}

export function getCompanyCountryName(code: CompanyCountryCode): string {
  return COUNTRY_NAME[code]
}

export function createDefaultCompanyComplianceSettings(
  country?: unknown,
): CompanyComplianceSettings {
  const countryCode = normalizeCompanyCountryCode(country)

  return {
    schemaVersion: 1,
    operatingMode: 'LEARNING',
    countryCode,
    currency: DEFAULT_CURRENCY[countryCode],
    taxIdLabel: getTaxIdLabel(countryCode),
    fiscalization: {
      mode: 'OFF',
      provider: countryCode === 'HR' ? 'CROATIA_TAX_AUTHORITY' : '',
      businessPremiseCode: '',
      deviceCode: '',
      operatorTaxId: '',
      certificateConfigured: false,
    },
  }
}

export function parseCompanyComplianceSettings(
  value: unknown,
  fallbackCountry?: unknown,
): CompanyComplianceSettings {
  const fallback = createDefaultCompanyComplianceSettings(fallbackCountry)

  if (!isObject(value)) return fallback

  const countryCode = normalizeCompanyCountryCode(
    value.countryCode || fallback.countryCode,
  )
  const fiscal = isObject(value.fiscalization) ? value.fiscalization : {}
  const fiscalMode: FiscalizationMode =
    fiscal.mode === 'TEST' || fiscal.mode === 'LIVE' || fiscal.mode === 'OFF'
      ? fiscal.mode
      : 'OFF'

  return {
    schemaVersion: 1,
    operatingMode:
      value.operatingMode === 'BUSINESS' ? 'BUSINESS' : 'LEARNING',
    countryCode,
    currency: text(value.currency) || DEFAULT_CURRENCY[countryCode],
    taxIdLabel: getTaxIdLabel(countryCode),
    fiscalization: {
      mode: fiscalMode,
      provider:
        text(fiscal.provider) ||
        (countryCode === 'HR' ? 'CROATIA_TAX_AUTHORITY' : ''),
      businessPremiseCode: text(fiscal.businessPremiseCode),
      deviceCode: text(fiscal.deviceCode),
      operatorTaxId: text(fiscal.operatorTaxId),
      certificateConfigured: Boolean(fiscal.certificateConfigured),
    },
  }
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_company_id')
  if (error) throw error
  if (!data) {
    throw new Error('Prijavljeni korisnik nije povezan s aktivnom tvrtkom.')
  }
  return String(data)
}

export async function getCompanyComplianceSettings(): Promise<CompanyComplianceSettings> {
  const companyId = await getCurrentCompanyId()

  const [companyResponse, fiscalResponse] = await Promise.all([
    supabase
      .from('companies')
      .select('country,country_code,currency,profile_settings')
      .eq('id', companyId)
      .single(),
    supabase
      .from('company_fiscal_settings')
      .select(
        'operating_mode,fiscal_mode,provider,business_premise_code,device_code,operator_tax_id,certificate_configured',
      )
      .eq('company_id', companyId)
      .maybeSingle(),
  ])

  if (companyResponse.error) throw companyResponse.error
  if (fiscalResponse.error) throw fiscalResponse.error

  const company = companyResponse.data
  const profile = isObject(company?.profile_settings) ? company.profile_settings : {}
  const countryCode = normalizeCompanyCountryCode(
    company?.country_code || company?.country,
  )
  const fallback = parseCompanyComplianceSettings(profile.compliance, countryCode)
  const fiscal = fiscalResponse.data

  return {
    ...fallback,
    countryCode,
    currency: text(company?.currency) || fallback.currency,
    taxIdLabel: getTaxIdLabel(countryCode),
    operatingMode:
      fiscal?.operating_mode === 'LEARNING' ? 'LEARNING' : fiscal?.operating_mode === 'BUSINESS' ? 'BUSINESS' : fallback.operatingMode,
    fiscalization: {
      mode:
        fiscal?.fiscal_mode === 'TEST' || fiscal?.fiscal_mode === 'LIVE' || fiscal?.fiscal_mode === 'OFF'
          ? fiscal.fiscal_mode
          : fallback.fiscalization.mode,
      provider: text(fiscal?.provider) || fallback.fiscalization.provider,
      businessPremiseCode:
        text(fiscal?.business_premise_code) || fallback.fiscalization.businessPremiseCode,
      deviceCode: text(fiscal?.device_code) || fallback.fiscalization.deviceCode,
      operatorTaxId: text(fiscal?.operator_tax_id) || fallback.fiscalization.operatorTaxId,
      certificateConfigured:
        typeof fiscal?.certificate_configured === 'boolean'
          ? fiscal.certificate_configured
          : fallback.fiscalization.certificateConfigured,
    },
  }
}

export async function updateCompanyComplianceSettings(
  input: CompanyComplianceSettings,
): Promise<CompanyComplianceSettings> {
  const companyId = await getCurrentCompanyId()

  const { data: current, error: readError } = await supabase
    .from('companies')
    .select('country,profile_settings')
    .eq('id', companyId)
    .single()

  if (readError) throw readError

  const currentProfile = isObject(current?.profile_settings)
    ? current.profile_settings
    : {}
  const normalized = parseCompanyComplianceSettings(input, input.countryCode)

  // Fiskalizacija druge države nikad se ne smije slučajno prebaciti na HR adapter.
  if (normalized.countryCode !== 'HR') {
    normalized.fiscalization.mode = 'OFF'
    normalized.fiscalization.provider = ''
    normalized.fiscalization.certificateConfigured = false
  }

  const countryName =
    normalized.countryCode === 'OTHER' && text(current?.country)
      ? text(current?.country)
      : getCompanyCountryName(normalized.countryCode)

  const { error: companyError } = await supabase
    .from('companies')
    .update({
      country_code: normalized.countryCode,
      country: countryName,
      currency: normalized.currency,
      profile_settings: {
        ...currentProfile,
        compliance: normalized,
      },
    })
    .eq('id', companyId)

  if (companyError) throw companyError

  const { error: fiscalError } = await supabase
    .from('company_fiscal_settings')
    .upsert({
      company_id: companyId,
      operating_mode: normalized.operatingMode,
      fiscal_mode: normalized.fiscalization.mode,
      provider: normalized.fiscalization.provider,
      business_premise_code: normalized.fiscalization.businessPremiseCode,
      device_code: normalized.fiscalization.deviceCode,
      operator_tax_id: normalized.fiscalization.operatorTaxId,
      certificate_configured: normalized.fiscalization.certificateConfigured,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })

  if (fiscalError) throw fiscalError
  return normalized
}

export function isFiscalizationEnabled(settings: CompanyComplianceSettings) {
  return (
    settings.operatingMode === 'BUSINESS' &&
    settings.fiscalization.mode !== 'OFF'
  )
}

export function isCroatianFiscalizationEnabled(settings: CompanyComplianceSettings) {
  return settings.countryCode === 'HR' && isFiscalizationEnabled(settings)
}
