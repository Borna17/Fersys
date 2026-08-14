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
  const navigate = useNavigate()

  const [activeKind, setActiveKind] =
    useState<DocumentKind>(
      'workOrder',
    )

  const [appearance, setAppearance] =
    useState<DocumentAppearanceSettings | null>(
      null,
    )

  const [company, setCompany] =
    useState<CompanySettings | null>(
      null,
    )

  const [legacyWorkOrder, setLegacyWorkOrder] =
    useState<
      Awaited<
        ReturnType<
          typeof getWorkOrderBrandingFromCompanySettings
        >
      > | null
    >(null)

  const [isLoading, setIsLoading] =
    useState(true)
  const [isSaving, setIsSaving] =
    useState(false)
  const [saved, setSaved] =
    useState(false)
  const [error, setError] =
    useState('')

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
        ] = await Promise.all([
          getDocumentAppearanceSettings(),
          getCompanySettings(),
          getWorkOrderBrandingFromCompanySettings(),
        ])

        if (cancelled) return

        const next = {
          ...appearanceResult.settings,
        }

        if (
          !appearanceResult.hasStoredSettings
        ) {
          next.workOrder =
            mapLegacyWorkOrderAppearance(
              currentWorkOrder,
            )

          next.offer = {
            ...next.offer,
            primaryColor:
              currentCompany.primaryColor ||
              next.offer.primaryColor,
            secondaryColor:
              currentCompany.secondaryColor ||
              next.offer.secondaryColor,
            footerText:
              currentCompany.documentFooter ||
              next.offer.footerText,
          }

          next.invoice = {
            ...next.invoice,
            primaryColor:
              currentCompany.primaryColor ||
              next.invoice.primaryColor,
            secondaryColor:
              currentCompany.secondaryColor ||
              next.invoice.secondaryColor,
            footerText:
              currentCompany.documentFooter ||
              next.invoice.footerText,
          }
        }

        setAppearance(next)
        setCompany(currentCompany)
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
    documentKindLabels[activeKind]

  const canShowImages =
    activeKind === 'offer'

  const activePreset =
    active?.preset ?? 'modern'

  const colorSummary = useMemo(
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
      | (
          (
            current: DocumentAppearance,
          ) => DocumentAppearance
        ),
  ) {
    setSaved(false)

    setAppearance((current: { [x: string]: any }) => {
      if (!current) return current

      const currentAppearance =
        current[activeKind]

      const nextAppearance =
        typeof updater === 'function'
          ? updater(currentAppearance)
          : {
              ...currentAppearance,
              ...updater,
            }

      return {
        ...current,
        [activeKind]:
          nextAppearance,
      }
    })
  }

  function selectPreset(
    preset: DocumentPreset,
  ) {
    if (!active) return

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
    if (!isHexColor(value)) return

    updateActive({
      [key]: value.toUpperCase(),
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
        layout: workOrder.preset,
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
          workOrder.infoStyle === 'cards'
            ? 'cards' as const
            : 'compact' as const,
        customMaterialStyle:
          workOrder.tableStyle === 'minimal'
            ? 'list' as const
            : 'table' as const,
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

  if (!appearance || !active) {
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
        <ArrowLeft size={18} />
        Postavke
      </button>

      <section className="relative overflow-hidden rounded-[1.9rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              FERSYS DOCUMENT STUDIO
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Izgled dokumenata
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Svaki dokument ima vlastiti stil. Odaberi profesionalni predložak ili ga prilagodi svojoj tvrtki.
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
          {kinds.map((kind) => {
            const Icon = kind.icon
            const selected =
              activeKind === kind.id

            return (
              <button
                key={kind.id}
                type="button"
                onClick={() =>
                  setActiveKind(kind.id)
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
                  {documentKindLabels[
                    kind.id
                  ]}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-6">
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
              {presets.map((preset) => {
                const item =
                  presetDescriptions[
                    preset
                  ]
                const selected =
                  activePreset === preset

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      selectPreset(preset)
                    }
                    className={`relative min-h-[132px] rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                      selected
                        ? 'border-violet-400/60 bg-violet-500/12'
                        : 'border-slate-700 bg-slate-950/45'
                    }`}
                  >
                    {item.badge && (
                      <span className="absolute right-3 top-3 rounded-full bg-blue-500/15 px-2 py-1 text-[9px] font-black uppercase text-blue-300">
                        {item.badge}
                      </span>
                    )}

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-violet-300">
                      {selected ? (
                        <Check
                          size={18}
                        />
                      ) : (
                        <Palette
                          size={18}
                        />
                      )}
                    </div>

                    <p className="mt-3 font-black text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel
            icon={
              <Palette
                size={20}
              />
            }
            title="Boje dokumenta"
            description="Klikni na kvadrat boje i otvara se najjednostavniji sistemski birač boje. HEX vrijednost možeš i ručno upisati."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colorFields.map(
                (field) => (
                  <ColorControl
                    key={field.key}
                    label={field.label}
                    value={
                      active[
                        field.key
                      ]
                    }
                    onChange={(value) =>
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
            description="Ove opcije mijenjaju strukturu dokumenta bez kompliciranog drag & drop uređivanja."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectControl
                label="Zaglavlje / logo"
                value={
                  active.headerAlignment
                }
                onChange={(value) =>
                  updateActive({
                    headerAlignment:
                      value as DocumentAppearance['headerAlignment'],
                  })
                }
                options={[
                  ['left', 'Lijevo'],
                  ['center', 'Sredina'],
                  ['right', 'Desno'],
                ]}
              />

              <SelectControl
                label="Gustoća sadržaja"
                value={active.density}
                onChange={(value) =>
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
                value={active.infoStyle}
                onChange={(value) =>
                  updateActive({
                    infoStyle:
                      value as DocumentAppearance['infoStyle'],
                  })
                }
                options={[
                  ['cards', 'Kartice'],
                  ['lines', 'Linije'],
                ]}
              />

              <SelectControl
                label="Tablica stavki"
                value={active.tableStyle}
                onChange={(value) =>
                  updateActive({
                    tableStyle:
                      value as DocumentAppearance['tableStyle'],
                  })
                }
                options={[
                  ['solid', 'Puna boja'],
                  ['soft', 'Nježna boja'],
                  ['minimal', 'Minimalna'],
                ]}
              />

              <SelectControl
                label="Naslovi sekcija"
                value={active.sectionStyle}
                onChange={(value) =>
                  updateActive({
                    sectionStyle:
                      value as DocumentAppearance['sectionStyle'],
                  })
                }
                options={[
                  ['bar', 'Traka'],
                  ['line', 'Linija'],
                  ['plain', 'Samo tekst'],
                ]}
              />

              <label>
                <span className="text-sm font-black text-slate-300">
                  Naziv dokumenta
                </span>
                <input
                  value={
                    active.documentTitle
                  }
                  onChange={(event) =>
                    updateActive({
                      documentTitle:
                        event.target.value,
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
            description="Logo, pečat i potpis koriste podatke tvrtke iz glavnih Postavki, ali ih za svaki dokument možeš posebno uključiti ili isključiti."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Toggle
                label="Logo tvrtke"
                checked={active.showLogo}
                onChange={(checked) =>
                  updateActive({
                    showLogo: checked,
                  })
                }
              />
              <Toggle
                label="Pečat"
                checked={active.showStamp}
                onChange={(checked) =>
                  updateActive({
                    showStamp: checked,
                  })
                }
              />
              <Toggle
                label="Potpis / ovjera"
                checked={
                  active.showSignature
                }
                onChange={(checked) =>
                  updateActive({
                    showSignature:
                      checked,
                  })
                }
              />
              <Toggle
                label="Podnožje"
                checked={active.showFooter}
                onChange={(checked) =>
                  updateActive({
                    showFooter: checked,
                  })
                }
              />
              <Toggle
                label="Vodeni žig"
                checked={
                  active.showWatermark
                }
                onChange={(checked) =>
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
                  onChange={(checked) =>
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
                  Tekst u podnožju
                </span>
                <input
                  value={active.footerText}
                  onChange={(event) =>
                    updateActive({
                      footerText:
                        event.target.value,
                    })
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none focus:border-violet-500"
                />
              </label>

              <label>
                <span className="text-sm font-black text-slate-300">
                  Tekst vodenog žiga
                </span>
                <input
                  value={
                    active.watermarkText
                  }
                  onChange={(event) =>
                    updateActive({
                      watermarkText:
                        event.target.value,
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
              onClick={resetCurrent}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 font-black text-white"
            >
              <RotateCcw size={18} />
              Vrati Modern za {title.toLowerCase()}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void saveAll()
              }
              className="hidden min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 font-black text-white disabled:opacity-50 sm:inline-flex"
            >
              <Save size={18} />
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
            appearance={active}
            company={company}
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
          <Save size={19} />
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
  onChange: (value: string) => void
}) {
  const [draft, setDraft] =
    useState(value)

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
          onChange={(event) => {
            const next =
              event.target.value.toUpperCase()
            setDraft(next)
            onChange(next)
          }}
          className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-slate-700 bg-transparent p-0.5"
          aria-label={label}
        />

        <input
          value={draft}
          onChange={(event) =>
            setDraft(
              event.target.value.toUpperCase(),
            )
          }
          onBlur={() => {
            if (isHexColor(draft)) {
              onChange(draft)
            } else {
              setDraft(value)
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
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 px-4">
      <span className="text-sm font-bold text-slate-300">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
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
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label>
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-violet-500"
      >
        {options.map(
          ([optionValue, labelText]) => (
            <option
              key={optionValue}
              value={optionValue}
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
  const classic =
    appearance.preset === 'classic'
  const minimal =
    appearance.preset === 'minimal'

  const alignClass =
    appearance.headerAlignment === 'center'
      ? 'items-center text-center'
      : appearance.headerAlignment === 'right'
        ? 'items-end text-right'
        : 'items-start text-left'

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Pregled izgleda
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {documentKindLabels[kind]} · {presetDescriptions[appearance.preset].label}
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
        <div
          className="mx-auto aspect-[210/297] w-full max-w-[390px] overflow-hidden rounded-xl shadow-2xl"
          style={{
            backgroundColor:
              appearance.backgroundColor,
            color:
              appearance.textColor,
          }}
        >
          {!minimal && (
            <div
              className={
                classic
                  ? 'h-1'
                  : 'h-2'
              }
              style={{
                backgroundColor:
                  appearance.primaryColor,
              }}
            />
          )}

          <div
            className={`flex h-full flex-col ${
              appearance.density === 'compact'
                ? 'p-4'
                : 'p-5'
            }`}
          >
            <div
              className={`flex flex-col ${alignClass}`}
            >
              <div className="flex items-center gap-2">
                {appearance.showLogo && (
                  <div className="grid h-10 w-12 place-items-center rounded-lg bg-slate-100 text-[8px] font-black text-slate-500">
                    {company?.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      'LOGO'
                    )}
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-black">
                    {company?.name ||
                      'Vaša tvrtka'}
                  </p>
                  <p className="text-[6px] opacity-55">
                    {company?.address ||
                      'Adresa tvrtke'}
                  </p>
                </div>
              </div>

              <h3
                className={`${
                  classic
                    ? 'font-serif'
                    : ''
                } mt-4 text-lg font-black tracking-tight`}
              >
                {appearance.documentTitle}
              </h3>
              <p
                className="mt-1 text-[7px] font-black uppercase tracking-widest"
                style={{
                  color:
                    appearance.primaryColor,
                }}
              >
                {kind === 'workOrder'
                  ? 'RN-2026-001'
                  : kind === 'offer'
                    ? 'P-2026-001'
                    : 'R-2026-001'}
              </p>
            </div>

            <PreviewSectionTitle
              appearance={appearance}
              label={
                kind === 'workOrder'
                  ? 'Podaci o kupcu i nalogu'
                  : kind === 'offer'
                    ? 'Podaci o naručitelju'
                    : 'Podaci o računu'
              }
            />

            <div
              className={`grid grid-cols-2 gap-2 ${
                appearance.infoStyle === 'cards'
                  ? ''
                  : 'border-y py-2'
              }`}
              style={{
                borderColor:
                  appearance.borderColor,
              }}
            >
              {[
                'Kupac',
                'Datum',
                'Adresa',
                'OIB',
              ].map((item) => (
                <div
                  key={item}
                  className={
                    appearance.infoStyle === 'cards'
                      ? 'rounded-md border p-2'
                      : 'py-1'
                  }
                  style={{
                    borderColor:
                      appearance.borderColor,
                  }}
                >
                  <p className="text-[5px] font-black uppercase opacity-45">
                    {item}
                  </p>
                  <div
                    className="mt-1 h-1.5 rounded-full opacity-25"
                    style={{
                      backgroundColor:
                        appearance.secondaryColor,
                    }}
                  />
                </div>
              ))}
            </div>

            <PreviewSectionTitle
              appearance={appearance}
              label={
                kind === 'workOrder'
                  ? 'Opis radova'
                  : kind === 'offer'
                    ? 'Stavke ponude'
                    : 'Stavke računa'
              }
            />

            <div
              className="overflow-hidden rounded-md border"
              style={{
                borderColor:
                  appearance.borderColor,
              }}
            >
              <div
                className="grid grid-cols-4 gap-1 px-2 py-2 text-[5px] font-black uppercase"
                style={{
                  backgroundColor:
                    appearance.tableStyle === 'minimal'
                      ? appearance.backgroundColor
                      : appearance.tableStyle === 'soft'
                        ? `${appearance.primaryColor}18`
                        : appearance.primaryColor,
                  color:
                    appearance.tableStyle === 'solid'
                      ? '#FFFFFF'
                      : appearance.textColor,
                }}
              >
                <span>Opis</span>
                <span>Kol.</span>
                <span>Cijena</span>
                <span>Ukupno</span>
              </div>

              {[0, 1, 2].map(
                (row) => (
                  <div
                    key={row}
                    className="grid grid-cols-4 gap-1 border-t px-2 py-2"
                    style={{
                      borderColor:
                        appearance.borderColor,
                    }}
                  >
                    {[0, 1, 2, 3].map(
                      (cell) => (
                        <span
                          key={cell}
                          className="h-1.5 rounded-full opacity-20"
                          style={{
                            backgroundColor:
                              appearance.textColor,
                          }}
                        />
                      ),
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div
                className="h-14 rounded-lg border"
                style={{
                  borderColor:
                    appearance.borderColor,
                }}
              />
              <div
                className="h-14 rounded-lg border"
                style={{
                  borderColor:
                    appearance.borderColor,
                }}
              />
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 border-t pt-2 text-[5px] opacity-45"
              style={{
                borderColor:
                  appearance.borderColor,
              }}
            >
              <span>
                {appearance.showFooter
                  ? appearance.footerText
                  : ''}
              </span>
              <span>1 / 1</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewSectionTitle({
  appearance,
  label,
}: {
  appearance: DocumentAppearance
  label: string
}) {
  if (
    appearance.sectionStyle === 'bar'
  ) {
    return (
      <div
        className="my-3 rounded-md px-2 py-1.5 text-[6px] font-black uppercase text-white"
        style={{
          backgroundColor:
            appearance.primaryColor,
        }}
      >
        {label}
      </div>
    )
  }

  if (
    appearance.sectionStyle === 'line'
  ) {
    return (
      <div
        className="my-3 border-b pb-1 text-[6px] font-black uppercase"
        style={{
          borderColor:
            appearance.primaryColor,
          color:
            appearance.primaryColor,
        }}
      >
        {label}
      </div>
    )
  }

  return (
    <div className="my-3 text-[6px] font-black uppercase">
      {label}
    </div>
  )
}
