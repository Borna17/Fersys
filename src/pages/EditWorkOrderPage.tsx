import {
  ArrowLeft,
  Camera,
  Clock3,
  Euro,
  ImagePlus,
  PackagePlus,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import { SignaturePad } from '../components/SignaturePad'
import {
  getCustomers,
} from '../services/customers.service'
import {
  getEmployees,
  type CompanyEmployee,
} from '../services/employees.service'
import {
  getWorkOrderById,
  updateWorkOrder,
} from '../services/workOrders.service'

import {
  getWorkOrderEditAccess,
} from '../services/workOrderAccess.service'
import type { Customer } from '../types/customer'
import type {
  WorkOrderImage,
  WorkOrderMaterial,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../types/workOrder'
import {
  fileToCompressedDataUrl,
} from '../utils/imageUtils'

function calculateDuration(
  arrival: string,
  departure: string,
) {
  if (!arrival || !departure) {
    return 0
  }

  const [
    arrivalHour,
    arrivalMinute,
  ] = arrival
    .split(':')
    .map(Number)

  const [
    departureHour,
    departureMinute,
  ] = departure
    .split(':')
    .map(Number)

  const start =
    arrivalHour * 60 +
    arrivalMinute

  let end =
    departureHour * 60 +
    departureMinute

  if (end < start) {
    end += 24 * 60
  }

  return end - start
}

function durationText(
  minutes: number,
) {
  const hours =
    Math.floor(
      minutes / 60,
    )

  const rest =
    minutes % 60

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) {
    return `${hours} h`
  }

  return `${rest} min`
}

function getRoleLabel(
  role: CompanyEmployee['role'],
) {
  switch (role) {
    case 'owner':
      return 'Vlasnik'
    case 'admin':
      return 'Administrator'
    case 'manager':
      return 'Voditelj'
    case 'worker':
      return 'Radnik'
    case 'assistant':
      return 'Pomoćni radnik'
    case 'intern':
      return 'Praktikant'
    case 'accounting':
      return 'Računovodstvo'
    case 'viewer':
      return 'Samo pregled'
    default:
      return 'Korisnik'
  }
}

export function EditWorkOrderPage() {
  const navigate =
    useNavigate()

  const { id } =
    useParams()

  const { can } =
    useAuth()

  const canViewPrices =
    can(
      'workOrders.viewPrices',
    )

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>([])

  const [
    workers,
    setWorkers,
  ] =
    useState<CompanyEmployee[]>([])

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    loadError,
    setLoadError,
  ] = useState('')

  const [
    workersError,
    setWorkersError,
  ] = useState('')


  const [
    accessDeniedMessage,
    setAccessDeniedMessage,
  ] = useState('')

  const [
    customerId,
    setCustomerId,
  ] = useState('')

  const [
    customerName,
    setCustomerName,
  ] = useState('')

  const [
    customerContactPerson,
    setCustomerContactPerson,
  ] = useState('')

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState('')

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState('')

  const [
    customerOib,
    setCustomerOib,
  ] = useState('')

  const [
    address,
    setAddress,
  ] = useState('')

  const [
    date,
    setDate,
  ] = useState('')

  const [
    arrivalTime,
    setArrivalTime,
  ] = useState('')

  const [
    departureTime,
    setDepartureTime,
  ] = useState('')

  const [
    status,
    setStatus,
  ] =
    useState<WorkOrderStatus>(
      'Novi',
    )

  const [
    priority,
    setPriority,
  ] =
    useState<WorkOrderPriority>(
      'Normalan',
    )

  const [
    title,
    setTitle,
  ] = useState('')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    assignedWorkers,
    setAssignedWorkers,
  ] =
    useState<string[]>([])

  const [
    materials,
    setMaterials,
  ] =
    useState<
      WorkOrderMaterial[]
    >([])

  const [
    labourPrice,
    setLabourPrice,
  ] = useState('0')

  const [
    vatRate,
    setVatRate,
  ] = useState('25')

  const [
    priceNote,
    setPriceNote,
  ] = useState('')

  const [
    investorName,
    setInvestorName,
  ] = useState('')

  const [
    investorSignature,
    setInvestorSignature,
  ] = useState('')

  const [
    images,
    setImages,
  ] =
    useState<
      WorkOrderImage[]
    >([])

  const [
    isUploading,
    setIsUploading,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setLoadError(
          'Radni nalog nije pronađen.',
        )
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setLoadError('')
        setWorkersError('')

        const [
          savedOrder,
          savedCustomers,
          employees,
        ] =
          await Promise.all([
            getWorkOrderById(
              id,
            ),
            getCustomers(),
            getEmployees(),
          ])

        if (
          cancelled
        ) {
          return
        }

        if (!savedOrder) {
          setLoadError(
            'Radni nalog nije pronađen.',
          )
          return
        }

        const access =
          await getWorkOrderEditAccess(
            savedOrder,
          )

        if (!access.allowed) {
          setAccessDeniedMessage(
            access.reason,
          )
          return
        }

        setAccessDeniedMessage('')

        setCustomers(
          savedCustomers,
        )

        setWorkers(
          employees
            .filter(
              (employee) =>
                employee.status ===
                'active',
            )
            .sort(
              (
                first,
                second,
              ) => {
                if (
                  first.role ===
                    'owner' &&
                  second.role !==
                    'owner'
                ) {
                  return -1
                }

                if (
                  second.role ===
                    'owner' &&
                  first.role !==
                    'owner'
                ) {
                  return 1
                }

                return first.fullName.localeCompare(
                  second.fullName,
                  'hr',
                )
              },
            ),
        )

        setCustomerId(
          savedOrder.customerId,
        )

        setCustomerName(
          savedOrder.customerName,
        )

        setCustomerContactPerson(
          savedOrder.customerContactPerson,
        )

        setCustomerPhone(
          savedOrder.customerPhone,
        )

        setCustomerEmail(
          savedOrder.customerEmail,
        )

        setCustomerOib(
          savedOrder.customerOib,
        )

        setAddress(
          savedOrder.address,
        )

        setDate(
          savedOrder.date,
        )

        setArrivalTime(
          savedOrder.arrivalTime,
        )

        setDepartureTime(
          savedOrder.departureTime,
        )

        setStatus(
          savedOrder.status,
        )

        setPriority(
          savedOrder.priority,
        )

        setTitle(
          savedOrder.title,
        )

        setDescription(
          savedOrder.description,
        )

        setAssignedWorkers(
          savedOrder.assignedWorkers,
        )

        setMaterials(
          savedOrder.materials,
        )

        setLabourPrice(
          String(
            savedOrder.labourPrice,
          ),
        )

        setVatRate(
          String(
            savedOrder.vatRate,
          ),
        )

        setPriceNote(
          savedOrder.priceNote,
        )

        setInvestorName(
          savedOrder.investorName,
        )

        setInvestorSignature(
          savedOrder.investorSignature,
        )

        setImages(
          savedOrder.images,
        )
      } catch (error) {
        if (
          !cancelled
        ) {
          setLoadError(
            error instanceof
              Error
              ? error.message
              : 'Radni nalog nije moguće učitati.',
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsLoading(
            false,
          )
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id])

  const durationMinutes =
    useMemo(
      () =>
        calculateDuration(
          arrivalTime,
          departureTime,
        ),
      [
        arrivalTime,
        departureTime,
      ],
    )

  const materialPrice =
    useMemo(
      () =>
        materials.reduce(
          (
            sum,
            material,
          ) =>
            sum +
            material.quantity *
              material.unitPrice,
          0,
        ),
      [materials],
    )

  const subtotal =
    materialPrice +
    (Number(
      labourPrice,
    ) || 0)

  const totalPrice =
    subtotal +
    subtotal *
      ((Number(
        vatRate,
      ) || 0) /
        100)

  function handleCustomerChange(
    value: string,
  ) {
    setCustomerId(value)

    const customer =
      customers.find(
        (item) =>
          item.id === value,
      )

    if (!customer) {
      return
    }

    setCustomerName(
      customer.name,
    )

    setCustomerContactPerson(
      customer.contactPerson ??
        '',
    )

    setCustomerPhone(
      customer.phone,
    )

    setCustomerEmail(
      customer.email,
    )

    setCustomerOib(
      customer.oib,
    )

    setAddress(
      [
        customer.street,
        customer.postalCode,
        customer.city,
      ]
        .filter(Boolean)
        .join(', '),
    )
  }

  function toggleWorker(
    workerName: string,
  ) {
    setAssignedWorkers(
      (current) =>
        current.includes(
          workerName,
        )
          ? current.filter(
              (worker) =>
                worker !==
                workerName,
            )
          : [
              ...current,
              workerName,
            ],
    )
  }

  function addMaterial() {
    setMaterials(
      (current) => [
        ...current,
        {
          id:
            crypto.randomUUID(),
          name: '',
          quantity: 1,
          unit: 'kom',
          unitPrice: 0,
        },
      ],
    )
  }

  function updateMaterial(
    materialId: string,
    key:
      keyof WorkOrderMaterial,
    value:
      string | number,
  ) {
    setMaterials(
      (current) =>
        current.map(
          (material) =>
            material.id ===
            materialId
              ? {
                  ...material,
                  [key]:
                    value,
                }
              : material,
        ),
    )
  }

  function removeMaterial(
    materialId: string,
  ) {
    setMaterials(
      (current) =>
        current.filter(
          (material) =>
            material.id !==
            materialId,
        ),
    )
  }

  async function handleImages(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selected =
      Array.from(
        event.target.files ??
          [],
      )

    if (
      selected.length === 0
    ) {
      return
    }

    const remainingSlots =
      12 - images.length

    if (
      remainingSlots <= 0
    ) {
      alert(
        'Možete dodati najviše 12 fotografija.',
      )

      event.target.value =
        ''
      return
    }

    setIsUploading(true)

    try {
      const compressed =
        await Promise.all(
          selected
            .slice(
              0,
              remainingSlots,
            )
            .map(
              async (
                file,
              ) => ({
                id:
                  crypto.randomUUID(),
                name:
                  file.name,
                dataUrl:
                  await fileToCompressedDataUrl(
                    file,
                  ),
              }),
            ),
        )

      setImages(
        (current) => [
          ...current,
          ...compressed,
        ],
      )
    } catch {
      alert(
        'Jednu ili više slika nije moguće učitati.',
      )
    } finally {
      setIsUploading(false)
      event.target.value =
        ''
    }
  }

  function removeImage(
    imageId: string,
  ) {
    setImages(
      (current) =>
        current.filter(
          (image) =>
            image.id !==
            imageId,
        ),
    )
  }

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !id ||
      isSaving
    ) {
      return
    }

    if (!customerId) {
      alert(
        'Odaberite kupca.',
      )
      return
    }

    if (!title.trim()) {
      alert(
        'Unesite naziv radnog naloga.',
      )
      return
    }

    if (!date) {
      alert(
        'Odaberite datum.',
      )
      return
    }

    const cleanMaterials =
      materials
        .map(
          (material) => ({
            ...material,

            name:
              material.name.trim(),

            unit:
              material.unit.trim() ||
              'kom',

            quantity:
              Math.max(
                0,
                Number(
                  material.quantity,
                ) || 0,
              ),

            /*
             * Ako radnik ne vidi cijene,
             * postojeća cijena materijala
             * ostaje spremljena u stateu i
             * ne prikazuje mu se u UI-u.
             */
            unitPrice:
              Math.max(
                0,
                Number(
                  material.unitPrice,
                ) || 0,
              ),
          }),
        )
        .filter(
          (material) =>
            material.name !==
            '',
        )

    try {
      setIsSaving(true)

      const saved =
        await updateWorkOrder(
          id,
          {
            customerId,

            customerName:
              customerName.trim(),

            customerContactPerson:
              customerContactPerson.trim(),

            customerPhone:
              customerPhone.trim(),

            customerEmail:
              customerEmail.trim(),

            customerOib:
              customerOib
                .replace(
                  /\D/g,
                  '',
                )
                .slice(
                  0,
                  11,
                ),

            address:
              address.trim(),

            date,
            arrivalTime,
            departureTime,
            durationMinutes,

            title:
              title.trim(),

            description:
              description.trim(),

            materials:
              cleanMaterials,

            assignedWorkers,

            /*
             * Radnik bez prava za cijene
             * ne šalje financijska polja.
             * updateWorkOrder će sačuvati
             * njihove postojeće vrijednosti.
             */
            ...(canViewPrices
              ? {
                  labourPrice:
                    Math.max(
                      0,
                      Number(
                        labourPrice,
                      ) || 0,
                    ),

                  materialPrice:
                    cleanMaterials.reduce(
                      (
                        sum,
                        material,
                      ) =>
                        sum +
                        material.quantity *
                          material.unitPrice,
                      0,
                    ),

                  vatRate:
                    Math.max(
                      0,
                      Number(
                        vatRate,
                      ) || 0,
                    ),

                  totalPrice:
                    Math.max(
                      0,
                      totalPrice,
                    ),

                  priceNote:
                    priceNote.trim(),
                }
              : {}),

            investorName:
              investorName.trim(),

            investorSignature,

            images,

            status,
            priority,
          },
        )

      navigate(
        `/work-orders/${saved.id}`,
        {
          replace: true,
        },
      )
    } catch (error) {
      alert(
        error instanceof
          Error
          ? error.message
          : 'Radni nalog nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje radnog naloga..." />
    )
  }

  if (accessDeniedMessage) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-amber-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Nemaš pravo uređivati ovaj nalog
          </h1>

          <p className="mt-3 text-sm leading-6 text-amber-200">
            {accessDeniedMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/work-orders/${id}`,
              )
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Povratak na nalog
          </button>
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Radni nalog nije moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/work-orders',
              )
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Povratak
          </button>
        </div>
      </section>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-[1500px] space-y-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/work-orders/${id}`,
              )
            }
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft
              size={18}
            />
            Povratak na radni nalog
          </button>

          <h1 className="text-3xl font-extrabold text-white">
            Uredi radni nalog
          </h1>

          <p className="mt-2 text-slate-400">
            Dopuni ili ispravi postojeći nalog. Sve promjene se spremaju na isti radni nalog.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            isSaving ||
            isUploading
          }
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          <Save size={19} />
          {isSaving
            ? 'Spremanje...'
            : 'Spremi izmjene'}
        </button>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">
          1. Kupac i lokacija
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-300">
              Kupac
            </span>

            <select
              required
              value={
                customerId
              }
              onChange={(event) =>
                handleCustomerChange(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            >
              <option value="">
                Odaberi kupca
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={
                      customer.id
                    }
                    value={
                      customer.id
                    }
                  >
                    {
                      customer.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Kontakt osoba
            </span>

            <input
              value={
                customerContactPerson
              }
              onChange={(event) =>
                setCustomerContactPerson(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Telefon
            </span>

            <input
              value={
                customerPhone
              }
              onChange={(event) =>
                setCustomerPhone(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              E-mail
            </span>

            <input
              type="email"
              value={
                customerEmail
              }
              onChange={(event) =>
                setCustomerEmail(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              OIB
            </span>

            <input
              value={
                customerOib
              }
              onChange={(event) =>
                setCustomerOib(
                  event.target.value,
                )
              }
              maxLength={11}
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-300">
              Adresa radova
            </span>

            <input
              value={address}
              onChange={(event) =>
                setAddress(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Clock3 className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">
            2. Datum, vrijeme i status
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-300">
              Datum
            </span>

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white [color-scheme:dark]"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Dolazak
            </span>

            <input
              type="time"
              value={
                arrivalTime
              }
              onChange={(event) =>
                setArrivalTime(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white [color-scheme:dark]"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Odlazak
            </span>

            <input
              type="time"
              value={
                departureTime
              }
              onChange={(event) =>
                setDepartureTime(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white [color-scheme:dark]"
            />
          </label>

          <div className="rounded-xl bg-slate-800 p-4">
            <span className="text-xs uppercase text-slate-500">
              Trajanje
            </span>

            <p className="mt-2 font-bold text-white">
              {durationText(
                durationMinutes,
              )}
            </p>
          </div>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Status
            </span>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as WorkOrderStatus,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            >
              {[
                'Novi',
                'Zakazan',
                'U tijeku',
                'Završen',
                'Otkazan',
              ].map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Prioritet
            </span>

            <select
              value={
                priority
              }
              onChange={(event) =>
                setPriority(
                  event.target
                    .value as WorkOrderPriority,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            >
              {[
                'Nizak',
                'Normalan',
                'Visok',
                'Hitno',
              ].map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">
          3. Radovi i radnici
        </h2>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-300">
            Naziv naloga
          </span>

          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-300">
            Opis radova
          </span>

          <textarea
            rows={7}
            value={
              description
            }
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-white"
          />
        </label>

        <div className="mt-5">
          <span className="text-sm font-semibold text-slate-300">
            Radnici
          </span>

          {workersError && (
            <p className="mt-2 text-sm text-red-300">
              {workersError}
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workers.map(
              (worker) => {
                const workerName =
                  worker.fullName.trim()

                const selected =
                  assignedWorkers.includes(
                    workerName,
                  )

                return (
                  <button
                    key={
                      worker.membershipId
                    }
                    type="button"
                    onClick={() =>
                      toggleWorker(
                        workerName,
                      )
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left ${
                      selected
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <UserRound
                      size={19}
                    />

                    <div>
                      <p className="font-semibold">
                        {
                          workerName
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {getRoleLabel(
                          worker.role,
                        )}
                      </p>
                    </div>
                  </button>
                )
              },
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              4. Materijal
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Dodaj naknadno utrošeni materijal ili ispravi količine.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addMaterial
            }
            className="flex h-11 items-center gap-2 rounded-xl bg-slate-800 px-4 font-semibold text-white"
          >
            <PackagePlus
              size={18}
            />
            Dodaj
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {materials.map(
            (material) => (
              <div
                key={
                  material.id
                }
                className={`grid grid-cols-1 gap-3 rounded-xl bg-slate-800/70 p-4 ${
                  canViewPrices
                    ? 'md:grid-cols-[1fr_120px_120px_150px_44px]'
                    : 'md:grid-cols-[1fr_120px_120px_44px]'
                }`}
              >
                <input
                  value={
                    material.name
                  }
                  onChange={(event) =>
                    updateMaterial(
                      material.id,
                      'name',
                      event.target.value,
                    )
                  }
                  placeholder="Naziv materijala"
                  className="h-11 rounded-lg bg-slate-950 px-3 text-white"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    material.quantity
                  }
                  onChange={(event) =>
                    updateMaterial(
                      material.id,
                      'quantity',
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="h-11 rounded-lg bg-slate-950 px-3 text-white"
                />

                <input
                  value={
                    material.unit
                  }
                  onChange={(event) =>
                    updateMaterial(
                      material.id,
                      'unit',
                      event.target.value,
                    )
                  }
                  className="h-11 rounded-lg bg-slate-950 px-3 text-white"
                />

                {canViewPrices && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      material.unitPrice
                    }
                    onChange={(event) =>
                      updateMaterial(
                        material.id,
                        'unitPrice',
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    className="h-11 rounded-lg bg-slate-950 px-3 text-white"
                  />
                )}

                <button
                  type="button"
                  onClick={() =>
                    removeMaterial(
                      material.id,
                    )
                  }
                  className="grid h-11 w-11 place-items-center rounded-lg bg-red-500/10 text-red-400"
                >
                  <Trash2
                    size={18}
                  />
                </button>
              </div>
            ),
          )}
        </div>

        {canViewPrices && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label>
              <span className="text-sm font-semibold text-slate-300">
                Cijena rada
              </span>

              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    labourPrice
                  }
                  onChange={(event) =>
                    setLabourPrice(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-xl bg-slate-800 px-4 pr-10 text-white"
                />

                <Euro
                  size={17}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </label>

            <label>
              <span className="text-sm font-semibold text-slate-300">
                PDV %
              </span>

              <input
                type="number"
                value={
                  vatRate
                }
                onChange={(event) =>
                  setVatRate(
                    event.target.value,
                  )
                }
                className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
              />
            </label>

            <div className="rounded-xl bg-blue-600 p-4">
              <span className="text-xs uppercase text-blue-100">
                Ukupno
              </span>

              <p className="mt-2 text-2xl font-bold text-white">
                {totalPrice.toFixed(
                  2,
                )}{' '}
                €
              </p>
            </div>

            <label className="md:col-span-3">
              <span className="text-sm font-semibold text-slate-300">
                Napomena uz cijenu
              </span>

              <textarea
                rows={3}
                value={
                  priceNote
                }
                onChange={(event) =>
                  setPriceNote(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-white"
              />
            </label>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Camera className="text-violet-400" />

          <h2 className="text-xl font-bold text-white">
            5. Fotografije
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-5 py-5 font-semibold text-white transition hover:border-blue-500 hover:bg-slate-800/80">
            <Camera
              size={22}
              className="text-blue-400"
            />

            Slikaj sada

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={
                handleImages
              }
              className="hidden"
            />
          </label>

          <label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-5 py-5 font-semibold text-white transition hover:border-violet-500 hover:bg-slate-800/80">
            <ImagePlus
              size={22}
              className="text-violet-400"
            />

            Odaberi iz galerije

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={
                handleImages
              }
              className="hidden"
            />
          </label>
        </div>

        <p className="mt-3 text-center text-sm text-slate-500">
          Najviše 12 fotografija. Fotografije se automatski smanjuju prije spremanja.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {images.map(
            (image) => (
              <div
                key={
                  image.id
                }
                className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800"
              >
                <img
                  src={
                    image.dataUrl
                  }
                  alt={
                    image.name
                  }
                  className="aspect-square w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeImage(
                      image.id,
                    )
                  }
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg bg-black/70 text-white"
                >
                  <Trash2
                    size={17}
                  />
                </button>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">
          6. Potpis investitora
        </h2>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-300">
            Ime i prezime
          </span>

          <input
            value={
              investorName
            }
            onChange={(event) =>
              setInvestorName(
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
          />
        </label>

        <div className="mt-5">
          <SignaturePad
            value={
              investorSignature
            }
            onChange={
              setInvestorSignature
            }
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={
            isSaving
          }
          onClick={() =>
            navigate(
              `/work-orders/${id}`,
            )
          }
          className="h-12 rounded-xl bg-slate-800 px-6 font-semibold text-white"
        >
          Odustani
        </button>

        <button
          type="submit"
          disabled={
            isSaving ||
            isUploading
          }
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white disabled:opacity-50"
        >
          <Save size={19} />
          {isSaving
            ? 'Spremanje...'
            : 'Spremi izmjene'}
        </button>
      </div>

      {(isSaving ||
        isUploading) && (
        <FersysLoader
          fullScreen
          text={
            isSaving
              ? 'Spremanje izmjena...'
              : 'Obrada fotografija...'
          }
        />
      )}
    </form>
  )
}

export default EditWorkOrderPage