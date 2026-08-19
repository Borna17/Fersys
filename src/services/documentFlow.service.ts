import { supabase } from '../lib/supabase'
import {
  deleteUserDraft,
  loadUserDraft,
  saveUserDraft,
  type DraftType,
} from './drafts.service'

export type FlowDocumentType =
  | 'offer'
  | 'work_order'
  | 'delivery_note'
  | 'invoice'

export type FlowDocument = {
  id: string
  flowId: string
  documentType: FlowDocumentType
  documentId: string
  documentNumber: string
  relation: string
  sourceDocumentType?: FlowDocumentType
  sourceDocumentId?: string
  createdAt: string
}

export type DocumentSummary = {
  type: FlowDocumentType
  id: string
  number: string
  customerId: string
  customerName: string
  title: string
  status: string
  route: string
}

export type PendingConversion = {
  sourceType: FlowDocumentType
  sourceId: string
  sourceNumber: string
  targetType: FlowDocumentType
  customerId: string
  title: string
  startedAt: string
}

const PENDING_CONVERSION_KEY =
  'fersys_pending_document_conversion_v1'

const targetConfig: Record<
  FlowDocumentType,
  {
    route: string
    draftType?: DraftType
  }
> = {
  offer: {
    route: '/offers/new',
    draftType: 'offer',
  },
  work_order: {
    route: '/work-orders/new',
    draftType: 'work-order',
  },
  delivery_note: {
    route: '/inventory/delivery-notes/new',
  },
  invoice: {
    route: '/invoices/new',
    draftType: 'invoice',
  },
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

function addDays(
  dateString: string,
  days: number,
) {
  const date =
    new Date(
      `${dateString}T12:00:00`,
    )

  date.setDate(
    date.getDate() + days,
  )

  return date
    .toISOString()
    .slice(0, 10)
}

function asObject(
  value: unknown,
): Record<string, unknown> {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
    ? value as
        Record<string, unknown>
    : {}
}

function asArray(
  value: unknown,
) {
  return Array.isArray(
    value,
  )
    ? value
    : []
}

function text(
  value: unknown,
) {
  return typeof value ===
    'string'
    ? value
    : ''
}

function numberValue(
  value: unknown,
) {
  const parsed =
    Number(value)

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0
}

function customerTypeFromDatabase(
  value: unknown,
) {
  if (
    value === 'company'
  ) {
    return 'Tvrtka'
  }

  if (
    value === 'building'
  ) {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

function buildAddress(
  street: string,
  postalCode: string,
  city: string,
) {
  return [
    street,
    [
      postalCode,
      city,
    ]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join(', ')
}

async function currentCompanyId() {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Aktivna tvrtka nije pronađena.',
    )
  }

  return String(data)
}

async function customerDetails(
  customerId:
    string | null | undefined,
) {
  if (!customerId) {
    return null
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('customers')
      .select(
        'id,type,name,contact_person,oib,phone,email,street,city,postal_code',
      )
      .eq(
        'id',
        customerId,
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getDocumentSummary(
  type: FlowDocumentType,
  id: string,
): Promise<DocumentSummary | null> {
  if (
    type === 'offer'
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from('offers')
        .select(
          'id,offer_number,customer_id,customer_name,description,status',
        )
        .eq('id', id)
        .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    return {
      type,
      id: String(data.id),
      number:
        String(
          data.offer_number,
        ),
      customerId:
        data.customer_id
          ? String(
              data.customer_id,
            )
          : '',
      customerName:
        String(
          data.customer_name ??
          '',
        ),
      title:
        String(
          data.description ??
          data.customer_name ??
          'Ponuda',
        ),
      status:
        String(
          data.status ??
          '',
        ),
      route:
        `/offers/${data.id}`,
    }
  }

  if (
    type ===
    'work_order'
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'work_orders',
        )
        .select(
          'id,order_number,customer_id,customer_name,title,status',
        )
        .eq('id', id)
        .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    return {
      type,
      id: String(data.id),
      number:
        String(
          data.order_number,
        ),
      customerId:
        String(
          data.customer_id ??
          '',
        ),
      customerName:
        String(
          data.customer_name ??
          '',
        ),
      title:
        String(
          data.title ??
          'Radni nalog',
        ),
      status:
        String(
          data.status ??
          '',
        ),
      route:
        `/work-orders/${data.id}`,
    }
  }

  if (
    type ===
    'delivery_note'
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'delivery_notes',
        )
        .select(
          'id,delivery_note_number,customer_id,customer_name,note,status',
        )
        .eq('id', id)
        .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    return {
      type,
      id: String(data.id),
      number:
        String(
          data.delivery_note_number,
        ),
      customerId:
        data.customer_id
          ? String(
              data.customer_id,
            )
          : '',
      customerName:
        String(
          data.customer_name ??
          '',
        ),
      title:
        String(
          data.note ??
          'Otpremnica',
        ),
      status:
        String(
          data.status ??
          '',
        ),
      route:
        `/inventory/delivery-notes/${data.id}`,
    }
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('invoices')
      .select(
        'id,invoice_number,data,status',
      )
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const invoiceData =
    asObject(data.data)

  return {
    type,
    id: String(data.id),
    number:
      String(
        data.invoice_number,
      ),
    customerId:
      text(
        invoiceData.customerId,
      ),
    customerName:
      text(
        invoiceData.customerName,
      ),
    title:
      text(
        invoiceData.description,
      ) ||
      'Račun',
    status:
      String(
        data.status ??
        invoiceData.status ??
        '',
      ),
    route:
      `/invoices/${data.id}`,
  }
}

async function getSourceData(
  sourceType:
    FlowDocumentType,
  sourceId: string,
) {
  if (
    sourceType ===
    'offer'
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from('offers')
        .select('*')
        .eq(
          'id',
          sourceId,
        )
        .single()

    if (error) {
      throw error
    }

    return data
  }

  if (
    sourceType ===
    'work_order'
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'work_orders',
        )
        .select('*')
        .eq(
          'id',
          sourceId,
        )
        .single()

    if (error) {
      throw error
    }

    return data
  }

  if (
    sourceType ===
    'delivery_note'
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'delivery_notes',
        )
        .select('*')
        .eq(
          'id',
          sourceId,
        )
        .single()

    if (error) {
      throw error
    }

    return data
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('invoices')
      .select('*')
      .eq(
        'id',
        sourceId,
      )
      .single()

  if (error) {
    throw error
  }

  return {
    ...data,
    ...asObject(
      data.data,
    ),
  }
}

async function sourceCustomer(
  source:
    Record<string, unknown>,
) {
  const sourceCustomerId =
    text(
      source.customer_id,
    ) ||
    text(
      source.customerId,
    )

  const customer =
    await customerDetails(
      sourceCustomerId ||
      null,
    )

  if (customer) {
    return {
      id:
        String(
          customer.id,
        ),
      type:
        customerTypeFromDatabase(
          customer.type,
        ),
      name:
        String(
          customer.name ??
          '',
        ),
      contactPerson:
        String(
          customer.contact_person ??
          '',
        ),
      oib:
        String(
          customer.oib ??
          '',
        ),
      phone:
        String(
          customer.phone ??
          '',
        ),
      email:
        String(
          customer.email ??
          '',
        ),
      street:
        String(
          customer.street ??
          '',
        ),
      postalCode:
        String(
          customer.postal_code ??
          '',
        ),
      city:
        String(
          customer.city ??
          '',
        ),
    }
  }

  return {
    id:
      sourceCustomerId,
    type:
      text(
        source.customer_type,
      ) ||
      text(
        source.customerType,
      ) ||
      'Fizička osoba',
    name:
      text(
        source.customer_name,
      ) ||
      text(
        source.customerName,
      ),
    contactPerson:
      text(
        source.customer_contact_person,
      ) ||
      text(
        source.contact_person,
      ) ||
      text(
        source.contactPerson,
      ),
    oib:
      text(
        source.customer_oib,
      ) ||
      text(
        source.oib,
      ),
    phone:
      text(
        source.customer_phone,
      ) ||
      text(
        source.phone,
      ),
    email:
      text(
        source.customer_email,
      ) ||
      text(
        source.email,
      ),
    street:
      text(
        source.address,
      ),
    postalCode:
      text(
        source.postal_code,
      ) ||
      text(
        source.postalCode,
      ),
    city:
      text(
        source.city,
      ),
  }
}

function sourceItems(
  sourceType:
    FlowDocumentType,
  source:
    Record<string, unknown>,
) {
  if (
    sourceType ===
    'work_order'
  ) {
    const materials =
      asArray(
        source.materials,
      )
        .map(asObject)
        .filter(
          (item) =>
            text(
              item.name,
            ),
        )
        .map(
          (item) => ({
            id:
              crypto.randomUUID(),
            name:
              text(
                item.name,
              ),
            description:
              '',
            quantity:
              numberValue(
                item.quantity,
              ) || 1,
            unit:
              text(
                item.unit,
              ) ||
              'kom',
            price:
              numberValue(
                item.unitPrice,
              ),
            discount: 0,
            vat:
              numberValue(
                source.vat_rate,
              ) ||
              25,
          }),
        )

    const labourPrice =
      numberValue(
        source.labour_price,
      )

    if (
      labourPrice > 0
    ) {
      materials.push({
        id:
          crypto.randomUUID(),
        name:
          text(
            source.title,
          ) ||
          'Izvedeni radovi',
        description:
          text(
            source.description,
          ),
        quantity: 1,
        unit: 'usl',
        price:
          labourPrice,
        discount: 0,
        vat:
          numberValue(
            source.vat_rate,
          ) ||
          25,
      })
    }

    return materials
  }

  if (
    sourceType ===
    'delivery_note'
  ) {
    return asArray(
      source.items,
    )
      .map(asObject)
      .filter(
        (item) =>
          text(
            item.name,
          ),
      )
      .map(
        (item) => ({
          id:
            crypto.randomUUID(),
          name:
            text(
              item.name,
            ),
          description:
            text(
              item.description,
            ) ||
            text(
              item.note,
            ),
          quantity:
            numberValue(
              item.quantity,
            ) || 1,
          unit:
            text(
              item.unit,
            ) ||
            'kom',
          price:
            numberValue(
              item.unitPrice,
            ),
          discount: 0,
          vat:
            numberValue(
              item.vatRate,
            ) ||
            25,
        }),
      )
  }

  return asArray(
    source.items,
  )
    .map(asObject)
    .filter(
      (item) =>
        text(
          item.name,
        ),
    )
    .map(
      (item) => ({
        id:
          crypto.randomUUID(),
        name:
          text(
            item.name,
          ),
        description:
          text(
            item.description,
          ),
        quantity:
          numberValue(
            item.quantity,
          ) || 1,
        unit:
          text(
            item.unit,
          ) ||
          'kom',
        price:
          numberValue(
            item.price,
          ),
        discount:
          numberValue(
            item.discount,
          ),
        vat:
          numberValue(
            item.vat,
          ) ||
          25,
      }),
    )
}

function sourceNumber(
  sourceType:
    FlowDocumentType,
  source:
    Record<string, unknown>,
) {
  if (
    sourceType ===
    'offer'
  ) {
    return text(
      source.offer_number,
    )
  }

  if (
    sourceType ===
    'work_order'
  ) {
    return text(
      source.order_number,
    )
  }

  if (
    sourceType ===
    'delivery_note'
  ) {
    return text(
      source.delivery_note_number,
    )
  }

  return text(
    source.invoice_number,
  )
}

function sourceTitle(
  sourceType:
    FlowDocumentType,
  source:
    Record<string, unknown>,
) {
  if (
    sourceType ===
    'work_order'
  ) {
    return (
      text(source.title) ||
      text(source.description) ||
      'Radovi'
    )
  }

  return (
    text(source.description) ||
    `${
      sourceType === 'offer'
        ? 'Ponuda'
        : sourceType ===
            'delivery_note'
          ? 'Otpremnica'
          : 'Račun'
    } ${sourceNumber(
      sourceType,
      source,
    )}`
  )
}

function offerDraft(
  sourceType:
    FlowDocumentType,
  source:
    Record<string, unknown>,
  customer:
    Awaited<
      ReturnType<
        typeof sourceCustomer
      >
    >,
) {
  const date =
    today()

  return {
    date,
    validUntil:
      addDays(
        date,
        30,
      ),
    customerId:
      customer.id,
    customerType:
      customer.type,
    customerName:
      customer.name,
    oib:
      customer.oib,
    email:
      customer.email,
    phone:
      customer.phone,
    address:
      customer.street,
    postalCode:
      customer.postalCode,
    city:
      customer.city ||
      'Slavonski Brod',
    description:
      sourceTitle(
        sourceType,
        source,
      ),
    internalNote:
      `Kreirano iz ${
        sourceType ===
          'work_order'
          ? 'radnog naloga'
          : sourceType ===
              'delivery_note'
            ? 'otpremnice'
            : 'dokumenta'
      } ${sourceNumber(
        sourceType,
        source,
      )}.`,
    paymentTerms:
      'Plaćanje po završetku radova.',
    globalDiscount: 0,
    defaultVat: 25,
    responsiblePerson: '',
    items:
      sourceItems(
        sourceType,
        source,
      ),
    customerSearch:
      customer.name,
  }
}

function workOrderDraft(
  sourceType:
    FlowDocumentType,
  source:
    Record<string, unknown>,
  customer:
    Awaited<
      ReturnType<
        typeof sourceCustomer
      >
    >,
) {
  const items =
    sourceItems(
      sourceType,
      source,
    )

  return {
    customerId:
      customer.id,
    customerName:
      customer.name,
    customerContactPerson:
      customer.contactPerson,
    customerPhone:
      customer.phone,
    customerEmail:
      customer.email,
    customerOib:
      customer.oib,
    address:
      buildAddress(
        customer.street,
        customer.postalCode,
        customer.city,
      ) ||
      text(
        source.address,
      ),
    date:
      today(),
    arrivalTime: '',
    departureTime: '',
    status: 'Novi',
    priority:
      'Normalan',
    title:
      sourceTitle(
        sourceType,
        source,
      ),
    description:
      `Radovi prema ${
        sourceType ===
          'offer'
          ? 'ponudi'
          : sourceType ===
              'delivery_note'
            ? 'otpremnici'
            : 'dokumentu'
      } ${sourceNumber(
        sourceType,
        source,
      )}. ${
        text(
          source.description,
        )
      }`.trim(),
    assignedWorkers: [],
    materials:
      items.map(
        (item) => ({
          id:
            crypto.randomUUID(),
          name:
            item.name,
          quantity:
            item.quantity,
          unit:
            item.unit,
          unitPrice:
            item.price,
        }),
      ),
    labourPrice: '0',
    vatRate:
      String(
        items[0]?.vat ??
        25,
      ),
    priceNote:
      `Izvor: ${sourceNumber(
        sourceType,
        source,
      )}`,
    investorName:
      customer.name,
    investorSignature: '',
    images: [],
    selectedTemplateId: '',
  }
}

function invoiceDraft(
  sourceType:
    FlowDocumentType,
  source:
    Record<string, unknown>,
  customer:
    Awaited<
      ReturnType<
        typeof sourceCustomer
      >
    >,
) {
  const date =
    today()

  return {
    issueDate: date,
    serviceDate:
      sourceType ===
        'work_order'
        ? text(
            source.work_date,
          ) ||
          date
        : date,
    dueDate:
      addDays(
        date,
        15,
      ),
    customerType:
      customer.type,
    customerName:
      customer.name,
    oib:
      customer.oib,
    email:
      customer.email,
    phone:
      customer.phone,
    address:
      buildAddress(
        customer.street,
        customer.postalCode,
        customer.city,
      ) ||
      text(
        source.address,
      ),
    city:
      customer.city ||
      'Slavonski Brod',
    responsiblePerson: '',
    description:
      sourceTitle(
        sourceType,
        source,
      ),
    internalNote:
      `Kreirano iz ${
        sourceType ===
          'offer'
          ? 'ponude'
          : sourceType ===
              'work_order'
            ? 'radnog naloga'
            : sourceType ===
                'delivery_note'
              ? 'otpremnice'
              : 'dokumenta'
      } ${sourceNumber(
        sourceType,
        source,
      )}.`,
    paymentMethod:
      'Transakcijski račun',
    paymentModel:
      'HR00',
    paymentReference: '',
    iban: '',
    items:
      sourceItems(
        sourceType,
        source,
      ),
    customerSearch:
      customer.name,
  }
}

export async function hasExistingTargetDraft(
  targetType:
    FlowDocumentType,
) {
  const draftType =
    targetConfig[
      targetType
    ].draftType

  if (!draftType) {
    return false
  }

  const draft =
    await loadUserDraft<any>(
      draftType,
      'new',
    )

  return Boolean(
    draft,
  )
}

export async function prepareDocumentConversion(
  sourceType:
    FlowDocumentType,
  sourceId: string,
  targetType:
    FlowDocumentType,
  overwriteDraft = false,
) {
  const source =
    asObject(
      await getSourceData(
        sourceType,
        sourceId,
      ),
    )

  const customer =
    await sourceCustomer(
      source,
    )

  const summary =
    await getDocumentSummary(
      sourceType,
      sourceId,
    )

  if (!summary) {
    throw new Error(
      'Izvorni dokument nije pronađen.',
    )
  }

  const existing =
    await findExistingConvertedDocument(
      sourceType,
      sourceId,
      targetType,
    )

  if (existing) {
    return {
      existing,
      route:
        existing.route,
      alreadyExists:
        true,
    }
  }

  if (
    targetType ===
    'delivery_note'
  ) {
    const param =
      sourceType ===
        'offer'
        ? 'fromOffer'
        : sourceType ===
            'work_order'
          ? 'fromWorkOrder'
          : ''

    if (!param) {
      throw new Error(
        'Otpremnicu je trenutno moguće izraditi iz ponude ili radnog naloga.',
      )
    }

    savePendingConversion({
      sourceType,
      sourceId,
      sourceNumber:
        summary.number,
      targetType,
      customerId:
        summary.customerId,
      title:
        summary.title,
      startedAt:
        new Date()
          .toISOString(),
    })

    return {
      alreadyExists:
        false,
      route:
        `/inventory/delivery-notes/new?${param}=${encodeURIComponent(
          sourceId,
        )}`,
    }
  }

  const draftType =
    targetConfig[
      targetType
    ].draftType

  if (!draftType) {
    throw new Error(
      'Ciljni dokument nije podržan.',
    )
  }

  if (
    overwriteDraft
  ) {
    await deleteUserDraft(
      draftType,
      'new',
    )
  }

  const payload =
    targetType ===
      'offer'
      ? offerDraft(
          sourceType,
          source,
          customer,
        )
      : targetType ===
          'work_order'
        ? workOrderDraft(
            sourceType,
            source,
            customer,
          )
        : invoiceDraft(
            sourceType,
            source,
            customer,
          )

  await saveUserDraft(
    draftType,
    'new',
    payload,
  )

  savePendingConversion({
    sourceType,
    sourceId,
    sourceNumber:
      summary.number,
    targetType,
    customerId:
      summary.customerId,
    title:
      summary.title,
    startedAt:
      new Date()
        .toISOString(),
  })

  return {
    alreadyExists:
      false,
    route:
      targetConfig[
        targetType
      ].route,
  }
}

export function savePendingConversion(
  value:
    PendingConversion,
) {
  sessionStorage.setItem(
    PENDING_CONVERSION_KEY,
    JSON.stringify(
      value,
    ),
  )
}

export function readPendingConversion():
PendingConversion | null {
  try {
    const raw =
      sessionStorage.getItem(
        PENDING_CONVERSION_KEY,
      )

    if (!raw) {
      return null
    }

    const parsed =
      JSON.parse(
        raw,
      ) as PendingConversion

    if (
      !parsed.sourceId ||
      !parsed.sourceType ||
      !parsed.targetType
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearPendingConversion() {
  sessionStorage.removeItem(
    PENDING_CONVERSION_KEY,
  )
}

export async function finalizePendingConversion(
  targetType:
    FlowDocumentType,
  targetId: string,
) {
  const pending =
    readPendingConversion()

  if (
    !pending ||
    pending.targetType !==
      targetType
  ) {
    return false
  }

  const target =
    await getDocumentSummary(
      targetType,
      targetId,
    )

  if (!target) {
    return false
  }

  const {
    error,
  } =
    await supabase.rpc(
      'link_converted_document_v1',
      {
        p_source_type:
          pending.sourceType,
        p_source_id:
          pending.sourceId,
        p_source_number:
          pending.sourceNumber,
        p_target_type:
          targetType,
        p_target_id:
          targetId,
        p_target_number:
          target.number,
        p_customer_id:
          pending.customerId ||
          target.customerId ||
          null,
        p_title:
          pending.title ||
          target.title ||
          '',
      },
    )

  if (error) {
    throw error
  }

  clearPendingConversion()
  return true
}

export async function ensureFlow(
  document:
    DocumentSummary,
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'ensure_business_flow_v1',
      {
        p_document_type:
          document.type,
        p_document_id:
          document.id,
        p_document_number:
          document.number,
        p_customer_id:
          document.customerId ||
          null,
        p_title:
          document.title ||
          document.number,
      },
    )

  if (error) {
    throw error
  }

  return String(data)
}

export async function getFlowDocuments(
  documentType:
    FlowDocumentType,
  documentId: string,
): Promise<FlowDocument[]> {
  const companyId =
    await currentCompanyId()

  const {
    data:
      current,
    error:
      currentError,
  } =
    await supabase
      .from(
        'business_flow_documents',
      )
      .select(
        'flow_id',
      )
      .eq(
        'company_id',
        companyId,
      )
      .eq(
        'document_type',
        documentType,
      )
      .eq(
        'document_id',
        documentId,
      )
      .maybeSingle()

  if (currentError) {
    throw currentError
  }

  if (!current) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'business_flow_documents',
      )
      .select(
        'id,flow_id,document_type,document_id,document_number,relation,source_document_type,source_document_id,created_at',
      )
      .eq(
        'flow_id',
        current.flow_id,
      )
      .order(
        'created_at',
        {
          ascending: true,
        },
      )

  if (error) {
    throw error
  }

  return (
    data ??
    []
  ).map(
    (row) => ({
      id:
        String(row.id),
      flowId:
        String(
          row.flow_id,
        ),
      documentType:
        row.document_type as
          FlowDocumentType,
      documentId:
        String(
          row.document_id,
        ),
      documentNumber:
        String(
          row.document_number ??
          '',
        ),
      relation:
        String(
          row.relation,
        ),
      sourceDocumentType:
        row.source_document_type
          ? row.source_document_type as
              FlowDocumentType
          : undefined,
      sourceDocumentId:
        row.source_document_id
          ? String(
              row.source_document_id,
            )
          : undefined,
      createdAt:
        String(
          row.created_at,
        ),
    }),
  )
}

export function documentRoute(
  type:
    FlowDocumentType,
  id: string,
) {
  if (
    type === 'offer'
  ) {
    return `/offers/${id}`
  }

  if (
    type ===
    'work_order'
  ) {
    return `/work-orders/${id}`
  }

  if (
    type ===
    'delivery_note'
  ) {
    return `/inventory/delivery-notes/${id}`
  }

  return `/invoices/${id}`
}

export async function findExistingConvertedDocument(
  sourceType:
    FlowDocumentType,
  sourceId: string,
  targetType:
    FlowDocumentType,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'document_relations',
      )
      .select(
        'target_id,target_number',
      )
      .eq(
        'source_type',
        sourceType,
      )
      .eq(
        'source_id',
        sourceId,
      )
      .eq(
        'target_type',
        targetType,
      )
      .eq(
        'relation',
        'converted_to',
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    id:
      String(
        data.target_id,
      ),
    number:
      String(
        data.target_number ??
        '',
      ),
    route:
      documentRoute(
        targetType,
        String(
          data.target_id,
        ),
      ),
  }
}
