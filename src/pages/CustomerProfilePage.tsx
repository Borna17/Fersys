import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'
import {
  ArrowLeft,
  Building,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Image,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

import FersysLoader from '../components/FersysLoader'
import {
  deleteCustomer,
  getCustomerById,
  updateCustomer,
} from '../services/customers.service'
import { getInvoices } from '../services/invoices.service'
import { getOffers } from '../services/offers.service'
import {
  getWorkOrders,
  type CloudWorkOrder,
} from '../services/workOrders.service'
import type { Offer } from '../types/offers'
import {
  deleteCustomerPhoto,
  getCustomerPhotos,
  uploadCustomerPhotos,
  type CustomerPhoto,
} from '../services/customerPhotos.service'
import type {
  Customer,
  CustomerStatus,
  CustomerType,
} from '../types/customer'

type CustomerInvoice = {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  status: string
  customerId?: string
  customerName?: string
  oib?: string
  paidAmount?: number
  items?: Array<{
    quantity?: number
    price?: number
    discount?: number
    vat?: number
  }>
}

type CustomerTab =
  | 'overview'
  | 'work-orders'
  | 'offers'
  | 'invoices'
  | 'photos'
  | 'notes'

const tabs: Array<{
  id: CustomerTab
  label: string
}> = [
  { id: 'overview', label: 'Pregled' },
  { id: 'work-orders', label: 'Nalozi' },
  { id: 'offers', label: 'Ponude' },
  { id: 'invoices', label: 'Računi' },
  { id: 'photos', label: 'Fotografije' },
  { id: 'notes', label: 'Napomene' },
]

const customerTypeLabels: Record<
  CustomerType,
  string
> = {
  person: 'Fizička osoba',
  company: 'Tvrtka / Obrt',
  building: 'Zgrada',
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/30'

function normalizeName(
  value: string | undefined,
) {
  return (value ?? '')
    .trim()
    .toLocaleLowerCase('hr-HR')
    .replace(/\s+/g, ' ')
}

function normalizeOib(
  value: string | undefined,
) {
  return (value ?? '').replace(
    /\D/g,
    '',
  )
}

function belongsToCustomer(
  customer: Customer,
  record: {
    customerId?: string
    customerName?: string
    oib?: string
  },
) {
  if (
    record.customerId &&
    record.customerId === customer.id
  ) {
    return true
  }

  const customerOib =
    normalizeOib(customer.oib)
  const recordOib =
    normalizeOib(record.oib)

  if (
    customerOib.length === 11 &&
    customerOib === recordOib
  ) {
    return true
  }

  return (
    normalizeName(record.customerName) !==
      '' &&
    normalizeName(record.customerName) ===
      normalizeName(customer.name)
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function formatDate(
  value: string | undefined,
) {
  if (!value) return '—'

  const date = new Date(
    `${value}T12:00:00`,
  )

  if (
    Number.isNaN(date.getTime())
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(date)
}

function calculateOfferTotal(
  offer: Offer,
) {
  return offer.items.reduce(
    (sum, item) => {
      const base =
        (Number(item.quantity) || 0) *
        (Number(item.price) || 0)
      const discount =
        base *
        ((Number(item.discount) || 0) /
          100)
      const net = base - discount
      const vat =
        net *
        ((Number(item.vat) || 0) /
          100)

      return sum + net + vat
    },
    0,
  )
}

function calculateInvoiceTotal(
  invoice: CustomerInvoice,
) {
  return (
    invoice.items ?? []
  ).reduce((sum, item) => {
    const base =
      (Number(item.quantity) || 0) *
      (Number(item.price) || 0)
    const discount =
      base *
      ((Number(item.discount) || 0) /
        100)
    const net = base - discount
    const vat =
      net *
      ((Number(item.vat) || 0) /
        100)

    return sum + net + vat
  }, 0)
}

function CustomerAvatar({
  customer,
}: {
  customer: Customer
}) {
  if (
    customer.type === 'company' &&
    customer.logo
  ) {
    return (
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-slate-700 bg-white sm:h-24 sm:w-24">
        <img
          src={customer.logo}
          alt={`Logo tvrtke ${customer.name}`}
          className="h-full w-full object-contain p-2"
        />
      </div>
    )
  }

  const common =
    'grid h-20 w-20 shrink-0 place-items-center rounded-3xl sm:h-24 sm:w-24'

  if (customer.type === 'company') {
    return (
      <div
        className={`${common} bg-violet-500/15 text-violet-300`}
      >
        <Building2 size={36} />
      </div>
    )
  }

  if (customer.type === 'building') {
    return (
      <div
        className={`${common} bg-amber-500/15 text-amber-300`}
      >
        <Building size={36} />
      </div>
    )
  }

  return (
    <div
      className={`${common} bg-blue-500/15 text-blue-300`}
    >
      <UserRound size={36} />
    </div>
  )
}

export function CustomerProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [customer, setCustomer] =
    useState<Customer | null>(null)
  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [isSaving, setIsSaving] =
    useState(false)
  const [isDeleting, setIsDeleting] =
    useState(false)

  const [
    relationsLoading,
    setRelationsLoading,
  ] = useState(false)
  const [
    relationsError,
    setRelationsError,
  ] = useState('')
  const [
    linkedWorkOrders,
    setLinkedWorkOrders,
  ] = useState<CloudWorkOrder[]>([])
  const [
    linkedOffers,
    setLinkedOffers,
  ] = useState<Offer[]>([])
  const [
    linkedInvoices,
    setLinkedInvoices,
  ] = useState<CustomerInvoice[]>([])

  const [
    customerPhotos,
    setCustomerPhotos,
  ] = useState<CustomerPhoto[]>([])
  const [
    photosLoading,
    setPhotosLoading,
  ] = useState(false)
  const [
    photosUploading,
    setPhotosUploading,
  ] = useState(false)
  const [
    photosError,
    setPhotosError,
  ] = useState('')
  const [
    photoDeletingId,
    setPhotoDeletingId,
  ] = useState('')
  const [
    previewPhoto,
    setPreviewPhoto,
  ] = useState<CustomerPhoto | null>(
    null,
  )

  const [
    selectedPhotoIds,
    setSelectedPhotoIds,
  ] = useState<string[]>([])
  const [
    photoActionBusy,
    setPhotoActionBusy,
  ] = useState(false)

  const [activeTab, setActiveTab] =
    useState<CustomerTab>('overview')
  const [
    isEditModalOpen,
    setIsEditModalOpen,
  ] = useState(false)

  const [editType, setEditType] =
    useState<CustomerType>('person')
  const [editName, setEditName] =
    useState('')
  const [
    editContactPerson,
    setEditContactPerson,
  ] = useState('')
  const [editLogo, setEditLogo] =
    useState('')
  const [editOib, setEditOib] =
    useState('')
  const [editPhone, setEditPhone] =
    useState('')
  const [editEmail, setEditEmail] =
    useState('')
  const [editStreet, setEditStreet] =
    useState('')
  const [editCity, setEditCity] =
    useState('')
  const [
    editPostalCode,
    setEditPostalCode,
  ] = useState('')
  const [editIban, setEditIban] =
    useState('')
  const [editNotes, setEditNotes] =
    useState('')
  const [editStatus, setEditStatus] =
    useState<CustomerStatus>('Aktivan')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setLoadError('')

        const savedCustomer =
          await getCustomerById(id)

        if (!cancelled) {
          setCustomer(savedCustomer)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Investitora nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!customer) {
        setLinkedWorkOrders([])
        setLinkedOffers([])
        setLinkedInvoices([])
        return
      }

      try {
        setRelationsLoading(true)
        setRelationsError('')

        const [
          workOrders,
          offers,
          invoices,
        ] = await Promise.all([
          getWorkOrders(),
          getOffers(),
          getInvoices<CustomerInvoice>(),
        ])

        if (cancelled) return

        setLinkedWorkOrders(
          workOrders.filter((order) =>
            belongsToCustomer(
              customer,
              {
                customerId:
                  order.customerId,
                customerName:
                  order.customerName,
                oib:
                  order.customerOib,
              },
            ),
          ),
        )

        setLinkedOffers(
          offers.filter((offer) =>
            belongsToCustomer(
              customer,
              {
                customerId:
                  offer.customerId,
                customerName:
                  offer.customerName,
                oib: offer.oib,
              },
            ),
          ),
        )

        setLinkedInvoices(
          invoices.filter(
            (invoice) =>
              belongsToCustomer(
                customer,
                {
                  customerId:
                    invoice.customerId,
                  customerName:
                    invoice.customerName,
                  oib: invoice.oib,
                },
              ),
          ),
        )
      } catch (error) {
        if (!cancelled) {
          setRelationsError(
            error instanceof Error
              ? error.message
              : 'Povezane dokumente nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setRelationsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [customer])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!customer) {
        setCustomerPhotos([])
        return
      }

      try {
        setPhotosLoading(true)
        setPhotosError('')

        const photos =
          await getCustomerPhotos(
            customer.id,
          )

        if (!cancelled) {
          setCustomerPhotos(photos)
        }
      } catch (error) {
        if (!cancelled) {
          setPhotosError(
            error instanceof Error
              ? error.message
              : 'Fotografije nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setPhotosLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [customer])

  useEffect(() => {
    const locked =
      isEditModalOpen ||
      Boolean(previewPhoto)

    document.body.style.overflow =
      locked ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [
    isEditModalOpen,
    previewPhoto,
  ])

  useEffect(() => {
    if (
      !isEditModalOpen &&
      !previewPhoto
    ) {
      return
    }

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key !== 'Escape') {
        return
      }

      if (previewPhoto) {
        setPreviewPhoto(null)
        return
      }

      if (!isSaving) {
        setIsEditModalOpen(false)
      }
    }

    window.addEventListener(
      'keydown',
      onKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        onKeyDown,
      )
    }
  }, [
    isEditModalOpen,
    previewPhoto,
    isSaving,
  ])

  const fullAddress = useMemo(() => {
    if (!customer) return ''

    return [
      customer.street,
      [
        customer.postalCode,
        customer.city,
      ]
        .filter(Boolean)
        .join(' '),
    ]
      .filter(Boolean)
      .join(', ')
  }, [customer])

  const workOrderValue = useMemo(
    () =>
      linkedWorkOrders.reduce(
        (sum, order) =>
          sum +
          (Number(order.totalPrice) ||
            0),
        0,
      ),
    [linkedWorkOrders],
  )

  const openInvoiceValue = useMemo(
    () =>
      linkedInvoices
        .filter(
          (invoice) =>
            ![
              'Plaćeno',
              'Stornirano',
            ].includes(
              invoice.status,
            ),
        )
        .reduce(
          (sum, invoice) =>
            sum +
            Math.max(
              0,
              calculateInvoiceTotal(
                invoice,
              ) -
                (Number(
                  invoice.paidAmount,
                ) || 0),
            ),
          0,
        ),
    [linkedInvoices],
  )

  function openEditModal() {
    if (!customer) return

    setEditType(customer.type)
    setEditName(customer.name)
    setEditContactPerson(
      customer.contactPerson ?? '',
    )
    setEditLogo(customer.logo ?? '')
    setEditOib(customer.oib)
    setEditPhone(customer.phone)
    setEditEmail(customer.email)
    setEditStreet(customer.street)
    setEditCity(customer.city)
    setEditPostalCode(
      customer.postalCode,
    )
    setEditIban(customer.iban)
    setEditNotes(customer.notes)
    setEditStatus(customer.status)
    setIsEditModalOpen(true)
  }

  function closeEditModal() {
    if (!isSaving) {
      setIsEditModalOpen(false)
    }
  }

  function selectEditCustomerType(
    type: CustomerType,
  ) {
    setEditType(type)

    if (type === 'person') {
      setEditContactPerson('')
    }

    if (type !== 'company') {
      setEditLogo('')
    }
  }

  function handleEditLogoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0]

    if (!file) return

    const allowed = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]

    if (!allowed.includes(file.type)) {
      window.alert(
        'Logo mora biti PNG, JPG, JPEG ili WEBP slika.',
      )
      event.target.value = ''
      return
    }

    if (file.size > 1024 * 1024) {
      window.alert(
        'Logo ne smije biti veći od 1 MB.',
      )
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (
        typeof reader.result ===
        'string'
      ) {
        setEditLogo(reader.result)
      }
    }

    reader.onerror = () => {
      window.alert(
        'Logo nije moguće učitati.',
      )
    }

    reader.readAsDataURL(file)
  }

  async function handleEditCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!customer || isSaving) {
      return
    }

    const cleanName =
      editName.trim()
    const cleanOib =
      editOib.replace(/\D/g, '')

    if (!cleanName) {
      window.alert(
        'Unesite naziv investitora.',
      )
      return
    }

    if (
      cleanOib &&
      cleanOib.length !== 11
    ) {
      window.alert(
        'Ako unosite OIB, mora sadržavati točno 11 znamenki.',
      )
      return
    }

    try {
      setIsSaving(true)

      const updatedCustomer =
        await updateCustomer(
          customer.id,
          {
            type: editType,
            name: cleanName,
            contactPerson:
              editType === 'person'
                ? undefined
                : editContactPerson.trim(),
            logo:
              editType === 'company'
                ? editLogo
                : undefined,
            oib: cleanOib,
            phone: editPhone.trim(),
            email:
              editEmail
                .trim()
                .toLowerCase(),
            street:
              editStreet.trim(),
            city: editCity.trim(),
            postalCode:
              editPostalCode.trim(),
            iban:
              editIban
                .replace(/\s+/g, '')
                .toUpperCase(),
            notes: editNotes.trim(),
            status: editStatus,
          },
        )

      setCustomer(updatedCustomer)
      setIsEditModalOpen(false)
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Promjene nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCustomer() {
    if (!customer || isDeleting) {
      return
    }

    const confirmed =
      window.confirm(
        `Obrisati investitora „${customer.name}“? Ova radnja se ne može poništiti.`,
      )

    if (!confirmed) return

    try {
      setIsDeleting(true)
      await deleteCustomer(customer.id)
      navigate(
        '/customers',
        { replace: true },
      )
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Investitora nije moguće obrisati.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCustomerPhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!customer) return

    const input =
      event.currentTarget
    const files = Array.from(
      input.files ?? [],
    )

    input.value = ''

    if (!files.length) return

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    const invalid = files.find(
      (file) =>
        !allowed.includes(file.type),
    )

    if (invalid) {
      window.alert(
        `Datoteka „${invalid.name}” nije JPG, PNG ili WEBP fotografija.`,
      )
      return
    }

    const tooLarge = files.find(
      (file) =>
        file.size >
        10 * 1024 * 1024,
    )

    if (tooLarge) {
      window.alert(
        `Fotografija „${tooLarge.name}” veća je od 10 MB.`,
      )
      return
    }

    if (files.length > 12) {
      window.alert(
        'Odjednom možeš dodati najviše 12 fotografija.',
      )
      return
    }

    try {
      setPhotosUploading(true)
      setPhotosError('')

      const uploaded =
        await uploadCustomerPhotos(
          customer.id,
          files,
        )

      setCustomerPhotos(
        (current) => [
          ...uploaded,
          ...current,
        ],
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Fotografije nije moguće spremiti.'

      setPhotosError(message)
      window.alert(message)
    } finally {
      setPhotosUploading(false)
    }
  }

  function togglePhotoSelection(
    photoId: string,
  ) {
    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId],
    )
  }

  function clearPhotoSelection() {
    setSelectedPhotoIds([])
  }

  function toggleSelectAllPhotos() {
    setSelectedPhotoIds((current) =>
      current.length === customerPhotos.length
        ? []
        : customerPhotos.map((photo) => photo.id),
    )
  }

  const selectedPhotos = customerPhotos.filter((photo) =>
    selectedPhotoIds.includes(photo.id),
  )

  async function photoToFile(photo: CustomerPhoto) {
    const response = await fetch(photo.url)

    if (!response.ok) {
      throw new Error(
        `Fotografiju „${photo.fileName}” nije moguće dohvatiti.`,
      )
    }

    const blob = await response.blob()
    const type = blob.type || photo.mimeType || 'image/jpeg'

    return new File(
      [blob],
      photo.fileName || `fotografija-${photo.id}.jpg`,
      { type },
    )
  }

  async function handleDownloadSelectedPhotos() {
    if (!selectedPhotos.length || photoActionBusy) return

    try {
      setPhotoActionBusy(true)

      for (const photo of selectedPhotos) {
        const response = await fetch(photo.url)
        if (!response.ok) {
          throw new Error(
            `Fotografiju „${photo.fileName}” nije moguće preuzeti.`,
          )
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = photo.fileName || `fotografija-${photo.id}.jpg`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)

        // Mali razmak sprječava preglednik da proguta više uzastopnih preuzimanja.
        await new Promise((resolve) => window.setTimeout(resolve, 120))
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Odabrane fotografije nije moguće preuzeti.',
      )
    } finally {
      setPhotoActionBusy(false)
    }
  }

  async function handleShareSelectedPhotos() {
    if (!selectedPhotos.length || photoActionBusy) return

    try {
      setPhotoActionBusy(true)
      const files = await Promise.all(selectedPhotos.map(photoToFile))

      const shareData: ShareData = {
        title: customer?.name
          ? `FERSYS fotografije – ${customer.name}`
          : 'FERSYS fotografije',
        text: customer?.name
          ? `Fotografije investitora ${customer.name}`
          : 'Fotografije iz FERSYS-a',
        files,
      }

      if (navigator.canShare?.({ files }) && navigator.share) {
        await navigator.share(shareData)
        return
      }

      if (navigator.share && files.length === 1) {
        await navigator.share(shareData)
        return
      }

      window.alert(
        'Ovaj preglednik ne podržava izravno dijeljenje više fotografija. Koristi „Preuzmi odabrane”, a u FERSYS Android aplikaciji otvorit će se sistemski izbornik za WhatsApp, Viber i druge aplikacije.',
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      window.alert(
        error instanceof Error
          ? error.message
          : 'Odabrane fotografije nije moguće podijeliti.',
      )
    } finally {
      setPhotoActionBusy(false)
    }
  }

  async function handleDeletePhoto(
    photo: CustomerPhoto,
  ) {
    if (photoDeletingId) return

    if (
      !window.confirm(
        `Obrisati fotografiju „${photo.fileName}”?`,
      )
    ) {
      return
    }

    try {
      setPhotoDeletingId(photo.id)
      await deleteCustomerPhoto(photo)

      setCustomerPhotos(
        (current) =>
          current.filter(
            (item) =>
              item.id !== photo.id,
          ),
      )

      if (
        previewPhoto?.id ===
        photo.id
      ) {
        setPreviewPhoto(null)
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Fotografiju nije moguće obrisati.',
      )
    } finally {
      setPhotoDeletingId('')
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje investitora..." />
    )
  }

  if (loadError || !customer) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-7 text-center">
          <Users
            size={32}
            className="mx-auto text-red-300"
          />
          <h1 className="mt-4 text-xl font-black text-white">
            Investitora nije moguće
            učitati
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {loadError ||
              'Investitor nije pronađen.'}
          </p>
          <button
            type="button"
            onClick={() =>
              navigate('/customers')
            }
            className="mt-5 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Povratak
          </button>
        </div>
      </section>
    )
  }

  const displayedWorkOrders =
    relationsLoading
      ? customer.workOrders
      : linkedWorkOrders.length

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-4 sm:space-y-6">
        <button
          type="button"
          onClick={() =>
            navigate('/customers')
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Investitori
        </button>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <CustomerAvatar
                customer={customer}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                      {
                        customerTypeLabels[
                          customer.type
                        ]
                      }
                    </p>
                    <h1 className="mt-1 break-words text-xl font-black text-white sm:text-3xl">
                      {customer.name}
                    </h1>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={openEditModal}
                      disabled={isDeleting}
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-300 active:scale-95 disabled:opacity-50"
                      aria-label="Uredi investitora"
                    >
                      <Edit3 size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteCustomer()
                      }
                      disabled={isDeleting}
                      className="grid h-11 w-11 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 active:scale-95 disabled:opacity-50"
                      aria-label="Obriši investitora"
                    >
                      {isDeleting ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                      customer.status ===
                      'Aktivan'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {customer.status}
                  </span>

                  {customer.oib && (
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-400">
                      OIB {customer.oib}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SummaryMetric
                label="Nalozi"
                value={String(
                  displayedWorkOrders,
                )}
              />
              <SummaryMetric
                label="Ponude"
                value={String(
                  linkedOffers.length,
                )}
              />
              <SummaryMetric
                label="Otvoreno"
                value={formatMoney(
                  openInvoiceValue,
                )}
                compact
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <ContactAction
            icon={<Phone size={19} />}
            label="Poziv"
            disabled={!customer.phone}
            onClick={() => {
              if (customer.phone) {
                window.location.href =
                  `tel:${customer.phone}`
              }
            }}
          />

          <ContactAction
            icon={<Mail size={19} />}
            label="E-mail"
            disabled={!customer.email}
            onClick={() => {
              if (customer.email) {
                window.location.href =
                  `mailto:${customer.email}`
              }
            }}
          />

          <ContactAction
            icon={<MapPin size={19} />}
            label="Adresa"
            disabled={!fullAddress}
            onClick={() => {
              if (fullAddress) {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    fullAddress,
                  )}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            }}
          />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            icon={
              <ClipboardList size={20} />
            }
            label="Novi nalog"
            onClick={() =>
              navigate(
                `/work-orders/new?customerId=${customer.id}`,
              )
            }
          />
          <QuickAction
            icon={<FileText size={20} />}
            label="Nova ponuda"
            onClick={() =>
              navigate(
                `/offers/new?customerId=${customer.id}`,
              )
            }
          />
          <QuickAction
            icon={
              <ReceiptText size={20} />
            }
            label="Novi račun"
            onClick={() =>
              navigate(
                `/invoices/new?customerId=${customer.id}`,
              )
            }
          />
          <QuickAction
            icon={
              <CalendarDays size={20} />
            }
            label="Kalendar"
            onClick={() =>
              navigate('/calendar')
            }
          />
        </section>

        <nav className="fersys-scrollbar-hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`min-h-11 rounded-xl px-4 text-sm font-black transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 active:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {relationsError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {relationsError}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    PODACI
                  </p>
                  <h2 className="mt-1 text-lg font-black text-white">
                    Podaci o investitoru
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
                >
                  <Edit3 size={16} />
                  Uredi
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard
                  label="Vrsta"
                  value={
                    customerTypeLabels[
                      customer.type
                    ]
                  }
                />
                <InfoCard
                  label="OIB"
                  value={
                    customer.oib ||
                    'Nije uneseno'
                  }
                />
                <InfoCard
                  label="Telefon"
                  value={
                    customer.phone ||
                    'Nije uneseno'
                  }
                />
                <InfoCard
                  label="E-mail"
                  value={
                    customer.email ||
                    'Nije uneseno'
                  }
                />
                <InfoCard
                  label="Kontakt osoba"
                  value={
                    customer.contactPerson ||
                    'Nije uneseno'
                  }
                />
                <InfoCard
                  label="IBAN"
                  value={
                    customer.iban ||
                    'Nije uneseno'
                  }
                />
                <InfoCard
                  label="Adresa"
                  value={
                    fullAddress ||
                    'Nije uneseno'
                  }
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <WalletCards
                  size={20}
                  className="text-emerald-400"
                />
                <h2 className="text-lg font-black text-white">
                  Financijski pregled
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                <FinanceRow
                  label="Vrijednost naloga"
                  value={formatMoney(
                    workOrderValue,
                  )}
                />
                <FinanceRow
                  label="Otvoreni računi"
                  value={formatMoney(
                    openInvoiceValue,
                  )}
                />
                <FinanceRow
                  label="Broj ponuda"
                  value={String(
                    linkedOffers.length,
                  )}
                />
              </div>
            </section>
          </div>
        )}

        {activeTab ===
          'work-orders' && (
          <RecordsSection
            title="Radni nalozi"
            loading={relationsLoading}
            empty={
              linkedWorkOrders.length === 0
            }
            createLabel="Novi nalog"
            onCreate={() =>
              navigate(
                `/work-orders/new?customerId=${customer.id}`,
              )
            }
          >
            {linkedWorkOrders.map(
              (order) => (
                <RecordCard
                  key={order.id}
                  icon={
                    <ClipboardList
                      size={19}
                    />
                  }
                  title={
                    order.orderNumber
                  }
                  subtitle={
                    order.title ||
                    'Radni nalog'
                  }
                  date={formatDate(
                    order.date,
                  )}
                  status={order.status}
                  value={formatMoney(
                    Number(
                      order.totalPrice,
                    ) || 0,
                  )}
                  onClick={() =>
                    navigate(
                      `/work-orders/${order.id}`,
                    )
                  }
                />
              ),
            )}
          </RecordsSection>
        )}

        {activeTab === 'offers' && (
          <RecordsSection
            title="Ponude"
            loading={relationsLoading}
            empty={
              linkedOffers.length === 0
            }
            createLabel="Nova ponuda"
            onCreate={() =>
              navigate(
                `/offers/new?customerId=${customer.id}`,
              )
            }
          >
            {linkedOffers.map(
              (offer) => (
                <RecordCard
                  key={offer.id}
                  icon={
                    <FileText
                      size={19}
                    />
                  }
                  title={
                    offer.offerNumber
                  }
                  subtitle={
                    offer.description ||
                    'Ponuda'
                  }
                  date={formatDate(
                    offer.date,
                  )}
                  status={offer.status}
                  value={formatMoney(
                    calculateOfferTotal(
                      offer,
                    ),
                  )}
                  onClick={() =>
                    navigate(
                      `/offers/${offer.id}`,
                    )
                  }
                />
              ),
            )}
          </RecordsSection>
        )}

        {activeTab ===
          'invoices' && (
          <RecordsSection
            title="Računi"
            loading={relationsLoading}
            empty={
              linkedInvoices.length === 0
            }
            createLabel="Novi račun"
            onCreate={() =>
              navigate(
                `/invoices/new?customerId=${customer.id}`,
              )
            }
          >
            {linkedInvoices.map(
              (invoice) => (
                <RecordCard
                  key={invoice.id}
                  icon={
                    <ReceiptText
                      size={19}
                    />
                  }
                  title={
                    invoice.invoiceNumber
                  }
                  subtitle="Izdani račun"
                  date={formatDate(
                    invoice.issueDate,
                  )}
                  status={
                    invoice.status
                  }
                  value={formatMoney(
                    calculateInvoiceTotal(
                      invoice,
                    ),
                  )}
                  onClick={() =>
                    navigate(
                      `/invoices/${invoice.id}/edit`,
                    )
                  }
                />
              ),
            )}
          </RecordsSection>
        )}

        {activeTab === 'photos' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                  <Image size={21} />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">
                    Fotografije
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Objekt, radovi i
                    dokumentacija.
                  </p>
                </div>
              </div>

              <label
                className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white ${
                  photosUploading
                    ? 'pointer-events-none opacity-60'
                    : ''
                }`}
              >
                {photosUploading ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <ImagePlus
                    size={18}
                  />
                )}
                {photosUploading
                  ? 'Spremanje...'
                  : 'Dodaj fotografije'}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) =>
                    void handleCustomerPhotoUpload(
                      event,
                    )
                  }
                  className="hidden"
                />
              </label>
            </div>

            {photosError && (
              <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">
                {photosError}
              </div>
            )}

            {photosLoading ? (
              <div className="grid min-h-52 place-items-center">
                <Loader2
                  size={28}
                  className="animate-spin text-blue-400"
                />
              </div>
            ) : customerPhotos.length ===
              0 ? (
              <EmptyState
                icon={
                  <Image size={25} />
                }
                title="Nema fotografija"
                text="Dodaj fotografije objekta, radova ili dokumentacije."
              />
            ) : (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <button
                    type="button"
                    onClick={toggleSelectAllPhotos}
                    className="min-h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
                  >
                    {selectedPhotoIds.length === customerPhotos.length
                      ? 'Poništi sve'
                      : 'Odaberi sve'}
                  </button>

                  <span className="mr-auto rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200">
                    Odabrano: {selectedPhotoIds.length}
                  </span>

                  {selectedPhotoIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={clearPhotoSelection}
                        disabled={photoActionBusy}
                        className="min-h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-slate-300 disabled:opacity-50"
                      >
                        Poništi
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDownloadSelectedPhotos()}
                        disabled={photoActionBusy}
                        className="min-h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-50"
                      >
                        {photoActionBusy ? 'Pričekaj...' : 'Preuzmi odabrane'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleShareSelectedPhotos()}
                        disabled={photoActionBusy}
                        className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-50"
                      >
                        {photoActionBusy ? 'Pričekaj...' : 'Podijeli odabrane'}
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {customerPhotos.map(
                  (photo) => (
                    <article
                      key={photo.id}
                      className={`relative overflow-hidden rounded-2xl border bg-slate-950 transition ${
                        selectedPhotoIds.includes(photo.id)
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-800'
                      }`}
                    >
                      <label
                        className="absolute left-2 top-2 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-white/20 bg-slate-950/85 shadow-lg backdrop-blur"
                        title="Odaberi fotografiju"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPhotoIds.includes(photo.id)}
                          onChange={() => togglePhotoSelection(photo.id)}
                          className="h-5 w-5 cursor-pointer accent-blue-600"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto(
                            photo,
                          )
                        }
                        className="block aspect-[4/3] w-full"
                      >
                        <img
                          src={photo.url}
                          alt={
                            photo.fileName
                          }
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <div className="flex items-center gap-2 p-3">
                        <p className="min-w-0 flex-1 truncate text-xs font-black text-white">
                          {
                            photo.fileName
                          }
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeletePhoto(
                              photo,
                            )
                          }
                          disabled={
                            photoDeletingId ===
                            photo.id
                          }
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-300 disabled:opacity-50"
                        >
                          {photoDeletingId ===
                          photo.id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={15}
                            />
                          )}
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'notes' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <NotebookPen
                size={22}
                className="text-amber-400"
              />
              <h2 className="text-lg font-black text-white">
                Napomene
              </h2>
            </div>

            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-800/60 p-4 text-sm leading-7 text-slate-300">
              {customer.notes ||
                'Za ovog investitora još nema spremljenih napomena.'}
            </p>

            <button
              type="button"
              onClick={openEditModal}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white"
            >
              <Edit3 size={17} />
              Uredi napomenu
            </button>
          </section>
        )}
      </section>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 p-[max(0.75rem,var(--fersys-safe-top))] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Pregled fotografije"
          onClick={() =>
            setPreviewPhoto(null)
          }
        >
          <div
            className="relative flex max-h-[calc(100dvh-var(--fersys-safe-top)-var(--fersys-safe-bottom)-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-3">
              <p className="min-w-0 truncate text-sm font-black text-white">
                {previewPhoto.fileName}
              </p>
              <button
                type="button"
                onClick={() =>
                  setPreviewPhoto(null)
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-black p-2">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.fileName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end bg-black/75 pt-[var(--fersys-safe-top)] backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Uredi investitora"
        >
          <div className="flex max-h-[calc(100dvh-var(--fersys-safe-top))] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[94dvh] sm:max-w-3xl sm:rounded-3xl sm:border">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  UREĐIVANJE
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Uredi investitora
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeEditModal
                }
                disabled={isSaving}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-400 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                handleEditCustomer
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-6">
                <span className="text-sm font-black text-slate-300">
                  Vrsta investitora
                </span>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <TypeButton
                    active={
                      editType ===
                      'person'
                    }
                    onClick={() =>
                      selectEditCustomerType(
                        'person',
                      )
                    }
                    icon={
                      <UserRound
                        size={20}
                      />
                    }
                    label="Osoba"
                    activeClass="border-blue-500 bg-blue-500/10 text-blue-200"
                  />
                  <TypeButton
                    active={
                      editType ===
                      'company'
                    }
                    onClick={() =>
                      selectEditCustomerType(
                        'company',
                      )
                    }
                    icon={
                      <Building2
                        size={20}
                      />
                    }
                    label="Tvrtka"
                    activeClass="border-violet-500 bg-violet-500/10 text-violet-200"
                  />
                  <TypeButton
                    active={
                      editType ===
                      'building'
                    }
                    onClick={() =>
                      selectEditCustomerType(
                        'building',
                      )
                    }
                    icon={
                      <Building
                        size={20}
                      />
                    }
                    label="Zgrada"
                    activeClass="border-amber-500 bg-amber-500/10 text-amber-200"
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Field
                    label={
                      editType ===
                      'person'
                        ? 'Ime i prezime'
                        : editType ===
                            'company'
                          ? 'Naziv tvrtke ili obrta'
                          : 'Naziv zgrade'
                    }
                    className="md:col-span-2"
                  >
                    <input
                      required
                      value={editName}
                      onChange={(event) =>
                        setEditName(
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  {editType !==
                    'person' && (
                    <Field
                      label="Kontakt osoba"
                      className="md:col-span-2"
                    >
                      <input
                        value={
                          editContactPerson
                        }
                        onChange={(
                          event,
                        ) =>
                          setEditContactPerson(
                            event.target
                              .value,
                          )
                        }
                        className={
                          inputClass
                        }
                      />
                    </Field>
                  )}

                  {editType ===
                    'company' && (
                    <Field
                      label="Logo tvrtke"
                      className="md:col-span-2"
                    >
                      <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                        {editLogo ? (
                          <img
                            src={
                              editLogo
                            }
                            alt="Logo"
                            className="h-16 w-16 rounded-xl bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="grid h-16 w-16 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                            <ImagePlus
                              size={24}
                            />
                          </span>
                        )}

                        <span className="font-black text-white">
                          {editLogo
                            ? 'Promijeni logo'
                            : 'Učitaj logo'}
                        </span>

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={
                            handleEditLogoUpload
                          }
                          className="hidden"
                        />
                      </label>

                      {editLogo && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditLogo('')
                          }
                          className="mt-2 text-xs font-black text-red-300"
                        >
                          Ukloni logo
                        </button>
                      )}
                    </Field>
                  )}

                  <Field label="OIB">
                    <input
                      inputMode="numeric"
                      maxLength={11}
                      value={editOib}
                      onChange={(event) =>
                        setEditOib(
                          event.target
                            .value
                            .replace(
                              /\D/g,
                              '',
                            )
                            .slice(
                              0,
                              11,
                            ),
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target
                            .value as CustomerStatus,
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="Aktivan">
                        Aktivan
                      </option>
                      <option value="Neaktivan">
                        Neaktivan
                      </option>
                    </select>
                  </Field>

                  <Field label="Telefon">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={editPhone}
                      onChange={(event) =>
                        setEditPhone(
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="E-mail">
                    <input
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      value={editEmail}
                      onChange={(event) =>
                        setEditEmail(
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field
                    label="IBAN"
                    className="md:col-span-2"
                  >
                    <input
                      value={editIban}
                      onChange={(event) =>
                        setEditIban(
                          event.target
                            .value
                            .toUpperCase(),
                        )
                      }
                      className={`${inputClass} uppercase`}
                    />
                  </Field>

                  <Field
                    label="Ulica i kućni broj"
                    className="md:col-span-2"
                  >
                    <input
                      value={editStreet}
                      onChange={(event) =>
                        setEditStreet(
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Grad">
                    <input
                      value={editCity}
                      onChange={(event) =>
                        setEditCity(
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Poštanski broj">
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      value={
                        editPostalCode
                      }
                      onChange={(event) =>
                        setEditPostalCode(
                          event.target
                            .value
                            .replace(
                              /\D/g,
                              '',
                            )
                            .slice(
                              0,
                              5,
                            ),
                        )
                      }
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field
                    label="Napomena"
                    className="md:col-span-2"
                  >
                    <textarea
                      rows={5}
                      value={editNotes}
                      onChange={(event) =>
                        setEditNotes(
                          event.target
                            .value,
                        )
                      }
                      className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-600/30"
                    />
                  </Field>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-800 bg-slate-900/98 p-3 pb-[max(0.75rem,var(--fersys-safe-bottom))] backdrop-blur-xl sm:flex sm:justify-end sm:gap-3 sm:p-5">
                <button
                  type="button"
                  onClick={
                    closeEditModal
                  }
                  disabled={isSaving}
                  className="hidden min-h-12 rounded-2xl bg-slate-800 px-6 font-black text-slate-300 disabled:opacity-50 sm:inline-flex sm:items-center"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-50 sm:w-auto"
                >
                  {isSaving ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save
                      size={18}
                    />
                  )}
                  {isSaving
                    ? 'Spremanje...'
                    : 'Spremi izmjene'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function RecordsSection({
  title,
  loading,
  empty,
  createLabel,
  onCreate,
  children,
}: {
  title: string
  loading: boolean
  empty: boolean
  createLabel: string
  onCreate: () => void
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="grid min-h-52 place-items-center rounded-3xl border border-slate-800 bg-slate-900">
        <Loader2
          size={28}
          className="animate-spin text-blue-400"
        />
      </div>
    )
  }

  if (empty) {
    return (
      <EmptyState
        icon={<FileText size={25} />}
        title={`Nema: ${title.toLowerCase()}`}
        text="Još nema povezanih zapisa za ovog investitora."
        actionLabel={createLabel}
        onAction={onCreate}
      />
    )
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">
          {title}
        </h2>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white"
        >
          <Plus size={16} />
          {createLabel}
        </button>
      </div>

      <div className="grid gap-3">
        {children}
      </div>
    </section>
  )
}

function RecordCard({
  icon,
  title,
  subtitle,
  date,
  status,
  value,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  date: string
  status: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-3 text-left active:scale-[0.995]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm font-black text-white">
            {title}
          </strong>
          <span className="rounded-full bg-slate-800 px-2 py-1 text-[9px] font-black text-slate-400">
            {status}
          </span>
        </span>

        <span className="mt-1 block truncate text-xs text-slate-400">
          {subtitle}
        </span>
        <span className="mt-1 block text-[10px] text-slate-600">
          {date}
        </span>
      </span>

      <span className="flex items-center gap-2">
        <strong className="hidden whitespace-nowrap text-sm font-black text-white sm:block">
          {value}
        </strong>
        <ChevronRight
          size={18}
          className="text-slate-600"
        />
      </span>
    </button>
  )
}

function SummaryMetric({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-black text-white ${
          compact
            ? 'text-xs sm:text-lg'
            : 'text-xl'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ContactAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 text-sm font-black text-slate-200 active:scale-[0.98] disabled:opacity-35"
    >
      <span className="text-blue-300">
        {icon}
      </span>
      {label}
    </button>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left font-black text-white active:scale-[0.98]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
        {icon}
      </span>
      <span className="text-sm">
        {label}
      </span>
    </button>
  )
}

function InfoCard({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl bg-slate-800/60 p-4 ${className}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  )
}

function FinanceRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-400">
        {label}
      </span>
      <strong className="text-right text-white">
        {value}
      </strong>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: ReactNode
  title: string
  text: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-black text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
        {text}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white"
        >
          <Plus size={17} />
          {actionLabel}
        </button>
      )}
    </div>
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

function TypeButton({
  active,
  onClick,
  icon,
  label,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  activeClass: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-center text-xs font-black active:scale-[0.98] ${
        active
          ? activeClass
          : 'border-slate-700 bg-slate-800 text-slate-400'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default CustomerProfilePage
