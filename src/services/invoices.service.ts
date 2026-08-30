import { supabase } from '../lib/supabase'

export type InvoiceCloudShape = {
  id: string
  invoiceNumber: string
  issueDate: string
  status: string
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc(
    'current_company_id',
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

function mapRow<T extends InvoiceCloudShape>(
  row: any,
): T {
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

function payload<T extends InvoiceCloudShape>(
  invoice: T,
) {
  return {
    invoice_number:
      String(
        invoice.invoiceNumber,
      ).trim(),
    issue_date:
      String(
        invoice.issueDate,
      ),
    status:
      String(
        invoice.status,
      ),
    data: invoice,
    updated_at:
      new Date().toISOString(),
  }
}

export async function getInvoices<
  T extends InvoiceCloudShape,
>(): Promise<T[]> {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } =
    await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .order(
        'issue_date',
        { ascending: false },
      )
      .order(
        'created_at',
        { ascending: false },
      )

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row) => mapRow<T>(row),
  )
}

export async function createInvoice<
  T extends InvoiceCloudShape,
>(
  invoice: T,
): Promise<T> {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } =
    await supabase
      .from('invoices')
      .insert({
        ...payload(invoice),
        company_id:
          companyId,
      })
      .select('*')
      .single()

  if (error) {
    if (
      error.code ===
      '23505'
    ) {
      throw new Error(
        'Račun s ovim brojem već postoji.',
      )
    }

    throw error
  }

  return mapRow<T>(data)
}

export async function updateInvoice<
  T extends InvoiceCloudShape,
>(
  invoice: T,
): Promise<T> {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } =
    await supabase
      .from('invoices')
      .update(
        payload(invoice),
      )
      .eq(
        'id',
        invoice.id,
      )
      .eq('company_id', companyId)
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow<T>(data)
}

export async function deleteInvoice(
  id: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } =
    await supabase
      .from('invoices')
      .delete()
      .eq(
        'id',
        id,
      )
      .eq('company_id', companyId)

  if (error) {
    throw error
  }
}

export async function importLocalInvoices<
  T extends InvoiceCloudShape,
>(
  invoices: T[],
): Promise<void> {
  if (!invoices.length) {
    return
  }

  const companyId =
    await getCurrentCompanyId()

  for (
    const invoice of invoices
  ) {
    const { error } =
      await supabase
        .from('invoices')
        .upsert(
          {
            ...payload(invoice),
            company_id:
              companyId,
          },
          {
            onConflict:
              'company_id,invoice_number',
            ignoreDuplicates:
              true,
          },
        )

    if (error) {
      console.error(
        'Lokalni račun nije importiran:',
        error,
      )
    }
  }
}
