import { supabase } from '../lib/supabase'
import {
  getCompanyComplianceSettings,
  isCroatianFiscalizationEnabled,
  type CompanyComplianceSettings,
} from './companyCompliance.service'

export type InvoiceCloudShape = {
  id: string
  invoiceNumber: string
  issueDate: string
  status: string
}

type FiscalSnapshot = {
  schemaVersion: 1
  countryCode: string
  operatingMode: 'LEARNING' | 'BUSINESS'
  fiscalizationMode: 'OFF' | 'TEST' | 'LIVE'
  taxIdLabel: string
  practiceDocument: boolean
  capturedAt: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_company_id')

  if (error) throw error
  if (!data) {
    throw new Error('Korisnik nije povezan s aktivnom tvrtkom.')
  }

  return String(data)
}

function mapRow<T extends InvoiceCloudShape>(row: any): T {
  const invoice = {
    ...(row.data ?? {}),
    id: row.id,
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  return invoice as T
}

function getCustomerData(invoice: Record<string, unknown>) {
  const candidate = invoice.customer ?? invoice.investor ?? invoice.client
  return isObject(candidate) ? candidate : {}
}

function inferFiscalChannel(
  invoice: Record<string, unknown>,
  compliance: CompanyComplianceSettings,
): 'NONE' | 'F1' | 'E_INVOICE' {
  if (!isCroatianFiscalizationEnabled(compliance)) return 'NONE'

  const customer = getCustomerData(invoice)
  const customerType = text(customer.type || invoice.customerType).toLocaleLowerCase('hr-HR')
  const taxId = text(
    customer.taxId || customer.oib || invoice.customerTaxId || invoice.customerOib,
  ).replace(/\s+/g, '')

  const businessCustomer =
    customerType === 'company' ||
    customerType === 'tvrtka' ||
    customerType === 'building' ||
    customerType === 'zgrada' ||
    /^\d{11}$/.test(taxId)

  return businessCustomer ? 'E_INVOICE' : 'F1'
}

function buildSnapshot(compliance: CompanyComplianceSettings): FiscalSnapshot {
  return {
    schemaVersion: 1,
    countryCode: compliance.countryCode,
    operatingMode: compliance.operatingMode,
    fiscalizationMode: compliance.fiscalization.mode,
    taxIdLabel: compliance.taxIdLabel,
    practiceDocument: compliance.operatingMode === 'LEARNING',
    capturedAt: new Date().toISOString(),
  }
}

async function preparePayload<T extends InvoiceCloudShape>(invoice: T) {
  const compliance = await getCompanyComplianceSettings()
  const source = invoice as T & Record<string, unknown>
  const snapshot = buildSnapshot(compliance)

  const enriched = {
    ...source,
    complianceSnapshot: snapshot,
    fiscalization: {
      ...(isObject(source.fiscalization) ? source.fiscalization : {}),
      schemaVersion: 2,
      enabled: isCroatianFiscalizationEnabled(compliance),
      countryCode: compliance.countryCode,
      channel: inferFiscalChannel(source, compliance),
      businessPremiseCode: compliance.fiscalization.businessPremiseCode,
      deviceCode: compliance.fiscalization.deviceCode,
      operatorTaxId: compliance.fiscalization.operatorTaxId,
      fiscalStatus:
        isCroatianFiscalizationEnabled(compliance)
          ? 'NOT_SUBMITTED'
          : 'DISABLED',
      // JIR/ZKI se nikad ne izmišljaju. Pojavit će se tek nakon potvrđenog
      // odgovora službenog fiskalizacijskog sustava.
      jir: isObject(source.fiscalization) ? source.fiscalization.jir : undefined,
      zki: isObject(source.fiscalization) ? source.fiscalization.zki : undefined,
    },
  }

  return {
    compliance,
    enriched,
    db: {
      invoice_number: String(invoice.invoiceNumber).trim(),
      issue_date: String(invoice.issueDate),
      status: String(invoice.status),
      data: enriched,
      updated_at: new Date().toISOString(),
    },
  }
}

async function syncFiscalRecord(
  invoiceId: string,
  companyId: string,
  invoice: Record<string, unknown>,
  compliance: CompanyComplianceSettings,
): Promise<void> {
  const enabled = isCroatianFiscalizationEnabled(compliance)
  const channel = inferFiscalChannel(invoice, compliance)

  const { error } = await supabase
    .from('invoice_fiscalization')
    .upsert(
      {
        invoice_id: invoiceId,
        company_id: companyId,
        country_code: compliance.countryCode,
        channel,
        status: enabled ? 'NOT_SUBMITTED' : 'NOT_APPLICABLE',
        business_premise_code: compliance.fiscalization.businessPremiseCode,
        device_code: compliance.fiscalization.deviceCode,
        operator_tax_id: compliance.fiscalization.operatorTaxId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'invoice_id' },
    )

  // U ovoj fazi fiskalni zapis je readiness metadata, ne mrežna predaja.
  // Ne rušimo već spremljen račun samo zato što pomoćni readiness zapis nije
  // mogao biti osvježen; stvarna predaja će kasnije ići transakcijski.
  if (error) {
    console.error('Fiscalization readiness metadata nije spremljena:', error)
  }
}

export async function getInvoices<T extends InvoiceCloudShape>(): Promise<T[]> {
  const companyId = await getCurrentCompanyId()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRow<T>(row))
}

export async function createInvoice<T extends InvoiceCloudShape>(invoice: T): Promise<T> {
  const companyId = await getCurrentCompanyId()
  const prepared = await preparePayload(invoice)

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...prepared.db,
      company_id: companyId,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Račun s ovim brojem već postoji.')
    }
    throw error
  }

  await syncFiscalRecord(
    String(data.id),
    companyId,
    prepared.enriched,
    prepared.compliance,
  )

  return mapRow<T>(data)
}

export async function updateInvoice<T extends InvoiceCloudShape>(invoice: T): Promise<T> {
  const companyId = await getCurrentCompanyId()
  const prepared = await preparePayload(invoice)

  const { data, error } = await supabase
    .from('invoices')
    .update(prepared.db)
    .eq('id', invoice.id)
    .eq('company_id', companyId)
    .select('*')
    .single()

  if (error) throw error

  await syncFiscalRecord(
    String(data.id),
    companyId,
    prepared.enriched,
    prepared.compliance,
  )

  return mapRow<T>(data)
}

export async function deleteInvoice(id: string): Promise<void> {
  const companyId = await getCurrentCompanyId()

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) throw error
}

export async function importLocalInvoices<T extends InvoiceCloudShape>(
  invoices: T[],
): Promise<void> {
  if (!invoices.length) return

  const companyId = await getCurrentCompanyId()

  for (const invoice of invoices) {
    try {
      const prepared = await preparePayload(invoice)
      const { data, error } = await supabase
        .from('invoices')
        .upsert(
          {
            ...prepared.db,
            company_id: companyId,
          },
          {
            onConflict: 'company_id,invoice_number',
            ignoreDuplicates: true,
          },
        )
        .select('id')
        .maybeSingle()

      if (error) throw error

      if (data?.id) {
        await syncFiscalRecord(
          String(data.id),
          companyId,
          prepared.enriched,
          prepared.compliance,
        )
      }
    } catch (error) {
      console.error('Lokalni račun nije importiran:', error)
    }
  }
}
