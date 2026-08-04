import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  Banknote,
  Building,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Image,
  ImagePlus,
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
  getCustomerById,
  updateCustomer,
} from '../services/customers.service'
import type {
  Customer,
  CustomerStatus,
  CustomerType,
} from '../types/customer'

type CustomerTab =
  | 'overview'
  | 'work-orders'
  | 'offers'
  | 'invoices'
  | 'documents'
  | 'photos'
  | 'notes'

const customerTypeLabels: Record<CustomerType, string> = {
  person: 'Fizička osoba',
  company: 'Tvrtka / Obrt',
  building: 'Zgrada',
}

const tabs: {
  id: CustomerTab
  label: string
}[] = [
  {
    id: 'overview',
    label: 'Pregled',
  },
  {
    id: 'work-orders',
    label: 'Radni nalozi',
  },
  {
    id: 'offers',
    label: 'Ponude',
  },
  {
    id: 'invoices',
    label: 'Računi',
  },
  {
    id: 'documents',
    label: 'Dokumenti',
  },
  {
    id: 'photos',
    label: 'Fotografije',
  },
  {
    id: 'notes',
    label: 'Napomene',
  },
]

function CustomerAvatar({ customer }: { customer: Customer }) {
  if (customer.type === 'company' && customer.logo) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-xl">
        <img
          src={customer.logo}
          alt={`Logo tvrtke ${customer.name}`}
          className="h-full w-full object-contain p-3"
        />
      </div>
    )
  }

  if (customer.type === 'company') {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-400">
        <Building2 size={42} />
      </div>
    )
  }

  if (customer.type === 'building') {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-400">
        <Building size={42} />
      </div>
    )
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-blue-500/15 text-blue-400">
      <UserRound size={42} />
    </div>
  )
}

function EmptySection({
  icon,
  title,
  description,
  buttonLabel,
}: {
  icon: ReactNode
  title: string
  description: string
  buttonLabel: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
        {description}
      </p>

      <button
        type="button"
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500"
      >
        <Plus size={18} />
        {buttonLabel}
      </button>
    </div>
  )
}

export function CustomerProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [customer, setCustomer] =
    useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [activeTab, setActiveTab] =
    useState<CustomerTab>('overview')

  const [isEditModalOpen, setIsEditModalOpen] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCustomer() {
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
              : 'Kupca nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadCustomer()

    return () => {
      cancelled = true
    }
  }, [id])

  const [editType, setEditType] =
    useState<CustomerType>('person')
  const [editName, setEditName] = useState('')
  const [editContactPerson, setEditContactPerson] =
    useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editOib, setEditOib] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editStreet, setEditStreet] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editPostalCode, setEditPostalCode] = useState('')
  const [editIban, setEditIban] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] =
    useState<CustomerStatus>('Aktivan')


  function openEditModal() {
    if (!customer) {
      return
    }

    setEditType(customer.type)
    setEditName(customer.name)
    setEditContactPerson(customer.contactPerson ?? '')
    setEditLogo(customer.logo ?? '')
    setEditOib(customer.oib)
    setEditPhone(customer.phone)
    setEditEmail(customer.email)
    setEditStreet(customer.street)
    setEditCity(customer.city)
    setEditPostalCode(customer.postalCode)
    setEditIban(customer.iban)
    setEditNotes(customer.notes)
    setEditStatus(customer.status)

    setIsEditModalOpen(true)
  }

  function closeEditModal() {
    if (isSaving) {
      return
    }

    setIsEditModalOpen(false)
  }

  function selectEditCustomerType(type: CustomerType) {
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
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Logo mora biti PNG, JPG, JPEG ili WEBP slika.')
      event.target.value = ''
      return
    }

    const maximumSize = 1024 * 1024

    if (file.size > maximumSize) {
      alert('Logo ne smije biti veći od 1 MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditLogo(reader.result)
      }
    }

    reader.onerror = () => {
      alert('Logo nije moguće učitati. Pokušajte ponovno.')
    }

    reader.readAsDataURL(file)
  }

  async function handleEditCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!customer) {
      return
    }

    const cleanName = editName.trim()
    const cleanOib = editOib.replace(/\D/g, '')

    if (!cleanName) {
      alert('Unesite naziv kupca.')
      return
    }

    if (cleanOib.length !== 11) {
      alert('OIB mora sadržavati točno 11 znamenki.')
      return
    }

    try {
      setIsSaving(true)

      const updatedCustomer = await updateCustomer(
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
          phone: editPhone,
          email: editEmail,
          street: editStreet,
          city: editCity,
          postalCode: editPostalCode,
          iban: editIban,
          notes: editNotes,
          status: editStatus,
        },
      )

      setCustomer(updatedCustomer)
      closeEditModal()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Promjene nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje kupca..." />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-xl font-bold text-white">
            Kupca nije moguće učitati
          </h1>
          <p className="mt-3 text-sm text-red-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Povratak na kupce
          </button>
        </div>
      </section>
    )
  }

  if (!customer) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <Users size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-white">
            Kupac nije pronađen
          </h1>

          <p className="mt-2 text-slate-400">
            Ovaj kupac ne postoji ili je uklonjen iz sustava.
          </p>

          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500"
          >
            <ArrowLeft size={19} />
            Povratak na kupce
          </button>
        </div>
      </section>
    )
  }

  const fullAddress = [
    customer.street,
    customer.postalCode,
    customer.city,
  ]
    .filter(Boolean)
    .join(', ')

  const offersCount = 0
  const invoicesCount = 0
  const documentsCount = 0
  const activeServices = customer.workOrders > 0 ? 1 : 0

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px]">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Povratak na kupce
        </button>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/50 p-6 lg:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <CustomerAvatar customer={customer} />

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">
                      {customer.name}
                    </h1>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        customer.status === 'Aktivan'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {customer.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
                    <span>
                      {customerTypeLabels[customer.type]}
                    </span>

                    <span>OIB: {customer.oib}</span>

                    {customer.contactPerson && (
                      <span>
                        Kontakt: {customer.contactPerson}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white transition hover:bg-slate-700"
                >
                  <Edit3 size={18} />
                  Uredi kupca
                </button>

                <button
                  type="button"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Plus size={18} />
                  Novi radni nalog
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                  <Phone size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Telefon
                  </p>
                  <p className="mt-1 truncate font-medium text-white">
                    {customer.phone || 'Nije uneseno'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                  <Mail size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    E-mail
                  </p>
                  <p className="mt-1 truncate font-medium text-white">
                    {customer.email || 'Nije uneseno'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:col-span-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <MapPin size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Adresa
                  </p>
                  <p className="mt-1 truncate font-medium text-white">
                    {fullAddress || 'Nije uneseno'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-3 xl:grid-cols-5">
            <div className="bg-slate-900 p-5">
              <div className="flex items-center gap-3">
                <ClipboardList
                  size={20}
                  className="text-blue-400"
                />
                <span className="text-sm text-slate-400">
                  Radni nalozi
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {customer.workOrders}
              </p>
            </div>

            <div className="bg-slate-900 p-5">
              <div className="flex items-center gap-3">
                <FileText
                  size={20}
                  className="text-violet-400"
                />
                <span className="text-sm text-slate-400">
                  Ponude
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {offersCount}
              </p>
            </div>

            <div className="bg-slate-900 p-5">
              <div className="flex items-center gap-3">
                <ReceiptText
                  size={20}
                  className="text-emerald-400"
                />
                <span className="text-sm text-slate-400">
                  Računi
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {invoicesCount}
              </p>
            </div>

            <div className="bg-slate-900 p-5">
              <div className="flex items-center gap-3">
                <CalendarDays
                  size={20}
                  className="text-amber-400"
                />
                <span className="text-sm text-slate-400">
                  Aktivni servisi
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {activeServices}
              </p>
            </div>

            <div className="col-span-2 bg-slate-900 p-5 sm:col-span-1">
              <div className="flex items-center gap-3">
                <Banknote
                  size={20}
                  className="text-emerald-400"
                />
                <span className="text-sm text-slate-400">
                  Ukupna vrijednost
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold text-white">
                {customer.totalSpent}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Podaci o kupcu
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Osnovni kontaktni i poslovni podaci.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openEditModal}
                      className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <Edit3 size={16} />
                      Uredi
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-800/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Vrsta kupca
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {customerTypeLabels[customer.type]}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        OIB
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {customer.oib}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kontakt osoba
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {customer.contactPerson ||
                          'Nije uneseno'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        IBAN
                      </p>

                      <p className="mt-2 break-all font-medium text-white">
                        {customer.iban || 'Nije uneseno'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 p-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Puna adresa
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {fullAddress || 'Nije uneseno'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Nedavne aktivnosti
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Zadnje promjene i aktivnosti za ovog kupca.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                        <Users size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">
                          Kupac je dodan u CRM
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Podaci su spremljeni u FERSYS sustav.
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-slate-600"
                      />
                    </div>

                    {customer.workOrders > 0 && (
                      <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                          <ClipboardList size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">
                            Evidentirani radni nalozi
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Kupac trenutačno ima{' '}
                            {customer.workOrders} evidentiranih
                            naloga.
                          </p>
                        </div>

                        <ChevronRight
                          size={18}
                          className="text-slate-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <h2 className="text-xl font-bold text-white">
                    Brze radnje
                  </h2>

                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl bg-blue-600 p-4 text-left font-semibold text-white transition hover:bg-blue-500"
                    >
                      <ClipboardList size={19} />
                      Novi radni nalog
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-800 p-4 text-left font-semibold text-white transition hover:bg-slate-700"
                    >
                      <FileText size={19} />
                      Nova ponuda
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-800 p-4 text-left font-semibold text-white transition hover:bg-slate-700"
                    >
                      <ReceiptText size={19} />
                      Novi račun
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-800 p-4 text-left font-semibold text-white transition hover:bg-slate-700"
                    >
                      <CalendarDays size={19} />
                      Novi termin
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex items-center gap-3">
                    <NotebookPen
                      size={20}
                      className="text-amber-400"
                    />

                    <h2 className="text-xl font-bold text-white">
                      Napomena
                    </h2>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                    {customer.notes ||
                      'Za ovog kupca još nema spremljenih napomena.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex items-center gap-3">
                    <WalletCards
                      size={20}
                      className="text-emerald-400"
                    />

                    <h2 className="text-xl font-bold text-white">
                      Financijski pregled
                    </h2>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        Ukupna vrijednost
                      </span>

                      <span className="font-bold text-white">
                        {customer.totalSpent}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        Otvoreni računi
                      </span>

                      <span className="font-bold text-white">
                        0 €
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                      <span className="text-sm text-slate-400">
                        Status plaćanja
                      </span>

                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                        Uredno
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'work-orders' && (
            <EmptySection
              icon={<ClipboardList size={25} />}
              title="Nema povezanih radnih naloga"
              description="Ovdje će se prikazivati svi radni nalozi povezani s ovim kupcem."
              buttonLabel="Novi radni nalog"
            />
          )}

          {activeTab === 'offers' && (
            <EmptySection
              icon={<FileText size={25} />}
              title="Nema ponuda"
              description="Izradite prvu ponudu za ovog kupca. Podaci kupca automatski će se preuzeti u ponudu."
              buttonLabel="Nova ponuda"
            />
          )}

          {activeTab === 'invoices' && (
            <EmptySection
              icon={<ReceiptText size={25} />}
              title="Nema računa"
              description="Ovdje će se nalaziti izdani računi, statusi plaćanja i otvorena dugovanja."
              buttonLabel="Novi račun"
            />
          )}

          {activeTab === 'documents' && (
            <EmptySection
              icon={<FileText size={25} />}
              title="Nema dokumenata"
              description={`Za ovog kupca trenutačno nema spremljenih dokumenata. Ukupno: ${documentsCount}.`}
              buttonLabel="Dodaj dokument"
            />
          )}

          {activeTab === 'photos' && (
            <EmptySection
              icon={<Image size={25} />}
              title="Nema fotografija"
              description="Ovdje će se čuvati fotografije objekta, izvedenih radova i servisne dokumentacije."
              buttonLabel="Dodaj fotografije"
            />
          )}

          {activeTab === 'notes' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center gap-3">
                <NotebookPen
                  size={22}
                  className="text-amber-400"
                />

                <div>
                  <h2 className="text-xl font-bold text-white">
                    Napomene o kupcu
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Interne informacije dostupne korisnicima
                    sustava.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-800/60 p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {customer.notes ||
                    'Za ovog kupca još nema spremljenih napomena.'}
                </p>
              </div>

              <button
                type="button"
                onClick={openEditModal}
                className="mt-5 flex h-11 items-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white transition hover:bg-slate-700"
              >
                <Edit3 size={17} />
                Uredi napomenu
              </button>
            </div>
          )}
        </div>
      </section>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Uredi kupca
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Promijenite podatke kupca i spremite izmjene.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSaving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Zatvori uređivanje"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleEditCustomer}
              className="p-6"
            >
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Vrsta kupca
                </label>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      selectEditCustomerType('person')
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      editType === 'person'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <UserRound size={22} />
                    <span className="font-semibold">
                      Fizička osoba
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectEditCustomerType('company')
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      editType === 'company'
                        ? 'border-violet-500 bg-violet-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Building2 size={22} />
                    <span className="font-semibold">
                      Tvrtka / Obrt
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectEditCustomerType('building')
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      editType === 'building'
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Building size={22} />
                    <span className="font-semibold">
                      Zgrada
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-300">
                    {editType === 'person'
                      ? 'Ime i prezime'
                      : editType === 'company'
                        ? 'Naziv tvrtke ili obrta'
                        : 'Naziv zgrade'}
                  </label>

                  <input
                    required
                    value={editName}
                    onChange={(event) =>
                      setEditName(event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {editType !== 'person' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">
                      Kontakt osoba
                    </label>

                    <input
                      value={editContactPerson}
                      onChange={(event) =>
                        setEditContactPerson(
                          event.target.value,
                        )
                      }
                      placeholder={
                        editType === 'building'
                          ? 'Ime predstavnika suvlasnika'
                          : 'Ime i prezime kontakt osobe'
                      }
                      className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {editType === 'company' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">
                      Logo tvrtke
                    </label>

                    {!editLogo ? (
                      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/60 px-6 py-8 text-center transition hover:border-violet-500 hover:bg-violet-500/5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                          <ImagePlus size={24} />
                        </div>

                        <p className="mt-3 font-semibold text-white">
                          Učitaj logo tvrtke
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          PNG, JPG ili WEBP, najviše 1 MB
                        </p>

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleEditLogoUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="mt-2 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4 sm:flex-row sm:items-center">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white">
                          <img
                            src={editLogo}
                            alt="Pregled logotipa tvrtke"
                            className="h-full w-full object-contain p-2"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">
                            Logo tvrtke
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            Možete ga promijeniti ili ukloniti.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600">
                              <ImagePlus size={17} />
                              Promijeni

                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleEditLogoUpload}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => setEditLogo('')}
                              className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                            >
                              <Trash2 size={17} />
                              Ukloni
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    OIB
                  </label>

                  <input
                    required
                    inputMode="numeric"
                    maxLength={11}
                    value={editOib}
                    onChange={(event) =>
                      setEditOib(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 11),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Uneseno {editOib.length}/11 znamenki
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Status kupca
                  </label>

                  <select
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(
                        event.target.value as CustomerStatus,
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Aktivan">Aktivan</option>
                    <option value="Neaktivan">
                      Neaktivan
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Telefon
                  </label>

                  <input
                    value={editPhone}
                    onChange={(event) =>
                      setEditPhone(event.target.value)
                    }
                    placeholder="+385 91 000 0000"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    E-mail
                  </label>

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) =>
                      setEditEmail(event.target.value)
                    }
                    placeholder="email@primjer.hr"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-300">
                    IBAN
                  </label>

                  <input
                    value={editIban}
                    onChange={(event) =>
                      setEditIban(
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="HR00 0000 0000 0000 0000 0"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 uppercase text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-300">
                    Ulica i kućni broj
                  </label>

                  <input
                    value={editStreet}
                    onChange={(event) =>
                      setEditStreet(event.target.value)
                    }
                    placeholder="Ulica i kućni broj"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Grad
                  </label>

                  <input
                    required
                    value={editCity}
                    onChange={(event) =>
                      setEditCity(event.target.value)
                    }
                    placeholder="Slavonski Brod"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Poštanski broj
                  </label>

                  <input
                    inputMode="numeric"
                    value={editPostalCode}
                    onChange={(event) =>
                      setEditPostalCode(
                        event.target.value.replace(/\D/g, ''),
                      )
                    }
                    placeholder="35000"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-300">
                    Napomena
                  </label>

                  <textarea
                    rows={5}
                    value={editNotes}
                    onChange={(event) =>
                      setEditNotes(event.target.value)
                    }
                    placeholder="Dodatne informacije o kupcu..."
                    className="mt-2 w-full resize-none rounded-xl bg-slate-800 p-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="h-12 rounded-xl bg-slate-800 px-6 font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={19} />
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