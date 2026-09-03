import { supabase } from '../lib/supabase'

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

const TAX_ID_LABEL: Record<CompanyCountryCode, string> = {
  HR: 'OIB',
  BA: 'Porezni ID',
  RS: 'PIB',
  SI: 'Davčna številka',
  ME: 'PIB',
  MK: 'EDB',
  XK: 'Fiskalni broj',
  OTHER: 'Porezni broj',
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

export function createDefaultCompanyComplianceSettings(
  country?: unknown,
): CompanyComplianceSettings {
  const countryCode = normalizeCompanyCountryCode(country)

  return {
    schemaVersion: 1,
    operatingMode: 'LEARNING',
    countryCode,
    currency: DEFAULT_CURRENCY[countryCode],
    taxIdLabel: TAX_ID_LABEL[countryCode],
    fiscalization: {
      mode: 'OFF',
      provider: countryCode === 'HR' ? 'CROATIA_TAX_AUTHORITY' : '',
      businessPremiseCode: '',
      deviceCode: '',
      operatorTaxId: '',
    },
  }
}

export function parseCompanyComplianceSettings(
  value: unknown,
  fallbackCountry?: unknown,
): CompanyComplianceSettings {
  const fallback = createDefaultCompanyComplianceSettings(fallbackCountry)

  if (!isObject(value)) {
    return fallback
  }

  const countryCode = normalizeCompanyCountryCode(
    value.countryCode || fallback.countryCode,
  )

  const fiscal = isObject(value.fiscalization)
    ? value.fiscalization
    : {}

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
    taxIdLabel: text(value.taxIdLabel) || TAX_ID_LABEL[countryCode],
    fiscalization: {
      mode: fiscalMode,
      provider:
        text(fiscal.provider) ||
        (countryCode === 'HR' ? 'CROATIA_TAX_AUTHORITY' : ''),
      businessPremiseCode: text(fiscal.businessPremiseCode),
      deviceCode: text(fiscal.deviceCode),
      operatorTaxId: text(fiscal.operatorTaxId),
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

  const { data, error } = await supabase
    .from('companies')
    .select('country, currency, profile_settings')
    .eq('id', companyId)
    .single()

  if (error) throw error

  const profile = isObject(data?.profile_settings) ? data.profile_settings : {}
  const compliance = parseCompanyComplianceSettings(
    profile.compliance,
    data?.country,
  )

  return {
    ...compliance,
    currency: text(data?.currency) || compliance.currency,
  }
}

export async function updateCompanyComplianceSettings(
  input: CompanyComplianceSettings,
): Promise<CompanyComplianceSettings> {
  const companyId = await getCurrentCompanyId()

  const { data: current, error: readError } = await supabase
    .from('companies')
    .select('profile_settings')
    .eq('id', companyId)
    .single()

  if (readError) throw readError

  const currentProfile = isObject(current?.profile_settings)
    ? current.profile_settings
    : {}

  const normalized = parseCompanyComplianceSettings(input, input.countryCode)

  const { error } = await supabase
    .from('companies')
    .update({
      country: normalized.countryCode,
      currency: normalized.currency,
      profile_settings: {
        ...currentProfile,
        compliance: normalized,
      },
    })
    .eq('id', companyId)

  if (error) throw error

  return normalized
}

export function isFiscalizationEnabled(
  settings: CompanyComplianceSettings,
) {
  return (
    settings.operatingMode === 'BUSINESS' &&
    settings.fiscalization.mode !== 'OFF'
  )
}

export function isCroatianFiscalizationEnabled(
  settings: CompanyComplianceSettings,
) {
  return settings.countryCode === 'HR' && isFiscalizationEnabled(settings)
}
