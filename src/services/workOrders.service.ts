import { supabase } from '../lib/supabase'
import { assertCanCreate } from '../subscription/subscription.service'

export type CloudWorkOrderStatus =
  | 'Novi'
  | 'Zakazan'
  | 'U tijeku'
  | 'Završen'
  | 'Otkazan'

export type CloudWorkOrderPriority =
  | 'Nizak'
  | 'Normalan'
  | 'Visok'
  | 'Hitno'

export type CloudWorkOrderMaterial = {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
}

export type CloudWorkOrderImage = {
  id: string
  name: string
  dataUrl: string
}

export type CloudWorkOrder = {
  id: string
  companyId: string

  orderNumber: string

  customerId: string
  customerName: string
  customerContactPerson: string
  customerPhone: string
  customerEmail: string
  customerOib: string
  address: string

  date: string
  arrivalTime: string
  departureTime: string
  durationMinutes: number

  title: string
  description: string

  materials: CloudWorkOrderMaterial[]
  assignedWorkers: string[]

  labourPrice: number
  materialPrice: number
  vatRate: number
  totalPrice: number
  priceNote: string

  investorName: string
  investorSignature: string

  images: CloudWorkOrderImage[]

  status: CloudWorkOrderStatus
  priority: CloudWorkOrderPriority

  createdAt: string
  updatedAt: string
}

export type CreateWorkOrderInput = {
  customerId: string

  customerName: string
  customerContactPerson: string
  customerPhone: string
  customerEmail: string
  customerOib: string
  address: string

  date: string
  arrivalTime: string
  departureTime: string
  durationMinutes: number

  title: string
  description: string

  materials: CloudWorkOrderMaterial[]
  assignedWorkers: string[]

  labourPrice: number
  materialPrice: number
  vatRate: number
  totalPrice: number
  priceNote: string

  investorName: string
  investorSignature: string

  images: CloudWorkOrderImage[]

  status: CloudWorkOrderStatus
  priority: CloudWorkOrderPriority
}

export type UpdateWorkOrderInput =
  Partial<CreateWorkOrderInput>

type WorkOrderRow = {
  id: string
  company_id: string

  order_number: string

  customer_id: string
  customer_name: string
  customer_contact_person: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_oib: string | null
  address: string | null

  work_date: string
  arrival_time: string | null
  departure_time: string | null
  duration_minutes: number | null

  title: string
  description: string | null

  materials: unknown
  assigned_workers: unknown

  labour_price: number | string | null
  material_price: number | string | null
  vat_rate: number | string | null
  total_price: number | string | null
  price_note: string | null

  investor_name: string | null
  investor_signature: string | null

  images: unknown

  status: CloudWorkOrderStatus
  priority: CloudWorkOrderPriority

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

function parseMaterials(
  value: unknown,
): CloudWorkOrderMaterial[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((material) => ({
      id:
        typeof material.id === 'string'
          ? material.id
          : crypto.randomUUID(),

      name:
        typeof material.name === 'string'
          ? material.name
          : '',

      quantity:
        Number(material.quantity) || 0,

      unit:
        typeof material.unit === 'string'
          ? material.unit
          : 'kom',

      unitPrice:
        Number(material.unitPrice) || 0,
    }))
}

function parseImages(
  value: unknown,
): CloudWorkOrderImage[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((image) => ({
      id:
        typeof image.id === 'string'
          ? image.id
          : crypto.randomUUID(),

      name:
        typeof image.name === 'string'
          ? image.name
          : 'Fotografija',

      dataUrl:
        typeof image.dataUrl === 'string'
          ? image.dataUrl
          : '',
    }))
    .filter((image) => image.dataUrl !== '')
}

function parseWorkers(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (worker): worker is string =>
      typeof worker === 'string',
  )
}

function mapWorkOrder(
  row: WorkOrderRow,
): CloudWorkOrder {
  return {
    id: row.id,
    companyId: row.company_id,

    orderNumber: row.order_number,

    customerId: row.customer_id,
    customerName: row.customer_name,
    customerContactPerson:
      row.customer_contact_person ?? '',
    customerPhone: row.customer_phone ?? '',
    customerEmail: row.customer_email ?? '',
    customerOib: row.customer_oib ?? '',
    address: row.address ?? '',

    date: row.work_date,
    arrivalTime: row.arrival_time?.slice(0, 5) ?? '',
    departureTime:
      row.departure_time?.slice(0, 5) ?? '',
    durationMinutes:
      Number(row.duration_minutes) || 0,

    title: row.title,
    description: row.description ?? '',

    materials: parseMaterials(row.materials),
    assignedWorkers: parseWorkers(
      row.assigned_workers,
    ),

    labourPrice: Number(row.labour_price) || 0,
    materialPrice:
      Number(row.material_price) || 0,
    vatRate: Number(row.vat_rate) || 0,
    totalPrice: Number(row.total_price) || 0,
    priceNote: row.price_note ?? '',

    investorName: row.investor_name ?? '',
    investorSignature:
      row.investor_signature ?? '',

    images: parseImages(row.images),

    status: row.status,
    priority: row.priority,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function redactWorkOrderPrices(
  order: CloudWorkOrder,
): CloudWorkOrder {
  return {
    ...order,
    materials: order.materials.map(
      (material) => ({
        ...material,
        unitPrice: 0,
      }),
    ),
    labourPrice: 0,
    materialPrice: 0,
    vatRate: 0,
    totalPrice: 0,
    priceNote: '',
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

async function generateOrderNumber(
  companyId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'generate_work_order_number',
    {
      requested_company_id: companyId,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Broj radnog naloga nije moguće generirati.',
    )
  }

  return String(data)
}

function createDatabasePayload(
  input: CreateWorkOrderInput,
) {
  return {
    customer_id: input.customerId,

    customer_name: input.customerName.trim(),
    customer_contact_person:
      input.customerContactPerson.trim() || null,
    customer_phone:
      input.customerPhone.trim() || null,
    customer_email:
      input.customerEmail
        .trim()
        .toLowerCase() || null,
    customer_oib:
      input.customerOib
        .replace(/\D/g, '') || null,
    address: input.address.trim() || null,

    work_date: input.date,
    arrival_time: input.arrivalTime || null,
    departure_time:
      input.departureTime || null,
    duration_minutes:
      Math.max(0, input.durationMinutes),

    title: input.title.trim(),
    description:
      input.description.trim() || null,

    materials: input.materials,
    assigned_workers: input.assignedWorkers,

    labour_price:
      Math.max(0, input.labourPrice),
    material_price:
      Math.max(0, input.materialPrice),
    vat_rate:
      Math.max(0, input.vatRate),
    total_price:
      Math.max(0, input.totalPrice),
    price_note:
      input.priceNote.trim() || null,

    investor_name:
      input.investorName.trim() || null,
    investor_signature:
      input.investorSignature || null,

    images: input.images,

    status: input.status,
    priority: input.priority,
  }
}

export async function getWorkOrders(): Promise<
  CloudWorkOrder[]
> {
  const { data, error } = await supabase.rpc(
    'get_secure_work_orders',
  )

  if (error) {
    throw error
  }

  return ((data ?? []) as WorkOrderRow[]).map(
    mapWorkOrder,
  )
}

export async function getWorkOrderById(
  workOrderId: string,
): Promise<CloudWorkOrder | null> {
  const { data, error } = await supabase.rpc(
    'get_secure_work_order_by_id',
    {
      requested_work_order_id:
        workOrderId,
    },
  )

  if (error) {
    throw error
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  return row
    ? mapWorkOrder(row as WorkOrderRow)
    : null
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
): Promise<CloudWorkOrder> {
  await assertCanCreate(
    'work_orders_monthly',
  )

  const companyId = await getCurrentCompanyId()

  const orderNumber =
    await generateOrderNumber(companyId)

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      company_id: companyId,
      order_number: orderNumber,
      created_by: user?.id ?? null,
      ...createDatabasePayload(input),
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Radni nalog s ovim brojem već postoji. Pokušajte ponovno.',
      )
    }

    throw error
  }

  return mapWorkOrder(data as WorkOrderRow)
}

export async function updateWorkOrder(
  workOrderId: string,
  input: UpdateWorkOrderInput,
): Promise<CloudWorkOrder> {
  const existing =
    await getWorkOrderById(workOrderId)

  if (!existing) {
    throw new Error(
      'Radni nalog nije pronađen.',
    )
  }

  const completeInput: CreateWorkOrderInput = {
    customerId:
      input.customerId ?? existing.customerId,

    customerName:
      input.customerName ?? existing.customerName,

    customerContactPerson:
      input.customerContactPerson ??
      existing.customerContactPerson,

    customerPhone:
      input.customerPhone ??
      existing.customerPhone,

    customerEmail:
      input.customerEmail ??
      existing.customerEmail,

    customerOib:
      input.customerOib ??
      existing.customerOib,

    address:
      input.address ?? existing.address,

    date:
      input.date ?? existing.date,

    arrivalTime:
      input.arrivalTime ??
      existing.arrivalTime,

    departureTime:
      input.departureTime ??
      existing.departureTime,

    durationMinutes:
      input.durationMinutes ??
      existing.durationMinutes,

    title:
      input.title ?? existing.title,

    description:
      input.description ??
      existing.description,

    materials:
      input.materials ??
      existing.materials,

    assignedWorkers:
      input.assignedWorkers ??
      existing.assignedWorkers,

    labourPrice:
      input.labourPrice ??
      existing.labourPrice,

    materialPrice:
      input.materialPrice ??
      existing.materialPrice,

    vatRate:
      input.vatRate ?? existing.vatRate,

    totalPrice:
      input.totalPrice ??
      existing.totalPrice,

    priceNote:
      input.priceNote ??
      existing.priceNote,

    investorName:
      input.investorName ??
      existing.investorName,

    investorSignature:
      input.investorSignature ??
      existing.investorSignature,

    images:
      input.images ?? existing.images,

    status:
      input.status ?? existing.status,

    priority:
      input.priority ?? existing.priority,
  }

  const { data, error } = await supabase
    .from('work_orders')
    .update(
      createDatabasePayload(completeInput),
    )
    .eq('id', workOrderId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapWorkOrder(data as WorkOrderRow)
}

export async function deleteWorkOrder(
  workOrderId: string,
): Promise<void> {
  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', workOrderId)

  if (error) {
    throw error
  }
}
