import {
  Check,
  FileScan,
  Loader2,
  Percent,
  ScanLine,
  Sparkles,
  X,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'

import {
  DocumentScannerModal,
} from './DocumentScannerModal'
import {
  analyzeOfferScan,
  type ImportedOfferItem,
  type OfferImportAiResult,
} from '../services/offerImportAi.service'

export type OfferImportPayload = {
  description: string
  paymentTerms: string
  items: Array<{
    name: string
    description: string
    quantity: number
    unit: string
    price: number
    discount: number
    vat: number
  }>
  source: {
    supplierName: string
    offerNumber: string
    offerDate: string
  }
}

type Props = {
  open: boolean
  onClose: () => void
  onImport: (
    payload: OfferImportPayload,
  ) => void
}

type ReviewItem =
  ImportedOfferItem & {
    id: string
    selected: boolean
  }

function makeId(
  index: number,
) {
  return `scan-item-${Date.now()}-${index}`
}

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

export function OfferImportModal({
  open,
  onClose,
  onImport,
}: Props) {
  const [
    scannerOpen,
    setScannerOpen,
  ] =
    useState(false)

  const [
    reading,
    setReading,
  ] =
    useState(false)

  const [
    result,
    setResult,
  ] =
    useState<OfferImportAiResult | null>(
      null,
    )

  const [
    reviewItems,
    setReviewItems,
  ] =
    useState<
      ReviewItem[]
    >([])

  const [
    importPrices,
    setImportPrices,
  ] =
    useState(true)

  const [
    markup,
    setMarkup,
  ] =
    useState(0)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    sourceName,
    setSourceName,
  ] =
    useState('')

  const selectedCount =
    useMemo(
      () =>
        reviewItems.filter(
          (item) =>
            item.selected,
        ).length,
      [reviewItems],
    )

  if (!open) {
    return null
  }

  function reset() {
    setResult(null)
    setReviewItems([])
    setError('')
    setReading(false)
    setMarkup(0)
    setImportPrices(true)
    setSourceName('')
  }

  function close() {
    reset()
    onClose()
  }

  async function handleScan(
    file: File,
  ) {
    setReading(true)
    setError('')
    setResult(null)
    setReviewItems([])
    setSourceName(
      file.name,
    )

    try {
      const parsed =
        await analyzeOfferScan(
          file,
        )

      setResult(
        parsed,
      )

      setReviewItems(
        parsed.items.map(
          (
            item,
            index,
          ) => ({
            ...item,
            id:
              makeId(
                index,
              ),
            selected: true,
          }),
        ),
      )
    } catch (scanError) {
      setError(
        scanError instanceof
          Error
          ? scanError.message
          : 'Ponuda se nije mogla analizirati.',
      )
    } finally {
      setReading(
        false,
      )
    }
  }

  function updateReviewItem(
    id: string,
    patch:
      Partial<ReviewItem>,
  ) {
    setReviewItems(
      (current) =>
        current.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    )
  }

  function finishImport() {
    if (
      selectedCount === 0
    ) {
      setError(
        'Odaberi barem jednu stavku za uvoz.',
      )
      return
    }

    const multiplier =
      1 +
      (
        Number(
          markup,
        ) || 0
      ) /
        100

    const imported =
      reviewItems
        .filter(
          (item) =>
            item.selected,
        )
        .map(
          (item) => ({
            name:
              item.name.trim() ||
              'Stavka',
            description:
              item.description.trim(),
            quantity:
              Number(
                item.quantity,
              ) || 1,
            unit:
              item.unit.trim() ||
              'kom',
            price:
              importPrices
                ? Math.max(
                    0,
                    Number(
                      (
                        (
                          Number(
                            item.price,
                          ) || 0
                        ) *
                        multiplier
                      ).toFixed(
                        2,
                      ),
                    ),
                  )
                : 0,
            discount:
              Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    item.discount,
                  ) || 0,
                ),
              ),
            vat:
              Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    item.vat,
                  ) || 0,
                ),
              ),
          }),
        )

    onImport({
      description:
        result
          ?.description ??
        '',
      paymentTerms:
        result
          ?.paymentTerms ??
        '',
      items:
        imported,
      source: {
        supplierName:
          result
            ?.sourceSupplierName ??
          '',
        offerNumber:
          result
            ?.sourceOfferNumber ??
          '',
        offerDate:
          result
            ?.sourceOfferDate ??
          '',
      },
    })

    close()
  }

  return (
    <>
      <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 p-2 backdrop-blur-sm sm:p-5">
        <div className="mx-auto min-h-full max-w-6xl rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                <Sparkles
                  size={16}
                />
                FERSYS AI IMPORT
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Skeniraj postojeću ponudu
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                FERSYS čita stavke iz tuđe ili dobavljačeve ponude i pretvara ih u novu FERSYS ponudu. Dizajn izvornog dokumenta se ne kopira — dobivaš potpuno uređive stavke u svom obrascu.
              </p>
            </div>

            <button
              type="button"
              onClick={
                close
              }
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 text-slate-400"
            >
              <X
                size={19}
              />
            </button>
          </header>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[340px_1fr]">
            <aside className="space-y-4">
              <section className="rounded-3xl border border-violet-500/20 bg-violet-500/[0.07] p-4">
                <div className="flex items-center gap-2 font-black">
                  <ScanLine
                    size={19}
                    className="text-violet-300"
                  />
                  1. Skeniraj dokument
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Fotografiraj isprintanu ponudu i označi sva četiri kuta. Može biti slikana i ukoso.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setScannerOpen(
                      true,
                    )
                  }
                  disabled={
                    reading
                  }
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-50"
                >
                  <FileScan
                    size={18}
                  />
                  Skeniraj ponudu
                </button>

                {sourceName && (
                  <p className="mt-2 truncate text-[10px] text-slate-600">
                    {sourceName}
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-slate-900 p-4">
                <p className="font-black">
                  2. Kako uvesti cijene?
                </p>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                  <input
                    type="checkbox"
                    checked={
                      importPrices
                    }
                    onChange={(
                      event,
                    ) =>
                      setImportPrices(
                        event
                          .target
                          .checked,
                      )
                    }
                    className="mt-1 h-4 w-4 accent-violet-500"
                  />

                  <span>
                    <strong className="block text-sm text-white">
                      Uvezi njihove cijene
                    </strong>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Isključi ako želiš samo stavke, količine i jedinice, a svoje cijene ćeš upisati ručno.
                    </span>
                  </span>
                </label>

                {importPrices && (
                  <label className="mt-4 block">
                    <span className="flex items-center gap-2 text-xs font-black text-slate-300">
                      <Percent
                        size={15}
                      />
                      Povećaj sve cijene
                    </span>

                    <div className="relative mt-2">
                      <input
                        type="number"
                        value={
                          markup
                        }
                        onChange={(
                          event,
                        ) =>
                          setMarkup(
                            Number(
                              event
                                .target
                                .value,
                            ),
                          )
                        }
                        step="1"
                        min="-100"
                        className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 pr-12 text-sm font-black text-white outline-none focus:border-violet-500"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                        %
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] leading-4 text-slate-600">
                      Primjer: 20% pretvara 100,00 € u 120,00 €. Cijene možeš nakon uvoza normalno uređivati.
                    </p>
                  </label>
                )}
              </section>

              {result && (
                <section className="rounded-3xl border border-white/10 bg-slate-900 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                    Izvorna ponuda
                  </p>

                  <dl className="mt-3 grid gap-2 text-xs">
                    <div>
                      <dt className="text-slate-600">
                        Dobavljač
                      </dt>
                      <dd className="font-bold text-slate-300">
                        {result.sourceSupplierName ||
                          'Nije prepoznato'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-600">
                        Broj ponude
                      </dt>
                      <dd className="font-bold text-slate-300">
                        {result.sourceOfferNumber ||
                          'Nije prepoznato'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-600">
                        AI sigurnost
                      </dt>
                      <dd className="font-black text-emerald-300">
                        {Math.round(
                          (
                            result.confidence ||
                            0
                          ) *
                            100,
                        )}
                        %
                      </dd>
                    </div>
                  </dl>
                </section>
              )}
            </aside>

            <main className="min-w-0">
              {reading ? (
                <div className="grid min-h-[440px] place-items-center rounded-3xl border border-violet-500/20 bg-violet-500/[0.05] p-6 text-center">
                  <div>
                    <Loader2
                      size={42}
                      className="mx-auto animate-spin text-violet-300"
                    />

                    <h3 className="mt-5 text-xl font-black">
                      FERSYS AI čita ponudu...
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Prepoznajem nazive stavki, opise, količine, jedinice, cijene, popuste i PDV.
                    </p>
                  </div>
                </div>
              ) : reviewItems.length ===
                0 ? (
                <div className="grid min-h-[440px] place-items-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/55 p-6 text-center">
                  <div>
                    <FileScan
                      size={42}
                      className="mx-auto text-slate-600"
                    />

                    <h3 className="mt-4 text-lg font-black">
                      Još nema skenirane ponude
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                      Skeniraj ponudu i ovdje će se pojaviti sve prepoznate stavke prije nego ih ubaciš u svoj FERSYS obrazac.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">
                        Prepoznate stavke
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Odabrano {selectedCount} od {reviewItems.length}. Sve se nakon uvoza može uređivati.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        finishImport
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white"
                    >
                      <Check
                        size={17}
                      />
                      Ubaci u moju ponudu
                    </button>
                  </div>

                  <div className="space-y-3">
                    {reviewItems.map(
                      (
                        item,
                        index,
                      ) => (
                        <article
                          key={
                            item.id
                          }
                          className={`rounded-3xl border p-4 ${
                            item.selected
                              ? 'border-violet-500/20 bg-slate-900'
                              : 'border-slate-800 bg-slate-950/60 opacity-55'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={
                                item.selected
                              }
                              onChange={(
                                event,
                              ) =>
                                updateReviewItem(
                                  item.id,
                                  {
                                    selected:
                                      event
                                        .target
                                        .checked,
                                  },
                                )
                              }
                              className="mt-2 h-4 w-4 shrink-0 accent-violet-500"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-violet-400">
                                  Stavka {index + 1}
                                </span>

                                <span className="text-[10px] font-black text-slate-600">
                                  {Math.round(
                                    (
                                      item.confidence ||
                                      0
                                    ) *
                                      100,
                                  )}
                                  %
                                </span>
                              </div>

                              <input
                                value={
                                  item.name
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateReviewItem(
                                    item.id,
                                    {
                                      name:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-black text-white outline-none focus:border-violet-500"
                              />

                              <textarea
                                value={
                                  item.description
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateReviewItem(
                                    item.id,
                                    {
                                      description:
                                        event
                                          .target
                                          .value,
                                    },
                                  )
                                }
                                rows={2}
                                placeholder="Opis stavke"
                                className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-slate-300 outline-none focus:border-violet-500"
                              />

                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                <input
                                  type="number"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateReviewItem(
                                      item.id,
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
                                  step="0.01"
                                  className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none"
                                  title="Količina"
                                />

                                <input
                                  value={
                                    item.unit
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateReviewItem(
                                      item.id,
                                      {
                                        unit:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                  className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none"
                                  title="Jedinica"
                                />

                                <input
                                  type="number"
                                  value={
                                    item.price
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateReviewItem(
                                      item.id,
                                      {
                                        price:
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ),
                                      },
                                    )
                                  }
                                  step="0.01"
                                  className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none"
                                  title="Cijena"
                                />

                                <input
                                  type="number"
                                  value={
                                    item.discount
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateReviewItem(
                                      item.id,
                                      {
                                        discount:
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ),
                                      },
                                    )
                                  }
                                  step="0.01"
                                  className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none"
                                  title="Popust %"
                                />

                                <input
                                  type="number"
                                  value={
                                    item.vat
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateReviewItem(
                                      item.id,
                                      {
                                        vat:
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ),
                                      },
                                    )
                                  }
                                  step="0.01"
                                  className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-2 text-xs text-white outline-none"
                                  title="PDV %"
                                />
                              </div>

                              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-600">
                                <span>
                                  Izvorna cijena: {money(item.price)}
                                </span>

                                {importPrices &&
                                  markup !==
                                    0 && (
                                    <span className="font-black text-emerald-300">
                                      Nakon {markup > 0 ? '+' : ''}
                                      {markup}%: {money(item.price * (1 + markup / 100))}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>

                  {result?.warnings?.length ? (
                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <p className="text-xs font-black text-amber-200">
                        Provjeri prije uvoza
                      </p>

                      <div className="mt-2 space-y-1 text-xs leading-5 text-amber-100/75">
                        {result.warnings.map(
                          (
                            warning,
                            index,
                          ) => (
                            <p
                              key={`${warning}-${index}`}
                            >
                              • {warning}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}

                  {error && (
                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {!reading &&
                error &&
                reviewItems.length ===
                  0 && (
                  <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                    {error}
                  </div>
                )}
            </main>
          </div>
        </div>
      </div>

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
        documentLabel="ponude"
        title="Označi sva 4 kuta ponude"
        helperText="Postavi svaki ljubičasti kut točno na rub isprintane ponude. Povećalo 5× pomaže da pogodimo rub, a FERSYS zatim izravnava dokument prije AI čitanja."
        emptyTitle="Fotografiraj ponudu"
        emptyText="Fotografiraj cijeli papir. Nakon toga možeš precizno označiti sva četiri kuta i izbaciti stol ili pozadinu."
        confirmLabel="Izravnaj i pročitaj ponudu AI-em"
      />
    </>
  )
}
