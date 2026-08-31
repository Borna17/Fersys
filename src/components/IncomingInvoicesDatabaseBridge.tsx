import { useEffect } from 'react'

import { supabase } from '../lib/supabase'
import { scopedStorageKey } from '../utils/scopedLocalStorage'

type CachedInvoice = {
  id: string
  supplierName?: string
  supplierOib?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  bookingDate?: string
  category?: string
  status?: string
  paymentMethod?: string
  netAmount?: number
  vatAmount?: number
  totalAmount?: number
  note?: string
  documents?: unknown[]
  createdAt?: string
  updatedAt?: string
}

type AccessRow = { company_id?: string | null }

const BASE_KEY = 'fersys_incoming_invoices'

function parseInvoices(value: string | null): CachedInvoice[] {
  try {
    const parsed = JSON.parse(value ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function currentCompanyId() {
  const { data, error } = await supabase.rpc('get_current_user_access')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return (row as AccessRow | null)?.company_id ?? null
}

function rowToCache(row: any): CachedInvoice {
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

function cacheToRow(invoice: CachedInvoice, companyId: string, userId: string) {
  const now = new Date().toISOString()
  return {
    id: invoice.id,
    company_id: companyId,
    supplier_name: invoice.supplierName ?? '',
    supplier_oib: invoice.supplierOib ?? '',
    invoice_number: invoice.invoiceNumber ?? '',
    invoice_date: invoice.invoiceDate || null,
    due_date: invoice.dueDate || null,
    booking_date: invoice.bookingDate || null,
    category: invoice.category ?? 'Ostalo',
    status: invoice.status ?? 'Za knjiženje',
    payment_method: invoice.paymentMethod ?? 'Ostalo',
    net_amount: Number(invoice.netAmount ?? 0),
    vat_amount: Number(invoice.vatAmount ?? 0),
    total_amount: Number(invoice.totalAmount ?? 0),
    note: invoice.note ?? '',
    documents: Array.isArray(invoice.documents) ? invoice.documents : [],
    created_by: userId,
    created_at: invoice.createdAt ?? now,
    updated_at: invoice.updatedAt ?? now,
  }
}

async function mirrorCacheChange(previous: CachedInvoice[], next: CachedInvoice[]) {
  const companyId = await currentCompanyId()
  if (!companyId) return

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return

  if (next.length) {
    const { error } = await supabase
      .from('incoming_invoices')
      .upsert(
        next.map((invoice) => cacheToRow(invoice, companyId, authData.user!.id)),
        { onConflict: 'id' },
      )
    if (error) throw error
  }

  const nextIds = new Set(next.map((item) => item.id))
  const deletedIds = previous.map((item) => item.id).filter((id) => !nextIds.has(id))

  if (deletedIds.length) {
    const { error } = await supabase
      .from('incoming_invoices')
      .delete()
      .eq('company_id', companyId)
      .in('id', deletedIds)
    if (error) throw error
  }
}

export default function IncomingInvoicesDatabaseBridge() {
  useEffect(() => {
    const storage = window.localStorage
    const originalSetItem = Storage.prototype.setItem
    let disposed = false
    let hydrating = false

    const hydrate = async () => {
      try {
        const companyId = await currentCompanyId()
        if (!companyId || disposed) return

        const { data, error } = await supabase
          .from('incoming_invoices')
          .select('*')
          .eq('company_id', companyId)
          .order('invoice_date', { ascending: false })
          .order('created_at', { ascending: false })
        if (error) throw error

        const key = scopedStorageKey(BASE_KEY)
        const next = (data ?? []).map(rowToCache)
        const nextRaw = JSON.stringify(next)
        const currentRaw = storage.getItem(key) ?? '[]'

        if (currentRaw !== nextRaw) {
          hydrating = true
          originalSetItem.call(storage, key, nextRaw)
          hydrating = false

          // Existing invoice pages use the local cache as their render model.
          // Reload only once after DB hydration so the current page immediately shows DB data.
          if (window.location.pathname.startsWith('/incoming-invoices')) {
            const guard = `fersys_incoming_invoice_db_hydrated:${companyId}`
            if (sessionStorage.getItem(guard) !== nextRaw.slice(0, 180)) {
              sessionStorage.setItem(guard, nextRaw.slice(0, 180))
              window.location.reload()
            }
          }
        }
      } catch (error) {
        console.error('FERSYS ulazni računi: učitavanje iz baze nije uspjelo.', error)
      }
    }

    Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
      const previousRaw = this.getItem(key)
      originalSetItem.call(this, key, value)

      if (
        !hydrating &&
        this === storage &&
        key.startsWith(`${BASE_KEY}:`)
      ) {
        const previous = parseInvoices(previousRaw)
        const next = parseInvoices(value)
        void mirrorCacheChange(previous, next).catch((error) => {
          console.error('FERSYS ulazni računi: spremanje u bazu nije uspjelo.', error)
        })
      }
    }

    void hydrate()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void hydrate(), 0)
    })

    return () => {
      disposed = true
      listener.subscription.unsubscribe()
      Storage.prototype.setItem = originalSetItem
    }
  }, [])

  return null
}
