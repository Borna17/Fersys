export type OfferStatus =
  | 'Nacrt'
  | 'Poslano'
  | 'Pregledano'
  | 'U tijeku'
  | 'Prihvaćeno'
  | 'Odbijeno'
  | 'Isteklo'
  | 'Otkazano'

export type CustomerType =
  | 'Fizička osoba'
  | 'Tvrtka'
  | 'Zgrada'

export type OfferItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
  imageDataUrl?: string
  imageName?: string
}

export type OfferHistoryItem = {
  id: string
  date: string
  title: string
  description: string
}

export type OfferAttachment = {
  id: string
  name: string
  type: string
  size: number
  dataUrl?: string
  createdAt: string
}

export type OfferCustomer = {
  id?: string
  name: string
  type: CustomerType
  oib: string
  email: string
  phone: string
  address: string
  postalCode?: string
  city: string
  contactPerson?: string
}

export type Offer = {
  id: string
  offerNumber: string
  version: number

  customerName: string
  customerType: CustomerType
  customerId?: string

  oib: string
  email: string
  phone: string
  address: string
  postalCode?: string
  city: string
  contactPerson?: string

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

  createdAt: string
  updatedAt: string

  sentAt?: string
  viewedAt?: string
  acceptedAt?: string
  rejectedAt?: string
  cancelledAt?: string

  rejectionReason?: string
  cancellationReason?: string

  workOrderId?: string
  invoiceId?: string

  history: OfferHistoryItem[]
}

export type DatePreset =
  | 'all'
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom'

export type ExportMode =
  | 'filtered'
  | 'selected'
  | 'all'
  | 'customer'

export type OfferViewMode = 'table' | 'cards'

export type OfferSortField =
  | 'offerNumber'
  | 'customerName'
  | 'date'
  | 'validUntil'
  | 'total'
  | 'status'
  | 'updatedAt'

export type SortDirection = 'asc' | 'desc'

export type OfferFilters = {
  searchQuery: string
  status: OfferStatus | 'Svi'
  datePreset: DatePreset
  dateFrom: string
  dateTo: string
  minimumAmount: string
  maximumAmount: string
  responsiblePerson: string
  customerType: CustomerType | 'Svi'
}

export type OfferStatistics = {
  total: number
  drafts: number
  sent: number
  viewed: number
  inProgress: number
  accepted: number
  rejected: number
  expired: number
  cancelled: number

  totalValue: number
  acceptedValue: number
  rejectedValue: number
  pendingValue: number
  averageValue: number

  successRate: number
}

export type MonthlyOfferStatistics = {
  year: number
  month: number
  label: string
  totalCount: number
  acceptedCount: number
  rejectedCount: number
  totalValue: number
  acceptedValue: number
}