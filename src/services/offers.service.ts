import { supabase } from '../lib/supabase'
import { assertCanCreate } from '../subscription/subscription.service'

import type {
  Offer,
  OfferAttachment,
  OfferCustomer,
  OfferHistoryItem,
  OfferItem,
  OfferStatus,
} from '../types/offers'

export type CreateOfferInput = {
  customer: OfferCustomer

  date: string
  validUntil: string
  status: OfferStatus

  responsiblePerson: string
  description: string
  internalNote: string
  customerNote?: string
  paymentTerms: string

  items: OfferItem[]
  attachments?: OfferAttachment[]

  version?: number

  workOrderId?: string
  invoiceId?: string

  history?: OfferHistoryItem[]
}

export type UpdateOfferInput =
  Partial<CreateOfferInput>

type OfferRow = {
  id: string
  company_id: string
  customer_id: string | null

  offer_number: string
  version: number

  customer_name: string
  customer_type:
    | 'Fizička osoba'
    | 'Tvrtka'
    | 'Zgrada'

  oib: string | null
  email: string | null
  phone: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  contact_person: string | null

  offer_date: string
  valid_until: string
  status: OfferStatus

  responsible_person: string | null
  description: string | null
  internal_note: string | null
  customer_note: string | null
  payment_terms: string | null

  items: unknown
  attachments: unknown
  history: unknown

  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  cancelled_at: string | null

  rejection_reason: string | null
  cancellation_reason: string | null

  work_order_id: string | null
  invoice_id: string | null

  created_at: string
  updated_at: string
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function parseItems(value: unknown): OfferItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((item) => ({
      id:
        typeof item.id === 'string'
          ? item.id
          : crypto.randomUUID(),

      name:
        typeof item.name === 'string'
          ? item.name
          : '',

      description:
        typeof item.description === 'string'
          ? item.description
          : '',

      quantity:
        Math.max(
          0,
          Number(item.quantity) || 0,
        ),

      unit:
        typeof item.unit === 'string'
          ? item.unit
          : 'kom',

      price:
        Math.max(
          0,
          Number(item.price) || 0,
        ),

      discount:
        Math.min(
          100,
          Math.max(
            0,
            Number(item.discount) || 0,
          ),
        ),

      vat:
        Math.min(
          100,
          Math.max(
            0,
            Number(item.vat) || 0,
          ),
        ),

      imageDataUrl:
        typeof item.imageDataUrl === 'string'
          ? item.imageDataUrl
          : undefined,

      imageName:
        typeof item.imageName === 'string'
          ? item.imageName
          : undefined,
    }))
}

function parseAttachments(
  value: unknown,
): OfferAttachment[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((attachment) => ({
      id:
        typeof attachment.id === 'string'
          ? attachment.id
          : crypto.randomUUID(),

      name:
        typeof attachment.name === 'string'
          ? attachment.name
          : 'Privitak',

      type:
        typeof attachment.type === 'string'
          ? attachment.type
          : 'application/octet-stream',

      size:
        Math.max(
          0,
          Number(attachment.size) || 0,
        ),

      dataUrl:
        typeof attachment.dataUrl === 'string'
          ? attachment.dataUrl
          : undefined,

      createdAt:
        typeof attachment.createdAt === 'string'
          ? attachment.createdAt
          : new Date().toISOString(),
    }))
}

function parseHistory(
  value: unknown,
): OfferHistoryItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((historyItem) => ({
      id:
        typeof historyItem.id === 'string'
          ? historyItem.id
          : crypto.randomUUID(),

      date:
        typeof historyItem.date === 'string'
          ? historyItem.date
          : new Date().toISOString(),

      title:
        typeof historyItem.title === 'string'
          ? historyItem.title
          : 'Promjena ponude',

      description:
        typeof historyItem.description === 'string'
          ? historyItem.description
          : '',
    }))
}

function mapOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    offerNumber: row.offer_number,
    version: Number(row.version) || 1,

    customerId:
      row.customer_id ?? undefined,

    customerName: row.customer_name,
    customerType: row.customer_type,

    oib: row.oib ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    postalCode:
      row.postal_code ?? undefined,
    city: row.city ?? '',
    contactPerson:
      row.contact_person ?? undefined,

    date: row.offer_date,
    validUntil: row.valid_until,
    status: row.status,

    responsiblePerson:
      row.responsible_person ?? '',

    description:
      row.description ?? '',

    internalNote:
      row.internal_note ?? '',

    customerNote:
      row.customer_note ?? undefined,

    paymentTerms:
      row.payment_terms ?? '',

    items: parseItems(row.items),

    attachments:
      parseAttachments(row.attachments),

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    sentAt:
      row.sent_at ?? undefined,

    viewedAt:
      row.viewed_at ?? undefined,

    acceptedAt:
      row.accepted_at ?? undefined,

    rejectedAt:
      row.rejected_at ?? undefined,

    cancelledAt:
      row.cancelled_at ?? undefined,

    rejectionReason:
      row.rejection_reason ?? undefined,

    cancellationReason:
      row.cancellation_reason ?? undefined,

    workOrderId:
      row.work_order_id ?? undefined,

    invoiceId:
      row.invoice_id ?? undefined,

    history: parseHistory(row.history),
  }
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
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

async function generateOfferNumber(
  companyId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'generate_offer_number',
    {
      requested_company_id: companyId,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Broj ponude nije moguće generirati.',
    )
  }

  return String(data)
}

function createHistoryItem(
  title: string,
  description: string,
): OfferHistoryItem {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    title,
    description,
  }
}

function createStatusHistoryItem(
  status: OfferStatus,
): OfferHistoryItem {
  return createHistoryItem(
    `Status promijenjen: ${status}`,
    `Status ponude promijenjen je u „${status}”.`,
  )
}

function cleanItems(
  items: OfferItem[],
): OfferItem[] {
  return items
    .map((item) => ({
      ...item,

      id:
        item.id ||
        crypto.randomUUID(),

      name:
        item.name.trim(),

      description:
        item.description.trim(),

      quantity:
        Math.max(
          0,
          Number(item.quantity) || 0,
        ),

      unit:
        item.unit.trim() || 'kom',

      price:
        Math.max(
          0,
          Number(item.price) || 0,
        ),

      discount:
        Math.min(
          100,
          Math.max(
            0,
            Number(item.discount) || 0,
          ),
        ),

      vat:
        Math.min(
          100,
          Math.max(
            0,
            Number(item.vat) || 0,
          ),
        ),
    }))
    .filter((item) => item.name !== '')
}

function createDatabasePayload(
  input: CreateOfferInput,
) {
  return {
    customer_id:
      input.customer.id || null,

    customer_name:
      input.customer.name.trim(),

    customer_type:
      input.customer.type,

    oib:
      input.customer.oib
        .replace(/\D/g, '')
        .slice(0, 11) || null,

    email:
      input.customer.email
        .trim()
        .toLowerCase() || null,

    phone:
      input.customer.phone.trim() || null,

    address:
      input.customer.address.trim() || null,

    postal_code:
      input.customer.postalCode?.trim() ||
      null,

    city:
      input.customer.city.trim() || null,

    contact_person:
      input.customer.contactPerson?.trim() ||
      null,

    offer_date:
      input.date,

    valid_until:
      input.validUntil,

    status:
      input.status,

    responsible_person:
      input.responsiblePerson.trim() || null,

    description:
      input.description.trim() || null,

    internal_note:
      input.internalNote.trim() || null,

    customer_note:
      input.customerNote?.trim() || null,

    payment_terms:
      input.paymentTerms.trim() || null,

    items:
      cleanItems(input.items),

    attachments:
      input.attachments ?? [],

    version:
      Math.max(
        1,
        Number(input.version) || 1,
      ),

    work_order_id:
      input.workOrderId || null,

    invoice_id:
      input.invoiceId || null,

    history:
      input.history ?? [],
  }
}

export async function getOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('offer_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return ((data ?? []) as OfferRow[]).map(
    mapOffer,
  )
}

export async function getOfferById(
  offerId: string,
): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapOffer(data as OfferRow)
    : null
}

export async function getOfferByNumber(
  offerNumber: string,
): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('offer_number', offerNumber)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapOffer(data as OfferRow)
    : null
}

export async function createOffer(
  input: CreateOfferInput,
): Promise<Offer> {
  await assertCanCreate(
    'offers_monthly',
  )

  if (!input.customer.name.trim()) {
    throw new Error(
      'Naziv investitora je obavezan.',
    )
  }

  if (!input.date) {
    throw new Error(
      'Datum ponude je obavezan.',
    )
  }

  if (!input.validUntil) {
    throw new Error(
      'Datum valjanosti ponude je obavezan.',
    )
  }

  const cleanedItems =
    cleanItems(input.items)

  if (cleanedItems.length === 0) {
    throw new Error(
      'Ponuda mora sadržavati barem jednu stavku.',
    )
  }

  const companyId =
    await getCurrentCompanyId()

  const offerNumber =
    await generateOfferNumber(companyId)

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const initialHistory =
    input.history &&
    input.history.length > 0
      ? input.history
      : [
          createHistoryItem(
            'Ponuda izrađena',
            `Izrađena je ponuda ${offerNumber}.`,
          ),
        ]

  const { data, error } = await supabase
    .from('offers')
    .insert({
      company_id: companyId,
      offer_number: offerNumber,
      created_by: user?.id ?? null,

      ...createDatabasePayload({
        ...input,
        items: cleanedItems,
        history: initialHistory,
      }),
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Ponuda s ovim brojem već postoji. Pokušajte ponovno.',
      )
    }

    throw error
  }

  return mapOffer(data as OfferRow)
}

export async function updateOffer(
  offerId: string,
  input: UpdateOfferInput,
): Promise<Offer> {
  const existing =
    await getOfferById(offerId)

  if (!existing) {
    throw new Error(
      'Ponuda nije pronađena.',
    )
  }

  const completeInput: CreateOfferInput = {
    customer: {
      id:
        input.customer?.id ??
        existing.customerId,

      name:
        input.customer?.name ??
        existing.customerName,

      type:
        input.customer?.type ??
        existing.customerType,

      oib:
        input.customer?.oib ??
        existing.oib,

      email:
        input.customer?.email ??
        existing.email,

      phone:
        input.customer?.phone ??
        existing.phone,

      address:
        input.customer?.address ??
        existing.address,

      postalCode:
        input.customer?.postalCode ??
        existing.postalCode,

      city:
        input.customer?.city ??
        existing.city,

      contactPerson:
        input.customer?.contactPerson ??
        existing.contactPerson,
    },

    date:
      input.date ??
      existing.date,

    validUntil:
      input.validUntil ??
      existing.validUntil,

    status:
      input.status ??
      existing.status,

    responsiblePerson:
      input.responsiblePerson ??
      existing.responsiblePerson,

    description:
      input.description ??
      existing.description,

    internalNote:
      input.internalNote ??
      existing.internalNote,

    customerNote:
      input.customerNote ??
      existing.customerNote,

    paymentTerms:
      input.paymentTerms ??
      existing.paymentTerms,

    items:
      input.items ??
      existing.items,

    attachments:
      input.attachments ??
      existing.attachments,

    version:
      input.version ??
      existing.version,

    workOrderId:
      input.workOrderId ??
      existing.workOrderId,

    invoiceId:
      input.invoiceId ??
      existing.invoiceId,

    history:
      input.history ??
      existing.history,
  }

  const { data, error } = await supabase
    .from('offers')
    .update(
      createDatabasePayload(
        completeInput,
      ),
    )
    .eq('id', offerId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapOffer(data as OfferRow)
}

export async function updateOfferStatus(
  offerId: string,
  status: OfferStatus,
  reason?: string,
): Promise<Offer> {
  const existing =
    await getOfferById(offerId)

  if (!existing) {
    throw new Error(
      'Ponuda nije pronađena.',
    )
  }

  const nextHistory = [
    ...existing.history,
    createStatusHistoryItem(status),
  ]

  const updatePayload: Record<
    string,
    unknown
  > = {
    status,
    history: nextHistory,
  }

  if (status === 'Odbijeno') {
    updatePayload.rejection_reason =
      reason?.trim() || null
  }

  if (status === 'Otkazano') {
    updatePayload.cancellation_reason =
      reason?.trim() || null
  }

  const { data, error } = await supabase
    .from('offers')
    .update(updatePayload)
    .eq('id', offerId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapOffer(data as OfferRow)
}

export async function updateMultipleOfferStatuses(
  offerIds: string[],
  status: OfferStatus,
): Promise<Offer[]> {
  const uniqueIds = Array.from(
    new Set(offerIds),
  )

  if (uniqueIds.length === 0) {
    return []
  }

  const existingOffers =
    await getOffers()

  const selectedOffers =
    existingOffers.filter((offer) =>
      uniqueIds.includes(offer.id),
    )

  const updatedOffers =
    await Promise.all(
      selectedOffers.map((offer) =>
        updateOfferStatus(
          offer.id,
          status,
        ),
      ),
    )

  return updatedOffers
}

export async function duplicateOffer(
  sourceOfferId: string,
): Promise<Offer> {
  const sourceOffer =
    await getOfferById(sourceOfferId)

  if (!sourceOffer) {
    throw new Error(
      'Izvorna ponuda nije pronađena.',
    )
  }

  return createOffer({
    customer: {
      id: sourceOffer.customerId,
      name: sourceOffer.customerName,
      type: sourceOffer.customerType,
      oib: sourceOffer.oib,
      email: sourceOffer.email,
      phone: sourceOffer.phone,
      address: sourceOffer.address,
      postalCode:
        sourceOffer.postalCode,
      city: sourceOffer.city,
      contactPerson:
        sourceOffer.contactPerson,
    },

    date:
      new Date()
        .toISOString()
        .slice(0, 10),

    validUntil:
      sourceOffer.validUntil,

    status: 'Nacrt',

    responsiblePerson:
      sourceOffer.responsiblePerson,

    description:
      sourceOffer.description,

    internalNote:
      sourceOffer.internalNote,

    customerNote:
      sourceOffer.customerNote,

    paymentTerms:
      sourceOffer.paymentTerms,

    items:
      sourceOffer.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),

    attachments:
      sourceOffer.attachments?.map(
        (attachment) => ({
          ...attachment,
          id: crypto.randomUUID(),
          createdAt:
            new Date().toISOString(),
        }),
      ),

    version: 1,

    history: [
      createHistoryItem(
        'Ponuda duplicirana',
        `Nova ponuda izrađena je prema ponudi ${sourceOffer.offerNumber}.`,
      ),
    ],
  })
}

export async function deleteOffer(
  offerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', offerId)

  if (error) {
    throw error
  }
}

export async function deleteMultipleOffers(
  offerIds: string[],
): Promise<void> {
  const uniqueIds = Array.from(
    new Set(offerIds),
  )

  if (uniqueIds.length === 0) {
    return
  }

  const { error } = await supabase
    .from('offers')
    .delete()
    .in('id', uniqueIds)

  if (error) {
    throw error
  }
}

export async function clearAllOffers(): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('company_id', companyId)

  if (error) {
    throw error
  }
}
