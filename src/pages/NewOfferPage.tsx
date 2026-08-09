import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  ImagePlus,
  Mail,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

import FersysLoader from '../components/FersysLoader'
import OfferTemplatesPanel from '../components/OfferTemplatesPanel'
import {
  createOffer,
  getOfferById,
  updateOffer,
} from '../services/offers.service'
import { getCustomers } from '../services/customers.service'
import {
  getCompanySettings,
  type CompanySettings,
} from '../services/companySettings.service'
import type { Customer } from '../types/customer'
import type {
  CustomerType,
  Offer,
  OfferHistoryItem,
  OfferItem,
} from '../types/offers'
import { openOfferPdf } from '../utils/offerPdf'
import type { OfferTemplate } from '../services/offerTemplates.service'

type CustomerSuggestion = {
  id: string
  name: string
  type: CustomerType
  oib: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
  contactPerson: string
}

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

const paymentTermOptions = [
  'Plaćanje po završetku radova.',
  '50% avansno, ostatak nakon završetka radova.',
  '40% avansno, ostatak nakon završetka radova.',
  '30% avansno, ostatak prema situacijama.',
  'Plaćanje u roku od 8 dana.',
  'Plaćanje u roku od 15 dana.',
  'Plaćanje u roku od 30 dana.',
]

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function createEmptyItem(): OfferItem {
  return {
    id: createId('item'),
    name: '',
    description: '',
    quantity: 1,
    unit: 'kom',
    price: 0,
    discount: 0,
    vat: 25,
    imageDataUrl: undefined,
    imageName: undefined,
  }
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Slika se nije mogla učitati.'))
    }

    reader.onerror = () => {
      reject(new Error('Slika se nije mogla učitati.'))
    }

    reader.readAsDataURL(file)
  })
}

function compressImage(
  imageDataUrl: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      let width = image.width
      let height = image.height

      const ratio = Math.min(
        maxWidth / width,
        maxHeight / height,
        1,
      )

      width = Math.round(width * ratio)
      height = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')

      if (!context) {
        reject(new Error('Slika se nije mogla obraditi.'))
        return
      }

      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    image.onerror = () => {
      reject(new Error('Slika se nije mogla obraditi.'))
    }

    image.src = imageDataUrl
  })
}

function calculateItemBase(item: OfferItem) {
  return item.quantity * item.price
}

function calculateItemDiscount(item: OfferItem) {
  return calculateItemBase(item) * (item.discount / 100)
}

function calculateItemNet(item: OfferItem) {
  return calculateItemBase(item) - calculateItemDiscount(item)
}

function calculateItemVat(item: OfferItem) {
  return calculateItemNet(item) * (item.vat / 100)
}

function calculateItemTotal(item: OfferItem) {
  return calculateItemNet(item) + calculateItemVat(item)
}

function mapCustomerType(customer: Customer): CustomerType {
  if (customer.type === 'company') {
    return 'Tvrtka'
  }

  if (customer.type === 'building') {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

function mapCustomer(customer: Customer): CustomerSuggestion {
  return {
    id: customer.id,
    name: customer.name,
    type: mapCustomerType(customer),
    oib: customer.oib,
    email: customer.email,
    phone: customer.phone,
    address: customer.street,
    postalCode: customer.postalCode,
    city: customer.city,
    contactPerson: customer.contactPerson ?? '',
  }
}

function getCustomerIcon(customerType: CustomerType) {
  if (customerType === 'Tvrtka') {
    return Building2
  }

  if (customerType === 'Zgrada') {
    return UsersRound
  }

  return UserRound
}

async function openOfferEmailDraft(
  offer: Offer,
  company: CompanySettings,
) {
  const recipient = offer.email.trim()

  if (!recipient) {
    window.alert(
      'Ponuda je spremljena, ali kupac nema unesenu e-mail adresu.',
    )
    return
  }

  const total = offer.items.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  )

  const formattedTotal = new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: company.currency || 'EUR',
  }).format(total)

  const formattedValidUntil = offer.validUntil
    ? new Date(`${offer.validUntil}T12:00:00`).toLocaleDateString(
        'hr-HR',
      )
    : 'nije navedeno'

  const companyName =
    company.name.trim() || 'Tvrtka'

  const subject =
    `Ponuda ${offer.offerNumber} – ${companyName}`

  const body = [
    `Poštovani/a ${offer.customerName},`,
    '',
    `dostavljamo Vam ponudu broj ${offer.offerNumber}.`,
    '',
    `Ponuda vrijedi do ${formattedValidUntil}.`,
    `Ukupan iznos ponude: ${formattedTotal}.`,
    '',
    'PDF ponude otvoren je u zasebnom prozoru. Spremite ga i dodajte kao privitak e-mailu.',
    '',
    'Za dodatne informacije stojimo Vam na raspolaganju.',
    '',
    'Lijep pozdrav,',
    companyName,
    company.phone ? `Telefon: ${company.phone}` : '',
    company.email ? `E-mail: ${company.email}` : '',
  ]
    .filter((line, index, lines) =>
      line !== '' || lines[index - 1] !== '',
    )
    .join('')

  openOfferPdf(offer)

  const mailtoUrl = `mailto:${encodeURIComponent(
    recipient,
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body,
  )}`

  window.setTimeout(() => {
    window.location.href = mailtoUrl
  }, 250)
}

export function NewOfferPage() {
  const navigate = useNavigate()
  const { offerId } = useParams<{ offerId: string }>()
  const [searchParams] = useSearchParams()

  const duplicateId = searchParams.get('duplicate')
  const today = getDateString(new Date())

  const [editingOffer, setEditingOffer] =
    useState<Offer | null>(null)
  const [duplicateSource, setDuplicateSource] =
    useState<Offer | null>(null)
  const [customers, setCustomers] =
    useState<CustomerSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null)

  const [offerNumber, setOfferNumber] = useState('Automatski')
  const [date, setDate] = useState(today)
  const [validUntil, setValidUntil] = useState(addDays(today, 30))
  const [customerId, setCustomerId] = useState('')
  const [customerType, setCustomerType] =
    useState<CustomerType>('Fizička osoba')
  const [customerName, setCustomerName] = useState('')
  const [oib, setOib] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('Slavonski Brod')
  const [description, setDescription] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [paymentTerms, setPaymentTerms] = useState(
    'Plaćanje po završetku radova.',
  )
  const [responsiblePerson, setResponsiblePerson] =
    useState('Borna Ferfolja')
  const [items, setItems] = useState<OfferItem[]>([
    createEmptyItem(),
  ])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerResults, setShowCustomerResults] =
    useState(false)
  const [showPaymentOptions, setShowPaymentOptions] =
    useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveMessage, setSaveMessage] = useState('')

  const isEditing = Boolean(editingOffer)
  const isDuplicating = Boolean(duplicateSource)

  function populateFromOffer(offer: Offer, duplicate: boolean) {
    setOfferNumber(duplicate ? 'Automatski' : offer.offerNumber)
    setDate(duplicate ? today : offer.date)
    setValidUntil(
      duplicate ? addDays(today, 30) : offer.validUntil,
    )
    setCustomerId(offer.customerId ?? '')
    setCustomerType(offer.customerType)
    setCustomerName(offer.customerName)
    setOib(offer.oib)
    setEmail(offer.email)
    setPhone(offer.phone)
    setAddress(offer.address)
    setPostalCode(offer.postalCode ?? '')
    setCity(offer.city)
    setDescription(offer.description)
    setInternalNote(offer.internalNote)
    setPaymentTerms(offer.paymentTerms)
    setResponsiblePerson(offer.responsiblePerson)
    setCustomerSearch(offer.customerName)
    setItems(
      offer.items.length > 0
        ? offer.items.map((item) => ({
            ...item,
            id: duplicate ? createId('item') : item.id,
          }))
        : [createEmptyItem()],
    )
  }

  function applyOfferTemplate(
    template: OfferTemplate,
  ) {
    setDescription(
      template.description,
    )

    setPaymentTerms(
      template.paymentTerms,
    )

    setItems(
      template.items.length > 0
        ? template.items.map(
            (item) => ({
              ...item,
              id: createId('item'),
              imageDataUrl:
                undefined,
              imageName:
                undefined,
            }),
          )
        : [createEmptyItem()],
    )

    setErrors(
      (current) => ({
        ...current,
        items: '',
      }),
    )
  }

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      try {
        setIsLoading(true)
        setLoadError('')

        const customerListPromise = getCustomers()
        const companySettingsPromise = getCompanySettings()
        const offerPromise = offerId
          ? getOfferById(offerId)
          : duplicateId
            ? getOfferById(duplicateId)
            : Promise.resolve(null)

        const [
          savedCustomers,
          loadedCompanySettings,
          loadedOffer,
        ] = await Promise.all([
          customerListPromise,
          companySettingsPromise,
          offerPromise,
        ])

        if (cancelled) {
          return
        }

        setCompanySettings(
          loadedCompanySettings,
        )

        if (!offerId && !duplicateId) {
          setValidUntil(
            addDays(
              today,
              loadedCompanySettings.defaultOfferValidityDays || 30,
            ),
          )

          setResponsiblePerson(
            loadedCompanySettings.name || 'Odgovorna osoba',
          )
        }

        setCustomers(
          savedCustomers
            .filter((customer) => customer.status === 'Aktivan')
            .map(mapCustomer),
        )

        if (offerId) {
          if (!loadedOffer) {
            throw new Error('Ponuda nije pronađena.')
          }

          setEditingOffer(loadedOffer)
          populateFromOffer(loadedOffer, false)
        } else if (duplicateId) {
          if (!loadedOffer) {
            throw new Error('Ponuda za dupliciranje nije pronađena.')
          }

          setDuplicateSource(loadedOffer)
          populateFromOffer(loadedOffer, true)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Ponudu nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [offerId, duplicateId])

  const customerSuggestions = customers

  const filteredCustomers = useMemo(() => {
    const query = customerSearch
      .trim()
      .toLocaleLowerCase('hr-HR')

    if (!query) {
      return customerSuggestions.slice(0, 8)
    }

    return customerSuggestions
      .filter((customer) =>
        [
          customer.name,
          customer.oib,
          customer.email,
          customer.phone,
          customer.address,
          customer.postalCode,
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
    field: keyof OfferItem,
    value: string | number,
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }


  async function handleItemImage(
    itemId: string,
    file: File | undefined,
  ) {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        items: 'Odabrana datoteka nije slika.',
      }))
      return
    }

    if (file.size > 12 * 1024 * 1024) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        items: 'Slika može imati najviše 12 MB.',
      }))
      return
    }

    try {
      const originalImage = await readImageFile(file)
      const compressedImage = await compressImage(originalImage)

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                imageDataUrl: compressedImage,
                imageName: file.name,
              }
            : item,
        ),
      )

      setErrors((currentErrors) => ({
        ...currentErrors,
        items: '',
      }))
    } catch {
      setErrors((currentErrors) => ({
        ...currentErrors,
        items: 'Slika se nije mogla učitati. Pokušaj ponovno.',
      }))
    }
  }

  function removeItemImage(itemId: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              imageDataUrl: undefined,
              imageName: undefined,
            }
          : item,
      ),
    )
  }

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyItem(),
    ])
  }

  function duplicateItem(itemId: string) {
    const sourceItem = items.find((item) => item.id === itemId)

    if (!sourceItem) {
      return
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        ...sourceItem,
        id: createId('item'),
      },
    ])
  }

  function removeItem(itemId: string) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return [createEmptyItem()]
      }

      return currentItems.filter((item) => item.id !== itemId)
    })
  }

  function selectCustomer(customer: CustomerSuggestion) {
    setCustomerId(customer.id)
    setPostalCode(customer.postalCode)
    setCustomerName(customer.name)
    setCustomerType(customer.type)
    setOib(customer.oib)
    setEmail(customer.email)
    setPhone(customer.phone)
    setAddress(customer.address)
    setCity(customer.city)
    setCustomerSearch(customer.name)
    setShowCustomerResults(false)
    setErrors((currentErrors) => ({
      ...currentErrors,
      customerName: '',
    }))
  }

  function clearSelectedCustomer() {
    setCustomerId('')
    setPostalCode('')
    setCustomerSearch('')
    setCustomerName('')
    setCustomerType('Fizička osoba')
    setOib('')
    setEmail('')
    setPhone('')
    setAddress('')
    setCity('Slavonski Brod')
  }


  function validateOffer() {
    const nextErrors: Record<string, string> = {}

    if (!date) {
      nextErrors.date = 'Odaberi datum ponude.'
    }

    if (!validUntil) {
      nextErrors.validUntil = 'Odaberi rok valjanosti.'
    }

    if (!customerName.trim()) {
      nextErrors.customerName = 'Unesi ili odaberi kupca.'
    }

    if (
      items.length === 0 ||
      items.every((item) => !item.name.trim())
    ) {
      nextErrors.items = 'Dodaj barem jednu stavku ponude.'
    }

    const invalidItem = items.find(
      (item) =>
        item.name.trim() &&
        (item.quantity <= 0 ||
          item.price < 0 ||
          item.discount < 0 ||
          item.discount > 100 ||
          item.vat < 0 ||
          item.vat > 100),
    )

    if (invalidItem) {
      nextErrors.items =
        'Provjeri količinu, cijenu, popust i PDV stavki.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function getCleanItems(): OfferItem[] {
    return items
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
  }

  function openPdfPreview() {
    setSaveMessage('')

    if (!validateOffer()) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    if (!companySettings) {
      setErrors((current) => ({
        ...current,
        save:
          'Podaci tvrtke nisu učitani. Osvježi stranicu i pokušaj ponovno.',
      }))
      return
    }

    const now = new Date().toISOString()

    openOfferPdf({
      id: editingOffer?.id ?? 'preview',
      offerNumber:
        editingOffer?.offerNumber ?? 'P-AUTOMATSKI',
      customerName: customerName.trim(),
      customerType,
      oib: oib.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      date,
      validUntil,
      status: editingOffer?.status ?? 'Nacrt',
      responsiblePerson: responsiblePerson.trim(),
      description: description.trim(),
      internalNote: internalNote.trim(),
      paymentTerms: paymentTerms.trim(),
      items: getCleanItems(),
      createdAt: editingOffer?.createdAt ?? now,
      updatedAt: now,
      version: editingOffer?.version ?? 1,
    })
  }

  async function saveOffer(status: 'Nacrt' | 'Poslano') {
    setSaveMessage('')

    if (isSaving) {
      return
    }

    if (!validateOffer()) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    if (!companySettings) {
      setErrors((current) => ({
        ...current,
        save:
          'Podaci tvrtke nisu učitani. Osvježi stranicu i pokušaj ponovno.',
      }))
      return
    }

    try {
      setIsSaving(true)

      const historyItem: OfferHistoryItem = {
        id: createId('history'),
        date: new Date().toISOString(),
        title: isEditing
          ? 'Ponuda uređena'
          : status === 'Poslano'
            ? 'Ponuda izrađena i označena kao poslana'
            : isDuplicating
              ? 'Ponuda duplicirana'
              : 'Ponuda izrađena',
        description: isEditing
          ? `Ponuda je uređena i spremljena sa statusom „${status}”.`
          : status === 'Poslano'
            ? 'Nova ponuda spremljena je sa statusom „Poslano”.'
            : isDuplicating
              ? `Nova ponuda izrađena je prema ponudi ${duplicateSource?.offerNumber ?? ''}.`
              : 'Nova ponuda spremljena je kao nacrt.',
      }

      const payload = {
        customer: {
          id: customerId || undefined,
          name: customerName.trim(),
          type: customerType,
          oib: oib.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          postalCode: postalCode.trim() || undefined,
          city: city.trim(),
        },
        date,
        validUntil,
        status,
        responsiblePerson: responsiblePerson.trim(),
        description: description.trim(),
        internalNote: internalNote.trim(),
        paymentTerms: paymentTerms.trim(),
        items: getCleanItems(),
        version: isEditing
          ? (editingOffer?.version ?? 1) + 1
          : 1,
        history: [
          ...(editingOffer?.history ?? []),
          historyItem,
        ],
      }

      const savedOffer = isEditing && editingOffer
        ? await updateOffer(editingOffer.id, payload)
        : await createOffer(payload)

      setOfferNumber(savedOffer.offerNumber)
      setSaveMessage(
        isEditing
          ? 'Promjene ponude su spremljene.'
          : status === 'Poslano'
            ? 'Ponuda je spremljena i pripremljena za slanje.'
            : 'Ponuda je spremljena kao nacrt.',
      )

      if (status === 'Poslano') {
        void openOfferEmailDraft(
          savedOffer,
          companySettings,
        )
      }

      window.setTimeout(() => {
        navigate('/offers')
      }, status === 'Poslano' ? 1200 : 650)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        save:
          error instanceof Error
            ? error.message
            : 'Ponudu nije moguće spremiti.',
      }))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <FersysLoader text="Učitavanje ponude..." />
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black text-white">
            Ponudu nije moguće otvoriti
          </h1>
          <p className="mt-3 break-words text-sm text-red-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => navigate('/offers')}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
          >
            Povratak na ponude
          </button>
        </div>
      </section>
    )
  }
  return (
    <section className="mx-auto w-full max-w-[1800px] pb-12">
      <div className="sticky top-0 z-30 -mx-3 border-b border-slate-800 bg-slate-950/90 px-3 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              aria-label="Natrag"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                Ponude
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="truncate text-xl font-black text-white sm:text-2xl">
                  {isEditing
                    ? 'Uredi ponudu'
                    : isDuplicating
                      ? 'Duplicirana ponuda'
                      : 'Nova ponuda'}
                </h1>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-400">
                  {offerNumber}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPdfPreview}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <FileText size={17} />
              PDF pregled
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveOffer('Nacrt')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20"
            >
              <Save size={17} />
              {isEditing ? 'Spremi promjene' : 'Spremi nacrt'}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveOffer('Poslano')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.01]"
            >
              <Send size={17} />
              {isEditing
                ? 'Spremi kao poslano'
                : 'Spremi i pošalji'}
            </button>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
          <Check size={18} />
          {saveMessage}
        </div>
      )}

      {errors.save && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
          {errors.save}
        </div>
      )}

      <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/5 lg:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">
                  Osnovni podaci
                </p>

                <h2 className="mt-1 text-xl font-black text-white">
                  Podaci ponude
                </h2>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-500">
                <CalendarDays size={16} />
                Rok valjanosti automatski je 30 dana
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Broj ponude
                </label>

                <input
                  type="text"
                  value={offerNumber}
                  readOnly
                  title="Broj se automatski dodjeljuje pri spremanju"
                  className={`w-full rounded-xl border bg-slate-950 px-3.5 py-3 text-sm font-bold text-white outline-none transition ${
                    errors.offerNumber
                      ? 'border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />

                {errors.offerNumber && (
                  <p className="mt-2 text-xs font-semibold text-red-400">
                    {errors.offerNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Datum ponude
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) => {
                    const nextDate = event.target.value
                    setDate(nextDate)
                    setValidUntil(addDays(nextDate, 30))
                  }}
                  className={`w-full rounded-xl border bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition ${
                    errors.date
                      ? 'border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Vrijedi do
                </label>

                <input
                  type="date"
                  value={validUntil}
                  min={date}
                  onChange={(event) =>
                    setValidUntil(event.target.value)
                  }
                  className={`w-full rounded-xl border bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition ${
                    errors.validUntil
                      ? 'border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Odgovorna osoba
                </label>

                <input
                  type="text"
                  value={responsiblePerson}
                  onChange={(event) =>
                    setResponsiblePerson(event.target.value)
                  }
                  placeholder="Ime odgovorne osobe"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/5 lg:p-6">
            <div className="border-b border-slate-800 pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                Kupac
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Podaci kupca
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Pretraži postojećeg kupca ili ručno unesi novog.
              </p>
            </div>

            <div className="relative mt-5">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={customerSearch}
                onFocus={() => setShowCustomerResults(true)}
                onChange={(event) => {
                  setCustomerSearch(event.target.value)
                  setShowCustomerResults(true)
                }}
                placeholder="Pretraži kupca po nazivu, OIB-u, e-mailu ili adresi..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
              />

              {customerSearch && (
                <button
                  type="button"
                  onClick={clearSelectedCustomer}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  <X size={17} />
                </button>
              )}

              {showCustomerResults &&
                filteredCustomers.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 max-h-80 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/50">
                    {filteredCustomers.map((customer) => {
                      const CustomerIcon = getCustomerIcon(
                        customer.type,
                      )

                      return (
                        <button
                          key={`${customer.name}-${customer.oib}-${customer.email}`}
                          type="button"
                          onClick={() =>
                            selectCustomer(customer)
                          }
                          className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                        >
                          <div className="mt-0.5 rounded-xl bg-violet-500/15 p-2 text-violet-300">
                            <CustomerIcon size={18} />
                          </div>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">
                              {customer.name}
                            </span>

                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {customer.type}
                              {customer.oib
                                ? ` · OIB ${customer.oib}`
                                : ''}
                              {customer.city
                                ? ` · ${customer.city}`
                                : ''}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
            </div>

            {errors.customerName && (
              <p className="mt-2 text-xs font-semibold text-red-400">
                {errors.customerName}
              </p>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Vrsta kupca
                </label>

                <select
                  value={customerType}
                  onChange={(event) =>
                    setCustomerType(
                      event.target.value as CustomerType,
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-violet-500"
                >
                  <option value="Fizička osoba">
                    Fizička osoba
                  </option>
                  <option value="Tvrtka">Tvrtka</option>
                  <option value="Zgrada">Zgrada</option>
                </select>
              </div>

              <div className="xl:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Naziv / ime i prezime *
                </label>

                <input
                  type="text"
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(event.target.value)
                  }
                  placeholder="Unesi naziv kupca"
                  className={`w-full rounded-xl border bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 ${
                    errors.customerName
                      ? 'border-red-500'
                      : 'border-slate-700 focus:border-violet-500'
                  }`}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  OIB
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={oib}
                  onChange={(event) =>
                    setOib(
                      event.target.value.replace(/\D/g, ''),
                    )
                  }
                  placeholder="11 znamenki"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Telefon
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="+385..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  E-mail
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="kupac@email.hr"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Adresa
                </label>

                <input
                  type="text"
                  value={address}
                  onChange={(event) =>
                    setAddress(event.target.value)
                  }
                  placeholder="Ulica i kućni broj"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Grad
                </label>

                <input
                  type="text"
                  value={city}
                  onChange={(event) =>
                    setCity(event.target.value)
                  }
                  placeholder="Grad"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          <OfferTemplatesPanel
            description={
              description
            }
            paymentTerms={
              paymentTerms
            }
            items={items}
            onApply={
              applyOfferTemplate
            }
          />

          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/5">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
                  Troškovnik
                </p>

                <h2 className="mt-1 text-xl font-black text-white">
                  Stavke ponude
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Dodaj materijal, usluge, količine, popust, PDV
                  i po potrebi sliku proizvoda.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
              >
                <Plus size={18} />
                Dodaj stavku
              </button>
            </div>

            {errors.items && (
              <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 lg:px-6">
                {errors.items}
              </div>
            )}

            <div className="space-y-4 p-4 lg:p-6">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-slate-300">
                        {index + 1}
                      </span>

                      <p className="text-sm font-bold text-slate-300">
                        Stavka ponude
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          duplicateItem(item.id)
                        }
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
                      >
                        Dupliciraj
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 text-red-400 transition hover:bg-red-500/10"
                        aria-label="Obriši stavku"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-300">
                            Slika proizvoda ili materijala
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Nije obavezna. Ako je dodaš, prikazat će se uz ovu stavku i kasnije u PDF ponudi.
                          </p>
                        </div>

                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-200 transition hover:bg-blue-500/20">
                          <ImagePlus size={17} />
                          {item.imageDataUrl
                            ? 'Promijeni sliku'
                            : 'Dodaj sliku'}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(event) => {
                              void handleItemImage(
                                item.id,
                                event.target.files?.[0],
                              )
                              event.currentTarget.value = ''
                            }}
                          />
                        </label>
                      </div>

                      {item.imageName && (
                        <p className="mt-3 truncate text-xs font-semibold text-slate-500">
                          {item.imageName}
                        </p>
                      )}
                    </div>

                    {item.imageDataUrl ? (
                      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                        <img
                          src={item.imageDataUrl}
                          alt={
                            item.name
                              ? `Slika stavke ${item.name}`
                              : `Slika stavke ${index + 1}`
                          }
                          className="h-44 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removeItemImage(item.id)}
                          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/30 bg-slate-950/85 text-red-300 shadow-lg backdrop-blur transition hover:bg-red-500 hover:text-white"
                          aria-label="Obriši sliku stavke"
                          title="Obriši sliku"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 text-center">
                        <div className="px-4">
                          <ImagePlus
                            size={28}
                            className="mx-auto text-slate-700"
                          />
                          <p className="mt-2 text-xs font-semibold text-slate-600">
                            Slika nije dodana
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Naziv stavke *
                      </label>

                      <input
                        type="text"
                        value={item.name}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'name',
                            event.target.value,
                          )
                        }
                        placeholder="Npr. Montaža klima uređaja"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Opis
                      </label>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'description',
                            event.target.value,
                          )
                        }
                        placeholder="Dodatni opis stavke"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Količina
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'quantity',
                            Number(event.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Jedinica
                      </label>

                      <select
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'unit',
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                      >
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Cijena bez PDV-a
                      </label>

                      <div className="relative">
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
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-emerald-500"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          €
                        </span>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Popust
                      </label>

                      <div className="relative">
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
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 pr-9 text-sm text-white outline-none transition focus:border-emerald-500"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        PDV
                      </label>

                      <select
                        value={item.vat}
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            'vat',
                            Number(event.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={13}>13%</option>
                        <option value={25}>25%</option>
                      </select>
                    </div>

                    <div className="lg:col-span-5">
                      <label className="mb-2 block text-xs font-bold text-slate-500">
                        Ukupno stavke
                      </label>

                      <div className="flex min-h-[42px] items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4">
                        <span className="text-xs font-semibold text-emerald-400">
                          S PDV-om
                        </span>

                        <span className="font-black text-emerald-200">
                          {formatCurrency(
                            calculateItemTotal(item),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-4 text-sm font-bold text-slate-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-300"
              >
                <Plus size={18} />
                Dodaj novu stavku
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/5 lg:p-6">
            <div className="border-b border-slate-800 pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                Dodatno
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                Opis i uvjeti
              </h2>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Opis ponude
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={5}
                  placeholder="Kratko opiši predmet ponude i radove..."
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Interna napomena
                </label>

                <textarea
                  value={internalNote}
                  onChange={(event) =>
                    setInternalNote(event.target.value)
                  }
                  rows={5}
                  placeholder="Napomena je vidljiva samo djelatnicima..."
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="relative mt-5">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Uvjeti plaćanja
              </label>

              <div className="relative">
                <textarea
                  value={paymentTerms}
                  onChange={(event) =>
                    setPaymentTerms(event.target.value)
                  }
                  rows={3}
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 pr-12 text-sm leading-6 text-white outline-none transition focus:border-amber-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPaymentOptions(
                      (current) => !current,
                    )
                  }
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition hover:text-white"
                  aria-label="Predlošci uvjeta plaćanja"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {showPaymentOptions && (
                <div className="absolute right-0 top-full z-20 mt-2 w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/50">
                  {paymentTermOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setPaymentTerms(option)
                        setShowPaymentOptions(false)
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 2xl:sticky 2xl:top-24 2xl:self-start">
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/10">
            <div className="border-b border-slate-800 bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300">
                  <CircleDollarSign size={21} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
                    Sažetak
                  </p>

                  <h2 className="mt-1 font-black text-white">
                    Ukupno ponude
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Vrijednost stavki
                </span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(totals.base)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Popust
                </span>
                <span className="font-bold text-orange-300">
                  − {formatCurrency(totals.discount)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-4 text-sm">
                <span className="text-slate-400">
                  Osnovica
                </span>
                <span className="font-black text-white">
                  {formatCurrency(totals.net)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">PDV</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(totals.vat)}
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Ukupno s PDV-om
                </p>

                <p className="mt-2 break-words text-3xl font-black tracking-tight text-emerald-200">
                  {formatCurrency(totals.total)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300">
                <FileText size={19} />
              </div>

              <div>
                <h3 className="font-black text-white">
                  Pregled ponude
                </h3>

                <p className="text-xs text-slate-500">
                  Podaci prije spremanja
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Kupac
                </dt>
                <dd className="mt-1 font-bold text-slate-200">
                  {customerName || 'Nije odabran'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Broj ponude
                </dt>
                <dd className="mt-1 font-bold text-slate-200">
                  {offerNumber}
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Datum
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-300">
                    {date}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Vrijedi do
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-300">
                    {validUntil}
                  </dd>
                </div>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Broj stavki
                </dt>
                <dd className="mt-1 font-bold text-slate-200">
                  {
                    items.filter((item) =>
                      item.name.trim(),
                    ).length
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Odgovorna osoba
                </dt>
                <dd className="mt-1 font-bold text-slate-200">
                  {responsiblePerson}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <div className="flex items-start gap-3">
              <Mail
                size={20}
                className="mt-0.5 shrink-0 text-blue-300"
              />

              <div>
                <h3 className="font-black text-blue-100">
                  Slanje ponude
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-200/70">
                  Gumb „Spremi i pošalji” trenutačno sprema
                  ponudu sa statusom Poslano. Pravo slanje PDF-a
                  e-mailom povezujemo nakon izrade PDF predloška.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}