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
        raise SystemExit(f'Marker missing in {path}: {old[:140]!r}')
    write(path, text.replace(old, new, 1))


def replace_all(path: str, old: str, new: str) -> None:
    text = read(path)
    if old in text:
        write(path, text.replace(old, new))


# Company compliance: USustPdv and invoice-number sequence scope are explicit
# Croatian fiscal settings. VAT membership must never be inferred from a rate.
path = 'src/services/companyCompliance.service.ts'
replace_once(
    path,
    "  operatorTaxId: string\n  certificateConfigured: boolean",
    "  operatorTaxId: string\n  vatRegistered: boolean\n  sequenceScope: 'P' | 'N'\n  certificateConfigured: boolean",
)
replace_once(
    path,
    "      operatorTaxId: '',\n      certificateConfigured: false,",
    "      operatorTaxId: '',\n      vatRegistered: false,\n      sequenceScope: 'P',\n      certificateConfigured: false,",
)
replace_once(
    path,
    "      operatorTaxId: text(fiscal.operatorTaxId),\n      certificateConfigured: Boolean(fiscal.certificateConfigured),",
    "      operatorTaxId: text(fiscal.operatorTaxId),\n      vatRegistered: fiscal.vatRegistered === true,\n      sequenceScope: fiscal.sequenceScope === 'N' ? 'N' : 'P',\n      certificateConfigured: Boolean(fiscal.certificateConfigured),",
)
replace_once(
    path,
    "'operating_mode,fiscal_mode,provider,business_premise_code,device_code,operator_tax_id,certificate_configured',",
    "'operating_mode,fiscal_mode,provider,business_premise_code,device_code,operator_tax_id,vat_registered,sequence_scope,certificate_configured',",
)
replace_once(
    path,
    "      operatorTaxId: text(fiscal?.operator_tax_id) || fallback.fiscalization.operatorTaxId,\n      certificateConfigured:",
    "      operatorTaxId: text(fiscal?.operator_tax_id) || fallback.fiscalization.operatorTaxId,\n      vatRegistered:\n        typeof fiscal?.vat_registered === 'boolean'\n          ? fiscal.vat_registered\n          : fallback.fiscalization.vatRegistered,\n      sequenceScope:\n        fiscal?.sequence_scope === 'N' || fiscal?.sequence_scope === 'P'\n          ? fiscal.sequence_scope\n          : fallback.fiscalization.sequenceScope,\n      certificateConfigured:",
)
replace_once(
    path,
    "      operator_tax_id: normalized.fiscalization.operatorTaxId,\n      certificate_configured:",
    "      operator_tax_id: normalized.fiscalization.operatorTaxId,\n      vat_registered: normalized.fiscalization.vatRegistered,\n      sequence_scope: normalized.fiscalization.sequenceScope,\n      certificate_configured:",
)

# HR settings UI: make both required legal choices visible and explicit.
path = 'src/components/settings/ModulesSettingsTab.tsx'
replace_once(
    path,
    "        operatorTaxId: '',\n      },",
    "        operatorTaxId: '',\n        vatRegistered: false,\n        sequenceScope: 'P',\n      },",
)
needle = '''                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">Poslovni prostor</span>'''
block = '''                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">U sustavu PDV-a</span>
                    <select
                      value={compliance.fiscalization.vatRegistered ? 'YES' : 'NO'}
                      disabled={!canEdit || compliance.fiscalization.mode === 'OFF'}
                      onChange={(event) => setCompliance({
                        ...compliance,
                        fiscalization: {
                          ...compliance.fiscalization,
                          vatRegistered: event.target.value === 'YES',
                        },
                      })}
                      className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="NO">Ne</option>
                      <option value="YES">Da</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">Slijed brojeva računa</span>
                    <select
                      value={compliance.fiscalization.sequenceScope}
                      disabled={!canEdit || compliance.fiscalization.mode === 'OFF'}
                      onChange={(event) => setCompliance({
                        ...compliance,
                        fiscalization: {
                          ...compliance.fiscalization,
                          sequenceScope: event.target.value === 'N' ? 'N' : 'P',
                        },
                      })}
                      className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="P">P — poslovni prostor</option>
                      <option value="N">N — naplatni uređaj</option>
                    </select>
                  </label>

''' + needle
replace_once(path, needle, block)

# Existing customer compatibility: foreign PIB/JIB may be alphanumeric. The
# canonical tax_id accepts it; the legacy OIB column is populated only for an
# actual 11-digit Croatian-style value so its old DB constraint cannot break.
path = 'src/services/customers.service.ts'
replace_all(
    path,
    "  const cleanTaxId =\n    input.oib\n      .trim()\n      .toUpperCase()\n      .replace(/\\s+/g, '')\n      .slice(0, 32)\n\n  const { data, error } =",
    "  const cleanTaxId =\n    input.oib\n      .trim()\n      .toUpperCase()\n      .replace(/\\s+/g, '')\n      .slice(0, 32)\n  const legacyOib = /^\\d{11}$/.test(cleanTaxId)\n    ? cleanTaxId\n    : null\n\n  const { data, error } =",
)
replace_all(
    path,
    "        oib:\n          cleanTaxId || null,\n        tax_id:\n          cleanTaxId || null,",
    "        oib:\n          legacyOib,\n        tax_id:\n          cleanTaxId || null,",
)

print('HR fiscal profile hardening applied.')
