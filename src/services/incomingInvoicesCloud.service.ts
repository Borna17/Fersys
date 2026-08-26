import { supabase } from '../lib/supabase'

export type IncomingInvoiceStatus =
  | 'Nije knjiženo'
  | 'Za knjiženje'
  | 'Knjiženo'
  | 'Plaćeno'
  | 'Stornirano'

export type IncomingInvoiceCategory =
  | 'Gorivo'
  | 'Materijal'
  | 'Alat'
  | 'Servis i održavanje'
  | 'Najam'
  | 'Telekomunikacije'
  | 'Komunalije'
  | 'Reprezentacija'
  | 'Uredski troškovi'
  | 'Ostalo'

export type IncomingInvoiceDocumentMeta = {
  id: string
  fileName: string
  mimeType: string
  createdAt: string
}

export type CloudIncomingInvoice = {
  id: string
  supplierName: string
  supplierOib: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  bookingDate: string
  category: IncomingInvoiceCategory
  status: IncomingInvoiceStatus
  paymentMethod: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  note: string
  documents: IncomingInvoiceDocumentMeta[]
  createdAt: string
  updatedAt: string
}

type AccessRow = {
  company_id: string
}

type DbRow = {
  id: string
  company_id: string
  supplier_name: string
  supplier_oib: string
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  booking_date: string | null
  category: IncomingInvoiceCategory
  status: IncomingInvoiceStatus
  payment_method: string
  net_amount: number | string
  vat_amount: number | string
  total_amount: number | string
  note: string
  documents: unknown
  created_at: string
  updated_at: string
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc(
    'get_current_user_access',
  )

  if (error) {
    throw error
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  const companyId =
    (row as AccessRow | null)?.company_id

  if (!companyId) {
    throw new Error(
      'Aktivna tvrtka nije pronađena.',
    )
  }

  return companyId
}

function normalizeDocuments(
  value: unknown,
): IncomingInvoiceDocumentMeta[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === 'object',
    )
    .map((item) => ({
      id:
        typeof item.id === 'string'
          ? item.id
          : '',
      fileName:
        typeof item.fileName === 'string'
          ? item.fileName
          : 'dokument',
      mimeType:
        typeof item.mimeType === 'string'
          ? item.mimeType
          : 'application/octet-stream',
      createdAt:
        typeof item.createdAt === 'string'
          ? item.createdAt
          : new Date().toISOString(),
    }))
    .filter((item) => item.id)
}

function fromDb(row: DbRow): CloudIncomingInvoice {
  return {
    id: row.id,
    supplierName: row.supplier_name ?? '',
    supplierOib: row.supplier_oib ?? '',
    invoiceNumber: row.invoice_number ?? '',
    invoiceDate: row.invoice_date ?? '',
    dueDate: row.due_date ?? '',
    bookingDate: row.booking_date ?? '',
    category: row.category,
    status: row.status,
    paymentMethod: row.payment_method ?? '',
    netAmount: Number(row.net_amount) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    note: row.note ?? '',
    documents: normalizeDocuments(row.documents),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getIncomingInvoicesCloud():
  Promise<CloudIncomingInvoice[]> {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } = await supabase
    .from('incoming_invoices')
    .select('*')
    .eq('company_id', companyId)
    .order('invoice_date', {
      ascending: false,
      nullsFirst: false,
    })

  if (error) {
    throw error
  }

  return ((data ?? []) as DbRow[]).map(
    fromDb,
  )
}

function invoicePayload(
  invoice: CloudIncomingInvoice,
  companyId: string,
) {
  return {
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
    updated_at:
      invoice.updatedAt ||
      new Date().toISOString(),
  }
}

export async function upsertIncomingInvoiceCloud(
  invoice: CloudIncomingInvoice,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  const { data: existing, error: lookupError } =
    await supabase
      .from('incoming_invoices')
      .select('id')
      .eq('id', invoice.id)
      .eq('company_id', companyId)
      .maybeSingle()

  if (lookupError) {
    throw lookupError
  }

  if (existing) {
    const { error } = await supabase
      .from('incoming_invoices')
      .update(
        invoicePayload(
          invoice,
          companyId,
        ),
      )
      .eq('id', invoice.id)
      .eq('company_id', companyId)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase
    .from('incoming_invoices')
    .insert({
      id: invoice.id,
      ...invoicePayload(
        invoice,
        companyId,
      ),
      created_by: user.id,
      created_at:
        invoice.createdAt ||
        new Date().toISOString(),
    })

  if (error) {
    throw error
  }
}

export async function deleteIncomingInvoiceCloud(
  invoiceId: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('incoming_invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('company_id', companyId)

  if (error) {
    throw error
  }
}

export async function migrateLegacyIncomingInvoices(
  invoices: CloudIncomingInvoice[],
): Promise<void> {
  if (!invoices.length) {
    return
  }

  for (const invoice of invoices) {
    await upsertIncomingInvoiceCloud(invoice)
  }
}
