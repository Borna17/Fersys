import {
  Check,
  Download,
  FileText,
  Minus,
  Plus,
  ReceiptText,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  CompanySettings,
} from '../../services/companySettings.service'

import {
  getWorkOrderBrandingFromCompanySettings,
  mapCompanySettingsToWorkOrderBranding,
  saveWorkOrderBranding,
  saveWorkOrderLayout,
} from '../../services/workOrderBranding.service'

import type {
  PdfLayout,
  WorkOrder,
  WorkOrderBranding,
} from '../../types/workOrder'

import {
  buildWorkOrderPdfHtml,
  getWorkOrderPdfBlobUrl,
} from '../../utils/workOrderPdf'

import {
  buildOfferPdfHtml,
  type OfferPdfData,
  type OfferPdfSettings,
} from '../../utils/offerPdf'

import {
  buildInvoicePdfHtml,
  type InvoicePdfData,
  type InvoicePdfSettings,
} from '../../utils/invoicePdf'

type PreviewType =
  | 'work-order'
  | 'offer'
  | 'invoice'

const tabs = [
  {
    id: 'work-order' as const,
    label: 'Radni nalog',
    icon: Wrench,
  },
  {
    id: 'offer' as const,
    label: 'Ponuda',
    icon: FileText,
  },
  {
    id: 'invoice' as const,
    label: 'Račun',
    icon: ReceiptText,
  },
]

const layoutOptions: Array<{
  id: Exclude<PdfLayout, 'minimal'>
  title: string
  description: string
  icon: typeof Wrench
  previewClassName: string
}> = [
  {
    id: 'classic',
    title: 'Classic',
    description:
      'Klasičan servisni dokument s tamnim punim zaglavljem i ravnijim elementima.',
    icon: FileText,
    previewClassName:
      'from-slate-800 to-slate-950',
  },
  {
    id: 'modern',
    title: 'Modern',
    description:
      'Suvremeni FERSYS izgled s karticama, sjenama i naglašenom bojom tvrtke.',
    icon: Sparkles,
    previewClassName:
      'from-blue-600 to-violet-600',
  },
  {
    id: 'custom',
    title: 'Custom',
    description:
      'Vlastiti izgled s bojama, nazivima sekcija, logom, pečatom i poravnanjem.',
    icon: SlidersHorizontal,
    previewClassName:
      'from-violet-600 to-fuchsia-600',
  },
]

function isoDate(date: Date) {
  return date
    .toISOString()
    .slice(0, 10)
}

function makeDemoWorkOrder(
  settings: CompanySettings,
): WorkOrder {
  return {
    id: 'preview',
    companyId:
      settings.id,
    orderNumber:
      `${settings.workOrderPrefix || 'RN'}-${new Date().getFullYear()}-001`,
    customerId:
      'preview-customer',
    customerName:
      'Ivan Horvat',
    customerContactPerson:
      'Ivan Horvat',
    customerPhone:
      '091 234 5678',
    customerEmail:
      'ivan.horvat@primjer.hr',
    customerOib:
      '12345678901',
    address:
      'Ulica hrvatskih branitelja 12, 35000 Slavonski Brod',
    date:
      isoDate(new Date()),
    arrivalTime:
      '09:00',
    departureTime:
      '11:30',
    durationMinutes:
      150,
    title:
      'Servis plinskog bojlera',
    description:
      'Izvršen pregled i servis uređaja. Očišćen izmjenjivač, provjeren tlak sustava i ispitana sigurnost rada. Provjerena nepropusnost spojeva te izvršeno završno testiranje uređaja.',
    materials: [
      {
        id: '1',
        name:
          'Brtva servisnog poklopca',
        quantity: 1,
        unit: 'kom',
        unitPrice: 18,
      },
      {
        id: '2',
        name:
          'Sredstvo za čišćenje',
        quantity: 1,
        unit: 'kom',
        unitPrice: 12,
      },
      {
        id: '3',
        name:
          'Bakreni spojni element',
        quantity: 2,
        unit: 'kom',
        unitPrice: 8,
      },
      {
        id: '4',
        name:
          'Izolacija cijevi',
        quantity: 3,
        unit: 'm',
        unitPrice: 4,
      },
      {
        id: '5',
        name:
          'Sitni potrošni materijal',
        quantity: 1,
        unit: 'set',
        unitPrice: 7,
      },
    ],
    assignedWorkers: [
      'Borna Ferfolja',
    ],
    labourPrice: 80,
    materialPrice: 73,
    vatRate:
      settings.defaultVatRate ||
      25,
    totalPrice:
      191.25,
    priceNote: '',
    investorName:
      'Ivan Horvat',
    investorSignature: '',
    images: [],
    status: 'Novi',
    priority: 'Normalan',
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
  }
}

function offerSettings(
  settings: CompanySettings,
): Partial<OfferPdfSettings> {
  return {
    companyName:
      settings.name,
    companySubtitle:
      settings.documentWatermark,
    companyAddress:
      [
        settings.address,
        [
          settings.postalCode,
          settings.city,
        ]
          .filter(Boolean)
          .join(' '),
      ]
        .filter(Boolean)
        .join(', '),
    companyOib:
      settings.oib,
    companyIban:
      settings.iban,
    companyEmail:
      settings.email,
    companyPhone:
      settings.phone,
    companyWebsite:
      settings.website,
    logoDataUrl:
      settings.logoUrl ||
      undefined,
    stampDataUrl:
      settings.stampUrl ||
      undefined,
    signatureDataUrl:
      settings.signatureUrl ||
      undefined,
    primaryColor:
      settings.primaryColor,
    showStamp:
      Boolean(
        settings.stampUrl,
      ),
    showSignature: true,
    showFooter: true,
    showItemImages: true,
    footerText:
      settings.documentFooter,
  }
}

function invoiceSettings(
  settings: CompanySettings,
): Partial<InvoicePdfSettings> {
  return {
    companyName:
      settings.name,
    companySubtitle:
      settings.documentWatermark,
    companyAddress:
      [
        settings.address,
        [
          settings.postalCode,
          settings.city,
        ]
          .filter(Boolean)
          .join(' '),
      ]
        .filter(Boolean)
        .join(', '),
    companyOib:
      settings.oib,
    companyIban:
      settings.iban,
    companyEmail:
      settings.email,
    companyPhone:
      settings.phone,
    companyWebsite:
      settings.website,
    logoDataUrl:
      settings.logoUrl ||
      undefined,
    stampDataUrl:
      settings.stampUrl ||
      undefined,
    primaryColor:
      settings.primaryColor,
    showStamp:
      Boolean(
        settings.stampUrl,
      ),
    showFooter: true,
    footerText:
      settings.documentFooter,
  }
}

function demoOffer(
  settings: CompanySettings,
): OfferPdfData {
  const now =
    new Date()

  const valid =
    new Date(now)

  valid.setDate(
    valid.getDate() +
      (
        settings.defaultOfferValidityDays ||
        15
      ),
  )

  return {
    id: 'preview',
    offerNumber:
      `${settings.offerPrefix || 'P'}-${now.getFullYear()}-001`,
    customerName:
      'Ivan Horvat',
    customerType:
      'Fizička osoba',
    oib:
      '12345678901',
    email:
      'ivan.horvat@primjer.hr',
    phone:
      '091 234 5678',
    address:
      'Ulica hrvatskih branitelja 12',
    city:
      '35000 Slavonski Brod',
    date:
      isoDate(now),
    validUntil:
      isoDate(valid),
    status:
      'Nacrt',
    responsiblePerson:
      'Borna Ferfolja',
    description:
      'Ponuda za servis, rad i potreban materijal.',
    internalNote: '',
    paymentTerms:
      'Plaćanje u roku 7 dana.',
    items: [
      {
        id: '1',
        name:
          'Servis klima uređaja',
        description:
          'Redovni pregled i čišćenje.',
        quantity: 1,
        unit: 'kom',
        price: 100,
        discount: 0,
        vat: 25,
      },
      {
        id: '2',
        name:
          'Dezinfekcija unutarnje jedinice',
        description: '',
        quantity: 1,
        unit: 'kom',
        price: 25,
        discount: 0,
        vat: 25,
      },
      {
        id: '3',
        name:
          'Potrošni materijal',
        description: '',
        quantity: 1,
        unit: 'set',
        price: 15,
        discount: 0,
        vat: 25,
      },
    ],
    createdAt:
      now.toISOString(),
    updatedAt:
      now.toISOString(),
    version: 1,
  }
}

function demoInvoice(
  settings: CompanySettings,
): InvoicePdfData {
  const now =
    new Date()

  const due =
    new Date(now)

  due.setDate(
    due.getDate() +
      (
        settings.defaultPaymentDays ||
        7
      ),
  )

  return {
    id: 'preview',
    invoiceNumber:
      `${settings.invoicePrefix || 'R'}-${now.getFullYear()}-001`,
    customerName:
      'Ivan Horvat',
    customerType:
      'Fizička osoba',
    oib:
      '12345678901',
    email:
      'ivan.horvat@primjer.hr',
    phone:
      '091 234 5678',
    address:
      'Ulica hrvatskih branitelja 12',
    city:
      '35000 Slavonski Brod',
    issueDate:
      isoDate(now),
    dueDate:
      isoDate(due),
    serviceDate:
      isoDate(now),
    status:
      'Nacrt',
    responsiblePerson:
      'Borna Ferfolja',
    description:
      'Račun za izvršene radove i materijal.',
    internalNote: '',
    paymentMethod:
      'Transakcijski račun',
    paymentModel:
      'HR00',
    paymentReference:
      '2026-001',
    iban:
      settings.iban,
    items: [
      {
        id: '1',
        name:
          'Servis uređaja',
        description: '',
        quantity: 1,
        unit: 'kom',
        price: 100,
        discount: 0,
        vat: 25,
      },
      {
        id: '2',
        name:
          'Materijal',
        description: '',
        quantity: 1,
        unit: 'set',
        price: 35,
        discount: 0,
        vat: 25,
      },
    ],
    createdAt:
      now.toISOString(),
    updatedAt:
      now.toISOString(),
  }
}

export default function
DocumentLivePreview({
  settings,
}: {
  settings:
    CompanySettings
}) {
  const [
    activeType,
    setActiveType,
  ] =
    useState<PreviewType>(
      'work-order',
    )

  const [
    selectedLayout,
    setSelectedLayout,
  ] =
    useState<
      Exclude<
        PdfLayout,
        'minimal'
      >
    >('modern')

  const [
    savedBranding,
    setSavedBranding,
  ] =
    useState<
      WorkOrderBranding | null
    >(null)

  const [
    customDraft,
    setCustomDraft,
  ] =
    useState<
      WorkOrderBranding | null
    >(null)

  const [
    zoom,
    setZoom,
  ] =
    useState(72)

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false)

  const [
    message,
    setMessage,
  ] =
    useState('')

  useEffect(() => {
    let cancelled =
      false

    void (async () => {
      try {
        setIsLoading(true)

        const branding =
          await getWorkOrderBrandingFromCompanySettings()

        if (cancelled) {
          return
        }

        const layout =
          branding.layout ===
          'classic'
            ? 'classic'
            : branding.layout ===
                'custom' ||
              branding.layout ===
                'minimal'
              ? 'custom'
              : 'modern'

        setSelectedLayout(
          layout,
        )
        setSavedBranding(
          branding,
        )
        setCustomDraft(
          branding,
        )
      } catch (error) {
        console.error(
          error,
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [settings.id])

  const workOrderBranding =
    useMemo(
      () => {
        const base =
          mapCompanySettingsToWorkOrderBranding(
            settings,
          )

        if (
          selectedLayout ===
            'custom' &&
          customDraft
        ) {
          return {
            ...base,
            ...customDraft,
            layout:
              'custom' as const,
          }
        }

        return {
          ...base,
          ...(savedBranding ?? {}),
          layout:
            selectedLayout,
        }
      },
      [
        settings,
        selectedLayout,
        customDraft,
        savedBranding,
      ],
    )

  const workOrderHtml =
    useMemo(
      () =>
        buildWorkOrderPdfHtml(
          makeDemoWorkOrder(
            settings,
          ),
          workOrderBranding,
        ),
      [
        settings,
        workOrderBranding,
      ],
    )

  const offerHtml =
    useMemo(
      () =>
        buildOfferPdfHtml(
          demoOffer(settings),
          offerSettings(
            settings,
          ),
        ),
      [settings],
    )

  const invoiceHtml =
    useMemo(
      () =>
        buildInvoicePdfHtml(
          demoInvoice(
            settings,
          ),
          invoiceSettings(
            settings,
          ),
        ),
      [settings],
    )

  const activeHtml =
    activeType ===
    'work-order'
      ? workOrderHtml
      : activeType ===
          'offer'
        ? offerHtml
        : invoiceHtml

  const scale =
    zoom / 100

  async function
  selectLayout(
    layout:
      Exclude<
        PdfLayout,
        'minimal'
      >,
  ) {
    if (isSaving) {
      return
    }

    setSelectedLayout(
      layout,
    )
    setMessage('')

    try {
      setIsSaving(true)

      await saveWorkOrderLayout(
        layout,
      )

      setSavedBranding(
        (current) => ({
          ...(current ??
            workOrderBranding),
          layout,
        }),
      )

      setMessage(
        `${layoutOptions.find(
          (item) =>
            item.id === layout,
        )?.title} izgled spremljen.`,
      )
    } catch (error) {
      console.error(error)
      setMessage(
        'Izgled nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function updateCustom<
    Key extends
      keyof WorkOrderBranding,
  >(
    key: Key,
    value:
      WorkOrderBranding[Key],
  ) {
    setCustomDraft(
      (current) => ({
        ...(current ??
          workOrderBranding),
        [key]: value,
        layout:
          'custom',
      }),
    )
  }

  async function
  saveCustom() {
    if (!customDraft) {
      return
    }

    try {
      setIsSaving(true)

      const saved =
        await saveWorkOrderBranding({
          ...customDraft,
          layout: 'custom',
        })

      setSavedBranding(saved)
      setCustomDraft(saved)
      setSelectedLayout(
        'custom',
      )

      setMessage(
        'Custom izgled spremljen.',
      )
    } catch (error) {
      console.error(error)
      setMessage(
        'Custom izgled nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function openPreview() {
    if (
      activeType ===
      'work-order'
    ) {
      void (async () => {
        try {
          const url =
            await getWorkOrderPdfBlobUrl(
              makeDemoWorkOrder(
                settings,
              ),
              workOrderBranding,
            )

          window.open(
            url,
            '_blank',
          )

          window.setTimeout(
            () =>
              URL.revokeObjectURL(
                url,
              ),
            60_000,
          )
        } catch (error) {
          console.error(error)
        }
      })()

      return
    }

    const blob =
      new Blob(
        [activeHtml],
        {
          type:
            'text/html;charset=utf-8',
        },
      )

    const url =
      URL.createObjectURL(
        blob,
      )

    window.open(
      url,
      '_blank',
    )

    window.setTimeout(
      () =>
        URL.revokeObjectURL(
          url,
        ),
      60_000,
    )
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
      <div className="border-b border-slate-800 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
          Stil radnog naloga
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Classic, Modern ili Custom
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Ova tri izgleda sada su stvarno različita. Odabir vrijedi za radni nalog.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {layoutOptions.map(
            (option) => {
              const Icon =
                option.icon

              const active =
                selectedLayout ===
                option.id

              return (
                <button
                  key={
                    option.id
                  }
                  type="button"
                  disabled={
                    isLoading ||
                    isSaving
                  }
                  onClick={() =>
                    void selectLayout(
                      option.id,
                    )
                  }
                  className={`overflow-hidden rounded-2xl border text-left transition ${
                    active
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  } disabled:opacity-60`}
                >
                  <div
                    className={`relative h-24 bg-gradient-to-br ${option.previewClassName} p-4`}
                  >
                    <div className="absolute inset-x-4 top-4 h-3 rounded bg-white/90" />

                    <div className="absolute left-4 right-14 top-10 space-y-2">
                      <div className="h-2 rounded bg-white/70" />
                      <div className="h-2 w-4/5 rounded bg-white/50" />
                    </div>

                    <div className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-xl bg-black/25 text-white">
                      {active ? (
                        <Check
                          size={19}
                        />
                      ) : (
                        <Icon
                          size={19}
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="font-black text-white">
                      {option.title}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {
                        option.description
                      }
                    </p>
                  </div>
                </button>
              )
            },
          )}
        </div>

        {message && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs font-semibold text-slate-300">
            {message}
          </div>
        )}

        {selectedLayout ===
          'custom' &&
          customDraft && (
            <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                    Custom editor
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Promjene se odmah vide na radnom nalogu.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    void saveCustom()
                  }
                  className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  Spremi Custom
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextField
                  label="Naziv dokumenta"
                  value={
                    customDraft.customDocumentTitle
                  }
                  onChange={(value) =>
                    updateCustom(
                      'customDocumentTitle',
                      value,
                    )
                  }
                />

                <SelectField
                  label="Poravnanje naslova"
                  value={
                    customDraft.headerAlignment
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
                  onChange={(value) =>
                    updateCustom(
                      'headerAlignment',
                      value as WorkOrderBranding['headerAlignment'],
                    )
                  }
                />

                <ColorField
                  label="Glavna boja"
                  value={
                    customDraft.primaryColor
                  }
                  onChange={(value) =>
                    updateCustom(
                      'primaryColor',
                      value,
                    )
                  }
                />

                <ColorField
                  label="Sekundarna boja"
                  value={
                    customDraft.secondaryColor
                  }
                  onChange={(value) =>
                    updateCustom(
                      'secondaryColor',
                      value,
                    )
                  }
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Toggle
                  label="Logo"
                  checked={
                    customDraft.showLogo
                  }
                  onChange={(value) =>
                    updateCustom(
                      'showLogo',
                      value,
                    )
                  }
                />

                <Toggle
                  label="Pečat"
                  checked={
                    customDraft.showStamp
                  }
                  onChange={(value) =>
                    updateCustom(
                      'showStamp',
                      value,
                    )
                  }
                />

                <Toggle
                  label="OIB firme"
                  checked={
                    customDraft.showCompanyOib
                  }
                  onChange={(value) =>
                    updateCustom(
                      'showCompanyOib',
                      value,
                    )
                  }
                />

                <Toggle
                  label="IBAN firme"
                  checked={
                    customDraft.showCompanyIban
                  }
                  onChange={(value) =>
                    updateCustom(
                      'showCompanyIban',
                      value,
                    )
                  }
                />
              </div>
            </div>
          )}
      </div>

      <div className="border-b border-slate-800 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
          Živi pregled
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Stvarni izgled dokumenta
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          A4 je automatski prilagođen širini ovog prozora — nema pomicanja lijevo/desno.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-950/70 p-1.5">
          {tabs.map(
            (tab) => {
              const Icon =
                tab.icon

              const active =
                activeType ===
                tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveType(
                      tab.id,
                    )
                  }
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-black transition sm:text-sm ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon
                    size={16}
                  />

                  <span className="truncate">
                    {tab.label}
                  </span>
                </button>
              )
            },
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() =>
                setZoom(
                  (value) =>
                    Math.max(
                      45,
                      value - 5,
                    ),
                )
              }
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Minus
                size={17}
              />
            </button>

            <span className="min-w-12 text-center text-xs font-black text-slate-300">
              {zoom}%
            </span>

            <button
              type="button"
              onClick={() =>
                setZoom(
                  (value) =>
                    Math.min(
                      100,
                      value + 5,
                    ),
                )
              }
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Plus
                size={17}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={
              openPreview
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500"
          >
            <Download
              size={17}
            />
            Otvori probni dokument
          </button>
        </div>
      </div>

      <div className="overflow-hidden bg-slate-950/70 p-3 sm:p-5">
        <div className="flex w-full justify-center overflow-hidden">
          <div
            className="relative shrink-0"
            style={{
              width:
                `${794 * scale}px`,
              height:
                `${1123 * scale}px`,
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: 794,
                height: 1123,
                transform:
                  `scale(${scale})`,
              }}
            >
              <iframe
                key={`${activeType}-${selectedLayout}-${workOrderBranding.primaryColor}-${workOrderBranding.secondaryColor}`}
                title={
                  activeType ===
                  'work-order'
                    ? 'Preview radnog naloga'
                    : activeType ===
                        'offer'
                      ? 'Preview ponude'
                      : 'Preview računa'
                }
                srcDoc={
                  activeHtml
                }
                scrolling="no"
                className="h-[1123px] w-[794px] border-0 bg-white shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange:
    (value: string) =>
      void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white outline-none focus:border-violet-500"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options:
    Array<
      [
        string,
        string,
      ]
    >
  onChange:
    (value: string) =>
      void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white outline-none focus:border-violet-500"
      >
        {options.map(
          ([
            optionValue,
            optionLabel,
          ]) => (
            <option
              key={
                optionValue
              }
              value={
                optionValue
              }
            >
              {
                optionLabel
              }
            </option>
          ),
        )}
      </select>
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange:
    (value: string) =>
      void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-2">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
        />

        <span className="truncate text-xs font-bold text-slate-300">
          {value}
        </span>
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
  onChange:
    (
      value: boolean,
    ) => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3">
      <span className="text-xs font-bold text-slate-300">
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
