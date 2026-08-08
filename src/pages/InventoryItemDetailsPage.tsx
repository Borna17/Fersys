import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  Edit3,
  History,
  MapPin,
  Package,
  Printer,
  QrCode,
  Trash2,
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
  useSearchParams,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import {
  adjustInventoryQuantity,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryLocations,
  getInventoryMovementsByItemId,
  type InventoryItem,
  type InventoryLocation,
  type InventoryMovement,
} from '../services/inventory.service'

type MovementAction = 'entry' | 'exit'

type MovementForm = {
  action: MovementAction
  quantity: string
  locationId: string
  workOrderNumber: string
  incomingInvoiceNumber: string
  note: string
}

const INITIAL_MOVEMENT_FORM: MovementForm = {
  action: 'exit',
  quantity: '1',
  locationId: '',
  workOrderNumber: '',
  incomingInvoiceNumber: '',
  note: '',
}

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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
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

function movementLabel(
  movement: InventoryMovement,
) {
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

function movementClassName(
  movement: InventoryMovement,
) {
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

export function InventoryItemDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams, setSearchParams] =
    useSearchParams()

  const {
    can,
  } = useAuth()

  const canManageInventory =
    can('inventory.manage')

  const canViewCosts =
    can('inventory.viewCosts')

  const [item, setItem] =
    useState<InventoryItem | null>(null)

  const [locations, setLocations] =
    useState<InventoryLocation[]>([])

  const [movements, setMovements] =
    useState<InventoryMovement[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSavingMovement, setIsSavingMovement] =
    useState(false)

  const [isDeleting, setIsDeleting] =
    useState(false)

  const [showMovementModal, setShowMovementModal] =
    useState(false)

  const [movementForm, setMovementForm] =
    useState<MovementForm>(
      INITIAL_MOVEMENT_FORM,
    )

  const [qrImage, setQrImage] =
    useState('')

  const [errorMessage, setErrorMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  async function loadItemData() {
    if (!id) {
      return
    }

    try {
      setErrorMessage('')

      const [
        savedItem,
        savedLocations,
        savedMovements,
      ] = await Promise.all([
        getInventoryItemById(id),
        getInventoryLocations(),
        getInventoryMovementsByItemId(id),
      ])

      setItem(savedItem)
      setLocations(savedLocations)
      setMovements(savedMovements)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Artikl nije moguće učitati.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadItemData()
  }, [id])

  useEffect(() => {
    if (!item?.qrValue) {
      setQrImage('')
      return
    }

    void QRCode.toDataURL(
      item.qrValue,
      {
        width: 500,
        margin: 2,
        errorCorrectionLevel: 'H',
      },
    )
      .then(setQrImage)
      .catch(() => setQrImage(''))
  }, [item?.qrValue])

  useEffect(() => {
    if (
      !item ||
      !canManageInventory ||
      searchParams.get('action') !== 'exit'
    ) {
      return
    }

    openMovementModal('exit')

    const next = new URLSearchParams(
      searchParams,
    )

    next.delete('action')

    setSearchParams(
      next,
      {
        replace: true,
      },
    )
  }, [
    item?.id,
    canManageInventory,
    searchParams,
  ])

  const totalValue =
    useMemo(
      () =>
        item
          ? item.quantity *
            item.purchasePrice
          : 0,
      [item],
    )

  function openMovementModal(
    action: MovementAction,
  ) {
    if (!item) {
      return
    }

    if (!canManageInventory) {
      setErrorMessage(
        'Nemaš dopuštenje za promjenu stanja skladišta.',
      )
      return
    }

    const firstLocation =
      action === 'exit'
        ? item.locationStocks.find(
            (stock) =>
              stock.quantity > 0,
          )?.locationId
        : locations[0]?.id

    setMovementForm({
      ...INITIAL_MOVEMENT_FORM,
      action,
      locationId:
        firstLocation ?? '',
    })

    setErrorMessage('')
    setSuccessMessage('')
    setShowMovementModal(true)
  }

  async function handleMovementSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!item) {
      return
    }

    const quantity =
      parseNumber(
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

      await adjustInventoryQuantity({
        itemId: item.id,
        type:
          movementForm.action,
        quantity,
        locationId:
          selectedLocation?.id,
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

      await loadItemData()

      setShowMovementModal(false)

      setSuccessMessage(
        movementForm.action === 'exit'
          ? `${formatNumber(quantity)} ${item.unit} skinuto je sa stanja.`
          : `${formatNumber(quantity)} ${item.unit} dodano je na stanje.`,
      )

      window.setTimeout(
        () =>
          setSuccessMessage(''),
        3500,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Promjenu stanja nije moguće spremiti.',
      )
    } finally {
      setIsSavingMovement(false)
    }
  }

  async function handleDelete() {
    if (!item || isDeleting) {
      return
    }

    if (
      !window.confirm(
        `Želiš li obrisati artikl "${item.name}"?`,
      )
    ) {
      return
    }

    try {
      setIsDeleting(true)

      await deleteInventoryItem(
        item.id,
      )

      navigate('/inventory')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Artikl nije moguće obrisati.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  function downloadQrCode() {
    if (!qrImage || !item) {
      return
    }

    const link =
      document.createElement('a')

    link.href = qrImage
    link.download =
      `qr-${item.code || item.id}.png`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function printQrLabel() {
    if (!qrImage || !item) {
      return
    }

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=520,height=720',
      )

    if (!printWindow) {
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${item.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              text-align: center;
            }
            img {
              width: 280px;
              height: 280px;
            }
            h1 {
              font-size: 22px;
              margin-bottom: 6px;
            }
            p {
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <h1>${item.name}</h1>
          <p>${item.code}</p>
          <img src="${qrImage}" />
          <p>${formatNumber(item.quantity)} ${item.unit}</p>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje artikla..." />
    )
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
        <Package
          size={42}
          className="mx-auto text-slate-600"
        />

        <h1 className="mt-4 text-2xl font-bold text-white">
          Artikl nije pronađen
        </h1>

        <button
          type="button"
          onClick={() =>
            navigate('/inventory')
          }
          className="mt-5 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white"
        >
          Povratak u skladište
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() =>
                  navigate('/inventory')
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    {item.name}
                  </h1>

                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                    {item.code}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  {item.category ||
                    'Bez kategorije'}
                  {item.dimension
                    ? ` · ${item.dimension}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canManageInventory && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      openMovementModal(
                        'exit',
                      )
                    }
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-red-500 px-5 font-bold text-white"
                  >
                    <ArrowUp
                      size={18}
                    />
                    Uzmi iz skladišta
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openMovementModal(
                        'entry',
                      )
                    }
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 font-bold text-white"
                  >
                    <ArrowDown
                      size={18}
                    />
                    Dodaj na stanje
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/inventory/items/${item.id}/edit`,
                      )
                    }
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-800 px-5 font-bold text-white"
                  >
                    <Edit3
                      size={18}
                    />
                    Uredi
                  </button>
                </>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <p className="flex-1 text-sm leading-6">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage('')
                }
              >
                <X size={17} />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200">
              {successMessage}
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <p className="text-xs uppercase text-slate-500">
                      Trenutno stanje
                    </p>

                    <p className="mt-2 text-2xl font-black text-white">
                      {formatNumber(
                        item.quantity,
                      )}{' '}
                      {item.unit}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <p className="text-xs uppercase text-slate-500">
                      Minimalno
                    </p>

                    <p className="mt-2 text-2xl font-black text-white">
                      {formatNumber(
                        item.minimumQuantity,
                      )}{' '}
                      {item.unit}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-800/70 p-4">
                    <p className="text-xs uppercase text-slate-500">
                      Lokacije
                    </p>

                    <p className="mt-2 text-2xl font-black text-white">
                      {
                        item.locationStocks.filter(
                          (stock) =>
                            stock.quantity > 0,
                        ).length
                      }
                    </p>
                  </div>

                  {canViewCosts && (
                    <div className="rounded-xl bg-slate-800/70 p-4">
                      <p className="text-xs uppercase text-slate-500">
                        Vrijednost zalihe
                      </p>

                      <p className="mt-2 text-xl font-black text-white">
                        {new Intl.NumberFormat(
                          'hr-HR',
                          {
                            style: 'currency',
                            currency: 'EUR',
                          },
                        ).format(
                          totalValue,
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <MapPin className="text-sky-400" />
                  <h2 className="text-lg font-bold text-white">
                    Stanje po lokacijama
                  </h2>
                </div>

                <div className="mt-4 space-y-3">
                  {item.locationStocks.length ===
                  0 ? (
                    <p className="text-sm text-slate-500">
                      Artikl nema dodijeljenu lokaciju.
                    </p>
                  ) : (
                    item.locationStocks.map(
                      (stock) => (
                        <div
                          key={
                            stock.id
                          }
                          className="flex items-center justify-between rounded-xl bg-slate-800/70 p-4"
                        >
                          <span className="font-semibold text-slate-300">
                            {
                              stock.locationName
                            }
                          </span>

                          <span className="font-black text-white">
                            {formatNumber(
                              stock.quantity,
                            )}{' '}
                            {item.unit}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <History className="text-violet-400" />

                  <h2 className="text-lg font-bold text-white">
                    Povijest kretanja
                  </h2>
                </div>

                <div className="mt-4 space-y-3">
                  {movements.length ===
                  0 ? (
                    <p className="text-sm text-slate-500">
                      Još nema prometa za ovaj artikl.
                    </p>
                  ) : (
                    movements.map(
                      (movement) => (
                        <article
                          key={
                            movement.id
                          }
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${movementClassName(
                                  movement,
                                )}`}
                              >
                                {movementLabel(
                                  movement,
                                )}
                              </span>

                              <p className="mt-3 font-bold text-white">
                                {movement.type ===
                                'exit'
                                  ? '−'
                                  : movement.type ===
                                      'entry'
                                    ? '+'
                                    : ''}
                                {formatNumber(
                                  movement.quantity,
                                )}{' '}
                                {item.unit}
                              </p>

                              <p className="mt-1 text-sm text-slate-400">
                                Stanje:{' '}
                                {formatNumber(
                                  movement.previousQuantity,
                                )}{' '}
                                →{' '}
                                {formatNumber(
                                  movement.newQuantity,
                                )}{' '}
                                {item.unit}
                              </p>
                            </div>

                            <div className="text-right text-xs text-slate-500">
                              <p>
                                {formatDateTime(
                                  movement.createdAt,
                                )}
                              </p>

                              {movement.employeeName && (
                                <p className="mt-1 font-semibold text-slate-300">
                                  {
                                    movement.employeeName
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          {(movement.locationName ||
                            movement.workOrderNumber ||
                            movement.note) && (
                            <div className="mt-3 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">
                              {movement.locationName && (
                                <p>
                                  Lokacija:{' '}
                                  {
                                    movement.locationName
                                  }
                                </p>
                              )}

                              {movement.workOrderNumber && (
                                <p>
                                  Radni nalog:{' '}
                                  {
                                    movement.workOrderNumber
                                  }
                                </p>
                              )}

                              {movement.note && (
                                <p>
                                  Napomena:{' '}
                                  {
                                    movement.note
                                  }
                                </p>
                              )}
                            </div>
                          )}
                        </article>
                      ),
                    )
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <QrCode className="text-sky-400" />

                  <h2 className="text-lg font-bold text-white">
                    QR kod artikla
                  </h2>
                </div>

                {qrImage ? (
                  <>
                    <div className="mt-5 flex justify-center rounded-2xl bg-white p-5">
                      <img
                        src={qrImage}
                        alt="QR kod artikla"
                        className="w-full max-w-[280px]"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={
                          downloadQrCode
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 font-semibold text-white"
                      >
                        <Download
                          size={17}
                        />
                        Preuzmi
                      </button>

                      <button
                        type="button"
                        onClick={
                          printQrLabel
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 font-semibold text-white"
                      >
                        <Printer
                          size={17}
                        />
                        Ispiši
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    QR kod nije dostupan.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-white">
                  Podaci artikla
                </h2>

                <dl className="mt-4 space-y-3 text-sm">
                  <DataRow
                    label="Kategorija"
                    value={
                      item.category ||
                      '—'
                    }
                  />

                  <DataRow
                    label="Proizvođač"
                    value={
                      item.manufacturer ||
                      '—'
                    }
                  />

                  <DataRow
                    label="Dobavljač"
                    value={
                      item.supplier ||
                      '—'
                    }
                  />

                  <DataRow
                    label="Promjer"
                    value={
                      item.diameter ||
                      '—'
                    }
                  />

                  <DataRow
                    label="Dimenzija"
                    value={
                      item.dimension ||
                      '—'
                    }
                  />

                  {canViewCosts && (
                    <DataRow
                      label="Nabavna cijena"
                      value={new Intl.NumberFormat(
                        'hr-HR',
                        {
                          style: 'currency',
                          currency: 'EUR',
                        },
                      ).format(
                        item.purchasePrice,
                      )}
                    />
                  )}
                </dl>
              </section>

              {canManageInventory && (
                <button
                  type="button"
                  disabled={
                    isDeleting
                  }
                  onClick={() =>
                    void handleDelete()
                  }
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 font-bold text-red-300 disabled:opacity-50"
                >
                  <Trash2
                    size={18}
                  />
                  Obriši artikl
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMovementModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={
              handleMovementSubmit
            }
            className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-400">
                  {movementForm.action ===
                  'exit'
                    ? 'IZLAZ ROBE'
                    : 'ULAZ ROBE'}
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {movementForm.action ===
                  'exit'
                    ? 'Uzmi iz skladišta'
                    : 'Dodaj na stanje'}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {item.name} · trenutno{' '}
                  {formatNumber(
                    item.quantity,
                  )}{' '}
                  {item.unit}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMovementModal(
                    false,
                  )
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Količina
                </span>

                <input
                  autoFocus
                  value={
                    movementForm.quantity
                  }
                  onChange={(event) =>
                    setMovementForm(
                      (current) => ({
                        ...current,
                        quantity:
                          event.target
                            .value,
                      }),
                    )
                  }
                  inputMode="decimal"
                  className="h-14 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-2xl font-black text-white outline-none focus:border-sky-500"
                />
              </label>

              {locations.length >
                0 && (
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Lokacija
                  </span>

                  <select
                    value={
                      movementForm.locationId
                    }
                    onChange={(event) =>
                      setMovementForm(
                        (current) => ({
                          ...current,
                          locationId:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white"
                  >
                    <option value="">
                      Bez određene lokacije
                    </option>

                    {locations.map(
                      (location) => {
                        const stock =
                          item.locationStocks.find(
                            (
                              itemStock,
                            ) =>
                              itemStock.locationId ===
                              location.id,
                          )

                        return (
                          <option
                            key={
                              location.id
                            }
                            value={
                              location.id
                            }
                          >
                            {
                              location.name
                            }
                            {' · '}
                            {formatNumber(
                              stock?.quantity ??
                                0,
                            )}{' '}
                            {item.unit}
                          </option>
                        )
                      },
                    )}
                  </select>
                </label>
              )}

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Radni nalog
                  <span className="ml-1 font-normal text-slate-500">
                    (opcionalno)
                  </span>
                </span>

                <input
                  value={
                    movementForm.workOrderNumber
                  }
                  onChange={(event) =>
                    setMovementForm(
                      (current) => ({
                        ...current,
                        workOrderNumber:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="RN-2026-004"
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Napomena
                </span>

                <textarea
                  rows={3}
                  value={
                    movementForm.note
                  }
                  onChange={(event) =>
                    setMovementForm(
                      (current) => ({
                        ...current,
                        note:
                          event.target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white"
                />
              </label>

              <div className="rounded-xl bg-slate-800/70 p-4">
                <p className="text-xs uppercase text-slate-500">
                  Evidencija korisnika
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-300">
                  FERSYS automatski bilježi prijavljenog korisnika.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  isSavingMovement
                }
                onClick={() =>
                  setShowMovementModal(
                    false,
                  )
                }
                className="h-12 rounded-xl bg-slate-800 px-5 font-bold text-white"
              >
                Odustani
              </button>

              <button
                type="submit"
                disabled={
                  isSavingMovement
                }
                className={`h-12 rounded-xl px-6 font-black text-white disabled:opacity-50 ${
                  movementForm.action ===
                  'exit'
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                }`}
              >
                {isSavingMovement
                  ? 'Spremanje...'
                  : movementForm.action ===
                      'exit'
                    ? 'Uzmi iz skladišta'
                    : 'Dodaj na stanje'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isSavingMovement && (
        <FersysLoader
          fullScreen
          text="Spremanje promjene stanja..."
        />
      )}
    </>
  )
}

function DataRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">
        {label}
      </dt>

      <dd className="text-right font-semibold text-slate-200">
        {value}
      </dd>
    </div>
  )
}

export default InventoryItemDetailsPage