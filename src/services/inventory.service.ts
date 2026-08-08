import { supabase } from '../lib/supabase'

export type InventoryUnit =
  | 'kom'
  | 'm'
  | 'kg'
  | 'l'
  | 'paket'
  | 'rola'
  | 'set'

export type InventoryTrackingType =
  | 'pieces'
  | 'metres'
  | 'piece-length'

export type InventoryMovementType =
  | 'entry'
  | 'exit'
  | 'correction'
  | 'transfer'

export interface InventoryLocationStock {
  id: string
  locationId: string
  locationName: string
  quantity: number
}

export interface InventoryLocation {
  id: string
  name: string
  description: string
  image?: string
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  itemId: string
  type: InventoryMovementType
  quantity: number
  previousQuantity: number
  newQuantity: number

  locationId?: string
  locationName?: string

  destinationLocationId?: string
  destinationLocationName?: string

  workOrderId?: string
  workOrderNumber?: string

  incomingInvoiceId?: string
  incomingInvoiceNumber?: string

  employeeUserId?: string
  employeeName?: string
  note?: string

  createdAt: string
}

export interface InventoryItem {
  id: string

  name: string
  shortName: string
  alternativeNames: string[]

  code: string
  barcode: string
  qrValue: string

  category: string
  subcategory: string

  manufacturer: string
  supplier: string

  description: string
  usageDescription: string
  warningNote: string

  image: string
  additionalImages: string[]

  trackingType: InventoryTrackingType
  unit: InventoryUnit

  quantity: number
  minimumQuantity: number

  pieceLengthMetres: number
  totalMetres: number

  diameter: string
  dimension: string

  purchasePrice: number
  salePrice: number
  vatRate: number

  locationStocks: InventoryLocationStock[]
  relatedItemIds: string[]

  createdAt: string
  updatedAt: string
}

export interface CreateInventoryItemInput {
  name: string
  shortName?: string
  alternativeNames?: string[]

  code?: string
  barcode?: string

  category?: string
  subcategory?: string

  manufacturer?: string
  supplier?: string

  description?: string
  usageDescription?: string
  warningNote?: string

  image?: string
  additionalImages?: string[]

  trackingType: InventoryTrackingType
  unit: InventoryUnit

  quantity?: number
  minimumQuantity?: number
  pieceLengthMetres?: number

  diameter?: string
  dimension?: string

  purchasePrice?: number
  salePrice?: number
  vatRate?: number

  locationStocks?: Array<{
    locationId: string
    locationName?: string
    quantity: number
  }>

  relatedItemIds?: string[]
}

export interface InventoryAdjustmentInput {
  itemId: string
  type: 'entry' | 'exit' | 'correction'
  quantity: number

  locationId?: string

  workOrderId?: string
  workOrderNumber?: string

  incomingInvoiceId?: string
  incomingInvoiceNumber?: string

  note?: string
}

type ItemRow = {
  id: string
  name: string
  short_name: string | null
  alternative_names: string[] | null
  code: string
  barcode: string | null
  qr_value: string | null
  category: string | null
  subcategory: string | null
  manufacturer: string | null
  supplier: string | null
  description: string | null
  usage_description: string | null
  warning_note: string | null
  image: string | null
  additional_images: string[] | null
  tracking_type: InventoryTrackingType
  unit: InventoryUnit
  quantity: number | string
  minimum_quantity: number | string
  piece_length_metres: number | string
  total_metres: number | string
  diameter: string | null
  dimension: string | null
  purchase_price: number | string
  sale_price: number | string
  vat_rate: number | string
  related_item_ids: string[] | null
  created_at: string
  updated_at: string
}

type LocationRow = {
  id: string
  name: string
  description: string | null
  image: string | null
  created_at: string
  updated_at: string
}

type StockRow = {
  id: string
  item_id: string
  location_id: string
  quantity: number | string
  inventory_locations?:
    | {
        name?: string | null
      }
    | Array<{
        name?: string | null
      }>
    | null
}

type MovementRow = {
  id: string
  item_id: string
  type: InventoryMovementType
  quantity: number | string
  previous_quantity: number | string
  new_quantity: number | string
  location_id: string | null
  location_name: string | null
  destination_location_id: string | null
  destination_location_name: string | null
  work_order_id: string | null
  work_order_number: string | null
  incoming_invoice_id: string | null
  incoming_invoice_number: string | null
  employee_user_id: string | null
  employee_name: string | null
  note: string | null
  created_at: string
}

function numberValue(
  value: number | string | null | undefined,
): number {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function getJoinedLocationName(
  stock: StockRow,
): string {
  const joined =
    stock.inventory_locations

  if (Array.isArray(joined)) {
    return joined[0]?.name ?? ''
  }

  return joined?.name ?? ''
}

function mapLocation(
  row: LocationRow,
): InventoryLocation {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    image: row.image ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMovement(
  row: MovementRow,
): InventoryMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    type: row.type,
    quantity: numberValue(row.quantity),
    previousQuantity:
      numberValue(
        row.previous_quantity,
      ),
    newQuantity:
      numberValue(
        row.new_quantity,
      ),
    locationId:
      row.location_id ?? undefined,
    locationName:
      row.location_name ?? undefined,
    destinationLocationId:
      row.destination_location_id ??
      undefined,
    destinationLocationName:
      row.destination_location_name ??
      undefined,
    workOrderId:
      row.work_order_id ?? undefined,
    workOrderNumber:
      row.work_order_number ??
      undefined,
    incomingInvoiceId:
      row.incoming_invoice_id ??
      undefined,
    incomingInvoiceNumber:
      row.incoming_invoice_number ??
      undefined,
    employeeUserId:
      row.employee_user_id ??
      undefined,
    employeeName:
      row.employee_name ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }
}

function mapItem(
  row: ItemRow,
  stocks: InventoryLocationStock[],
): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name ?? '',
    alternativeNames:
      row.alternative_names ?? [],
    code: row.code,
    barcode: row.barcode ?? '',
    qrValue: row.qr_value ?? '',
    category: row.category ?? '',
    subcategory: row.subcategory ?? '',
    manufacturer:
      row.manufacturer ?? '',
    supplier: row.supplier ?? '',
    description:
      row.description ?? '',
    usageDescription:
      row.usage_description ?? '',
    warningNote:
      row.warning_note ?? '',
    image: row.image ?? '',
    additionalImages:
      row.additional_images ?? [],
    trackingType:
      row.tracking_type,
    unit: row.unit,
    quantity:
      numberValue(row.quantity),
    minimumQuantity:
      numberValue(
        row.minimum_quantity,
      ),
    pieceLengthMetres:
      numberValue(
        row.piece_length_metres,
      ),
    totalMetres:
      numberValue(
        row.total_metres,
      ),
    diameter: row.diameter ?? '',
    dimension:
      row.dimension ?? '',
    purchasePrice:
      numberValue(
        row.purchase_price,
      ),
    salePrice:
      numberValue(
        row.sale_price,
      ),
    vatRate:
      numberValue(row.vat_rate),
    locationStocks: stocks,
    relatedItemIds:
      row.related_item_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCurrentCompanyId():
Promise<string> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'current_company_id',
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

async function getCurrentUserId():
Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  return data.user.id
}

function generateCode(
  existingCount: number,
): string {
  return `ART-${String(
    existingCount + 1,
  ).padStart(5, '0')}`
}

function createQrValue(
  itemId: string,
): string {
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://fersys.app'

  return `${baseUrl}/inventory/items/${itemId}`
}

export async function getInventoryLocations():
Promise<InventoryLocation[]> {
  const {
    data,
    error,
  } = await supabase
    .from('inventory_locations')
    .select(
      'id,name,description,image,created_at,updated_at',
    )
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return (
    (data ?? []) as LocationRow[]
  ).map(mapLocation)
}

export async function createInventoryLocation(
  input: {
    name: string
    description?: string
    image?: string
  },
): Promise<InventoryLocation> {
  const companyId =
    await getCurrentCompanyId()

  const userId =
    await getCurrentUserId()

  const {
    data,
    error,
  } = await supabase
    .from('inventory_locations')
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      description:
        input.description?.trim() ??
        '',
      image: input.image ?? '',
      created_by: userId,
    })
    .select(
      'id,name,description,image,created_at,updated_at',
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapLocation(
    data as LocationRow,
  )
}

export async function getInventoryItems():
Promise<InventoryItem[]> {
  const [
    itemResponse,
    stockResponse,
  ] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false,
        },
      ),

    supabase
      .from(
        'inventory_location_stocks',
      )
      .select(
        'id,item_id,location_id,quantity,inventory_locations(name)',
      ),
  ])

  if (itemResponse.error) {
    throw new Error(
      itemResponse.error.message,
    )
  }

  if (stockResponse.error) {
    throw new Error(
      stockResponse.error.message,
    )
  }

  const stocksByItem =
    new Map<
      string,
      InventoryLocationStock[]
    >()

  for (
    const stock of
    (stockResponse.data ??
      []) as StockRow[]
  ) {
    const list =
      stocksByItem.get(
        stock.item_id,
      ) ?? []

    list.push({
      id: stock.id,
      locationId:
        stock.location_id,
      locationName:
        getJoinedLocationName(
          stock,
        ),
      quantity:
        numberValue(
          stock.quantity,
        ),
    })

    stocksByItem.set(
      stock.item_id,
      list,
    )
  }

  return (
    (itemResponse.data ??
      []) as ItemRow[]
  ).map((item) =>
    mapItem(
      item,
      stocksByItem.get(
        item.id,
      ) ?? [],
    ),
  )
}

export async function getInventoryItemById(
  itemId: string,
): Promise<InventoryItem | null> {
  const {
    data,
    error,
  } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const {
    data: stocks,
    error: stocksError,
  } = await supabase
    .from(
      'inventory_location_stocks',
    )
    .select(
      'id,item_id,location_id,quantity,inventory_locations(name)',
    )
    .eq('item_id', itemId)

  if (stocksError) {
    throw new Error(
      stocksError.message,
    )
  }

  const mappedStocks =
    ((stocks ?? []) as StockRow[]).map(
      (stock) => ({
        id: stock.id,
        locationId:
          stock.location_id,
        locationName:
          getJoinedLocationName(
            stock,
          ),
        quantity:
          numberValue(
            stock.quantity,
          ),
      }),
    )

  return mapItem(
    data as ItemRow,
    mappedStocks,
  )
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const companyId =
    await getCurrentCompanyId()

  const userId =
    await getCurrentUserId()

  const existingItems =
    await getInventoryItems()

  const itemId =
    crypto.randomUUID()

  const code =
    input.code?.trim() ||
    generateCode(
      existingItems.length,
    )

  const {
    error,
  } = await supabase
    .from('inventory_items')
    .insert({
      id: itemId,
      company_id: companyId,
      name: input.name.trim(),
      short_name:
        input.shortName?.trim() ??
        '',
      alternative_names:
        input.alternativeNames ?? [],
      code,
      barcode:
        input.barcode?.trim() ??
        '',
      qr_value:
        createQrValue(itemId),
      category:
        input.category?.trim() ??
        '',
      subcategory:
        input.subcategory?.trim() ??
        '',
      manufacturer:
        input.manufacturer?.trim() ??
        '',
      supplier:
        input.supplier?.trim() ??
        '',
      description:
        input.description?.trim() ??
        '',
      usage_description:
        input.usageDescription?.trim() ??
        '',
      warning_note:
        input.warningNote?.trim() ??
        '',
      image: input.image ?? '',
      additional_images:
        input.additionalImages ?? [],
      tracking_type:
        input.trackingType,
      unit: input.unit,
      quantity: 0,
      minimum_quantity:
        input.minimumQuantity ?? 0,
      piece_length_metres:
        input.pieceLengthMetres ?? 0,
      total_metres: 0,
      diameter:
        input.diameter?.trim() ??
        '',
      dimension:
        input.dimension?.trim() ??
        '',
      purchase_price:
        input.purchasePrice ?? 0,
      sale_price:
        input.salePrice ?? 0,
      vat_rate:
        input.vatRate ?? 25,
      related_item_ids:
        input.relatedItemIds ?? [],
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  for (
    const stock of
    input.locationStocks ?? []
  ) {
    if (
      Number(stock.quantity) <=
      0
    ) {
      continue
    }

    await adjustInventoryQuantity({
      itemId,
      type: 'entry',
      quantity:
        Number(stock.quantity),
      locationId:
        stock.locationId,
      note:
        'Početno stanje artikla',
    })
  }

  if (
    (!input.locationStocks ||
      input.locationStocks.length ===
        0) &&
    Number(input.quantity ?? 0) >
      0
  ) {
    await adjustInventoryQuantity({
      itemId,
      type: 'entry',
      quantity:
        Number(input.quantity),
      note:
        'Početno stanje artikla',
    })
  }

  const created =
    await getInventoryItemById(
      itemId,
    )

  if (!created) {
    throw new Error(
      'Artikl je spremljen, ali ga nije moguće ponovno učitati.',
    )
  }

  return created
}

export async function updateInventoryItem(
  itemId: string,
  updates:
    Partial<CreateInventoryItemInput>,
): Promise<InventoryItem> {
  const userId =
    await getCurrentUserId()

  const patch:
    Record<string, unknown> = {
      updated_by: userId,
    }

  if (
    updates.name !==
    undefined
  ) {
    patch.name =
      updates.name.trim()
  }

  if (
    updates.shortName !==
    undefined
  ) {
    patch.short_name =
      updates.shortName.trim()
  }

  if (
    updates.alternativeNames !==
    undefined
  ) {
    patch.alternative_names =
      updates.alternativeNames
  }

  if (
    updates.code !==
    undefined
  ) {
    patch.code =
      updates.code.trim()
  }

  if (
    updates.barcode !==
    undefined
  ) {
    patch.barcode =
      updates.barcode.trim()
  }

  if (
    updates.category !==
    undefined
  ) {
    patch.category =
      updates.category.trim()
  }

  if (
    updates.subcategory !==
    undefined
  ) {
    patch.subcategory =
      updates.subcategory.trim()
  }

  if (
    updates.manufacturer !==
    undefined
  ) {
    patch.manufacturer =
      updates.manufacturer.trim()
  }

  if (
    updates.supplier !==
    undefined
  ) {
    patch.supplier =
      updates.supplier.trim()
  }

  if (
    updates.description !==
    undefined
  ) {
    patch.description =
      updates.description.trim()
  }

  if (
    updates.usageDescription !==
    undefined
  ) {
    patch.usage_description =
      updates.usageDescription.trim()
  }

  if (
    updates.warningNote !==
    undefined
  ) {
    patch.warning_note =
      updates.warningNote.trim()
  }

  if (
    updates.image !==
    undefined
  ) {
    patch.image =
      updates.image
  }

  if (
    updates.additionalImages !==
    undefined
  ) {
    patch.additional_images =
      updates.additionalImages
  }

  if (
    updates.trackingType !==
    undefined
  ) {
    patch.tracking_type =
      updates.trackingType
  }

  if (
    updates.unit !==
    undefined
  ) {
    patch.unit =
      updates.unit
  }

  if (
    updates.minimumQuantity !==
    undefined
  ) {
    patch.minimum_quantity =
      updates.minimumQuantity
  }

  if (
    updates.pieceLengthMetres !==
    undefined
  ) {
    patch.piece_length_metres =
      updates.pieceLengthMetres
  }

  if (
    updates.diameter !==
    undefined
  ) {
    patch.diameter =
      updates.diameter.trim()
  }

  if (
    updates.dimension !==
    undefined
  ) {
    patch.dimension =
      updates.dimension.trim()
  }

  if (
    updates.purchasePrice !==
    undefined
  ) {
    patch.purchase_price =
      updates.purchasePrice
  }

  if (
    updates.salePrice !==
    undefined
  ) {
    patch.sale_price =
      updates.salePrice
  }

  if (
    updates.vatRate !==
    undefined
  ) {
    patch.vat_rate =
      updates.vatRate
  }

  if (
    updates.relatedItemIds !==
    undefined
  ) {
    patch.related_item_ids =
      updates.relatedItemIds
  }

  const {
    error,
  } = await supabase
    .from('inventory_items')
    .update(patch)
    .eq('id', itemId)

  if (error) {
    throw new Error(error.message)
  }

  const item =
    await getInventoryItemById(
      itemId,
    )

  if (!item) {
    throw new Error(
      'Artikl nije pronađen nakon spremanja.',
    )
  }

  return item
}

export async function deleteInventoryItem(
  itemId: string,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getInventoryMovements():
Promise<InventoryMovement[]> {
  const {
    data,
    error,
  } = await supabase
    .from('inventory_movements')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return (
    (data ?? []) as MovementRow[]
  ).map(mapMovement)
}

export async function getInventoryMovementsByItemId(
  itemId: string,
): Promise<InventoryMovement[]> {
  const {
    data,
    error,
  } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('item_id', itemId)
    .order(
      'created_at',
      {
        ascending: false,
      },
    )

  if (error) {
    throw new Error(error.message)
  }

  return (
    (data ?? []) as MovementRow[]
  ).map(mapMovement)
}

export async function adjustInventoryQuantity(
  input: InventoryAdjustmentInput,
): Promise<InventoryMovement> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'inventory_adjust_quantity',
    {
      requested_item_id:
        input.itemId,
      requested_type:
        input.type,
      requested_quantity:
        input.quantity,
      requested_location_id:
        input.locationId ?? null,
      requested_work_order_id:
        input.workOrderId ?? null,
      requested_work_order_number:
        input.workOrderNumber ??
        null,
      requested_incoming_invoice_id:
        input.incomingInvoiceId ??
        null,
      requested_incoming_invoice_number:
        input.incomingInvoiceNumber ??
        null,
      requested_note:
        input.note ?? null,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      'Promjena stanja nije spremljena.',
    )
  }

  return mapMovement(
    data as MovementRow,
  )
}