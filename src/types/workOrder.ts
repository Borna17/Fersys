export type CustomerType =
  | 'person'
  | 'company'
  | 'building'

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
  status: 'Aktivan' | 'Neaktivan'

  createdAt: string
  updatedAt: string
}

export type WorkOrderStatus =
  | 'Novi'
  | 'Zakazan'
  | 'U tijeku'
  | 'Završen'
  | 'Otkazan'

export type WorkOrderPriority =
  | 'Nizak'
  | 'Normalan'
  | 'Visok'
  | 'Hitno'

export type WorkOrderMaterial = {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  discountRate: number
}

export type WorkOrderImage = {
  id: string
  name: string
  dataUrl: string
}

export type WorkOrder = {
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

  materials: WorkOrderMaterial[]
  assignedWorkers: string[]

  labourPrice: number
  materialPrice: number
  discountRate: number
  vatRate: number
  totalPrice: number
  priceNote: string

  investorName: string
  investorSignature: string

  images: WorkOrderImage[]

  status: WorkOrderStatus
  priority: WorkOrderPriority

  createdAt: string
  updatedAt: string
}

export type PdfLayout =
  | 'classic'
  | 'modern'
  | 'custom'
  | 'minimal'

export type WorkOrderCustomInfoStyle =
  | 'cards'
  | 'compact'

export type WorkOrderCustomMaterialStyle =
  | 'table'
  | 'list'

export type WorkOrderCustomSectionOrder =
  | 'description-first'
  | 'materials-first'

export type WorkOrderBranding = {
  companyName: string
  companyOib: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyIban: string
  companyWebsite: string

  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  borderColor: string
  backgroundColor: string

  logo: string
  stamp: string
  backgroundImage: string

  showBackgroundImage: boolean
  showLogo: boolean
  showStamp: boolean
  showCompanyPhone: boolean
  showCompanyEmail: boolean
  showCompanyIban: boolean
  showCompanyOib: boolean
  showCompanyWebsite: boolean

  headerAlignment:
    | 'left'
    | 'center'
    | 'right'

  layout: PdfLayout

  customDocumentTitle: string
  customDescriptionLabel: string
  customMaterialsLabel: string
  customPhotosLabel: string
  customSignatureLabel: string

  customInfoStyle:
    WorkOrderCustomInfoStyle

  customMaterialStyle:
    WorkOrderCustomMaterialStyle

  customSectionOrder:
    WorkOrderCustomSectionOrder

  watermarkText: string
  footerText: string
}

export const defaultWorkOrderBranding: WorkOrderBranding = {
  companyName: 'Instalacije Ferfolja',
  companyOib: '',
  companyAddress: 'Slavonski Brod',
  companyPhone: '',
  companyEmail: '',
  companyIban: '',
  companyWebsite: '',

  primaryColor: '#2563EB',
  secondaryColor: '#0F172A',
  accentColor: '#38BDF8',
  textColor: '#0F172A',
  borderColor: '#CBD5E1',
  backgroundColor: '#FFFFFF',

  logo: '',
  stamp: '',
  backgroundImage: '',

  showBackgroundImage: false,
  showLogo: true,
  showStamp: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showCompanyIban: true,
  showCompanyOib: true,
  showCompanyWebsite: true,

  headerAlignment: 'left',
  layout: 'modern',

  customDocumentTitle:
    'RADNI NALOG',

  customDescriptionLabel:
    'Opis radova',

  customMaterialsLabel:
    'Utrošeni materijal',

  customPhotosLabel:
    'Fotografije',

  customSignatureLabel:
    'Potpis i ovjera',

  customInfoStyle:
    'cards',

  customMaterialStyle:
    'table',

  customSectionOrder:
    'description-first',

  watermarkText: 'RADNI NALOG',
  footerText: 'Hvala na povjerenju.',
}
