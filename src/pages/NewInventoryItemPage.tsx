import {
  AlertTriangle,
  ArrowLeft,
  ImagePlus,
  MapPin,
  Package,
  Plus,
  Save,
  Trash2,
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
import {
  createInventoryItem,
  createInventoryLocation,
  getInventoryItemById,
  getInventoryLocations,
  updateInventoryItem,
  type InventoryLocation,
  type InventoryTrackingType,
  type InventoryUnit,
} from '../services/inventory.service'
import { fileToCompressedDataUrl } from '../utils/imageUtils'

import DraftAutosaveBadge, {
  type DraftAutosaveState,
} from '../components/DraftAutosaveBadge'
import {
  deleteUserDraft,
  formatDraftSavedAt,
  loadUserDraft,
  saveUserDraft,
} from '../services/drafts.service'

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

type LocationQuantity = {
  locationId: string
  locationName: string
  quantity: string
}

type FormState = {
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

const INITIAL_FORM: FormState = {
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

const inputClassName =
  'h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'

const textareaClassName =
  'min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10'

function parseNumber(value: string): number {
  const parsed = Number(
    value
      .trim()
      .replace(/\s/g, '')
      .replace(',', '.'),
  )

  return Number.isFinite(parsed)
    ? parsed
    : 0
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-400">
          {description}
        </p>
      )}

      <div className="mt-5">
        {children}
      </div>
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
        <span className="ml-1 text-red-400">
          *
        </span>
      )}
    </span>
  )
}

export function NewInventoryItemPage() {

  const [
    autosaveState,
    setAutosaveState,
  ] = useState<DraftAutosaveState>('idle')

  const [
    autosaveText,
    setAutosaveText,
  ] = useState('')

  const [
    draftReady,
    setDraftReady,
  ] = useState(false)

  const navigate = useNavigate()
  const { id } = useParams()
  const { can } = useAuth()

  const isEditMode = Boolean(id)
  const canViewCosts = can('inventory.viewCosts')

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [mainImage, setMainImage] = useState('')
  const [additionalImages, setAdditionalImages] =
    useState<string[]>([])

  const [locations, setLocations] =
    useState<InventoryLocation[]>([])

  const [locationQuantities, setLocationQuantities] =
    useState<LocationQuantity[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessingImage, setIsProcessingImage] =
    useState(false)

  const [newLocationName, setNewLocationName] = useState('')
  const [isAddingLocation, setIsAddingLocation] =
    useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const savedLocations =
          await getInventoryLocations()

        if (cancelled) {
          return
        }

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

        const existingItem =
          await getInventoryItemById(id)

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
          minimumQuantity:
            String(existingItem.minimumQuantity),
          pieceLengthMetres:
            String(existingItem.pieceLengthMetres || ''),

          diameter: existingItem.diameter,
          dimension: existingItem.dimension,

          purchasePrice:
            String(existingItem.purchasePrice),
          salePrice:
            String(existingItem.salePrice),
          vatRate:
            String(existingItem.vatRate),
        })

        setMainImage(existingItem.image)
        setAdditionalImages(existingItem.additionalImages)

        setLocationQuantities(
          savedLocations.map((location) => {
            const stock =
              existingItem.locationStocks.find(
                (itemStock) =>
                  itemStock.locationId === location.id,
              )

            return {
              locationId: location.id,
              locationName: location.name,
              quantity: stock
                ? String(stock.quantity)
                : '',
            }
          }),
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Artikl nije moguće učitati.',
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id])



  useEffect(() => {
    if (id) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'inventory-item',
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

        setForm({
          ...INITIAL_FORM,
          ...(value.form ?? {}),
        })

        setMainImage(value.mainImage ?? '')

        setAdditionalImages(
          Array.isArray(value.additionalImages)
            ? value.additionalImages
            : [],
        )

        if (
          Array.isArray(
            value.locationQuantities,
          )
        ) {
          setLocationQuantities(
            value.locationQuantities,
          )
        }

        setAutosaveState('restored')
        setAutosaveText(
          `Nastavljen nedovršeni artikl · ${formatDraftSavedAt(
            draft.updatedAt,
          )}`,
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
  }, [id])

  useEffect(() => {
    if (
      !draftReady ||
      id
    ) {
      return
    }

    const hasContent =
      Boolean(
        form.name.trim() ||
        form.shortName.trim() ||
        form.barcode.trim() ||
        form.description.trim() ||
        mainImage ||
        additionalImages.length ||
        locationQuantities.some(
          (location) =>
            location.quantity.trim(),
        ),
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void (async () => {
          setAutosaveState('saving')

          const savedAt =
            await saveUserDraft(
              'inventory-item',
              'new',
              {
                form,
                mainImage,
                additionalImages,
                locationQuantities,
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
        })()
      }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    id,
    form,
    mainImage,
    additionalImages,
    locationQuantities,
  ])

  async function discardInventoryDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršeni artikl?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'inventory-item',
      'new',
    )

    window.location.reload()
  }
  const availableSubcategories = useMemo(
    () =>
      DEFAULT_SUBCATEGORIES[form.category] ?? [],
    [form.category],
  )

  const initialQuantity = useMemo(
    () =>
      locationQuantities.reduce(
        (sum, location) =>
          sum + parseNumber(location.quantity),
        0,
      ),
    [locationQuantities],
  )

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))

    setErrorMessage('')
  }

  function updateLocationQuantity(
    locationId: string,
    quantity: string,
  ) {
    setLocationQuantities((current) =>
      current.map((item) =>
        item.locationId === locationId
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    )
  }

  function handleTrackingTypeChange(
    value: InventoryTrackingType,
  ) {
    setForm((current) => ({
      ...current,
      trackingType: value,
      unit:
        value === 'metres'
          ? 'm'
          : 'kom',
      pieceLengthMetres:
        value === 'piece-length'
          ? current.pieceLengthMetres
          : '',
    }))
  }

  async function handleMainImage(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setIsProcessingImage(true)

      const image =
        await fileToCompressedDataUrl(
          file,
          1400,
          1400,
          0.82,
        )

      setMainImage(image)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Fotografiju nije moguće učitati.',
      )
    } finally {
      setIsProcessingImage(false)
    }
  }

  async function handleAdditionalImages(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files ?? [],
    )

    event.target.value = ''

    if (files.length === 0) {
      return
    }

    try {
      setIsProcessingImage(true)

      const remaining =
        Math.max(
          0,
          6 - additionalImages.length,
        )

      const images =
        await Promise.all(
          files
            .slice(0, remaining)
            .map((file) =>
              fileToCompressedDataUrl(
                file,
                1200,
                1200,
                0.8,
              ),
            ),
        )

      setAdditionalImages((current) => [
        ...current,
        ...images,
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Fotografije nije moguće učitati.',
      )
    } finally {
      setIsProcessingImage(false)
    }
  }

  async function handleAddLocation() {
    if (!newLocationName.trim() || isAddingLocation) {
      return
    }

    try {
      setIsAddingLocation(true)
      setErrorMessage('')

      const location =
        await createInventoryLocation({
          name: newLocationName.trim(),
        })

      setLocations((current) => [
        ...current,
        location,
      ])

      setLocationQuantities((current) => [
        ...current,
        {
          locationId: location.id,
          locationName: location.name,
          quantity: '',
        },
      ])

      setNewLocationName('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Lokaciju nije moguće dodati.',
      )
    } finally {
      setIsAddingLocation(false)
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSaving) {
      return
    }

    if (!form.name.trim()) {
      setErrorMessage('Naziv artikla je obavezan.')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')

      const input = {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        alternativeNames:
          form.alternativeNames
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),

        code: form.code.trim(),
        barcode: form.barcode.trim(),

        category: form.category,
        subcategory: form.subcategory,

        manufacturer: form.manufacturer.trim(),
        supplier: form.supplier.trim(),

        description: form.description.trim(),
        usageDescription:
          form.usageDescription.trim(),
        warningNote: form.warningNote.trim(),

        image: mainImage,
        additionalImages,

        trackingType: form.trackingType,
        unit: form.unit,

        minimumQuantity:
          Math.max(
            0,
            parseNumber(form.minimumQuantity),
          ),

        pieceLengthMetres:
          Math.max(
            0,
            parseNumber(form.pieceLengthMetres),
          ),

        diameter: form.diameter.trim(),
        dimension: form.dimension.trim(),

        purchasePrice:
          canViewCosts
            ? Math.max(
                0,
                parseNumber(form.purchasePrice),
              )
            : 0,

        salePrice:
          canViewCosts
            ? Math.max(
                0,
                parseNumber(form.salePrice),
              )
            : 0,

        vatRate:
          canViewCosts
            ? Math.max(
                0,
                parseNumber(form.vatRate),
              )
            : 25,
      }

      if (isEditMode && id) {
        await updateInventoryItem(
          id,
          input,
        )

        navigate(
          `/inventory/items/${id}`,
        )

        return
      }

      const created =
        await createInventoryItem({
          ...input,

          quantity:
            locations.length === 0
              ? Math.max(
                  0,
                  parseNumber(form.quantity),
                )
              : undefined,

          locationStocks:
            locationQuantities
              .map((location) => ({
                locationId:
                  location.locationId,
                locationName:
                  location.locationName,
                quantity:
                  Math.max(
                    0,
                    parseNumber(location.quantity),
                  ),
              }))
              .filter(
                (location) =>
                  location.quantity > 0,
              ),
        })

      navigate(
        `/inventory/items/${created.id}`,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Artikl nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje artikla..." />
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8"
    >
      <DraftAutosaveBadge
        state={autosaveState}
        text={autosaveText}
        onDiscard={
          !id &&
          autosaveState !== 'idle'
            ? () =>
                void discardInventoryDraft()
            : undefined
        }
      />
      <div className="mx-auto max-w-[1300px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() =>
                navigate(
                  isEditMode && id
                    ? `/inventory/items/${id}`
                    : '/inventory',
                )
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
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
                {isEditMode
                  ? 'Promijeni osnovne podatke artikla. Stanje robe mijenja se kroz ulaz/izlaz robe.'
                  : 'Dodaj artikl u zajedničko skladište tvrtke.'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isSaving ||
              isProcessingImage
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 font-semibold text-white disabled:opacity-50"
          >
            <Save size={18} />

            {isSaving
              ? 'Spremanje...'
              : 'Spremi artikl'}
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <FormSection
            title="Osnovni podaci"
            description="Naziv, šifra, kategorija i opis artikla."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <FieldLabel required>
                  Naziv artikla
                </FieldLabel>

                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      'name',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                  placeholder="Press spojnica 22 mm"
                />
              </label>

              <label>
                <FieldLabel>
                  Kratki naziv
                </FieldLabel>

                <input
                  value={form.shortName}
                  onChange={(event) =>
                    updateField(
                      'shortName',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Šifra artikla
                </FieldLabel>

                <input
                  value={form.code}
                  onChange={(event) =>
                    updateField(
                      'code',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                  placeholder="Automatski ako ostane prazno"
                />
              </label>

              <label>
                <FieldLabel>
                  Barkod
                </FieldLabel>

                <input
                  value={form.barcode}
                  onChange={(event) =>
                    updateField(
                      'barcode',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Kategorija
                </FieldLabel>

                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category:
                        event.target.value,
                      subcategory: '',
                    }))
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

                <select
                  value={form.subcategory}
                  onChange={(event) =>
                    updateField(
                      'subcategory',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">
                    Odaberi podkategoriju
                  </option>

                  {availableSubcategories.map(
                    (subcategory) => (
                      <option
                        key={subcategory}
                        value={subcategory}
                      >
                        {subcategory}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <FieldLabel>
                  Proizvođač
                </FieldLabel>

                <input
                  value={form.manufacturer}
                  onChange={(event) =>
                    updateField(
                      'manufacturer',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Dobavljač
                </FieldLabel>

                <input
                  value={form.supplier}
                  onChange={(event) =>
                    updateField(
                      'supplier',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>

              <label className="md:col-span-2">
                <FieldLabel>
                  Alternativni nazivi
                </FieldLabel>

                <input
                  value={form.alternativeNames}
                  onChange={(event) =>
                    updateField(
                      'alternativeNames',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                  placeholder="Odvoji zarezom"
                />
              </label>

              <label className="md:col-span-2">
                <FieldLabel>
                  Opis
                </FieldLabel>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      'description',
                      event.target.value,
                    )
                  }
                  className={textareaClassName}
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Praćenje i količina"
            description={
              isEditMode
                ? 'Vrsta praćenja i minimalno stanje. Trenutnu količinu mijenjaj kroz ulaz ili izlaz robe.'
                : 'Postavi način praćenja i početno stanje.'
            }
          >
            <div className="grid gap-5 md:grid-cols-3">
              <label>
                <FieldLabel>
                  Način praćenja
                </FieldLabel>

                <select
                  value={form.trackingType}
                  onChange={(event) =>
                    handleTrackingTypeChange(
                      event.target
                        .value as InventoryTrackingType,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="pieces">
                    Komadi
                  </option>
                  <option value="metres">
                    Metri
                  </option>
                  <option value="piece-length">
                    Komadi određene dužine
                  </option>
                </select>
              </label>

              <label>
                <FieldLabel>
                  Jedinica
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
                  {[
                    'kom',
                    'm',
                    'kg',
                    'l',
                    'paket',
                    'rola',
                    'set',
                  ].map((unit) => (
                    <option
                      key={unit}
                      value={unit}
                    >
                      {unit}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <FieldLabel>
                  Minimalno stanje
                </FieldLabel>

                <input
                  value={form.minimumQuantity}
                  onChange={(event) =>
                    updateField(
                      'minimumQuantity',
                      event.target.value,
                    )
                  }
                  inputMode="decimal"
                  className={inputClassName}
                />
              </label>

              {form.trackingType ===
                'piece-length' && (
                <label>
                  <FieldLabel>
                    Dužina jednog komada u metrima
                  </FieldLabel>

                  <input
                    value={
                      form.pieceLengthMetres
                    }
                    onChange={(event) =>
                      updateField(
                        'pieceLengthMetres',
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    className={inputClassName}
                  />
                </label>
              )}

              <label>
                <FieldLabel>
                  Promjer
                </FieldLabel>

                <input
                  value={form.diameter}
                  onChange={(event) =>
                    updateField(
                      'diameter',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Dimenzija
                </FieldLabel>

                <input
                  value={form.dimension}
                  onChange={(event) =>
                    updateField(
                      'dimension',
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                />
              </label>
            </div>
          </FormSection>

          {!isEditMode && (
            <FormSection
              title="Početno stanje i lokacije"
              description="Količina će se odmah spremiti u zajedničko skladište i evidentirati kao početni ulaz robe."
            >
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin size={18} />
                  <span className="font-semibold">
                    Lokacije skladišta
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={newLocationName}
                    onChange={(event) =>
                      setNewLocationName(
                        event.target.value,
                      )
                    }
                    placeholder="Npr. Polica A1"
                    className={inputClassName}
                  />

                  <button
                    type="button"
                    disabled={
                      isAddingLocation ||
                      !newLocationName.trim()
                    }
                    onClick={() =>
                      void handleAddLocation()
                    }
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 font-semibold text-white disabled:opacity-50"
                  >
                    <Plus size={17} />
                    Dodaj lokaciju
                  </button>
                </div>
              </div>

              {locations.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {locationQuantities.map((location) => (
                    <label
                      key={location.locationId}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <FieldLabel>
                        {location.locationName}
                      </FieldLabel>

                      <input
                        value={location.quantity}
                        onChange={(event) =>
                          updateLocationQuantity(
                            location.locationId,
                            event.target.value,
                          )
                        }
                        inputMode="decimal"
                        placeholder="0"
                        className={inputClassName}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <label className="mt-4 block">
                  <FieldLabel>
                    Početna količina
                  </FieldLabel>

                  <input
                    value={form.quantity}
                    onChange={(event) =>
                      updateField(
                        'quantity',
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    className={inputClassName}
                  />
                </label>
              )}

              {locations.length > 0 && (
                <p className="mt-4 text-sm text-slate-400">
                  Ukupno početno stanje:{' '}
                  <span className="font-bold text-white">
                    {initialQuantity}{' '}
                    {form.unit}
                  </span>
                </p>
              )}
            </FormSection>
          )}

          {canViewCosts && (
            <FormSection
              title="Cijene"
              description="Cijene nisu vidljive radnicima bez posebne ovlasti."
            >
              <div className="grid gap-5 md:grid-cols-3">
                <label>
                  <FieldLabel>
                    Nabavna cijena
                  </FieldLabel>

                  <input
                    value={form.purchasePrice}
                    onChange={(event) =>
                      updateField(
                        'purchasePrice',
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    className={inputClassName}
                  />
                </label>

                <label>
                  <FieldLabel>
                    Prodajna cijena
                  </FieldLabel>

                  <input
                    value={form.salePrice}
                    onChange={(event) =>
                      updateField(
                        'salePrice',
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    className={inputClassName}
                  />
                </label>

                <label>
                  <FieldLabel>
                    PDV %
                  </FieldLabel>

                  <input
                    value={form.vatRate}
                    onChange={(event) =>
                      updateField(
                        'vatRate',
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    className={inputClassName}
                  />
                </label>
              </div>
            </FormSection>
          )}

          <FormSection
            title="Fotografije"
            description="Glavna slika i dodatne fotografije artikla."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-300">
                  Glavna slika
                </p>

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <div className="flex aspect-video items-center justify-center">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt="Glavna slika"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Package
                        size={42}
                        className="text-slate-700"
                      />
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-slate-800 p-3">
                    <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white">
                      <ImagePlus size={17} />
                      Učitaj

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImage}
                        className="hidden"
                      />
                    </label>

                    {mainImage && (
                      <button
                        type="button"
                        onClick={() =>
                          setMainImage('')
                        }
                        className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-400"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-300">
                  Dodatne slike
                </p>

                <label className="flex min-h-28 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 text-sm font-semibold text-slate-300">
                  <Plus size={18} />
                  Dodaj slike

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAdditionalImages}
                    className="hidden"
                  />
                </label>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  {additionalImages.map(
                    (image, index) => (
                      <div
                        key={`${image.slice(0, 20)}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
                      >
                        <img
                          src={image}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setAdditionalImages(
                              (current) =>
                                current.filter(
                                  (_, imageIndex) =>
                                    imageIndex !== index,
                                ),
                            )
                          }
                          className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-white"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Dodatne napomene">
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <FieldLabel>
                  Opis korištenja
                </FieldLabel>

                <textarea
                  value={form.usageDescription}
                  onChange={(event) =>
                    updateField(
                      'usageDescription',
                      event.target.value,
                    )
                  }
                  className={textareaClassName}
                />
              </label>

              <label>
                <FieldLabel>
                  Upozorenje / napomena
                </FieldLabel>

                <textarea
                  value={form.warningNote}
                  onChange={(event) =>
                    updateField(
                      'warningNote',
                      event.target.value,
                    )
                  }
                  className={textareaClassName}
                />
              </label>
            </div>
          </FormSection>
        </div>

        <div className="flex flex-col-reverse gap-3 py-8 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() =>
              navigate(
                isEditMode && id
                  ? `/inventory/items/${id}`
                  : '/inventory',
              )
            }
            className="h-12 rounded-xl bg-slate-800 px-5 font-semibold text-white"
          >
            Odustani
          </button>

          <button
            type="submit"
            disabled={
              isSaving ||
              isProcessingImage
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 font-semibold text-white disabled:opacity-50"
          >
            <Save size={18} />

            {isSaving
              ? 'Spremanje...'
              : 'Spremi artikl'}
          </button>
        </div>
      </div>

      {(isSaving ||
        isProcessingImage) && (
        <FersysLoader
          fullScreen
          text={
            isSaving
              ? 'Spremanje artikla...'
              : 'Obrada fotografije...'
          }
        />
      )}
    </form>
  )
}

export default NewInventoryItemPage