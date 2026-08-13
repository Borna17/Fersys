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

  return Number.isFinite(parsed) ? parsed : 0
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
  if (movement.type === 'entry') return 'Ulaz robe'
  if (movement.type === 'exit') return 'Izlaz robe'
  if (movement.type === 'transfer') return 'Premještaj'
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

  const { can } = useAuth()

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

  const [
    isSavingMovement,
    setIsSavingMovement,
  ] = useState(false)

  const [isDeleting, setIsDeleting] =
    useState(false)

  const [
    showMovementModal,
    setShowMovementModal,
  ] = useState(false)

  const [
    movementForm,
    setMovementForm,
  ] = useState<MovementForm>(
    INITIAL_MOVEMENT_FORM,
  )

  const [qrImage, setQrImage] =
    useState('')

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  async function loadItemData() {
    if (!id) return

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

    void QRCode.toDataURL(item.qrValue, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: 'H',
    })
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

    const next =
      new URLSearchParams(searchParams)

    next.delete('action')

    setSearchParams(next, {
      replace: true,
    })
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

  const stockStatus =
    useMemo(() => {
      if (!item) return null

      if (item.quantity <= 0) {
        return {
          label: 'Nema na stanju',
          className:
            'border-red-500/30 bg-red-500/10 text-red-300',
        }
      }

      if (
        item.minimumQuantity > 0 &&
        item.quantity <=
          item.minimumQuantity
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
    }, [item])

  function openMovementModal(
    action: MovementAction,
  ) {
    if (!item) return

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

    if (!item) return

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
    if (!item || isDeleting) return

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
    if (!qrImage || !item) return

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
    if (!qrImage || !item) return

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=520,height=720',
      )

    if (!printWindow) return

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

        <h1 className="mt-4 text-2xl font-black text-white">
          Artikl nije pronađen
        </h1>

        <button
          type="button"
          onClick={() =>
            navigate('/inventory')
          }
          className="mt-5 min-h-12 rounded-2xl bg-sky-500 px-5 font-black text-white"
        >
          Povratak u skladište
        </button>
      </div>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1450px] space-y-4 pb-28 sm:space-y-6 sm:pb-10">
        <button
          type="button"
          onClick={() =>
            navigate('/inventory')
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Skladište
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-sky-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-800 sm:h-24 sm:w-24">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-slate-600">
                  <Package size={28} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">
                ARTIKL
              </p>

              <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                {item.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-300">
                  {item.code || 'Bez šifre'}
                </span>

                {stockStatus && (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${stockStatus.className}`}
                  >
                    {stockStatus.label}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                {item.category || 'Bez kategorije'}
                {item.dimension
                  ? ` · ${item.dimension}`
                  : ''}
              </p>
            </div>

            {canManageInventory && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/inventory/items/${item.id}/edit`,
                  )
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white sm:hidden"
                aria-label="Uredi artikl"
              >
                <Edit3 size={18} />
              </button>
            )}
          </div>

          <div
            className={`relative mt-5 grid gap-2 ${
              canViewCosts
                ? 'grid-cols-4'
                : 'grid-cols-3'
            }`}
          >
            <HeroMetric
              label="Stanje"
              value={`${formatNumber(
                item.quantity,
              )} ${item.unit}`}
            />

            <HeroMetric
              label="Minimum"
              value={`${formatNumber(
                item.minimumQuantity,
              )} ${item.unit}`}
            />

            <HeroMetric
              label="Lokacije"
              value={String(
                item.locationStocks.filter(
                  (stock) =>
                    stock.quantity > 0,
                ).length,
              )}
            />

            {canViewCosts && (
              <HeroMetric
                label="Vrijednost"
                value={formatCurrency(
                  totalValue,
                )}
              />
            )}
          </div>
        </section>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="min-w-0 flex-1 text-sm leading-6">
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
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-black text-emerald-200">
            {successMessage}
          </div>
        )}

        {canManageInventory && (
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <QuickAction
              label="Uzmi iz skladišta"
              icon={<ArrowUp size={20} />}
              tone="red"
              onClick={() =>
                openMovementModal(
                  'exit',
                )
              }
            />

            <QuickAction
              label="Dodaj na stanje"
              icon={<ArrowDown size={20} />}
              tone="green"
              onClick={() =>
                openMovementModal(
                  'entry',
                )
              }
            />

            <QuickAction
              label="Uredi artikl"
              icon={<Edit3 size={20} />}
              onClick={() =>
                navigate(
                  `/inventory/items/${item.id}/edit`,
                )
              }
              className="col-span-2 sm:col-span-1"
            />
          </section>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            <Card
              title="Stanje po lokacijama"
              icon={<MapPin size={19} />}
            >
              {item.locationStocks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                  Artikl nema dodijeljenu lokaciju.
                </p>
              ) : (
                <div className="space-y-2">
                  {item.locationStocks.map(
                    (stock) => (
                      <div
                        key={stock.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-800/65 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {stock.locationName}
                          </p>
                        </div>

                        <span className="shrink-0 text-base font-black text-white">
                          {formatNumber(
                            stock.quantity,
                          )}{' '}
                          {item.unit}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </Card>

            <Card
              title="Povijest kretanja"
              icon={<History size={19} />}
            >
              {movements.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                  Još nema prometa za ovaj artikl.
                </p>
              ) : (
                <div className="space-y-3">
                  {movements.map(
                    (movement) => (
                      <article
                        key={movement.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${movementClassName(
                                movement,
                              )}`}
                            >
                              {movementLabel(
                                movement,
                              )}
                            </span>

                            <p className="mt-3 text-lg font-black text-white">
                              {movement.type === 'exit'
                                ? '−'
                                : movement.type === 'entry'
                                  ? '+'
                                  : ''}
                              {formatNumber(
                                movement.quantity,
                              )}{' '}
                              {item.unit}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
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

                          <div className="shrink-0 text-right text-[10px] leading-4 text-slate-600">
                            <p>
                              {formatDateTime(
                                movement.createdAt,
                              )}
                            </p>

                            {movement.employeeName && (
                              <p className="mt-1 font-black text-slate-400">
                                {movement.employeeName}
                              </p>
                            )}
                          </div>
                        </div>

                        {(movement.locationName ||
                          movement.workOrderNumber ||
                          movement.incomingInvoiceNumber ||
                          movement.note) && (
                          <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">
                            {movement.locationName && (
                              <p>
                                Lokacija:{' '}
                                <span className="font-bold text-slate-300">
                                  {movement.locationName}
                                </span>
                              </p>
                            )}

                            {movement.workOrderNumber && (
                              <p>
                                Radni nalog:{' '}
                                <span className="font-bold text-slate-300">
                                  {movement.workOrderNumber}
                                </span>
                              </p>
                            )}

                            {movement.incomingInvoiceNumber && (
                              <p>
                                Ulazni račun:{' '}
                                <span className="font-bold text-slate-300">
                                  {movement.incomingInvoiceNumber}
                                </span>
                              </p>
                            )}

                            {movement.note && (
                              <p>
                                Napomena:{' '}
                                <span className="text-slate-300">
                                  {movement.note}
                                </span>
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    ),
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card
              title="QR kod artikla"
              icon={<QrCode size={19} />}
            >
              {qrImage ? (
                <>
                  <div className="flex justify-center rounded-2xl bg-white p-4">
                    <img
                      src={qrImage}
                      alt="QR kod artikla"
                      className="w-full max-w-[240px]"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={downloadQrCode}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 text-xs font-black text-white"
                    >
                      <Download size={16} />
                      Preuzmi
                    </button>

                    <button
                      type="button"
                      onClick={printQrLabel}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 text-xs font-black text-white"
                    >
                      <Printer size={16} />
                      Ispiši
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  QR kod nije dostupan.
                </p>
              )}
            </Card>

            <Card title="Podaci artikla">
              <dl className="space-y-3 text-sm">
                <DataRow
                  label="Kategorija"
                  value={
                    item.category || '—'
                  }
                />

                <DataRow
                  label="Proizvođač"
                  value={
                    item.manufacturer || '—'
                  }
                />

                <DataRow
                  label="Dobavljač"
                  value={
                    item.supplier || '—'
                  }
                />

                <DataRow
                  label="Promjer"
                  value={
                    item.diameter || '—'
                  }
                />

                <DataRow
                  label="Dimenzija"
                  value={
                    item.dimension || '—'
                  }
                />

                {canViewCosts && (
                  <DataRow
                    label="Nabavna cijena"
                    value={formatCurrency(
                      item.purchasePrice,
                    )}
                  />
                )}
              </dl>
            </Card>

            {canManageInventory && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  void handleDelete()
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 font-black text-red-300 disabled:opacity-50"
              >
                <Trash2 size={18} />
                Obriši artikl
              </button>
            )}
          </div>
        </div>
      </section>

      {showMovementModal && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <form
            onSubmit={
              handleMovementSubmit
            }
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 p-5 pb-6 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:border sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                    movementForm.action === 'exit'
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
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
                <span className="mb-2 block text-sm font-black text-slate-300">
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
                  className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-2xl font-black text-white outline-none focus:border-sky-500"
                />
              </label>

              {locations.length > 0 && (
                <label>
                  <span className="mb-2 block text-sm font-black text-slate-300">
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
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-white"
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
                            key={location.id}
                            value={location.id}
                          >
                            {location.name}
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
                <span className="mb-2 block text-sm font-black text-slate-300">
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
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-white"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-slate-300">
                  Ulazni račun
                  <span className="ml-1 font-normal text-slate-500">
                    (opcionalno)
                  </span>
                </span>

                <input
                  value={
                    movementForm.incomingInvoiceNumber
                  }
                  onChange={(event) =>
                    setMovementForm(
                      (current) => ({
                        ...current,
                        incomingInvoiceNumber:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Broj ulaznog računa"
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-white"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-slate-300">
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
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white"
                />
              </label>

              <div className="rounded-2xl bg-slate-800/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Evidencija korisnika
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-300">
                  FERSYS automatski bilježi prijavljenog korisnika.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSavingMovement}
                onClick={() =>
                  setShowMovementModal(
                    false,
                  )
                }
                className="h-12 rounded-2xl bg-slate-800 px-5 font-black text-white"
              >
                Odustani
              </button>

              <button
                type="submit"
                disabled={isSavingMovement}
                className={`h-12 rounded-2xl px-5 font-black text-white disabled:opacity-50 ${
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
                    ? 'Uzmi'
                    : 'Dodaj'}
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

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-sky-400">
            {icon}
          </span>
        )}

        <h2 className="text-lg font-black text-white">
          {title}
        </h2>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  )
}

function QuickAction({
  label,
  icon,
  onClick,
  tone = 'default',
  className = '',
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  tone?: 'default' | 'red' | 'green'
  className?: string
}) {
  const styles =
    tone === 'red'
      ? 'border-red-500/20 bg-red-500/10 text-red-200'
      : tone === 'green'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
        : 'border-slate-800 bg-slate-900 text-slate-200'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-2xl border text-xs font-black active:scale-[0.98] ${styles} ${className}`}
    >
      {icon}
      {label}
    </button>
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
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-2.5 py-3">
      <p className="truncate text-[8px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-black text-white sm:text-sm">
        {value}
      </p>
    </div>
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

      <dd className="max-w-[65%] break-words text-right font-black text-slate-200">
        {value}
      </dd>
    </div>
  )
}

export default InventoryItemDetailsPage
