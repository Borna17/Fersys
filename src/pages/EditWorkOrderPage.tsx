import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  Euro,
  ImagePlus,
  MapPin,
  PackagePlus,
  Plus,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router'

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
import { getWorkOrderEditAccess } from '../services/workOrderAccess.service'
import {
  getWorkOrderById,
  updateWorkOrder,
} from '../services/workOrders.service'
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

function calculateDuration(arrival: string, departure: string) {
  if (!arrival || !departure) return 0

  const [arrivalHour, arrivalMinute] = arrival.split(':').map(Number)
  const [departureHour, departureMinute] = departure.split(':').map(Number)

  const start = arrivalHour * 60 + arrivalMinute
  let end = departureHour * 60 + departureMinute

  if (end < start) end += 24 * 60
  return end - start
}

function durationText(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours && rest) return `${hours} h ${rest} min`
  if (hours) return `${hours} h`
  return `${rest} min`
}

function getRoleLabel(role: CompanyEmployee['role']) {
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
  const navigate = useNavigate()
  const { id } = useParams()
  const { can } = useAuth()
  const canViewPrices = can('workOrders.viewPrices')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [workers, setWorkers] = useState<CompanyEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [workersError, setWorkersError] = useState('')
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerContactPerson, setCustomerContactPerson] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerOib, setCustomerOib] = useState('')
  const [address, setAddress] = useState('')

  const [date, setDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [status, setStatus] = useState<WorkOrderStatus>('Novi')
  const [priority, setPriority] = useState<WorkOrderPriority>('Normalan')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([])
  const [manualWorkerName, setManualWorkerName] = useState('')

  const [materials, setMaterials] = useState<WorkOrderMaterial[]>([])
  const [labourPrice, setLabourPrice] = useState('')
  const [discountRate, setDiscountRate] = useState('0')
  const [vatRate, setVatRate] = useState('25')
  const [priceNote, setPriceNote] = useState('')

  const [investorName, setInvestorName] = useState('')
  const [investorSignature, setInvestorSignature] = useState('')
  const [images, setImages] = useState<WorkOrderImage[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const [autosaveState, setAutosaveState] =
    useState<DraftAutosaveState>('idle')
  const [autosaveText, setAutosaveText] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const [baseUpdatedAt, setBaseUpdatedAt] = useState('')
  const baselineRef = useRef('')
  const saveSucceededRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setLoadError('Radni nalog nije pronađen.')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setLoadError('')
        setWorkersError('')

        const [savedOrder, savedCustomers, employees] = await Promise.all([
          getWorkOrderById(id),
          getCustomers(),
          getEmployees(),
        ])

        if (cancelled) return
        if (!savedOrder) {
          setLoadError('Radni nalog nije pronađen.')
          return
        }

        const access = await getWorkOrderEditAccess(savedOrder)
        if (!access.allowed) {
          setAccessDeniedMessage(access.reason)
          return
        }

        setAccessDeniedMessage('')
        setCustomers(savedCustomers)
        setWorkers(
          employees
            .filter((employee) => employee.status === 'active')
            .sort((first, second) => {
              if (first.role === 'owner' && second.role !== 'owner') return -1
              if (second.role === 'owner' && first.role !== 'owner') return 1
              return first.fullName.localeCompare(second.fullName, 'hr')
            }),
        )

        setCustomerId(savedOrder.customerId)
        setCustomerName(savedOrder.customerName)
        setCustomerContactPerson(savedOrder.customerContactPerson)
        setCustomerPhone(savedOrder.customerPhone)
        setCustomerEmail(savedOrder.customerEmail)
        setCustomerOib(savedOrder.customerOib)
        setAddress(savedOrder.address)
        setDate(savedOrder.date)
        setArrivalTime(savedOrder.arrivalTime)
        setDepartureTime(savedOrder.departureTime)
        setStatus(savedOrder.status)
        setPriority(savedOrder.priority)
        setTitle(savedOrder.title)
        setDescription(savedOrder.description)
        setAssignedWorkers(savedOrder.assignedWorkers)
        setMaterials(savedOrder.materials)
        setLabourPrice(
          savedOrder.labourPrice === 0 ? '' : String(savedOrder.labourPrice),
        )
        setDiscountRate(String(savedOrder.discountRate ?? 0))
        setVatRate(String(savedOrder.vatRate))
        setPriceNote(savedOrder.priceNote)
        setInvestorName(savedOrder.investorName)
        setInvestorSignature(savedOrder.investorSignature)
        setImages(savedOrder.images)
        setBaseUpdatedAt(savedOrder.updatedAt)

        const draftKey = `edit:${id}`
        const draft = await loadUserDraft<any>('work-order', draftKey)
        const value = draft?.payload ?? null
        const sameBase =
          value && value.baseUpdatedAt === savedOrder.updatedAt

        if (sameBase) {
          setCustomerId(value.customerId ?? savedOrder.customerId)
          setCustomerName(value.customerName ?? savedOrder.customerName)
          setCustomerContactPerson(value.customerContactPerson ?? savedOrder.customerContactPerson)
          setCustomerPhone(value.customerPhone ?? savedOrder.customerPhone)
          setCustomerEmail(value.customerEmail ?? savedOrder.customerEmail)
          setCustomerOib(value.customerOib ?? savedOrder.customerOib)
          setAddress(value.address ?? savedOrder.address)
          setDate(value.date ?? savedOrder.date)
          setArrivalTime(value.arrivalTime ?? savedOrder.arrivalTime)
          setDepartureTime(value.departureTime ?? savedOrder.departureTime)
          setStatus(value.status ?? savedOrder.status)
          setPriority(value.priority ?? savedOrder.priority)
          setTitle(value.title ?? savedOrder.title)
          setDescription(value.description ?? savedOrder.description)
          setAssignedWorkers(Array.isArray(value.assignedWorkers) ? value.assignedWorkers : savedOrder.assignedWorkers)
          setMaterials(Array.isArray(value.materials) ? value.materials : savedOrder.materials)
          setLabourPrice(value.labourPrice ?? (savedOrder.labourPrice === 0 ? '' : String(savedOrder.labourPrice)))
          setDiscountRate(value.discountRate ?? String(savedOrder.discountRate ?? 0))
          setVatRate(value.vatRate ?? String(savedOrder.vatRate))
          setPriceNote(value.priceNote ?? savedOrder.priceNote)
          setInvestorName(value.investorName ?? savedOrder.investorName)
          setInvestorSignature(value.investorSignature ?? savedOrder.investorSignature)
          setImages(Array.isArray(value.images) ? value.images : savedOrder.images)
          setAutosaveState('restored')
          setAutosaveText(`Vraćene nespremljene izmjene · ${formatDraftSavedAt(draft!.updatedAt)}`)
        } else if (draft) {
          // Server ima noviju verziju naloga. Stari nacrt ne smije pregaziti nove podatke.
          await deleteUserDraft('work-order', draftKey)
        }

        baselineRef.current = JSON.stringify({
          customerId: sameBase ? value.customerId ?? savedOrder.customerId : savedOrder.customerId,
          customerName: sameBase ? value.customerName ?? savedOrder.customerName : savedOrder.customerName,
          customerContactPerson: sameBase ? value.customerContactPerson ?? savedOrder.customerContactPerson : savedOrder.customerContactPerson,
          customerPhone: sameBase ? value.customerPhone ?? savedOrder.customerPhone : savedOrder.customerPhone,
          customerEmail: sameBase ? value.customerEmail ?? savedOrder.customerEmail : savedOrder.customerEmail,
          customerOib: sameBase ? value.customerOib ?? savedOrder.customerOib : savedOrder.customerOib,
          address: sameBase ? value.address ?? savedOrder.address : savedOrder.address,
          date: sameBase ? value.date ?? savedOrder.date : savedOrder.date,
          arrivalTime: sameBase ? value.arrivalTime ?? savedOrder.arrivalTime : savedOrder.arrivalTime,
          departureTime: sameBase ? value.departureTime ?? savedOrder.departureTime : savedOrder.departureTime,
          status: sameBase ? value.status ?? savedOrder.status : savedOrder.status,
          priority: sameBase ? value.priority ?? savedOrder.priority : savedOrder.priority,
          title: sameBase ? value.title ?? savedOrder.title : savedOrder.title,
          description: sameBase ? value.description ?? savedOrder.description : savedOrder.description,
          assignedWorkers: sameBase && Array.isArray(value.assignedWorkers) ? value.assignedWorkers : savedOrder.assignedWorkers,
          materials: sameBase && Array.isArray(value.materials) ? value.materials : savedOrder.materials,
          labourPrice: sameBase ? value.labourPrice ?? (savedOrder.labourPrice === 0 ? '' : String(savedOrder.labourPrice)) : (savedOrder.labourPrice === 0 ? '' : String(savedOrder.labourPrice)),
          discountRate: sameBase ? value.discountRate ?? String(savedOrder.discountRate ?? 0) : String(savedOrder.discountRate ?? 0),
          vatRate: sameBase ? value.vatRate ?? String(savedOrder.vatRate) : String(savedOrder.vatRate),
          priceNote: sameBase ? value.priceNote ?? savedOrder.priceNote : savedOrder.priceNote,
          investorName: sameBase ? value.investorName ?? savedOrder.investorName : savedOrder.investorName,
          investorSignature: sameBase ? value.investorSignature ?? savedOrder.investorSignature : savedOrder.investorSignature,
          images: sameBase && Array.isArray(value.images) ? value.images : savedOrder.images,
        })
        setDraftReady(true)
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Radni nalog nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!draftReady || !id || saveSucceededRef.current) return

    const payload = {
      baseUpdatedAt, customerId, customerName, customerContactPerson,
      customerPhone, customerEmail, customerOib, address, date,
      arrivalTime, departureTime, status, priority, title, description,
      assignedWorkers, materials, labourPrice, discountRate, vatRate,
      priceNote, investorName, investorSignature, images,
    }
    const serialized = JSON.stringify({
      customerId, customerName, customerContactPerson, customerPhone,
      customerEmail, customerOib, address, date, arrivalTime, departureTime,
      status, priority, title, description, assignedWorkers, materials,
      labourPrice, discountRate, vatRate, priceNote, investorName,
      investorSignature, images,
    })

    if (serialized === baselineRef.current) return

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setAutosaveState('saving')
          const savedAt = await saveUserDraft('work-order', `edit:${id}`, payload)
          setAutosaveState(navigator.onLine ? 'saved' : 'offline')
          setAutosaveText(formatDraftSavedAt(savedAt))
        } catch (error) {
          console.error('Autosave izmjena radnog naloga nije uspio:', error)
          setAutosaveState('offline')
          setAutosaveText('Nacrt izmjena čuva se lokalno.')
        }
      })()
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    draftReady, id, baseUpdatedAt, customerId, customerName,
    customerContactPerson, customerPhone, customerEmail, customerOib,
    address, date, arrivalTime, departureTime, status, priority, title,
    description, assignedWorkers, materials, labourPrice, discountRate,
    vatRate, priceNote, investorName, investorSignature, images,
  ])

    const durationMinutes = useMemo(
    () => calculateDuration(arrivalTime, departureTime),
    [arrivalTime, departureTime],
  )

  const totalLaborMinutes = useMemo(
    () =>
      durationMinutes *
      assignedWorkers.length,
    [
      durationMinutes,
      assignedWorkers.length,
    ],
  )

  const pricing = useMemo(
    () =>
      calculateWorkOrderPricing({
        materials,
        labourPrice: Number(labourPrice) || 0,
        discountRate: Number(discountRate) || 0,
        vatRate: Number(vatRate) || 0,
      }),
    [materials, labourPrice, discountRate, vatRate],
  )

  const totalPrice = pricing.totalPrice

  function handleCustomerChange(value: string) {
    setCustomerId(value)
    const customer = customers.find((item) => item.id === value)
    if (!customer) return

    setCustomerName(customer.name)
    setCustomerContactPerson(customer.contactPerson ?? '')
    setCustomerPhone(customer.phone)
    setCustomerEmail(customer.email)
    setCustomerOib(customer.oib)
    setAddress(
      [customer.street, customer.postalCode, customer.city]
        .filter(Boolean)
        .join(', '),
    )
  }

  function toggleWorker(workerName: string) {
    setAssignedWorkers((current) =>
      current.includes(workerName)
        ? current.filter((worker) => worker !== workerName)
        : [...current, workerName],
    )
  }

  function addManualWorker() {
    const name = manualWorkerName
      .trim()
      .replace(/\s+/g, ' ')

    if (!name) {
      return
    }

    const alreadyExists =
      assignedWorkers.some(
        (worker) =>
          worker.toLocaleLowerCase('hr-HR') ===
          name.toLocaleLowerCase('hr-HR'),
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
    materialId: string,
    key: keyof WorkOrderMaterial,
    value: string | number,
  ) {
    setMaterials((current) =>
      current.map((material) =>
        material.id === materialId ? { ...material, [key]: value } : material,
      ),
    )
  }

  function removeMaterial(materialId: string) {
    setMaterials((current) =>
      current.filter((material) => material.id !== materialId),
    )
  }

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    if (selected.length === 0) return

    const remainingSlots = 12 - images.length
    if (remainingSlots <= 0) {
      alert('Možete dodati najviše 12 fotografija.')
      event.target.value = ''
      return
    }

    setIsUploading(true)
    try {
      const compressed = await Promise.all(
        selected.slice(0, remainingSlots).map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          dataUrl: await fileToCompressedDataUrl(file),
        })),
      )
      setImages((current) => [...current, ...compressed])
    } catch {
      alert('Jednu ili više slika nije moguće učitati.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  function removeImage(imageId: string) {
    setImages((current) => current.filter((image) => image.id !== imageId))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || isSaving) return

    if (!customerId) {
      alert('Odaberite investitora.')
      return
    }
    if (!title.trim()) {
      alert('Unesite naziv radnog naloga.')
      return
    }
    if (!date) {
      alert('Odaberite datum.')
      return
    }

    const cleanMaterials = materials
      .map((material) => ({
        ...material,
        name: material.name.trim(),
        unit: material.unit.trim() || 'kom',
        quantity: Math.max(0, Number(material.quantity) || 0),
        unitPrice: Math.max(0, Number(material.unitPrice) || 0),
        discountRate: Math.min(
          100,
          Math.max(0, Number(material.discountRate) || 0),
        ),
      }))
      .filter((material) => material.name !== '')

    const submitPricing = calculateWorkOrderPricing({
      materials: cleanMaterials,
      labourPrice: canViewPrices ? Number(labourPrice) || 0 : 0,
      discountRate: canViewPrices ? Number(discountRate) || 0 : 0,
      vatRate: canViewPrices ? Number(vatRate) || 0 : 0,
    })

    try {
      setIsSaving(true)
      const saved = await updateWorkOrder(id, {
        customerId,
        customerName: customerName.trim(),
        customerContactPerson: customerContactPerson.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerOib: customerOib.replace(/\D/g, '').slice(0, 11),
        address: address.trim(),
        date,
        arrivalTime,
        departureTime,
        durationMinutes,
        title: title.trim(),
        description: description.trim(),
        materials: cleanMaterials,
        assignedWorkers,
        ...(canViewPrices
          ? {
              labourPrice: Math.max(0, Number(labourPrice) || 0),
              materialPrice: submitPricing.materialPrice,
              discountRate: submitPricing.discountRate,
              vatRate: submitPricing.vatRate,
              totalPrice: submitPricing.totalPrice,
              priceNote: priceNote.trim(),
            }
          : {}),
        investorName: investorName.trim(),
        investorSignature,
        images,
        status,
        priority,
      })

      if (images.length > 0) {
        /*
         * UreÄ‘ivanje naloga ne smije Äekati upload fotografija u galeriju.
         * Sam nalog je veÄ‡ spremljen; galerija se sinkronizira u pozadini.
         */
        void syncWorkOrderImagesToCustomerGallery({
          workOrderId:
            saved.id,
          orderNumber:
            saved.orderNumber,
          customerId,
          workDate: date,
          title:
            title.trim(),
          images,
        }).catch((galleryError) => {
          console.warn(
            '[FERSYS] Pozadinska sinkronizacija fotografija ureÄ‘enog radnog naloga nije uspjela; realtime sinkronizacija Ä‡e pokuÅ¡ati ponovno:',
            galleryError,
          )
        })
      }

      saveSucceededRef.current = true
      try {
        await deleteUserDraft('work-order', `edit:${id}`)
      } catch (draftError) {
        console.warn('Spremljen nalog, ali nacrt nije očišćen:', draftError)
      }
      navigate(`/work-orders/${saved.id}`, { replace: true })
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

  if (isLoading) {
    return <FersysLoader text="Učitavanje radnog naloga..." />
  }

  if (accessDeniedMessage) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-amber-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <h1 className="text-xl font-black text-white sm:text-2xl">
            Nemaš pravo uređivati ovaj nalog
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-200">
            {accessDeniedMessage}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/work-orders/${id}`)}
            className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Povratak na nalog
          </button>
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-center sm:p-8">
          <h1 className="text-xl font-black text-white sm:text-2xl">
            Radni nalog nije moguće učitati
          </h1>
          <p className="mt-3 break-words text-sm text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate('/work-orders')}
            className="mt-6 min-h-12 rounded-2xl bg-blue-600 px-5 font-black text-white"
          >
            Povratak
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <DraftAutosaveBadge state={autosaveState} text={autosaveText} />
      <form
        id="mobile-edit-work-order-form"
        onSubmit={submit}
        className="mx-auto w-full max-w-[1500px] space-y-4 pb-44 sm:space-y-6 sm:pb-10"
      >
        <button
          type="button"
          onClick={() => navigate(`/work-orders/${id}`)}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Radni nalog
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                UREĐIVANJE NALOGA
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Uredi radni nalog
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Ispravi ili dopuni postojeće podatke i spremi promjene.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="hidden h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50 sm:flex"
            >
              <Save size={18} />
              Spremi
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:hidden">
            <HeroMetric label="Investitor" value={customerName || 'Nije odabran'} />
            <HeroMetric label="Trajanje" value={durationText(durationMinutes)} />
            <HeroMetric
              label={canViewPrices ? 'Ukupno' : 'Cijena'}
              value={canViewPrices ? `${totalPrice.toFixed(2)} €` : 'Skriveno'}
            />
          </div>
        </section>

        <MobileSection
          number="1"
          title="Investitor i lokacija"
          description="Promijeni investitora, kontakt ili adresu radova."
        >
          <Field label="Investitor" className="sm:col-span-2">
            <select
              required
              value={customerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Odaberi investitora</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kontakt osoba">
            <input
              value={customerContactPerson}
              onChange={(event) => setCustomerContactPerson(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Telefon">
            <input
              inputMode="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="E-mail">
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
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
                  event.target.value.replace(/\D/g, '').slice(0, 11),
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Adresa radova" className="sm:col-span-2">
            <div className="relative">
              <MapPin
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </Field>
        </MobileSection>

        <MobileSection
          number="2"
          title="Datum, vrijeme i status"
          description="Ažuriraj termin, status i prioritet naloga."
          icon={<Clock3 size={20} className="text-blue-400" />}
        >
          <Field label="Datum">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dolazak">
              <input
                type="time"
                value={arrivalTime}
                onChange={(event) => setArrivalTime(event.target.value)}
                className={`${inputClass} px-3 [color-scheme:dark]`}
              />
            </Field>
            <Field label="Odlazak">
              <input
                type="time"
                value={departureTime}
                onChange={(event) => setDepartureTime(event.target.value)}
                className={`${inputClass} px-3 [color-scheme:dark]`}
              />
            </Field>
          </div>

          <div className="rounded-2xl bg-blue-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">
              Trajanje
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {durationText(durationMinutes)}
            </p>
          </div>

          <Field label="Status">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as WorkOrderStatus)
              }
              className={inputClass}
            >
              {['Novi', 'Zakazan', 'U tijeku', 'Završen', 'Otkazan'].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Prioritet">
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as WorkOrderPriority)
              }
              className={inputClass}
            >
              {['Nizak', 'Normalan', 'Visok', 'Hitno'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </MobileSection>

        <MobileSection
          number="3"
          title="Radovi i radnici"
          description="Ispravi naziv, opis ili odabrane radnike."
        >
          <Field label="Naziv naloga" className="sm:col-span-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Opis radova" className="sm:col-span-2">
            <textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-none rounded-2xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
            />
          </Field>

          <div className="sm:col-span-2">
            <p className="text-sm font-black text-slate-300">
              Radnici
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Odaberi člana FERSYS-a ili ručno upiši radnika koji nema račun.
            </p>

            {workersError && (
              <p className="mt-2 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">
                {workersError}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
              {workers.map((worker) => {
                const workerName =
                  worker.fullName.trim()
                const selected =
                  assignedWorkers.includes(
                    workerName,
                  )

                return (
                  <button
                    key={worker.membershipId}
                    type="button"
                    onClick={() =>
                      toggleWorker(
                        workerName,
                      )
                    }
                    className={`min-h-[86px] rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                      selected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          selected
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {selected ? (
                          <Check size={17} />
                        ) : (
                          <UserRound size={17} />
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
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/45 p-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Dodaj radnika ručno
              </p>

              <div className="mt-2 flex gap-2">
                <input
                  value={manualWorkerName}
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

            {assignedWorkers.length > 0 && (
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
                  {assignedWorkers.length}
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
          description="Dodaj materijal ili ispravi postojeće količine."
          action={
            <button
              type="button"
              onClick={() =>
                addMaterial()
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
            >
              <PackagePlus size={16} />
              Dodaj
            </button>
          }
        >
          <div className="space-y-3 sm:col-span-2">
            {materials.map((material) => (
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
                      updateMaterial(material.id, 'name', event.target.value)
                    }
                    placeholder="Naziv materijala"
                    className="h-11 min-w-0 flex-1 rounded-xl bg-slate-800 px-3 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeMaterial(material.id)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div
                  className={`mt-2 grid gap-2 ${
                    canViewPrices ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
                  }`}
                >
                  <MiniInput label="Količina">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={material.quantity === 0 ? '' : material.quantity}
                      placeholder="KoliÄina"
                      onChange={(event) =>
                        updateMaterial(
                          material.id,
                          'quantity',
                          event.target.value === ''
                            ? 0
                            : Number(event.target.value),
                        )
                      }
                      className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                  </MiniInput>

                  <MiniInput label="Jedinica">
                    <input
                      value={material.unit}
                      onChange={(event) =>
                        updateMaterial(material.id, 'unit', event.target.value)
                      }
                      className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none"
                    />
                  </MiniInput>

                  {canViewPrices && (
                    <MiniInput label="Cijena €">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={material.unitPrice === 0 ? '' : material.unitPrice}
                        onChange={(event) =>
                          updateMaterial(
                            material.id,
                            'unitPrice',
                            event.target.value === ''
                              ? 0
                              : Number(event.target.value),
                          )
                        }
                        className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none"
                      />
                    </MiniInput>
                  )}

                  {canViewPrices && (
                    <MiniInput label="Popust %">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        value={material.discountRate || ''}
                        placeholder="0"
                        onChange={(event) =>
                          updateMaterial(
                            material.id,
                            'discountRate',
                            event.target.value === ''
                              ? 0
                              : Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                          )
                        }
                        className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none"
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
            ))}

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
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={labourPrice}
                    onChange={(event) => setLabourPrice(event.target.value)}
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
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountRate === '0' ? '' : discountRate}
                  placeholder="0"
                  onChange={(event) => setDiscountRate(event.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="PDV %">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(event) => setVatRate(event.target.value)}
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

              <Field label="Napomena uz cijenu" className="sm:col-span-2">
                <textarea
                  rows={3}
                  value={priceNote}
                  onChange={(event) => setPriceNote(event.target.value)}
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
          icon={<Camera size={20} className="text-violet-400" />}
        >
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:gap-3">
            <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center text-xs font-black text-white">
              <Camera size={22} className="text-blue-300" />
              Slikaj sada
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImages}
                className="hidden"
              />
            </label>
            <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-center text-xs font-black text-white">
              <ImagePlus size={22} className="text-violet-300" />
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
              <FersysLoader compact text="Obrada fotografija..." />
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:grid-cols-4 md:grid-cols-5">
              {images.map((image) => (
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
                    onClick={() => removeImage(image.id)}
                    className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-xl bg-black/75 text-white"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </MobileSection>

        <MobileSection
          number="6"
          title="Potpis investitora"
          description="Ažuriraj ime ili potpis ako je potrebno."
        >
          <Field label="Ime i prezime investitora" className="sm:col-span-2">
            <input
              value={investorName}
              onChange={(event) => setInvestorName(event.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="min-w-0 sm:col-span-2">
            <SignaturePad
              value={investorSignature}
              onChange={setInvestorSignature}
            />
          </div>
        </MobileSection>

        <div className="hidden flex-col-reverse gap-3 sm:flex sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => navigate(`/work-orders/${id}`)}
            className="h-12 rounded-2xl bg-slate-800 px-6 font-black text-white disabled:opacity-50"
          >
            Odustani
          </button>
          <button
            type="submit"
            disabled={isSaving || isUploading}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white disabled:opacity-50"
          >
            <Save size={19} />
            {isSaving ? 'Spremanje...' : 'Spremi izmjene'}
          </button>
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden">
        <button
          type="submit"
          form="mobile-edit-work-order-form"
          disabled={isSaving || isUploading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Spremanje...' : 'Spremi izmjene'}
        </button>
      </div>

      {isSaving && <FersysLoader fullScreen text="Spremanje izmjena..." />}
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
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
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
      <span className="text-sm font-black text-slate-300">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function MiniInput({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="min-w-0">
      <span className="block truncate text-[9px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
    </div>
  )
}

export default EditWorkOrderPage

