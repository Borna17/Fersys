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
  ArrowLeft,
  BookmarkPlus,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Euro,
  ImagePlus,
  MapPin,
  PackagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'

import { useAuth } from '../auth/AuthProvider'
import DraftAutosaveBadge, {
  type DraftAutosaveState,
} from '../components/DraftAutosaveBadge'
import FersysLoader from '../components/FersysLoader'
import { SignaturePad } from '../components/SignaturePad'
import { getCustomers } from '../services/customers.service'
import {
  syncWorkOrderImagesToCustomerGallery,
} from '../services/customerPhotos.service'
import {
  deleteUserDraft,
  formatDraftSavedAt,
  loadUserDraft,
  saveUserDraft,
} from '../services/drafts.service'
import {
  getEmployees,
  type CompanyEmployee,
} from '../services/employees.service'
import {
  createWorkOrderTemplate,
  deleteWorkOrderTemplate,
  getWorkOrderTemplates,
  updateWorkOrderTemplate,
  type WorkOrderTemplate,
} from '../services/workOrderTemplates.service'
import { createWorkOrder } from '../services/workOrders.service'
import type { Customer } from '../types/customer'
import type {
  WorkOrderImage,
  WorkOrderMaterial,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../types/workOrder'
import { fileToCompressedDataUrl } from '../utils/imageUtils'
import { calculateWorkOrderPricing } from '../utils/workOrderPricing'

const inputClass =
  'h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600'

const FINALIZED_DRAFT_KEY =
  'fersys_finalized_work_order_draft_id'

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
  const [customerName, setCustomerName] =
    useState('')
  const [customerSearch, setCustomerSearch] =
    useState('')
  const [showCustomerResults, setShowCustomerResults] =
    useState(false)
  const [showCustomerDetails, setShowCustomerDetails] =
    useState(false)
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
  const [customerOib, setCustomerOib] =
    useState('')
  const [address, setAddress] =
    useState('')

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [arrivalTime, setArrivalTime] =
    useState('')
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
  const [description, setDescription] =
    useState('')
  const [
    assignedWorkers,
    setAssignedWorkers,
  ] = useState<string[]>([])
  const [
    manualWorkerName,
    setManualWorkerName,
  ] = useState('')

  const [materials, setMaterials] =
    useState<WorkOrderMaterial[]>([])
  const [labourPrice, setLabourPrice] =
    useState('0')
  const [discountRate, setDiscountRate] =
    useState('0')
  const [vatRate, setVatRate] =
    useState('25')
  const [priceNote, setPriceNote] =
    useState('')

  const [investorName, setInvestorName] =
    useState('')
  const [
    investorSignature,
    setInvestorSignature,
  ] = useState('')

  const [images, setImages] =
    useState<WorkOrderImage[]>([])
  const [isUploading, setIsUploading] =
    useState(false)

  const [templates, setTemplates] =
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

  const [
    autosaveState,
    setAutosaveState,
  ] =
    useState<DraftAutosaveState>('idle')
  const [
    autosaveText,
    setAutosaveText,
  ] = useState('')
  const [draftReady, setDraftReady] =
    useState(false)

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

        if (cancelled) return

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
        setIsLoadingTemplates(true)
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
          setIsLoadingTemplates(false)
        }
      }
    }

    void loadTemplates()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredCustomers =
    useMemo(() => {
      const active = customers.filter(
        (customer) => customer.status === 'Aktivan',
      )

      const query = customerSearch
        .trim()
        .toLocaleLowerCase('hr-HR')

      if (!query) return active.slice(0, 12)

      return active
        .filter((customer) =>
          [
            customer.name,
            customer.contactPerson,
            customer.phone,
            customer.email,
            customer.oib,
            customer.street,
            customer.city,
            customer.postalCode,
            customer.notes,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('hr-HR')
            .includes(query),
        )
        .slice(0, 20)
    }, [customers, customerSearch])

  const filteredTemplates =
    useMemo(() => {
      const search =
        templateSearch
          .trim()
          .toLocaleLowerCase('hr-HR')

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
              (material) => material.name,
            ),
          ]
            .join(' ')
            .toLocaleLowerCase('hr-HR')
            .includes(search),
      )
    }, [
      templates,
      templateSearch,
    ])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const finalizedOrderId =
          localStorage.getItem(FINALIZED_DRAFT_KEY)

        if (finalizedOrderId) {
          await deleteUserDraft('work-order', 'new')
          localStorage.removeItem(FINALIZED_DRAFT_KEY)

          if (!cancelled) setDraftReady(true)
          return
        }

        const draft =
          await loadUserDraft<any>(
            'work-order',
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

        setCustomerId(
          value.customerId ?? '',
        )
        setCustomerName(
          value.customerName ?? '',
        )
        setCustomerSearch(
          value.customerName ?? '',
        )
        setCustomerContactPerson(
          value.customerContactPerson ?? '',
        )
        setCustomerPhone(
          value.customerPhone ?? '',
        )
        setCustomerEmail(
          value.customerEmail ?? '',
        )
        setCustomerOib(
          value.customerOib ?? '',
        )
        setAddress(
          value.address ?? '',
        )
        setDate(
          value.date ??
            new Date()
              .toISOString()
              .slice(0, 10),
        )
        setArrivalTime(
          value.arrivalTime ?? '',
        )
        setDepartureTime(
          value.departureTime ?? '',
        )
        setStatus(
          value.status ?? 'Novi',
        )
        setPriority(
          value.priority ?? 'Normalan',
        )
        setTitle(
          value.title ?? '',
        )
        setDescription(
          value.description ?? '',
        )
        setAssignedWorkers(
          Array.isArray(
            value.assignedWorkers,
          )
            ? value.assignedWorkers
            : [],
        )
        setMaterials(
          Array.isArray(
            value.materials,
          )
            ? value.materials
            : [],
        )
        setLabourPrice(
          value.labourPrice ?? '0',
        )
        setDiscountRate(
          value.discountRate ?? '0',
        )
        setVatRate(
          value.vatRate ?? '25',
        )
        setPriceNote(
          value.priceNote ?? '',
        )
        setInvestorName(
          value.investorName ?? '',
        )
        setInvestorSignature(
          value.investorSignature ?? '',
        )
        setImages(
          Array.isArray(value.images)
            ? value.images
            : [],
        )
        setSelectedTemplateId(
          value.selectedTemplateId ?? '',
        )

        setAutosaveState('restored')
        setAutosaveText(
          `Nastavljen nedovršeni radni nalog · ${formatDraftSavedAt(
            draft.updatedAt,
          )}`,
        )
      } catch (error) {
        console.error(
          'Nacrt radnog naloga nije moguće učitati:',
          error,
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
  }, [])

  useEffect(() => {
    if (
      !draftReady ||
      isLoadingCustomers
    ) {
      return
    }

    const raw =
      sessionStorage.getItem(
        'fersys_ai_work_order_prefill',
      )

    if (!raw) {
      return
    }

    try {
      const value =
        JSON.parse(raw) as
          Record<string, unknown>

      const text = (
        key: string,
      ) =>
        typeof value[key] ===
        'string'
          ? String(
              value[key],
            ).trim()
          : ''

      const customerCandidateId =
        text('customerId')

      const customerCandidateName =
        text('customerName') ||
        text('customer') ||
        text('investorName')

      const matchedCustomer =
        customers.find(
          (customer) =>
            customerCandidateId &&
            customer.id ===
              customerCandidateId,
        ) ??
        customers.find(
          (customer) =>
            customerCandidateName &&
            customer.name
              .trim()
              .toLocaleLowerCase(
                'hr-HR',
              ) ===
              customerCandidateName
                .trim()
                .toLocaleLowerCase(
                  'hr-HR',
                ),
        )

      if (matchedCustomer) {
        handleCustomerChange(
          matchedCustomer.id,
        )
      } else if (
        customerCandidateName
      ) {
        setCustomerSearch(
          customerCandidateName,
        )
      }

      const nextTitle =
        text('title') ||
        text('workOrderTitle')

      const nextDescription =
        text('description') ||
        text('workDescription') ||
        text('notes')

      const nextAddress =
        text('address') ||
        text('location')

      const nextDate =
        text('date')

      const nextArrival =
        text('arrivalTime') ||
        text('startTime')

      const nextDeparture =
        text('departureTime') ||
        text('endTime')

      const nextPriority =
        text('priority')

      const nextStatus =
        text('status')

      const nextInvestorName =
        text('investorName') ||
        text('contactPerson')

      if (nextTitle) {
        setTitle(nextTitle)
      }

      if (nextDescription) {
        setDescription(
          nextDescription,
        )
      }

      if (nextAddress) {
        setAddress(
          nextAddress,
        )
      }

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(
          nextDate,
        )
      ) {
        setDate(nextDate)
      }

      if (
        /^\d{2}:\d{2}$/.test(
          nextArrival,
        )
      ) {
        setArrivalTime(
          nextArrival,
        )
      }

      if (
        /^\d{2}:\d{2}$/.test(
          nextDeparture,
        )
      ) {
        setDepartureTime(
          nextDeparture,
        )
      }

      if (
        [
          'Nizak',
          'Normalan',
          'Visok',
          'Hitno',
        ].includes(
          nextPriority,
        )
      ) {
        setPriority(
          nextPriority as
            WorkOrderPriority,
        )
      }

      if (
        [
          'Novi',
          'Zakazan',
          'U tijeku',
          'Završen',
          'Otkazan',
        ].includes(
          nextStatus,
        )
      ) {
        setStatus(
          nextStatus as
            WorkOrderStatus,
        )
      }

      const rawWorkers =
        value.assignedWorkers ??
        value.workers

      if (
        Array.isArray(rawWorkers)
      ) {
        const nextWorkers =
          rawWorkers
            .filter(
              (
                worker,
              ): worker is string =>
                typeof worker ===
                'string',
            )
            .map((worker) =>
              worker.trim(),
            )
            .filter(Boolean)

        if (
          nextWorkers.length
        ) {
          setAssignedWorkers(
            nextWorkers,
          )
        }
      }

      if (
        Array.isArray(
          value.materials,
        )
      ) {
        const nextMaterials =
          value.materials
            .map(
              (
                material,
              ): WorkOrderMaterial | null => {
                if (
                  !material ||
                  typeof material !==
                    'object'
                ) {
                  return null
                }

                const source =
                  material as Record<
                    string,
                    unknown
                  >

                const name =
                  typeof source.name ===
                  'string'
                    ? source.name.trim()
                    : ''

                if (!name) {
                  return null
                }

                return {
                  id:
                    crypto.randomUUID(),
                  name,
                  quantity:
                    Math.max(
                      0,
                      Number(
                        source.quantity,
                      ) || 1,
                    ),
                  unit:
                    typeof source.unit ===
                      'string' &&
                    source.unit.trim()
                      ? source.unit.trim()
                      : 'kom',
                  unitPrice:
                    canViewPrices
                      ? Math.max(
                          0,
                          Number(
                            source.unitPrice ??
                              source.price,
                          ) || 0,
                        )
                      : 0,
                }
              },
            )
            .filter(
              (
                material,
              ): material is WorkOrderMaterial =>
                material !== null,
            )

        if (
          nextMaterials.length
        ) {
          setMaterials(
            nextMaterials,
          )
        }
      }

      if (
        canViewPrices
      ) {
        const nextLabourPrice =
          Number(
            value.labourPrice ??
              value.price,
          )

        const nextVat =
          Number(
            value.vatRate ??
              value.vat,
          )

        if (
          Number.isFinite(
            nextLabourPrice,
          ) &&
          nextLabourPrice >= 0
        ) {
          setLabourPrice(
            String(
              nextLabourPrice,
            ),
          )
        }

        if (
          Number.isFinite(
            nextVat,
          ) &&
          nextVat >= 0 &&
          nextVat <= 100
        ) {
          setVatRate(
            String(nextVat),
          )
        }

        const nextPriceNote =
          text('priceNote')

        if (nextPriceNote) {
          setPriceNote(
            nextPriceNote,
          )
        }
      }

      if (
        nextInvestorName &&
        !matchedCustomer
      ) {
        setInvestorName(
          nextInvestorName,
        )
      }

      setAutosaveState(
        'restored',
      )
      setAutosaveText(
        'FERSYS AI je pripremio radni nalog. Provjeri podatke prije spremanja.',
      )
    } catch (error) {
      console.error(
        'AI priprema radnog naloga nije učitana:',
        error,
      )
    } finally {
      sessionStorage.removeItem(
        'fersys_ai_work_order_prefill',
      )
    }
  }, [
    draftReady,
    isLoadingCustomers,
    customers,
    canViewPrices,
  ])

  useEffect(() => {
    if (!draftReady) {
      return
    }

    const hasContent =
      Boolean(
        customerId ||
        title.trim() ||
        description.trim() ||
        materials.length ||
        images.length ||
        investorSignature,
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void (async () => {
          try {
            setAutosaveState('saving')

            const savedAt =
              await saveUserDraft(
                'work-order',
                'new',
                {
                  customerId,
                  customerName,
                  customerContactPerson,
                  customerPhone,
                  customerEmail,
                  customerOib,
                  address,
                  date,
                  arrivalTime,
                  departureTime,
                  status,
                  priority,
                  title,
                  description,
                  assignedWorkers,
                  materials,
                  labourPrice,
                  discountRate,
                  vatRate,
                  priceNote,
                  investorName,
                  investorSignature,
                  images,
                  selectedTemplateId,
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
          } catch (error) {
            console.error(
              'Autosave radnog naloga nije uspio:',
              error,
            )
            setAutosaveState(
              'offline',
            )
            setAutosaveText(
              'Nacrt je spremljen lokalno.',
            )
          }
        })()
      }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    customerId,
    customerName,
    customerContactPerson,
    customerPhone,
    customerEmail,
    customerOib,
    address,
    date,
    arrivalTime,
    departureTime,
    status,
    priority,
    title,
    description,
    assignedWorkers,
    materials,
    labourPrice,
    discountRate,
    vatRate,
    priceNote,
    investorName,
    investorSignature,
    images,
    selectedTemplateId,
  ])

  async function discardWorkOrderDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršeni radni nalog?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'work-order',
      'new',
    )

    window.location.reload()
  }

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

  const totalLaborMinutes =
    useMemo(
      () =>
        durationMinutes *
        assignedWorkers.length,
      [
        durationMinutes,
        assignedWorkers.length,
      ],
    )

  const pricing =
    useMemo(
      () =>
        calculateWorkOrderPricing({
          materials,
          labourPrice:
            Number(labourPrice) || 0,
          discountRate:
            Number(discountRate) || 0,
          vatRate:
            Number(vatRate) || 0,
        }),
      [
        materials,
        labourPrice,
        discountRate,
        vatRate,
      ],
    )

  const totalPrice =
    pricing.totalPrice

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
          id: crypto.randomUUID(),
          name: material.name,
          quantity:
            material.quantity,
          unit: material.unit,
          unitPrice: 0,
          discountRate: 0,
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

    setShowTemplateModal(true)
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
      setIsSavingTemplate(true)

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
      setShowTemplateModal(false)
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
      setIsSavingTemplate(false)
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
        setSelectedTemplateId('')
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
        (item) =>
          item.id === value,
      )

    if (!customer) {
      setShowCustomerDetails(false)
      setCustomerName('')
      setCustomerSearch('')
      setCustomerContactPerson('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerOib('')
      setAddress('')
      setInvestorName('')
      return
    }

    setCustomerName(
      customer.name,
    )
    setShowCustomerDetails(false)
    setCustomerSearch(customer.name)
    setShowCustomerResults(false)
    setCustomerContactPerson(
      customer.contactPerson ?? '',
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

  function addManualWorker() {
    const name =
      manualWorkerName
        .trim()
        .replace(/\s+/g, ' ')

    if (!name) {
      return
    }

    const alreadyExists =
      assignedWorkers.some(
        (worker) =>
          worker.toLocaleLowerCase(
            'hr-HR',
          ) ===
          name.toLocaleLowerCase(
            'hr-HR',
          ),
      )

    if (!alreadyExists) {
      setAssignedWorkers(
        (current) => [
          ...current,
          name,
        ],
      )
    }

    setManualWorkerName('')
  }

  function removeAssignedWorker(
    workerName: string,
  ) {
    setAssignedWorkers(
      (current) =>
        current.filter(
          (worker) =>
            worker !== workerName,
        ),
    )
  }

  function addMaterial(
    afterMaterialId?: string,
  ) {
    const materialId =
      crypto.randomUUID()

    const newMaterial: WorkOrderMaterial = {
      id: materialId,
      name: '',
      quantity: 0,
      unit: 'kom',
      unitPrice: 0,
      discountRate: 0,
    }

    setMaterials((current) => {
      if (!afterMaterialId) {
        return [
          ...current,
          newMaterial,
        ]
      }

      const index =
        current.findIndex(
          (material) =>
            material.id ===
            afterMaterialId,
        )

      if (index < 0) {
        return [
          ...current,
          newMaterial,
        ]
      }

      return [
        ...current.slice(
          0,
          index + 1,
        ),
        newMaterial,
        ...current.slice(
          index + 1,
        ),
      ]
    })

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const row =
          document.getElementById(
            `work-order-material-${materialId}`,
          )

        row?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        row
          ?.querySelector<HTMLInputElement>(
            '[data-material-name="true"]',
          )
          ?.focus()
      })
    })
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
                    1280,
                    1280,
                    0.72,
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
      alert(
        'Odaberite investitora.',
      )
      return
    }

    if (!investorName.trim()) {
      alert(
        'Unesite ime i prezime osobe / investitora.',
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
            discountRate:
              canViewPrices
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      Number(
                        material.discountRate,
                      ) || 0,
                    ),
                  )
                : 0,
          }),
        )
        .filter(
          (material) =>
            material.name !== '',
        )

    const submitPricing =
      calculateWorkOrderPricing({
        materials: cleanMaterials,
        labourPrice:
          canViewPrices
            ? Number(labourPrice) || 0
            : 0,
        discountRate:
          canViewPrices
            ? Number(discountRate) || 0
            : 0,
        vatRate:
          canViewPrices
            ? Number(vatRate) || 0
            : 0,
      })

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
              ? submitPricing.materialPrice
              : 0,
          discountRate:
            canViewPrices
              ? submitPricing.discountRate
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
              ? submitPricing.totalPrice
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

      if (images.length > 0) {
        /*
         * Spremanje radnog naloga viÅ¡e NE Äeka upload galerije.
         * Nalog je veÄ‡ sigurno spremljen u bazu; fotografije se zatim
         * sinkroniziraju u pozadini. WorkOrderPhotoGallerySync sluÅ¾i kao
         * dodatni retry mehanizam ako ova pozadinska sinkronizacija ne uspije.
         */
        void syncWorkOrderImagesToCustomerGallery({
          workOrderId:
            createdOrder.id,
          orderNumber:
            createdOrder.orderNumber,
          customerId,
          workDate: date,
          title:
            title.trim(),
          images,
        }).catch((galleryError) => {
          console.warn(
            '[FERSYS] Pozadinska sinkronizacija fotografija novog radnog naloga nije uspjela; realtime sinkronizacija Ä‡e pokuÅ¡ati ponovno:',
            galleryError,
          )
        })
      }

      localStorage.setItem(
        FINALIZED_DRAFT_KEY,
        createdOrder.id,
      )

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
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <h1 className="text-xl font-black text-white sm:text-2xl">
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
            className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  if (isSaving) {
    const isLargeWorkOrder =
      images.length >= 4 ||
      materials.length >= 8 ||
      description.length >= 1500

    return (
      <FersysLoader
        text={
          isLargeWorkOrder
            ? 'Spremanje većeg radnog naloga... Ima više podataka ili fotografija pa može potrajati malo duže. Ne zatvaraj aplikaciju.'
            : 'Spremanje radnog naloga...'
        }
      />
    )
  }

  return (
    <>
      <form
        id="mobile-work-order-form"
        onSubmit={submit}
        className="mx-auto w-full max-w-[1500px] space-y-4 pb-44 sm:space-y-6 sm:pb-10"
      >
        <DraftAutosaveBadge
          state={autosaveState}
          text={autosaveText}
          onDiscard={
            autosaveState !== 'idle'
              ? () =>
                  void discardWorkOrderDraft()
              : undefined
          }
        />

        <button
          type="button"
          onClick={() =>
            navigate('/work-orders')
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Radni nalozi
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                NOVI RADNI NALOG
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Novi terenski posao
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Unesi investitora, radove, fotografije i potpis.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSaving ||
                customers.length === 0
              }
              className="hidden h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50 sm:flex"
            >
              <Save size={18} />
              Spremi
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:hidden">
            <HeroMetric
              label="Investitor"
              value={
                customerName ||
                'Nije odabran'
              }
            />
            <HeroMetric
              label="Trajanje"
              value={durationText(
                durationMinutes,
              )}
            />
            <HeroMetric
              label={
                canViewPrices
                  ? 'Ukupno'
                  : 'Cijena'
              }
              value={
                canViewPrices
                  ? `${totalPrice.toFixed(
                      2,
                    )} €`
                  : 'Skriveno'
              }
            />
          </div>
        </section>

        {customers.length === 0 && (
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
            <p className="font-black text-amber-300">
              Prvo je potrebno dodati investitora.
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Radni nalog mora biti povezan s investitorom.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/customers')
              }
              className="mt-4 min-h-11 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950"
            >
              Otvori investitore
            </button>
          </section>
        )}

        <MobileSection
          number="1"
          title="Investitor i lokacija"
          description="Odaberi kome se posao radi i na kojoj adresi."
        >
          <Field
            label="Pronađi investitora"
            className="sm:col-span-2"
          >
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                autoComplete="off"
                value={customerSearch}
                onFocus={() => setShowCustomerResults(true)}
                onChange={(event) => {
                  setCustomerSearch(event.target.value)
                  setShowCustomerResults(true)

                  if (customerId) {
                    setCustomerId('')
                    setCustomerName('')
                  }
                }}
                placeholder="Ime, tvrtka, telefon, OIB, adresa, grad..."
                className={`${inputClass} pl-11`}
              />

              {showCustomerResults && (
                <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/40">
                  {filteredCustomers.length === 0 ? (
                    <div className="rounded-xl p-4 text-center text-sm text-slate-500">
                      Nema investitora za ovu pretragu.
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const customerAddress = [
                        customer.street,
                        customer.postalCode,
                        customer.city,
                      ]
                        .filter(Boolean)
                        .join(', ')

                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerChange(customer.id)}
                          className="w-full rounded-xl p-3 text-left hover:bg-slate-800 active:bg-slate-800"
                        >
                          <p className="truncate text-sm font-black text-white">
                            {customer.name}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                            {[
                              customer.contactPerson,
                              customer.phone,
                              customerAddress,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {customerId && (
              <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <UserRound size={18} />
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCustomerDetails((current) => !current)
                    }
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    aria-expanded={showCustomerDetails}
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Odabrani investitor
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-black text-white">
                        {customerName}
                      </span>
                    </span>

                    <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-950/35 px-2.5 py-2 text-[11px] font-black text-slate-300">
                      {showCustomerDetails ? 'Sakrij' : 'Detalji'}
                      {showCustomerDetails ? (
                        <ChevronUp size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCustomerChange('')
                      setShowCustomerResults(true)
                    }}
                    className="shrink-0 rounded-xl px-2 py-2 text-[11px] font-black text-slate-400 active:bg-slate-800"
                  >
                    Promijeni
                  </button>
                </div>
              </div>
            )}
          </Field>

          {(!customerId || showCustomerDetails) && (
            <>
            <Field label="Ime i prezime osobe / investitora *">
              <input
                required
                value={investorName}
                onChange={(event) =>
                  setInvestorName(event.target.value)
                }
                placeholder="Npr. Marko Marić"
                className={inputClass}
              />
            </Field>
  
            <Field label="Telefon">
              <input
                inputMode="tel"
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
  
            <Field label="E-mail">
              <input
                type="email"
                value={customerEmail}
                onChange={(event) =>
                  setCustomerEmail(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
  
            <Field label="OIB">
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
                className={inputClass}
              />
            </Field>
  
            <Field
              label="Adresa radova"
              className="sm:col-span-2"
            >
              <div className="relative">
                <MapPin
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value,
                    )
                  }
                  className={`${inputClass} pl-11`}
                />
              </div>
            </Field>
            </>
          )}
        </MobileSection>

        <MobileSection
          number="2"
          title="Datum i vrijeme"
          description="Termin, status i prioritet naloga."
          icon={
            <Clock3
              size={20}
              className="text-blue-400"
            />
          }
        >
          <Field label="Datum">
            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dolazak">
              <input
                type="time"
                value={arrivalTime}
                onChange={(event) =>
                  setArrivalTime(
                    event.target.value,
                  )
                }
                className={`${inputClass} px-3 [color-scheme:dark]`}
              />
            </Field>

            <Field label="Odlazak">
              <input
                type="time"
                value={departureTime}
                onChange={(event) =>
                  setDepartureTime(
                    event.target.value,
                  )
                }
                className={`${inputClass} px-3 [color-scheme:dark]`}
              />
            </Field>
          </div>

          <div className="rounded-2xl bg-blue-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">
              Trajanje
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {durationText(
                durationMinutes,
              )}
            </p>
          </div>

          <Field label="Status">
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as WorkOrderStatus,
                )
              }
              className={inputClass}
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
          </Field>

          <Field label="Prioritet">
            <select
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target
                    .value as WorkOrderPriority,
                )
              }
              className={inputClass}
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
          </Field>
        </MobileSection>

        <MobileSection
          number="3"
          title="Radovi i radnici"
          description="Predložak, opis posla i osobe koje rade."
          action={
            <button
              type="button"
              onClick={openSaveTemplate}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 text-xs font-black text-violet-300"
            >
              <BookmarkPlus
                size={16}
              />
              Spremi predložak
            </button>
          }
        >
          <div className="sm:col-span-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 sm:p-4">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  value={templateSearch}
                  onChange={(event) =>
                    setTemplateSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Pretraži predloške..."
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>

              {isLoadingTemplates ? (
                <p className="mt-3 text-sm text-slate-500">
                  Učitavanje predložaka...
                </p>
              ) : templatesError ? (
                <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                  {templatesError}
                </p>
              ) : filteredTemplates.length ===
                0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                  {templates.length === 0
                    ? 'Još nema spremljenih predložaka.'
                    : 'Nema rezultata za ovu pretragu.'}
                </p>
              ) : (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {filteredTemplates.map(
                    (template) => {
                      const active =
                        selectedTemplateId ===
                        template.id

                      return (
                        <div
                          key={template.id}
                          className={`w-[210px] shrink-0 rounded-2xl border p-3 ${
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
                            <div className="flex items-start gap-2">
                              <span
                                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
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
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-white">
                                  {template.name}
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                                  {template.title ||
                                    template.description ||
                                    'Predložak radnog naloga'}
                                </p>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void removeTemplate(
                                template,
                              )
                            }
                            className="mt-3 w-full border-t border-slate-800 pt-2 text-right text-[11px] font-black text-red-400"
                          >
                            Obriši
                          </button>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </div>
          </div>

          <Field
            label="Naziv radnog naloga"
            className="sm:col-span-2"
          >
            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Primjer: Servis klima uređaja"
              className={inputClass}
            />
          </Field>

          <Field
            label="Opis radova"
            className="sm:col-span-2"
          >
            <textarea
              rows={6}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Detaljno opiši izvedene ili planirane radove..."
              className="w-full resize-none rounded-2xl bg-slate-800 p-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
            />
          </Field>

          <div className="sm:col-span-2">
            <p className="text-sm font-black text-slate-300">
              Radnici
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Odaberi člana FERSYS-a ili ručno upiši radnika koji nema račun.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {isLoadingWorkers ? (
                <div className="col-span-full rounded-2xl bg-slate-800 p-4 text-sm text-slate-400">
                  Učitavanje radnika...
                </div>
              ) : workersError ? (
                <div className="col-span-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {workersError}
                </div>
              ) : workers.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">
                  Nema aktivnih članova tvrtke. Radnika i dalje možeš dodati ručno ispod.
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
                        className={`min-h-[86px] rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                              isSelected
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {isSelected ? (
                              <Check
                                size={17}
                              />
                            ) : (
                              <UserRound
                                size={17}
                              />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="line-clamp-2 text-xs font-black leading-4 text-white sm:text-sm">
                              {workerName}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-slate-500">
                              {getRoleLabel(
                                worker.role,
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  },
                )
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/45 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Dodaj radnika ručno
              </p>

              <div className="mt-2 flex gap-2">
                <input
                  value={
                    manualWorkerName
                  }
                  onChange={(event) =>
                    setManualWorkerName(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      event.preventDefault()
                      addManualWorker()
                    }
                  }}
                  placeholder="Ime i prezime radnika"
                  className="h-11 min-w-0 flex-1 rounded-xl bg-slate-800 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600"
                />

                <button
                  type="button"
                  onClick={
                    addManualWorker
                  }
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white"
                >
                  <Plus size={17} />
                  Dodaj
                </button>
              </div>
            </div>

            {assignedWorkers.length >
              0 && (
              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Na nalogu
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {assignedWorkers.map(
                    (workerName) => (
                      <button
                        key={workerName}
                        type="button"
                        onClick={() =>
                          removeAssignedWorker(
                            workerName,
                          )
                        }
                        className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 text-xs font-black text-blue-200"
                        title="Ukloni radnika s naloga"
                      >
                        <UserRound
                          size={14}
                        />
                        {workerName}
                        <span className="text-slate-500">
                          ×
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-800 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Broj radnika
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {
                    assignedWorkers.length
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">
                  Ukupno radnih sati
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {durationText(
                    totalLaborMinutes,
                  )}
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Račun: trajanje posla × broj radnika. Npr. 2 sata × 4 radnika = 8 radnih sati.
            </p>
          </div>
        </MobileSection>

        <MobileSection
          number="4"
          title="Materijal i cijena"
          description="Utrošeni materijal i financijski dio naloga."
          action={
            <button
              type="button"
              onClick={() =>
                addMaterial()
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
            >
              <PackagePlus
                size={16}
              />
              Dodaj
            </button>
          }
        >
          <div className="space-y-3 sm:col-span-2">
            {materials.map(
              (material) => (
                <div
                  key={material.id}
                  id={`work-order-material-${material.id}`}
                  className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
                  <div className="flex items-start gap-2">
                    <input
                      data-material-name="true"
                      value={material.name}
                      onChange={(event) =>
                        updateMaterial(
                          material.id,
                          'name',
                          event.target.value,
                        )
                      }
                      placeholder="Naziv materijala"
                      className="h-11 min-w-0 flex-1 rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeMaterial(
                          material.id,
                        )
                      }
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"
                    >
                      <Trash2
                        size={17}
                      />
                    </button>
                  </div>

                  <div
                    className={`mt-2 grid gap-2 ${
                      canViewPrices
                        ? 'grid-cols-2 sm:grid-cols-4'
                        : 'grid-cols-2'
                    }`}
                  >
                    <MiniInput
                      label="Kolicina"
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                          material.quantity === 0
                            ? ''
                            : material.quantity
                        }
                        placeholder="Kolicina"
                        onChange={(event) =>
                          updateMaterial(
                            material.id,
                            'quantity',
                            event.target.value === ''
                              ? 0
                              : Number(
                                  event.target.value,
                                ),
                          )
                        }
                        className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600"
                      />
                    </MiniInput>

                    <MiniInput
                      label="Jedinica"
                    >
                      <input
                        value={material.unit}
                        onChange={(event) =>
                          updateMaterial(
                            material.id,
                            'unit',
                            event.target.value,
                          )
                        }
                        className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none"
                      />
                    </MiniInput>

                    {canViewPrices && (
                      <MiniInput
                        label="Cijena €"
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={
                            material.unitPrice === 0
                              ? ''
                              : material.unitPrice
                          }
                          placeholder="0,00"
                          onChange={(event) =>
                            updateMaterial(
                              material.id,
                              'unitPrice',
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600"
                        />
                      </MiniInput>
                    )}

                    {canViewPrices && (
                      <MiniInput label="Popust %">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          inputMode="decimal"
                          value={material.discountRate || ''}
                          placeholder="0"
                          onChange={(event) =>
                            updateMaterial(
                              material.id,
                              'discountRate',
                              event.target.value === ''
                                ? 0
                                : Math.min(
                                    100,
                                    Math.max(0, Number(event.target.value) || 0),
                                  ),
                            )
                          }
                          className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600"
                        />
                      </MiniInput>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addMaterial(
                        material.id,
                      )
                    }
                    className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/[0.06] px-3 text-xs font-black text-blue-300 transition hover:bg-blue-500/10 active:scale-[0.99]"
                  >
                    <Plus size={15} />
                    Dodaj materijal ispod
                  </button>
                </div>
              ),
            )}

            {materials.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                Još nema dodanog materijala.
              </div>
            )}
          </div>

          {canViewPrices && (
            <>
              <Field label="Cijena rada">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={
                      labourPrice === '0'
                        ? ''
                        : labourPrice
                    }
                    placeholder="0,00"
                    onChange={(event) =>
                      setLabourPrice(
                        event.target.value,
                      )
                    }
                    className={`${inputClass} pr-11`}
                  />
                  <Euro
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </Field>

              <Field label="Popust na cijeli posao %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={discountRate === '0' ? '' : discountRate}
                  placeholder="0"
                  onChange={(event) =>
                    setDiscountRate(event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="PDV %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  value={vatRate}
                  onChange={(event) =>
                    setVatRate(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <div className="rounded-2xl bg-blue-600 p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-100">
                  Ukupno s PDV-om
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {totalPrice.toFixed(2)} €
                </p>
                <p className="mt-2 text-xs text-blue-100/80">
                  Osnovica {pricing.subtotalBeforeDiscount.toFixed(2)} €
                  {pricing.discountRate > 0
                    ? ` · Popust -${pricing.discountAmount.toFixed(2)} €`
                    : ''}
                  {` · PDV ${pricing.vatAmount.toFixed(2)} €`}
                </p>
              </div>

              <Field
                label="Napomena uz cijenu"
                className="sm:col-span-2"
              >
                <textarea
                  rows={3}
                  value={priceNote}
                  onChange={(event) =>
                    setPriceNote(
                      event.target.value,
                    )
                  }
                  className="w-full resize-none rounded-2xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </Field>
            </>
          )}
        </MobileSection>

        <MobileSection
          number="5"
          title="Fotografije"
          description={`${images.length}/12 fotografija dodano.`}
          icon={
            <Camera
              size={20}
              className="text-violet-400"
            />
          }
        >
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:gap-3">
            <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center text-xs font-black text-white active:scale-[0.99] sm:text-sm">
              <Camera
                size={22}
                className="text-blue-300"
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

            <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-center text-xs font-black text-white active:scale-[0.99] sm:text-sm">
              <ImagePlus
                size={22}
                className="text-violet-300"
              />
              Galerija
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
                className="hidden"
              />
            </label>
          </div>

          {isUploading && (
            <div className="sm:col-span-2">
              <FersysLoader
                compact
                text="Obrada fotografija..."
              />
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:grid-cols-4 md:grid-cols-5">
              {images.map(
                (image) => (
                  <div
                    key={image.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800"
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
                      className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-xl bg-black/75 text-white"
                    >
                      <Trash2
                        size={15}
                      />
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
        </MobileSection>

        <MobileSection
          number="6"
          title="Potpis investitora"
          description="Ime i potpis osobe koja potvrđuje nalog."
        >
          <Field
            label="Ime i prezime investitora"
            className="sm:col-span-2"
          >
            <input
              value={investorName}
              onChange={(event) =>
                setInvestorName(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <div className="min-w-0 sm:col-span-2">
            <SignaturePad
              value={
                investorSignature
              }
              onChange={
                setInvestorSignature
              }
            />
          </div>
        </MobileSection>

        <div className="hidden flex-col-reverse gap-3 sm:flex sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              navigate('/work-orders')
            }
            className="h-12 rounded-2xl bg-slate-800 px-6 font-black text-white disabled:opacity-50"
          >
            Odustani
          </button>

          <button
            type="submit"
            disabled={
              isSaving ||
              customers.length === 0
            }
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-50"
          >
            <Plus size={19} />
            {isSaving
              ? 'Spremanje...'
              : 'Spremi radni nalog'}
          </button>
        </div>

        {showTemplateModal && (
          <div className="fixed inset-0 z-[120] flex items-end bg-slate-950/85 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
            <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:border sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                PREDLOŽAK
              </p>

              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                Spremi ovaj rad za ubuduće
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Spremaju se naziv, opis, prioritet i materijal.
              </p>

              <Field
                label="Naziv predloška"
                className="mt-5"
              >
                <input
                  autoFocus
                  value={templateName}
                  onChange={(event) =>
                    setTemplateName(
                      event.target.value,
                    )
                  }
                  placeholder="Npr. Izmjena kotlića"
                  className={inputClass}
                />
              </Field>

              <div className="mt-5 rounded-2xl bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Sprema se
                </p>

                <p className="mt-2 font-black text-white">
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

              <div className="mt-6 grid gap-2">
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
                  className="min-h-12 rounded-2xl bg-violet-600 px-4 font-black text-white disabled:opacity-50"
                >
                  {isSavingTemplate
                    ? 'Spremanje...'
                    : 'Spremi novi predložak'}
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
                      className="min-h-12 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 font-black text-blue-300 disabled:opacity-50"
                    >
                      Ažuriraj postojeći
                    </button>
                  )}

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
                  className="min-h-12 rounded-2xl bg-slate-800 px-4 font-black text-white"
                >
                  Odustani
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+var(--fersys-safe-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden">
        <button
          type="submit"
          form="mobile-work-order-form"
          disabled={
            isSaving ||
            customers.length === 0
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving
            ? 'Spremanje...'
            : 'Spremi radni nalog'}
        </button>
      </div>

      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje radnog naloga..."
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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/12 text-xs font-black text-blue-300">
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

function MiniInput({
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

export default NewWorkOrderPage

