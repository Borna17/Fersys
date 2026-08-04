import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Box,
  CalendarDays,
  Check,
  Download,
  Edit3,
  Euro,
  History,
  ImageIcon,
  MapPin,
  Package,
  Printer,
  QrCode,
  Ruler,
  Tag,
  Trash2,
  User,
  Warehouse,
  X,
} from 'lucide-react'
import QRCode from 'qrcode'
import {
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

import {
  adjustInventoryQuantity,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryLocations,
  getInventoryMovementsByItemId,
  type InventoryItem,
  type InventoryLocation,
  type InventoryMovement,
} from '../utils/inventoryStorage'

type MovementAction = 'entry' | 'exit'

interface MovementForm {
  action: MovementAction
  quantity: string
  locationId: string
  employeeName: string
  workOrderNumber: string
  incomingInvoiceNumber: string
  note: string
}

const INITIAL_MOVEMENT_FORM: MovementForm = {
  action: 'exit',
  quantity: '1',
  locationId: '',
  employeeName: '',
  workOrderNumber: '',
  incomingInvoiceNumber: '',
  note: '',
}

function parseNumber(value: string): number {
  const normalizedValue = value
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')

  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('hr-HR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getTrackingLabel(item: InventoryItem): string {
  if (item.trackingType === 'metres') {
    return 'Praćenje u metrima'
  }

  if (item.trackingType === 'piece-length') {
    return 'Komadi određene dužine'
  }

  return 'Praćenje u komadima'
}

function getMovementLabel(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return 'Ulaz robe'
  }

  if (movement.type === 'exit') {
    return 'Izlaz robe'
  }

  if (movement.type === 'transfer') {
    return 'Premještaj'
  }

  return 'Ispravak stanja'
}

function getMovementQuantityPrefix(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return '+'
  }

  if (movement.type === 'exit') {
    return '−'
  }

  return ''
}

function getMovementClassName(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  }

  if (movement.type === 'exit') {
    return 'border-red-500/30 bg-red-500/10 text-red-300'
  }

  if (movement.type === 'transfer') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
}

function getStockStatus(item: InventoryItem): {
  label: string
  className: string
} {
  if (item.quantity <= 0) {
    return {
      label: 'Nema na stanju',
      className:
        'border-red-500/30 bg-red-500/10 text-red-300',
    }
  }

  if (
    item.minimumQuantity > 0 &&
    item.quantity <= item.minimumQuantity
  ) {
    return {
      label: 'Nisko stanje',
      className:
        'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: 'Na stanju',
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  }
}

function DetailCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode
  title: string
  value: string
  description?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sky-400">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <p className="mt-1 break-words font-semibold text-white">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function InformationSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      <div className="mt-4">
        {children}
      </div>
    </section>
  )
}

export function InventoryItemDetailsPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewCosts =
    can('inventory.viewCosts')

  const canManageInventory =
    can('inventory.manage')
  const { id } = useParams()

  const [item, setItem] =
    useState<InventoryItem | null>(null)

  const [locations, setLocations] = useState<
    InventoryLocation[]
  >([])

  const [movements, setMovements] = useState<
    InventoryMovement[]
  >([])

  const [qrImage, setQrImage] = useState('')
  const [selectedImage, setSelectedImage] =
    useState('')

  const [showMovementModal, setShowMovementModal] =
    useState(false)

  const [showDeleteModal, setShowDeleteModal] =
    useState(false)

  const [movementForm, setMovementForm] =
    useState<MovementForm>(
      INITIAL_MOVEMENT_FORM,
    )

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] =
    useState('')

  const [isSavingMovement, setIsSavingMovement] =
    useState(false)

  function loadItemData() {
    if (!id) {
      return
    }

    const savedItem = getInventoryItemById(id)

    if (!savedItem) {
      setItem(null)
      return
    }

    setItem(savedItem)
    setMovements(
      getInventoryMovementsByItemId(id),
    )

    setSelectedImage(
      savedItem.image ||
        savedItem.additionalImages[0] ||
        '',
    )
  }

  useEffect(() => {
    setLocations(getInventoryLocations())
    loadItemData()
  }, [id])

  useEffect(() => {
    if (!item?.qrValue) {
      setQrImage('')
      return
    }

    QRCode.toDataURL(item.qrValue, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((image) => {
        setQrImage(image)
      })
      .catch(() => {
        setQrImage('')
      })
  }, [item?.qrValue])

  const allImages = useMemo(() => {
    if (!item) {
      return []
    }

    return [
      item.image,
      ...item.additionalImages,
    ].filter(Boolean)
  }, [item])

  const stockStatus = item
    ? getStockStatus(item)
    : null

  const totalPurchaseValue = item
    ? item.quantity * item.purchasePrice
    : 0

  function openMovementModal(
    action: MovementAction,
  ) {
    if (!canManageInventory) {
      setErrorMessage(
        'Nemaš dopuštenje za promjenu stanja skladišta.',
      )
      return
    }

    if (!item) {
      return
    }

    const firstAvailableLocation =
      action === 'exit'
        ? item.locationStocks.find(
            (stock) => stock.quantity > 0,
          )?.locationId
        : locations[0]?.id

    setMovementForm({
      ...INITIAL_MOVEMENT_FORM,
      action,
      quantity: '1',
      locationId: firstAvailableLocation ?? '',
    })

    setErrorMessage('')
    setSuccessMessage('')
    setShowMovementModal(true)
  }

  function updateMovementField<
    Key extends keyof MovementForm,
  >(
    field: Key,
    value: MovementForm[Key],
  ) {
    setMovementForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrorMessage('')
  }

  function handleMovementSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!item) {
      return
    }

    const quantity = parseNumber(
      movementForm.quantity,
    )

    if (quantity <= 0) {
      setErrorMessage(
        'Unesi ispravnu količinu.',
      )
      return
    }

    const selectedLocation =
      locations.find(
        (location) =>
          location.id ===
          movementForm.locationId,
      )

    try {
      setIsSavingMovement(true)
      setErrorMessage('')

      adjustInventoryQuantity({
        itemId: item.id,
        type: movementForm.action,
        quantity,

        locationId: selectedLocation?.id,
        locationName: selectedLocation?.name,

        employeeName:
          movementForm.employeeName.trim() ||
          undefined,

        workOrderNumber:
          movementForm.workOrderNumber.trim() ||
          undefined,

        incomingInvoiceNumber:
          movementForm.incomingInvoiceNumber.trim() ||
          undefined,

        note:
          movementForm.note.trim() ||
          undefined,
      })

      loadItemData()

      setSuccessMessage(
        movementForm.action === 'entry'
          ? 'Količina je uspješno dodana.'
          : 'Količina je uspješno skinuta sa stanja.',
      )

      setShowMovementModal(false)

      window.setTimeout(() => {
        setSuccessMessage('')
      }, 3500)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setIsSavingMovement(false)
    }
  }

  function handleDeleteItem() {
    if (!canManageInventory) {
      setErrorMessage(
        'Nemaš dopuštenje za brisanje artikla.',
      )
      return
    }

    if (!item) {
      return
    }

    try {
      deleteInventoryItem(item.id)
      navigate('/inventory')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Artikl nije moguće obrisati.',
      )
      setShowDeleteModal(false)
    }
  }

  function downloadQrCode() {
    if (!qrImage || !item) {
      return
    }

    const link =
      document.createElement('a')

    const safeName = item.name
      .replace(/[^a-zA-Z0-9čćžšđČĆŽŠĐ\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLocaleLowerCase('hr-HR')

    link.href = qrImage
    link.download = `qr-${safeName || item.code}.png`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function printQrLabel() {
    if (!qrImage || !item) {
      return
    }

    const printWindow = window.open(
      '',
      '_blank',
      'width=700,height=700',
    )

    if (!printWindow) {
      setErrorMessage(
        'Preglednik je blokirao prozor za ispis.',
      )
      return
    }

    const quantityText =
      `${formatNumber(item.quantity)} ${item.unit}`

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="hr">
        <head>
          <meta charset="UTF-8" />
          <title>QR naljepnica - ${item.name}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .label {
              width: 90mm;
              min-height: 55mm;
              border: 1px solid #111827;
              border-radius: 4mm;
              padding: 5mm;
              display: flex;
              align-items: center;
              gap: 5mm;
            }

            .qr {
              width: 40mm;
              height: 40mm;
              object-fit: contain;
              flex-shrink: 0;
            }

            .content {
              flex: 1;
              min-width: 0;
            }

            .name {
              margin: 0;
              font-size: 16px;
              line-height: 1.25;
              font-weight: 700;
            }

            .code {
              margin-top: 7px;
              font-size: 12px;
              color: #4b5563;
            }

            .dimension {
              margin-top: 7px;
              font-size: 13px;
              font-weight: 600;
            }

            .stock {
              margin-top: 9px;
              font-size: 13px;
            }

            @media print {
              body {
                padding: 0;
              }

              .label {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="label">
            <img
              src="${qrImage}"
              alt="QR kod"
              class="qr"
            />

            <div class="content">
              <h1 class="name">
                ${item.name}
              </h1>

              <div class="code">
                Šifra: ${item.code || '—'}
              </div>

              ${
                item.diameter || item.dimension
                  ? `
                    <div class="dimension">
                      ${[
                        item.diameter,
                        item.dimension,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                  `
                  : ''
              }

              <div class="stock">
                Stanje: ${quantityText}
              </div>
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print()
            }
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
  }

  if (!id || !item) {
    return (
      <div className="min-h-full bg-slate-950 px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <AlertTriangle
              size={36}
              className="mx-auto text-red-300"
            />

            <h1 className="mt-4 text-xl font-bold text-white">
              Artikl nije pronađen
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Artikl je možda obrisan ili poveznica nije
              ispravna.
            </p>

            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              <ArrowLeft size={18} />
              Povratak u skladište
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  {item.name}
                </h1>

                {stockStatus && (
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${stockStatus.className}`}
                  >
                    {stockStatus.label}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                <span>
                  Šifra: {item.code || '—'}
                </span>

                {item.category && (
                  <span>
                    {item.category}
                    {item.subcategory
                      ? ` / ${item.subcategory}`
                      : ''}
                  </span>
                )}

                <span>
                  {getTrackingLabel(item)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                openMovementModal('exit')
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400"
            >
              <ArrowDown size={18} />
              Uzmi iz skladišta
            </button>

            <button
              type="button"
              onClick={() =>
                openMovementModal('entry')
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              <ArrowUp size={18} />
              Dodaj na stanje
            </button>

            <button
              type="button"
              onClick={() => {
                if (canManageInventory) {
                  navigate(
                    `/inventory/items/${item.id}/edit`,
                  )
                }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <Edit3 size={18} />
              Uredi
            </button>
          </div>
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

        {successMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            <Check
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {successMessage}
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <InformationSection title="Fotografije artikla">
              {selectedImage ? (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <div className="aspect-[4/3]">
                    <img
                      src={selectedImage}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950">
                  <div className="text-center text-slate-500">
                    <ImageIcon
                      size={40}
                      className="mx-auto"
                    />

                    <p className="mt-3 text-sm">
                      Fotografija nije dodana
                    </p>
                  </div>
                </div>
              )}

              {allImages.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {allImages.map((image, index) => (
                    <button
                      key={`${image.slice(0, 30)}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedImage(image)
                      }
                      className={`aspect-square overflow-hidden rounded-xl border transition ${
                        selectedImage === image
                          ? 'border-sky-500 ring-2 ring-sky-500/20'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${item.name} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </InformationSection>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailCard
                icon={<Package size={20} />}
                title="Trenutno stanje"
                value={`${formatNumber(item.quantity)} ${item.unit}`}
                description={
                  item.minimumQuantity > 0
                    ? `Minimalno stanje: ${formatNumber(
                        item.minimumQuantity,
                      )} ${item.unit}`
                    : 'Minimalno stanje nije određeno'
                }
              />

              <DetailCard
                icon={<Ruler size={20} />}
                title="Dimenzija"
                value={
                  [
                    item.diameter,
                    item.dimension,
                  ]
                    .filter(Boolean)
                    .join(' • ') || 'Nije uneseno'
                }
                description={
                  item.trackingType === 'piece-length'
                    ? `Dužina jednog komada: ${formatNumber(
                        item.pieceLengthMetres,
                      )} m`
                    : undefined
                }
              />

              <DetailCard
                icon={<Euro size={20} />}
                title="Vrijednost zalihe"
                value={
                  canViewCosts
                    ? formatCurrency(
                        totalPurchaseValue,
                      )
                    : 'Skriveno'
                }
                description={
                  canViewCosts
                    ? `Nabavna cijena: ${formatCurrency(
                        item.purchasePrice,
                      )}`
                    : 'Financijski podaci nisu dostupni'
                }
              />
            </div>

            {item.trackingType === 'piece-length' && (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
                <p className="text-sm font-medium text-sky-300">
                  Ukupna metraža cijevi
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {formatNumber(item.totalMetres)} m
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {formatNumber(item.quantity)} kom ×{' '}
                  {formatNumber(
                    item.pieceLengthMetres,
                  )}{' '}
                  m
                </p>
              </div>
            )}

            <InformationSection title="Stanje po lokacijama">
              {item.locationStocks.length > 0 ? (
                <div className="space-y-3">
                  {item.locationStocks.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sky-400">
                          <MapPin size={19} />
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            {stock.locationName}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            Lokacija materijala
                          </p>
                        </div>
                      </div>

                      <p className="text-lg font-bold text-white">
                        {formatNumber(stock.quantity)}{' '}
                        {item.unit}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Stanje nije raspoređeno po lokacijama.
                </p>
              )}
            </InformationSection>

            {(item.description ||
              item.usageDescription ||
              item.warningNote) && (
              <InformationSection title="Opis i upute za radnike">
                <div className="space-y-4">
                  {item.description && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Opis artikla
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {item.usageDescription && (
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
                        Gdje se koristi
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {item.usageDescription}
                      </p>
                    </div>
                  )}

                  {item.warningNote && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex gap-3">
                        <AlertTriangle
                          size={19}
                          className="mt-0.5 shrink-0 text-amber-400"
                        />

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                            Važna napomena
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {item.warningNote}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </InformationSection>
            )}

            <InformationSection title="Povijest promjena">
              {movements.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center text-center">
                  <History
                    size={34}
                    className="text-slate-600"
                  />

                  <p className="mt-3 text-sm text-slate-400">
                    Još nema zabilježenih promjena.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => (
                    <div
                      key={movement.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getMovementClassName(
                              movement,
                            )}`}
                          >
                            {movement.type ===
                            'entry' ? (
                              <ArrowUp size={18} />
                            ) : movement.type ===
                              'exit' ? (
                              <ArrowDown size={18} />
                            ) : (
                              <History size={18} />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-white">
                              {getMovementLabel(
                                movement,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(
                                movement.createdAt,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <p
                            className={`text-lg font-bold ${
                              movement.type ===
                              'entry'
                                ? 'text-emerald-300'
                                : movement.type ===
                                  'exit'
                                ? 'text-red-300'
                                : 'text-sky-300'
                            }`}
                          >
                            {getMovementQuantityPrefix(
                              movement,
                            )}
                            {formatNumber(
                              movement.quantity,
                            )}{' '}
                            {item.unit}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Novo stanje:{' '}
                            {formatNumber(
                              movement.newQuantity,
                            )}{' '}
                            {item.unit}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                        {movement.locationName && (
                          <div className="flex items-center gap-2">
                            <MapPin
                              size={15}
                              className="text-slate-600"
                            />

                            {movement.locationName}
                          </div>
                        )}

                        {movement.employeeName && (
                          <div className="flex items-center gap-2">
                            <User
                              size={15}
                              className="text-slate-600"
                            />

                            {movement.employeeName}
                          </div>
                        )}

                        {movement.workOrderNumber && (
                          <div className="flex items-center gap-2">
                            <Box
                              size={15}
                              className="text-slate-600"
                            />

                            Radni nalog:{' '}
                            {movement.workOrderNumber}
                          </div>
                        )}

                        {movement.incomingInvoiceNumber && (
                          <div className="flex items-center gap-2">
                            <Tag
                              size={15}
                              className="text-slate-600"
                            />

                            Ulazni račun:{' '}
                            {
                              movement.incomingInvoiceNumber
                            }
                          </div>
                        )}
                      </div>

                      {movement.note && (
                        <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-400">
                          {movement.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </InformationSection>
          </div>

          <div className="space-y-6">
            <InformationSection title="QR kod artikla">
              <div className="rounded-2xl bg-white p-5">
                {qrImage ? (
                  <img
                    src={qrImage}
                    alt={`QR kod za ${item.name}`}
                    className="mx-auto aspect-square w-full max-w-[320px] object-contain"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-slate-500">
                    <QrCode size={60} />
                  </div>
                )}
              </div>

              <p className="mt-4 break-all text-xs leading-5 text-slate-500">
                {item.qrValue}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={downloadQrCode}
                  disabled={!qrImage}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={18} />
                  Preuzmi QR
                </button>

                <button
                  type="button"
                  onClick={printQrLabel}
                  disabled={!qrImage}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Printer size={18} />
                  Ispiši naljepnicu
                </button>
              </div>
            </InformationSection>

            <InformationSection title="Podaci artikla">
              <div className="space-y-4">
                <DetailCard
                  icon={<Tag size={19} />}
                  title="Alternativni nazivi"
                  value={
                    item.alternativeNames.length > 0
                      ? item.alternativeNames.join(', ')
                      : 'Nisu uneseni'
                  }
                />

                <DetailCard
                  icon={<Warehouse size={19} />}
                  title="Dobavljač"
                  value={
                    item.supplier || 'Nije uneseno'
                  }
                />

                <DetailCard
                  icon={<Package size={19} />}
                  title="Proizvođač"
                  value={
                    item.manufacturer ||
                    'Nije uneseno'
                  }
                />

                <DetailCard
                  icon={<QrCode size={19} />}
                  title="Barkod"
                  value={
                    item.barcode || 'Nije uneseno'
                  }
                />

                <DetailCard
                  icon={<CalendarDays size={19} />}
                  title="Dodano u sustav"
                  value={formatDateTime(
                    item.createdAt,
                  )}
                />
              </div>
            </InformationSection>

            <InformationSection title="Cijene">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Nabavna cijena
                  </p>

                  <p className="mt-2 text-xl font-bold text-white">
{canViewCosts
                      ? formatCurrency(
                          item.purchasePrice,
                        )
                      : 'Skriveno'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Prodajna cijena
                  </p>

                  <p className="mt-2 text-xl font-bold text-white">
{canViewCosts
                      ? formatCurrency(item.salePrice)
                      : 'Skriveno'}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                PDV: {formatNumber(item.vatRate)}%
              </p>
            </InformationSection>

            <button
              type="button"
              onClick={() =>
                setShowDeleteModal(true)
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <Trash2 size={18} />
              Obriši artikl
            </button>
          </div>
        </div>
      </div>

      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {movementForm.action === 'entry'
                    ? 'Dodaj na stanje'
                    : 'Uzmi iz skladišta'}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {item.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMovementModal(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleMovementSubmit}
              className="space-y-5 p-5"
            >
              {errorMessage && (
                <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  <AlertTriangle
                    size={19}
                    className="shrink-0"
                  />

                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateMovementField(
                      'action',
                      'exit',
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    movementForm.action === 'exit'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  <ArrowDown
                    size={21}
                    className={
                      movementForm.action === 'exit'
                        ? 'text-red-400'
                        : 'text-slate-500'
                    }
                  />

                  <p className="mt-2 font-semibold text-white">
                    Izlaz
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Materijal je uzet
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateMovementField(
                      'action',
                      'entry',
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    movementForm.action === 'entry'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  <ArrowUp
                    size={21}
                    className={
                      movementForm.action === 'entry'
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }
                  />

                  <p className="mt-2 font-semibold text-white">
                    Ulaz
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Materijal je dodan
                  </p>
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Količina
                </span>

                <div className="relative">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    inputMode="decimal"
                    value={movementForm.quantity}
                    onChange={(event) =>
                      updateMovementField(
                        'quantity',
                        event.target.value,
                      )
                    }
                    className="h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pr-20 text-xl font-bold text-white outline-none transition focus:border-sky-500"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    {item.unit}
                  </span>
                </div>

                {item.trackingType ===
                  'piece-length' && (
                  <p className="mt-2 text-sm text-sky-400">
                    Ukupna metraža promjene:{' '}
                    {formatNumber(
                      parseNumber(
                        movementForm.quantity,
                      ) *
                        item.pieceLengthMetres,
                    )}{' '}
                    m
                  </p>
                )}
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((quantity) => (
                  <button
                    key={quantity}
                    type="button"
                    onClick={() =>
                      updateMovementField(
                        'quantity',
                        String(quantity),
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                  >
                    {quantity}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Lokacija
                </span>

                <select
                  value={movementForm.locationId}
                  onChange={(event) =>
                    updateMovementField(
                      'locationId',
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="">
                    Bez određene lokacije
                  </option>

                  {locations.map((location) => {
                    const stock =
                      item.locationStocks.find(
                        (locationStock) =>
                          locationStock.locationId ===
                          location.id,
                      )

                    return (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                        {stock
                          ? ` — ${formatNumber(
                              stock.quantity,
                            )} ${item.unit}`
                          : ''}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Radnik
                </span>

                <input
                  type="text"
                  value={
                    movementForm.employeeName
                  }
                  onChange={(event) =>
                    updateMovementField(
                      'employeeName',
                      event.target.value,
                    )
                  }
                  placeholder="Ime radnika koji uzima ili dodaje materijal"
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
                />
              </label>

              {movementForm.action === 'exit' ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Broj radnog naloga
                  </span>

                  <input
                    type="text"
                    value={
                      movementForm.workOrderNumber
                    }
                    onChange={(event) =>
                      updateMovementField(
                        'workOrderNumber',
                        event.target.value,
                      )
                    }
                    placeholder="Primjer: RN-2026-015"
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Broj ulaznog računa
                  </span>

                  <input
                    type="text"
                    value={
                      movementForm.incomingInvoiceNumber
                    }
                    onChange={(event) =>
                      updateMovementField(
                        'incomingInvoiceNumber',
                        event.target.value,
                      )
                    }
                    placeholder="Primjer: UR-2026-025"
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Napomena
                </span>

                <textarea
                  value={movementForm.note}
                  onChange={(event) =>
                    updateMovementField(
                      'note',
                      event.target.value,
                    )
                  }
                  placeholder="Neobavezna napomena..."
                  className="min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
                />
              </label>

              <button
                type="submit"
                disabled={isSavingMovement}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  movementForm.action === 'entry'
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : 'bg-red-500 hover:bg-red-400'
                }`}
              >
                {isSavingMovement ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Spremanje...
                  </>
                ) : movementForm.action === 'entry' ? (
                  <>
                    <ArrowUp size={18} />
                    Dodaj na stanje
                  </>
                ) : (
                  <>
                    <ArrowDown size={18} />
                    Skini sa stanja
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <Trash2 size={26} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-white">
              Obriši artikl?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Brisanjem artikla obrisat će se i cijela
              njegova povijest promjena. Ovu radnju nije
              moguće poništiti.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Odustani
              </button>

              <button
                type="button"
                onClick={handleDeleteItem}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                <Trash2 size={18} />
                Obriši artikl
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryItemDetailsPage
