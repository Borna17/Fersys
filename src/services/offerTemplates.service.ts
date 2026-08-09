import { supabase } from '../lib/supabase'
import type { OfferItem } from '../types/offers'

export type OfferTemplate = {
  id: string
  companyId: string
  createdBy: string
  name: string
  description: string
  paymentTerms: string
  items: OfferItem[]
  createdAt: string
  updatedAt: string
}

type OfferTemplateRow = {
  id: string
  company_id: string
  created_by: string
  name: string
  description: string
  payment_terms: string
  items: unknown
  created_at: string
  updated_at: string
}

export type SaveOfferTemplateInput = {
  name: string
  description: string
  paymentTerms: string
  items: OfferItem[]
}

async function getCurrentCompanyId() {
  const { data, error } =
    await supabase.rpc('current_company_id')

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

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error('Korisnik nije prijavljen.')
  }

  return user.id
}

function parseItems(
  value: unknown,
): OfferItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map<OfferItem | null>((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item)
      ) {
        return null
      }

      const row =
        item as Record<string, unknown>

      const name =
        typeof row.name === 'string'
          ? row.name.trim()
          : ''

      if (!name) {
        return null
      }

      return {
        id: crypto.randomUUID(),
        name,
        description:
          typeof row.description === 'string'
            ? row.description
            : '',
        quantity:
          Math.max(0, Number(row.quantity) || 0),
        unit:
          typeof row.unit === 'string' &&
          row.unit.trim()
            ? row.unit
            : 'kom',
        price:
          Math.max(0, Number(row.price) || 0),
        discount:
          Math.max(0, Number(row.discount) || 0),
        vat:
          Math.max(0, Number(row.vat) || 0),
        imageDataUrl: undefined,
        imageName: undefined,
      } as OfferItem
    })
    .filter(
      (item): item is OfferItem =>
        item !== null,
    )
}

function mapRow(
  row: OfferTemplateRow,
): OfferTemplate {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    paymentTerms: row.payment_terms,
    items: parseItems(row.items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function cleanItems(
  items: OfferItem[],
) {
  return items
    .filter(
      (item) =>
        item.name.trim() !== '',
    )
    .map((item) => ({
      name: item.name.trim(),
      description: item.description.trim(),
      quantity: Math.max(
        0,
        Number(item.quantity) || 0,
      ),
      unit: item.unit.trim() || 'kom',
      price: Math.max(
        0,
        Number(item.price) || 0,
      ),
      discount: Math.max(
        0,
        Number(item.discount) || 0,
      ),
      vat: Math.max(
        0,
        Number(item.vat) || 0,
      ),
    }))
}

export async function getOfferTemplates():
Promise<OfferTemplate[]> {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } =
    await supabase
      .from('offer_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('name')

  if (error) {
    throw error
  }

  return (
    (data ?? []) as OfferTemplateRow[]
  ).map(mapRow)
}

export async function createOfferTemplate(
  input: SaveOfferTemplateInput,
) {
  const [
    companyId,
    userId,
  ] = await Promise.all([
    getCurrentCompanyId(),
    getCurrentUserId(),
  ])

  const { data, error } =
    await supabase
      .from('offer_templates')
      .insert({
        company_id: companyId,
        created_by: userId,
        name: input.name.trim(),
        description:
          input.description.trim(),
        payment_terms:
          input.paymentTerms.trim(),
        items: cleanItems(input.items),
      })
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as OfferTemplateRow,
  )
}

export async function updateOfferTemplate(
  id: string,
  input: SaveOfferTemplateInput,
) {
  const companyId =
    await getCurrentCompanyId()

  const { data, error } =
    await supabase
      .from('offer_templates')
      .update({
        name: input.name.trim(),
        description:
          input.description.trim(),
        payment_terms:
          input.paymentTerms.trim(),
        items: cleanItems(input.items),
      })
      .eq('company_id', companyId)
      .eq('id', id)
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as OfferTemplateRow,
  )
}

export async function deleteOfferTemplate(
  id: string,
) {
  const companyId =
    await getCurrentCompanyId()

  const { error } =
    await supabase
      .from('offer_templates')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id)

  if (error) {
    throw error
  }
}