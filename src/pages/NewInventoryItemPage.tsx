import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  Info,
  MapPin,
  Package,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  createInventoryItem,
  getInventoryItemById,
  getInventoryLocations,
  type InventoryLocation,
  type InventoryLocationStock,
  type InventoryTrackingType,
  type InventoryUnit,
  updateInventoryItem,
} from '../utils/inventoryStorage'

const DEFAULT_CATEGORIES = [
  'Odvodnja',
  'Voda',
  'Grijanje',
  'Plin',
  'Klima',
  'Elektromaterijal',
  'Alat',
  'Potrošni materijal',
  'Rezervni dijelovi',
  'Ostalo',
]

const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Odvodnja: [
    'Cijevi',
    'Koljena',
    'T-komadi',
    'Redukcije',
    'Čepovi',
    'Revizije',
    'Gumice',
    'Obujmice',
  ],
  Voda: [
    'Cijevi',
    'Ventili',
    'Spojnice',
    'Koljena',
    'T-komadi',
    'Redukcije',
    'Navoji',
    'Brtve',
  ],
  Grijanje: [
    'Cijevi',
    'Ventili',
    'Radijatori',
    'Termostati',
    'Pumpe',
    'Spojnice',
    'Odzračnici',
  ],
  Plin: [
    'Cijevi',
    'Ventili',
    'Regulatori',
    'Spojnice',
    'Brtve',
  ],
  Klima: [
    'Bakrene cijevi',
    'Izolacija',
    'Konzole',
    'Odvod kondenzata',
    'Električni materijal',
    'Rezervni dijelovi',
  ],
  Elektromaterijal: [
    'Kabeli',
    'Osigurači',
    'Sklopke',
    'Utičnice',
    'Spojnice',
  ],
  Alat: [
    'Ručni alat',
    'Električni alat',
    'Mjerni uređaji',
    'Potrošni dijelovi',
  ],
  'Potrošni materijal': [
    'Trake',
    'Ljepila',
    'Silikoni',
    'Vijci',
    'Tiple',
    'Brusni materijal',
  ],
}

interface LocationQuantity {
  locationId: string
  locationName: string
  quantity: string
}

interface FormState {
  name: string
  shortName: string
  alternativeNames: string

  code: string
  barcode: string

  category: string
  subcategory: string

  manufacturer: string
  supplier: string

  description: string
  usageDescription: string
  warningNote: string

  trackingType: InventoryTrackingType
  unit: InventoryUnit

  quantity: string
  minimumQuantity: string
  pieceLengthMetres: string

  diameter: string
  dimension: string

  purchasePrice: string
  salePrice: string
  vatRate: string
}

const INITIAL_FORM_STATE: FormState = {
  name: '',
  shortName: '',
  alternativeNames: '',

  code: '',
  barcode: '',

  category: '',
  subcategory: '',

  manufacturer: '',
  supplier: '',

  description: '',
  usageDescription: '',
  warningNote: '',

  trackingType: 'pieces',
  unit: 'kom',

  quantity: '0',
  minimumQuantity: '0',
  pieceLengthMetres: '',

  diameter: '',
  dimension: '',

  purchasePrice: '0',
  salePrice: '0',
  vatRate: '25',
}

function parseNumber(value: string): number {
  const normalizedValue = value
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')

  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

function resizeImage(
  file: File,
  maxWidth = 1400,
  maxHeight = 1400,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Fotografiju nije moguće učitati.'))
    }

    reader.onload = () => {
      const image = new Image()

      image.onerror = () => {
        reject(new Error('Odabrana datoteka nije ispravna slika.'))
      }

      image.onload = () => {
        let width = image.width
        let height = image.height

        const widthRatio = maxWidth / width
        const heightRatio = maxHeight / height
        const scale = Math.min(
          widthRatio,
          heightRatio,
          1,
        )

        width = Math.round(width * scale)
        height = Math.round(height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')

        if (!context) {
          reject(
            new Error(
              'Preglednik ne podržava obradu fotografije.',
            ),
          )
          return
        }

        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)

        resolve(
          canvas.toDataURL('image/jpeg', quality),
        )
      }

      image.src = String(reader.result)
    }

    reader.readAsDataURL(file)
  })
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  )
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <span className="mb-2 block text-sm font-medium text-slate-300">
      {children}

      {required && (
        <span className="ml-1 text-red-400">*</span>
      )}
    </span>
  )
}

const inputClassName =
  'h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'

const textareaClassName =
  'min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'

export function NewInventoryItemPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const isEditMode = Boolean(id)

  const mainImageInputRef =
    useRef<HTMLInputElement>(null)
  const additionalImagesInputRef =
    useRef<HTMLInputElement>(null)

  const [form, setForm] =
    useState<FormState>(INITIAL_FORM_STATE)

  const [mainImage, setMainImage] = useState('')
  const [additionalImages, setAdditionalImages] =
    useState<string[]>([])

  const [locations, setLocations] = useState<
    InventoryLocation[]
  >([])

  const [locationQuantities, setLocationQuantities] =
    useState<LocationQuantity[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [isProcessingImage, setIsProcessingImage] =
    useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  useEffect(() => {
    const savedLocations = getInventoryLocations()

    setLocations(savedLocations)

    if (!id) {
      setLocationQuantities(
        savedLocations.map((location) => ({
          locationId: location.id,
          locationName: location.name,
          quantity: '',
        })),
      )

      return
    }

    const existingItem = getInventoryItemById(id)

    if (!existingItem) {
      setErrorMessage('Artikl nije pronađen.')
      return
    }

    setForm({
      name: existingItem.name,
      shortName: existingItem.shortName,
      alternativeNames:
        existingItem.alternativeNames.join(', '),

      code: existingItem.code,
      barcode: existingItem.barcode,

      category: existingItem.category,
      subcategory: existingItem.subcategory,

      manufacturer: existingItem.manufacturer,
      supplier: existingItem.supplier,

      description: existingItem.description,
      usageDescription:
        existingItem.usageDescription,
      warningNote: existingItem.warningNote,

      trackingType: existingItem.trackingType,
      unit: existingItem.unit,

      quantity: String(existingItem.quantity),
      minimumQuantity: String(
        existingItem.minimumQuantity,
      ),
      pieceLengthMetres: String(
        existingItem.pieceLengthMetres || '',
      ),

      diameter: existingItem.diameter,
      dimension: existingItem.dimension,

      purchasePrice: String(existingItem.purchasePrice),
      salePrice: String(existingItem.salePrice),
      vatRate: String(existingItem.vatRate),
    })

    setMainImage(existingItem.image)
    setAdditionalImages(existingItem.additionalImages)

    setLocationQuantities(
      savedLocations.map((location) => {
        const existingStock =
          existingItem.locationStocks.find(
            (stock) =>
              stock.locationId === location.id,
          )

        return {
          locationId: location.id,
          locationName: location.name,
          quantity: existingStock
            ? String(existingStock.quantity)
            : '',
        }
      }),
    )
  }, [id])

  const availableSubcategories = useMemo(() => {
    return DEFAULT_SUBCATEGORIES[form.category] ?? []
  }, [form.category])

  const totalLocationQuantity = useMemo(() => {
    return locationQuantities.reduce(
      (total, location) =>
        total + parseNumber(location.quantity),
      0,
    )
  }, [locationQuantities])

  const calculatedTotalMetres = useMemo(() => {
    const quantity =
      totalLocationQuantity > 0
        ? totalLocationQuantity
        : parseNumber(form.quantity)

    if (form.trackingType === 'metres') {
      return quantity
    }

    if (form.trackingType === 'piece-length') {
      return (
        quantity *
        parseNumber(form.pieceLengthMetres)
      )
    }

    return 0
  }, [
    form.pieceLengthMetres,
    form.quantity,
    form.trackingType,
    totalLocationQuantity,
  ])

  function updateField<Key extends keyof FormState>(
    field: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrorMessage('')
    setSuccessMessage('')
  }

  function handleTrackingTypeChange(
    trackingType: InventoryTrackingType,
  ) {
    let unit: InventoryUnit = 'kom'

    if (trackingType === 'metres') {
      unit = 'm'
    }

    updateField('trackingType', trackingType)

    setForm((current) => ({
      ...current,
      trackingType,
      unit,
      pieceLengthMetres:
        trackingType === 'piece-length'
          ? current.pieceLengthMetres
          : '',
    }))
  }

  function handleCategoryChange(category: string) {
    setForm((current) => ({
      ...current,
      category,
      subcategory: '',
    }))
  }

  async function handleMainImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage(
        'Odabrana datoteka mora biti fotografija.',
      )
      return
    }

    try {
      setIsProcessingImage(true)
      setErrorMessage('')

      const compressedImage = await resizeImage(file)

      setMainImage(compressedImage)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Fotografiju nije moguće obraditi.',
      )
    } finally {
      setIsProcessingImage(false)
    }
  }

  async function handleAdditionalImagesChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files ?? [],
    )

    event.target.value = ''

    if (files.length === 0) {
      return
    }

    const remainingSlots =
      5 - additionalImages.length

    if (remainingSlots <= 0) {
      setErrorMessage(
        'Možeš dodati najviše pet dodatnih fotografija.',
      )
      return
    }

    try {
      setIsProcessingImage(true)
      setErrorMessage('')

      const imagesToProcess = files
        .filter((file) =>
          file.type.startsWith('image/'),
        )
        .slice(0, remainingSlots)

      const compressedImages = await Promise.all(
        imagesToProcess.map((file) =>
          resizeImage(file, 1200, 1200, 0.78),
        ),
      )

      setAdditionalImages((current) => [
        ...current,
        ...compressedImages,
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Fotografije nije moguće obraditi.',
      )
    } finally {
      setIsProcessingImage(false)
    }
  }

  function updateLocationQuantity(
    locationId: string,
    quantity: string,
  ) {
    setLocationQuantities((current) =>
      current.map((location) =>
        location.locationId === locationId
          ? {
              ...location,
              quantity,
            }
          : location,
      ),
    )
  }

  function removeAdditionalImage(index: number) {
    setAdditionalImages((current) =>
      current.filter(
        (_, imageIndex) => imageIndex !== index,
      ),
    )
  }

  function buildLocationStocks(): InventoryLocationStock[] {
    return locationQuantities
      .map((location) => ({
        id: `${location.locationId}-${Date.now()}`,
        locationId: location.locationId,
        locationName: location.locationName,
        quantity: parseNumber(location.quantity),
      }))
      .filter((location) => location.quantity > 0)
  }

  function validateForm(): string | null {
    if (!form.name.trim()) {
      return 'Unesi naziv artikla.'
    }

    if (!form.category.trim()) {
      return 'Odaberi kategoriju artikla.'
    }

    if (
      form.trackingType === 'piece-length' &&
      parseNumber(form.pieceLengthMetres) <= 0
    ) {
      return 'Unesi dužinu jednog komada cijevi.'
    }

    if (parseNumber(form.minimumQuantity) < 0) {
      return 'Minimalna količina ne može biti negativna.'
    }

    if (parseNumber(form.purchasePrice) < 0) {
      return 'Nabavna cijena ne može biti negativna.'
    }

    if (parseNumber(form.salePrice) < 0) {
      return 'Prodajna cijena ne može biti negativna.'
    }

    return null
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const validationError = validateForm()

    if (validationError) {
      setErrorMessage(validationError)
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const locationStocks = buildLocationStocks()

      const alternativeNames = form.alternativeNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)

      const itemInput = {
        name: form.name,
        shortName: form.shortName,
        alternativeNames,

        code: form.code,
        barcode: form.barcode,

        category: form.category,
        subcategory: form.subcategory,

        manufacturer: form.manufacturer,
        supplier: form.supplier,

        description: form.description,
        usageDescription: form.usageDescription,
        warningNote: form.warningNote,

        image: mainImage,
        additionalImages,

        trackingType: form.trackingType,
        unit: form.unit,

        quantity:
          locationStocks.length > 0
            ? totalLocationQuantity
            : parseNumber(form.quantity),

        minimumQuantity: parseNumber(
          form.minimumQuantity,
        ),

        pieceLengthMetres: parseNumber(
          form.pieceLengthMetres,
        ),

        diameter: form.diameter,
        dimension: form.dimension,

        purchasePrice: parseNumber(
          form.purchasePrice,
        ),
        salePrice: parseNumber(form.salePrice),
        vatRate: parseNumber(form.vatRate),

        locationStocks,
      }

      if (id) {
        const updatedItem = updateInventoryItem(
          id,
          itemInput,
        )

        setSuccessMessage('Artikl je uspješno spremljen.')

        window.setTimeout(() => {
          navigate(
            `/inventory/items/${updatedItem.id}`,
          )
        }, 500)
      } else {
        const createdItem =
          createInventoryItem(itemInput)

        setSuccessMessage('Artikl je uspješno dodan.')

        window.setTimeout(() => {
          navigate(
            `/inventory/items/${createdItem.id}`,
          )
        }, 500)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Došlo je do greške pri spremanju artikla.'

      if (
        message.toLocaleLowerCase('hr-HR').includes(
          'quota',
        )
      ) {
        setErrorMessage(
          'Fotografije zauzimaju previše prostora. Ukloni neke dodatne fotografije ili koristi manje fotografije.',
        )
      } else {
        setErrorMessage(message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {isEditMode
                  ? 'Uredi artikl'
                  : 'Novi artikl'}
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Dodaj fotografiju, podatke, stanje i
                lokaciju materijala
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="inventory-item-form"
            disabled={isSaving || isProcessingImage}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Spremanje...
              </>
            ) : (
              <>
                <Save size={18} />
                Spremi artikl
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            <Check
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {successMessage}
            </p>
          </div>
        )}

        <form
          id="inventory-item-form"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <FormSection
            title="Fotografije artikla"
            description="Glavna fotografija prikazuje se u skladištu i rezultatima pretrage. Preporučuje se fotografirati artikl na svijetloj podlozi."
          >
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div>
                <FieldLabel>
                  Glavna fotografija
                </FieldLabel>

                <div className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-slate-700 bg-slate-950">
                  {mainImage ? (
                    <>
                      <img
                        src={mainImage}
                        alt="Glavna fotografija artikla"
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-slate-950/80 p-3 backdrop-blur">
                        <button
                          type="button"
                          onClick={() =>
                            mainImageInputRef.current?.click()
                          }
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          <Camera size={15} />
                          Promijeni
                        </button>

                        <button
                          type="button"
                          onClick={() => setMainImage('')}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-300 transition hover:bg-red-500/25"
                          aria-label="Ukloni fotografiju"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        mainImageInputRef.current?.click()
                      }
                      className="flex h-full w-full flex-col items-center justify-center px-6 text-center transition hover:bg-slate-900"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-sky-400">
                        <ImagePlus size={29} />
                      </div>

                      <p className="mt-4 font-semibold text-white">
                        Dodaj fotografiju
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Fotografiraj artikl ili odaberi
                        fotografiju iz galerije
                      </p>
                    </button>
                  )}
                </div>

                <input
                  ref={mainImageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleMainImageChange}
                  className="hidden"
                />

                {isProcessingImage && (
                  <p className="mt-3 text-sm text-sky-400">
                    Obrada fotografije...
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel>
                    Dodatne fotografije
                  </FieldLabel>

                  <span className="mb-2 text-xs text-slate-500">
                    {additionalImages.length}/5
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {additionalImages.map(
                    (image, index) => (
                      <div
                        key={`${image.slice(0, 25)}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
                      >
                        <img
                          src={image}
                          alt={`Dodatna fotografija ${
                            index + 1
                          }`}
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeAdditionalImage(index)
                          }
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/80 text-red-300 opacity-100 backdrop-blur transition hover:bg-red-500 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Ukloni fotografiju"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ),
                  )}

                  {additionalImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        additionalImagesInputRef.current?.click()
                      }
                      className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-slate-400 transition hover:border-sky-500 hover:bg-sky-500/5 hover:text-sky-400"
                    >
                      <Upload size={24} />

                      <span className="mt-2 text-xs font-semibold">
                        Dodaj slike
                      </span>
                    </button>
                  )}
                </div>

                <input
                  ref={additionalImagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesChange}
                  className="hidden"
                />

                <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                  <div className="flex gap-3">
                    <Info
                      size={18}
                      className="mt-0.5 shrink-0 text-sky-400"
                    />

                    <p className="text-sm leading-6 text-slate-300">
                      Dodaj fotografiju prednje strane,
                      ambalaže, tvorničke oznake ili police
                      na kojoj se artikl nalazi. To olakšava
                      prepoznavanje praktikantima i novim
                      radnicima.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Osnovni podaci"
            description="Naziv i alternativni nazivi koriste se u brzoj pretrazi skladišta."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <FieldLabel required>
                  Naziv artikla
                </FieldLabel>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      'name',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: PVC odvodno koljeno Ø50 – 87°"
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Kraći naziv
                </FieldLabel>

                <input
                  type="text"
                  value={form.shortName}
                  onChange={(event) =>
                    updateField(
                      'shortName',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Koljeno 50"
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Šifra artikla
                </FieldLabel>

                <input
                  type="text"
                  value={form.code}
                  onChange={(event) =>
                    updateField(
                      'code',
                      event.target.value,
                    )
                  }
                  placeholder="Automatski ako ostane prazno"
                  className={inputClassName}
                />
              </label>

              <label className="md:col-span-2">
                <FieldLabel>
                  Alternativni nazivi
                </FieldLabel>

                <input
                  type="text"
                  value={form.alternativeNames}
                  onChange={(event) =>
                    updateField(
                      'alternativeNames',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: koljeno 50, sivo koljeno, HT koljeno, odvodno koljeno"
                  className={inputClassName}
                />

                <p className="mt-2 text-xs text-slate-500">
                  Odvoji nazive zarezom. Pretraga će
                  pronalaziti artikl po svakom od njih.
                </p>
              </label>

              <label>
                <FieldLabel>
                  Barkod proizvođača
                </FieldLabel>

                <input
                  type="text"
                  value={form.barcode}
                  onChange={(event) =>
                    updateField(
                      'barcode',
                      event.target.value,
                    )
                  }
                  placeholder="EAN ili druga oznaka"
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Proizvođač
                </FieldLabel>

                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(event) =>
                    updateField(
                      'manufacturer',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Peštan"
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Dobavljač
                </FieldLabel>

                <input
                  type="text"
                  value={form.supplier}
                  onChange={(event) =>
                    updateField(
                      'supplier',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Petrokov"
                  className={inputClassName}
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Kategorija i dimenzije"
            description="Pravilno razvrstavanje olakšava pronalazak sličnih artikala."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <FieldLabel required>
                  Kategorija
                </FieldLabel>

                <select
                  value={form.category}
                  onChange={(event) =>
                    handleCategoryChange(
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">
                    Odaberi kategoriju
                  </option>

                  {DEFAULT_CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <FieldLabel>
                  Podkategorija
                </FieldLabel>

                <input
                  type="text"
                  list="inventory-subcategories"
                  value={form.subcategory}
                  onChange={(event) =>
                    updateField(
                      'subcategory',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Koljena"
                  className={inputClassName}
                />

                <datalist id="inventory-subcategories">
                  {availableSubcategories.map(
                    (subcategory) => (
                      <option
                        key={subcategory}
                        value={subcategory}
                      />
                    ),
                  )}
                </datalist>
              </label>

              <label>
                <FieldLabel>
                  Promjer
                </FieldLabel>

                <input
                  type="text"
                  value={form.diameter}
                  onChange={(event) =>
                    updateField(
                      'diameter',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Ø50"
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Dimenzija
                </FieldLabel>

                <input
                  type="text"
                  value={form.dimension}
                  onChange={(event) =>
                    updateField(
                      'dimension',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: 50 × 50 mm ili 100 cm"
                  className={inputClassName}
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Način praćenja količine"
            description="Odaberi vodi li se artikl u komadima, metrima ili kao komad cijevi određene dužine."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  handleTrackingTypeChange('pieces')
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  form.trackingType === 'pieces'
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <Package
                  size={23}
                  className={
                    form.trackingType === 'pieces'
                      ? 'text-sky-400'
                      : 'text-slate-500'
                  }
                />

                <p className="mt-3 font-semibold text-white">
                  Komadi
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Fitingi, ventili, koljena, vijci,
                  uređaji i drugi komadni artikli.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTrackingTypeChange('metres')
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  form.trackingType === 'metres'
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <Package
                  size={23}
                  className={
                    form.trackingType === 'metres'
                      ? 'text-sky-400'
                      : 'text-slate-500'
                  }
                />

                <p className="mt-3 font-semibold text-white">
                  Metri
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Bakrene, PEX, ALU-PEX i druge cijevi
                  koje se režu prema potrebnoj dužini.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTrackingTypeChange(
                    'piece-length',
                  )
                }
                className={`rounded-2xl border p-4 text-left transition ${
                  form.trackingType === 'piece-length'
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <Package
                  size={23}
                  className={
                    form.trackingType ===
                    'piece-length'
                      ? 'text-sky-400'
                      : 'text-slate-500'
                  }
                />

                <p className="mt-3 font-semibold text-white">
                  Komadna cijev
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Cijevi od 25, 50, 100 ili 200 cm.
                  Program broji komade i ukupne metre.
                </p>
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <label>
                <FieldLabel>
                  Jedinica mjere
                </FieldLabel>

                <select
                  value={form.unit}
                  onChange={(event) =>
                    updateField(
                      'unit',
                      event.target
                        .value as InventoryUnit,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="kom">kom</option>
                  <option value="m">m</option>
                  <option value="kg">kg</option>
                  <option value="l">l</option>
                  <option value="paket">
                    paket
                  </option>
                  <option value="rola">rola</option>
                  <option value="set">set</option>
                </select>
              </label>

              {form.trackingType ===
                'piece-length' && (
                <label>
                  <FieldLabel required>
                    Dužina jednog komada u metrima
                  </FieldLabel>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.pieceLengthMetres}
                    onChange={(event) =>
                      updateField(
                        'pieceLengthMetres',
                        event.target.value,
                      )
                    }
                    placeholder="Primjer: 0,25 ili 2"
                    className={inputClassName}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    25 cm = 0,25 m, 50 cm = 0,5 m,
                    100 cm = 1 m.
                  </p>
                </label>
              )}

              <label>
                <FieldLabel>
                  Minimalno stanje
                </FieldLabel>

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={form.minimumQuantity}
                  onChange={(event) =>
                    updateField(
                      'minimumQuantity',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>
            </div>

            {form.trackingType ===
              'piece-length' && (
              <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <p className="text-sm text-slate-300">
                  Izračunata ukupna metraža:
                </p>

                <p className="mt-1 text-2xl font-bold text-sky-300">
                  {formatNumber(
                    calculatedTotalMetres,
                  )}{' '}
                  m
                </p>
              </div>
            )}
          </FormSection>

          <FormSection
            title="Stanje po lokacijama"
            description="Upiši koliko se artikala nalazi u glavnom skladištu, radionici ili vozilu."
          >
            <div className="space-y-3">
              {locations.map((location) => {
                const locationQuantity =
                  locationQuantities.find(
                    (item) =>
                      item.locationId === location.id,
                  )

                return (
                  <div
                    key={location.id}
                    className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[1fr_180px] sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sky-400">
                        <MapPin size={19} />
                      </div>

                      <div>
                        <p className="font-semibold text-white">
                          {location.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {location.description ||
                            'Lokacija skladišta'}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        value={
                          locationQuantity?.quantity ??
                          ''
                        }
                        onChange={(event) =>
                          updateLocationQuantity(
                            location.id,
                            event.target.value,
                          )
                        }
                        placeholder="0"
                        className={`${inputClassName} pr-16`}
                      />

                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        {form.unit}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-800/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Ukupno na svim lokacijama
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {formatNumber(totalLocationQuantity)}{' '}
                  {form.unit}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={16} />

                Ukupno stanje računa se automatski
              </div>
            </div>

            {locations.length === 0 && (
              <label className="mt-4 block">
                <FieldLabel>
                  Početno stanje
                </FieldLabel>

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(event) =>
                    updateField(
                      'quantity',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>
            )}
          </FormSection>

          <FormSection
            title="Opis i edukacija radnika"
            description="Ove informacije pomažu praktikantima i novim radnicima prepoznati artikl i pravilno ga koristiti."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <label>
                <FieldLabel>
                  Opis artikla
                </FieldLabel>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      'description',
                      event.target.value,
                    )
                  }
                  placeholder="Kratak opis artikla, materijala i osnovnih svojstava..."
                  className={textareaClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Gdje se koristi
                </FieldLabel>

                <textarea
                  value={form.usageDescription}
                  onChange={(event) =>
                    updateField(
                      'usageDescription',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Koristi se za promjenu smjera odvodne cijevi Ø50 kod umivaonika, sudopera ili perilice."
                  className={textareaClassName}
                />
              </label>

              <label className="lg:col-span-2">
                <FieldLabel>
                  Važna napomena ili upozorenje
                </FieldLabel>

                <textarea
                  value={form.warningNote}
                  onChange={(event) =>
                    updateField(
                      'warningNote',
                      event.target.value,
                    )
                  }
                  placeholder="Primjer: Prije spajanja provjeriti gumicu, očistiti rub cijevi i koristiti odgovarajuće sredstvo za podmazivanje."
                  className={textareaClassName}
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Cijene"
            description="Cijene nisu obavezne, ali omogućuju izračun vrijednosti zalihe."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <label>
                <FieldLabel>
                  Nabavna cijena
                </FieldLabel>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.purchasePrice}
                    onChange={(event) =>
                      updateField(
                        'purchasePrice',
                        event.target.value,
                      )
                    }
                    className={`${inputClassName} pr-12`}
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    €
                  </span>
                </div>
              </label>

              <label>
                <FieldLabel>
                  Prodajna cijena
                </FieldLabel>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.salePrice}
                    onChange={(event) =>
                      updateField(
                        'salePrice',
                        event.target.value,
                      )
                    }
                    className={`${inputClassName} pr-12`}
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    €
                  </span>
                </div>
              </label>

              <label>
                <FieldLabel>
                  PDV
                </FieldLabel>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    inputMode="decimal"
                    value={form.vatRate}
                    onChange={(event) =>
                      updateField(
                        'vatRate',
                        event.target.value,
                      )
                    }
                    className={`${inputClassName} pr-12`}
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    %
                  </span>
                </div>
              </label>
            </div>
          </FormSection>

          <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <X size={18} />
                Odustani
              </button>

              <button
                type="submit"
                disabled={
                  isSaving || isProcessingImage
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Spremanje...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {isEditMode
                      ? 'Spremi promjene'
                      : 'Dodaj artikl'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewInventoryItemPage
