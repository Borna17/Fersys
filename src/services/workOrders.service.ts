import { supabase } from '../lib/supabase'
import { assertCanCreate } from '../subscription/subscription.service'
import { getWorkOrderImagesForDisplay } from './workOrderImages.service'
import { captureCurrentWeatherSnapshot } from './weather.service'

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
  discountRate?: number
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
  discountRate?: number
  vatRate: number
  totalPrice: number
  priceNote: string

  investorName: string
  investorSignature: string

  images: CloudWorkOrderImage[]

  weatherTemperatureC?: number | null
  weatherCondition?: string
  weatherHumidityPct?: number | null
  weatherWindKmh?: number | null
  weatherRecordedAt?: string
  weatherLatitude?: number | null
  weatherLongitude?: number | null
  weatherSource?: string

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
  discountRate?: number
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
  discount_rate: number | string | null
  vat_rate: number | string | null
  total_price: number | string | null
  price_note: string | null

  investor_name: string | null
  investor_signature: string | null

  images: unknown

  weather_temperature_c: number | string | null
  weather_condition: string | null
  weather_humidity_pct: number | string | null
  weather_wind_kmh: number | string | null
  weather_recorded_at: string | null
  weather_latitude: number | string | null
  weather_longitude: number | string | null
  weather_source: string | null

  status: CloudWorkOrderStatus
  priority: CloudWorkOrderPriority

  created_at: string
  updated_at: string
}

/*
 * Optimistic concurrency protection.
 *
 * Svaki otvoreni browser/PWA pamti updated_at verziju radnog naloga koju je
 * stvarno učitao. Pri spremanju zapis se smije promijeniti samo ako je ta
 * verzija još uvijek aktualna u bazi. Time dva uređaja (čak i ako koriste isti
 * e-mail / isti Supabase user_id) više ne mogu tiho pregaziti jedan drugoga.
 */
const workOrderVersionById =
  new Map<string, string>()

export class WorkOrderConflictError extends Error {
  constructor() {
    super(
      'Radni nalog je u međuvremenu izmijenjen na drugom uređaju. Vaše izmjene nisu prepisale noviju verziju. Ponovno otvorite nalog i unesite izmjene na najnovijoj verziji.',
    )
    this.name = 'WorkOrderConflictError'
  }
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

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
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

      discountRate:
        clampPercent(
          Number(material.discountRate) || 0,
        ),
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
    discountRate:
      clampPercent(Number(row.discount_rate) || 0),
    vatRate: Number(row.vat_rate) || 0,
    totalPrice: Number(row.total_price) || 0,
    priceNote: row.price_note ?? '',

    investorName: row.investor_name ?? '',
    investorSignature:
      row.investor_signature ?? '',

    images: parseImages(row.images),

    weatherTemperatureC:
      row.weather_temperature_c === null
        ? null
        : Number(row.weather_temperature_c),
    weatherCondition:
      row.weather_condition ?? '',
    weatherHumidityPct:
      row.weather_humidity_pct === null
        ? null
        : Number(row.weather_humidity_pct),
    weatherWindKmh:
      row.weather_wind_kmh === null
        ? null
        : Number(row.weather_wind_kmh),
    weatherRecordedAt:
      row.weather_recorded_at ?? '',
    weatherLatitude:
      row.weather_latitude === null
        ? null
        : Number(row.weather_latitude),
    weatherLongitude:
      row.weather_longitude === null
        ? null
        : Number(row.weather_longitude),
    weatherSource:
      row.weather_source ?? '',

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
        discountRate: 0,
      }),
    ),
    labourPrice: 0,
    materialPrice: 0,
    discountRate: 0,
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

    materials: input.materials.map((material) => ({
      ...material,
      quantity: Math.max(0, Number(material.quantity) || 0),
      unitPrice: Math.max(0, Number(material.unitPrice) || 0),
      discountRate: clampPercent(Number(material.discountRate) || 0),
    })),
    assigned_workers: input.assignedWorkers,

    labour_price:
      Math.max(0, input.labourPrice),
    material_price:
      Math.max(0, input.materialPrice),
    discount_rate:
      clampPercent(input.discountRate ?? 0),
    vat_rate:
      clampPercent(input.vatRate),
    total_price:
      Math.max(0, input.totalPrice),
    price_note:
      input.priceNote.trim() || null,

    investor_name:
      input.investorName.trim() || null,
    investor_signature:
      input.investorSignature || null,

    images: input.images.filter((image) => image.dataUrl.startsWith('data:')),

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

  if (!row) {
    workOrderVersionById.delete(
      workOrderId,
    )
    return null
  }

  const order =
    mapWorkOrder(
      row as WorkOrderRow,
    )

  const hydratedImages =
    await getWorkOrderImagesForDisplay(
      workOrderId,
    )

  const hydratedOrder: CloudWorkOrder = {
    ...order,
    images: hydratedImages,
  }

  workOrderVersionById.set(
    workOrderId,
    hydratedOrder.updatedAt,
  )

  return hydratedOrder
}

async function attachWeatherSnapshot(
  workOrderId: string,
) {
  try {
    const snapshot =
      await captureCurrentWeatherSnapshot()

    const { error } = await supabase
      .from('work_orders')
      .update({
        weather_temperature_c:
          snapshot.temperatureC,
        weather_condition:
          snapshot.condition,
        weather_humidity_pct:
          snapshot.humidityPct,
        weather_wind_kmh:
          snapshot.windKmh,
        weather_recorded_at:
          snapshot.recordedAt,
        weather_latitude:
          snapshot.latitude,
        weather_longitude:
          snapshot.longitude,
        weather_source:
          snapshot.source,
      })
      .eq('id', workOrderId)

    if (error) {
      throw error
    }
  } catch (error) {
    /* Weather je dodatni kontekst i nikada ne smije blokirati spremanje naloga. */
    console.warn(
      '[FERSYS Weather] Snapshot radnog naloga nije spremljen:',
      error,
    )
  }
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

  const created =
    mapWorkOrder(data as WorkOrderRow)

  workOrderVersionById.set(
    created.id,
    created.updatedAt,
  )

  /*
   * Nalog je već sigurno spremljen. Vrijeme dohvaćamo u pozadini kako GPS ili
   * weather API ne bi usporavali korisnika na terenu.
   */
  void attachWeatherSnapshot(
    created.id,
  )

  return created
}

export async function updateWorkOrder(
  workOrderId: string,
  input: UpdateWorkOrderInput,
): Promise<CloudWorkOrder> {
  /*
   * Verziju uzimamo PRIJE svježeg čitanja iz baze. Ako bi se verzija uzela
   * nakon čitanja, drugi uređaj bi već mogao promijeniti nalog i konflikt bi
   * ostao neprimijećen.
   */
  const expectedUpdatedAt =
    workOrderVersionById.get(
      workOrderId,
    )

  const existing =
    await getWorkOrderById(workOrderId)

  if (!existing) {
    throw new Error(
      'Radni nalog nije pronađen.',
    )
  }

  if (
    expectedUpdatedAt &&
    existing.updatedAt !==
      expectedUpdatedAt
  ) {
    /*
     * getWorkOrderById je upravo zapamtio noviju verziju. Vraćamo očekivanu
     * verziju u mapu kako sljedeći save bez ponovnog otvaranja ne bi mogao
     * slučajno proći.
     */
    workOrderVersionById.set(
      workOrderId,
      expectedUpdatedAt,
    )
    throw new WorkOrderConflictError()
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

    discountRate:
      input.discountRate ??
      existing.discountRate,

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

  let query = supabase
    .from('work_orders')
    .update(
      createDatabasePayload(completeInput),
    )
    .eq('id', workOrderId)

  if (expectedUpdatedAt) {
    query = query.eq(
      'updated_at',
      expectedUpdatedAt,
    )
  }

  const { data, error } = await query
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  /*
   * Ako UPDATE nije vratio red, updated_at više nije isti: drugi uređaj je
   * spremio nalog između našeg čitanja i našeg UPDATE-a. To je atomska zaštita
   * od race conditiona.
   */
  if (!data) {
    throw new WorkOrderConflictError()
  }

  const saved =
    mapWorkOrder(data as WorkOrderRow)

  workOrderVersionById.set(
    saved.id,
    saved.updatedAt,
  )

  return saved
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

  workOrderVersionById.delete(
    workOrderId,
  )
}
