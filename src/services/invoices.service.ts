import { supabase } from '../lib/supabase'

export type CloudInvoice = {
  id: string
  invoiceNumber: string
  issueDate: string
  status: string
  [key: string]: unknown
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_company_id')
  if (error) throw error
  if (!data) throw new Error('Korisnik nije povezan s aktivnom tvrtkom.')
  return String(data)
}

function mapRow(row: any): CloudInvoice {
  const invoice = { ...(row.data ?? {}) } as CloudInvoice
  invoice.id = row.id
  invoice.invoiceNumber = row.invoice_number
  invoice.issueDate = row.issue_date
  invoice.status = row.status
  invoice.createdAt = row.created_at
  invoice.updatedAt = row.updated_at
  return invoice
}

function payload(invoice: CloudInvoice) {
  return {
    invoice_number: String(invoice.invoiceNumber).trim(),
    issue_date: String(invoice.issueDate),
    status: String(invoice.status),
    data: invoice,
    updated_at: new Date().toISOString(),
  }
}

export async function getInvoices(): Promise<CloudInvoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('issue_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function createInvoice(
  invoice: CloudInvoice,
): Promise<CloudInvoice> {
  const companyId = await getCurrentCompanyId()

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...payload(invoice),
      company_id: companyId,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Račun s ovim brojem već postoji.',
      )
    }

    throw error
  }

  return mapRow(data)
}

export async function updateInvoice(invoice: CloudInvoice): Promise<CloudInvoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update(payload(invoice))
    .eq('id', invoice.id)
    .select('*')
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}

export async function importLocalInvoices(invoices: CloudInvoice[]): Promise<void> {
  if (!invoices.length) return
  const companyId = await getCurrentCompanyId()
  for (const invoice of invoices) {
    const { error } = await supabase.from('invoices').upsert(
      { ...payload(invoice), company_id: companyId },
      { onConflict: 'company_id,invoice_number', ignoreDuplicates: true },
    )
    if (error) console.error('Lokalni račun nije importiran:', error)
  }
}
