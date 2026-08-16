import {
  Archive,
  CheckCircle2,
  ChevronRight,
  FileScan,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Save,
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
} from '../components/DocumentScannerModal'
import {
  analyzeDeliveryNoteScans,
} from '../services/deliveryNoteAi.service'
import {
  addManualLine,
  createBlankDeliveryNote,
  deleteDeliveryNote,
  deliveryNoteFromScan,
  getDeliveryNotes,
  postDeliveryNote,
  saveDeliveryNote,
  type DeliveryNote,
  type DeliveryNoteLine,
} from '../utils/deliveryNoteStorage'
import {
  downloadInventoryQrLabels,
} from '../utils/deliveryNoteQr'
import {
  getInventoryItems,
  type InventoryItem,
  type InventoryUnit,
} from '../utils/inventoryStorage'

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

export function DeliveryNotesPage() {
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
      DeliveryNote | null
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
        drafts:
          notes.filter(
            (note) =>
              note.status !==
                'posted' &&
              note.status !==
                'cancelled',
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

  function newManual() {
    setError('')
    setSuccess('')
    setScans([])
    setCreatedForQr([])
    setEditor(
      createBlankDeliveryNote(),
    )
  }

  function startScan() {
    setError('')
    setSuccess('')
    setScans([])
    setCreatedForQr([])
    setEditor(null)
    setScannerOpen(true)
  }

  async function handleScan(
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
      setError(
        'Prvo skeniraj barem jednu stranicu.',
      )
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      setSuccess('')

      const result =
        await analyzeDeliveryNoteScans(
          scans,
        )

      const note =
        deliveryNoteFromScan(
          result,
          scans.length,
        )

      setEditor(note)

      setSuccess(
        `AI je pročitao ${result.lines.length} stavki s ${scans.length} stranica. Provjeri povezivanje sa skladištem prije knjiženja.`,
      )
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Otpremnicu nije moguće analizirati.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function patchEditor(
    patch:
      Partial<DeliveryNote>,
  ) {
    setEditor(
      (current) =>
        current
          ? {
              ...current,
              ...patch,
            }
          : current,
    )
  }

  function patchLine(
    id: string,
    patch:
      Partial<DeliveryNoteLine>,
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
                    id
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
          editor.status ===
          'posted'
            ? 'posted'
            : editor.lines
                .length
              ? 'reviewed'
              : 'draft',
      })

    setEditor(saved)
    refresh()
    setSuccess(
      'Otpremnica je spremljena kao nacrt.',
    )
  }

  function bookToInventory() {
    if (!editor) {
      return
    }

    const confirmed =
      window.confirm(
        'Proknjižiti ovu otpremnicu? Postojećim artiklima povećat će se stanje, a novi artikli će se kreirati s FERSYS QR kodom.',
      )

    if (!confirmed) {
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
        `Otpremnica je proknjižena. ${result.updatedItems.length} postojećih artikala je povećano, a ${result.createdItems.length} novih artikala je kreirano.`,
      )
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Otpremnicu nije moguće proknjižiti.',
      )
    }
  }

  function removeLine(
    id: string,
  ) {
    setEditor(
      (current) =>
        current
          ? {
              ...current,
              lines:
                current.lines.filter(
                  (line) =>
                    line.id !==
                    id,
                ),
            }
          : current,
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 pb-16">
      <header className="rounded-[2rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              Skladište · ulaz robe
            </p>

            <h1 className="mt-2 text-3xl font-black text-white">
              Otpremnice
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Skeniraj dobavljačevu otpremnicu, provjeri artikle i jednim knjiženjem povećaj postojeće stanje ili kreiraj nove artikle s QR kodom.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                newManual
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-5 font-black text-white"
            >
              <Plus
                size={18}
              />
              Nova ručno
            </button>

            <button
              type="button"
              onClick={
                startScan
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white"
            >
              <ScanLine
                size={18}
              />
              Skeniraj otpremnicu
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric
            label="Ukupno"
            value={
              stats.total
            }
          />
          <Metric
            label="Za obradu"
            value={
              stats.drafts
            }
          />
          <Metric
            label="Proknjiženo"
            value={
              stats.posted
            }
          />
        </div>
      </header>

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
                <h2 className="font-black text-white">
                  Skenirano {scans.length} / 12 stranica
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Dodaj sve stranice iste otpremnice pa pokreni AI analizu.
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
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                >
                  + Sljedeća stranica
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void analyze()
                  }
                  disabled={
                    analyzing
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
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
        <Editor
          note={editor}
          inventory={
            inventory
          }
          createdForQr={
            createdForQr
          }
          onClose={() => {
            setEditor(null)
            setScans([])
            setCreatedForQr([])
          }}
          onPatch={
            patchEditor
          }
          onPatchLine={
            patchLine
          }
          onRemoveLine={
            removeLine
          }
          onAddLine={() =>
            setEditor(
              (current) =>
                current
                  ? addManualLine(
                      current,
                    )
                  : current,
            )
          }
          onSave={
            saveDraft
          }
          onPost={
            bookToInventory
          }
        />
      ) : (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-white">
                Evidencija otpremnica
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Proknjižena otpremnica se ne može ponovno knjižiti.
              </p>
            </div>
          </div>

          {notes.length ===
          0 ? (
            <div className="py-16 text-center">
              <Archive
                size={38}
                className="mx-auto text-slate-600"
              />
              <h3 className="mt-4 font-black text-white">
                Još nema otpremnica
              </h3>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {notes.map(
                (note) => (
                  <article
                    key={
                      note.id
                    }
                    className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-white">
                          {note.number ||
                            'Bez broja'}
                        </strong>
                        <Status
                          value={
                            note.status
                          }
                        />
                      </div>
                      <p className="mt-1 text-sm text-slate-300">
                        {note.supplierName ||
                          'Dobavljač nije unesen'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {note.deliveryDate} · {note.lines.length} stavki
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {note.status !==
                        'posted' && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              deleteDeliveryNote(
                                note.id,
                              )
                              refresh()
                            } catch (
                              value
                            ) {
                              setError(
                                value instanceof
                                  Error
                                  ? value.message
                                  : 'Brisanje nije uspjelo.',
                              )
                            }
                          }}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCreatedForQr([])
                          setEditor(
                            note,
                          )
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-black text-white"
                      >
                        Otvori
                        <ChevronRight
                          size={16}
                        />
                      </button>
                    </div>
                  </article>
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
          handleScan
        }
        documentLabel="otpremnice"
        title="Označi 4 kuta otpremnice"
        helperText="Postavi svaki kut točno na rub papira. FERSYS će izravnati sken prije AI čitanja."
        emptyTitle="Fotografiraj otpremnicu"
        emptyText="Fotografiraj cijelu stranicu. Nakon toga precizno označi sva četiri kuta."
        confirmLabel="Spremi ovu stranicu"
      />
    </section>
  )
}

function Editor({
  note,
  inventory,
  createdForQr,
  onClose,
  onPatch,
  onPatchLine,
  onRemoveLine,
  onAddLine,
  onSave,
  onPost,
}: {
  note: DeliveryNote
  inventory:
    InventoryItem[]
  createdForQr:
    InventoryItem[]
  onClose: () => void
  onPatch: (
    patch:
      Partial<DeliveryNote>,
  ) => void
  onPatchLine: (
    id: string,
    patch:
      Partial<DeliveryNoteLine>,
  ) => void
  onRemoveLine: (
    id: string,
  ) => void
  onAddLine: () => void
  onSave: () => void
  onPost: () => void
}) {
  const locked =
    note.status ===
    'posted'

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">
              {note.number ||
                'Nova otpremnica'}
            </h2>
            <Status
              value={
                note.status
              }
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {note.scannedPages
              ? `${note.scannedPages} skeniranih stranica`
              : 'Ručni unos'}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300"
        >
          <X
            size={18}
          />
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field
          label="Broj otpremnice"
          value={
            note.number
          }
          disabled={
            locked
          }
          onChange={(
            value,
          ) =>
            onPatch({
              number:
                value,
            })
          }
        />
        <Field
          label="Dobavljač"
          value={
            note.supplierName
          }
          disabled={
            locked
          }
          onChange={(
            value,
          ) =>
            onPatch({
              supplierName:
                value,
            })
          }
        />
        <Field
          label="OIB dobavljača"
          value={
            note.supplierOib
          }
          disabled={
            locked
          }
          onChange={(
            value,
          ) =>
            onPatch({
              supplierOib:
                value,
            })
          }
        />
        <Field
          label="Datum"
          type="date"
          value={
            note.deliveryDate
          }
          disabled={
            locked
          }
          onChange={(
            value,
          ) =>
            onPatch({
              deliveryDate:
                value,
            })
          }
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-white">
            Stavke
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Postojeći artikl povećava stanje. Novi artikl dobiva svoj FERSYS QR kod.
          </p>
        </div>

        {!locked && (
          <button
            type="button"
            onClick={
              onAddLine
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-white"
          >
            <Plus
              size={16}
            />
            Stavka
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {note.lines.map(
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
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-300">
                    {index +
                      1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="grid gap-3 lg:grid-cols-[1.7fr_100px_110px_130px]">
                      <input
                        value={
                          line.name
                        }
                        disabled={
                          locked
                        }
                        onChange={(
                          event,
                        ) =>
                          onPatchLine(
                            line.id,
                            {
                              name:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        placeholder="Naziv artikla"
                        className={inputClass}
                      />

                      <input
                        type="number"
                        step="0.001"
                        value={
                          line.quantity
                        }
                        disabled={
                          locked
                        }
                        onChange={(
                          event,
                        ) =>
                          onPatchLine(
                            line.id,
                            {
                              quantity:
                                Number(
                                  event
                                    .target
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
                          locked
                        }
                        onChange={(
                          event,
                        ) =>
                          onPatchLine(
                            line.id,
                            {
                              unit:
                                event
                                  .target
                                  .value as
                                  InventoryUnit,
                            },
                          )
                        }
                        className={inputClass}
                      >
                        {units.map(
                          (
                            unit,
                          ) => (
                            <option
                              key={
                                unit
                              }
                              value={
                                unit
                              }
                            >
                              {
                                unit
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        value={
                          line.purchasePrice
                        }
                        disabled={
                          locked
                        }
                        onChange={(
                          event,
                        ) =>
                          onPatchLine(
                            line.id,
                            {
                              purchasePrice:
                                Number(
                                  event
                                    .target
                                    .value,
                                ),
                            },
                          )
                        }
                        className={inputClass}
                        title="Nabavna cijena"
                      />
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[150px_1fr_auto]">
                      <select
                        value={
                          line.action
                        }
                        disabled={
                          locked
                        }
                        onChange={(
                          event,
                        ) =>
                          onPatchLine(
                            line.id,
                            {
                              action:
                                event
                                  .target
                                  .value as
                                  'existing' |
                                  'new',
                              matchedInventoryItemId:
                                event
                                  .target
                                  .value ===
                                'new'
                                  ? ''
                                  : line
                                      .matchedInventoryItemId,
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
                            locked
                          }
                          onChange={(
                            event,
                          ) =>
                            onPatchLine(
                              line.id,
                              {
                                matchedInventoryItemId:
                                  event
                                    .target
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
                            (
                              item,
                            ) => (
                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                {item.name} · stanje {item.quantity} {item.unit}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs font-bold text-emerald-300">
                          Kreirat će se novi artikl + QR
                        </div>
                      )}

                      {!locked && (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveLine(
                              line.id,
                            )
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
                      <div className="mt-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.06] p-3 text-xs text-slate-300">
                        <strong className="text-blue-300">
                          Nakon knjiženja:
                        </strong>{' '}
                        {matched.quantity} →{' '}
                        {matched.quantity +
                          Number(
                            line.quantity ||
                              0,
                          )}{' '}
                        {matched.unit}
                        {line.matchConfidence >
                          0 && (
                          <span className="ml-2 text-slate-500">
                            · AI povezivanje {Math.round(
                              line.matchConfidence *
                                100,
                            )}
                            %
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
                <p className="font-black text-emerald-200">
                  {createdForQr.length} novih artikala ima nove QR kodove
                </p>
                <p className="mt-1 text-xs text-emerald-100/70">
                  Ispiši samo naljepnice za artikle koji prije nisu postojali.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void downloadInventoryQrLabels(
                    createdForQr,
                    note.number ||
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

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-5">
        {!locked && (
          <>
            <button
              type="button"
              onClick={
                onSave
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 font-black text-white"
            >
              <Save
                size={17}
              />
              Spremi nacrt
            </button>

            <button
              type="button"
              onClick={
                onPost
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white"
            >
              <PackageCheck
                size={18}
              />
              Proknjiži u skladište
            </button>
          </>
        )}

        {locked && (
          <div className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500/10 px-5 font-black text-emerald-300">
            <CheckCircle2
              size={18}
            />
            Proknjiženo
          </div>
        )}
      </div>
    </section>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60'

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
    <label className="text-xs font-black uppercase tracking-wide text-slate-500">
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
        className={`${inputClass} mt-2 normal-case tracking-normal`}
      />
    </label>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Status({
  value,
}: {
  value:
    DeliveryNote['status']
}) {
  const map = {
    draft:
      'Nacrt',
    scanned:
      'Skenirano',
    reviewed:
      'Provjereno',
    posted:
      'Proknjiženo',
    cancelled:
      'Stornirano',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
        value ===
        'posted'
          ? 'bg-emerald-500/10 text-emerald-300'
          : value ===
              'cancelled'
            ? 'bg-red-500/10 text-red-300'
            : 'bg-blue-500/10 text-blue-300'
      }`}
    >
      {map[value]}
    </span>
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

export default DeliveryNotesPage
