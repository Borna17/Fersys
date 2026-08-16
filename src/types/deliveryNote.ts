export type DeliveryNoteStatus =
  | 'draft'
  | 'issued'
  | 'delivered'
  | 'cancelled'

export type DeliveryNoteItem = {
  id: string
  inventoryItemId: string
  code: string
  name: string
  description: string
  quantity: number
  unit: string
  note: string
  unitPrice: number
  vatRate: number
}

export type DeliveryNote = {
  id: string
  companyId: string
  number: string

  customerId: string
  customerName: string
  customerType: string
  customerOib: string
  customerEmail: string
  customerPhone: string

  deliveryDate: string
  deliveryTime: string
  deliveryAddress: string
  deliveryPlace: string

  workOrderId: string
  workOrderNumber: string
  offerId: string
  offerNumber: string
  invoiceId: string
  invoiceNumber: string

  vehicleRegistration: string
  deliveredBy: string
  receivedBy: string

  deliveredSignature: string
  receivedSignature: string

  note: string
  status: DeliveryNoteStatus

  deductInventory: boolean
  inventoryPosted: boolean

  items: DeliveryNoteItem[]

  createdAt: string
  updatedAt: string
  issuedAt: string
  deliveredAt: string
  cancelledAt: string
}

export type CreateDeliveryNoteInput = Omit<
  DeliveryNote,
  | 'id'
  | 'companyId'
  | 'number'
  | 'createdAt'
  | 'updatedAt'
  | 'issuedAt'
  | 'deliveredAt'
  | 'cancelledAt'
  | 'inventoryPosted'
> & {
  number?: string
}

export const deliveryNoteStatusLabels:
Record<
  DeliveryNoteStatus,
  string
> = {
  draft: 'Nacrt',
  issued: 'Izdana',
  delivered: 'Isporučena',
  cancelled: 'Stornirana',
}
