import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'
import {
  Building,
  Building2,
  ChevronDown,
  ImagePlus,
  Mail,
  MapPin,
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

function CustomerTypeIcon({
  type,
  logo,
  name,
  size = 'md',
}: {
  type: CustomerType
  logo?: string
  name: string
  size?: 'md' | 'lg'
}) {
  const sizeClass =
    size === 'lg'
      ? 'h-14 w-14 rounded-2xl'
      : 'h-11 w-11 rounded-xl'

  const base =
    `grid shrink-0 place-items-center overflow-hidden ${sizeClass}`

  if (type === 'company' && logo) {
    return (
      <div
        className={`${base} border border-slate-700 bg-white`}
      >
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
        className={`${base} bg-violet-500/15 text-violet-300`}
      >
        <Building2
          size={size === 'lg' ? 26 : 21}
        />
      </div>
    )
  }

  if (type === 'building') {
    return (
      <div
        className={`${base} bg-amber-500/15 text-amber-300`}
      >
        <Building
          size={size === 'lg' ? 26 : 21}
        />
      </div>
    )
  }

  return (
    <div
      className={`${base} bg-blue-500/15 text-blue-300`}
    >
      <UserRound
        size={size === 'lg' ? 26 : 21}
      />
    </div>
  )
}

export function CustomersPage() {
  const navigate = useNavigate()

  const [customers, setCustomers] =
    useState<Customer[]>([])
  const [isLoading, setIsLoading] =
    useState(true)
  const [isSaving, setIsSaving] =
    useState(false)
  const [loadError, setLoadError] =
    useState('')

  const [searchValue, setSearchValue] =
    useState('')
  const [typeFilter, setTypeFilter] =
    useState<'all' | CustomerType>('all')

  const [isModalOpen, setIsModalOpen] =
    useState(false)
  const [customerType, setCustomerType] =
    useState<CustomerType>('person')

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] =
    useState('')
  const [logo, setLogo] = useState('')
  const [oib, setOib] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] =
    useState('')
  const [iban, setIban] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsLoading(true)
        setLoadError('')

        const savedCustomers =
          await getCustomers()

        if (!cancelled) {
          setCustomers(savedCustomers)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Investitore nije moguće učitati.',
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
  }, [])

  useEffect(() => {
    document.body.style.overflow =
      isModalOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  useEffect(() => {
    if (!isModalOpen) return

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === 'Escape' &&
        !isSaving
      ) {
        closeModal()
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
  }, [isModalOpen, isSaving])

  const filteredCustomers = useMemo(() => {
    const normalizedSearch =
      searchValue
        .toLocaleLowerCase('hr-HR')
        .trim()

    return customers.filter(
      (customer) => {
        const matchesType =
          typeFilter === 'all' ||
          customer.type === typeFilter

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
          .toLocaleLowerCase('hr-HR')

        return (
          matchesType &&
          (!normalizedSearch ||
            searchableText.includes(
              normalizedSearch,
            ))
        )
      },
    )
  }, [
    customers,
    searchValue,
    typeFilter,
  ])

  const counts = useMemo(
    () => ({
      all: customers.length,
      person: customers.filter(
        (customer) =>
          customer.type === 'person',
      ).length,
      company: customers.filter(
        (customer) =>
          customer.type === 'company',
      ).length,
      building: customers.filter(
        (customer) =>
          customer.type === 'building',
      ).length,
    }),
    [customers],
  )

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
    if (isSaving) return
    setIsModalOpen(false)
    resetForm()
  }

  function selectCustomerType(
    type: CustomerType,
  ) {
    setCustomerType(type)

    if (type !== 'company') {
      setLogo('')
    }
  }

  function handleLogoUpload(
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

    if (
      !allowedTypes.includes(file.type)
    ) {
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
        typeof reader.result === 'string'
      ) {
        setLogo(reader.result)
      }
    }

    reader.onerror = () => {
      window.alert(
        'Logo nije moguće učitati. Pokušajte ponovno.',
      )
    }

    reader.readAsDataURL(file)
  }

  async function handleAddCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSaving) return

    const cleanName = name.trim()
    const cleanOib =
      oib.replace(/\D/g, '')
    const cleanEmail =
      email.trim().toLowerCase()
    const cleanIban =
      iban
        .replace(/\s+/g, '')
        .toUpperCase()

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

      const newCustomer =
        await createCustomer({
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
          phone: phone.trim(),
          email: cleanEmail,
          street: street.trim(),
          city: city.trim(),
          postalCode:
            postalCode.trim(),
          iban: cleanIban,
          notes: notes.trim(),
          status: 'Aktivan',
        })

      setCustomers((current) => [
        newCustomer,
        ...current,
      ])

      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Investitora nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function openCustomer(
    customerId: string,
  ) {
    navigate(
      `/customers/${customerId}`,
    )
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
          <h2 className="text-xl font-black text-white">
            Investitore nije moguće
            učitati
          </h2>

          <p className="mt-3 text-sm text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-5 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-4 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
                INVESTITORI
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Svi investitori
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Osobe, tvrtke, obrti i
                zgrade na jednom mjestu.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsModalOpen(true)
              }
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30 active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"
              aria-label="Novi investitor"
            >
              <Plus size={21} />
              <span className="hidden text-sm font-black sm:inline">
                Novi investitor
              </span>
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-4 gap-2">
            <MetricCard
              label="Ukupno"
              value={counts.all}
              active={
                typeFilter === 'all'
              }
              onClick={() =>
                setTypeFilter('all')
              }
            />
            <MetricCard
              label="Osobe"
              value={counts.person}
              active={
                typeFilter === 'person'
              }
              onClick={() =>
                setTypeFilter('person')
              }
            />
            <MetricCard
              label="Tvrtke"
              value={counts.company}
              active={
                typeFilter === 'company'
              }
              onClick={() =>
                setTypeFilter('company')
              }
            />
            <MetricCard
              label="Zgrade"
              value={counts.building}
              active={
                typeFilter === 'building'
              }
              onClick={() =>
                setTypeFilter('building')
              }
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value,
                )
              }
              placeholder="Pretraži naziv, OIB, telefon, grad..."
              className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="relative mt-3 sm:hidden">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as
                    | 'all'
                    | CustomerType,
                )
              }
              className="h-11 w-full appearance-none rounded-2xl bg-slate-800 px-4 pr-10 font-bold text-white outline-none"
            >
              <option value="all">
                Sve vrste investitora
              </option>
              <option value="person">
                Fizičke osobe
              </option>
              <option value="company">
                Tvrtke i obrti
              </option>
              <option value="building">
                Zgrade
              </option>
            </select>

            <ChevronDown
              size={17}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </section>

        <section>
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              POPIS
            </p>
            <h2 className="mt-1 text-lg font-black text-white">
              {filteredCustomers.length}{' '}
              prikazano
            </h2>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredCustomers.map(
              (customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() =>
                    openCustomer(
                      customer.id,
                    )
                  }
                  className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-4 text-left transition active:scale-[0.99] active:border-blue-500/35"
                >
                  <div className="flex items-start gap-3">
                    <CustomerTypeIcon
                      type={customer.type}
                      logo={customer.logo}
                      name={customer.name}
                      size="lg"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-black text-white">
                            {customer.name}
                          </h3>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            {
                              customerTypeLabels[
                                customer.type
                              ]
                            }
                            {customer.contactPerson
                              ? ` · ${customer.contactPerson}`
                              : ''}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                            customer.status ===
                            'Aktivan'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <InfoLine
                          icon={
                            <Phone
                              size={14}
                            />
                          }
                          value={
                            customer.phone ||
                            'Bez telefona'
                          }
                        />
                        <InfoLine
                          icon={
                            <MapPin
                              size={14}
                            />
                          }
                          value={
                            customer.city ||
                            'Bez grada'
                          }
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Nalozi
                          </p>
                          <p className="mt-0.5 text-sm font-black text-white">
                            {
                              customer.workOrders
                            }
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Ukupno
                          </p>
                          <p className="mt-0.5 text-sm font-black text-white">
                            {
                              customer.totalSpent
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="border-b border-slate-800 bg-slate-800/40">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">
                      Investitor
                    </th>
                    <th className="px-6 py-4">
                      OIB
                    </th>
                    <th className="px-6 py-4">
                      Kontakt
                    </th>
                    <th className="px-6 py-4">
                      Grad
                    </th>
                    <th className="px-6 py-4">
                      Nalozi
                    </th>
                    <th className="px-6 py-4">
                      Ukupno
                    </th>
                    <th className="px-6 py-4">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredCustomers.map(
                    (customer) => (
                      <tr
                        key={customer.id}
                        onClick={() =>
                          openCustomer(
                            customer.id,
                          )
                        }
                        className="cursor-pointer transition hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <CustomerTypeIcon
                              type={
                                customer.type
                              }
                              logo={
                                customer.logo
                              }
                              name={
                                customer.name
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-white">
                                {
                                  customer.name
                                }
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  customerTypeLabels[
                                    customer
                                      .type
                                  ]
                                }
                                {customer.contactPerson
                                  ? ` · ${customer.contactPerson}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-300">
                          {customer.oib ||
                            '—'}
                        </td>

                        <td className="px-6 py-5">
                          <div className="space-y-1.5 text-sm text-slate-400">
                            <p className="flex items-center gap-2">
                              <Phone
                                size={14}
                              />
                              {customer.phone ||
                                'Nije uneseno'}
                            </p>
                            <p className="flex items-center gap-2">
                              <Mail
                                size={14}
                              />
                              {customer.email ||
                                'Nije uneseno'}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="flex items-center gap-2 text-sm text-slate-300">
                            <MapPin
                              size={15}
                              className="text-slate-500"
                            />
                            {customer.city ||
                              '—'}
                          </span>
                        </td>

                        <td className="px-6 py-5 font-semibold text-white">
                          {
                            customer.workOrders
                          }
                        </td>

                        <td className="px-6 py-5 font-semibold text-white">
                          {
                            customer.totalSpent
                          }
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              customer.status ===
                              'Aktivan'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {
                              customer.status
                            }
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredCustomers.length ===
            0 && (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
              <Search
                size={30}
                className="mx-auto text-slate-600"
              />
              <p className="mt-3 font-black text-white">
                Nema pronađenih
                investitora
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Promijeni pretragu ili
                odabrani filtar.
              </p>
            </div>
          )}
        </section>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end bg-black/75 pt-[var(--fersys-safe-top)] backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Novi investitor"
        >
          <div className="flex max-h-[calc(100dvh-var(--fersys-safe-top))] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[94dvh] sm:max-w-3xl sm:rounded-3xl sm:border">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/98 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  NOVI INVESTITOR
                </p>
                <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  Unos podataka
                </h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400 active:scale-95 disabled:opacity-40"
                aria-label="Zatvori obrazac"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddCustomer}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-6">
                <div>
                  <span className="text-sm font-black text-slate-300">
                    Vrsta investitora
                  </span>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <TypeButton
                      active={
                        customerType ===
                        'person'
                      }
                      onClick={() =>
                        selectCustomerType(
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
                        customerType ===
                        'company'
                      }
                      onClick={() =>
                        selectCustomerType(
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
                        customerType ===
                        'building'
                      }
                      onClick={() =>
                        selectCustomerType(
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
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field
                    label={
                      customerType ===
                      'person'
                        ? 'Ime i prezime'
                        : customerType ===
                            'company'
                          ? 'Naziv tvrtke ili obrta'
                          : 'Naziv zgrade'
                    }
                    className="md:col-span-2"
                  >
                    <input
                      required
                      autoFocus
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value,
                        )
                      }
                      placeholder={
                        customerType ===
                        'person'
                          ? 'Primjer: Marko Horvat'
                          : customerType ===
                              'company'
                            ? 'Primjer: Instalacije Ferfolja'
                            : 'Primjer: Trg pobjede 21'
                      }
                      className={inputClass}
                    />
                  </Field>

                  {customerType !==
                    'person' && (
                    <Field
                      label="Kontakt osoba"
                      className="md:col-span-2"
                    >
                      <input
                        value={
                          contactPerson
                        }
                        onChange={(event) =>
                          setContactPerson(
                            event.target
                              .value,
                          )
                        }
                        placeholder={
                          customerType ===
                          'building'
                            ? 'Ime predstavnika suvlasnika'
                            : 'Ime i prezime kontakt osobe'
                        }
                        className={
                          inputClass
                        }
                      />
                    </Field>
                  )}

                  {customerType ===
                    'company' && (
                    <Field
                      label="Logo tvrtke"
                      className="md:col-span-2"
                    >
                      {!logo ? (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/60 px-5 py-7 text-center active:border-violet-500">
                          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                            <ImagePlus
                              size={23}
                            />
                          </div>
                          <p className="mt-3 font-black text-white">
                            Učitaj logo
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            PNG, JPG ili WEBP ·
                            do 1 MB
                          </p>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={
                              handleLogoUpload
                            }
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">
                            <img
                              src={logo}
                              alt="Logo"
                              className="h-full w-full object-contain p-2"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-black text-white">
                              Logo je učitan
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <label className="cursor-pointer rounded-xl bg-slate-700 px-3 py-2 text-xs font-black text-white">
                                Promijeni
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={
                                    handleLogoUpload
                                  }
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  setLogo('')
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                              >
                                <Trash2
                                  size={14}
                                />
                                Ukloni
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Field>
                  )}

                  <Field label="OIB (nije obavezno)">
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
                    <p className="mt-1.5 text-xs text-slate-500">
                      {oib
                        ? `Uneseno ${oib.length}/11`
                        : 'OIB možete ostaviti prazan.'}
                    </p>
                  </Field>

                  <Field label="Telefon">
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
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
                      inputMode="email"
                      autoCapitalize="none"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value,
                        )
                      }
                      placeholder="email@primjer.hr"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="IBAN">
                    <input
                      autoCapitalize="characters"
                      value={iban}
                      onChange={(event) =>
                        setIban(
                          event.target.value
                            .toUpperCase(),
                        )
                      }
                      placeholder="HR00 0000 0000 0000 0000 0"
                      className={`${inputClass} uppercase`}
                    />
                  </Field>

                  <Field
                    label="Ulica i kućni broj"
                    className="md:col-span-2"
                  >
                    <input
                      value={street}
                      onChange={(event) =>
                        setStreet(
                          event.target.value,
                        )
                      }
                      placeholder="Ulica i kućni broj"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Grad">
                    <input
                      value={city}
                      onChange={(event) =>
                        setCity(
                          event.target.value,
                        )
                      }
                      placeholder="Slavonski Brod"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Poštanski broj">
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      value={postalCode}
                      onChange={(event) =>
                        setPostalCode(
                          event.target.value
                            .replace(
                              /\D/g,
                              '',
                            )
                            .slice(0, 5),
                        )
                      }
                      placeholder="35000"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Napomena"
                    className="md:col-span-2"
                  >
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value,
                        )
                      }
                      placeholder="Dodatne informacije..."
                      className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/30"
                    />
                  </Field>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-800 bg-slate-900/98 p-3 pb-[max(0.75rem,var(--fersys-safe-bottom))] backdrop-blur-xl sm:flex sm:justify-end sm:gap-3 sm:p-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="hidden min-h-12 rounded-2xl bg-slate-800 px-6 font-black text-slate-300 disabled:opacity-40 sm:inline-flex sm:items-center"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-50 sm:w-auto"
                >
                  <Plus size={18} />
                  {isSaving
                    ? 'Spremanje...'
                    : 'Spremi investitora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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

function MetricCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-2 py-3 text-center transition active:scale-[0.98] ${
        active
          ? 'border-blue-500/40 bg-blue-500/10'
          : 'border-white/5 bg-white/[0.035]'
      }`}
    >
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white sm:text-2xl">
        {value}
      </p>
    </button>
  )
}

function InfoLine({
  icon,
  value,
}: {
  icon: ReactNode
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
      <span className="shrink-0 text-slate-500">
        {icon}
      </span>
      <span className="truncate">
        {value}
      </span>
    </div>
  )
}

export default CustomersPage
