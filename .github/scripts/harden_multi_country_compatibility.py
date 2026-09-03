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
        raise SystemExit(f'Marker missing in {path}: {old[:120]!r}')
    write(path, text.replace(old, new, 1))


def replace_all(path: str, old: str, new: str) -> None:
    text = read(path)
    if old in text:
        write(path, text.replace(old, new))


# Customer service: customer country is not mandatory, so do not destroy
# alphanumeric foreign tax IDs. Keep legacy oib column in sync for compatibility.
path = 'src/services/customers.service.ts'
replace_all(
    path,
    "  const cleanOib =\n    input.oib.replace(\n      /\\D/g,\n      '',\n    )",
    "  const cleanTaxId =\n    input.oib\n      .trim()\n      .toUpperCase()\n      .replace(/\\s+/g, '')\n      .slice(0, 32)",
)
replace_all(path, 'cleanOib || null', 'cleanTaxId || null')

# New customer form: accept HR OIB and foreign PIB/JIB/etc. without pretending
# that FERSYS has a national validator for every country.
path = 'src/pages/CustomersPage.tsx'
replace_once(
    path,
    "    const cleanOib =\n      oib.replace(/\\D/g, '')",
    "    const cleanTaxId =\n      oib\n        .trim()\n        .toUpperCase()\n        .replace(/\\s+/g, '')\n        .slice(0, 32)",
)
replace_once(
    path,
    "    if (\n      cleanOib &&\n      cleanOib.length !== 11\n    ) {\n      window.alert(\n        'Ako unosite OIB, mora sadržavati točno 11 znamenki.',\n      )\n      return\n    }",
    "    if (cleanTaxId && cleanTaxId.length < 5) {\n      window.alert(\n        'Ako unosite porezni broj, unesite najmanje 5 znakova.',\n      )\n      return\n    }",
)
replace_all(path, 'oib: cleanOib,', 'oib: cleanTaxId,')
replace_once(
    path,
    '''                  <Field label="OIB (nije obavezno)">
                    <input
                      inputMode="numeric"
                      maxLength={11}
                      value={oib}
                      onChange={(event) =>
                        setOib(
                          event.target.value
                            .replace(
                              /\\D/g,
                              '',
                            )
                            .slice(
                              0,
                              11,
                            ),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>''',
    '''                  <Field label="Porezni broj (OIB / PIB / JIB) – nije obavezno">
                    <input
                      inputMode="text"
                      maxLength={32}
                      value={oib}
                      onChange={(event) =>
                        setOib(
                          event.target.value
                            .toUpperCase()
                            .replace(/\\s+/g, '')
                            .slice(0, 32),
                        )
                      }
                      className={inputClass}
                    />
                  </Field>''',
)

# Customer profile edit + relation matching: preserve foreign alphanumeric IDs.
path = 'src/pages/CustomerProfilePage.tsx'
replace_once(
    path,
    '''function normalizeOib(
  value: string | undefined,
) {
  return (value ?? '').replace(
    /\\D/g,
    '',
  )
}''',
    '''function normalizeTaxId(
  value: string | undefined,
) {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\\s+/g, '')
}''',
)
replace_all(path, 'normalizeOib(customer.oib)', 'normalizeTaxId(customer.oib)')
replace_all(path, 'normalizeOib(record.oib)', 'normalizeTaxId(record.oib)')
replace_once(
    path,
    '''  if (
    customerOib.length === 11 &&
    customerOib === recordOib
  ) {''',
    '''  if (
    customerOib.length >= 5 &&
    customerOib === recordOib
  ) {''',
)
replace_once(
    path,
    "    const cleanOib =\n      editOib.replace(/\\D/g, '')",
    "    const cleanTaxId =\n      editOib\n        .trim()\n        .toUpperCase()\n        .replace(/\\s+/g, '')\n        .slice(0, 32)",
)
replace_once(
    path,
    "    if (\n      cleanOib &&\n      cleanOib.length !== 11\n    ) {\n      window.alert(\n        'Ako unosite OIB, mora sadržavati točno 11 znamenki.',\n      )\n      return\n    }",
    "    if (cleanTaxId && cleanTaxId.length < 5) {\n      window.alert(\n        'Ako unosite porezni broj, unesite najmanje 5 znakova.',\n      )\n      return\n    }",
)
replace_all(path, 'oib: cleanOib,', 'oib: cleanTaxId,')
replace_once(
    path,
    '''                  <Field label="Porezni broj (OIB / PIB / JIB)">
                    <input
                      inputMode="numeric"
                      maxLength={11}
                      value={editOib}
                      onChange={(event) =>
                        setEditOib(
                          event.target
                            .value
                            .replace(
                              /\\D/g,
                              '',
                            )
                            .slice(
                              0,
                              11,
                            ),
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>''',
    '''                  <Field label="Porezni broj (OIB / PIB / JIB)">
                    <input
                      inputMode="text"
                      maxLength={32}
                      value={editOib}
                      onChange={(event) =>
                        setEditOib(
                          event.target.value
                            .toUpperCase()
                            .replace(/\\s+/g, '')
                            .slice(0, 32),
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>''',
)

# Company settings service: after a general company save, also align the
# dedicated compliance row. This prevents country and fiscal settings drifting.
path = 'src/services/companySettings.service.ts'
replace_once(
    path,
    "} from './taxIdentity.service'\n",
    "} from './taxIdentity.service'\nimport {\n  getCompanyComplianceSettings,\n  updateCompanyComplianceSettings,\n} from './companyCompliance.service'\n",
)
replace_once(
    path,
    '''  return mapCompany(
    data as CompanyRow,
  )
}''',
    '''  const mapped = mapCompany(
    data as CompanyRow,
  )

  // Keep country/currency in the dedicated compliance table synchronized with
  // general company settings. Changing away from HR automatically leaves the
  // Croatian fiscal adapter OFF through updateCompanyComplianceSettings().
  const compliance = await getCompanyComplianceSettings()
  await updateCompanyComplianceSettings({
    ...compliance,
    countryCode: normalizeTaxCountryCode(mapped.country),
    currency: mapped.currency,
  })

  return mapped
}''',
)

# Invoice PDF: company tax label and currency follow the active company.
path = 'src/utils/invoicePdf.ts'
replace_once(
    path,
    "import { getCompanySettings } from '../services/companySettings.service'",
    "import { getCompanySettings } from '../services/companySettings.service'\nimport { getTaxIdLabel } from '../services/taxIdentity.service'",
)
replace_once(path, '  companyOib: string\n  companyIban:', '  companyOib: string\n  companyTaxIdLabel: string\n  companyCurrency: string\n  companyIban:')
replace_once(path, "  companyOib: '',\n  companyIban:", "  companyOib: '',\n  companyTaxIdLabel: 'Porezni broj (OIB)',\n  companyCurrency: 'EUR',\n  companyIban:")
replace_once(
    path,
    "function currency(value: number) {\n  return new Intl.NumberFormat('hr-HR', {\n    style: 'currency',\n    currency: 'EUR',",
    "function currency(value: number, currencyCode = 'EUR') {\n  return new Intl.NumberFormat('hr-HR', {\n    style: 'currency',\n    currency: currencyCode || 'EUR',",
)
replace_once(
    path,
    "    companyOib: settings.oib,\n    companyIban:",
    "    companyOib: settings.oib,\n    companyTaxIdLabel: getTaxIdLabel(settings.country),\n    companyCurrency: settings.currency || 'EUR',\n    companyIban:",
)
replace_once(
    path,
    '${settings.companyOib ? `<div>OIB: ${esc(settings.companyOib)}</div>` : \'\'}',
    '${settings.companyOib ? `<div>${esc(settings.companyTaxIdLabel)}: ${esc(settings.companyOib)}</div>` : \'\'}',
)
replace_once(path, "    invoice.oib ? `OIB: ${invoice.oib}` : '',", "    invoice.oib ? `Porezni broj (OIB / PIB / JIB): ${invoice.oib}` : '',")
replace_once(path, 'function itemRows(items: InvoicePdfItem[], startIndex: number) {', 'function itemRows(items: InvoicePdfItem[], startIndex: number, currencyCode: string) {')
replace_all(path, '${currency(item.price)}', '${currency(item.price, currencyCode)}')
replace_all(path, '${currency(itemTotal(item))}', '${currency(itemTotal(item), currencyCode)}')
replace_once(path, '${itemRows(pageItems, startIndex)}', '${itemRows(pageItems, startIndex, settings.companyCurrency)}')
replace_all(path, '${currency(total)} ·', '${currency(total, settings.companyCurrency)} ·')
replace_all(path, '${currency(totals.base)}', '${currency(totals.base, settings.companyCurrency)}')
replace_all(path, '${currency(totals.discount)}', '${currency(totals.discount, settings.companyCurrency)}')
replace_all(path, '${currency(totals.net)}', '${currency(totals.net, settings.companyCurrency)}')
replace_all(path, '${currency(totals.vat)}', '${currency(totals.vat, settings.companyCurrency)}')
replace_all(path, '${currency(totals.total)}', '${currency(totals.total, settings.companyCurrency)}')

print('Multi-country compatibility hardening applied.')
