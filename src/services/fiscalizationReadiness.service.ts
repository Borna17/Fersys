import type {
  CompanyComplianceSettings,
} from './companyCompliance.service'
import {
  createDefaultCompanyComplianceSettings,
  isCroatianFiscalizationEnabled,
} from './companyCompliance.service'

export type FiscalCustomerScope = 'B2C' | 'B2B'
export type FiscalChannel = 'NONE' | 'F1' | 'E_INVOICE'
export type FiscalReadinessLevel = 'ready' | 'needs-data' | 'blocked'

export type FiscalInvoiceItem = {
  name: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
  kpdCode?: string
}

export type FiscalInvoiceInput = {
  invoiceNumber: string
  issueDate: string
  serviceDate: string
  dueDate: string
  customerName: string
  customerType: string
  customerOib?: string
  paymentMethod: string
  iban?: string
  paymentModel?: string
  paymentReference?: string
  responsiblePerson?: string
  operatorOib?: string
  businessPremiseCode?: string
  deviceCode?: string
  items: FiscalInvoiceItem[]
}

export type FiscalReadinessIssue = {
  code: string
  field: string
  message: string
  severity: 'error' | 'warning'
}

export type FiscalReadinessReport = {
  scope: FiscalCustomerScope
  channel: FiscalChannel
  level: FiscalReadinessLevel
  issues: FiscalReadinessIssue[]
  fiscalizationEnabled: boolean
  countryCode: string
  operatingMode: 'LEARNING' | 'BUSINESS'
  canCreatePdf: boolean
  canSubmitFiscalization: boolean
  canCreateEInvoice: boolean
}

const OIB_RE = /^\d{11}$/
const KPD_RE = /^\d{6}$/

function clean(value: unknown) {
  return String(value ?? '').trim()
}

export function normalizeOib(value: unknown) {
  return clean(value).replace(/\s+/g, '')
}

export function normalizeKpdCode(value: unknown) {
  return clean(value).replace(/\D/g, '').slice(0, 6)
}

export function inferFiscalCustomerScope(
  customerType: string,
  customerOib?: string,
): FiscalCustomerScope {
  const type = clean(customerType).toLocaleLowerCase('hr-HR')
  const oib = normalizeOib(customerOib)

  if (type === 'tvrtka' || type === 'zgrada' || OIB_RE.test(oib)) {
    return 'B2B'
  }

  return 'B2C'
}

export function resolveFiscalChannel(
  customerType: string,
  customerOib?: string,
  compliance?: CompanyComplianceSettings,
): FiscalChannel {
  const effectiveCompliance =
    compliance ?? createDefaultCompanyComplianceSettings()

  if (!isCroatianFiscalizationEnabled(effectiveCompliance)) {
    return 'NONE'
  }

  return inferFiscalCustomerScope(customerType, customerOib) === 'B2B'
    ? 'E_INVOICE'
    : 'F1'
}

export function buildFiscalReadinessReport(
  invoice: FiscalInvoiceInput,
  compliance?: CompanyComplianceSettings,
): FiscalReadinessReport {
  const effectiveCompliance =
    compliance ?? createDefaultCompanyComplianceSettings()
  const fiscalizationEnabled =
    isCroatianFiscalizationEnabled(effectiveCompliance)

  const issues: FiscalReadinessIssue[] = []
  const scope = inferFiscalCustomerScope(
    invoice.customerType,
    invoice.customerOib,
  )
  const channel = resolveFiscalChannel(
    invoice.customerType,
    invoice.customerOib,
    effectiveCompliance,
  )

  const error = (code: string, field: string, message: string) => {
    issues.push({ code, field, message, severity: 'error' })
  }
  const warning = (code: string, field: string, message: string) => {
    issues.push({ code, field, message, severity: 'warning' })
  }

  // Osnovna valjanost računa vrijedi u svim državama i u načinu učenja.
  if (!clean(invoice.invoiceNumber)) {
    error('INVOICE_NUMBER', 'invoiceNumber', 'Nedostaje broj računa.')
  }
  if (!clean(invoice.issueDate)) {
    error('ISSUE_DATE', 'issueDate', 'Nedostaje datum izdavanja.')
  }
  if (!clean(invoice.serviceDate)) {
    error('SERVICE_DATE', 'serviceDate', 'Nedostaje datum obavljene usluge/isporuke.')
  }
  if (!clean(invoice.dueDate)) {
    warning('DUE_DATE', 'dueDate', 'Nedostaje datum dospijeća.')
  }
  if (!clean(invoice.customerName)) {
    error('CUSTOMER_NAME', 'customerName', 'Nedostaje naziv/ime primatelja računa.')
  }
  if (!clean(invoice.paymentMethod)) {
    error('PAYMENT_METHOD', 'paymentMethod', 'Nedostaje način plaćanja.')
  }

  const bankPayment = /transakc|virman|internet/i.test(invoice.paymentMethod)
  if (bankPayment && !clean(invoice.iban)) {
    error('IBAN', 'iban', 'Za uplatu na račun nedostaje IBAN primatelja.')
  }

  const realItems = invoice.items.filter((item) => clean(item.name))
  if (!realItems.length) {
    error('ITEMS', 'items', 'Račun mora imati barem jednu stavku.')
  }

  realItems.forEach((item, index) => {
    if (!(Number(item.quantity) > 0)) {
      error('ITEM_QUANTITY', `items.${index}.quantity`, `Stavka ${index + 1} nema ispravnu količinu.`)
    }
    if (Number(item.price) < 0 || !Number.isFinite(Number(item.price))) {
      error('ITEM_PRICE', `items.${index}.price`, `Stavka ${index + 1} nema ispravnu cijenu.`)
    }
    if (Number(item.vat) < 0 || !Number.isFinite(Number(item.vat))) {
      error('ITEM_VAT', `items.${index}.vat`, `Stavka ${index + 1} nema ispravnu stopu PDV-a.`)
    }
  })

  // Hrvatska porezna pravila se provjeravaju samo kada je za AKTIVNU
  // tvrtku izričito uključen BUSINESS + TEST/LIVE način fiskalizacije.
  if (fiscalizationEnabled) {
    const customerOib = normalizeOib(invoice.customerOib)

    if (scope === 'B2B' && !OIB_RE.test(customerOib)) {
      error('CUSTOMER_OIB', 'customerOib', 'Za poslovnog primatelja potreban je ispravan OIB od 11 znamenki.')
    }

    if (!clean(invoice.responsiblePerson)) {
      warning('OPERATOR_NAME', 'responsiblePerson', 'Nije navedena odgovorna osoba/operator.')
    }

    const businessPremiseCode =
      clean(invoice.businessPremiseCode) ||
      effectiveCompliance.fiscalization.businessPremiseCode
    const deviceCode =
      clean(invoice.deviceCode) ||
      effectiveCompliance.fiscalization.deviceCode
    const operatorOib =
      normalizeOib(invoice.operatorOib) ||
      normalizeOib(effectiveCompliance.fiscalization.operatorTaxId)

    if (!businessPremiseCode) {
      warning('BUSINESS_PREMISE', 'businessPremiseCode', 'Nije postavljena oznaka poslovnog prostora za fiskalizaciju.')
    }
    if (!deviceCode) {
      warning('DEVICE_CODE', 'deviceCode', 'Nije postavljena oznaka naplatnog uređaja.')
    }
    if (!OIB_RE.test(operatorOib)) {
      warning('OPERATOR_OIB', 'operatorOib', 'Nije postavljen OIB operatora za fiskalizaciju.')
    }

    if (channel === 'E_INVOICE') {
      realItems.forEach((item, index) => {
        const kpd = normalizeKpdCode(item.kpdCode)
        if (!KPD_RE.test(kpd)) {
          warning(
            'ITEM_KPD',
            `items.${index}.kpdCode`,
            `Stavka ${index + 1} još nema šesteroznamenkastu KPD 2025 oznaku potrebnu za eRačun.`,
          )
        }
      })
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')

  return {
    scope,
    channel,
    level: errors.length
      ? 'blocked'
      : warnings.length
        ? 'needs-data'
        : 'ready',
    issues,
    fiscalizationEnabled,
    countryCode: effectiveCompliance.countryCode,
    operatingMode: effectiveCompliance.operatingMode,
    canCreatePdf: errors.length === 0,
    // Faza 1 namjerno NE šalje ništa poreznoj upravi. Produkcijska predaja
    // uključuje certifikat/posrednika i country adaptere u sljedećoj fazi.
    canSubmitFiscalization: false,
    canCreateEInvoice:
      fiscalizationEnabled &&
      channel === 'E_INVOICE' &&
      errors.length === 0 &&
      realItems.every((item) => KPD_RE.test(normalizeKpdCode(item.kpdCode))),
  }
}

export type FiscalizationMetadata = {
  schemaVersion: 2
  countryCode: string
  enabled: boolean
  customerScope: FiscalCustomerScope
  channel: FiscalChannel
  businessPremiseCode: string
  deviceCode: string
  operatorOib: string
  fiscalStatus: 'DISABLED' | 'NOT_SUBMITTED' | 'READY_FOR_TEST' | 'SUBMITTED' | 'FAILED'
  jir?: string
  zki?: string
  submittedAt?: string
  lastError?: string
}

export function createEmptyFiscalizationMetadata(
  customerType: string,
  customerOib?: string,
  compliance?: CompanyComplianceSettings,
): FiscalizationMetadata {
  const effectiveCompliance =
    compliance ?? createDefaultCompanyComplianceSettings()
  const enabled = isCroatianFiscalizationEnabled(effectiveCompliance)
  const customerScope = inferFiscalCustomerScope(customerType, customerOib)
  const channel = resolveFiscalChannel(
    customerType,
    customerOib,
    effectiveCompliance,
  )

  return {
    schemaVersion: 2,
    countryCode: effectiveCompliance.countryCode,
    enabled,
    customerScope,
    channel,
    businessPremiseCode:
      effectiveCompliance.fiscalization.businessPremiseCode,
    deviceCode:
      effectiveCompliance.fiscalization.deviceCode,
    operatorOib:
      effectiveCompliance.fiscalization.operatorTaxId,
    fiscalStatus: enabled ? 'NOT_SUBMITTED' : 'DISABLED',
  }
}
