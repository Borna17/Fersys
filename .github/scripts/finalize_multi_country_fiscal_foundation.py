from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Expected marker not found in {path}: {old[:100]!r}')
    write(path, text.replace(old, new, 1))


def replace_all(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        return
    write(path, text.replace(old, new))


# Registration: keep the familiar local identifier visible in parentheses.
register = 'src/pages/RegisterPage.tsx'
for old, new in [
    ("{ code: 'HR', label: 'Hrvatska', currency: 'EUR', taxIdLabel: 'OIB' }", "{ code: 'HR', label: 'Hrvatska', currency: 'EUR', taxIdLabel: 'Porezni broj (OIB)' }"),
    ("{ code: 'BA', label: 'Bosna i Hercegovina', currency: 'BAM', taxIdLabel: 'Porezni ID / JIB' }", "{ code: 'BA', label: 'Bosna i Hercegovina', currency: 'BAM', taxIdLabel: 'Porezni broj (JIB)' }"),
    ("{ code: 'RS', label: 'Srbija', currency: 'RSD', taxIdLabel: 'PIB' }", "{ code: 'RS', label: 'Srbija', currency: 'RSD', taxIdLabel: 'Porezni broj (PIB)' }"),
    ("{ code: 'SI', label: 'Slovenija', currency: 'EUR', taxIdLabel: 'Davčna številka' }", "{ code: 'SI', label: 'Slovenija', currency: 'EUR', taxIdLabel: 'Porezni broj (davčna številka)' }"),
    ("{ code: 'ME', label: 'Crna Gora', currency: 'EUR', taxIdLabel: 'PIB' }", "{ code: 'ME', label: 'Crna Gora', currency: 'EUR', taxIdLabel: 'Porezni broj (PIB)' }"),
    ("{ code: 'MK', label: 'Sjeverna Makedonija', currency: 'MKD', taxIdLabel: 'EDB' }", "{ code: 'MK', label: 'Sjeverna Makedonija', currency: 'MKD', taxIdLabel: 'Porezni broj (EDB)' }"),
    ("{ code: 'XK', label: 'Kosovo', currency: 'EUR', taxIdLabel: 'Fiskalni broj' }", "{ code: 'XK', label: 'Kosovo', currency: 'EUR', taxIdLabel: 'Porezni broj (fiskalni broj)' }"),
]:
    replace_all(register, old, new)

# Company settings service: retain the old `oib` property for compatibility but
# use the new tax_id/country_code database fields under the hood.
company = 'src/services/companySettings.service.ts'
replace_once(
    company,
    "import { supabase } from '../lib/supabase'\n",
    "import { supabase } from '../lib/supabase'\nimport {\n  normalizeTaxCountryCode,\n  normalizeTaxId,\n  validateTaxId,\n} from './taxIdentity.service'\n",
)
replace_once(
    company,
    "  oib: string | null\n  address: string | null",
    "  oib: string | null\n  tax_id: string | null\n  country_code: string | null\n  address: string | null",
)
replace_once(company, "    oib: row.oib ?? '',", "    oib: row.tax_id ?? row.oib ?? '',")
replace_once(
    company,
    "function createDatabasePayload(\n  input: UpdateCompanySettingsInput,\n  currentProfileSettings: Record<string, unknown> = {},\n) {\n  return {",
    "function createDatabasePayload(\n  input: UpdateCompanySettingsInput,\n  currentProfileSettings: Record<string, unknown> = {},\n) {\n  const countryCode = normalizeTaxCountryCode(input.country)\n  const taxId = normalizeTaxId(countryCode, input.oib)\n\n  return {",
)
replace_once(
    company,
    "    oib:\n      input.oib\n        .replace(/\\D/g, '')\n        .slice(0, 11) || null,",
    "    // Keep legacy OIB populated only for HR while tax_id is the canonical field.\n    oib:\n      countryCode === 'HR'\n        ? taxId || null\n        : null,\n\n    tax_id:\n      taxId || null,\n\n    country_code:\n      countryCode,",
)
replace_once(
    company,
    "  const cleanOib = input.oib.replace(\n    /\\D/g,\n    '',\n  )\n\n  if (\n    cleanOib.length > 0 &&\n    cleanOib.length !== 11\n  ) {\n    throw new Error(\n      'OIB tvrtke mora imati točno 11 znamenki.',\n    )\n  }",
    "  if (input.oib.trim()) {\n    const taxValidation = validateTaxId(\n      input.country,\n      input.oib,\n    )\n\n    if (!taxValidation.valid) {\n      throw new Error(taxValidation.error)\n    }\n  }",
)
replace_once(
    company,
    "export async function getCompanySettings(): Promise<\n  CompanySettings\n> {\n  const { data, error } = await supabase.rpc(\n    'get_current_company',\n  )\n\n  if (error) {\n    throw error\n  }\n\n  const rows = Array.isArray(data)\n    ? data\n    : data\n      ? [data]\n      : []\n\n  const company = rows[0] as\n    | CompanyRow\n    | undefined\n\n  if (!company) {",
    "export async function getCompanySettings(): Promise<\n  CompanySettings\n> {\n  const companyId = await getCurrentCompanyId()\n\n  const { data: company, error } = await supabase\n    .from('companies')\n    .select('*')\n    .eq('id', companyId)\n    .single()\n\n  if (error) {\n    throw error\n  }\n\n  if (!company) {",
)

# Settings UI: dynamic tax label and validation, without renaming data properties.
settings = 'src/pages/SettingsPage.tsx'
replace_once(
    settings,
    "import { fileToCompressedDataUrl } from '../utils/imageUtils'",
    "import { fileToCompressedDataUrl } from '../utils/imageUtils'\nimport {\n  getTaxIdInputMode,\n  getTaxIdLabel,\n  getTaxIdMaxLength,\n  isValidTaxId,\n  normalizeTaxId,\n} from '../services/taxIdentity.service'",
)
replace_once(
    settings,
    "      settings.oib.replace(/\\D/g, '').length === 11,",
    "      isValidTaxId(settings.country, settings.oib),",
)
replace_once(
    settings,
    '''            <TextField
              label="OIB"
              value={settings.oib}
              inputMode="numeric"
              maxLength={11}
              onChange={(value) =>
                updateField(
                  'oib',
                  value
                    .replace(/\\D/g, '')
                    .slice(0, 11),
                )
              }
            />''',
    '''            <TextField
              label={getTaxIdLabel(settings.country)}
              value={settings.oib}
              inputMode={getTaxIdInputMode(settings.country)}
              maxLength={getTaxIdMaxLength(settings.country)}
              onChange={(value) =>
                updateField(
                  'oib',
                  normalizeTaxId(settings.country, value),
                )
              }
            />''',
)

# Topbar: make active company switchable only when the account has >1 company.
topbar = 'src/components/Topbar.tsx'
replace_once(
    topbar,
    "import CompanyLogo from './CompanyLogo'",
    "import CompanyLogo from './CompanyLogo'\nimport CompanySwitcher from './CompanySwitcher'",
)
replace_once(
    topbar,
    '      <div className="ml-7 flex shrink-0 items-center gap-3">',
    '      <div className="ml-7 flex shrink-0 items-center gap-3">\n        <CompanySwitcher />',
)

# Fiscal settings wording: OIB remains explicit for Croatia and LIVE never claims
# that production submission is available.
modules = 'src/components/settings/ModulesSettingsTab.tsx'
replace_all(modules, 'label="OIB operatora"', 'label="Porezni broj operatora (OIB)"')
replace_all(modules, 'OIB operatora', 'Porezni broj operatora (OIB)')
replace_all(
    modules,
    'U ovoj fazi FERSYS još ništa ne šalje Poreznoj.',
    'FERSYS ovdje priprema podatke, ali ništa se ne šalje Poreznoj dok službeni certifikat/posrednik i produkcijski adapter nisu povezani i testirani.',
)

# Customers: preserve internal `oib` API but store tax_id too and use generic wording.
customers = 'src/services/customers.service.ts'
replace_once(customers, '  oib: string | null\n  phone:', '  oib: string | null\n  tax_id: string | null\n  phone:')
replace_once(customers, "    oib: row.oib ?? '',", "    oib: row.tax_id ?? row.oib ?? '',")
replace_all(customers, "        oib:\n          cleanOib || null,", "        oib:\n          cleanOib || null,\n        tax_id:\n          cleanOib || null,")
replace_all(customers, 's ovim OIB-om', 's ovim poreznim brojem (OIB / PIB / JIB)')
replace_all(customers, 's ovim OIB-om', 's ovim poreznim brojem (OIB / PIB / JIB)')
replace_once(customers, '        oib: null,', '        oib: null,\n        tax_id: null,')

# Customer forms: wording only; internal property names stay compatible.
for path in ['src/pages/CustomersPage.tsx', 'src/pages/CustomerProfilePage.tsx']:
    if Path(path).exists():
        replace_all(path, 'label="OIB"', 'label="Porezni broj (OIB / PIB / JIB)"')
        replace_all(path, '>OIB<', '>Porezni broj (OIB / PIB / JIB)<')
        replace_all(path, 'OIB investitora', 'Porezni broj investitora (OIB / PIB / JIB)')

# Inventory service: KPD 2025 is stored with the catalogue item and therefore can
# be reused by future eInvoice builders instead of repeated manual entry.
inventory = 'src/services/inventory.service.ts'
replace_once(inventory, '  vatRate: number\n\n  locationStocks:', '  vatRate: number\n  kpdCode: string\n\n  locationStocks:')
replace_once(inventory, '  vatRate?: number\n\n  locationStocks?:', '  vatRate?: number\n  kpdCode?: string\n\n  locationStocks?:')
replace_once(inventory, '  vat_rate: number | string\n  related_item_ids:', '  vat_rate: number | string\n  kpd_code: string | null\n  related_item_ids:')
replace_once(inventory, '    vatRate:\n      numberValue(row.vat_rate),\n    locationStocks:', "    vatRate:\n      numberValue(row.vat_rate),\n    kpdCode: row.kpd_code ?? '',\n    locationStocks:")
replace_once(inventory, '      vat_rate:\n        input.vatRate ?? 25,\n      related_item_ids:', "      vat_rate:\n        input.vatRate ?? 25,\n      kpd_code:\n        input.kpdCode?.replace(/\\D/g, '').slice(0, 6) || null,\n      related_item_ids:")
replace_once(
    inventory,
    "  if (\n    updates.relatedItemIds !==\n    undefined\n  ) {",
    "  if (updates.kpdCode !== undefined) {\n    patch.kpd_code =\n      updates.kpdCode.replace(/\\D/g, '').slice(0, 6) || null\n  }\n\n  if (\n    updates.relatedItemIds !==\n    undefined\n  ) {",
)

# Inventory editor: editable KPD field beside tax/pricing data.
new_inventory = 'src/pages/NewInventoryItemPage.tsx'
replace_once(new_inventory, '  vatRate: string\n}', '  vatRate: string\n  kpdCode: string\n}')
replace_once(new_inventory, "  vatRate: '25',\n}", "  vatRate: '25',\n  kpdCode: '',\n}")
replace_once(new_inventory, '          vatRate:\n            String(existingItem.vatRate),\n        })', "          vatRate:\n            String(existingItem.vatRate),\n          kpdCode: existingItem.kpdCode,\n        })")
replace_once(new_inventory, '        vatRate:\n          canViewCosts\n            ? Math.max(\n                0,\n                parseNumber(form.vatRate),\n              )\n            : 25,\n      }', "        vatRate:\n          canViewCosts\n            ? Math.max(\n                0,\n                parseNumber(form.vatRate),\n              )\n            : 25,\n\n        kpdCode:\n          form.kpdCode.replace(/\\D/g, '').slice(0, 6),\n      }")
# Insert KPD field immediately after the VAT input field when the exact visual block exists.
vat_marker = '''                  <input
                    value={form.vatRate}
                    onChange={(event) =>
                      updateField(
                        'vatRate',
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    className={inputClassName}
                  />'''
kpd_block = vat_marker + '''
                </label>

                <label>
                  <FieldLabel>KPD 2025 (za eRačun)</FieldLabel>
                  <input
                    value={form.kpdCode}
                    onChange={(event) =>
                      updateField(
                        'kpdCode',
                        event.target.value.replace(/\\D/g, '').slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6 znamenki"
                    className={inputClassName}
                  />
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                    Opcionalno za običan rad; koristi se za hrvatski B2B eRačun kada je potreban.
                  </span>'''
text = read(new_inventory)
if 'KPD 2025 (za eRačun)' not in text:
    if vat_marker not in text:
        raise SystemExit('VAT input marker not found in NewInventoryItemPage.tsx')
    # Existing JSX closes the VAT label after the marker; our replacement consumes
    # that same close and opens/closes the KPD label through the existing close.
    write(new_inventory, text.replace(vat_marker, kpd_block, 1))

print('FERSYS multi-country/fiscalization finalization patch applied successfully.')
