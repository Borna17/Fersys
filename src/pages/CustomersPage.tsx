import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { useNavigate } from 'react-router'
import {
  Building,
  Building2,
  ChevronDown,
  ImagePlus,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import FersysLoader from '../components/FersysLoader'
import {
  createCustomer,
  getCustomers,
} from '../services/customers.service'
import type {
  Customer,
  CustomerType,
} from '../types/customer'

const customerTypeLabels: Record<CustomerType, string> = {
  person: 'Fizička osoba',
  company: 'Tvrtka / Obrt',
  building: 'Zgrada',
}

type CustomerTypeIconProps = {
  type: CustomerType
  logo?: string
  name: string
}

function CustomerTypeIcon({
  type,
  logo,
  name,
}: CustomerTypeIconProps) {
  const iconClasses =
    'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl'

  if (type === 'company' && logo) {
    return (
      <div className={`${iconClasses} border border-slate-700 bg-white`}>
        <img
          src={logo}
          alt={`Logo tvrtke ${name}`}
          className="h-full w-full object-contain p-1"
        />
      </div>
    )
  }

  if (type === 'company') {
    return (
      <div
        className={`${iconClasses} bg-violet-500/15 text-violet-400`}
      >
        <Building2 size={21} />
      </div>
    )
  }

  if (type === 'building') {
    return (
      <div
        className={`${iconClasses} bg-amber-500/15 text-amber-400`}
      >
        <Building size={21} />
      </div>
    )
  }

  return (
    <div className={`${iconClasses} bg-blue-500/15 text-blue-400`}>
      <UserRound size={21} />
    </div>
  )
}

export function CustomersPage() {
  const navigate = useNavigate()

  const [customers, setCustomers] =
    useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [searchValue, setSearchValue] = useState('')
  const [typeFilter, setTypeFilter] =
    useState<'all' | CustomerType>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customerType, setCustomerType] =
    useState<CustomerType>('person')

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [logo, setLogo] = useState('')
  const [oib, setOib] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [iban, setIban] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCustomers() {
      try {
        setIsLoading(true)
        setLoadError('')

        const savedCustomers = await getCustomers()

        if (!cancelled) {
          setCustomers(savedCustomers)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Kupce nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchValue.toLowerCase().trim()

    return customers.filter((customer) => {
      const matchesType =
        typeFilter === 'all' || customer.type === typeFilter

      const searchableText = [
        customer.name,
        customer.oib,
        customer.email,
        customer.phone,
        customer.city,
        customer.street,
        customer.postalCode,
        customer.contactPerson ?? '',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        normalizedSearch === '' ||
        searchableText.includes(normalizedSearch)

      return matchesType && matchesSearch
    })
  }, [customers, searchValue, typeFilter])

  function resetForm() {
    setCustomerType('person')
    setName('')
    setContactPerson('')
    setLogo('')
    setOib('')
    setPhone('')
    setEmail('')
    setStreet('')
    setCity('')
    setPostalCode('')
    setIban('')
    setNotes('')
  }

  function closeModal() {
    setIsModalOpen(false)
    resetForm()
  }

  function selectCustomerType(type: CustomerType) {
    setCustomerType(type)

    if (type !== 'company') {
      setLogo('')
    }
  }

  function handleLogoUpload(
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
        setLogo(reader.result)
      }
    }

    reader.onerror = () => {
      alert('Logo nije moguće učitati. Pokušajte ponovno.')
    }

    reader.readAsDataURL(file)
  }

  async function handleAddCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const cleanOib = oib.replace(/\D/g, '')
    const cleanName = name.trim()

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

      const newCustomer = await createCustomer({
        type: customerType,
        name: cleanName,
        contactPerson:
          customerType === 'person'
            ? undefined
            : contactPerson.trim(),
        logo:
          customerType === 'company'
            ? logo
            : undefined,
        oib: cleanOib,
        phone,
        email,
        street,
        city,
        postalCode,
        iban,
        notes,
        status: 'Aktivan',
      })

      setCustomers((currentCustomers) => [
        newCustomer,
        ...currentCustomers,
      ])

      closeModal()
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Kupca nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function openCustomer(customerId: string) {
    navigate(`/customers/${customerId}`)
  }

  function handleOptionsClick(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation()
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje kupaca..." />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h2 className="text-xl font-bold text-white">
            Kupce nije moguće učitati
          </h2>
          <p className="mt-3 text-sm text-red-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Kupci
            </h2>

            <p className="mt-2 text-slate-400">
              Upravljajte fizičkim osobama, tvrtkama, obrtima i
              zgradama.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus size={20} />
            Novi kupac
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Ukupno kupaca</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {customers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Fizičke osobe
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {
                customers.filter(
                  (customer) => customer.type === 'person',
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Tvrtke i obrti
            </p>
            <p className="mt-2 text-3xl font-bold text-violet-400">
              {
                customers.filter(
                  (customer) => customer.type === 'company',
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Zgrade</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {
                customers.filter(
                  (customer) => customer.type === 'building',
                ).length
              }
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(event.target.value)
              }
              placeholder="Pretraži po nazivu, OIB-u, telefonu, adresi ili gradu..."
              className="h-12 w-full rounded-xl bg-slate-800 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as 'all' | CustomerType,
                )
              }
              className="h-12 min-w-52 appearance-none rounded-xl bg-slate-800 px-4 pr-11 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Sve vrste kupaca</option>
              <option value="person">Fizičke osobe</option>
              <option value="company">Tvrtke i obrti</option>
              <option value="building">Zgrade</option>
            </select>

            <ChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="border-b border-slate-800 bg-slate-800/40">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Kupac</th>
                  <th className="px-6 py-4">OIB</th>
                  <th className="px-6 py-4">Kontakt</th>
                  <th className="px-6 py-4">Grad</th>
                  <th className="px-6 py-4">Nalozi</th>
                  <th className="px-6 py-4">Ukupno</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => openCustomer(customer.id)}
                    className="cursor-pointer transition hover:bg-slate-800/60"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <CustomerTypeIcon
                          type={customer.type}
                          logo={customer.logo}
                          name={customer.name}
                        />

                        <div>
                          <p className="font-semibold text-white">
                            {customer.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {customerTypeLabels[customer.type]}
                            {customer.contactPerson
                              ? ` · ${customer.contactPerson}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-300">
                      {customer.oib}
                    </td>

                    <td className="px-6 py-5">
                      <div className="space-y-1.5 text-sm text-slate-400">
                        <p className="flex items-center gap-2">
                          <Phone size={14} />
                          {customer.phone || 'Nije uneseno'}
                        </p>

                        <p className="flex items-center gap-2">
                          <Mail size={14} />
                          {customer.email || 'Nije uneseno'}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin
                          size={15}
                          className="text-slate-500"
                        />
                        {customer.city}
                      </span>
                    </td>

                    <td className="px-6 py-5 font-semibold text-white">
                      {customer.workOrders}
                    </td>

                    <td className="px-6 py-5 font-semibold text-white">
                      {customer.totalSpent}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          customer.status === 'Aktivan'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={handleOptionsClick}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-700 hover:text-white"
                        aria-label={`Opcije za kupca ${customer.name}`}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold text-white">
                Nema pronađenih kupaca
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Pokušajte promijeniti pojam pretrage ili odabrani
                filtar.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 text-sm text-slate-400">
            <span>
              Prikazano {filteredCustomers.length} od{' '}
              {customers.length}
            </span>

            <span>Kliknite na kupca za detaljan pregled</span>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Novi kupac
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Unesite podatke novog kupca.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                aria-label="Zatvori obrazac"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6">
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  Vrsta kupca
                </label>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      selectCustomerType('person')
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      customerType === 'person'
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
                      selectCustomerType('company')
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      customerType === 'company'
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
                      selectCustomerType('building')
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      customerType === 'building'
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Building size={22} />
                    <span className="font-semibold">Zgrada</span>
                  </button>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-300">
                    {customerType === 'person'
                      ? 'Ime i prezime'
                      : customerType === 'company'
                        ? 'Naziv tvrtke ili obrta'
                        : 'Naziv zgrade'}
                  </label>

                  <input
                    required
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder={
                      customerType === 'person'
                        ? 'Primjer: Marko Horvat'
                        : customerType === 'company'
                          ? 'Primjer: Instalacije Ferfolja'
                          : 'Primjer: Zajednica suvlasnika Trg pobjede 21'
                    }
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {customerType !== 'person' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">
                      Kontakt osoba
                    </label>

                    <input
                      value={contactPerson}
                      onChange={(event) =>
                        setContactPerson(event.target.value)
                      }
                      placeholder={
                        customerType === 'building'
                          ? 'Ime predstavnika suvlasnika'
                          : 'Ime i prezime kontakt osobe'
                      }
                      className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                {customerType === 'company' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">
                      Logo tvrtke
                    </label>

                    {!logo ? (
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
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="mt-2 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white">
                          <img
                            src={logo}
                            alt="Pregled logotipa tvrtke"
                            className="h-full w-full object-contain p-2"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">
                            Logo je učitan
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            Logo će se prikazivati uz naziv
                            tvrtke.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600">
                              <ImagePlus size={17} />
                              Promijeni

                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => setLogo('')}
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
                    value={oib}
                    onChange={(event) =>
                      setOib(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 11),
                      )
                    }
                    placeholder="11 znamenki"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Uneseno {oib.length}/11 znamenki
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    Telefon
                  </label>

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
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
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="email@primjer.hr"
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">
                    IBAN
                  </label>

                  <input
                    value={iban}
                    onChange={(event) =>
                      setIban(event.target.value.toUpperCase())
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
                    value={street}
                    onChange={(event) =>
                      setStreet(event.target.value)
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
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
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
                    value={postalCode}
                    onChange={(event) =>
                      setPostalCode(
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
                    rows={4}
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Dodatne informacije o kupcu..."
                    className="mt-2 w-full resize-none rounded-xl bg-slate-800 p-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-12 rounded-xl bg-slate-800 px-6 font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Plus size={19} />
                  {isSaving ? 'Spremanje...' : 'Spremi kupca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}