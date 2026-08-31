import { supabase } from '../lib/supabase'

export type IncomingInvoiceDocument = {
  id: string
  fileName: string
  mimeType: string
  createdAt: string
}

export type IncomingInvoiceRecord = {
  id: string
  supplierName: string
  supplierOib: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  bookingDate: string
  category: string
  status: string
  paymentMethod: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  note: string
  documents: IncomingInvoiceDocument[]
  createdAt: string
  updatedAt: string
}

type AccessRow = { company_id?: string | null }

async function getCurrentCompanyId() {
  const { data, error } = await supabase.rpc('get_current_user_access')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  const companyId = (row as AccessRow | null)?.company_id
  if (!companyId) throw new Error('Aktivna tvrtka nije pronađena.')
  return companyId
}

function mapRow(row: any): IncomingInvoiceRecord {
  return {
    id: String(row.id),
    supplierName: String(row.supplier_name ?? ''),
    supplierOib: String(row.supplier_oib ?? ''),
    invoiceNumber: String(row.invoice_number ?? ''),
    invoiceDate: String(row.invoice_date ?? ''),
    dueDate: String(row.due_date ?? ''),
    bookingDate: String(row.booking_date ?? ''),
    category: String(row.category ?? 'Ostalo'),
    status: String(row.status ?? 'Za knjiženje'),
    paymentMethod: String(row.payment_method ?? 'Ostalo'),
    netAmount: Number(row.net_amount ?? 0),
    vatAmount: Number(row.vat_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    note: String(row.note ?? ''),
    documents: Array.isArray(row.documents) ? row.documents : [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  }
}

export async function listIncomingInvoices(): Promise<IncomingInvoiceRecord[]> {
  const companyId = await getCurrentCompanyId()
  const { data, error } = await supabase
    .from('incoming_invoices')
    .select('*')
    .eq('company_id', companyId)
    .order('invoice_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function upsertIncomingInvoice(invoice: IncomingInvoiceRecord) {
  const companyId = await getCurrentCompanyId()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData.user?.id
  if (!userId) throw new Error('Korisnik nije prijavljen.')

  const payload = {
    id: invoice.id,
    company_id: companyId,
    supplier_name: invoice.supplierName,
    supplier_oib: invoice.supplierOib,
    invoice_number: invoice.invoiceNumber,
    invoice_date: invoice.invoiceDate || null,
    due_date: invoice.dueDate || null,
    booking_date: invoice.bookingDate || null,
    category: invoice.category,
    status: invoice.status,
    payment_method: invoice.paymentMethod,
    net_amount: invoice.netAmount,
    vat_amount: invoice.vatAmount,
    total_amount: invoice.totalAmount,
    note: invoice.note,
    documents: invoice.documents,
    created_by: userId,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
  }

  const { data, error } = await supabase
    .from('incoming_invoices')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function deleteIncomingInvoice(invoiceId: string) {
  const companyId = await getCurrentCompanyId()
  const { error } = await supabase
    .from('incoming_invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('company_id', companyId)
  if (error) throw error
}
