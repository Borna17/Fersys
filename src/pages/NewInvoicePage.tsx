import { useMemo, useState } from 'react'
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
import { openInvoicePdf } from '../utils/invoicePdf'

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

const STORAGE_KEY = 'fersys_invoices'
const OFFERS_STORAGE_KEY = 'fersys_offers'

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

function customerIcon(type: CustomerType) {
  if (type === 'Tvrtka') return Building2
  if (type === 'Zgrada') return UsersRound
  return UserRound
}

export function NewInvoicePage() {
  const navigate = useNavigate()
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const [searchParams] = useSearchParams()

  const storedInvoices = useMemo(() => readInvoices(), [])
  const storedOffers = useMemo(() => readOffers(), [])

  const editingInvoice = useMemo(
    () =>
      invoiceId
        ? storedInvoices.find((invoice) => invoice.id === invoiceId) ??
          null
        : null,
    [invoiceId, storedInvoices],
  )

  const duplicateInvoice = useMemo(() => {
    const duplicateId = searchParams.get('duplicate')
    if (!duplicateId || editingInvoice) return null
    return (
      storedInvoices.find((invoice) => invoice.id === duplicateId) ??
      null
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
    editingInvoice?.invoiceNumber ??
      getNextInvoiceNumber(storedInvoices),
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

  const [customerType, setCustomerType] =
    useState<CustomerType>(
      source?.customerType ?? 'Fizička osoba',
    )
  const [customerName, setCustomerName] = useState(
    source?.customerName ?? '',
  )
  const [oib, setOib] = useState(source?.oib ?? '')
  const [email, setEmail] = useState(source?.email ?? '')
  const [phone, setPhone] = useState(source?.phone ?? '')
  const [address, setAddress] = useState(source?.address ?? '')
  const [city, setCity] = useState(
    source?.city ?? 'Slavonski Brod',
  )

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
    editingInvoice?.paymentReference ??
      invoiceNumber.replace(/\D/g, ''),
  )
  const [iban, setIban] = useState(
    editingInvoice?.iban ?? '',
  )

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

  const customerSuggestions = useMemo(() => {
    const map = new Map<string, CustomerSuggestion>()

    const addCustomer = (customer: CustomerSuggestion) => {
      const key =
        customer.oib.trim() ||
        `${customer.name.trim().toLocaleLowerCase(
          'hr-HR',
        )}|${customer.email.trim().toLocaleLowerCase('hr-HR')}`
      if (key && !map.has(key)) map.set(key, customer)
    }

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
  }, [storedInvoices, storedOffers])

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
    return { base, discount, net, vat, total: net + vat }
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
      { ...item, id: createId('invoice-item') },
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
    setErrors((current) => ({ ...current, customerName: '' }))
  }

  function validate() {
    const nextErrors: Record<string, string> = {}

    if (!invoiceNumber.trim()) {
      nextErrors.invoiceNumber = 'Unesi broj računa.'
    }

    if (!issueDate) nextErrors.issueDate = 'Odaberi datum izdavanja.'
    if (!serviceDate) nextErrors.serviceDate = 'Odaberi datum usluge.'
    if (!dueDate) nextErrors.dueDate = 'Odaberi datum dospijeća.'
    if (!customerName.trim()) {
      nextErrors.customerName = 'Unesi ili odaberi kupca.'
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
        editingInvoice?.sourceOfferId ?? sourceOffer?.id,
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    openInvoicePdf(buildInvoice(editingInvoice?.status ?? 'Nacrt'))
  }

  function save(status: InvoiceStatus) {
    setSaveMessage('')
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const savedInvoice = buildInvoice(status)
    const current = readInvoices()
    const updated = isEditing
      ? current.map((invoice) =>
          invoice.id === savedInvoice.id ? savedInvoice : invoice,
        )
      : [savedInvoice, ...current]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
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
    <section className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              aria-label="Natrag na račune"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-300">
                <FileText size={16} />
                Računi
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {isEditing
                  ? `Uredi račun ${editingInvoice?.invoiceNumber}`
                  : sourceOffer
                    ? 'Novi račun iz ponude'
                    : isDuplicating
                      ? 'Kopija računa'
                      : 'Novi račun'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Unesi kupca, datume, način plaćanja i stavke računa.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={preview}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
            >
              <Eye size={17} />
              Pregled PDF-a
            </button>

            <button
              type="button"
              onClick={() => save('Nacrt')}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-200 transition hover:bg-violet-500/20"
            >
              <Save size={17} />
              Spremi nacrt
            </button>

            <button
              type="button"
              onClick={() => save('Izdano')}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
            >
              <CheckCircle2 size={17} />
              Izdaj račun
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
            {saveMessage}
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Provjeri označena polja prije spremanja računa.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <CalendarDays size={19} />
                </div>
                <div>
                  <h2 className="font-black">Podaci računa</h2>
                  <p className="text-sm text-slate-400">
                    Broj računa i važni datumi.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Broj računa
                  </span>
                  <input
                    value={invoiceNumber}
                    onChange={(event) => {
                      setInvoiceNumber(event.target.value)
                      setErrors((current) => ({
                        ...current,
                        invoiceNumber: '',
                      }))
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold outline-none transition focus:border-violet-400/50"
                  />
                  {errors.invoiceNumber && (
                    <span className="text-xs font-bold text-red-300">
                      {errors.invoiceNumber}
                    </span>
                  )}
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Datum izdavanja
                  </span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold outline-none transition focus:border-violet-400/50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Datum usluge
                  </span>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(event) => setServiceDate(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold outline-none transition focus:border-violet-400/50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Dospijeće
                  </span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold outline-none transition focus:border-violet-400/50"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                  <UserRound size={19} />
                </div>
                <div>
                  <h2 className="font-black">Kupac</h2>
                  <p className="text-sm text-slate-400">
                    Odaberi postojećeg ili unesi novog kupca.
                  </p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  value={customerSearch}
                  onFocus={() => setShowCustomers(true)}
                  onChange={(event) => {
                    setCustomerSearch(event.target.value)
                    setCustomerName(event.target.value)
                    setShowCustomers(true)
                  }}
                  placeholder="Pretraži kupca po nazivu, OIB-u ili e-mailu"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3 pl-11 pr-11 outline-none transition focus:border-violet-400/50"
                />

                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch('')
                      setCustomerName('')
                    }}
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-white/5"
                  >
                    <X size={16} />
                  </button>
                )}

                {showCustomers && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                    {filteredCustomers.map((customer) => {
                      const Icon = customerIcon(customer.type)
                      return (
                        <button
                          key={`${customer.oib}-${customer.name}-${customer.email}`}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5"
                        >
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-black">
                              {customer.name}
                            </div>
                            <div className="truncate text-xs text-slate-400">
                              {[customer.oib, customer.email, customer.city]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {errors.customerName && (
                <div className="mb-4 text-xs font-bold text-red-300">
                  {errors.customerName}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Vrsta kupca
                  </span>
                  <select
                    value={customerType}
                    onChange={(event) =>
                      setCustomerType(event.target.value as CustomerType)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  >
                    <option>Fizička osoba</option>
                    <option>Tvrtka</option>
                    <option>Zgrada</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Naziv / ime kupca
                  </span>
                  <input
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value)
                      setCustomerSearch(event.target.value)
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    OIB
                  </span>
                  <input
                    value={oib}
                    onChange={(event) => setOib(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    E-mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Telefon
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Grad
                  </span>
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Adresa
                  </span>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-black">Stavke računa</h2>
                  <p className="text-sm text-slate-400">
                    Unesi radove, materijal, količine i cijene.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white"
                >
                  <Plus size={17} />
                  Dodaj stavku
                </button>
              </div>

              {errors.items && (
                <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                  {errors.items}
                </div>
              )}

              <div className="space-y-4">
                {items.map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="font-black text-slate-200">
                        Stavka {index + 1}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateItem(item.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5"
                          title="Dupliciraj stavku"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-red-400/20 text-red-300 hover:bg-red-500/10"
                          title="Obriši stavku"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-12">
                      <label className="space-y-2 lg:col-span-5">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Naziv
                        </span>
                        <input
                          value={item.name}
                          onChange={(event) =>
                            updateItem(item.id, 'name', event.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2 lg:col-span-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Količina
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'quantity',
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2 lg:col-span-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          JM
                        </span>
                        <select
                          value={item.unit}
                          onChange={(event) =>
                            updateItem(item.id, 'unit', event.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        >
                          {unitOptions.map((unit) => (
                            <option key={unit}>{unit}</option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 lg:col-span-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Cijena bez PDV-a
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'price',
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2 lg:col-span-6">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Opis
                        </span>
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
                          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2 lg:col-span-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          Popust %
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'discount',
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <label className="space-y-2 lg:col-span-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                          PDV %
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.vat}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'vat',
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none"
                        />
                      </label>

                      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 lg:col-span-2">
                        <div className="text-xs font-black uppercase tracking-wider text-violet-300">
                          Ukupno
                        </div>
                        <div className="mt-2 text-lg font-black text-white">
                          {formatCurrency(calculateItemTotal(item))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <h2 className="mb-5 font-black">Plaćanje i napomene</h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Način plaćanja
                  </span>
                  <select
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    IBAN
                  </span>
                  <input
                    value={iban}
                    onChange={(event) => setIban(event.target.value)}
                    placeholder="HR..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Odgovorna osoba
                  </span>
                  <input
                    value={responsiblePerson}
                    onChange={(event) =>
                      setResponsiblePerson(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Model
                  </span>
                  <input
                    value={paymentModel}
                    onChange={(event) =>
                      setPaymentModel(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2 md:col-span-1 xl:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Poziv na broj
                  </span>
                  <input
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Opis računa
                  </span>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Interna napomena
                  </span>
                  <textarea
                    rows={3}
                    value={internalNote}
                    onChange={(event) =>
                      setInternalNote(event.target.value)
                    }
                    className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 outline-none"
                  />
                </label>
              </div>
            </section>
          </main>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-5 shadow-xl">
              <h2 className="mb-4 font-black">Sažetak računa</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>Vrijednost stavki</span>
                  <strong className="text-slate-200">
                    {formatCurrency(totals.base)}
                  </strong>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between gap-3 text-orange-300">
                    <span>Popust</span>
                    <strong>
                      − {formatCurrency(totals.discount)}
                    </strong>
                  </div>
                )}
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>Osnovica</span>
                  <strong className="text-slate-200">
                    {formatCurrency(totals.net)}
                  </strong>
                </div>
                <div className="flex justify-between gap-3 text-slate-400">
                  <span>PDV</span>
                  <strong className="text-slate-200">
                    {formatCurrency(totals.vat)}
                  </strong>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <div className="text-xs font-black uppercase tracking-wider text-violet-300">
                  Ukupno za plaćanje
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-white">
                  {formatCurrency(totals.total)}
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => save('Izdano')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"
                >
                  <CheckCircle2 size={17} />
                  Izdaj račun
                </button>
                <button
                  type="button"
                  onClick={() => save('Nacrt')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200"
                >
                  <Save size={17} />
                  Spremi kao nacrt
                </button>
                <button
                  type="button"
                  onClick={preview}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300"
                >
                  <Eye size={17} />
                  Pregled PDF-a
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  )
}
