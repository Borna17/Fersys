import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

import DraftAutosaveBadge, {
  type DraftAutosaveState,
} from '../components/DraftAutosaveBadge'
import { getCustomers } from '../services/customers.service'
import {
  deleteUserDraft,
  formatDraftSavedAt,
  loadUserDraft,
  saveUserDraft,
} from '../services/drafts.service'
import type { Customer as CompanyCustomer } from '../types/customer'
import { downloadInvoicePdf } from '../utils/invoicePdf'
import { scopedStorageKey } from '../utils/scopedLocalStorage'
import {
  createInvoice as createCloudInvoice,
  getInvoices as getCloudInvoices,
  updateInvoice as updateCloudInvoice,
} from '../services/invoices.service'
import { updateOffer } from '../services/offers.service'

type InvoiceStatus =
  | 'Nacrt'
  | 'Izdano'
  | 'Poslano'
  | 'Djelomično plaćeno'
  | 'Plaćeno'
  | 'Dospjelo'
  | 'Stornirano'

type CustomerType = 'Fizička osoba' | 'Tvrtka' | 'Zgrada'

type InvoiceItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
}

type InvoiceHistoryItem = {
  id: string
  date: string
  title: string
  description: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  customerName: string
  customerType: CustomerType
  oib: string
  email: string
  phone: string
  address: string
  city: string
  issueDate: string
  dueDate: string
  serviceDate: string
  status: InvoiceStatus
  responsiblePerson: string
  description: string
  internalNote: string
  paymentMethod: string
  paymentModel: string
  paymentReference: string
  iban: string
  items: InvoiceItem[]
  createdAt: string
  updatedAt: string
  paidAt?: string
  paidAmount: number
  version: number
  sourceOfferId?: string
  sourceWorkOrderId?: string
  history: InvoiceHistoryItem[]
}

type CustomerSuggestion = {
  name: string
  type: CustomerType
  oib: string
  email: string
  phone: string
  address: string
  city: string
}

type StoredOffer = {
  id: string
  offerNumber: string
  customerName: string
  customerType: CustomerType
  oib: string
  email: string
  phone: string
  address: string
  city: string
  responsiblePerson: string
  description: string
  internalNote: string
  paymentTerms: string
  items: InvoiceItem[]
}

const STORAGE_KEY = scopedStorageKey('fersys_invoices')
const OFFERS_STORAGE_KEY = 'fersys_offers'
const FLOW_PREFILL_KEY = 'fersys_invoice_prefill'

const unitOptions = [
  'kom',
  'kompl',
  'usl',
  'sat',
  'dan',
  'm',
  'm²',
  'm³',
  'kg',
  'l',
]

const paymentMethods = [
  'Transakcijski račun',
  'Gotovina',
  'Kartica',
  'Internet bankarstvo',
  'Virman',
]

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function getDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`)
  date.setDate(date.getDate() + days)
  return getDateString(date)
}

function readInvoices(): Invoice[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as Invoice[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readOffers(): StoredOffer[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(OFFERS_STORAGE_KEY) ?? '[]',
    ) as StoredOffer[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function createEmptyItem(): InvoiceItem {
  return {
    id: createId('invoice-item'),
    name: '',
    description: '',
    quantity: 1,
    unit: 'kom',
    price: 0,
    discount: 0,
    vat: 25,
  }
}

function getNextInvoiceNumber(invoices: Invoice[]) {
  const year = new Date().getFullYear()
  const highest = invoices.reduce((current, invoice) => {
    const match = invoice.invoiceNumber.match(
      new RegExp(`^R-${year}-(\\d+)$`),
    )
    return match ? Math.max(current, Number(match[1])) : current
  }, 0)

  return `R-${year}-${String(highest + 1).padStart(3, '0')}`
}

function calculateItemBase(item: InvoiceItem) {
  return item.quantity * item.price
}

function calculateItemDiscount(item: InvoiceItem) {
  return calculateItemBase(item) * (item.discount / 100)
}

function calculateItemNet(item: InvoiceItem) {
  return calculateItemBase(item) - calculateItemDiscount(item)
}

function calculateItemVat(item: InvoiceItem) {
  return calculateItemNet(item) * (item.vat / 100)
}

function calculateItemTotal(item: InvoiceItem) {
  return calculateItemNet(item) + calculateItemVat(item)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function mapCompanyCustomerType(
  type: CompanyCustomer['type'],
): CustomerType {
  if (type === 'company') return 'Tvrtka'
  if (type === 'building') return 'Zgrada'
  return 'Fizička osoba'
}

function customerIcon(type: CustomerType) {
  if (type === 'Tvrtka') return Building2
  if (type === 'Zgrada') return UsersRound
  return UserRound
}

export function NewInvoicePage() {
  const navigate = useNavigate()
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const [searchParams] = useSearchParams()

  const [autosaveState, setAutosaveState] =
    useState<DraftAutosaveState>('idle')
  const [autosaveText, setAutosaveText] = useState('')
  const [draftReady, setDraftReady] = useState(false)

  const [prefillSourceOfferId, setPrefillSourceOfferId] =
    useState('')
  const [prefillSourceWorkOrderId, setPrefillSourceWorkOrderId] =
    useState('')

  const storedInvoices = useMemo(() => readInvoices(), [])
  const storedOffers = useMemo(() => readOffers(), [])

  const editingInvoice = useMemo(
    () =>
      invoiceId
        ? storedInvoices.find((invoice) => invoice.id === invoiceId) ?? null
        : null,
    [invoiceId, storedInvoices],
  )

  const duplicateInvoice = useMemo(() => {
    const duplicateId = searchParams.get('duplicate')
    if (!duplicateId || editingInvoice) return null
    return (
      storedInvoices.find((invoice) => invoice.id === duplicateId) ?? null
    )
  }, [editingInvoice, searchParams, storedInvoices])

  const sourceOffer = useMemo(() => {
    const offerId = searchParams.get('fromOffer')
    if (!offerId || editingInvoice || duplicateInvoice) return null
    return storedOffers.find((offer) => offer.id === offerId) ?? null
  }, [duplicateInvoice, editingInvoice, searchParams, storedOffers])

  const source = editingInvoice ?? duplicateInvoice ?? sourceOffer
  const isEditing = Boolean(editingInvoice)
  const isDuplicating = Boolean(duplicateInvoice)
  const today = getDateString(new Date())

  const [invoiceNumber, setInvoiceNumber] = useState(
    editingInvoice?.invoiceNumber ?? getNextInvoiceNumber(storedInvoices),
  )
  const [issueDate, setIssueDate] = useState(
    editingInvoice?.issueDate ?? today,
  )
  const [serviceDate, setServiceDate] = useState(
    editingInvoice?.serviceDate ?? today,
  )
  const [dueDate, setDueDate] = useState(
    editingInvoice?.dueDate ?? addDays(today, 15),
  )

  const [customerType, setCustomerType] = useState<CustomerType>(
    source?.customerType ?? 'Fizička osoba',
  )
  const [customerName, setCustomerName] = useState(
    source?.customerName ?? '',
  )
  const [oib, setOib] = useState(source?.oib ?? '')
  const [email, setEmail] = useState(source?.email ?? '')
  const [phone, setPhone] = useState(source?.phone ?? '')
  const [address, setAddress] = useState(source?.address ?? '')
  const [city, setCity] = useState(source?.city ?? 'Slavonski Brod')

  const [responsiblePerson, setResponsiblePerson] = useState(
    source?.responsiblePerson ?? 'Borna Ferfolja',
  )
  const [description, setDescription] = useState(
    source?.description ?? '',
  )
  const [internalNote, setInternalNote] = useState(
    source?.internalNote ?? '',
  )
  const [paymentMethod, setPaymentMethod] = useState(
    editingInvoice?.paymentMethod ?? 'Transakcijski račun',
  )
  const [paymentModel, setPaymentModel] = useState(
    editingInvoice?.paymentModel ?? 'HR00',
  )
  const [paymentReference, setPaymentReference] = useState(
    editingInvoice?.paymentReference ?? invoiceNumber.replace(/\D/g, ''),
  )
  const [iban, setIban] = useState(editingInvoice?.iban ?? '')

  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (!source?.items?.length) return [createEmptyItem()]

    return source.items.map((item) => ({
      ...item,
      id:
        isDuplicating || sourceOffer
          ? createId('invoice-item')
          : item.id,
    }))
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveMessage, setSaveMessage] = useState('')
  const [customerSearch, setCustomerSearch] = useState(
    source?.customerName ?? '',
  )
  const [showCustomers, setShowCustomers] = useState(false)
  const [companyCustomers, setCompanyCustomers] =
    useState<CompanyCustomer[]>([])
  const [customerLoadError, setCustomerLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCompanyCustomers() {
      try {
        setCustomerLoadError('')
        const savedCustomers = await getCustomers()

        if (!cancelled) {
          setCompanyCustomers(
            savedCustomers.filter(
              (customer) => customer.status === 'Aktivan',
            ),
          )
        }
      } catch (error) {
        console.error('Investitore nije moguće učitati:', error)

        if (!cancelled) {
          setCustomerLoadError(
            error instanceof Error
              ? error.message
              : 'Investitore nije moguće učitati.',
          )
        }
      }
    }

    void loadCompanyCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const hasFlowPrefill =
      Boolean(sessionStorage.getItem(FLOW_PREFILL_KEY))

    if (
      isEditing ||
      isDuplicating ||
      sourceOffer ||
      hasFlowPrefill
    ) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const draft = await loadUserDraft<any>('invoice', 'new')

        if (cancelled || !draft) return

        const value = draft.payload ?? {}

        setInvoiceNumber(value.invoiceNumber ?? invoiceNumber)
        setIssueDate(value.issueDate ?? issueDate)
        setServiceDate(value.serviceDate ?? serviceDate)
        setDueDate(value.dueDate ?? dueDate)
        setCustomerType(value.customerType ?? 'Fizička osoba')
        setCustomerName(value.customerName ?? '')
        setOib(value.oib ?? '')
        setEmail(value.email ?? '')
        setPhone(value.phone ?? '')
        setAddress(value.address ?? '')
        setCity(value.city ?? 'Slavonski Brod')
        setResponsiblePerson(
          value.responsiblePerson ?? responsiblePerson,
        )
        setDescription(value.description ?? '')
        setInternalNote(value.internalNote ?? '')
        setPaymentMethod(
          value.paymentMethod ?? 'Transakcijski račun',
        )
        setPaymentModel(value.paymentModel ?? 'HR00')
        setPaymentReference(
          value.paymentReference ?? paymentReference,
        )
        setIban(value.iban ?? '')
        setItems(
          Array.isArray(value.items) && value.items.length
            ? value.items
            : [createEmptyItem()],
        )
        setCustomerSearch(
          value.customerSearch ?? value.customerName ?? '',
        )

        setAutosaveState('restored')
        setAutosaveText(
          `Nastavljen nedovršeni račun · ${formatDraftSavedAt(
            draft.updatedAt,
          )}`,
        )
      } finally {
        if (!cancelled) {
          setDraftReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draftReady || isEditing || isDuplicating || sourceOffer) {
      return
    }

    const raw =
      sessionStorage.getItem(FLOW_PREFILL_KEY)

    if (!raw) {
      return
    }

    try {
      const value =
        JSON.parse(raw) as Record<string, unknown>

      const text = (key: string) =>
        typeof value[key] === 'string'
          ? String(value[key]).trim()
          : ''

      const nextCustomerType =
        text('customerType')

      if (
        nextCustomerType === 'Fizička osoba' ||
        nextCustomerType === 'Tvrtka' ||
        nextCustomerType === 'Zgrada'
      ) {
        setCustomerType(nextCustomerType)
      }

      const nextCustomerName =
        text('customerName')

      if (nextCustomerName) {
        setCustomerName(nextCustomerName)
        setCustomerSearch(nextCustomerName)
      }

      setOib(text('oib'))
      setEmail(text('email'))
      setPhone(text('phone'))
      setAddress(text('address'))

      const nextCity =
        text('city')

      if (nextCity) {
        setCity(nextCity)
      }

      const nextResponsiblePerson =
        text('responsiblePerson')

      if (nextResponsiblePerson) {
        setResponsiblePerson(nextResponsiblePerson)
      }

      const nextDescription =
        text('description')

      if (nextDescription) {
        setDescription(nextDescription)
      }

      const nextInternalNote =
        text('internalNote')

      if (nextInternalNote) {
        setInternalNote(nextInternalNote)
      }

      const nextServiceDate =
        text('serviceDate')

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(nextServiceDate)
      ) {
        setServiceDate(nextServiceDate)
      }

      const nextDueDate =
        text('dueDate')

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)
      ) {
        setDueDate(nextDueDate)
      }

      const nextPaymentMethod =
        text('paymentMethod')

      if (nextPaymentMethod) {
        setPaymentMethod(nextPaymentMethod)
      }

      const nextIban =
        text('iban')

      if (nextIban) {
        setIban(nextIban)
      }

      if (Array.isArray(value.items)) {
        const nextItems =
          value.items
            .map((rawItem) => {
              if (
                !rawItem ||
                typeof rawItem !== 'object'
              ) {
                return null
              }

              const item =
                rawItem as Record<string, unknown>

              const name =
                typeof item.name === 'string'
                  ? item.name.trim()
                  : ''

              if (!name) {
                return null
              }

              return {
                id: createId('invoice-item'),
                name,
                description:
                  typeof item.description === 'string'
                    ? item.description.trim()
                    : '',
                quantity:
                  Math.max(
                    0.01,
                    Number(item.quantity) || 1,
                  ),
                unit:
                  typeof item.unit === 'string' &&
                  item.unit.trim()
                    ? item.unit.trim()
                    : 'kom',
                price:
                  Math.max(
                    0,
                    Number(
                      item.price ??
                        item.unitPrice,
                    ) || 0,
                  ),
                discount:
                  Math.min(
                    100,
                    Math.max(
                      0,
                      Number(item.discount) || 0,
                    ),
                  ),
                vat:
                  Math.min(
                    100,
                    Math.max(
                      0,
                      Number(
                        item.vat ??
                          item.vatRate,
                      ) || 0,
                    ),
                  ),
              } satisfies InvoiceItem
            })
            .filter(
              (item): item is InvoiceItem =>
                item !== null,
            )

        if (nextItems.length) {
          setItems(nextItems)
        }
      }

      setPrefillSourceOfferId(
        text('sourceOfferId'),
      )
      setPrefillSourceWorkOrderId(
        text('sourceWorkOrderId'),
      )

      setAutosaveState('restored')
      setAutosaveText(
        'Podaci su preneseni iz povezanog FERSYS dokumenta. Provjeri ih prije izdavanja.',
      )
    } catch (error) {
      console.error(
        'Prijenos podataka u račun nije uspio:',
        error,
      )
    } finally {
      sessionStorage.removeItem(
        FLOW_PREFILL_KEY,
      )
    }
  }, [
    draftReady,
    isEditing,
    isDuplicating,
    sourceOffer,
  ])

  useEffect(() => {
    if (!draftReady || isEditing || isDuplicating || sourceOffer) {
      return
    }

    const hasContent = Boolean(
      customerName.trim() ||
        description.trim() ||
        items.some((item) => item.name.trim()),
    )

    if (!hasContent) return

    const timer = window.setTimeout(() => {
      void (async () => {
        setAutosaveState('saving')

        const savedAt = await saveUserDraft('invoice', 'new', {
          invoiceNumber,
          issueDate,
          serviceDate,
          dueDate,
          customerType,
          customerName,
          oib,
          email,
          phone,
          address,
          city,
          responsiblePerson,
          description,
          internalNote,
          paymentMethod,
          paymentModel,
          paymentReference,
          iban,
          items,
          customerSearch,
        })

        setAutosaveState(
          navigator.onLine ? 'saved' : 'offline',
        )

        setAutosaveText(formatDraftSavedAt(savedAt))
      })()
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    isEditing,
    isDuplicating,
    sourceOffer,
    invoiceNumber,
    issueDate,
    serviceDate,
    dueDate,
    customerType,
    customerName,
    oib,
    email,
    phone,
    address,
    city,
    responsiblePerson,
    description,
    internalNote,
    paymentMethod,
    paymentModel,
    paymentReference,
    iban,
    items,
    customerSearch,
  ])

  async function discardInvoiceDraft() {
    if (!window.confirm('Odbaciti nedovršeni račun?')) return

    await deleteUserDraft('invoice', 'new')
    window.location.reload()
  }

  const customerSuggestions = useMemo(() => {
    const map = new Map<string, CustomerSuggestion>()

    const addCustomer = (customer: CustomerSuggestion) => {
      const key =
        customer.oib.trim() ||
        `${customer.name.trim().toLocaleLowerCase(
          'hr-HR',
        )}|${customer.email.trim().toLocaleLowerCase('hr-HR')}`

      if (key && !map.has(key)) {
        map.set(key, customer)
      }
    }

    companyCustomers.forEach((customer) =>
      addCustomer({
        name: customer.name,
        type: mapCompanyCustomerType(customer.type),
        oib: customer.oib,
        email: customer.email,
        phone: customer.phone,
        address: [
          customer.street,
          [customer.postalCode, customer.city]
            .filter(Boolean)
            .join(' '),
        ]
          .filter(Boolean)
          .join(', '),
        city: customer.city,
      }),
    )

    storedInvoices.forEach((invoice) =>
      addCustomer({
        name: invoice.customerName,
        type: invoice.customerType,
        oib: invoice.oib,
        email: invoice.email,
        phone: invoice.phone,
        address: invoice.address,
        city: invoice.city,
      }),
    )

    storedOffers.forEach((offer) =>
      addCustomer({
        name: offer.customerName,
        type: offer.customerType,
        oib: offer.oib,
        email: offer.email,
        phone: offer.phone,
        address: offer.address,
        city: offer.city,
      }),
    )

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'hr'),
    )
  }, [companyCustomers, storedInvoices, storedOffers])

  const filteredCustomers = useMemo(() => {
    const query = customerSearch
      .trim()
      .toLocaleLowerCase('hr-HR')

    return customerSuggestions
      .filter((customer) =>
        [
          customer.name,
          customer.oib,
          customer.email,
          customer.phone,
          customer.address,
          customer.city,
        ]
          .join(' ')
          .toLocaleLowerCase('hr-HR')
          .includes(query),
      )
      .slice(0, 8)
  }, [customerSearch, customerSuggestions])

  const totals = useMemo(() => {
    const base = items.reduce(
      (sum, item) => sum + calculateItemBase(item),
      0,
    )
    const discount = items.reduce(
      (sum, item) => sum + calculateItemDiscount(item),
      0,
    )
    const net = items.reduce(
      (sum, item) => sum + calculateItemNet(item),
      0,
    )
    const vat = items.reduce(
      (sum, item) => sum + calculateItemVat(item),
      0,
    )

    return {
      base,
      discount,
      net,
      vat,
      total: net + vat,
    }
  }, [items])

  function updateItem(
    itemId: string,
    field: keyof InvoiceItem,
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    )
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()])
  }

  function duplicateItem(itemId: string) {
    const item = items.find((current) => current.id === itemId)
    if (!item) return

    setItems((current) => [
      ...current,
      {
        ...item,
        id: createId('invoice-item'),
      },
    ])
  }

  function removeItem(itemId: string) {
    setItems((current) =>
      current.length === 1
        ? [createEmptyItem()]
        : current.filter((item) => item.id !== itemId),
    )
  }

  function selectCustomer(customer: CustomerSuggestion) {
    setCustomerName(customer.name)
    setCustomerType(customer.type)
    setOib(customer.oib)
    setEmail(customer.email)
    setPhone(customer.phone)
    setAddress(customer.address)
    setCity(customer.city)
    setCustomerSearch(customer.name)
    setShowCustomers(false)
    setErrors((current) => ({
      ...current,
      customerName: '',
    }))
  }

  function validate() {
    const nextErrors: Record<string, string> = {}

    if (!invoiceNumber.trim()) {
      nextErrors.invoiceNumber = 'Unesi broj računa.'
    }

    if (!issueDate) {
      nextErrors.issueDate = 'Odaberi datum izdavanja.'
    }

    if (!serviceDate) {
      nextErrors.serviceDate = 'Odaberi datum usluge.'
    }

    if (!dueDate) {
      nextErrors.dueDate = 'Odaberi datum dospijeća.'
    }

    if (!customerName.trim()) {
      nextErrors.customerName =
        'Unesi ili odaberi investitora.'
    }

    if (!items.some((item) => item.name.trim())) {
      nextErrors.items = 'Dodaj barem jednu stavku računa.'
    }

    if (
      items.some(
        (item) =>
          item.name.trim() &&
          (item.quantity <= 0 ||
            item.price < 0 ||
            item.discount < 0 ||
            item.discount > 100 ||
            item.vat < 0),
      )
    ) {
      nextErrors.items =
        'Provjeri količinu, cijenu, popust i PDV stavki.'
    }

    const duplicateNumber = storedInvoices.some(
      (invoice) =>
        invoice.id !== editingInvoice?.id &&
        invoice.invoiceNumber
          .trim()
          .toLocaleLowerCase('hr-HR') ===
          invoiceNumber.trim().toLocaleLowerCase('hr-HR'),
    )

    if (duplicateNumber) {
      nextErrors.invoiceNumber =
        'Račun s ovim brojem već postoji.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildInvoice(status: InvoiceStatus): Invoice {
    const now = new Date().toISOString()

    const cleanItems = items
      .filter((item) => item.name.trim())
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        vat: Number(item.vat) || 0,
      }))

    return {
      id: editingInvoice?.id ?? createId('invoice'),
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim(),
      customerType,
      oib: oib.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      issueDate,
      serviceDate,
      dueDate,
      status,
      responsiblePerson: responsiblePerson.trim(),
      description: description.trim(),
      internalNote: internalNote.trim(),
      paymentMethod,
      paymentModel: paymentModel.trim(),
      paymentReference: paymentReference.trim(),
      iban: iban.trim(),
      items: cleanItems,
      createdAt: editingInvoice?.createdAt ?? now,
      updatedAt: now,
      paidAt: editingInvoice?.paidAt,
      paidAmount: editingInvoice?.paidAmount ?? 0,
      version: isEditing
        ? (editingInvoice?.version ?? 1) + 1
        : 1,
      sourceOfferId:
        (
          editingInvoice?.sourceOfferId ??
          sourceOffer?.id ??
          prefillSourceOfferId
        ) || undefined,
      sourceWorkOrderId:
        (
          editingInvoice?.sourceWorkOrderId ??
          prefillSourceWorkOrderId
        ) || undefined,
      history: [
        ...(editingInvoice?.history ?? []),
        {
          id: createId('invoice-history'),
          date: now,
          title: isEditing
            ? 'Račun uređen'
            : status === 'Nacrt'
              ? 'Račun spremljen kao nacrt'
              : 'Račun izdan',
          description: isEditing
            ? `Račun je uređen i spremljen sa statusom „${status}”.`
            : `Račun je izrađen sa statusom „${status}”.`,
        },
      ],
    }
  }

  function preview() {
    setSaveMessage('')

    if (!validate()) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    downloadInvoicePdf(
      buildInvoice(
        editingInvoice?.status ?? 'Nacrt',
      ),
    )
  }

  async function save(status: InvoiceStatus) {
    setSaveMessage('')

    if (!validate()) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    const savedInvoice = buildInvoice(status)

    try {
      const cloudInvoice =
        isEditing
          ? await updateCloudInvoice(
              savedInvoice,
            )
          : await createCloudInvoice(
              savedInvoice,
            )

      const cloudInvoices =
        await getCloudInvoices<Invoice>()

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          cloudInvoices,
        ),
      )

      savedInvoice.id =
        cloudInvoice.id

      const linkedOfferId =
        savedInvoice.sourceOfferId?.trim()

      if (
        !isEditing &&
        linkedOfferId
      ) {
        try {
          await updateOffer(
            linkedOfferId,
            {
              invoiceId:
                cloudInvoice.id,
            },
          )
        } catch (linkError) {
          console.warn(
            'Račun je spremljen, ali veza s ponudom nije osvježena:',
            linkError,
          )
        }
      }
    } catch (error) {
      console.error(
        'Račun nije spremljen u cloud:',
        error,
      )

      setErrors(
        (current) => ({
          ...current,
          cloud:
            error instanceof Error
              ? error.message
              : 'Račun nije moguće spremiti u cloud.',
        }),
      )

      setSaveMessage(
        'Račun NIJE spremljen. Provjeri cloud vezu i pokušaj ponovno.',
      )

      return
    }

    if (!isEditing && !isDuplicating && !sourceOffer) {
      void deleteUserDraft('invoice', 'new')
    }

    setSaveMessage(
      isEditing
        ? 'Promjene računa su spremljene.'
        : status === 'Nacrt'
          ? 'Račun je spremljen kao nacrt.'
          : 'Račun je uspješno izdan.',
    )

    window.setTimeout(() => navigate('/invoices'), 700)
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-28 sm:space-y-6 sm:pb-12">
        <DraftAutosaveBadge
          state={autosaveState}
          text={autosaveText}
          onDiscard={
            !isEditing &&
            !isDuplicating &&
            !sourceOffer &&
            autosaveState !== 'idle'
              ? () => void discardInvoiceDraft()
              : undefined
          }
        />

        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Računi
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                {isEditing
                  ? 'UREĐIVANJE RAČUNA'
                  : sourceOffer || prefillSourceOfferId
                    ? 'RAČUN IZ PONUDE'
                    : prefillSourceWorkOrderId
                      ? 'RAČUN IZ RADNOG NALOGA'
                      : isDuplicating
                      ? 'KOPIJA RAČUNA'
                      : 'NOVI RAČUN'}
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {isEditing
                  ? `Uredi ${invoiceNumber}`
                  : 'Izradi račun'}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Investitor, datumi, stavke i plaćanje u nekoliko jasnih koraka.
              </p>
            </div>

            <button
              type="button"
              onClick={preview}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white active:scale-95 sm:hidden"
              aria-label="PDF pregled"
            >
              <Eye size={19} />
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <HeroMetric
              label="Broj"
              value={invoiceNumber}
            />
            <HeroMetric
              label="Stavke"
              value={String(
                items.filter((item) => item.name.trim()).length,
              )}
            />
            <HeroMetric
              label="Ukupno"
              value={formatCurrency(totals.total)}
            />
          </div>

          <div className="relative mt-4 hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={preview}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 text-sm font-black text-white"
            >
              <Eye size={18} />
              PDF pregled
            </button>

            <button
              type="button"
              onClick={() => void save('Nacrt')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-black text-violet-200"
            >
              <Save size={18} />
              Spremi nacrt
            </button>

            <button
              type="button"
              onClick={() => void save('Izdano')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white"
            >
              <CheckCircle2 size={18} />
              Izdaj račun
            </button>
          </div>
        </section>

        {(prefillSourceOfferId ||
          prefillSourceWorkOrderId) && (
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-200">
            Podaci su preneseni iz povezanog dokumenta. Provjeri investitora,
            stavke, cijene, PDV i datume prije spremanja računa.
          </div>
        )}

        {saveMessage && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200">
            {saveMessage}
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200">
            Provjeri označena polja prije spremanja računa.
          </div>
        )}

        <MobileSection
          number="1"
          title="Podaci računa"
          description="Broj računa i ključni datumi."
          icon={<CalendarDays size={19} />}
        >
          <Field label="Broj računa">
            <input
              value={invoiceNumber}
              onChange={(event) => {
                setInvoiceNumber(event.target.value)
                setErrors((current) => ({
                  ...current,
                  invoiceNumber: '',
                }))
              }}
              className={`${inputClass} ${
                errors.invoiceNumber ? 'border-red-500' : ''
              }`}
            />
            {errors.invoiceNumber && (
              <p className="mt-2 text-xs font-black text-red-300">
                {errors.invoiceNumber}
              </p>
            )}
          </Field>

          <Field label="Datum izdavanja">
            <input
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <Field label="Datum usluge">
            <input
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <Field label="Dospijeće">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>
        </MobileSection>

        <MobileSection
          number="2"
          title="Investitor"
          description="Pretraži postojećeg ili unesi novog investitora."
          icon={<UserRound size={19} />}
        >
          <div className="relative sm:col-span-2">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-6 -translate-y-1/2 text-slate-500"
            />

            <input
              value={customerSearch}
              onFocus={() => setShowCustomers(true)}
              onChange={(event) => {
                setCustomerSearch(event.target.value)
                setCustomerName(event.target.value)
                setShowCustomers(true)
              }}
              placeholder="Naziv, OIB, e-mail ili telefon..."
              className={`${inputClass} pl-11 pr-11`}
            />

            {customerSearch && (
              <button
                type="button"
                onClick={() => {
                  setCustomerSearch('')
                  setCustomerName('')
                }}
                className="absolute right-2 top-1.5 grid h-9 w-9 place-items-center rounded-xl text-slate-500"
              >
                <X size={16} />
              </button>
            )}

            {showCustomers && filteredCustomers.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                {filteredCustomers.map((customer) => {
                  const Icon = customerIcon(customer.type)

                  return (
                    <button
                      key={`${customer.oib}-${customer.name}-${customer.email}`}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="flex w-full items-start gap-3 rounded-xl p-3 text-left active:bg-slate-800"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                        <Icon size={18} />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white">
                          {customer.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {[customer.oib, customer.email, customer.city]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {errors.customerName && (
              <p className="mt-2 text-xs font-black text-red-300">
                {errors.customerName}
              </p>
            )}
          </div>

          {customerLoadError && (
            <div className="sm:col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
              {customerLoadError}
            </div>
          )}

          <Field label="Vrsta investitora">
            <select
              value={customerType}
              onChange={(event) =>
                setCustomerType(event.target.value as CustomerType)
              }
              className={inputClass}
            >
              <option>Fizička osoba</option>
              <option>Tvrtka</option>
              <option>Zgrada</option>
            </select>
          </Field>

          <Field label="Naziv / ime investitora">
            <input
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value)
                setCustomerSearch(event.target.value)
              }}
              className={inputClass}
            />
          </Field>

          <Field label="OIB">
            <input
              inputMode="numeric"
              maxLength={11}
              value={oib}
              onChange={(event) =>
                setOib(
                  event.target.value.replace(/\D/g, '').slice(0, 11),
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Telefon">
            <input
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Grad">
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Adresa"
            className="sm:col-span-2"
          >
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={inputClass}
            />
          </Field>
        </MobileSection>

        <MobileSection
          number="3"
          title="Stavke računa"
          description="Radovi, materijal, količina, cijena, popust i PDV."
          action={
            <button
              type="button"
              onClick={addItem}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-black text-slate-950"
            >
              <Plus size={16} />
              Dodaj
            </button>
          }
        >
          <div className="space-y-3 sm:col-span-2">
            {errors.items && (
              <div className="rounded-2xl bg-red-500/10 p-3 text-sm font-black text-red-300">
                {errors.items}
              </div>
            )}

            {items.map((item, index) => (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-black text-white">
                      Stavka
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => duplicateItem(item.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-[10px] font-black text-slate-300"
                    >
                      <Copy size={14} />
                      Dupliciraj
                    </button>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    value={item.name}
                    onChange={(event) =>
                      updateItem(item.id, 'name', event.target.value)
                    }
                    placeholder="Naziv stavke"
                    className={inputClass}
                  />

                  <textarea
                    rows={3}
                    value={item.description}
                    onChange={(event) =>
                      updateItem(
                        item.id,
                        'description',
                        event.target.value,
                      )
                    }
                    placeholder="Opis stavke"
                    className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                  />

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <MiniField label="Količina">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'quantity',
                            Number(event.target.value),
                          )
                        }
                        className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                      />
                    </MiniField>

                    <MiniField label="Jedinica">
                      <select
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(item.id, 'unit', event.target.value)
                        }
                        className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                      >
                        {unitOptions.map((unit) => (
                          <option
                            key={unit}
                            value={unit}
                          >
                            {unit}
                          </option>
                        ))}
                      </select>
                    </MiniField>

                    <MiniField label="Cijena €">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={item.price === 0 ? '' : item.price}
                        placeholder="0,00"
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'price',
                            Number(event.target.value),
                          )
                        }
                        className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none placeholder:text-slate-600"
                      />
                    </MiniField>

                    <MiniField label="Popust %">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        inputMode="decimal"
                        value={item.discount === 0 ? '' : item.discount}
                        placeholder="0"
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'discount',
                            Number(event.target.value),
                          )
                        }
                        className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none placeholder:text-slate-600"
                      />
                    </MiniField>

                    <MiniField label="PDV %">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        inputMode="decimal"
                        value={item.vat}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'vat',
                            Number(event.target.value),
                          )
                        }
                        className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                      />
                    </MiniField>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-violet-500/10 p-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-violet-300">
                      Ukupno stavke
                    </span>

                    <span className="text-sm font-black text-white">
                      {formatCurrency(calculateItemTotal(item))}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </MobileSection>

        <MobileSection
          number="4"
          title="Plaćanje i napomene"
          description="Način plaćanja, IBAN i završni tekst računa."
          icon={<FileText size={19} />}
        >
          <Field label="Način plaćanja">
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClass}
            >
              {paymentMethods.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </Field>

          <Field label="IBAN">
            <input
              value={iban}
              onChange={(event) => setIban(event.target.value)}
              placeholder="HR..."
              className={inputClass}
            />
          </Field>

          <Field label="Odgovorna osoba">
            <input
              value={responsiblePerson}
              onChange={(event) =>
                setResponsiblePerson(event.target.value)
              }
              className={inputClass}
            />
          </Field>

          <Field label="Model">
            <input
              value={paymentModel}
              onChange={(event) => setPaymentModel(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Poziv na broj"
            className="sm:col-span-2"
          >
            <input
              value={paymentReference}
              onChange={(event) =>
                setPaymentReference(event.target.value)
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Opis računa"
            className="sm:col-span-2"
          >
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white outline-none focus:border-violet-500"
            />
          </Field>

          <Field
            label="Interna napomena"
            className="sm:col-span-2"
          >
            <textarea
              rows={4}
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white outline-none focus:border-violet-500"
            />
          </Field>
        </MobileSection>

        <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900 to-violet-950/30 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
              <CheckCircle2 size={20} />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
                SAŽETAK
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Ukupno za plaćanje
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TotalBox
              label="Vrijednost"
              value={formatCurrency(totals.base)}
            />
            <TotalBox
              label="Popust"
              value={formatCurrency(totals.discount)}
            />
            <TotalBox
              label="PDV"
              value={formatCurrency(totals.vat)}
            />
            <TotalBox
              label="Ukupno"
              value={formatCurrency(totals.total)}
              strong
            />
          </div>
        </section>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+var(--fersys-safe-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={() => void save('Nacrt')}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800 text-violet-200"
            aria-label="Spremi nacrt"
          >
            <Save size={18} />
          </button>

          <button
            type="button"
            onClick={() => void save('Izdano')}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 font-black text-white"
          >
            <CheckCircle2 size={18} />
            {isEditing ? 'Spremi i izdaj' : 'Izdaj račun'}
          </button>
        </div>
      </div>
    </>
  )
}

function MobileSection({
  number,
  title,
  description,
  icon,
  action,
  children,
}: {
  number: string
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-xs font-black text-violet-300">
            {icon ?? number}
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-black text-white sm:text-xl">
              {number}. {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-slate-300">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function MiniField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="min-w-0">
      <span className="block truncate text-[9px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

function TotalBox({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        strong ? 'bg-violet-600' : 'bg-slate-800/65'
      }`}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-wider ${
          strong ? 'text-violet-100' : 'text-slate-600'
        }`}
      >
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-black text-white sm:text-base">
        {value}
      </p>
    </div>
  )
}