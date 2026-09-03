from pathlib import Path

register = Path('src/pages/RegisterPage.tsx')
auth = Path('src/auth/AuthProvider.tsx')

text = register.read_text(encoding='utf-8')

text = text.replace(
"  Building2,\n  CheckCircle2,",
"  Building2,\n  CheckCircle2,\n  Globe2,",
1,
)

country_block = """
type RegistrationCountryCode = 'HR' | 'BA' | 'RS' | 'SI' | 'ME' | 'MK' | 'XK' | 'OTHER'

const REGISTRATION_COUNTRIES: Array<{
  code: RegistrationCountryCode
  label: string
  currency: string
  taxIdLabel: string
}> = [
  { code: 'HR', label: 'Hrvatska', currency: 'EUR', taxIdLabel: 'OIB' },
  { code: 'BA', label: 'Bosna i Hercegovina', currency: 'BAM', taxIdLabel: 'Porezni ID / JIB' },
  { code: 'RS', label: 'Srbija', currency: 'RSD', taxIdLabel: 'PIB' },
  { code: 'SI', label: 'Slovenija', currency: 'EUR', taxIdLabel: 'Davčna številka' },
  { code: 'ME', label: 'Crna Gora', currency: 'EUR', taxIdLabel: 'PIB' },
  { code: 'MK', label: 'Sjeverna Makedonija', currency: 'MKD', taxIdLabel: 'EDB' },
  { code: 'XK', label: 'Kosovo', currency: 'EUR', taxIdLabel: 'Fiskalni broj' },
  { code: 'OTHER', label: 'Druga država', currency: 'EUR', taxIdLabel: 'Porezni broj' },
]
"""

marker = "const MIN_PASSWORD_LENGTH = 14\n"
if country_block.strip() not in text:
    text = text.replace(marker, marker + country_block + "\n", 1)

state_marker = "  const [\n    companyOib,\n    setCompanyOib,\n  ] = useState('')\n"
country_state = state_marker + "\n  const [\n    companyCountryCode,\n    setCompanyCountryCode,\n  ] = useState<RegistrationCountryCode>('HR')\n"
text = text.replace(state_marker, country_state, 1)

memo_marker = "  const passwordError =\n"
selected_country = """  const selectedCountry = useMemo(
    () =>
      REGISTRATION_COUNTRIES.find(
        (country) => country.code === companyCountryCode,
      ) ?? REGISTRATION_COUNTRIES[0],
    [companyCountryCode],
  )

"""
if selected_country.strip() not in text:
    text = text.replace(memo_marker, selected_country + memo_marker, 1)

old_validation = """    const normalizedCompanyOib =
      companyOib.replace(/\\D/g, '')

    if (!/^\\d{11}$/.test(normalizedCompanyOib)) {
      setError(
        'OIB tvrtke ili obrta mora sadržavati točno 11 znamenki.',
      )
      return
    }
"""
new_validation = """    const normalizedCompanyTaxId =
      companyOib.trim().toUpperCase().replace(/\\s+/g, '')

    if (
      companyCountryCode === 'HR' &&
      !/^\\d{11}$/.test(normalizedCompanyTaxId)
    ) {
      setError(
        'OIB tvrtke ili obrta mora sadržavati točno 11 znamenki.',
      )
      return
    }

    if (
      companyCountryCode !== 'HR' &&
      normalizedCompanyTaxId.length < 5
    ) {
      setError(
        `Unesi ispravan ${selectedCountry.taxIdLabel} za odabranu državu.`,
      )
      return
    }
"""
text = text.replace(old_validation, new_validation, 1)

text = text.replace(
"                company_oib:\n                  normalizedCompanyOib,",
"                company_oib:\n                  companyCountryCode === 'HR' ? normalizedCompanyTaxId : '',\n                company_tax_id:\n                  normalizedCompanyTaxId,\n                company_country_code:\n                  companyCountryCode,\n                company_country:\n                  selectedCountry.label,\n                company_currency:\n                  selectedCountry.currency,\n                company_tax_id_label:\n                  selectedCountry.taxIdLabel,",
1,
)

old_field = """                <Field
                  label=\"OIB tvrtke ili obrta\"
                  icon={
                    <Building2
                      size={19}
                    />
                  }
                >
                  <input
                    type=\"text\"
                    inputMode=\"numeric\"
                    autoComplete=\"off\"
                    value={companyOib}
                    onChange={(event) =>
                      setCompanyOib(
                        event.target.value
                          .replace(/\\D/g, '')
                          .slice(0, 11),
                      )
                    }
                    placeholder=\"11 znamenki OIB-a\"
                    maxLength={11}
                    className=\"auth-input\"
                  />
                </Field>
"""
new_field = """                <Field
                  label=\"Država sjedišta tvrtke\"
                  icon={<Globe2 size={19} />}
                >
                  <select
                    value={companyCountryCode}
                    onChange={(event) => {
                      setCompanyCountryCode(
                        event.target.value as RegistrationCountryCode,
                      )
                      setCompanyOib('')
                    }}
                    className=\"auth-input\"
                  >
                    {REGISTRATION_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <p className=\"-mt-2 text-xs leading-5 text-slate-500\">
                  FERSYS prema državi sjedišta automatski postavlja valutu i osnovna porezna/fiskalna pravila. Hrvatska je zadano odabrana.
                </p>

                <Field
                  label={`${selectedCountry.taxIdLabel} tvrtke ili obrta`}
                  icon={<Building2 size={19} />}
                >
                  <input
                    type=\"text\"
                    inputMode={companyCountryCode === 'HR' ? 'numeric' : 'text'}
                    autoComplete=\"off\"
                    value={companyOib}
                    onChange={(event) =>
                      setCompanyOib(
                        companyCountryCode === 'HR'
                          ? event.target.value.replace(/\\D/g, '').slice(0, 11)
                          : event.target.value.slice(0, 32),
                      )
                    }
                    placeholder={
                      companyCountryCode === 'HR'
                        ? '11 znamenki OIB-a'
                        : `Unesi ${selectedCountry.taxIdLabel}`
                    }
                    maxLength={companyCountryCode === 'HR' ? 11 : 32}
                    className=\"auth-input\"
                  />
                </Field>
"""
if old_field not in text:
    raise SystemExit('Register tax-id field marker not found')
text = text.replace(old_field, new_field, 1)
register.write_text(text, encoding='utf-8')

atext = auth.read_text(encoding='utf-8')

import_marker = "import { supabase } from '../lib/supabase'\n"
compliance_import = """import {
  createDefaultCompanyComplianceSettings,
  normalizeCompanyCountryCode,
} from '../services/companyCompliance.service'
"""
if compliance_import.strip() not in atext:
    atext = atext.replace(import_marker, import_marker + compliance_import, 1)

old_ensure = """async function ensureCompanyForCurrentUser(): Promise<void> {
  const { error } = await supabase.rpc(
    'bootstrap_company_for_current_user',
  )

  if (error) {
    throw error
  }
}
"""
new_ensure = """async function ensureCompanyForCurrentUser(): Promise<void> {
  const { error } = await supabase.rpc(
    'bootstrap_company_for_current_user',
  )

  if (error) {
    throw error
  }

  const { data: userData } = await supabase.auth.getUser()
  const metadata = userData.user?.user_metadata ?? {}
  const rawCountryCode = metadata.company_country_code

  // Legacy accounts do not carry registration-country metadata. Leave their
  // existing company settings untouched; current legacy companies are HR.
  if (!rawCountryCode) {
    return
  }

  const countryCode = normalizeCompanyCountryCode(rawCountryCode)
  const countryName =
    typeof metadata.company_country === 'string' && metadata.company_country.trim()
      ? metadata.company_country.trim()
      : countryCode
  const taxId =
    typeof metadata.company_tax_id === 'string'
      ? metadata.company_tax_id.trim()
      : ''

  const { data: companyId, error: companyIdError } = await supabase.rpc(
    'current_company_id',
  )

  if (companyIdError || !companyId) {
    if (companyIdError) throw companyIdError
    return
  }

  const { data: company, error: readError } = await supabase
    .from('companies')
    .select('country, currency, oib, profile_settings')
    .eq('id', String(companyId))
    .single()

  if (readError) {
    throw readError
  }

  const currentProfile =
    company?.profile_settings &&
    typeof company.profile_settings === 'object' &&
    !Array.isArray(company.profile_settings)
      ? company.profile_settings as Record<string, unknown>
      : {}

  // Registration country is applied only when compliance has not yet been
  // initialized, so later owner changes in Settings are never overwritten.
  if (currentProfile.compliance) {
    return
  }

  const defaults = createDefaultCompanyComplianceSettings(countryCode)
  const compliance = {
    ...defaults,
    operatingMode: 'BUSINESS' as const,
  }

  const { error: updateError } = await supabase
    .from('companies')
    .update({
      country: countryName,
      currency: compliance.currency,
      oib: countryCode === 'HR' ? taxId : company?.oib,
      profile_settings: {
        ...currentProfile,
        compliance,
        registration: {
          countryCode,
          countryName,
          taxId,
          taxIdLabel:
            typeof metadata.company_tax_id_label === 'string'
              ? metadata.company_tax_id_label
              : compliance.taxIdLabel,
          configuredAt: new Date().toISOString(),
        },
      },
    })
    .eq('id', String(companyId))

  if (updateError) {
    throw updateError
  }
}
"""
if old_ensure not in atext:
    raise SystemExit('Auth ensure marker not found')
atext = atext.replace(old_ensure, new_ensure, 1)
auth.write_text(atext, encoding='utf-8')

print('Registration country setup applied successfully.')
