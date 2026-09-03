export type TaxCountryCode =
  | 'HR'
  | 'BA'
  | 'RS'
  | 'SI'
  | 'ME'
  | 'MK'
  | 'XK'
  | 'OTHER'

const COUNTRY_ALIASES: Record<string, TaxCountryCode> = {
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

const TAX_SHORT_LABEL: Record<TaxCountryCode, string> = {
  HR: 'OIB',
  BA: 'JIB',
  RS: 'PIB',
  SI: 'davčna številka',
  ME: 'PIB',
  MK: 'EDB',
  XK: 'fiskalni broj',
  OTHER: '',
}

export function normalizeTaxCountryCode(value: unknown): TaxCountryCode {
  const normalized = String(value ?? '')
    .trim()
    .toLocaleUpperCase('hr-HR')

  return COUNTRY_ALIASES[normalized] ?? 'OTHER'
}

export function getTaxIdLabel(country: unknown): string {
  const code = normalizeTaxCountryCode(country)
  const shortLabel = TAX_SHORT_LABEL[code]

  return shortLabel
    ? `Porezni broj (${shortLabel})`
    : 'Porezni broj'
}

export function getTaxIdShortLabel(country: unknown): string {
  return TAX_SHORT_LABEL[normalizeTaxCountryCode(country)] || 'Porezni broj'
}

export function normalizeTaxId(country: unknown, value: unknown): string {
  const code = normalizeTaxCountryCode(country)
  const text = String(value ?? '').trim().toUpperCase()

  if (code === 'HR') {
    return text.replace(/\D/g, '').slice(0, 11)
  }

  return text.replace(/\s+/g, '').slice(0, 32)
}

export function validateTaxId(
  country: unknown,
  value: unknown,
): { valid: boolean; error: string } {
  const code = normalizeTaxCountryCode(country)
  const taxId = normalizeTaxId(code, value)

  if (!taxId) {
    return { valid: false, error: `${getTaxIdLabel(code)} je obavezan.` }
  }

  if (code === 'HR' && !/^\d{11}$/.test(taxId)) {
    return {
      valid: false,
      error: 'Porezni broj (OIB) mora sadržavati točno 11 znamenki.',
    }
  }

  // Za države izvan Hrvatske ne glumimo službenu validaciju bez
  // nacionalnog validatora. Čuvamo format dovoljno širokim za lokalne ID-eve.
  if (code !== 'HR' && taxId.length < 5) {
    return {
      valid: false,
      error: `Unesi ispravan ${getTaxIdLabel(code).toLocaleLowerCase('hr-HR')}.`,
    }
  }

  return { valid: true, error: '' }
}

export function isValidTaxId(country: unknown, value: unknown): boolean {
  return validateTaxId(country, value).valid
}

export function getTaxIdInputMode(country: unknown): 'numeric' | 'text' {
  return normalizeTaxCountryCode(country) === 'HR' ? 'numeric' : 'text'
}

export function getTaxIdMaxLength(country: unknown): number {
  return normalizeTaxCountryCode(country) === 'HR' ? 11 : 32
}
