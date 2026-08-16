import {
  Archive,
  CheckCircle2,
  FileScan,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  ScanLine,
  Trash2,
  X,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'

import {
  DocumentScannerModal,
} from '../DocumentScannerModal'
import {
  analyzeDeliveryNoteScans,
} from '../../services/deliveryNoteAi.service'
import {
  addManualLine,
  createBlankDeliveryNote,
  deliveryNoteFromScan,
  getDeliveryNotes,
  postDeliveryNote,
  saveDeliveryNote,
  type DeliveryNote as IncomingDeliveryNote,
  type DeliveryNoteLine,
} from '../../utils/deliveryNoteStorage'
import {
  downloadInventoryQrLabels,
} from '../../utils/deliveryNoteQr'
import {
  getInventoryItems,
  type InventoryItem,
  type InventoryUnit,
} from '../../utils/inventoryStorage'

const units:
InventoryUnit[] = [
  'kom',
  'm',
  'kg',
  'l',
  'paket',
  'rola',
  'set',
]

export function IncomingDeliveryIntakePanel() {
  const [
    notes,
    setNotes,
  ] =
    useState(
      () =>
        getDeliveryNotes(),
    )

  const [
    inventory,
    setInventory,
  ] =
    useState(
      () =>
        getInventoryItems(),
    )

  const [
    editor,
    setEditor,
  ] =
    useState<
      IncomingDeliveryNote | null
    >(null)

  const [
    scannerOpen,
    setScannerOpen,
  ] =
    useState(false)

  const [
    scans,
    setScans,
  ] =
    useState<File[]>([])

  const [
    analyzing,
    setAnalyzing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    success,
    setSuccess,
  ] =
    useState('')

  const [
    createdForQr,
    setCreatedForQr,
  ] =
    useState<
      InventoryItem[]
    >([])

  const stats =
    useMemo(
      () => ({
        total:
          notes.length,
        waiting:
          notes.filter(
            (note) =>
              note.status !==
              'posted',
          ).length,
        posted:
          notes.filter(
            (note) =>
              note.status ===
              'posted',
          ).length,
      }),
      [notes],
    )

  function refresh() {
    setNotes(
      getDeliveryNotes(),
    )
    setInventory(
      getInventoryItems(),
    )
  }

  function startScan() {
    setScans([])
    setEditor(null)
    setError('')
    setSuccess('')
    setCreatedForQr([])
    setScannerOpen(true)
  }

  async function confirmScan(
    file: File,
  ) {
    setScans(
      (current) => [
        ...current,
        file,
      ],
    )
    setScannerOpen(false)
  }

  async function analyze() {
    if (!scans.length) {
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      setSuccess('')

      const scan =
        await analyzeDeliveryNoteScans(
          scans,
        )

      const draft =
        deliveryNoteFromScan(
          scan,
          scans.length,
        )

      setEditor(draft)
      setSuccess(
        `AI je pronašao ${scan.lines.length} stavki. Provjeri povezivanje prije knjiženja.`,
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Sken nije moguće analizirati.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function patchLine(
    lineId: string,
    patch:
      Partial<
        DeliveryNoteLine
      >,
  ) {
    setEditor(
      (current) =>
        current
          ? {
              ...current,
              lines:
                current.lines.map(
                  (line) =>
                    line.id ===
                    lineId
                      ? {
                          ...line,
                          ...patch,
                        }
                      : line,
                ),
            }
          : current,
    )
  }

  function saveDraft() {
    if (!editor) {
      return
    }

    const saved =
      saveDeliveryNote({
        ...editor,
        status:
          editor.lines.length
            ? 'reviewed'
            : 'draft',
      })

    setEditor(saved)
    refresh()
    setSuccess(
      'Ulazna otpremnica je spremljena za kasniju obradu.',
    )
  }

  function post() {
    if (!editor) {
      return
    }

    if (
      !window.confirm(
        'Proknjižiti sve potvrđene stavke u skladište?',
      )
    ) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const result =
        postDeliveryNote(
          editor,
        )

      setEditor(
        result.note,
      )
      setCreatedForQr(
        result.createdItems,
      )
      refresh()

      setSuccess(
        `${result.updatedItems.length} postojećih artikala je povećano, ${result.createdItems.length} novih artikala je kreirano.`,
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Knjiženje nije uspjelo.',
      )
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-slate-900 to-violet-950/25 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
              DOBAVLJAČ → SKLADIŠTE
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Ulaz robe skeniranjem otpremnice
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Skeniraj jednu ili više stranica. FERSYS čita stavke, povezuje ih sa skladištem i tek nakon tvoje potvrde povećava stanje.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditor(
                  createBlankDeliveryNote(),
                )
                setScans([])
                setCreatedForQr([])
              }}
              className={secondaryButton}
            >
              <Plus
                size={17}
              />
              Ručno
            </button>

            <button
              type="button"
              onClick={
                startScan
              }
              className={primaryButton}
            >
              <ScanLine
                size={17}
              />
              Skeniraj otpremnicu
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric
            label="Ukupno"
            value={
              stats.total
            }
          />
          <Metric
            label="Za obradu"
            value={
              stats.waiting
            }
          />
          <Metric
            label="Proknjiženo"
            value={
              stats.posted
            }
          />
        </div>
      </section>

      {error && (
        <Message
          tone="error"
          text={error}
        />
      )}

      {success && (
        <Message
          tone="success"
          text={success}
        />
      )}

      {scans.length >
        0 &&
        !editor && (
          <section className="rounded-3xl border border-violet-500/20 bg-violet-500/[0.06] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="text-white">
                  {scans.length} / 12 stranica
                </strong>
                <p className="mt-1 text-xs text-slate-500">
                  Dodaj sve stranice iste otpremnice prije AI analize.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    scans.length >=
                    12
                  }
                  onClick={() =>
                    setScannerOpen(
                      true,
                    )
                  }
                  className={secondaryButton}
                >
                  + Stranica
                </button>

                <button
                  type="button"
                  disabled={
                    analyzing
                  }
                  onClick={() =>
                    void analyze()
                  }
                  className={primaryButton}
                >
                  {analyzing ? (
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <FileScan
                      size={17}
                    />
                  )}
                  {analyzing
                    ? 'AI čita...'
                    : 'Analiziraj'}
                </button>
              </div>
            </div>
          </section>
        )}

      {editor ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-white">
                {editor.number ||
                  'Ulazna otpremnica'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {editor.supplierName ||
                  'Dobavljač nije prepoznat'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditor(null)
                setScans([])
                setCreatedForQr([])
              }}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
            >
              <X
                size={17}
              />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field
              label="Broj"
              value={
                editor.number
              }
              disabled={
                editor.status ===
                'posted'
              }
              onChange={(
                value,
              ) =>
                setEditor({
                  ...editor,
                  number:
                    value,
                })
              }
            />
            <Field
              label="Dobavljač"
              value={
                editor.supplierName
              }
              disabled={
                editor.status ===
                'posted'
              }
              onChange={(
                value,
              ) =>
                setEditor({
                  ...editor,
                  supplierName:
                    value,
                })
              }
            />
            <Field
              label="OIB"
              value={
                editor.supplierOib
              }
              disabled={
                editor.status ===
                'posted'
              }
              onChange={(
                value,
              ) =>
                setEditor({
                  ...editor,
                  supplierOib:
                    value,
                })
              }
            />
            <Field
              label="Datum"
              value={
                editor.deliveryDate
              }
              type="date"
              disabled={
                editor.status ===
                'posted'
              }
              onChange={(
                value,
              ) =>
                setEditor({
                  ...editor,
                  deliveryDate:
                    value,
                })
              }
            />
          </div>

          <div className="mt-5 space-y-3">
            {editor.lines.map(
              (
                line,
                index,
              ) => {
                const matched =
                  inventory.find(
                    (item) =>
                      item.id ===
                      line
                        .matchedInventoryItemId,
                  )

                return (
                  <article
                    key={
                      line.id
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
                  >
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-xs font-black text-violet-300">
                        {index +
                          1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="grid gap-3 lg:grid-cols-[1.5fr_100px_100px]">
                          <input
                            value={
                              line.name
                            }
                            disabled={
                              editor.status ===
                              'posted'
                            }
                            onChange={(
                              event,
                            ) =>
                              patchLine(
                                line.id,
                                {
                                  name:
                                    event.target
                                      .value,
                                },
                              )
                            }
                            className={inputClass}
                          />
                          <input
                            type="number"
                            step="0.001"
                            value={
                              line.quantity
                            }
                            disabled={
                              editor.status ===
                              'posted'
                            }
                            onChange={(
                              event,
                            ) =>
                              patchLine(
                                line.id,
                                {
                                  quantity:
                                    Number(
                                      event.target
                                        .value,
                                    ),
                                },
                              )
                            }
                            className={inputClass}
                          />
                          <select
                            value={
                              line.unit
                            }
                            disabled={
                              editor.status ===
                              'posted'
                            }
                            onChange={(
                              event,
                            ) =>
                              patchLine(
                                line.id,
                                {
                                  unit:
                                    event.target
                                      .value as
                                    InventoryUnit,
                                },
                              )
                            }
                            className={inputClass}
                          >
                            {units.map(
                              (unit) => (
                                <option
                                  key={
                                    unit
                                  }
                                  value={
                                    unit
                                  }
                                >
                                  {unit}
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[150px_1fr_auto]">
                          <select
                            value={
                              line.action
                            }
                            disabled={
                              editor.status ===
                              'posted'
                            }
                            onChange={(
                              event,
                            ) =>
                              patchLine(
                                line.id,
                                {
                                  action:
                                    event.target
                                      .value as
                                    'existing' |
                                    'new',
                                  matchedInventoryItemId:
                                    event.target
                                      .value ===
                                    'new'
                                      ? ''
                                      : line.matchedInventoryItemId,
                                },
                              )
                            }
                            className={inputClass}
                          >
                            <option value="existing">
                              Postojeći
                            </option>
                            <option value="new">
                              Novi artikl
                            </option>
                          </select>

                          {line.action ===
                          'existing' ? (
                            <select
                              value={
                                line.matchedInventoryItemId
                              }
                              disabled={
                                editor.status ===
                                'posted'
                              }
                              onChange={(
                                event,
                              ) =>
                                patchLine(
                                  line.id,
                                  {
                                    matchedInventoryItemId:
                                      event.target
                                        .value,
                                  },
                                )
                              }
                              className={inputClass}
                            >
                              <option value="">
                                Odaberi artikl...
                              </option>
                              {inventory.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {item.name} · {item.quantity} {item.unit}
                                  </option>
                                ),
                              )}
                            </select>
                          ) : (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs font-bold text-emerald-300">
                              Novi artikl + novi QR
                            </div>
                          )}

                          {editor.status !==
                            'posted' && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditor({
                                  ...editor,
                                  lines:
                                    editor.lines.filter(
                                      (value) =>
                                        value.id !==
                                        line.id,
                                    ),
                                })
                              }
                              className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          )}
                        </div>

                        {matched && (
                          <div className="mt-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.06] p-3 text-xs text-slate-300">
                            Stanje: {matched.quantity} → {matched.quantity + Number(line.quantity || 0)} {matched.unit}
                            {line.matchConfidence >
                              0 && (
                              <span className="ml-2 text-slate-500">
                                · podudaranje {Math.round(
                                  line.matchConfidence *
                                    100,
                                )}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              },
            )}
          </div>

          {createdForQr.length >
            0 && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-emerald-200">
                    {createdForQr.length} novih artikala ima QR kod
                  </strong>
                  <p className="mt-1 text-xs text-emerald-100/70">
                    Naljepnice se rade samo za nove artikle.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void downloadInventoryQrLabels(
                      createdForQr,
                      editor.number ||
                        'Otpremnica',
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"
                >
                  <Printer
                    size={17}
                  />
                  QR naljepnice
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-5">
            {editor.status !==
              'posted' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setEditor(
                      addManualLine(
                        editor,
                      ),
                    )
                  }
                  className={secondaryButton}
                >
                  <Plus
                    size={17}
                  />
                  Stavka
                </button>

                <button
                  type="button"
                  onClick={
                    saveDraft
                  }
                  className={secondaryButton}
                >
                  Spremi
                </button>

                <button
                  type="button"
                  onClick={
                    post
                  }
                  className={primaryButton}
                >
                  <PackageCheck
                    size={17}
                  />
                  Proknjiži u skladište
                </button>
              </>
            )}

            {editor.status ===
              'posted' && (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500/10 px-4 text-sm font-black text-emerald-300">
                <CheckCircle2
                  size={17}
                />
                Proknjiženo
              </span>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-black text-white">
            Evidencija ulaznih otpremnica
          </h3>

          {notes.length ===
          0 ? (
            <div className="py-14 text-center">
              <Archive
                size={34}
                className="mx-auto text-slate-600"
              />
              <p className="mt-4 text-sm font-bold text-slate-500">
                Još nema skeniranih ulaznih otpremnica.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {notes.map(
                (item) => (
                  <button
                    type="button"
                    key={
                      item.id
                    }
                    onClick={() => {
                      setEditor(
                        item,
                      )
                      setCreatedForQr(
                        [],
                      )
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-left"
                  >
                    <span>
                      <strong className="text-sm text-white">
                        {item.number ||
                          'Bez broja'}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.supplierName || 'Dobavljač'} · {item.lines.length} stavki
                      </span>
                    </span>

                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      item.status ===
                      'posted'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-violet-500/10 text-violet-300'
                    }`}>
                      {item.status}
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </section>
      )}

      <DocumentScannerModal
        open={
          scannerOpen
        }
        onClose={() =>
          setScannerOpen(
            false,
          )
        }
        onConfirm={
          confirmScan
        }
        documentLabel="otpremnice"
        title="Označi 4 kuta otpremnice"
        helperText="Postavi svaki kut točno na rub papira. FERSYS će izravnati dokument prije AI čitanja."
        emptyTitle="Fotografiraj otpremnicu"
        emptyText="Fotografiraj cijelu stranicu pa precizno označi sva četiri kuta."
        confirmLabel="Spremi ovu stranicu"
      />
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500 disabled:opacity-60'

const primaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-50'

const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-white disabled:opacity-50'

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
  type?: string
  disabled?: boolean
}) {
  return (
    <label className="text-xs font-black uppercase text-slate-500">
      {label}
      <input
        type={type}
        value={value}
        disabled={
          disabled
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        className={`${inputClass} mt-2 normal-case`}
      />
    </label>
  )
}

function Message({
  tone,
  text,
}: {
  tone:
    | 'success'
    | 'error'
  text: string
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm font-bold ${
        tone ===
        'success'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/20 bg-red-500/10 text-red-300'
      }`}
    >
      {text}
    </div>
  )
}

export default IncomingDeliveryIntakePanel
