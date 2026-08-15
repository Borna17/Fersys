import {
  useEffect,
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
  deleteCustomer,
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
  { id: 'overview', label: 'Pregled' },
  { id: 'work-orders', label: 'Nalozi' },
  { id: 'offers', label: 'Ponude' },
  { id: 'invoices', label: 'Računi' },
  { id: 'documents', label: 'Dokumenti' },
  { id: 'photos', label: 'Fotografije' },
  { id: 'notes', label: 'Napomene' },
]

const inputClass =
  'h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600'

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
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-xl sm:h-24 sm:w-24">
        <img
          src={customer.logo}
          alt={`Logo tvrtke ${customer.name}`}
          className="h-full w-full object-contain p-2 sm:p-3"
        />
      </div>
    )
  }

  const common =
    'grid h-20 w-20 shrink-0 place-items-center rounded-3xl sm:h-24 sm:w-24'

  if (customer.type === 'company') {
    return (
      <div className={`${common} bg-violet-500/15 text-violet-300`}>
        <Building2 size={36} />
      </div>
    )
  }

  if (customer.type === 'building') {
    return (
      <div className={`${common} bg-amber-500/15 text-amber-300`}>
        <Building size={36} />
      </div>
    )
  }

  return (
    <div className={`${common} bg-blue-500/15 text-blue-300`}>
      <UserRound size={36} />
    </div>
  )
}

function EmptySection({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}: {
  icon: ReactNode
  title: string
  description: string
  buttonLabel: string
  onClick?: () => void
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 px-5 py-12 text-center sm:px-6 sm:py-16">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-400">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-black text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white active:scale-[0.98]"
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
  const [isLoading, setIsLoading] =
    useState(true)
  const [loadError, setLoadError] =
    useState('')
  const [isSaving, setIsSaving] =
    useState(false)
  const [isDeleting, setIsDeleting] =
    useState(false)

  const [activeTab, setActiveTab] =
    useState<CustomerTab>('overview')

  const [
    isEditModalOpen,
    setIsEditModalOpen,
  ] = useState(false)

  const [editType, setEditType] =
    useState<CustomerType>('person')
  const [editName, setEditName] = useState('')
  const [
    editContactPerson,
    setEditContactPerson,
  ] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editOib, setEditOib] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editStreet, setEditStreet] = useState('')
  const [editCity, setEditCity] = useState('')
  const [
    editPostalCode,
    setEditPostalCode,
  ] = useState('')
  const [editIban, setEditIban] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] =
    useState<CustomerStatus>('Aktivan')

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
              : 'Investitora nije moguće učitati.',
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

  useEffect(() => {
    document.body.style.overflow =
      isEditModalOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isEditModalOpen])

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
    setEditPostalCode(customer.postalCode)
    setEditIban(customer.iban)
    setEditNotes(customer.notes)
    setEditStatus(customer.status)

    setIsEditModalOpen(true)
  }

  function closeEditModal() {
    if (isSaving) return
    setIsEditModalOpen(false)
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

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      alert(
        'Logo mora biti PNG, JPG, JPEG ili WEBP slika.',
      )
      event.target.value = ''
      return
    }

    if (file.size > 1024 * 1024) {
      alert(
        'Logo ne smije biti veći od 1 MB.',
      )
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (
        typeof reader.result === 'string'
      ) {
        setEditLogo(reader.result)
      }
    }

    reader.onerror = () => {
      alert(
        'Logo nije moguće učitati. Pokušajte ponovno.',
      )
    }

    reader.readAsDataURL(file)
  }

  async function handleEditCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!customer) return

    const cleanName =
      editName.trim()
    const cleanOib =
      editOib.replace(/\D/g, '')

    if (!cleanName) {
      alert(
        'Unesite naziv investitora.',
      )
      return
    }

    if (cleanOib.length !== 11) {
      alert(
        'OIB mora sadržavati točno 11 znamenki.',
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
            phone: editPhone,
            email: editEmail,
            street: editStreet,
            city: editCity,
            postalCode:
              editPostalCode,
            iban: editIban,
            notes: editNotes,
            status: editStatus,
          },
        )

      setCustomer(updatedCustomer)
      setIsEditModalOpen(false)
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

  async function handleDeleteCustomer() {
    if (!customer || isDeleting) {
      return
    }

    const confirmed =
      window.confirm(
        `Jeste li sigurni da želite obrisati investitora „${customer.name}“? Ova radnja se ne može poništiti.`,
      )

    if (!confirmed) {
      return
    }

    try {
      setIsDeleting(true)

      await deleteCustomer(
        customer.id,
      )

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

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje investitora..." />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <h1 className="text-xl font-black text-white">
            Investitora nije moguće učitati
          </h1>

          <p className="mt-3 text-sm text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/customers')
            }
            className="mt-5 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Povratak na investitore
          </button>
        </div>
      </section>
    )
  }

  if (!customer) {
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400">
            <Users size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-white">
            Investitor nije pronađen
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ovaj investitor ne postoji ili je uklonjen iz sustava.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/customers')
            }
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white"
          >
            <ArrowLeft size={19} />
            Povratak
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

  const documentsCount = 0
  const activeServices =
    customer.workOrders > 0
      ? 1
      : 0

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
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
                      {customerTypeLabels[
                        customer.type
                      ]}
                    </p>

                    <h1 className="mt-1 truncate text-2xl font-black text-white sm:text-3xl">
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
                      className="grid h-11 w-11 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300 active:scale-95 disabled:opacity-50"
                      aria-label="Obriši investitora"
                      title="Obriši investitora"
                    >
                      <Trash2 size={18} />
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

                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-400">
                    OIB {customer.oib}
                  </span>
                </div>

                {customer.contactPerson && (
                  <p className="mt-3 truncate text-xs font-semibold text-slate-400">
                    Kontakt: {
                      customer.contactPerson
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SummaryMetric
                label="Nalozi"
                value={String(
                  customer.workOrders,
                )}
              />
              <SummaryMetric
                label="Servisi"
                value={String(
                  activeServices,
                )}
              />
              <SummaryMetric
                label="Vrijednost"
                value={
                  customer.totalSpent
                }
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
            icon={<ClipboardList size={20} />}
            label="Novi nalog"
            onClick={() =>
              navigate(
                '/work-orders/new',
              )
            }
          />
          <QuickAction
            icon={<FileText size={20} />}
            label="Nova ponuda"
            onClick={() =>
              navigate('/offers/new')
            }
          />
          <QuickAction
            icon={<ReceiptText size={20} />}
            label="Novi račun"
            onClick={() =>
              navigate('/invoices/new')
            }
          />
          <QuickAction
            icon={<CalendarDays size={20} />}
            label="Kalendar"
            onClick={() =>
              navigate('/calendar')
            }
          />
        </section>

        <nav className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
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

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
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

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={openEditModal}
                      disabled={isDeleting}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300 disabled:opacity-50 sm:flex sm:w-auto sm:gap-2 sm:px-4"
                    >
                      <Edit3 size={16} />
                      <span className="hidden text-xs font-black sm:inline">
                        Uredi
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteCustomer()
                      }
                      disabled={isDeleting}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 disabled:opacity-50 sm:flex sm:w-auto sm:gap-2 sm:px-4"
                    >
                      <Trash2 size={16} />
                      <span className="hidden text-xs font-black sm:inline">
                        {isDeleting
                          ? 'Brisanje...'
                          : 'Obriši'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    value={customer.oib}
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  AKTIVNOST
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  Nedavne aktivnosti
                </h2>

                <div className="mt-4 space-y-3">
                  <ActivityCard
                    icon={<Users size={18} />}
                    title="Investitor je dodan u CRM"
                    description="Podaci su spremljeni u FERSYS sustav."
                  />

                  {customer.workOrders > 0 && (
                    <ActivityCard
                      icon={<ClipboardList size={18} />}
                      title="Evidentirani radni nalozi"
                      description={`Investitor ima ${customer.workOrders} evidentiranih naloga.`}
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <NotebookPen
                    size={20}
                    className="text-amber-400"
                  />
                  <h2 className="text-lg font-black text-white">
                    Napomena
                  </h2>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {customer.notes ||
                    'Za ovog investitora još nema spremljenih napomena.'}
                </p>
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

                <div className="mt-4 space-y-4">
                  <FinanceRow
                    label="Ukupna vrijednost"
                    value={
                      customer.totalSpent
                    }
                  />
                  <FinanceRow
                    label="Otvoreni računi"
                    value="0 €"
                  />

                  <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                    <span className="text-sm text-slate-400">
                      Status plaćanja
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
                      Uredno
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'work-orders' && (
          <EmptySection
            icon={<ClipboardList size={25} />}
            title="Nema povezanih radnih naloga"
            description="Ovdje će se prikazivati svi radni nalozi povezani s ovim investitorom."
            buttonLabel="Novi radni nalog"
            onClick={() =>
              navigate('/work-orders/new')
            }
          />
        )}

        {activeTab === 'offers' && (
          <EmptySection
            icon={<FileText size={25} />}
            title="Nema ponuda"
            description="Izradi prvu ponudu za ovog investitora."
            buttonLabel="Nova ponuda"
            onClick={() =>
              navigate('/offers/new')
            }
          />
        )}

        {activeTab === 'invoices' && (
          <EmptySection
            icon={<ReceiptText size={25} />}
            title="Nema računa"
            description="Ovdje će se nalaziti izdani računi, statusi plaćanja i otvorena dugovanja."
            buttonLabel="Novi račun"
            onClick={() =>
              navigate('/invoices/new')
            }
          />
        )}

        {activeTab === 'documents' && (
          <EmptySection
            icon={<FileText size={25} />}
            title="Nema dokumenata"
            description={`Za ovog investitora trenutačno nema spremljenih dokumenata. Ukupno: ${documentsCount}.`}
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
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <NotebookPen
                size={22}
                className="text-amber-400"
              />

              <div>
                <h2 className="text-lg font-black text-white">
                  Napomene o investitoru
                </h2>

                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  Interne informacije dostupne korisnicima sustava.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-800/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {customer.notes ||
                  'Za ovog investitora još nema spremljenih napomena.'}
              </p>
            </div>

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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[96dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:border">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/98 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  UREĐIVANJE
                </p>
                <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  Uredi investitora
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSaving}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-400 disabled:opacity-50"
                aria-label="Zatvori uređivanje"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleEditCustomer}
              className="p-4 pb-28 sm:p-6 sm:pb-6"
            >
              <label className="text-sm font-black text-slate-300">
                Vrsta investitora
              </label>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <TypeButton
                  active={editType === 'person'}
                  onClick={() =>
                    selectEditCustomerType('person')
                  }
                  icon={<UserRound size={20} />}
                  label="Osoba"
                  activeClass="border-blue-500 bg-blue-500/10 text-blue-200"
                />
                <TypeButton
                  active={editType === 'company'}
                  onClick={() =>
                    selectEditCustomerType('company')
                  }
                  icon={<Building2 size={20} />}
                  label="Tvrtka"
                  activeClass="border-violet-500 bg-violet-500/10 text-violet-200"
                />
                <TypeButton
                  active={editType === 'building'}
                  onClick={() =>
                    selectEditCustomerType('building')
                  }
                  icon={<Building size={20} />}
                  label="Zgrada"
                  activeClass="border-amber-500 bg-amber-500/10 text-amber-200"
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label={
                    editType === 'person'
                      ? 'Ime i prezime'
                      : editType === 'company'
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
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                {editType !== 'person' && (
                  <Field
                    label="Kontakt osoba"
                    className="md:col-span-2"
                  >
                    <input
                      value={editContactPerson}
                      onChange={(event) =>
                        setEditContactPerson(
                          event.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                )}

                {editType === 'company' && (
                  <Field
                    label="Logo tvrtke"
                    className="md:col-span-2"
                  >
                    {!editLogo ? (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/60 px-5 py-7 text-center">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                          <ImagePlus size={23} />
                        </div>
                        <p className="mt-3 font-black text-white">
                          Učitaj logo
                        </p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleEditLogoUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">
                          <img
                            src={editLogo}
                            alt="Logo"
                            className="h-full w-full object-contain p-2"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-black text-white">
                            Logo je učitan
                          </p>

                          <div className="mt-3 flex gap-2">
                            <label className="cursor-pointer rounded-xl bg-slate-700 px-3 py-2 text-xs font-black text-white">
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
                              onClick={() =>
                                setEditLogo('')
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                            >
                              <Trash2 size={14} />
                              Ukloni
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Field>
                )}

                <Field label="OIB">
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
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Uneseno {editOib.length}/11
                  </p>
                </Field>

                <Field label="Status">
                  <select
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(
                        event.target.value as CustomerStatus,
                      )
                    }
                    className={inputClass}
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
                    inputMode="tel"
                    value={editPhone}
                    onChange={(event) =>
                      setEditPhone(
                        event.target.value,
                      )
                    }
                    placeholder="+385 91 000 0000"
                    className={inputClass}
                  />
                </Field>

                <Field label="E-mail">
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) =>
                      setEditEmail(
                        event.target.value,
                      )
                    }
                    placeholder="email@primjer.hr"
                    className={inputClass}
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
                        event.target.value.toUpperCase(),
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
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Grad">
                  <input
                    required
                    value={editCity}
                    onChange={(event) =>
                      setEditCity(
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Poštanski broj">
                  <input
                    inputMode="numeric"
                    value={editPostalCode}
                    onChange={(event) =>
                      setEditPostalCode(
                        event.target.value.replace(
                          /\D/g,
                          '',
                        ),
                      )
                    }
                    className={inputClass}
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
                        event.target.value,
                      )
                    }
                    className="w-full resize-none rounded-2xl bg-slate-800 p-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </Field>
              </div>

              <div className="mt-6 hidden border-t border-slate-800 pt-5 sm:flex sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="min-h-12 rounded-2xl bg-slate-800 px-6 font-black text-slate-300 disabled:opacity-50"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-50"
                >
                  <Save size={18} />
                  {isSaving
                    ? 'Spremanje...'
                    : 'Spremi izmjene'}
                </button>
              </div>

              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white disabled:opacity-50"
                >
                  <Save size={18} />
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
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-black text-white ${
          compact
            ? 'text-sm sm:text-lg'
            : 'text-xl sm:text-2xl'
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
      className="flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 text-sm font-black text-slate-200 transition active:scale-[0.98] disabled:opacity-35"
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
      className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left font-black text-white transition active:scale-[0.98]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/12 text-blue-300">
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
    <div className={`rounded-2xl bg-slate-800/60 p-4 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-white">
        {value}
      </p>
    </div>
  )
}

function ActivityCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="font-black text-white">
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
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
      <span className="font-black text-white">
        {value}
      </span>
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
    <div className={className}>
      <label className="text-sm font-black text-slate-300">
        {label}
      </label>
      <div className="mt-2">
        {children}
      </div>
    </div>
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
      className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 text-center text-xs font-black transition active:scale-[0.98] ${
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