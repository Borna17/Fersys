import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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
  CircleDollarSign,
  FileText,
  ImagePlus,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

import DraftAutosaveBadge, {
  type DraftAutosaveState,
} from '../components/DraftAutosaveBadge'
import FersysLoader from '../components/FersysLoader'
import OfferTemplatesPanel from '../components/OfferTemplatesPanel'
import { getCustomers } from '../services/customers.service'
import {
  getCompanySettings,
  type CompanySettings,
} from '../services/companySettings.service'
import {
  deleteUserDraft,
  formatDraftSavedAt,
  loadUserDraft,
  saveUserDraft,
} from '../services/drafts.service'
import type { OfferTemplate } from '../services/offerTemplates.service'
import {
  createOffer,
  getOfferById,
  updateOffer,
} from '../services/offers.service'
import type { Customer } from '../types/customer'
import type {
  CustomerType,
  Offer,
  OfferHistoryItem,
  OfferItem,
} from '../types/offers'
import { openOfferPdf } from '../utils/offerPdf'

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

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

function getDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(
  dateString: string,
  days: number,
) {
  const date = new Date(
    `${dateString}T12:00:00`,
  )
  date.setDate(
    date.getDate() + days,
  )

  return getDateString(date)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
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

function readImageFile(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader()

      reader.onload = () => {
        if (
          typeof reader.result ===
          'string'
        ) {
          resolve(reader.result)
          return
        }

        reject(
          new Error(
            'Slika se nije mogla učitati.',
          ),
        )
      }

      reader.onerror = () => {
        reject(
          new Error(
            'Slika se nije mogla učitati.',
          ),
        )
      }

      reader.readAsDataURL(file)
    },
  )
}

function compressImage(
  imageDataUrl: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image()

      image.onload = () => {
        let width =
          image.width
        let height =
          image.height

        const ratio =
          Math.min(
            maxWidth / width,
            maxHeight / height,
            1,
          )

        width =
          Math.round(
            width * ratio,
          )

        height =
          Math.round(
            height * ratio,
          )

        const canvas =
          document.createElement(
            'canvas',
          )

        canvas.width = width
        canvas.height = height

        const context =
          canvas.getContext('2d')

        if (!context) {
          reject(
            new Error(
              'Slika se nije mogla obraditi.',
            ),
          )
          return
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height,
        )

        resolve(
          canvas.toDataURL(
            'image/jpeg',
            quality,
          ),
        )
      }

      image.onerror = () => {
        reject(
          new Error(
            'Slika se nije mogla obraditi.',
          ),
        )
      }

      image.src =
        imageDataUrl
    },
  )
}

function calculateItemBase(
  item: OfferItem,
) {
  return (
    item.quantity * item.price
  )
}

function calculateItemDiscount(
  item: OfferItem,
) {
  return (
    calculateItemBase(item) *
    (item.discount / 100)
  )
}

function calculateItemNet(
  item: OfferItem,
) {
  return (
    calculateItemBase(item) -
    calculateItemDiscount(item)
  )
}

function calculateItemVat(
  item: OfferItem,
) {
  return (
    calculateItemNet(item) *
    (item.vat / 100)
  )
}

function calculateItemTotal(
  item: OfferItem,
) {
  return (
    calculateItemNet(item) +
    calculateItemVat(item)
  )
}

function mapCustomerType(
  customer: Customer,
): CustomerType {
  if (
    customer.type === 'company'
  ) {
    return 'Tvrtka'
  }

  if (
    customer.type === 'building'
  ) {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

function mapCustomer(
  customer: Customer,
): CustomerSuggestion {
  return {
    id: customer.id,
    name: customer.name,
    type:
      mapCustomerType(customer),
    oib: customer.oib,
    email: customer.email,
    phone: customer.phone,
    address: customer.street,
    postalCode:
      customer.postalCode,
    city: customer.city,
    contactPerson:
      customer.contactPerson ??
      '',
  }
}

function getCustomerIcon(
  customerType: CustomerType,
) {
  if (
    customerType === 'Tvrtka'
  ) {
    return Building2
  }

  if (
    customerType === 'Zgrada'
  ) {
    return UsersRound
  }

  return UserRound
}

async function openOfferEmailDraft(
  offer: Offer,
  company: CompanySettings,
) {
  const recipient =
    offer.email.trim()

  if (!recipient) {
    window.alert(
      'Ponuda je spremljena, ali investitor nema unesenu e-mail adresu.',
    )
    return
  }

  const total =
    offer.items.reduce(
      (sum, item) =>
        sum +
        calculateItemTotal(
          item,
        ),
      0,
    )

  const formattedTotal =
    new Intl.NumberFormat(
      'hr-HR',
      {
        style: 'currency',
        currency:
          company.currency ||
          'EUR',
      },
    ).format(total)

  const formattedValidUntil =
    offer.validUntil
      ? new Date(
          `${offer.validUntil}T12:00:00`,
        ).toLocaleDateString(
          'hr-HR',
        )
      : 'nije navedeno'

  const companyName =
    company.name.trim() ||
    'Tvrtka'

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
    company.phone
      ? `Telefon: ${company.phone}`
      : '',
    company.email
      ? `E-mail: ${company.email}`
      : '',
  ]
    .filter(
      (
        line,
        index,
        lines,
      ) =>
        line !== '' ||
        lines[index - 1] !== '',
    )
    .join('\n')

  openOfferPdf(offer)

  const mailtoUrl =
    `mailto:${encodeURIComponent(
      recipient,
    )}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(
      body,
    )}`

  window.setTimeout(() => {
    window.location.href =
      mailtoUrl
  }, 250)
}

export function NewOfferPage() {
  const navigate =
    useNavigate()

  const { offerId } =
    useParams<{
      offerId: string
    }>()

  const [searchParams] =
    useSearchParams()

  const duplicateId =
    searchParams.get(
      'duplicate',
    )

  const today =
    getDateString(new Date())

  const [
    autosaveState,
    setAutosaveState,
  ] =
    useState<DraftAutosaveState>(
      'idle',
    )

  const [
    autosaveText,
    setAutosaveText,
  ] =
    useState('')

  const [
    draftReady,
    setDraftReady,
  ] =
    useState(false)

  const [
    editingOffer,
    setEditingOffer,
  ] =
    useState<Offer | null>(
      null,
    )

  const [
    duplicateSource,
    setDuplicateSource,
  ] =
    useState<Offer | null>(
      null,
    )

  const [
    customers,
    setCustomers,
  ] =
    useState<
      CustomerSuggestion[]
    >([])

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false)

  const [
    loadError,
    setLoadError,
  ] =
    useState('')

  const [
    companySettings,
    setCompanySettings,
  ] =
    useState<CompanySettings | null>(
      null,
    )

  const [
    offerNumber,
    setOfferNumber,
  ] =
    useState('Automatski')

  const [
    date,
    setDate,
  ] =
    useState(today)

  const [
    validUntil,
    setValidUntil,
  ] =
    useState(
      addDays(today, 30),
    )

  const [
    customerId,
    setCustomerId,
  ] =
    useState('')

  const [
    customerType,
    setCustomerType,
  ] =
    useState<CustomerType>(
      'Fizička osoba',
    )

  const [
    customerName,
    setCustomerName,
  ] =
    useState('')

  const [oib, setOib] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [phone, setPhone] =
    useState('')

  const [
    address,
    setAddress,
  ] =
    useState('')

  const [
    postalCode,
    setPostalCode,
  ] =
    useState('')

  const [city, setCity] =
    useState(
      'Slavonski Brod',
    )

  const [
    description,
    setDescription,
  ] =
    useState('')

  const [
    internalNote,
    setInternalNote,
  ] =
    useState('')

  const [
    paymentTerms,
    setPaymentTerms,
  ] =
    useState(
      'Plaćanje po završetku radova.',
    )

  const [
    responsiblePerson,
    setResponsiblePerson,
  ] =
    useState(
      'Borna Ferfolja',
    )

  const [
    items,
    setItems,
  ] =
    useState<OfferItem[]>([
      createEmptyItem(),
    ])

  const [
    customerSearch,
    setCustomerSearch,
  ] =
    useState('')

  const [
    showCustomerResults,
    setShowCustomerResults,
  ] =
    useState(false)

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<string, string>
    >({})

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState('')

  const isEditing =
    Boolean(editingOffer)

  const isDuplicating =
    Boolean(
      duplicateSource,
    )

  function populateFromOffer(
    offer: Offer,
    duplicate: boolean,
  ) {
    setOfferNumber(
      duplicate
        ? 'Automatski'
        : offer.offerNumber,
    )

    setDate(
      duplicate
        ? today
        : offer.date,
    )

    setValidUntil(
      duplicate
        ? addDays(today, 30)
        : offer.validUntil,
    )

    setCustomerId(
      offer.customerId ?? '',
    )
    setCustomerType(
      offer.customerType,
    )
    setCustomerName(
      offer.customerName,
    )
    setOib(offer.oib)
    setEmail(offer.email)
    setPhone(offer.phone)
    setAddress(
      offer.address,
    )
    setPostalCode(
      offer.postalCode ?? '',
    )
    setCity(offer.city)
    setDescription(
      offer.description,
    )
    setInternalNote(
      offer.internalNote,
    )
    setPaymentTerms(
      offer.paymentTerms,
    )
    setResponsiblePerson(
      offer.responsiblePerson,
    )
    setCustomerSearch(
      offer.customerName,
    )

    setItems(
      offer.items.length > 0
        ? offer.items.map(
            (item) => ({
              ...item,
              id: duplicate
                ? createId(
                    'item',
                  )
                : item.id,
            }),
          )
        : [
            createEmptyItem(),
          ],
    )
  }

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      try {
        setIsLoading(true)
        setLoadError('')

        const [
          savedCustomers,
          loadedCompanySettings,
          loadedOffer,
        ] =
          await Promise.all([
            getCustomers(),
            getCompanySettings(),
            offerId
              ? getOfferById(
                  offerId,
                )
              : duplicateId
                ? getOfferById(
                    duplicateId,
                  )
                : Promise.resolve(
                    null,
                  ),
          ])

        if (cancelled) {
          return
        }

        setCompanySettings(
          loadedCompanySettings,
        )

        if (
          !offerId &&
          !duplicateId
        ) {
          setValidUntil(
            addDays(
              today,
              loadedCompanySettings
                .defaultOfferValidityDays ||
                30,
            ),
          )

          setResponsiblePerson(
            loadedCompanySettings
              .name ||
              'Odgovorna osoba',
          )
        }

        setCustomers(
          savedCustomers
            .filter(
              (customer) =>
                customer.status ===
                'Aktivan',
            )
            .map(mapCustomer),
        )

        if (offerId) {
          if (!loadedOffer) {
            throw new Error(
              'Ponuda nije pronađena.',
            )
          }

          setEditingOffer(
            loadedOffer,
          )
          populateFromOffer(
            loadedOffer,
            false,
          )
        } else if (
          duplicateId
        ) {
          if (!loadedOffer) {
            throw new Error(
              'Ponuda za dupliciranje nije pronađena.',
            )
          }

          setDuplicateSource(
            loadedOffer,
          )
          populateFromOffer(
            loadedOffer,
            true,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof
              Error
              ? error.message
              : 'Ponudu nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [
    offerId,
    duplicateId,
  ])

  useEffect(() => {
    if (
      offerId ||
      duplicateId
    ) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'offer',
            'new',
          )

        if (
          cancelled ||
          !draft
        ) {
          return
        }

        const value =
          draft.payload ?? {}

        setDate(
          value.date ?? date,
        )
        setValidUntil(
          value.validUntil ??
            validUntil,
        )
        setCustomerId(
          value.customerId ??
            '',
        )
        setCustomerType(
          value.customerType ??
            'Fizička osoba',
        )
        setCustomerName(
          value.customerName ??
            '',
        )
        setOib(
          value.oib ?? '',
        )
        setEmail(
          value.email ?? '',
        )
        setPhone(
          value.phone ?? '',
        )
        setAddress(
          value.address ?? '',
        )
        setPostalCode(
          value.postalCode ??
            '',
        )
        setCity(
          value.city ??
            'Slavonski Brod',
        )
        setDescription(
          value.description ??
            '',
        )
        setInternalNote(
          value.internalNote ??
            '',
        )
        setPaymentTerms(
          value.paymentTerms ??
            'Plaćanje po završetku radova.',
        )
        setResponsiblePerson(
          value.responsiblePerson ??
            responsiblePerson,
        )
        setItems(
          Array.isArray(
            value.items,
          ) &&
            value.items.length
            ? value.items
            : [
                createEmptyItem(),
              ],
        )
        setCustomerSearch(
          value.customerSearch ??
            value.customerName ??
            '',
        )

        setAutosaveState(
          'restored',
        )

        setAutosaveText(
          `Nastavljena nedovršena ponuda · ${formatDraftSavedAt(
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
  }, [
    offerId,
    duplicateId,
  ])

  useEffect(() => {
    if (
      !draftReady ||
      offerId ||
      duplicateId
    ) {
      return
    }

    const hasContent =
      Boolean(
        customerName.trim() ||
          description.trim() ||
          items.some(
            (item) =>
              item.name.trim(),
          ),
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(
        () => {
          void (async () => {
            try {
              setAutosaveState(
                'saving',
              )

              const savedAt =
                await saveUserDraft(
                  'offer',
                  'new',
                  {
                    date,
                    validUntil,
                    customerId,
                    customerType,
                    customerName,
                    oib,
                    email,
                    phone,
                    address,
                    postalCode,
                    city,
                    description,
                    internalNote,
                    paymentTerms,
                    responsiblePerson,
                    items,
                    customerSearch,
                  },
                )

              setAutosaveState(
                navigator.onLine
                  ? 'saved'
                  : 'offline',
              )

              setAutosaveText(
                formatDraftSavedAt(
                  savedAt,
                ),
              )
            } catch {
              setAutosaveState(
                'offline',
              )
              setAutosaveText(
                'Nacrt je spremljen lokalno.',
              )
            }
          })()
        },
        1200,
      )

    return () => {
      window.clearTimeout(
        timer,
      )
    }
  }, [
    draftReady,
    offerId,
    duplicateId,
    date,
    validUntil,
    customerId,
    customerType,
    customerName,
    oib,
    email,
    phone,
    address,
    postalCode,
    city,
    description,
    internalNote,
    paymentTerms,
    responsiblePerson,
    items,
    customerSearch,
  ])

  async function discardOfferDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršenu ponudu?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'offer',
      'new',
    )

    window.location.reload()
  }

  const filteredCustomers =
    useMemo(() => {
      const query =
        customerSearch
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      if (!query) {
        return customers.slice(
          0,
          8,
        )
      }

      return customers
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
            .toLocaleLowerCase(
              'hr-HR',
            )
            .includes(query),
        )
        .slice(0, 8)
    }, [
      customerSearch,
      customers,
    ])

  const totals =
    useMemo(() => {
      const base =
        items.reduce(
          (sum, item) =>
            sum +
            calculateItemBase(
              item,
            ),
          0,
        )

      const discount =
        items.reduce(
          (sum, item) =>
            sum +
            calculateItemDiscount(
              item,
            ),
          0,
        )

      const net =
        items.reduce(
          (sum, item) =>
            sum +
            calculateItemNet(
              item,
            ),
          0,
        )

      const vat =
        items.reduce(
          (sum, item) =>
            sum +
            calculateItemVat(
              item,
            ),
          0,
        )

      return {
        base,
        discount,
        net,
        vat,
        total:
          net + vat,
      }
    }, [items])

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
              id: createId(
                'item',
              ),
              imageDataUrl:
                undefined,
              imageName:
                undefined,
            }),
          )
        : [
            createEmptyItem(),
          ],
    )

    setErrors(
      (current) => ({
        ...current,
        items: '',
      }),
    )
  }

  function updateItem(
    itemId: string,
    field: keyof OfferItem,
    value: string | number,
  ) {
    setItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
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

    if (
      !file.type.startsWith(
        'image/',
      )
    ) {
      setErrors(
        (current) => ({
          ...current,
          items:
            'Odabrana datoteka nije slika.',
        }),
      )
      return
    }

    if (
      file.size >
      12 * 1024 * 1024
    ) {
      setErrors(
        (current) => ({
          ...current,
          items:
            'Slika može imati najviše 12 MB.',
        }),
      )
      return
    }

    try {
      const original =
        await readImageFile(
          file,
        )

      const compressed =
        await compressImage(
          original,
        )

      setItems(
        (currentItems) =>
          currentItems.map(
            (item) =>
              item.id ===
              itemId
                ? {
                    ...item,
                    imageDataUrl:
                      compressed,
                    imageName:
                      file.name,
                  }
                : item,
          ),
      )

      setErrors(
        (current) => ({
          ...current,
          items: '',
        }),
      )
    } catch {
      setErrors(
        (current) => ({
          ...current,
          items:
            'Slika se nije mogla učitati. Pokušaj ponovno.',
        }),
      )
    }
  }

  function removeItemImage(
    itemId: string,
  ) {
    setItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  imageDataUrl:
                    undefined,
                  imageName:
                    undefined,
                }
              : item,
        ),
    )
  }

  function addItem() {
    setItems(
      (current) => [
        ...current,
        createEmptyItem(),
      ],
    )
  }

  function duplicateItem(
    itemId: string,
  ) {
    const source =
      items.find(
        (item) =>
          item.id === itemId,
      )

    if (!source) {
      return
    }

    setItems(
      (current) => [
        ...current,
        {
          ...source,
          id: createId('item'),
        },
      ],
    )
  }

  function removeItem(
    itemId: string,
  ) {
    setItems(
      (current) => {
        if (
          current.length === 1
        ) {
          return [
            createEmptyItem(),
          ]
        }

        return current.filter(
          (item) =>
            item.id !== itemId,
        )
      },
    )
  }

  function selectCustomer(
    customer: CustomerSuggestion,
  ) {
    setCustomerId(
      customer.id,
    )
    setPostalCode(
      customer.postalCode,
    )
    setCustomerName(
      customer.name,
    )
    setCustomerType(
      customer.type,
    )
    setOib(customer.oib)
    setEmail(customer.email)
    setPhone(customer.phone)
    setAddress(
      customer.address,
    )
    setCity(customer.city)
    setCustomerSearch(
      customer.name,
    )
    setShowCustomerResults(
      false,
    )

    setErrors(
      (current) => ({
        ...current,
        customerName: '',
      }),
    )
  }

  function clearSelectedCustomer() {
    setCustomerId('')
    setPostalCode('')
    setCustomerSearch('')
    setCustomerName('')
    setCustomerType(
      'Fizička osoba',
    )
    setOib('')
    setEmail('')
    setPhone('')
    setAddress('')
    setCity(
      'Slavonski Brod',
    )
  }

  function validateOffer() {
    const nextErrors:
      Record<string, string> =
        {}

    if (!date) {
      nextErrors.date =
        'Odaberi datum ponude.'
    }

    if (!validUntil) {
      nextErrors.validUntil =
        'Odaberi rok valjanosti.'
    }

    if (
      !customerName.trim()
    ) {
      nextErrors.customerName =
        'Unesi ili odaberi investitora.'
    }

    if (
      items.length === 0 ||
      items.every(
        (item) =>
          !item.name.trim(),
      )
    ) {
      nextErrors.items =
        'Dodaj barem jednu stavku ponude.'
    }

    const invalidItem =
      items.find(
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

    setErrors(
      nextErrors,
    )

    return (
      Object.keys(
        nextErrors,
      ).length === 0
    )
  }

  function getCleanItems():
    OfferItem[] {
    return items
      .filter(
        (item) =>
          item.name.trim(),
      )
      .map(
        (item) => ({
          ...item,
          name:
            item.name.trim(),
          description:
            item.description.trim(),
          quantity:
            Number(
              item.quantity,
            ) || 0,
          price:
            Number(
              item.price,
            ) || 0,
          discount:
            Number(
              item.discount,
            ) || 0,
          vat:
            Number(
              item.vat,
            ) || 0,
        }),
      )
  }

  function openPdfPreview() {
    setSaveMessage('')

    if (
      !validateOffer()
    ) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    if (
      !companySettings
    ) {
      setErrors(
        (current) => ({
          ...current,
          save:
            'Podaci tvrtke nisu učitani. Osvježi stranicu i pokušaj ponovno.',
        }),
      )
      return
    }

    const now =
      new Date().toISOString()

    openOfferPdf({
      id:
        editingOffer?.id ??
        'preview',
      offerNumber:
        editingOffer
          ?.offerNumber ??
        'P-AUTOMATSKI',
      customerName:
        customerName.trim(),
      customerType,
      oib: oib.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address:
        address.trim(),
      city: city.trim(),
      date,
      validUntil,
      status:
        editingOffer?.status ??
        'Nacrt',
      responsiblePerson:
        responsiblePerson.trim(),
      description:
        description.trim(),
      internalNote:
        internalNote.trim(),
      paymentTerms:
        paymentTerms.trim(),
      items:
        getCleanItems(),
      createdAt:
        editingOffer
          ?.createdAt ??
        now,
      updatedAt: now,
      version:
        editingOffer?.version ??
        1,
    })
  }

  async function saveOffer(
    status:
      | 'Nacrt'
      | 'Poslano',
  ) {
    setSaveMessage('')

    if (isSaving) {
      return
    }

    if (
      !validateOffer()
    ) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    if (
      !companySettings
    ) {
      setErrors(
        (current) => ({
          ...current,
          save:
            'Podaci tvrtke nisu učitani. Osvježi stranicu i pokušaj ponovno.',
        }),
      )
      return
    }

    try {
      setIsSaving(true)

      const historyItem:
        OfferHistoryItem = {
          id: createId(
            'history',
          ),
          date:
            new Date().toISOString(),
          title:
            isEditing
              ? 'Ponuda uređena'
              : status ===
                  'Poslano'
                ? 'Ponuda izrađena i označena kao poslana'
                : isDuplicating
                  ? 'Ponuda duplicirana'
                  : 'Ponuda izrađena',
          description:
            isEditing
              ? `Ponuda je uređena i spremljena sa statusom „${status}”.`
              : status ===
                  'Poslano'
                ? 'Nova ponuda spremljena je sa statusom „Poslano”.'
                : isDuplicating
                  ? `Nova ponuda izrađena je prema ponudi ${duplicateSource?.offerNumber ?? ''}.`
                  : 'Nova ponuda spremljena je kao nacrt.',
        }

      const payload = {
        customer: {
          id:
            customerId ||
            undefined,
          name:
            customerName.trim(),
          type:
            customerType,
          oib: oib.trim(),
          email:
            email.trim(),
          phone:
            phone.trim(),
          address:
            address.trim(),
          postalCode:
            postalCode.trim() ||
            undefined,
          city:
            city.trim(),
        },
        date,
        validUntil,
        status,
        responsiblePerson:
          responsiblePerson.trim(),
        description:
          description.trim(),
        internalNote:
          internalNote.trim(),
        paymentTerms:
          paymentTerms.trim(),
        items:
          getCleanItems(),
        attachments:
          editingOffer
            ?.attachments ??
          [],
        version:
          isEditing
            ? (editingOffer
                ?.version ?? 1) +
              1
            : 1,
        workOrderId:
          editingOffer
            ?.workOrderId,
        invoiceId:
          editingOffer
            ?.invoiceId,
        history: [
          ...(editingOffer
            ?.history ?? []),
          historyItem,
        ],
      }

      const savedOffer =
        isEditing &&
        editingOffer
          ? await updateOffer(
              editingOffer.id,
              payload,
            )
          : await createOffer(
              payload,
            )

      if (
        !isEditing &&
        !isDuplicating
      ) {
        await deleteUserDraft(
          'offer',
          'new',
        )
      }

      setOfferNumber(
        savedOffer.offerNumber,
      )

      setSaveMessage(
        isEditing
          ? 'Promjene ponude su spremljene.'
          : status ===
              'Poslano'
            ? 'Ponuda je spremljena i pripremljena za slanje.'
            : 'Ponuda je spremljena kao nacrt.',
      )

      if (
        status === 'Poslano'
      ) {
        void openOfferEmailDraft(
          savedOffer,
          companySettings,
        )
      }

      window.setTimeout(
        () => {
          navigate(
            `/offers/${savedOffer.id}`,
          )
        },
        status === 'Poslano'
          ? 1200
          : 650,
      )
    } catch (error) {
      setErrors(
        (current) => ({
          ...current,
          save:
            error instanceof
              Error
              ? error.message
              : 'Ponudu nije moguće spremiti.',
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje ponude..."
      />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <h1 className="text-xl font-black text-white sm:text-2xl">
            Ponudu nije moguće otvoriti
          </h1>

          <p className="mt-3 break-words text-sm text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/offers')
            }
            className="mt-6 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white"
          >
            Povratak na ponude
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-28 sm:space-y-6 sm:pb-12">
        <DraftAutosaveBadge
          state={
            autosaveState
          }
          text={autosaveText}
          onDiscard={
            !isEditing &&
            !isDuplicating &&
            autosaveState !==
              'idle'
              ? () =>
                  void discardOfferDraft()
              : undefined
          }
        />

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Ponude
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                {isEditing
                  ? 'UREĐIVANJE PONUDE'
                  : isDuplicating
                    ? 'DUPLICIRANA PONUDA'
                    : 'NOVA PONUDA'}
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {isEditing
                  ? 'Uredi ponudu'
                  : 'Izradi ponudu'}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Investitor, troškovnik i uvjeti u nekoliko jasnih koraka.
              </p>
            </div>

            <button
              type="button"
              onClick={
                openPdfPreview
              }
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white active:scale-95 sm:hidden"
              aria-label="PDF pregled"
            >
              <FileText
                size={19}
              />
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <HeroMetric
              label="Broj"
              value={
                offerNumber
              }
            />
            <HeroMetric
              label="Stavke"
              value={String(
                items.filter(
                  (item) =>
                    item.name.trim(),
                ).length,
              )}
            />
            <HeroMetric
              label="Ukupno"
              value={formatCurrency(
                totals.total,
              )}
            />
          </div>

          <div className="relative mt-4 hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={
                openPdfPreview
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 text-sm font-black text-white"
            >
              <FileText
                size={18}
              />
              PDF pregled
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void saveOffer(
                  'Nacrt',
                )
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-black text-violet-200 disabled:opacity-50"
            >
              <Save size={18} />
              {isEditing
                ? 'Spremi promjene'
                : 'Spremi nacrt'}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void saveOffer(
                  'Poslano',
                )
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white disabled:opacity-50"
            >
              <Send size={18} />
              {isEditing
                ? 'Spremi kao poslano'
                : 'Spremi i pošalji'}
            </button>
          </div>
        </section>

        {saveMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200">
            <Check size={18} />
            {saveMessage}
          </div>
        )}

        {errors.save && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300">
            {errors.save}
          </div>
        )}

        <MobileSection
          number="1"
          title="Podaci ponude"
          description="Datum, valjanost i odgovorna osoba."
          icon={
            <CalendarDays
              size={19}
            />
          }
        >
          <Field label="Broj ponude">
            <input
              value={
                offerNumber
              }
              readOnly
              className={`${inputClass} text-slate-400`}
            />
          </Field>

          <Field label="Odgovorna osoba">
            <input
              value={
                responsiblePerson
              }
              onChange={(event) =>
                setResponsiblePerson(
                  event.target.value,
                )
              }
              placeholder="Ime odgovorne osobe"
              className={inputClass}
            />
          </Field>

          <Field label="Datum ponude">
            <input
              type="date"
              value={date}
              onChange={(event) => {
                const nextDate =
                  event.target.value
                setDate(nextDate)
                setValidUntil(
                  addDays(
                    nextDate,
                    30,
                  ),
                )
              }}
              className={`${inputClass} [color-scheme:dark] ${
                errors.date
                  ? 'border-red-500'
                  : ''
              }`}
            />
          </Field>

          <Field label="Vrijedi do">
            <input
              type="date"
              value={
                validUntil
              }
              min={date}
              onChange={(event) =>
                setValidUntil(
                  event.target.value,
                )
              }
              className={`${inputClass} [color-scheme:dark] ${
                errors.validUntil
                  ? 'border-red-500'
                  : ''
              }`}
            />
          </Field>
        </MobileSection>

        <MobileSection
          number="2"
          title="Investitor"
          description="Pretraži postojećeg ili unesi podatke ručno."
          icon={
            <UserRound
              size={19}
            />
          }
        >
          <div className="relative sm:col-span-2">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-6 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={
                customerSearch
              }
              onFocus={() =>
                setShowCustomerResults(
                  true,
                )
              }
              onChange={(event) => {
                setCustomerSearch(
                  event.target.value,
                )
                setShowCustomerResults(
                  true,
                )
              }}
              placeholder="Pretraži investitora..."
              className={`${inputClass} pl-11 pr-11`}
            />

            {customerSearch && (
              <button
                type="button"
                onClick={
                  clearSelectedCustomer
                }
                className="absolute right-2 top-1.5 grid h-9 w-9 place-items-center rounded-xl text-slate-500"
              >
                <X size={17} />
              </button>
            )}

            {showCustomerResults &&
              filteredCustomers.length >
                0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
                  {filteredCustomers.map(
                    (customer) => {
                      const CustomerIcon =
                        getCustomerIcon(
                          customer.type,
                        )

                      return (
                        <button
                          key={
                            customer.id
                          }
                          type="button"
                          onClick={() =>
                            selectCustomer(
                              customer,
                            )
                          }
                          className="flex w-full items-start gap-3 rounded-xl p-3 text-left active:bg-slate-800"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                            <CustomerIcon
                              size={18}
                            />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-white">
                              {
                                customer.name
                              }
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {
                                customer.type
                              }
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
                    },
                  )}
                </div>
              )}

            {errors.customerName && (
              <p className="mt-2 text-xs font-black text-red-400">
                {
                  errors.customerName
                }
              </p>
            )}
          </div>

          <Field label="Vrsta investitora">
            <select
              value={
                customerType
              }
              onChange={(event) =>
                setCustomerType(
                  event.target
                    .value as CustomerType,
                )
              }
              className={inputClass}
            >
              <option value="Fizička osoba">
                Fizička osoba
              </option>
              <option value="Tvrtka">
                Tvrtka
              </option>
              <option value="Zgrada">
                Zgrada
              </option>
            </select>
          </Field>

          <Field label="Naziv / ime i prezime">
            <input
              value={
                customerName
              }
              onChange={(event) =>
                setCustomerName(
                  event.target.value,
                )
              }
              placeholder="Naziv investitora"
              className={`${inputClass} ${
                errors.customerName
                  ? 'border-red-500'
                  : ''
              }`}
            />
          </Field>

          <Field label="OIB">
            <input
              inputMode="numeric"
              maxLength={11}
              value={oib}
              onChange={(event) =>
                setOib(
                  event.target.value
                    .replace(
                      /\D/g,
                      '',
                    )
                    .slice(0, 11),
                )
              }
              placeholder="11 znamenki"
              className={inputClass}
            />
          </Field>

          <Field label="Telefon">
            <input
              inputMode="tel"
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Poštanski broj">
            <input
              inputMode="numeric"
              value={
                postalCode
              }
              onChange={(event) =>
                setPostalCode(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Adresa"
            className="sm:col-span-2"
          >
            <input
              value={address}
              onChange={(event) =>
                setAddress(
                  event.target.value,
                )
              }
              placeholder="Ulica i kućni broj"
              className={inputClass}
            />
          </Field>

          <Field
            label="Grad"
            className="sm:col-span-2"
          >
            <input
              value={city}
              onChange={(event) =>
                setCity(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>
        </MobileSection>

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

        <MobileSection
          number="3"
          title="Stavke ponude"
          description="Materijal, usluge, količina, cijena, popust i PDV."
          icon={
            <CircleDollarSign
              size={19}
            />
          }
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

            {items.map(
              (item, index) => (
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
                        onClick={() =>
                          duplicateItem(
                            item.id,
                          )
                        }
                        className="min-h-9 rounded-xl bg-slate-800 px-3 text-[10px] font-black text-slate-300"
                      >
                        Dupliciraj
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.id,
                          )
                        }
                        className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-400"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <input
                      value={
                        item.name
                      }
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          'name',
                          event.target.value,
                        )
                      }
                      placeholder="Naziv stavke"
                      className={inputClass}
                    />

                    <textarea
                      rows={3}
                      value={
                        item.description
                      }
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
                          value={
                            item.quantity
                          }
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'quantity',
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                        />
                      </MiniField>

                      <MiniField label="Jedinica">
                        <select
                          value={
                            item.unit
                          }
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'unit',
                              event.target.value,
                            )
                          }
                          className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                        >
                          {unitOptions.map(
                            (unit) => (
                              <option
                                key={
                                  unit
                                }
                                value={
                                  unit
                                }
                              >
                                {unit}
                              </option>
                            ),
                          )}
                        </select>
                      </MiniField>

                      <MiniField label="Cijena €">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.price
                          }
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'price',
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                        />
                      </MiniField>

                      <MiniField label="Popust %">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={
                            item.discount
                          }
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'discount',
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                        />
                      </MiniField>

                      <MiniField label="PDV %">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={
                            item.vat
                          }
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              'vat',
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                        />
                      </MiniField>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-slate-800/55 p-3">
                      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-500/10 px-3 text-xs font-black text-violet-200">
                        <ImagePlus
                          size={17}
                        />
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
                            event.currentTarget.value =
                              ''
                          }}
                        />
                      </label>

                      <p className="text-right">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-600">
                          Ukupno
                        </span>
                        <span className="mt-1 block text-sm font-black text-white">
                          {formatCurrency(
                            calculateItemTotal(
                              item,
                            ),
                          )}
                        </span>
                      </p>
                    </div>

                    {item.imageDataUrl && (
                      <div className="relative overflow-hidden rounded-2xl border border-slate-700">
                        <img
                          src={
                            item.imageDataUrl
                          }
                          alt={
                            item.name ||
                            `Stavka ${index + 1}`
                          }
                          className="max-h-56 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeItemImage(
                              item.id,
                            )
                          }
                          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl bg-black/75 text-white"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        </MobileSection>

        <MobileSection
          number="4"
          title="Opis i uvjeti"
          description="Završni tekst ponude i uvjeti plaćanja."
          icon={
            <FileText size={19} />
          }
        >
          <Field
            label="Opis ponude"
            className="sm:col-span-2"
          >
            <textarea
              rows={5}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Dodatni opis ponude..."
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
          </Field>

          <Field
            label="Uvjeti plaćanja"
            className="sm:col-span-2"
          >
            <select
              value={paymentTerms}
              onChange={(event) =>
                setPaymentTerms(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              {paymentTermOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field
            label="Interna napomena"
            className="sm:col-span-2"
          >
            <textarea
              rows={4}
              value={
                internalNote
              }
              onChange={(event) =>
                setInternalNote(
                  event.target.value,
                )
              }
              placeholder="Napomena samo za interne korisnike..."
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
          </Field>
        </MobileSection>

        <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900 to-violet-950/30 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
              <CircleDollarSign
                size={20}
              />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
                SAŽETAK
              </p>
              <h2 className="mt-1 text-lg font-black text-white">
                Ukupna vrijednost
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TotalBox
              label="Osnovica"
              value={formatCurrency(
                totals.base,
              )}
            />
            <TotalBox
              label="Popust"
              value={formatCurrency(
                totals.discount,
              )}
            />
            <TotalBox
              label="PDV"
              value={formatCurrency(
                totals.vat,
              )}
            />
            <TotalBox
              label="Ukupno"
              value={formatCurrency(
                totals.total,
              )}
              strong
            />
          </div>
        </section>

        <div className="hidden gap-3 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={
              openPdfPreview
            }
            className="h-12 rounded-2xl bg-slate-800 px-5 font-black text-white"
          >
            PDF pregled
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void saveOffer(
                'Nacrt',
              )
            }
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 font-black text-violet-200 disabled:opacity-50"
          >
            <Save size={18} />
            Spremi nacrt
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void saveOffer(
                'Poslano',
              )
            }
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white disabled:opacity-50"
          >
            <Send size={18} />
            Spremi i pošalji
          </button>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void saveOffer(
                'Nacrt',
              )
            }
            className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800 text-violet-200 disabled:opacity-50"
            aria-label="Spremi nacrt"
          >
            <Save size={18} />
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void saveOffer(
                'Poslano',
              )
            }
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 font-black text-white disabled:opacity-50"
          >
            <Send size={18} />
            {isEditing
              ? 'Spremi kao poslano'
              : 'Spremi i pošalji'}
          </button>
        </div>
      </div>

      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje ponude..."
        />
      )}
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

        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
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
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>
      <div className="mt-2">
        {children}
      </div>
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
      <div className="mt-1">
        {children}
      </div>
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
        strong
          ? 'bg-violet-600'
          : 'bg-slate-800/65'
      }`}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-wider ${
          strong
            ? 'text-violet-100'
            : 'text-slate-600'
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
