import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileCheck2,
  FileText,
  LoaderCircle,
  Network,
  ReceiptText,
  Sparkles,
  Truck,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import {
  documentRoute,
  ensureFlow,
  finalizePendingConversion,
  getDocumentSummary,
  getFlowDocuments,
  hasExistingTargetDraft,
  prepareDocumentConversion,
  type DocumentSummary,
  type FlowDocument,
  type FlowDocumentType,
} from '../services/documentFlow.service'

type RouteDocument = {
  type: FlowDocumentType
  id: string
}

function routeDocument(
  pathname: string,
): RouteDocument | null {
  const patterns:
    Array<{
      type:
        FlowDocumentType
      regex: RegExp
    }> = [
      {
        type:
          'work_order',
        regex:
          /^\/work-orders\/([0-9a-f-]{20,})(?:\/|$)/i,
      },
      {
        type:
          'offer',
        regex:
          /^\/offers\/([0-9a-f-]{20,})(?:\/|$)/i,
      },
      {
        type:
          'delivery_note',
        regex:
          /^\/delivery-notes\/([0-9a-f-]{20,})(?:\/|$)/i,
      },
      {
        type:
          'invoice',
        regex:
          /^\/invoices\/([0-9a-f-]{20,})(?:\/|$)/i,
      },
    ]

  for (
    const item of
      patterns
  ) {
    const match =
      pathname.match(
        item.regex,
      )

    if (match?.[1]) {
      return {
        type:
          item.type,
        id:
          match[1],
      }
    }
  }

  return null
}

function iconFor(
  type:
    FlowDocumentType,
) {
  if (
    type === 'offer'
  ) {
    return FileText
  }

  if (
    type ===
    'work_order'
  ) {
    return ClipboardList
  }

  if (
    type ===
    'delivery_note'
  ) {
    return Truck
  }

  return ReceiptText
}

function labelFor(
  type:
    FlowDocumentType,
) {
  if (
    type === 'offer'
  ) {
    return 'Ponuda'
  }

  if (
    type ===
    'work_order'
  ) {
    return 'Radni nalog'
  }

  if (
    type ===
    'delivery_note'
  ) {
    return 'Otpremnica'
  }

  return 'Račun'
}

function conversionTargets(
  type:
    FlowDocumentType,
) {
  if (
    type === 'offer'
  ) {
    return [
      'work_order',
      'delivery_note',
      'invoice',
    ] as FlowDocumentType[]
  }

  if (
    type ===
    'work_order'
  ) {
    return [
      'offer',
      'delivery_note',
      'invoice',
    ] as FlowDocumentType[]
  }

  if (
    type ===
    'delivery_note'
  ) {
    return [
      'invoice',
    ] as FlowDocumentType[]
  }

  return []
}

function bestTarget(
  document:
    DocumentSummary,
  flow:
    FlowDocument[],
) {
  const has =
    (
      type:
        FlowDocumentType,
    ) =>
      flow.some(
        (item) =>
          item.documentType ===
          type,
      )

  if (
    document.type ===
    'offer'
  ) {
    if (
      !has(
        'work_order',
      ) &&
      [
        'Prihvaćeno',
        'U tijeku',
      ].includes(
        document.status,
      )
    ) {
      return 'work_order'
    }

    if (
      !has(
        'invoice',
      ) &&
      document.status ===
        'Prihvaćeno'
    ) {
      return 'invoice'
    }

    return 'work_order'
  }

  if (
    document.type ===
    'work_order'
  ) {
    if (
      document.status ===
        'Završen' &&
      !has(
        'invoice',
      )
    ) {
      return 'invoice'
    }

    if (
      !has(
        'delivery_note',
      )
    ) {
      return 'delivery_note'
    }

    return 'invoice'
  }

  if (
    document.type ===
    'delivery_note'
  ) {
    return 'invoice'
  }

  return null
}

export default function DocumentFlowOrchestrator() {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const current =
    useMemo(
      () =>
        routeDocument(
          location.pathname,
        ),
      [
        location.pathname,
      ],
    )

  const [
    document,
    setDocument,
  ] =
    useState<
      DocumentSummary | null
    >(null)

  const [
    flow,
    setFlow,
  ] =
    useState<
      FlowDocument[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    converting,
    setConverting,
  ] =
    useState<
      FlowDocumentType | null
    >(null)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    open,
    setOpen,
  ] =
    useState(false)

  const load =
    useCallback(
      async () => {
        if (!current) {
          setDocument(
            null,
          )
          setFlow([])
          return
        }

        try {
          setLoading(true)
          setError('')

          const summary =
            await getDocumentSummary(
              current.type,
              current.id,
            )

          if (!summary) {
            setDocument(
              null,
            )
            return
          }

          setDocument(
            summary,
          )

          /*
           * Ako se korisnik upravo vratio s uspješno
           * izrađenog dokumenta, ovdje automatski
           * zatvaramo vezu source -> target.
           */
          try {
            await finalizePendingConversion(
              current.type,
              current.id,
            )
          } catch (
            conversionError
          ) {
            console.error(
              'Document flow finalize:',
              conversionError,
            )
          }

          let documents =
            await getFlowDocuments(
              current.type,
              current.id,
            )

          /*
           * Prvi put kada korisnik otvori Smart Flow
           * za postojeći dokument, osiguraj centralni
           * "posao" bez dupliciranja.
           */
          if (
            documents.length ===
            0
          ) {
            await ensureFlow(
              summary,
            )

            documents =
              await getFlowDocuments(
                current.type,
                current.id,
              )
          }

          setFlow(
            documents,
          )
        } catch (value) {
          setError(
            value instanceof Error
              ? value.message
              : 'Tijek dokumenata nije moguće učitati.',
          )
        } finally {
          setLoading(false)
        }
      },
      [current],
    )

  useEffect(() => {
    void load()
  }, [load])

  if (
    !current ||
    !document
  ) {
    return null
  }

  const activeDocument =
    document

  const recommended =
    bestTarget(
      activeDocument,
      flow,
    )

  async function convert(
    target:
      FlowDocumentType,
  ) {
    try {
      setConverting(
        target,
      )
      setError('')

      const hasDraft =
        await hasExistingTargetDraft(
          target,
        )

      if (
        hasDraft
      ) {
        const overwrite =
          window.confirm(
            `Već postoji nedovršeni nacrt za ${labelFor(
              target,
            ).toLowerCase()}. Želiš li ga zamijeniti podacima iz ovog dokumenta?`,
          )

        if (
          !overwrite
        ) {
          return
        }
      }

      const result =
        await prepareDocumentConversion(
          activeDocument.type,
          activeDocument.id,
          target,
          hasDraft,
        )

      if (
        result.alreadyExists &&
        result.existing
      ) {
        const go =
          window.confirm(
            `${labelFor(
              target,
            )} ${
              result.existing.number ||
              ''
            } već je izrađen iz ovog dokumenta. Otvoriti postojeći dokument?`,
          )

        if (go) {
          navigate(
            result.route,
          )
        }

        return
      }

      navigate(
        result.route,
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Dokument nije moguće pripremiti.',
      )
      setOpen(true)
    } finally {
      setConverting(
        null,
      )
    }
  }

  const targets =
    conversionTargets(
      document.type,
    )

  return (
    <div className="pointer-events-none fixed bottom-[calc(78px+env(safe-area-inset-bottom))] right-3 z-[180] sm:bottom-6 sm:right-6">
      {!open ? (
        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-2xl border border-violet-400/20 bg-slate-950/95 px-4 text-sm font-black text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:border-violet-400/40 active:scale-[0.98]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600">
            <Network
              size={17}
            />
          </span>

          FERSYS Flow

          {loading ? (
            <LoaderCircle
              size={15}
              className="animate-spin text-violet-300"
            />
          ) : (
            <ChevronUp
              size={15}
              className="text-slate-500"
            />
          )}
        </button>
      ) : (
        <section className="pointer-events-auto w-[min(94vw,430px)] overflow-hidden rounded-[1.6rem] border border-violet-400/20 bg-slate-950/98 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="border-b border-white/5 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-fuchsia-600/10 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                <Sparkles
                  size={20}
                />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">
                  FERSYS SMART FLOW
                </p>

                <h3 className="mt-1 truncate font-black text-white">
                  {document.number}
                </h3>

                <p className="mt-1 truncate text-xs text-slate-400">
                  {document.customerName ||
                    document.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-white/5 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="max-h-[65dvh] overflow-y-auto p-4">
            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-300">
                {error}
              </div>
            )}

            {recommended && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.08] p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-violet-300">
                  PREPORUČENI SLJEDEĆI KORAK
                </p>

                <button
                  type="button"
                  disabled={
                    converting !==
                    null
                  }
                  onClick={() =>
                    void convert(
                      recommended,
                    )
                  }
                  className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-black text-white disabled:opacity-60"
                >
                  <span>
                    Izradi{' '}
                    {labelFor(
                      recommended,
                    ).toLowerCase()}
                  </span>

                  {converting ===
                  recommended ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <ArrowRight
                      size={17}
                    />
                  )}
                </button>
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-slate-500">
                  TIJEK POSLA
                </p>

                <span className="text-[10px] font-bold text-slate-600">
                  {flow.length}{' '}
                  dokumenta
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {flow.map(
                  (
                    item,
                    index,
                  ) => {
                    const Icon =
                      iconFor(
                        item.documentType,
                      )

                    const currentDocument =
                      item.documentType ===
                        document.type &&
                      item.documentId ===
                        document.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          navigate(
                            documentRoute(
                              item.documentType,
                              item.documentId,
                            ),
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          currentDocument
                            ? 'border-violet-500/25 bg-violet-500/10'
                            : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="relative">
                          <span className={`grid h-9 w-9 place-items-center rounded-xl ${
                            currentDocument
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-900 text-slate-400'
                          }`}>
                            <Icon
                              size={16}
                            />
                          </span>

                          {index <
                            flow.length -
                              1 && (
                            <span className="absolute left-1/2 top-9 h-3 w-px -translate-x-1/2 bg-slate-700" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase text-slate-500">
                            {labelFor(
                              item.documentType,
                            )}
                          </p>

                          <p className="mt-0.5 truncate text-xs font-black text-white">
                            {item.documentNumber ||
                              'Dokument'}
                          </p>
                        </div>

                        <CheckCircle2
                          size={16}
                          className="text-emerald-400"
                        />
                      </button>
                    )
                  },
                )}
              </div>
            </div>

            {targets.length >
              0 && (
              <div className="mt-5 border-t border-white/5 pt-4">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-slate-500">
                  SVE AKCIJE
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {targets.map(
                    (
                      target,
                    ) => {
                      const Icon =
                        iconFor(
                          target,
                        )

                      return (
                        <button
                          key={
                            target
                          }
                          type="button"
                          disabled={
                            converting !==
                            null
                          }
                          onClick={() =>
                            void convert(
                              target,
                            )
                          }
                          className="flex min-h-11 items-center gap-2 rounded-xl border border-white/5 bg-white/[0.025] px-3 text-left text-xs font-black text-slate-300 transition hover:border-violet-500/20 hover:bg-violet-500/[0.06] hover:text-white disabled:opacity-50"
                        >
                          {converting ===
                          target ? (
                            <LoaderCircle
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Icon
                              size={15}
                            />
                          )}

                          Izradi{' '}
                          {labelFor(
                            target,
                          ).toLowerCase()}
                        </button>
                      )
                    },
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-900/80 p-3">
              <FileCheck2
                size={15}
                className="mt-0.5 shrink-0 text-emerald-400"
              />

              <p className="text-[10px] leading-5 text-slate-500">
                Podaci se prenose u novi nacrt. Ništa se ne izdaje automatski — prije spremanja možeš promijeniti cijene, stavke i podatke.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="flex min-h-10 w-full items-center justify-center gap-2 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 hover:text-slate-300"
          >
            <ChevronDown
              size={14}
            />
            Zatvori
          </button>
        </section>
      )}
    </div>
  )
}
