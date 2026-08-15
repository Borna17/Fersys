import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Palette,
  ReceiptText,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  getCompanySettings,
  type CompanySettings,
} from '../services/companySettings.service'
import {
  getDocumentAppearanceSettings,
  mapLegacyWorkOrderAppearance,
  saveDocumentAppearanceSettings,
} from '../services/documentAppearance.service'
import {
  getWorkOrderBrandingFromCompanySettings,
  saveWorkOrderBranding,
} from '../services/workOrderBranding.service'
import {
  createPresetAppearance,
  documentKindDescriptions,
  documentKindLabels,
  presetDescriptions,
  type DocumentAppearance,
  type DocumentAppearanceSettings,
  type DocumentKind,
  type DocumentPreset,
} from '../types/documentAppearance'

const kinds: Array<{
  id: DocumentKind
  icon: typeof Wrench
}> = [
  {
    id: 'workOrder',
    icon: Wrench,
  },
  {
    id: 'offer',
    icon: FileText,
  },
  {
    id: 'invoice',
    icon: ReceiptText,
  },
]

const presets: DocumentPreset[] = [
  'modern',
  'classic',
  'minimal',
  'custom',
]

const colorFields: Array<{
  key:
    | 'primaryColor'
    | 'secondaryColor'
    | 'accentColor'
    | 'textColor'
    | 'borderColor'
    | 'backgroundColor'
  label: string
}> = [
  {
    key: 'primaryColor',
    label: 'Glavna boja',
  },
  {
    key: 'secondaryColor',
    label: 'Sekundarna boja',
  },
  {
    key: 'accentColor',
    label: 'Naglasna boja',
  },
  {
    key: 'textColor',
    label: 'Boja teksta',
  },
  {
    key: 'borderColor',
    label: 'Boja obruba',
  },
  {
    key: 'backgroundColor',
    label: 'Boja pozadine',
  },
]

function isHexColor(
  value: string,
) {
  return /^#[0-9A-Fa-f]{6}$/.test(
    value.trim(),
  )
}

export function WorkOrderSettingsPage() {
  const navigate =
    useNavigate()

  const [
    activeKind,
    setActiveKind,
  ] =
    useState<DocumentKind>(
      'workOrder',
    )

  const [
    appearance,
    setAppearance,
  ] =
    useState<DocumentAppearanceSettings | null>(
      null,
    )

  const [
    company,
    setCompany,
  ] =
    useState<CompanySettings | null>(
      null,
    )

  const [
    legacyWorkOrder,
    setLegacyWorkOrder,
  ] =
    useState<
      Awaited<
        ReturnType<
          typeof getWorkOrderBrandingFromCompanySettings
        >
      > | null
    >(null)

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    saved,
    setSaved,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError('')

        const [
          appearanceResult,
          currentCompany,
          currentWorkOrder,
        ] =
          await Promise.all([
            getDocumentAppearanceSettings(),
            getCompanySettings(),
            getWorkOrderBrandingFromCompanySettings(),
          ])

        if (cancelled) {
          return
        }

        const next = {
          ...appearanceResult.settings,
        }

        if (
          !appearanceResult
            .hasStoredSettings
        ) {
          next.workOrder =
            mapLegacyWorkOrderAppearance(
              currentWorkOrder,
            )

          next.offer = {
            ...next.offer,
            primaryColor:
              currentCompany.primaryColor ||
              next.offer
                .primaryColor,
            secondaryColor:
              currentCompany.secondaryColor ||
              next.offer
                .secondaryColor,
            footerText:
              currentCompany.documentFooter ||
              next.offer
                .footerText,
          }

          next.invoice = {
            ...next.invoice,
            primaryColor:
              currentCompany.primaryColor ||
              next.invoice
                .primaryColor,
            secondaryColor:
              currentCompany.secondaryColor ||
              next.invoice
                .secondaryColor,
            footerText:
              currentCompany.documentFooter ||
              next.invoice
                .footerText,
          }
        }

        setAppearance(next)
        setCompany(
          currentCompany,
        )
        setLegacyWorkOrder(
          currentWorkOrder,
        )
      } catch (value) {
        if (!cancelled) {
          setError(
            value instanceof Error
              ? value.message
              : 'Izgled dokumenata nije moguće učitati.',
          )
        }
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
  }, [])

  const active =
    appearance?.[activeKind]

  const title =
    documentKindLabels[
      activeKind
    ]

  const activePreset =
    active?.preset ??
    'modern'

  const canShowImages =
    activeKind === 'offer'

  const colorSummary =
    useMemo(
      () =>
        active
          ? [
              active.primaryColor,
              active.secondaryColor,
              active.accentColor,
            ]
          : [],
      [active],
    )

  function updateActive(
    updater:
      | Partial<DocumentAppearance>
      | ((
          current: DocumentAppearance,
        ) => DocumentAppearance),
  ) {
    setSaved(false)

    setAppearance(
      (
        current:
          DocumentAppearanceSettings | null,
      ) => {
        if (!current) {
          return current
        }

        const currentAppearance =
          current[activeKind]

        const nextAppearance =
          typeof updater ===
          'function'
            ? updater(
                currentAppearance,
              )
            : {
                ...currentAppearance,
                ...updater,
              }

        return {
          ...current,
          [activeKind]:
            nextAppearance,
        }
      },
    )
  }

  function selectPreset(
    preset: DocumentPreset,
  ) {
    if (!active) {
      return
    }

    const presetValue =
      createPresetAppearance(
        activeKind,
        preset,
      )

    updateActive({
      ...presetValue,
      footerText:
        active.footerText ||
        presetValue.footerText,
      watermarkText:
        active.watermarkText ||
        presetValue.watermarkText,
    })
  }

  function updateColor(
    key:
      | 'primaryColor'
      | 'secondaryColor'
      | 'accentColor'
      | 'textColor'
      | 'borderColor'
      | 'backgroundColor',
    value: string,
  ) {
    if (
      !isHexColor(value)
    ) {
      return
    }

    updateActive({
      [key]:
        value.toUpperCase(),
    })
  }

  function resetCurrent() {
    updateActive(
      createPresetAppearance(
        activeKind,
        'modern',
      ),
    )
  }

  async function saveAll() {
    if (
      !appearance ||
      !legacyWorkOrder ||
      isSaving
    ) {
      return
    }

    try {
      setIsSaving(true)
      setError('')

      const savedAppearance =
        await saveDocumentAppearanceSettings(
          appearance,
        )

      const workOrder =
        savedAppearance.workOrder

      const nextLegacy = {
        ...legacyWorkOrder,
        layout:
          workOrder.preset,
        primaryColor:
          workOrder.primaryColor,
        secondaryColor:
          workOrder.secondaryColor,
        accentColor:
          workOrder.accentColor,
        textColor:
          workOrder.textColor,
        borderColor:
          workOrder.borderColor,
        backgroundColor:
          workOrder.backgroundColor,
        headerAlignment:
          workOrder.headerAlignment,
        showLogo:
          workOrder.showLogo,
        showStamp:
          workOrder.showStamp,
        watermarkText:
          workOrder.showWatermark
            ? workOrder.watermarkText
            : '',
        footerText:
          workOrder.showFooter
            ? workOrder.footerText
            : '',
        customDocumentTitle:
          workOrder.documentTitle,
        customInfoStyle:
          workOrder.infoStyle ===
          'cards'
            ? ('cards' as const)
            : ('compact' as const),
        customMaterialStyle:
          workOrder.tableStyle ===
          'minimal'
            ? ('list' as const)
            : ('table' as const),
      }

      const savedLegacy =
        await saveWorkOrderBranding(
          nextLegacy,
        )

      setAppearance(
        savedAppearance,
      )
      setLegacyWorkOrder(
        savedLegacy,
      )
      setSaved(true)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Izgled dokumenata nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje studija dokumenata..." />
    )
  }

  if (
    !appearance ||
    !active
  ) {
    return (
      <section className="mx-auto max-w-2xl rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-red-300">
        {error ||
          'Postavke izgleda nisu dostupne.'}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1650px] space-y-4 pb-44 sm:space-y-6 sm:pb-12">
      <button
        type="button"
        onClick={() =>
          navigate('/settings')
        }
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-slate-300 active:scale-[0.99]"
      >
        <ArrowLeft
          size={18}
        />
        Postavke
      </button>

      <section className="relative overflow-hidden rounded-[1.9rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              FERSYS DOCUMENT
              STUDIO
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Izgled dokumenata
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Forma dokumenta
              ostaje profesionalna,
              a svaka tvrtka može
              prilagoditi boje,
              logo, pečat, potpis i
              način prikaza.
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {colorSummary.map(
              (color) => (
                <span
                  key={color}
                  className="h-7 w-7 rounded-full border border-white/15"
                  style={{
                    backgroundColor:
                      color,
                  }}
                />
              ),
            )}
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {kinds.map(
            (kind) => {
              const Icon =
                kind.icon

              const selected =
                activeKind ===
                kind.id

              return (
                <button
                  key={
                    kind.id
                  }
                  type="button"
                  onClick={() =>
                    setActiveKind(
                      kind.id,
                    )
                  }
                  className={`min-w-0 rounded-2xl border px-2 py-3 text-center transition active:scale-[0.99] sm:flex sm:items-center sm:justify-center sm:gap-2 sm:px-4 ${
                    selected
                      ? 'border-violet-400/50 bg-violet-500/15 text-white'
                      : 'border-white/5 bg-white/[0.035] text-slate-400'
                  }`}
                >
                  <Icon
                    size={18}
                    className="mx-auto sm:mx-0"
                  />

                  <span className="mt-1 block truncate text-[10px] font-black sm:mt-0 sm:text-sm">
                    {
                      documentKindLabels[
                        kind.id
                      ]
                    }
                  </span>
                </button>
              )
            },
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_500px] xl:gap-6">
        <div className="space-y-4 sm:space-y-6">
          <Panel
            icon={
              <Sparkles
                size={20}
              />
            }
            title={`Stil · ${title}`}
            description={
              documentKindDescriptions[
                activeKind
              ]
            }
          >
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {presets.map(
                (preset) => {
                  const item =
                    presetDescriptions[
                      preset
                    ]

                  const selected =
                    activePreset ===
                    preset

                  return (
                    <button
                      key={
                        preset
                      }
                      type="button"
                      onClick={() =>
                        selectPreset(
                          preset,
                        )
                      }
                      className={`relative min-h-[132px] rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                        selected
                          ? 'border-violet-400/60 bg-violet-500/12'
                          : 'border-slate-700 bg-slate-950/45'
                      }`}
                    >
                      {item.badge && (
                        <span className="absolute right-3 top-3 rounded-full bg-blue-500/15 px-2 py-1 text-[9px] font-black uppercase text-blue-300">
                          {
                            item.badge
                          }
                        </span>
                      )}

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-violet-300">
                        {selected ? (
                          <Check
                            size={
                              18
                            }
                          />
                        ) : (
                          <Palette
                            size={
                              18
                            }
                          />
                        )}
                      </div>

                      <p className="mt-3 font-black text-white">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {
                          item.description
                        }
                      </p>
                    </button>
                  )
                },
              )}
            </div>
          </Panel>

          <Panel
            icon={
              <Palette
                size={20}
              />
            }
            title="Boje dokumenta"
            description="Boje mijenjaju isti profesionalni raspored dokumenta, bez razbijanja forme."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colorFields.map(
                (field) => (
                  <ColorControl
                    key={
                      field.key
                    }
                    label={
                      field.label
                    }
                    value={
                      active[
                        field.key
                      ]
                    }
                    onChange={(
                      value,
                    ) =>
                      updateColor(
                        field.key,
                        value,
                      )
                    }
                  />
                ),
              )}
            </div>
          </Panel>

          <Panel
            icon={
              <SlidersHorizontal
                size={20}
              />
            }
            title="Raspored i stil elemenata"
            description="Postavke utječu na izgled, ali zadržavaju osnovnu profesionalnu strukturu dokumenta."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectControl
                label="Zaglavlje / logo"
                value={
                  active.headerAlignment
                }
                onChange={(
                  value,
                ) =>
                  updateActive({
                    headerAlignment:
                      value as DocumentAppearance['headerAlignment'],
                  })
                }
                options={[
                  [
                    'left',
                    'Lijevo',
                  ],
                  [
                    'center',
                    'Sredina',
                  ],
                  [
                    'right',
                    'Desno',
                  ],
                ]}
              />

              <SelectControl
                label="Gustoća sadržaja"
                value={
                  active.density
                }
                onChange={(
                  value,
                ) =>
                  updateActive({
                    density:
                      value as DocumentAppearance['density'],
                  })
                }
                options={[
                  [
                    'comfortable',
                    'Prostrano',
                  ],
                  [
                    'compact',
                    'Kompaktno',
                  ],
                ]}
              />

              <SelectControl
                label="Podaci kupca"
                value={
                  active.infoStyle
                }
                onChange={(
                  value,
                ) =>
                  updateActive({
                    infoStyle:
                      value as DocumentAppearance['infoStyle'],
                  })
                }
                options={[
                  [
                    'cards',
                    'Kartice',
                  ],
                  [
                    'lines',
                    'Linije',
                  ],
                ]}
              />

              <SelectControl
                label="Tablica stavki"
                value={
                  active.tableStyle
                }
                onChange={(
                  value,
                ) =>
                  updateActive({
                    tableStyle:
                      value as DocumentAppearance['tableStyle'],
                  })
                }
                options={[
                  [
                    'solid',
                    'Puna boja',
                  ],
                  [
                    'soft',
                    'Gradient',
                  ],
                  [
                    'minimal',
                    'Minimalna',
                  ],
                ]}
              />

              <SelectControl
                label="Naslovi sekcija"
                value={
                  active.sectionStyle
                }
                onChange={(
                  value,
                ) =>
                  updateActive({
                    sectionStyle:
                      value as DocumentAppearance['sectionStyle'],
                  })
                }
                options={[
                  [
                    'bar',
                    'Traka',
                  ],
                  [
                    'line',
                    'Linija',
                  ],
                  [
                    'plain',
                    'Samo tekst',
                  ],
                ]}
              />

              <label>
                <span className="text-sm font-black text-slate-300">
                  Naziv
                  dokumenta
                </span>

                <input
                  value={
                    active.documentTitle
                  }
                  onChange={(
                    event,
                  ) =>
                    updateActive({
                      documentTitle:
                        event
                          .target
                          .value,
                    })
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>
          </Panel>

          <Panel
            icon={
              <CheckCircle2
                size={20}
              />
            }
            title="Što se prikazuje"
            description="Logo, pečat i potpis dolaze iz glavnih postavki tvrtke."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Toggle
                label="Logo tvrtke"
                checked={
                  active.showLogo
                }
                onChange={(
                  checked,
                ) =>
                  updateActive({
                    showLogo:
                      checked,
                  })
                }
              />

              <Toggle
                label="Pečat"
                checked={
                  active.showStamp
                }
                onChange={(
                  checked,
                ) =>
                  updateActive({
                    showStamp:
                      checked,
                  })
                }
              />

              <Toggle
                label="Potpis / ovjera"
                checked={
                  active.showSignature
                }
                onChange={(
                  checked,
                ) =>
                  updateActive({
                    showSignature:
                      checked,
                  })
                }
              />

              <Toggle
                label="Podnožje"
                checked={
                  active.showFooter
                }
                onChange={(
                  checked,
                ) =>
                  updateActive({
                    showFooter:
                      checked,
                  })
                }
              />

              <Toggle
                label="Vodeni žig"
                checked={
                  active.showWatermark
                }
                onChange={(
                  checked,
                ) =>
                  updateActive({
                    showWatermark:
                      checked,
                  })
                }
              />

              {canShowImages && (
                <Toggle
                  label="Slike uz stavke"
                  checked={
                    active.showItemImages
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateActive({
                      showItemImages:
                        checked,
                    })
                  }
                />
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                <span className="text-sm font-black text-slate-300">
                  Tekst u
                  podnožju
                </span>

                <input
                  value={
                    active.footerText
                  }
                  onChange={(
                    event,
                  ) =>
                    updateActive({
                      footerText:
                        event
                          .target
                          .value,
                    })
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-violet-500"
                />
              </label>

              <label>
                <span className="text-sm font-black text-slate-300">
                  Tekst vodenog
                  žiga
                </span>

                <input
                  value={
                    active.watermarkText
                  }
                  onChange={(
                    event,
                  ) =>
                    updateActive({
                      watermarkText:
                        event
                          .target
                          .value,
                    })
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>
          </Panel>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={
                resetCurrent
              }
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 font-black text-white"
            >
              <RotateCcw
                size={18}
              />
              Vrati Modern za{' '}
              {title.toLowerCase()}
            </button>

            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                void saveAll()
              }
              className="hidden min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 font-black text-white disabled:opacity-50 sm:inline-flex"
            >
              <Save
                size={18}
              />

              {isSaving
                ? 'Spremanje...'
                : saved
                  ? 'Spremljeno'
                  : 'Spremi izgled dokumenata'}
            </button>
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <DocumentPreview
            kind={activeKind}
            appearance={
              active
            }
            company={
              company
            }
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl sm:hidden">
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            void saveAll()
          }
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white shadow-xl shadow-black/30 disabled:opacity-50"
        >
          <Save
            size={19}
          />

          {isSaving
            ? 'Spremanje...'
            : saved
              ? 'Spremljeno'
              : 'Spremi izgled'}
        </button>
      </div>
    </section>
  )
}

function Panel({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-black text-white sm:text-xl">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  )
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
}) {
  const [
    draft,
    setDraft,
  ] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <label className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(
            event,
          ) => {
            const next =
              event.target.value.toUpperCase()

            setDraft(next)
            onChange(next)
          }}
          className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-slate-700 bg-transparent p-0.5"
          aria-label={
            label
          }
        />

        <input
          value={draft}
          onChange={(
            event,
          ) =>
            setDraft(
              event.target.value.toUpperCase(),
            )
          }
          onBlur={() => {
            if (
              isHexColor(
                draft,
              )
            ) {
              onChange(
                draft,
              )
            } else {
              setDraft(
                value,
              )
            }
          }}
          className="h-12 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono text-sm font-bold text-white outline-none focus:border-violet-500"
        />
      </div>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (
    checked: boolean,
  ) => void
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 px-4">
      <span className="text-sm font-bold text-slate-300">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-5 w-5 accent-violet-600"
      />
    </label>
  )
}

function SelectControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
  options: Array<
    [string, string]
  >
}) {
  return (
    <label>
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>

      <select
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-violet-500"
      >
        {options.map(
          ([
            optionValue,
            labelText,
          ]) => (
            <option
              key={
                optionValue
              }
              value={
                optionValue
              }
            >
              {labelText}
            </option>
          ),
        )}
      </select>
    </label>
  )
}

function DocumentPreview({
  kind,
  appearance,
  company,
}: {
  kind: DocumentKind
  appearance: DocumentAppearance
  company: CompanySettings | null
}) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Pregled izgleda
          </p>

          <p className="mt-1 text-sm font-black text-white">
            {
              documentKindLabels[
                kind
              ]
            }{' '}
            ·{' '}
            {
              presetDescriptions[
                appearance
                  .preset
              ].label
            }
          </p>
        </div>

        <div
          className="h-8 w-8 rounded-full border border-white/10"
          style={{
            backgroundColor:
              appearance.primaryColor,
          }}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 p-3">
        {kind ===
        'offer' ? (
          <OfferPreviewSheet
            appearance={
              appearance
            }
            company={
              company
            }
          />
        ) : kind ===
          'invoice' ? (
          <InvoicePreviewSheet
            appearance={
              appearance
            }
            company={
              company
            }
          />
        ) : (
          <WorkOrderPreviewSheet
            appearance={
              appearance
            }
            company={
              company
            }
          />
        )}
      </div>
    </section>
  )
}

function PreviewPaper({
  appearance,
  children,
}: {
  appearance: DocumentAppearance
  children: ReactNode
}) {
  return (
    <div
      className="relative mx-auto aspect-[210/297] w-full max-w-[450px] overflow-hidden rounded-xl shadow-2xl"
      style={{
        backgroundColor:
          appearance.backgroundColor,
        color:
          appearance.textColor,
      }}
    >
      {appearance.showWatermark &&
        appearance.watermarkText && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-[38px] font-black opacity-[0.035]"
            style={{
              color:
                appearance.primaryColor,
            }}
          >
            {
              appearance.watermarkText
            }
          </div>
        )}

      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  )
}

function PreviewCompany({
  appearance,
  company,
  compact = false,
}: {
  appearance: DocumentAppearance
  company: CompanySettings | null
  compact?: boolean
}) {
  const address = [
    company?.address,
    [
      company?.postalCode,
      company?.city,
    ]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={`flex min-w-0 items-start ${
        compact
          ? 'gap-2'
          : 'gap-2.5'
      }`}
    >
      {appearance.showLogo && (
        <div
          className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white ${
            compact
              ? 'h-9 w-11'
              : 'h-12 w-14'
          }`}
        >
          {company?.logoUrl ? (
            <img
              src={
                company.logoUrl
              }
              alt="Logo"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="text-[6px] font-black text-slate-400">
              LOGO
            </span>
          )}
        </div>
      )}

      <div className="min-w-0">
        <p
          className={`truncate font-black ${
            compact
              ? 'text-[8px]'
              : 'text-[11px]'
          }`}
        >
          {company?.name ||
            'Vaša tvrtka'}
        </p>

        {address && (
          <p className="mt-0.5 truncate text-[5.2px] opacity-55">
            {address}
          </p>
        )}

        {company?.oib && (
          <p className="mt-0.5 truncate text-[5.2px] opacity-55">
            OIB:{' '}
            {
              company.oib
            }
          </p>
        )}

        {(company?.phone ||
          company?.email) && (
          <p className="mt-0.5 truncate text-[5.2px] opacity-55">
            {[
              company?.phone,
              company?.email,
            ]
              .filter(Boolean)
              .join(
                ' • ',
              )}
          </p>
        )}
      </div>
    </div>
  )
}

const previewItems = [
  [
    'Klima TERMA Gelida 3.5kw',
    'Ugradnja i puštanje u rad',
    '1',
    'kom',
    '215,00 €',
    '0%',
    '25%',
    '268,75 €',
  ],
  [
    'Nosači za klimu',
    'Set vanjske i zidne konzole',
    '1',
    'kom',
    '12,50 €',
    '0%',
    '25%',
    '15,63 €',
  ],
  [
    'Tiple i vijci 8mm',
    'Set tipli i vijaka',
    '1',
    'kom',
    '12,50 €',
    '0%',
    '25%',
    '15,63 €',
  ],
  [
    'Cijev za klimu 1/4"',
    'Bakrena izolirana',
    '1',
    'm',
    '17,50 €',
    '0%',
    '25%',
    '21,88 €',
  ],
  [
    'Cijev za klimu 3/8"',
    'Bakrena izolirana',
    '1',
    'm',
    '60,00 €',
    '0%',
    '25%',
    '75,00 €',
  ],
  [
    'Kabal za struju 3x1.5',
    'PP fleksibilni',
    '1',
    'm',
    '6,20 €',
    '0%',
    '25%',
    '7,75 €',
  ],
  [
    'Kabel za struju 5x1.5',
    'PP fleksibilni',
    '1',
    'm',
    '7,50 €',
    '0%',
    '25%',
    '9,38 €',
  ],
  [
    'Rad i ruke',
    'Montaža i spajanje',
    '1',
    'usl',
    '250,00 €',
    '0%',
    '25%',
    '312,50 €',
  ],
]

function OfferPreviewSheet({
  appearance,
  company,
}: {
  appearance: DocumentAppearance
  company: CompanySettings | null
}) {
  const primary =
    appearance.primaryColor

  const accent =
    appearance.accentColor

  const border =
    appearance.borderColor

  return (
    <PreviewPaper
      appearance={
        appearance
      }
    >
      <div className="flex h-full flex-col p-[18px]">
        <div
          className="grid grid-cols-[1fr_1.05fr] gap-3 border-b pb-3"
          style={{
            borderColor:
              primary,
          }}
        >
          <PreviewCompany
            appearance={
              appearance
            }
            company={
              company
            }
          />

          <div
            className="border-l pl-3"
            style={{
              borderColor:
                `${primary}55`,
            }}
          >
            <div className="text-[19px] font-black leading-none tracking-[-0.04em]">
              {appearance.documentTitle ||
                'PONUDA'}
            </div>

            <div
              className="mt-1.5 text-[5.5px] font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  primary,
              }}
            >
              Komercijalna
              ponuda
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {[
                [
                  'Ponuda br.',
                  'P-2026-007',
                ],
                [
                  'Datum',
                  '15.08.2026.',
                ],
                [
                  'Vrijedi do',
                  '14.09.2026.',
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    key={
                      label
                    }
                    className="rounded-md border p-1.5"
                    style={{
                      borderColor:
                        border,
                    }}
                  >
                    <p
                      className="text-[4.3px] font-black uppercase"
                      style={{
                        color:
                          primary,
                      }}
                    >
                      {
                        label
                      }
                    </p>

                    <p className="mt-1 truncate text-[6px] font-black">
                      {
                        value
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div
            className="rounded-md border p-2.5"
            style={{
              borderColor:
                border,
              backgroundColor:
                appearance.infoStyle ===
                'cards'
                  ? `${primary}06`
                  : 'transparent',
            }}
          >
            <p
              className="text-[5px] font-black uppercase"
              style={{
                color:
                  primary,
              }}
            >
              Podaci o
              klijentu
            </p>

            <p className="mt-1.5 text-[7px] font-black">
              Primjer kupca
              d.o.o.
            </p>

            <p className="mt-1 text-[5px] leading-[1.45] opacity-60">
              Primjer ulica 1,
              35000 Slavonski
              Brod
              <br />
              OIB:
              12345678901
              <br />
              kupac@primjer.hr
            </p>
          </div>

          <div
            className="rounded-md border p-2.5"
            style={{
              borderColor:
                border,
              backgroundColor:
                appearance.infoStyle ===
                'cards'
                  ? `${primary}06`
                  : 'transparent',
            }}
          >
            <p
              className="text-[5px] font-black uppercase"
              style={{
                color:
                  primary,
              }}
            >
              Podaci o
              ponudi
            </p>

            {[
              [
                'Izradio/la',
                'Borna Ferfolja',
              ],
              [
                'Mjesto isporuke',
                'Slavonski Brod',
              ],
              [
                'Razdoblje',
                'Prema dogovoru',
              ],
              [
                'Valuta',
                'EUR',
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={
                    label
                  }
                  className="mt-1 grid grid-cols-[45%_55%] gap-1 border-b pb-1 text-[4.8px]"
                  style={{
                    borderColor:
                      `${border}88`,
                  }}
                >
                  <span className="opacity-55">
                    {
                      label
                    }
                  </span>

                  <strong className="truncate text-right">
                    {
                      value
                    }
                  </strong>
                </div>
              ),
            )}
          </div>
        </div>

        <div
          className="mt-3 overflow-hidden rounded-md border"
          style={{
            borderColor:
              border,
          }}
        >
          <div
            className="grid grid-cols-[25px_1fr_32px_30px_52px_37px_30px_57px] items-center px-1.5 py-1.5 text-[4.2px] font-black uppercase text-white"
            style={{
              background:
                appearance.tableStyle ===
                'soft'
                  ? `linear-gradient(90deg, ${primary}, ${accent})`
                  : appearance.tableStyle ===
                      'minimal'
                    ? appearance.secondaryColor
                    : primary,
            }}
          >
            <span>Rbr.</span>
            <span>
              Opis stavke
            </span>
            <span className="text-center">
              Kol.
            </span>
            <span className="text-center">
              Jed.
            </span>
            <span className="text-right">
              Jed. cijena
            </span>
            <span className="text-center">
              Popust
            </span>
            <span className="text-center">
              PDV
            </span>
            <span className="text-right">
              Ukupno
            </span>
          </div>

          {previewItems.map(
            (
              item,
              index,
            ) => (
              <div
                key={
                  item[0]
                }
                className="grid min-h-[31px] grid-cols-[25px_1fr_32px_30px_52px_37px_30px_57px] items-center border-t px-1.5 py-1 text-[4.7px]"
                style={{
                  borderColor:
                    `${border}AA`,
                  backgroundColor:
                    appearance.tableStyle ===
                      'soft' &&
                    index %
                      2 ===
                      1
                      ? `${primary}05`
                      : '#FFFFFF',
                }}
              >
                <strong
                  style={{
                    color:
                      primary,
                  }}
                >
                  {String(
                    index +
                      1,
                  ).padStart(
                    2,
                    '0',
                  )}
                </strong>

                <div className="min-w-0 pr-1">
                  <p className="truncate text-[5px] font-black">
                    {
                      item[0]
                    }
                  </p>

                  <p className="truncate text-[4px] opacity-50">
                    {
                      item[1]
                    }
                  </p>
                </div>

                {item
                  .slice(
                    2,
                  )
                  .map(
                    (
                      value,
                      cellIndex,
                    ) => (
                      <span
                        key={`${value}-${cellIndex}`}
                        className={`truncate ${
                          cellIndex >=
                          2
                            ? 'text-right'
                            : 'text-center'
                        } ${
                          cellIndex ===
                          5
                            ? 'font-black'
                            : ''
                        }`}
                      >
                        {
                          value
                        }
                      </span>
                    ),
                  )}
              </div>
            ),
          )}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_44%] gap-3">
          <div>
            <div
              className="rounded-md border p-2"
              style={{
                borderColor:
                  border,
                backgroundColor:
                  `${primary}05`,
              }}
            >
              <p
                className="text-[5px] font-black uppercase"
                style={{
                  color:
                    primary,
                }}
              >
                Napomene i
                uvjeti
              </p>

              <p className="mt-1.5 text-[4.6px] leading-[1.45] opacity-65">
                Ponuda vrijedi
                30 dana.
                <br />
                Plaćanje prema
                dogovoru.
                <br />
                Cijene su
                izražene u EUR.
              </p>
            </div>

            {(appearance.showSignature ||
              appearance.showStamp) && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <PreviewSignature
                  title="Ponudu izradio"
                  name="Borna Ferfolja"
                  appearance={
                    appearance
                  }
                  image={
                    company?.signatureUrl
                  }
                />

                <PreviewSignature
                  title="Prihvat ponude / klijent"
                  name="Primjer kupca"
                  appearance={
                    appearance
                  }
                />
              </div>
            )}
          </div>

          <div>
            {[
              [
                'Ukupno prije popusta',
                '581,20 €',
              ],
              [
                'Popust',
                '0,00 €',
              ],
              [
                'Osnovica',
                '581,20 €',
              ],
              [
                'PDV',
                '145,30 €',
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={
                    label
                  }
                  className="flex justify-between gap-2 border-b px-1.5 py-1 text-[5px]"
                  style={{
                    borderColor:
                      `${border}AA`,
                  }}
                >
                  <span className="opacity-65">
                    {
                      label
                    }
                  </span>

                  <strong>
                    {
                      value
                    }
                  </strong>
                </div>
              ),
            )}

            <div
              className="mt-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-2 text-white"
              style={{
                background:
                  appearance.preset ===
                  'minimal'
                    ? appearance.secondaryColor
                    : `linear-gradient(90deg, ${primary}, ${accent})`,
              }}
            >
              <strong className="text-[5.7px]">
                UKUPNO ZA
                PLATITI
              </strong>

              <strong className="text-[9px]">
                726,50 €
              </strong>
            </div>

            {(company?.iban ||
              company?.bankName) && (
              <div
                className="mt-2 rounded-md border p-2"
                style={{
                  borderColor:
                    `${primary}66`,
                }}
              >
                <p
                  className="text-[4.8px] font-black uppercase"
                  style={{
                    color:
                      primary,
                  }}
                >
                  Podaci za
                  plaćanje
                </p>

                {company?.iban && (
                  <p className="mt-1 text-[4.4px]">
                    <span className="opacity-55">
                      IBAN:{' '}
                    </span>
                    <strong>
                      {
                        company.iban
                      }
                    </strong>
                  </p>
                )}

                {company?.bankName && (
                  <p className="mt-1 text-[4.4px]">
                    <span className="opacity-55">
                      Banka:{' '}
                    </span>
                    <strong>
                      {
                        company.bankName
                      }
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {appearance.showFooter && (
          <div
            className="mt-auto flex items-end justify-between gap-2 border-t pt-1.5 text-[4px] opacity-55"
            style={{
              borderColor:
                `${primary}55`,
            }}
          >
            <span className="truncate">
              {appearance.footerText ||
                company?.name ||
                'Hvala na povjerenju.'}
            </span>

            <strong>
              1 / 1
            </strong>
          </div>
        )}
      </div>
    </PreviewPaper>
  )
}

function PreviewSignature({
  title,
  name,
  appearance,
  image,
}: {
  title: string
  name: string
  appearance: DocumentAppearance
  image?: string
}) {
  return (
    <div
      className="min-h-[54px] rounded-md border p-1.5"
      style={{
        borderColor:
          `${appearance.primaryColor}66`,
      }}
    >
      <p
        className="text-[4px]"
        style={{
          color:
            appearance.primaryColor,
        }}
      >
        {title}
      </p>

      <div className="grid h-8 place-items-center">
        {image ? (
          <img
            src={image}
            alt="Potpis"
            className="max-h-7 max-w-[80px] object-contain"
          />
        ) : null}
      </div>

      <strong className="text-[4.3px]">
        {name}
      </strong>
    </div>
  )
}

function WorkOrderPreviewSheet({
  appearance,
  company,
}: {
  appearance: DocumentAppearance
  company: CompanySettings | null
}) {
  return (
    <PreviewPaper
      appearance={
        appearance
      }
    >
      <div
        className="h-1.5"
        style={{
          backgroundColor:
            appearance.primaryColor,
        }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <PreviewCompany
            appearance={
              appearance
            }
            company={
              company
            }
            compact
          />

          <div className="text-right">
            <p className="text-[5px] font-black uppercase tracking-widest opacity-45">
              Servisni
              dokument
            </p>

            <p className="mt-1 text-[14px] font-black">
              RADNI NALOG
            </p>
          </div>
        </div>

        <div
          className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border"
          style={{
            borderColor:
              appearance.borderColor,
          }}
        >
          {[
            [
              'Broj',
              'RN-2026-001',
            ],
            [
              'Datum',
              '14.08.2026.',
            ],
            [
              'Vrijeme',
              '08:00–10:30',
            ],
            [
              'Trajanje',
              '2 h 30 min',
            ],
            [
              'Status',
              'Završen',
            ],
            [
              'Str.',
              '1',
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <div
                key={
                  label
                }
                className="border-b border-r px-1.5 py-1.5"
                style={{
                  borderColor:
                    appearance.borderColor,
                }}
              >
                <p className="text-[4px] font-black uppercase opacity-35">
                  {label}
                </p>

                <p className="mt-0.5 truncate text-[5px] font-black">
                  {value}
                </p>
              </div>
            ),
          )}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_34%] gap-2">
          <div
            className="rounded-md border p-2"
            style={{
              borderColor:
                appearance.borderColor,
            }}
          >
            <p className="text-[4px] font-black uppercase opacity-40">
              Investitor
            </p>

            <p className="mt-1 text-[7px] font-black">
              Primjer kupca
              d.o.o.
            </p>
          </div>

          <div
            className="rounded-md border p-2"
            style={{
              borderColor:
                appearance.borderColor,
              backgroundColor:
                `${appearance.primaryColor}0D`,
            }}
          >
            <p className="text-[4px] font-black uppercase opacity-40">
              Izvršitelji
            </p>

            <p className="mt-1 text-[5px] font-black">
              Borna · Dinko
            </p>
          </div>
        </div>

        <PreviewSectionTitle
          appearance={
            appearance
          }
          label="Opis radova"
        />

        <div
          className="rounded-md border p-2"
          style={{
            borderColor:
              appearance.borderColor,
          }}
        >
          <div className="h-1.5 w-full rounded-full bg-slate-300" />
          <div className="mt-1 h-1.5 w-[84%] rounded-full bg-slate-300" />
        </div>

        <PreviewSectionTitle
          appearance={
            appearance
          }
          label="Utrošeni materijal"
        />

        <SimplePreviewTable
          appearance={
            appearance
          }
          rows={5}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <PreviewSignature
            title="Izvođač / pečat"
            name={
              company?.name ||
              'Tvrtka'
            }
            appearance={
              appearance
            }
          />

          <PreviewSignature
            title="Potpis investitora"
            name="Investitor"
            appearance={
              appearance
            }
          />
        </div>
      </div>
    </PreviewPaper>
  )
}

function InvoicePreviewSheet({
  appearance,
  company,
}: {
  appearance: DocumentAppearance
  company: CompanySettings | null
}) {
  return (
    <PreviewPaper
      appearance={
        appearance
      }
    >
      <div className="h-full p-5">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <PreviewCompany
            appearance={
              appearance
            }
            company={
              company
            }
          />

          <div className="text-right">
            <p className="text-[18px] font-black">
              RAČUN
            </p>

            <p
              className="mt-1 text-[7px] font-black"
              style={{
                color:
                  appearance.primaryColor,
              }}
            >
              R-2026-001
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[5px] font-black uppercase opacity-45">
              Kupac
            </p>

            <p className="mt-1 text-[8px] font-black">
              Primjer kupca
              d.o.o.
            </p>
          </div>

          <div className="text-right text-[5px]">
            <p>
              Datum:
              15.08.2026.
            </p>
            <p className="mt-1">
              Dospijeće:
              30.08.2026.
            </p>
          </div>
        </div>

        <PreviewSectionTitle
          appearance={
            appearance
          }
          label="Stavke računa"
        />

        <SimplePreviewTable
          appearance={
            appearance
          }
          rows={6}
        />

        <div
          className="mt-4 ml-auto w-[58%] rounded-md px-3 py-2 text-right text-white"
          style={{
            backgroundColor:
              appearance.primaryColor,
          }}
        >
          <p className="text-[5px] font-black uppercase opacity-70">
            Ukupno za
            platiti
          </p>

          <p className="mt-1 text-[14px] font-black">
            1.562,50 €
          </p>
        </div>
      </div>
    </PreviewPaper>
  )
}

function PreviewSectionTitle({
  appearance,
  label,
}: {
  appearance: DocumentAppearance
  label: string
}) {
  const mode =
    appearance.sectionStyle

  return (
    <div
      className={`mt-3 text-[5px] font-black uppercase ${
        mode === 'bar'
          ? 'rounded-md px-2 py-1.5 text-white'
          : mode === 'line'
            ? 'border-b pb-1'
            : ''
      }`}
      style={{
        backgroundColor:
          mode === 'bar'
            ? appearance.primaryColor
            : 'transparent',
        borderColor:
          appearance.primaryColor,
        color:
          mode === 'bar'
            ? '#FFFFFF'
            : appearance.primaryColor,
      }}
    >
      {label}
    </div>
  )
}

function SimplePreviewTable({
  appearance,
  rows,
}: {
  appearance: DocumentAppearance
  rows: number
}) {
  return (
    <div
      className="mt-1 overflow-hidden rounded-md border"
      style={{
        borderColor:
          appearance.borderColor,
      }}
    >
      <div
        className="grid grid-cols-4 gap-1 px-2 py-2 text-[4px] font-black uppercase text-white"
        style={{
          backgroundColor:
            appearance.primaryColor,
        }}
      >
        <span>Opis</span>
        <span>Kol.</span>
        <span>Cijena</span>
        <span>
          Ukupno
        </span>
      </div>

      {Array.from({
        length: rows,
      }).map(
        (_, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-1 border-t px-2 py-2"
            style={{
              borderColor:
                appearance.borderColor,
            }}
          >
            <div className="h-1.5 rounded-full bg-slate-300" />
            <div className="h-1.5 rounded-full bg-slate-200" />
            <div className="h-1.5 rounded-full bg-slate-300" />
            <div className="h-1.5 rounded-full bg-slate-300" />
          </div>
        ),
      )}
    </div>
  )
}