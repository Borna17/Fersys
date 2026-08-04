export type CustomerType =
  | 'person'
  | 'company'
  | 'building'

export type CustomerStatus =
  | 'Aktivan'
  | 'Neaktivan'

export type Customer = {
  id: string
  companyId: string

  type: CustomerType
  name: string
  contactPerson?: string
  logo?: string

  oib: string
  phone: string
  email: string

  street: string
  city: string
  postalCode: string

  iban: string
  notes: string

  workOrders: number
  totalSpent: string
  status: CustomerStatus

  createdAt: string
  updatedAt: string
}

export type CustomerInput = {
  type: CustomerType
  name: string
  contactPerson?: string
  logo?: string

  oib: string
  phone: string
  email: string

  street: string
  city: string
  postalCode: string

  iban: string
  notes: string
  status?: CustomerStatus
}