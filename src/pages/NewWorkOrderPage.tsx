import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  BookmarkPlus,
  Camera,
  Check,
  Clock3,
  Euro,
  ImagePlus,
  PackagePlus,
  Plus,
  Search,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import { SignaturePad } from '../components/SignaturePad'
import { createWorkOrder } from '../services/workOrders.service'
import {
  createWorkOrderTemplate,
  deleteWorkOrderTemplate,
  getWorkOrderTemplates,
  updateWorkOrderTemplate,
  type WorkOrderTemplate,
} from '../services/workOrderTemplates.service'
import { getCustomers } from '../services/customers.service'
import {
  getEmployees,
  type CompanyEmployee,
} from '../services/employees.service'
import type { Customer } from '../types/customer'
import type {
  WorkOrderImage,
  WorkOrderMaterial,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../types/workOrder'
import { fileToCompressedDataUrl } from '../utils/imageUtils'

function calculateDuration(
  arrival: string,
  departure: string,
) {
  if (!arrival || !departure) {
    return 0
  }

  const [arrivalHour, arrivalMinute] =
    arrival.split(':').map(Number)

  const [departureHour, departureMinute] =
    departure.split(':').map(Number)

  const start =
    arrivalHour * 60 + arrivalMinute

  let end =
    departureHour * 60 + departureMinute

  if (end < start) {
    end += 24 * 60
  }

  return end - start
}

function durationText(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

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

export function NewWorkOrderPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewPrices =
    can('workOrders.viewPrices')

  const [customers, setCustomers] =
    useState<Customer[]>([])

  const [
    isLoadingCustomers,
    setIsLoadingCustomers,
  ] = useState(true)

  const [
    customersError,
    setCustomersError,
  ] = useState('')

  const [workers, setWorkers] =
    useState<CompanyEmployee[]>([])

  const [
    isLoadingWorkers,
    setIsLoadingWorkers,
  ] = useState(true)

  const [
    workersError,
    setWorkersError,
  ] = useState('')

  const [isSaving, setIsSaving] =
    useState(false)

  const [customerId, setCustomerId] =
    useState('')

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

  const [address, setAddress] =
    useState('')

  const [date, setDate] = useState(
    new Date()
      .toISOString()
      .slice(0, 10),
  )

  const [
    arrivalTime,
    setArrivalTime,
  ] = useState('')

  const [
    departureTime,
    setDepartureTime,
  ] = useState('')

  const [status, setStatus] =
    useState<WorkOrderStatus>('Novi')

  const [priority, setPriority] =
    useState<WorkOrderPriority>(
      'Normalan',
    )

  const [title, setTitle] =
    useState('')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    assignedWorkers,
    setAssignedWorkers,
  ] = useState<string[]>([])

  const [
    materials,
    setMaterials,
  ] = useState<WorkOrderMaterial[]>([])

  const [
    labourPrice,
    setLabourPrice,
  ] = useState('0')

  const [vatRate, setVatRate] =
    useState('25')

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

  const [images, setImages] =
    useState<WorkOrderImage[]>([])

  const [
    isUploading,
    setIsUploading,
  ] = useState(false)


  const [
    templates,
    setTemplates,
  ] =
    useState<WorkOrderTemplate[]>([])

  const [
    isLoadingTemplates,
    setIsLoadingTemplates,
  ] = useState(true)

  const [
    templatesError,
    setTemplatesError,
  ] = useState('')

  const [
    templateSearch,
    setTemplateSearch,
  ] = useState('')

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState('')

  const [
    showTemplateModal,
    setShowTemplateModal,
  ] = useState(false)

  const [
    templateName,
    setTemplateName,
  ] = useState('')

  const [
    isSavingTemplate,
    setIsSavingTemplate,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCustomers() {
      try {
        setIsLoadingCustomers(true)
        setCustomersError('')

        const savedCustomers =
          await getCustomers()

        if (!cancelled) {
          setCustomers(savedCustomers)
        }
      } catch (error) {
        if (!cancelled) {
          setCustomersError(
            error instanceof Error
              ? error.message
              : 'Kupce nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCustomers(false)
        }
      }
    }

    void loadCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadWorkers() {
      try {
        setIsLoadingWorkers(true)
        setWorkersError('')

        const employees =
          await getEmployees()

        if (cancelled) {
          return
        }

        const activeEmployees =
          employees
            .filter(
              (employee) =>
                employee.status === 'active',
            )
            .sort((a, b) => {
              if (
                a.role === 'owner' &&
                b.role !== 'owner'
              ) {
                return -1
              }

              if (
                b.role === 'owner' &&
                a.role !== 'owner'
              ) {
                return 1
              }

              return a.fullName.localeCompare(
                b.fullName,
                'hr',
              )
            })

        setWorkers(activeEmployees)
      } catch (error) {
        if (!cancelled) {
          setWorkersError(
            error instanceof Error
              ? error.message
              : 'Radnike nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkers(false)
        }
      }
    }

    void loadWorkers()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadTemplates() {
      try {
        setIsLoadingTemplates(
          true,
        )

        setTemplatesError('')

        const saved =
          await getWorkOrderTemplates()

        if (!cancelled) {
          setTemplates(saved)
        }
      } catch (error) {
        if (!cancelled) {
          setTemplatesError(
            error instanceof Error
              ? error.message
              : 'Predloške nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTemplates(
            false,
          )
        }
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredTemplates =
    useMemo(() => {
      const search =
        templateSearch
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      if (!search) {
        return templates
      }

      return templates.filter(
        (template) =>
          [
            template.name,
            template.title,
            template.description,
            ...template.materials.map(
              (material) =>
                material.name,
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'hr-HR',
            )
            .includes(search),
      )
    }, [
      templates,
      templateSearch,
    ])

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
          (sum, material) =>
            sum +
            material.quantity *
              material.unitPrice,
          0,
        ),
      [materials],
    )

  const subtotal =
    materialPrice +
    (Number(labourPrice) || 0)

  const totalPrice =
    subtotal +
    subtotal *
      ((Number(vatRate) || 0) / 100)

  function applyTemplate(
    template: WorkOrderTemplate,
  ) {
    setSelectedTemplateId(
      template.id,
    )

    setTitle(
      template.title,
    )

    setDescription(
      template.description,
    )

    setPriority(
      template.priority,
    )

    setMaterials(
      template.materials.map(
        (material) => ({
          id:
            crypto.randomUUID(),

          name:
            material.name,

          quantity:
            material.quantity,

          unit:
            material.unit,

          unitPrice:
            0,
        }),
      ),
    )
  }

  function openSaveTemplate() {
    if (
      !title.trim() &&
      !description.trim() &&
      materials.length === 0
    ) {
      alert(
        'Prvo unesite naziv, opis ili materijal koji želite spremiti kao predložak.',
      )

      return
    }

    const selected =
      templates.find(
        (template) =>
          template.id ===
          selectedTemplateId,
      )

    setTemplateName(
      selected?.name ||
      title.trim() ||
      '',
    )

    setShowTemplateModal(
      true,
    )
  }

  async function saveTemplate(
    replaceExisting = false,
  ) {
    const name =
      templateName.trim()

    if (!name) {
      alert(
        'Unesite naziv predloška.',
      )
      return
    }

    try {
      setIsSavingTemplate(
        true,
      )

      const input = {
        name,
        title,
        description,
        materials,
        priority,
      }

      const selected =
        templates.find(
          (template) =>
            template.id ===
            selectedTemplateId,
        )

      const saved =
        replaceExisting &&
        selected
          ? await updateWorkOrderTemplate(
              selected.id,
              input,
            )
          : await createWorkOrderTemplate(
              input,
            )

      setTemplates(
        (current) => {
          const exists =
            current.some(
              (template) =>
                template.id ===
                saved.id,
            )

          const next =
            exists
              ? current.map(
                  (template) =>
                    template.id ===
                    saved.id
                      ? saved
                      : template,
                )
              : [
                  ...current,
                  saved,
                ]

          return next.sort(
            (first, second) =>
              first.name.localeCompare(
                second.name,
                'hr',
              ),
          )
        },
      )

      setSelectedTemplateId(
        saved.id,
      )

      setShowTemplateModal(
        false,
      )

      setTemplateName('')

      alert(
        replaceExisting &&
        selected
          ? 'Predložak je ažuriran.'
          : 'Predložak je spremljen.',
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Predložak nije moguće spremiti.',
      )
    } finally {
      setIsSavingTemplate(
        false,
      )
    }
  }

  async function removeTemplate(
    template: WorkOrderTemplate,
  ) {
    const confirmed =
      window.confirm(
        `Obrisati predložak "${template.name}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      await deleteWorkOrderTemplate(
        template.id,
      )

      setTemplates(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              template.id,
          ),
      )

      if (
        selectedTemplateId ===
        template.id
      ) {
        setSelectedTemplateId(
          '',
        )
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Predložak nije moguće obrisati.',
      )
    }
  }

  function handleCustomerChange(
    value: string,
  ) {
    setCustomerId(value)

    const customer =
      customers.find(
        (item) => item.id === value,
      )

    if (!customer) {
      setCustomerName('')
      setCustomerContactPerson('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerOib('')
      setAddress('')
      setInvestorName('')
      return
    }

    setCustomerName(customer.name)
    setCustomerContactPerson(
      customer.contactPerson ?? '',
    )
    setCustomerPhone(customer.phone)
    setCustomerEmail(customer.email)
    setCustomerOib(customer.oib)

    setAddress(
      [
        customer.street,
        customer.postalCode,
        customer.city,
      ]
        .filter(Boolean)
        .join(', '),
    )

    setInvestorName(
      customer.contactPerson ||
        customer.name,
    )
  }

  function toggleWorker(
    worker: string,
  ) {
    setAssignedWorkers(
      (current) =>
        current.includes(worker)
          ? current.filter(
              (item) =>
                item !== worker,
            )
          : [
              ...current,
              worker,
            ],
    )
  }

  function addMaterial() {
    setMaterials(
      (current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: '',
          quantity: 1,
          unit: 'kom',
          unitPrice: 0,
        },
      ],
    )
  }

  function updateMaterial(
    id: string,
    key: keyof WorkOrderMaterial,
    value: string | number,
  ) {
    setMaterials(
      (current) =>
        current.map(
          (material) =>
            material.id === id
              ? {
                  ...material,
                  [key]: value,
                }
              : material,
        ),
    )
  }

  function removeMaterial(
    id: string,
  ) {
    setMaterials(
      (current) =>
        current.filter(
          (material) =>
            material.id !== id,
        ),
    )
  }

  async function handleImages(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selected =
      Array.from(
        event.target.files ?? [],
      )

    if (selected.length === 0) {
      return
    }

    const remainingSlots =
      12 - images.length

    if (remainingSlots <= 0) {
      alert(
        'Možete dodati najviše 12 fotografija.',
      )

      event.target.value = ''
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
              async (file) => ({
                id: crypto.randomUUID(),
                name: file.name,
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
      event.target.value = ''
    }
  }

  function removeImage(
    id: string,
  ) {
    setImages(
      (current) =>
        current.filter(
          (image) =>
            image.id !== id,
        ),
    )
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSaving) {
      return
    }

    if (!customerId) {
      alert('Odaberite investitora.')
      return
    }

    if (!title.trim()) {
      alert(
        'Unesite naziv radnog naloga.',
      )
      return
    }

    if (!date) {
      alert('Odaberite datum.')
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

            unitPrice:
              canViewPrices
                ? Math.max(
                    0,
                    Number(
                      material.unitPrice,
                    ) || 0,
                  )
                : 0,
          }),
        )
        .filter(
          (material) =>
            material.name !== '',
        )

    try {
      setIsSaving(true)

      const createdOrder =
        await createWorkOrder({
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
              .replace(/\D/g, '')
              .slice(0, 11),

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

          labourPrice:
            canViewPrices
              ? Math.max(
                  0,
                  Number(
                    labourPrice,
                  ) || 0,
                )
              : 0,

          materialPrice:
            canViewPrices
              ? cleanMaterials.reduce(
                  (
                    sum,
                    material,
                  ) =>
                    sum +
                    material.quantity *
                      material.unitPrice,
                  0,
                )
              : 0,

          vatRate:
            canViewPrices
              ? Math.max(
                  0,
                  Number(
                    vatRate,
                  ) || 0,
                )
              : 0,

          totalPrice:
            canViewPrices
              ? Math.max(
                  0,
                  totalPrice,
                )
              : 0,

          priceNote:
            canViewPrices
              ? priceNote.trim()
              : '',

          investorName:
            investorName.trim(),

          investorSignature,

          images,

          status,
          priority,
        })

      navigate(
        `/work-orders/${createdOrder.id}`,
      )
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Radni nalog nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingCustomers) {
    return (
      <FersysLoader
        text="Učitavanje investitora..."
      />
    )
  }

  if (customersError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Kupce nije moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm text-red-300">
            {customersError}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Pokušaj ponovno
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
                '/work-orders',
              )
            }
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft size={18} />
            Povratak na radne naloge
          </button>

          <h1 className="text-3xl font-extrabold text-white">
            Novi radni nalog
          </h1>

          <p className="mt-2 text-slate-400">
            Unesi podatke, fotografije i potpis investitora.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            isSaving ||
            customers.length === 0
          }
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={19} />

          {isSaving
            ? 'Spremanje...'
            : 'Spremi radni nalog'}
        </button>
      </div>

      {customers.length === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-300">
            Prvo je potrebno dodati investitora.
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Radni nalog mora biti povezan s investitorom iz vaše tvrtke.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/customers',
              )
            }
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950"
          >
            Otvori kupce
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">
          1. Investitor i lokacija
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-semibold text-slate-300">
              Investitor
            </span>

            <select
              required
              value={customerId}
              onChange={(event) =>
                handleCustomerChange(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">
                Odaberi investitora
              </option>

              {customers
                .filter(
                  (customer) =>
                    customer.status ===
                    'Aktivan',
                )
                .map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name} · OIB {customer.oib}
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
              value={customerPhone}
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
              value={customerEmail}
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
              inputMode="numeric"
              maxLength={11}
              value={customerOib}
              onChange={(event) =>
                setCustomerOib(
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 11),
                )
              }
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
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Clock3 className="text-blue-400" />

          <h2 className="text-xl font-bold text-white">
            2. Datum, dolazak i odlazak
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
              value={arrivalTime}
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
              value={departureTime}
              onChange={(event) =>
                setDepartureTime(
                  event.target.value,
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white [color-scheme:dark]"
            />
          </label>

          <div className="rounded-xl bg-slate-800 p-4">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Trajanje
            </span>

            <p className="mt-2 text-lg font-bold text-white">
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
              ].map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-300">
              Prioritet
            </span>

            <select
              value={priority}
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
              ].map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              3. Radovi i radnici
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Odaberi spremljeni predložak ili unesi novi opis radova.
            </p>
          </div>

          <button
            type="button"
            onClick={
              openSaveTemplate
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-bold text-violet-300 transition hover:bg-violet-500/15"
          >
            <BookmarkPlus
              size={18}
            />
            Spremi kao predložak
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold text-white">
                Predlošci radova
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Jednim klikom ubaci naziv, opis i materijal. Nakon toga sve možeš normalno izmijeniti.
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={
                  templateSearch
                }
                onChange={(event) =>
                  setTemplateSearch(
                    event.target.value,
                  )
                }
                placeholder="Pretraži predloške..."
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {isLoadingTemplates ? (
            <p className="mt-4 text-sm text-slate-500">
              Učitavanje predložaka...
            </p>
          ) : templatesError ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {templatesError}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-5 text-center">
              <p className="font-semibold text-slate-300">
                {templates.length === 0
                  ? 'Još nema spremljenih predložaka.'
                  : 'Nema predložaka za ovu pretragu.'}
              </p>

              {templates.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Unesi prvi rad, opis i materijal pa klikni „Spremi kao predložak”.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map(
                (template) => {
                  const active =
                    selectedTemplateId ===
                    template.id

                  return (
                    <div
                      key={
                        template.id
                      }
                      className={`rounded-xl border p-3 transition ${
                        active
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-slate-800 bg-slate-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          applyTemplate(
                            template,
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                              active
                                ? 'bg-violet-500 text-white'
                                : 'bg-slate-800 text-violet-300'
                            }`}
                          >
                            {active ? (
                              <Check
                                size={17}
                              />
                            ) : (
                              <BookmarkPlus
                                size={17}
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">
                              {
                                template.name
                              }
                            </p>

                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {template.title ||
                                template.description ||
                                'Predložak radnog naloga'}
                            </p>

                            <p className="mt-2 text-[11px] font-semibold text-slate-600">
                              {
                                template.materials.length
                              }{' '}
                              stavki materijala
                            </p>
                          </div>
                        </div>
                      </button>

                      <div className="mt-3 flex justify-end border-t border-slate-800 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            void removeTemplate(
                              template,
                            )
                          }
                          className="rounded-lg px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-500/10"
                        >
                          Obriši
                        </button>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Naziv radnog naloga
            </span>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Primjer: Servis klima uređaja"
              className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-300">
              Opis radova
            </span>

            <textarea
              rows={7}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Detaljno opiši izvedene ili planirane radove..."
              className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-white"
            />
          </label>

          <div>
            <span className="text-sm font-semibold text-slate-300">
              Radnici
            </span>

            <p className="mt-1 text-xs text-slate-500">
              Prikazuju se aktivni članovi vaše tvrtke. Vlasnik je uvijek prvi.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isLoadingWorkers ? (
                <div className="col-span-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-400">
                  Učitavanje radnika...
                </div>
              ) : workersError ? (
                <div className="col-span-full rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm font-semibold text-red-300">
                    Radnike nije moguće učitati.
                  </p>

                  <p className="mt-1 break-words text-xs text-red-300/80">
                    {workersError}
                  </p>
                </div>
              ) : workers.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">
                  Nema aktivnih članova tvrtke.
                </div>
              ) : (
                workers.map(
                  (worker) => {
                    const workerName =
                      worker.fullName.trim()

                    const isSelected =
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
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left font-semibold transition ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/80'
                        }`}
                      >
                        <UserRound
                          size={19}
                          className={
                            isSelected
                              ? 'text-blue-400'
                              : ''
                          }
                        />

                        <div className="min-w-0">
                          <p className="truncate">
                            {workerName}
                          </p>

                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {getRoleLabel(
                              worker.role,
                            )}
                          </p>
                        </div>
                      </button>
                    )
                  },
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              4. Materijal i cijena
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Dodaj utrošeni materijal, cijenu rada i PDV.
            </p>
          </div>

          <button
            type="button"
            onClick={addMaterial}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 font-semibold text-white"
          >
            <PackagePlus size={18} />
            Dodaj materijal
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {materials.map(
            (material) => (
              <div
                key={material.id}
                className={`grid grid-cols-1 gap-3 rounded-xl bg-slate-800/70 p-4 ${
                  canViewPrices
                    ? 'md:grid-cols-[1fr_120px_120px_150px_44px]'
                    : 'md:grid-cols-[1fr_120px_120px_44px]'
                }`}
              >
                <input
                  value={material.name}
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
                  value={material.quantity}
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
                  value={material.unit}
                  onChange={(event) =>
                    updateMaterial(
                      material.id,
                      'unit',
                      event.target.value,
                    )
                  }
                  placeholder="kom"
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
                    placeholder="Cijena"
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
                  className="flex h-11 items-center justify-center rounded-lg bg-red-500/10 text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ),
          )}

          {materials.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-500">
              Još nema dodanog materijala.
            </p>
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
                  value={labourPrice}
                  onChange={(event) =>
                    setLabourPrice(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-xl bg-slate-800 px-4 pr-12 text-white"
                />

                <Euro
                  size={18}
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
                min="0"
                max="100"
                value={vatRate}
                onChange={(event) =>
                  setVatRate(
                    event.target.value,
                  )
                }
                className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
              />
            </label>

            <div className="rounded-xl bg-blue-600 p-4">
              <span className="text-xs font-semibold uppercase text-blue-100">
                Ukupno s PDV-om
              </span>

              <p className="mt-2 text-2xl font-bold text-white">
                {totalPrice.toFixed(2)} €
              </p>
            </div>

            <label className="md:col-span-3">
              <span className="text-sm font-semibold text-slate-300">
                Napomena uz cijenu
              </span>

              <textarea
                rows={3}
                value={priceNote}
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
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
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
              onChange={handleImages}
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
              onChange={handleImages}
              className="hidden"
            />
          </label>
        </div>

        <p className="mt-3 text-center text-sm text-slate-500">
          Najviše 12 fotografija. Fotografije se automatski smanjuju prije spremanja.
        </p>

        {isUploading && (
          <FersysLoader
            compact
            text="Obrada fotografija..."
          />
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {images.map(
            (image) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800"
              >
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="aspect-square w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeImage(
                      image.id,
                    )
                  }
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-black/70 text-white"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-white">
          6. Potpis investitora
        </h2>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-300">
            Ime i prezime investitora
          </span>

          <input
            value={investorName}
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
            value={investorSignature}
            onChange={
              setInvestorSignature
            }
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            navigate(
              '/work-orders',
            )
          }
          className="h-12 rounded-xl bg-slate-800 px-6 font-semibold text-white disabled:opacity-50"
        >
          Odustani
        </button>

        <button
          type="submit"
          disabled={
            isSaving ||
            customers.length === 0
          }
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={19} />

          {isSaving
            ? 'Spremanje...'
            : 'Spremi radni nalog'}
        </button>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-400">
              Predložak radnog naloga
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Spremi ovaj rad za ubuduće
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Spremit će se naziv radnog naloga, opis, prioritet i popis materijala. Investitor, datum, radnici, potpis i fotografije se ne spremaju.
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-300">
                Naziv predloška
              </span>

              <input
                autoFocus
                value={
                  templateName
                }
                onChange={(event) =>
                  setTemplateName(
                    event.target.value,
                  )
                }
                placeholder="Npr. Izmjena kotlića"
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:border-violet-500"
              />
            </label>

            <div className="mt-5 rounded-xl bg-slate-950/60 p-4">
              <p className="text-xs font-black uppercase text-slate-600">
                Sprema se
              </p>

              <p className="mt-2 font-bold text-white">
                {title.trim() ||
                  'Bez naziva radnog naloga'}
              </p>

              <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-500">
                {description.trim() ||
                  'Bez opisa'}
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-600">
                {materials.filter(
                  (material) =>
                    material.name.trim(),
                ).length}{' '}
                stavki materijala
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  isSavingTemplate
                }
                onClick={() => {
                  setShowTemplateModal(
                    false,
                  )
                  setTemplateName('')
                }}
                className="h-11 rounded-xl bg-slate-800 px-4 font-bold text-white"
              >
                Odustani
              </button>

              {selectedTemplateId &&
                templates.some(
                  (template) =>
                    template.id ===
                    selectedTemplateId,
                ) && (
                  <button
                    type="button"
                    disabled={
                      isSavingTemplate
                    }
                    onClick={() =>
                      void saveTemplate(
                        true,
                      )
                    }
                    className="h-11 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 font-bold text-blue-300 disabled:opacity-50"
                  >
                    Ažuriraj postojeći
                  </button>
                )}

              <button
                type="button"
                disabled={
                  isSavingTemplate
                }
                onClick={() =>
                  void saveTemplate(
                    false,
                  )
                }
                className="h-11 rounded-xl bg-violet-600 px-4 font-bold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {isSavingTemplate
                  ? 'Spremanje...'
                  : 'Spremi novi predložak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje radnog naloga..."
        />
      )}
    </form>
  )
}

export default NewWorkOrderPage