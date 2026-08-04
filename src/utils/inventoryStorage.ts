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

  /**
   * Koristi se za komadne cijevi.
   * Primjer: cijev od 100 cm ima pieceLengthMetres = 1.
   */
  pieceLengthMetres: number

  /**
   * Automatski izračunata ukupna metraža.
   * Primjer: 10 komada × 2 m = 20 m.
   */
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

const ITEMS_STORAGE_KEY = 'fersys_inventory_items'
const MOVEMENTS_STORAGE_KEY = 'fersys_inventory_movements'
const LOCATIONS_STORAGE_KEY = 'fersys_inventory_locations'

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getCurrentDateTime(): string {
  return new Date().toISOString()
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

function calculateTotalMetres(
  trackingType: InventoryTrackingType,
  quantity: number,
  pieceLengthMetres: number,
): number {
  if (trackingType === 'metres') {
    return roundQuantity(quantity)
  }

  if (trackingType === 'piece-length') {
    return roundQuantity(quantity * pieceLengthMetres)
  }

  return 0
}

function generateItemCode(): string {
  const items = getInventoryItems()
  const nextNumber = items.length + 1

  return `ART-${String(nextNumber).padStart(5, '0')}`
}

function generateQrValue(itemId: string): string {
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://fersys.app'

  return `${baseUrl}/inventory/items/${itemId}`
}

function calculateTotalQuantityFromLocations(
  locationStocks: InventoryLocationStock[],
): number {
  return roundQuantity(
    locationStocks.reduce((total, location) => {
      return total + Number(location.quantity || 0)
    }, 0),
  )
}

export function getInventoryItems(): InventoryItem[] {
  const rawValue = localStorage.getItem(ITEMS_STORAGE_KEY)

  return safeParse<InventoryItem[]>(rawValue, [])
}

export function saveInventoryItems(items: InventoryItem[]): void {
  localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items))
}

export function getInventoryItemById(
  itemId: string,
): InventoryItem | undefined {
  return getInventoryItems().find((item) => item.id === itemId)
}

export function createInventoryItem(
  input: CreateInventoryItemInput,
): InventoryItem {
  const items = getInventoryItems()
  const id = createId('item')
  const now = getCurrentDateTime()

  const locationStocks = input.locationStocks ?? []

  const quantity =
    locationStocks.length > 0
      ? calculateTotalQuantityFromLocations(locationStocks)
      : roundQuantity(Number(input.quantity ?? 0))

  const pieceLengthMetres = roundQuantity(
    Number(input.pieceLengthMetres ?? 0),
  )

  const newItem: InventoryItem = {
    id,

    name: input.name.trim(),
    shortName: input.shortName?.trim() ?? '',
    alternativeNames:
      input.alternativeNames
        ?.map((name) => name.trim())
        .filter(Boolean) ?? [],

    code: input.code?.trim() || generateItemCode(),
    barcode: input.barcode?.trim() ?? '',
    qrValue: generateQrValue(id),

    category: input.category?.trim() ?? '',
    subcategory: input.subcategory?.trim() ?? '',

    manufacturer: input.manufacturer?.trim() ?? '',
    supplier: input.supplier?.trim() ?? '',

    description: input.description?.trim() ?? '',
    usageDescription: input.usageDescription?.trim() ?? '',
    warningNote: input.warningNote?.trim() ?? '',

    image: input.image ?? '',
    additionalImages: input.additionalImages ?? [],

    trackingType: input.trackingType,
    unit: input.unit,

    quantity,
    minimumQuantity: roundQuantity(
      Number(input.minimumQuantity ?? 0),
    ),

    pieceLengthMetres,
    totalMetres: calculateTotalMetres(
      input.trackingType,
      quantity,
      pieceLengthMetres,
    ),

    diameter: input.diameter?.trim() ?? '',
    dimension: input.dimension?.trim() ?? '',

    purchasePrice: Number(input.purchasePrice ?? 0),
    salePrice: Number(input.salePrice ?? 0),
    vatRate: Number(input.vatRate ?? 25),

    locationStocks,

    relatedItemIds: input.relatedItemIds ?? [],

    createdAt: now,
    updatedAt: now,
  }

  saveInventoryItems([newItem, ...items])

  if (quantity > 0) {
    const movement: InventoryMovement = {
      id: createId('movement'),
      itemId: newItem.id,
      type: 'entry',
      quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      employeeName: 'Početno stanje',
      note: 'Početno stanje artikla',
      createdAt: now,
    }

    saveInventoryMovements([
      movement,
      ...getInventoryMovements(),
    ])
  }

  return newItem
}

export function updateInventoryItem(
  itemId: string,
  updates: Partial<CreateInventoryItemInput>,
): InventoryItem {
  const items = getInventoryItems()
  const existingItem = items.find((item) => item.id === itemId)

  if (!existingItem) {
    throw new Error('Artikl nije pronađen.')
  }

  const locationStocks =
    updates.locationStocks ?? existingItem.locationStocks

  const quantity =
    updates.locationStocks !== undefined
      ? calculateTotalQuantityFromLocations(locationStocks)
      : updates.quantity !== undefined
        ? roundQuantity(Number(updates.quantity))
        : existingItem.quantity

  const trackingType =
    updates.trackingType ?? existingItem.trackingType

  const pieceLengthMetres =
    updates.pieceLengthMetres !== undefined
      ? roundQuantity(Number(updates.pieceLengthMetres))
      : existingItem.pieceLengthMetres

  const updatedItem: InventoryItem = {
    ...existingItem,

    name:
      updates.name !== undefined
        ? updates.name.trim()
        : existingItem.name,

    shortName:
      updates.shortName !== undefined
        ? updates.shortName.trim()
        : existingItem.shortName,

    alternativeNames:
      updates.alternativeNames !== undefined
        ? updates.alternativeNames
            .map((name) => name.trim())
            .filter(Boolean)
        : existingItem.alternativeNames,

    code:
      updates.code !== undefined
        ? updates.code.trim()
        : existingItem.code,

    barcode:
      updates.barcode !== undefined
        ? updates.barcode.trim()
        : existingItem.barcode,

    category:
      updates.category !== undefined
        ? updates.category.trim()
        : existingItem.category,

    subcategory:
      updates.subcategory !== undefined
        ? updates.subcategory.trim()
        : existingItem.subcategory,

    manufacturer:
      updates.manufacturer !== undefined
        ? updates.manufacturer.trim()
        : existingItem.manufacturer,

    supplier:
      updates.supplier !== undefined
        ? updates.supplier.trim()
        : existingItem.supplier,

    description:
      updates.description !== undefined
        ? updates.description.trim()
        : existingItem.description,

    usageDescription:
      updates.usageDescription !== undefined
        ? updates.usageDescription.trim()
        : existingItem.usageDescription,

    warningNote:
      updates.warningNote !== undefined
        ? updates.warningNote.trim()
        : existingItem.warningNote,

    image:
      updates.image !== undefined
        ? updates.image
        : existingItem.image,

    additionalImages:
      updates.additionalImages !== undefined
        ? updates.additionalImages
        : existingItem.additionalImages,

    trackingType,

    unit:
      updates.unit !== undefined
        ? updates.unit
        : existingItem.unit,

    quantity,

    minimumQuantity:
      updates.minimumQuantity !== undefined
        ? roundQuantity(Number(updates.minimumQuantity))
        : existingItem.minimumQuantity,

    pieceLengthMetres,

    totalMetres: calculateTotalMetres(
      trackingType,
      quantity,
      pieceLengthMetres,
    ),

    diameter:
      updates.diameter !== undefined
        ? updates.diameter.trim()
        : existingItem.diameter,

    dimension:
      updates.dimension !== undefined
        ? updates.dimension.trim()
        : existingItem.dimension,

    purchasePrice:
      updates.purchasePrice !== undefined
        ? Number(updates.purchasePrice)
        : existingItem.purchasePrice,

    salePrice:
      updates.salePrice !== undefined
        ? Number(updates.salePrice)
        : existingItem.salePrice,

    vatRate:
      updates.vatRate !== undefined
        ? Number(updates.vatRate)
        : existingItem.vatRate,

    locationStocks,

    relatedItemIds:
      updates.relatedItemIds !== undefined
        ? updates.relatedItemIds
        : existingItem.relatedItemIds,

    updatedAt: getCurrentDateTime(),
  }

  saveInventoryItems(
    items.map((item) => {
      return item.id === itemId ? updatedItem : item
    }),
  )

  return updatedItem
}

export function deleteInventoryItem(itemId: string): void {
  const items = getInventoryItems().filter(
    (item) => item.id !== itemId,
  )

  const movements = getInventoryMovements().filter(
    (movement) => movement.itemId !== itemId,
  )

  saveInventoryItems(items)
  saveInventoryMovements(movements)
}

export function getInventoryMovements(): InventoryMovement[] {
  const rawValue = localStorage.getItem(MOVEMENTS_STORAGE_KEY)

  return safeParse<InventoryMovement[]>(rawValue, [])
}

export function saveInventoryMovements(
  movements: InventoryMovement[],
): void {
  localStorage.setItem(
    MOVEMENTS_STORAGE_KEY,
    JSON.stringify(movements),
  )
}

export function getInventoryMovementsByItemId(
  itemId: string,
): InventoryMovement[] {
  return getInventoryMovements()
    .filter((movement) => movement.itemId === itemId)
    .sort((first, second) => {
      return (
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime()
      )
    })
}

function updateLocationStock(
  stocks: InventoryLocationStock[],
  locationId: string,
  locationName: string,
  quantityChange: number,
): InventoryLocationStock[] {
  const existingStock = stocks.find(
    (stock) => stock.locationId === locationId,
  )

  if (!existingStock) {
    if (quantityChange < 0) {
      throw new Error(
        'Na odabranoj lokaciji nema dovoljno artikala.',
      )
    }

    return [
      ...stocks,
      {
        id: createId('location-stock'),
        locationId,
        locationName,
        quantity: roundQuantity(quantityChange),
      },
    ]
  }

  const newQuantity = roundQuantity(
    existingStock.quantity + quantityChange,
  )

  if (newQuantity < 0) {
    throw new Error(
      `Na lokaciji "${locationName}" nema dovoljno artikala.`,
    )
  }

  return stocks.map((stock) => {
    if (stock.locationId !== locationId) {
      return stock
    }

    return {
      ...stock,
      locationName,
      quantity: newQuantity,
    }
  })
}

export function adjustInventoryQuantity(
  input: InventoryAdjustmentInput,
): InventoryItem {
  const item = getInventoryItemById(input.itemId)

  if (!item) {
    throw new Error('Artikl nije pronađen.')
  }

  const enteredQuantity = Math.abs(
    roundQuantity(Number(input.quantity)),
  )

  if (!Number.isFinite(enteredQuantity) || enteredQuantity <= 0) {
    throw new Error('Unesite ispravnu količinu.')
  }

  let quantityChange = enteredQuantity

  if (input.type === 'exit') {
    quantityChange = -enteredQuantity
  }

  let locationStocks = item.locationStocks

  if (input.locationId && input.locationName) {
    locationStocks = updateLocationStock(
      item.locationStocks,
      input.locationId,
      input.locationName,
      quantityChange,
    )
  }

  const previousQuantity = item.quantity

  const newQuantity =
    input.locationId && input.locationName
      ? calculateTotalQuantityFromLocations(locationStocks)
      : roundQuantity(previousQuantity + quantityChange)

  if (newQuantity < 0) {
    throw new Error('Na skladištu nema dovoljno artikala.')
  }

  const updatedItem: InventoryItem = {
    ...item,
    quantity: newQuantity,
    totalMetres: calculateTotalMetres(
      item.trackingType,
      newQuantity,
      item.pieceLengthMetres,
    ),
    locationStocks,
    updatedAt: getCurrentDateTime(),
  }

  saveInventoryItems(
    getInventoryItems().map((currentItem) => {
      return currentItem.id === item.id
        ? updatedItem
        : currentItem
    }),
  )

  const movement: InventoryMovement = {
    id: createId('movement'),
    itemId: item.id,
    type: input.type,
    quantity: enteredQuantity,
    previousQuantity,
    newQuantity,

    locationId: input.locationId,
    locationName: input.locationName,

    workOrderId: input.workOrderId,
    workOrderNumber: input.workOrderNumber,

    incomingInvoiceId: input.incomingInvoiceId,
    incomingInvoiceNumber: input.incomingInvoiceNumber,

    employeeName: input.employeeName,
    note: input.note,

    createdAt: getCurrentDateTime(),
  }

  saveInventoryMovements([
    movement,
    ...getInventoryMovements(),
  ])

  return updatedItem
}

export function transferInventoryQuantity(
  input: InventoryTransferInput,
): InventoryItem {
  const item = getInventoryItemById(input.itemId)

  if (!item) {
    throw new Error('Artikl nije pronađen.')
  }

  const quantity = Math.abs(
    roundQuantity(Number(input.quantity)),
  )

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Unesite ispravnu količinu.')
  }

  let locationStocks = updateLocationStock(
    item.locationStocks,
    input.sourceLocationId,
    input.sourceLocationName,
    -quantity,
  )

  locationStocks = updateLocationStock(
    locationStocks,
    input.destinationLocationId,
    input.destinationLocationName,
    quantity,
  )

  const updatedItem: InventoryItem = {
    ...item,
    locationStocks,
    quantity: calculateTotalQuantityFromLocations(locationStocks),
    updatedAt: getCurrentDateTime(),
  }

  updatedItem.totalMetres = calculateTotalMetres(
    updatedItem.trackingType,
    updatedItem.quantity,
    updatedItem.pieceLengthMetres,
  )

  saveInventoryItems(
    getInventoryItems().map((currentItem) => {
      return currentItem.id === item.id
        ? updatedItem
        : currentItem
    }),
  )

  const movement: InventoryMovement = {
    id: createId('movement'),
    itemId: item.id,
    type: 'transfer',
    quantity,
    previousQuantity: item.quantity,
    newQuantity: updatedItem.quantity,

    locationId: input.sourceLocationId,
    locationName: input.sourceLocationName,

    destinationLocationId: input.destinationLocationId,
    destinationLocationName: input.destinationLocationName,

    employeeName: input.employeeName,
    note: input.note,

    createdAt: getCurrentDateTime(),
  }

  saveInventoryMovements([
    movement,
    ...getInventoryMovements(),
  ])

  return updatedItem
}

export function searchInventoryItems(
  searchTerm: string,
): InventoryItem[] {
  const normalizedSearch = searchTerm
    .trim()
    .toLocaleLowerCase('hr-HR')

  const items = getInventoryItems()

  if (!normalizedSearch) {
    return items
  }

  return items.filter((item) => {
    const searchableText = [
      item.name,
      item.shortName,
      item.code,
      item.barcode,
      item.category,
      item.subcategory,
      item.manufacturer,
      item.supplier,
      item.description,
      item.usageDescription,
      item.warningNote,
      item.diameter,
      item.dimension,
      ...item.alternativeNames,
    ]
      .join(' ')
      .toLocaleLowerCase('hr-HR')

    return searchableText.includes(normalizedSearch)
  })
}

export function getLowStockItems(): InventoryItem[] {
  return getInventoryItems().filter((item) => {
    return (
      item.minimumQuantity > 0 &&
      item.quantity <= item.minimumQuantity
    )
  })
}

export function getInventoryLocations(): InventoryLocation[] {
  const rawValue = localStorage.getItem(LOCATIONS_STORAGE_KEY)

  const savedLocations = safeParse<InventoryLocation[]>(
    rawValue,
    [],
  )

  if (savedLocations.length > 0) {
    return savedLocations
  }

  const now = getCurrentDateTime()

  const defaultLocations: InventoryLocation[] = [
    {
      id: 'main-warehouse',
      name: 'Glavno skladište',
      description: 'Glavno skladište firme',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'workshop',
      name: 'Radionica',
      description: 'Materijal koji se nalazi u radionici',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'vehicle-1',
      name: 'Kombi 1',
      description: 'Materijal u službenom vozilu',
      createdAt: now,
      updatedAt: now,
    },
  ]

  saveInventoryLocations(defaultLocations)

  return defaultLocations
}

export function saveInventoryLocations(
  locations: InventoryLocation[],
): void {
  localStorage.setItem(
    LOCATIONS_STORAGE_KEY,
    JSON.stringify(locations),
  )
}

export function createInventoryLocation(
  name: string,
  description = '',
  image = '',
): InventoryLocation {
  const locationName = name.trim()

  if (!locationName) {
    throw new Error('Naziv lokacije je obavezan.')
  }

  const now = getCurrentDateTime()

  const location: InventoryLocation = {
    id: createId('location'),
    name: locationName,
    description: description.trim(),
    image,
    createdAt: now,
    updatedAt: now,
  }

  saveInventoryLocations([
    ...getInventoryLocations(),
    location,
  ])

  return location
}

export function updateInventoryLocation(
  locationId: string,
  updates: Partial<
    Pick<InventoryLocation, 'name' | 'description' | 'image'>
  >,
): InventoryLocation {
  const locations = getInventoryLocations()
  const existingLocation = locations.find(
    (location) => location.id === locationId,
  )

  if (!existingLocation) {
    throw new Error('Lokacija nije pronađena.')
  }

  const updatedLocation: InventoryLocation = {
    ...existingLocation,
    name:
      updates.name !== undefined
        ? updates.name.trim()
        : existingLocation.name,
    description:
      updates.description !== undefined
        ? updates.description.trim()
        : existingLocation.description,
    image:
      updates.image !== undefined
        ? updates.image
        : existingLocation.image,
    updatedAt: getCurrentDateTime(),
  }

  saveInventoryLocations(
    locations.map((location) => {
      return location.id === locationId
        ? updatedLocation
        : location
    }),
  )

  return updatedLocation
}

export function deleteInventoryLocation(
  locationId: string,
): void {
  const itemUsingLocation = getInventoryItems().find((item) => {
    return item.locationStocks.some(
      (stock) =>
        stock.locationId === locationId &&
        stock.quantity > 0,
    )
  })

  if (itemUsingLocation) {
    throw new Error(
      'Lokaciju nije moguće obrisati jer na njoj još postoji materijal.',
    )
  }

  saveInventoryLocations(
    getInventoryLocations().filter(
      (location) => location.id !== locationId,
    ),
  )
}
