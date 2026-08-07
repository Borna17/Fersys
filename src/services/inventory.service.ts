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

  locationStocks?: InventoryLocationStock[]
  relatedItemIds?: string[]
}

export interface InventoryAdjustmentInput {
  itemId: string
  type: 'entry' | 'exit' | 'correction'
  quantity: number

  locationId?: string
  locationName?: string

  employeeName?: string
  workOrderId?: string
  workOrderNumber?: string

  incomingInvoiceId?: string
  incomingInvoiceNumber?: string

  note?: string
}

export interface InventoryTransferInput {
  itemId: string
  quantity: number

  sourceLocationId: string
  sourceLocationName: string

  destinationLocationId: string
  destinationLocationName: string

  employeeName?: string
  note?: string
}

type ItemRow = {
  id: string
  name: string
  short_name: string | null
  alternative_names: unknown
  code: string | null
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
  additional_images: unknown
  tracking_type: InventoryTrackingType
  unit: InventoryUnit
  quantity: number | string | null
  minimum_quantity: number | string | null
  piece_length_metres: number | string | null
  total_metres: number | string | null
  diameter: string | null
  dimension: string | null
  purchase_price: number | string | null
  sale_price: number | string | null
  vat_rate: number | string | null
  location_stocks: unknown
  related_item_ids: unknown
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
  employee_name: string | null
  note: string | null
  created_at: string
}

const LOCAL_ITEMS_KEY =
  'fersys_inventory_items'
const LOCAL_MOVEMENTS_KEY =
  'fersys_inventory_movements'
const LOCAL_LOCATIONS_KEY =
  'fersys_inventory_locations'
const MIGRATION_KEY =
  'fersys_inventory_supabase_migrated_v1'

function arrayValue<T>(
  value: unknown,
): T[] {
  return Array.isArray(value)
    ? value as T[]
    : []
}

function numberValue(
  value: unknown,
) {
  const parsed =
    Number(value ?? 0)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

function roundQuantity(
  value: number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) * 1000,
  ) / 1000
}

function calculateTotalMetres(
  trackingType:
    InventoryTrackingType,
  quantity: number,
  pieceLengthMetres: number,
) {
  if (
    trackingType === 'metres'
  ) {
    return roundQuantity(
      quantity,
    )
  }

  if (
    trackingType ===
    'piece-length'
  ) {
    return roundQuantity(
      quantity *
      pieceLengthMetres,
    )
  }

  return 0
}

async function getCurrentCompanyId() {
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
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

function mapItem(
  row: ItemRow,
): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    shortName:
      row.short_name ?? '',
    alternativeNames:
      arrayValue<string>(
        row.alternative_names,
      ),
    code: row.code ?? '',
    barcode:
      row.barcode ?? '',
    qrValue:
      row.qr_value ?? '',
    category:
      row.category ?? '',
    subcategory:
      row.subcategory ?? '',
    manufacturer:
      row.manufacturer ?? '',
    supplier:
      row.supplier ?? '',
    description:
      row.description ?? '',
    usageDescription:
      row.usage_description ??
      '',
    warningNote:
      row.warning_note ?? '',
    image:
      row.image ?? '',
    additionalImages:
      arrayValue<string>(
        row.additional_images,
      ),
    trackingType:
      row.tracking_type,
    unit: row.unit,
    quantity:
      numberValue(
        row.quantity,
      ),
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
    diameter:
      row.diameter ?? '',
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
      numberValue(
        row.vat_rate,
      ),
    locationStocks:
      arrayValue<InventoryLocationStock>(
        row.location_stocks,
      ),
    relatedItemIds:
      arrayValue<string>(
        row.related_item_ids,
      ),
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

function mapLocation(
  row: LocationRow,
): InventoryLocation {
  return {
    id: row.id,
    name: row.name,
    description:
      row.description ?? '',
    image:
      row.image ?? '',
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

function mapMovement(
  row: MovementRow,
): InventoryMovement {
  return {
    id: row.id,
    itemId:
      row.item_id,
    type: row.type,
    quantity:
      numberValue(
        row.quantity,
      ),
    previousQuantity:
      numberValue(
        row.previous_quantity,
      ),
    newQuantity:
      numberValue(
        row.new_quantity,
      ),
    locationId:
      row.location_id ??
      undefined,
    locationName:
      row.location_name ??
      undefined,
    destinationLocationId:
      row.destination_location_id ??
      undefined,
    destinationLocationName:
      row.destination_location_name ??
      undefined,
    workOrderId:
      row.work_order_id ??
      undefined,
    workOrderNumber:
      row.work_order_number ??
      undefined,
    incomingInvoiceId:
      row.incoming_invoice_id ??
      undefined,
    incomingInvoiceNumber:
      row.incoming_invoice_number ??
      undefined,
    employeeName:
      row.employee_name ??
      undefined,
    note:
      row.note ??
      undefined,
    createdAt:
      row.created_at,
  }
}

function generateQrValue(
  itemId: string,
) {
  const origin =
    typeof window !==
    'undefined'
      ? window.location.origin
      : 'https://app.fersys.app'

  return `${origin}/inventory/items/${itemId}`
}

function updateLocationStock(
  stocks:
    InventoryLocationStock[],
  locationId: string,
  locationName: string,
  quantityChange: number,
) {
  const existing =
    stocks.find(
      (stock) =>
        stock.locationId ===
        locationId,
    )

  if (!existing) {
    if (
      quantityChange < 0
    ) {
      throw new Error(
        'Na odabranoj lokaciji nema dovoljno artikala.',
      )
    }

    return [
      ...stocks,
      {
        id:
          crypto.randomUUID(),
        locationId,
        locationName,
        quantity:
          roundQuantity(
            quantityChange,
          ),
      },
    ]
  }

  const nextQuantity =
    roundQuantity(
      existing.quantity +
      quantityChange,
    )

  if (
    nextQuantity < 0
  ) {
    throw new Error(
      `Na lokaciji "${locationName}" nema dovoljno artikala.`,
    )
  }

  return stocks.map(
    (stock) =>
      stock.locationId ===
      locationId
        ? {
            ...stock,
            locationName,
            quantity:
              nextQuantity,
          }
        : stock,
  )
}

function totalFromStocks(
  stocks:
    InventoryLocationStock[],
) {
  return roundQuantity(
    stocks.reduce(
      (
        total,
        stock,
      ) =>
        total +
        Number(
          stock.quantity ||
          0,
        ),
      0,
    ),
  )
}

export async function getInventoryItems():
Promise<InventoryItem[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .select('*')
      .order(
        'updated_at',
        {
          ascending: false,
        },
      )

  if (error) {
    throw error
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapItem(
        row as ItemRow,
      ),
  )
}

export async function getInventoryItemById(
  itemId: string,
): Promise<InventoryItem | null> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .select('*')
      .eq(
        'id',
        itemId,
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapItem(
        data as ItemRow,
      )
    : null
}

export async function getInventoryLocations():
Promise<InventoryLocation[]> {
  let {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_locations',
      )
      .select('*')
      .order(
        'name',
        {
          ascending: true,
        },
      )

  if (error) {
    throw error
  }

  if (
    !data ||
    data.length === 0
  ) {
    const {
      error:
        ensureError,
    } =
      await supabase.rpc(
        'ensure_default_inventory_locations',
      )

    if (ensureError) {
      throw ensureError
    }

    const reload =
      await supabase
        .from(
          'inventory_locations',
        )
        .select('*')
        .order(
          'name',
          {
            ascending: true,
          },
        )

    if (reload.error) {
      throw reload.error
    }

    data =
      reload.data
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapLocation(
        row as LocationRow,
      ),
  )
}

export async function createInventoryItem(
  input:
    CreateInventoryItemInput,
): Promise<InventoryItem> {
  const companyId =
    await getCurrentCompanyId()

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser()

  const id =
    crypto.randomUUID()

  const locationStocks =
    input.locationStocks ??
    []

  const quantity =
    locationStocks.length > 0
      ? totalFromStocks(
          locationStocks,
        )
      : roundQuantity(
          Number(
            input.quantity ??
            0,
          ),
        )

  const pieceLengthMetres =
    roundQuantity(
      Number(
        input.pieceLengthMetres ??
        0,
      ),
    )

  let code =
    input.code?.trim() ??
    ''

  if (!code) {
    const {
      count,
    } =
      await supabase
        .from(
          'inventory_items',
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )

    code =
      `ART-${String(
        (count ?? 0) + 1,
      ).padStart(
        5,
        '0',
      )}`
  }

  const payload = {
    id,
    company_id:
      companyId,
    name:
      input.name.trim(),
    short_name:
      input.shortName?.trim() ??
      '',
    alternative_names:
      input.alternativeNames ??
      [],
    code,
    barcode:
      input.barcode?.trim() ??
      '',
    qr_value:
      generateQrValue(id),
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
    image:
      input.image ?? '',
    additional_images:
      input.additionalImages ??
      [],
    tracking_type:
      input.trackingType,
    unit:
      input.unit,
    quantity,
    minimum_quantity:
      roundQuantity(
        Number(
          input.minimumQuantity ??
          0,
        ),
      ),
    piece_length_metres:
      pieceLengthMetres,
    total_metres:
      calculateTotalMetres(
        input.trackingType,
        quantity,
        pieceLengthMetres,
      ),
    diameter:
      input.diameter?.trim() ??
      '',
    dimension:
      input.dimension?.trim() ??
      '',
    purchase_price:
      Number(
        input.purchasePrice ??
        0,
      ),
    sale_price:
      Number(
        input.salePrice ??
        0,
      ),
    vat_rate:
      Number(
        input.vatRate ??
        25,
      ),
    location_stocks:
      locationStocks,
    related_item_ids:
      input.relatedItemIds ??
      [],
    created_by:
      userData.user?.id ??
      null,
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .insert(payload)
      .select('*')
      .single()

  if (error) {
    throw error
  }

  if (
    quantity > 0
  ) {
    await supabase
      .from(
        'inventory_movements',
      )
      .insert({
        company_id:
          companyId,
        item_id:
          id,
        type:
          'entry',
        quantity,
        previous_quantity:
          0,
        new_quantity:
          quantity,
        employee_name:
          'Početno stanje',
        note:
          'Početno stanje artikla',
        created_by:
          userData.user?.id ??
          null,
      })
  }

  return mapItem(
    data as ItemRow,
  )
}

export async function updateInventoryItem(
  itemId: string,
  updates:
    Partial<CreateInventoryItemInput>,
): Promise<InventoryItem> {
  const existing =
    await getInventoryItemById(
      itemId,
    )

  if (!existing) {
    throw new Error(
      'Artikl nije pronađen.',
    )
  }

  const locationStocks =
    updates.locationStocks ??
    existing.locationStocks

  const quantity =
    updates.locationStocks !==
    undefined
      ? totalFromStocks(
          locationStocks,
        )
      : updates.quantity !==
          undefined
        ? roundQuantity(
            Number(
              updates.quantity,
            ),
          )
        : existing.quantity

  const trackingType =
    updates.trackingType ??
    existing.trackingType

  const pieceLengthMetres =
    updates.pieceLengthMetres !==
    undefined
      ? roundQuantity(
          Number(
            updates.pieceLengthMetres,
          ),
        )
      : existing.pieceLengthMetres

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .update({
        name:
          updates.name !==
          undefined
            ? updates.name.trim()
            : existing.name,
        short_name:
          updates.shortName !==
          undefined
            ? updates.shortName.trim()
            : existing.shortName,
        alternative_names:
          updates.alternativeNames ??
          existing.alternativeNames,
        code:
          updates.code !==
          undefined
            ? updates.code.trim()
            : existing.code,
        barcode:
          updates.barcode !==
          undefined
            ? updates.barcode.trim()
            : existing.barcode,
        category:
          updates.category !==
          undefined
            ? updates.category.trim()
            : existing.category,
        subcategory:
          updates.subcategory !==
          undefined
            ? updates.subcategory.trim()
            : existing.subcategory,
        manufacturer:
          updates.manufacturer !==
          undefined
            ? updates.manufacturer.trim()
            : existing.manufacturer,
        supplier:
          updates.supplier !==
          undefined
            ? updates.supplier.trim()
            : existing.supplier,
        description:
          updates.description !==
          undefined
            ? updates.description.trim()
            : existing.description,
        usage_description:
          updates.usageDescription !==
          undefined
            ? updates.usageDescription.trim()
            : existing.usageDescription,
        warning_note:
          updates.warningNote !==
          undefined
            ? updates.warningNote.trim()
            : existing.warningNote,
        image:
          updates.image !==
          undefined
            ? updates.image
            : existing.image,
        additional_images:
          updates.additionalImages ??
          existing.additionalImages,
        tracking_type:
          trackingType,
        unit:
          updates.unit ??
          existing.unit,
        quantity,
        minimum_quantity:
          updates.minimumQuantity !==
          undefined
            ? roundQuantity(
                Number(
                  updates.minimumQuantity,
                ),
              )
            : existing.minimumQuantity,
        piece_length_metres:
          pieceLengthMetres,
        total_metres:
          calculateTotalMetres(
            trackingType,
            quantity,
            pieceLengthMetres,
          ),
        diameter:
          updates.diameter !==
          undefined
            ? updates.diameter.trim()
            : existing.diameter,
        dimension:
          updates.dimension !==
          undefined
            ? updates.dimension.trim()
            : existing.dimension,
        purchase_price:
          updates.purchasePrice !==
          undefined
            ? Number(
                updates.purchasePrice,
              )
            : existing.purchasePrice,
        sale_price:
          updates.salePrice !==
          undefined
            ? Number(
                updates.salePrice,
              )
            : existing.salePrice,
        vat_rate:
          updates.vatRate !==
          undefined
            ? Number(
                updates.vatRate,
              )
            : existing.vatRate,
        location_stocks:
          locationStocks,
        related_item_ids:
          updates.relatedItemIds ??
          existing.relatedItemIds,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        itemId,
      )
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapItem(
    data as ItemRow,
  )
}

export async function deleteInventoryItem(
  itemId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .delete()
      .eq(
        'id',
        itemId,
      )

  if (error) {
    throw error
  }
}

export async function getInventoryMovements():
Promise<InventoryMovement[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_movements',
      )
      .select('*')
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

  if (error) {
    throw error
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapMovement(
        row as MovementRow,
      ),
  )
}

export async function getInventoryMovementsByItemId(
  itemId: string,
): Promise<InventoryMovement[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_movements',
      )
      .select('*')
      .eq(
        'item_id',
        itemId,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

  if (error) {
    throw error
  }

  return (
    data ?? []
  ).map(
    (row) =>
      mapMovement(
        row as MovementRow,
      ),
  )
}

export async function adjustInventoryQuantity(
  input:
    InventoryAdjustmentInput,
): Promise<InventoryItem> {
  const item =
    await getInventoryItemById(
      input.itemId,
    )

  if (!item) {
    throw new Error(
      'Artikl nije pronađen.',
    )
  }

  const enteredQuantity =
    Math.abs(
      roundQuantity(
        Number(
          input.quantity,
        ),
      ),
    )

  if (
    !Number.isFinite(
      enteredQuantity,
    ) ||
    enteredQuantity <= 0
  ) {
    throw new Error(
      'Unesite ispravnu količinu.',
    )
  }

  const quantityChange =
    input.type === 'exit'
      ? -enteredQuantity
      : enteredQuantity

  let locationStocks =
    item.locationStocks

  if (
    input.locationId &&
    input.locationName
  ) {
    locationStocks =
      updateLocationStock(
        locationStocks,
        input.locationId,
        input.locationName,
        quantityChange,
      )
  }

  const previousQuantity =
    item.quantity

  const newQuantity =
    input.locationId &&
    input.locationName
      ? totalFromStocks(
          locationStocks,
        )
      : roundQuantity(
          previousQuantity +
          quantityChange,
        )

  if (newQuantity < 0) {
    throw new Error(
      'Na skladištu nema dovoljno artikala.',
    )
  }

  const updated =
    await updateInventoryItem(
      item.id,
      {
        quantity:
          newQuantity,
        locationStocks,
      },
    )

  const companyId =
    await getCurrentCompanyId()

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser()

  const {
    error,
  } =
    await supabase
      .from(
        'inventory_movements',
      )
      .insert({
        company_id:
          companyId,
        item_id:
          item.id,
        type:
          input.type,
        quantity:
          enteredQuantity,
        previous_quantity:
          previousQuantity,
        new_quantity:
          newQuantity,
        location_id:
          input.locationId ??
          null,
        location_name:
          input.locationName ??
          null,
        work_order_id:
          input.workOrderId ??
          null,
        work_order_number:
          input.workOrderNumber ??
          null,
        incoming_invoice_id:
          input.incomingInvoiceId ??
          null,
        incoming_invoice_number:
          input.incomingInvoiceNumber ??
          null,
        employee_name:
          input.employeeName ??
          null,
        note:
          input.note ??
          null,
        created_by:
          userData.user?.id ??
          null,
      })

  if (error) {
    throw error
  }

  return updated
}

export async function transferInventoryQuantity(
  input:
    InventoryTransferInput,
): Promise<InventoryItem> {
  const item =
    await getInventoryItemById(
      input.itemId,
    )

  if (!item) {
    throw new Error(
      'Artikl nije pronađen.',
    )
  }

  const quantity =
    Math.abs(
      roundQuantity(
        Number(
          input.quantity,
        ),
      ),
    )

  if (
    !Number.isFinite(
      quantity,
    ) ||
    quantity <= 0
  ) {
    throw new Error(
      'Unesite ispravnu količinu.',
    )
  }

  let stocks =
    updateLocationStock(
      item.locationStocks,
      input.sourceLocationId,
      input.sourceLocationName,
      -quantity,
    )

  stocks =
    updateLocationStock(
      stocks,
      input.destinationLocationId,
      input.destinationLocationName,
      quantity,
    )

  const updated =
    await updateInventoryItem(
      item.id,
      {
        locationStocks:
          stocks,
        quantity:
          totalFromStocks(
            stocks,
          ),
      },
    )

  const companyId =
    await getCurrentCompanyId()

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser()

  const {
    error,
  } =
    await supabase
      .from(
        'inventory_movements',
      )
      .insert({
        company_id:
          companyId,
        item_id:
          item.id,
        type:
          'transfer',
        quantity,
        previous_quantity:
          item.quantity,
        new_quantity:
          updated.quantity,
        location_id:
          input.sourceLocationId,
        location_name:
          input.sourceLocationName,
        destination_location_id:
          input.destinationLocationId,
        destination_location_name:
          input.destinationLocationName,
        employee_name:
          input.employeeName ??
          null,
        note:
          input.note ??
          null,
        created_by:
          userData.user?.id ??
          null,
      })

  if (error) {
    throw error
  }

  return updated
}

export async function createInventoryLocation(
  name: string,
  description = '',
  image = '',
): Promise<InventoryLocation> {
  const companyId =
    await getCurrentCompanyId()

  const locationName =
    name.trim()

  if (!locationName) {
    throw new Error(
      'Naziv lokacije je obavezan.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_locations',
      )
      .insert({
        company_id:
          companyId,
        name:
          locationName,
        description:
          description.trim(),
        image,
      })
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapLocation(
    data as LocationRow,
  )
}

export async function updateInventoryLocation(
  locationId: string,
  updates: Partial<
    Pick<
      InventoryLocation,
      | 'name'
      | 'description'
      | 'image'
    >
  >,
): Promise<InventoryLocation> {
  const payload: Record<
    string,
    unknown
  > = {
    updated_at:
      new Date()
        .toISOString(),
  }

  if (
    updates.name !==
    undefined
  ) {
    payload.name =
      updates.name.trim()
  }

  if (
    updates.description !==
    undefined
  ) {
    payload.description =
      updates.description.trim()
  }

  if (
    updates.image !==
    undefined
  ) {
    payload.image =
      updates.image
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'inventory_locations',
      )
      .update(payload)
      .eq(
        'id',
        locationId,
      )
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapLocation(
    data as LocationRow,
  )
}

export async function deleteInventoryLocation(
  locationId: string,
): Promise<void> {
  const items =
    await getInventoryItems()

  const used =
    items.some(
      (item) =>
        item.locationStocks.some(
          (stock) =>
            stock.locationId ===
              locationId &&
            stock.quantity > 0,
        ),
    )

  if (used) {
    throw new Error(
      'Lokaciju nije moguće obrisati jer na njoj još postoji materijal.',
    )
  }

  const {
    error,
  } =
    await supabase
      .from(
        'inventory_locations',
      )
      .delete()
      .eq(
        'id',
        locationId,
      )

  if (error) {
    throw error
  }
}

/**
 * Jednokratno prenosi postojeće localStorage skladište
 * u Supabase. Radi samo ako server još nema artikala.
 */
export async function migrateLocalInventoryToSupabase():
Promise<{
  migrated: boolean
  items: number
  locations: number
  movements: number
}> {
  if (
    typeof window ===
    'undefined'
  ) {
    return {
      migrated: false,
      items: 0,
      locations: 0,
      movements: 0,
    }
  }

  if (
    localStorage.getItem(
      MIGRATION_KEY,
    ) === '1'
  ) {
    return {
      migrated: false,
      items: 0,
      locations: 0,
      movements: 0,
    }
  }

  const serverItems =
    await getInventoryItems()

  if (
    serverItems.length > 0
  ) {
    localStorage.setItem(
      MIGRATION_KEY,
      '1',
    )

    return {
      migrated: false,
      items: 0,
      locations: 0,
      movements: 0,
    }
  }

  function readLocal<T>(
    key: string,
  ): T[] {
    try {
      const raw =
        localStorage.getItem(
          key,
        )

      if (!raw) {
        return []
      }

      const parsed =
        JSON.parse(raw)

      return Array.isArray(
        parsed,
      )
        ? parsed as T[]
        : []
    } catch {
      return []
    }
  }

  const localItems =
    readLocal<InventoryItem>(
      LOCAL_ITEMS_KEY,
    )

  const localLocations =
    readLocal<InventoryLocation>(
      LOCAL_LOCATIONS_KEY,
    )

  const localMovements =
    readLocal<InventoryMovement>(
      LOCAL_MOVEMENTS_KEY,
    )

  if (
    localItems.length === 0 &&
    localLocations.length === 0
  ) {
    localStorage.setItem(
      MIGRATION_KEY,
      '1',
    )

    return {
      migrated: false,
      items: 0,
      locations: 0,
      movements: 0,
    }
  }

  const companyId =
    await getCurrentCompanyId()

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser()

  if (
    localLocations.length > 0
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          'inventory_locations',
        )
        .insert(
          localLocations.map(
            (location) => ({
              id:
                crypto.randomUUID(),
              company_id:
                companyId,
              name:
                location.name,
              description:
                location.description ??
                '',
              image:
                location.image ??
                '',
            }),
          ),
        )

    if (error) {
      throw error
    }
  }

  const itemIdMap =
    new Map<
      string,
      string
    >()

  for (
    const item of
      localItems
  ) {
    const newId =
      crypto.randomUUID()

    itemIdMap.set(
      item.id,
      newId,
    )

    const {
      error,
    } =
      await supabase
        .from(
          'inventory_items',
        )
        .insert({
          id:
            newId,
          company_id:
            companyId,
          name:
            item.name,
          short_name:
            item.shortName ??
            '',
          alternative_names:
            item.alternativeNames ??
            [],
          code:
            item.code ??
            '',
          barcode:
            item.barcode ??
            '',
          qr_value:
            generateQrValue(
              newId,
            ),
          category:
            item.category ??
            '',
          subcategory:
            item.subcategory ??
            '',
          manufacturer:
            item.manufacturer ??
            '',
          supplier:
            item.supplier ??
            '',
          description:
            item.description ??
            '',
          usage_description:
            item.usageDescription ??
            '',
          warning_note:
            item.warningNote ??
            '',
          image:
            item.image ??
            '',
          additional_images:
            item.additionalImages ??
            [],
          tracking_type:
            item.trackingType ??
            'pieces',
          unit:
            item.unit ??
            'kom',
          quantity:
            item.quantity ??
            0,
          minimum_quantity:
            item.minimumQuantity ??
            0,
          piece_length_metres:
            item.pieceLengthMetres ??
            0,
          total_metres:
            item.totalMetres ??
            0,
          diameter:
            item.diameter ??
            '',
          dimension:
            item.dimension ??
            '',
          purchase_price:
            item.purchasePrice ??
            0,
          sale_price:
            item.salePrice ??
            0,
          vat_rate:
            item.vatRate ??
            25,
          location_stocks:
            item.locationStocks ??
            [],
          related_item_ids:
            item.relatedItemIds ??
            [],
          created_by:
            userData.user?.id ??
            null,
          created_at:
            item.createdAt ||
            new Date()
              .toISOString(),
          updated_at:
            item.updatedAt ||
            new Date()
              .toISOString(),
        })

    if (error) {
      throw error
    }
  }

  for (
    const movement of
      localMovements
  ) {
    const mappedItemId =
      itemIdMap.get(
        movement.itemId,
      )

    if (!mappedItemId) {
      continue
    }

    const {
      error,
    } =
      await supabase
        .from(
          'inventory_movements',
        )
        .insert({
          company_id:
            companyId,
          item_id:
            mappedItemId,
          type:
            movement.type,
          quantity:
            movement.quantity,
          previous_quantity:
            movement.previousQuantity,
          new_quantity:
            movement.newQuantity,
          location_id:
            movement.locationId ??
            null,
          location_name:
            movement.locationName ??
            null,
          destination_location_id:
            movement.destinationLocationId ??
            null,
          destination_location_name:
            movement.destinationLocationName ??
            null,
          work_order_id:
            movement.workOrderId ??
            null,
          work_order_number:
            movement.workOrderNumber ??
            null,
          incoming_invoice_id:
            movement.incomingInvoiceId ??
            null,
          incoming_invoice_number:
            movement.incomingInvoiceNumber ??
            null,
          employee_name:
            movement.employeeName ??
            null,
          note:
            movement.note ??
            null,
          created_by:
            userData.user?.id ??
            null,
          created_at:
            movement.createdAt ||
            new Date()
              .toISOString(),
        })

    if (error) {
      throw error
    }
  }

  localStorage.setItem(
    MIGRATION_KEY,
    '1',
  )

  return {
    migrated: true,
    items:
      localItems.length,
    locations:
      localLocations.length,
    movements:
      localMovements.length,
  }
}
