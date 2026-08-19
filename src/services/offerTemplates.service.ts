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

export type OfferTemplateInput = {
  name: string
  description: string
  paymentTerms: string
  items: OfferItem[]
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

function cleanItems(
  value: unknown,
): OfferItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === 'object',
    )
    .map(
      (
        item,
      ) => {
        const row =
          item as Record<
            string,
            unknown
          >

        return {
          id:
            typeof row.id ===
              'string' &&
            row.id
              ? row.id
              : crypto.randomUUID(),
          name:
            String(
              row.name ?? '',
            ),
          description:
            String(
              row.description ?? '',
            ),
          quantity:
            Number(
              row.quantity ?? 1,
            ) || 0,
          unit:
            String(
              row.unit ?? 'kom',
            ),
          price:
            Number(
              row.price ?? 0,
            ) || 0,
          discount:
            Number(
              row.discount ?? 0,
            ) || 0,
          vat:
            Number(
              row.vat ?? 0,
            ) || 0,
          imageDataUrl:
            typeof row.imageDataUrl ===
              'string'
              ? row.imageDataUrl
              : undefined,
          imageName:
            typeof row.imageName ===
              'string'
              ? row.imageName
              : undefined,
        } satisfies OfferItem
      },
    )
}

function mapRow(
  row:
    OfferTemplateRow,
): OfferTemplate {
  return {
    id: row.id,
    companyId:
      row.company_id,
    createdBy:
      row.created_by,
    name: row.name,
    description:
      row.description,
    paymentTerms:
      row.payment_terms,
    items:
      cleanItems(
        row.items,
      ),
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

function cleanInput(
  input:
    OfferTemplateInput,
) {
  return {
    name:
      input.name.trim(),
    description:
      input.description.trim(),
    paymentTerms:
      input.paymentTerms.trim(),
    items:
      input.items.map(
        (item) => ({
          ...item,
          name:
            item.name.trim(),
          description:
            item.description.trim(),
          unit:
            item.unit.trim() ||
            'kom',
          quantity:
            Number(
              item.quantity,
            ) || 0,
          price:
            Number(
              item.price,
            ) || 0,
          discount:
            Number(
              item.discount,
            ) || 0,
          vat:
            Number(
              item.vat,
            ) || 0,
        }),
      ),
  }
}

export async function getOfferTemplates():
Promise<OfferTemplate[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'offer_templates',
      )
      .select('*')
      .order(
        'name',
        {
          ascending: true,
        },
      )

  if (error) {
    throw new Error(
      `Predloške ponuda nije moguće učitati: ${error.message}`,
    )
  }

  return (
    (
      data ??
      []
    ) as OfferTemplateRow[]
  ).map(mapRow)
}

export async function createOfferTemplate(
  input:
    OfferTemplateInput,
): Promise<OfferTemplate> {
  const clean =
    cleanInput(input)

  if (!clean.name) {
    throw new Error(
      'Unesite naziv predloška.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_offer_template_v1',
      {
        p_id: null,
        p_name:
          clean.name,
        p_description:
          clean.description,
        p_payment_terms:
          clean.paymentTerms,
        p_items:
          clean.items,
      },
    )

  if (error) {
    throw new Error(
      `Predložak ponude nije moguće spremiti: ${error.message}`,
    )
  }

  if (!data) {
    throw new Error(
      'Predložak ponude nije spremljen. Server nije vratio zapis.',
    )
  }

  return mapRow(
    data as OfferTemplateRow,
  )
}

export async function updateOfferTemplate(
  templateId: string,
  input:
    OfferTemplateInput,
): Promise<OfferTemplate> {
  const clean =
    cleanInput(input)

  if (!clean.name) {
    throw new Error(
      'Unesite naziv predloška.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'save_offer_template_v1',
      {
        p_id:
          templateId,
        p_name:
          clean.name,
        p_description:
          clean.description,
        p_payment_terms:
          clean.paymentTerms,
        p_items:
          clean.items,
      },
    )

  if (error) {
    throw new Error(
      `Predložak ponude nije moguće ažurirati: ${error.message}`,
    )
  }

  if (!data) {
    throw new Error(
      'Predložak ponude nije ažuriran. Server nije vratio zapis.',
    )
  }

  return mapRow(
    data as OfferTemplateRow,
  )
}

export async function deleteOfferTemplate(
  templateId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'delete_offer_template_v1',
      {
        p_id:
          templateId,
      },
    )

  if (error) {
    throw new Error(
      `Predložak ponude nije moguće obrisati: ${error.message}`,
    )
  }
}
