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
      'Službeni servisni izgled s tamnim zaglavljem i jednostavnim rasporedom.',
    icon: FileText,
    previewClassName:
      'from-slate-800 to-slate-950',
  },
  {
    id: 'modern',
    title: 'Modern',
    description:
      'Moderan FERSYS izgled s karticama, tablicom i naglašenom bojom firme.',
    icon: Sparkles,
    previewClassName:
      'from-blue-600 to-violet-600',
  },
  {
    id: 'custom',
    title: 'Custom',
    description:
      'Izgled koji prati boje, logo, pečat i ostale postavke vaše tvrtke.',
    icon: SlidersHorizontal,
    previewClassName:
      'from-violet-600 to-fuchsia-600',
  },
]

function isoDate(
  date: Date,
) {
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

    investorSignature:
      '',

    images: [],

    status:
      'Novi',

    priority:
      'Normalan',

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

    showSignature:
      true,

    showFooter:
      true,

    showItemImages:
      false,

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

    showFooter:
      true,

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

    version:
      1,
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

export default function DocumentLivePreview({
  settings,
}: {
  settings: CompanySettings
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
    useState<Exclude<PdfLayout, 'minimal'>>(
      'modern',
    )

  const [
    isLoadingLayout,
    setIsLoadingLayout,
  ] =
    useState(true)

  const [
    isSavingLayout,
    setIsSavingLayout,
  ] =
    useState(false)

  const [
    layoutMessage,
    setLayoutMessage,
  ] =
    useState('')

  const [
    zoom,
    setZoom,
  ] =
    useState(78)

  const [
    savedBranding,
    setSavedBranding,
  ] =
    useState<WorkOrderBranding | null>(
      null,
    )

  const [
    customDraft,
    setCustomDraft,
  ] =
    useState<WorkOrderBranding | null>(
      null,
    )

  const [
    isSavingCustom,
    setIsSavingCustom,
  ] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsLoadingLayout(true)

        const branding =
          await getWorkOrderBrandingFromCompanySettings()

        if (
          cancelled
        ) {
          return
        }

        const nextLayout =
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
          nextLayout,
        )

        setSavedBranding(
          branding,
        )

        setCustomDraft(
          branding,
        )
      } catch (error) {
        console.error(
          'Izgled radnog naloga nije moguće učitati:',
          error,
        )
      } finally {
        if (
          !cancelled
        ) {
          setIsLoadingLayout(
            false,
          )
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
          selectedLayout === 'custom' &&
          customDraft
        ) {
          return {
            ...base,
            ...customDraft,
            layout: 'custom' as const,
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
          demoInvoice(settings),
          invoiceSettings(
            settings,
          ),
        ),
      [settings],
    )


  async function selectLayout(
    layout: Exclude<PdfLayout, 'minimal'>,
  ) {
    if (
      isSavingLayout ||
      selectedLayout === layout
    ) {
      return
    }

    const previous =
      selectedLayout

    setSelectedLayout(
      layout,
    )

    setLayoutMessage('')

    try {
      setIsSavingLayout(
        true,
      )

      await saveWorkOrderLayout(
        layout,
      )

      const nextBranding = {
        ...workOrderBranding,
        layout,
      }

      setSavedBranding(
        nextBranding,
      )

      if (
        layout === 'custom'
      ) {
        setCustomDraft(
          nextBranding,
        )
      }

      setLayoutMessage(
        `Izgled ${layoutOptions.find(
          (item) =>
            item.id === layout,
        )?.title ?? layout} je spremljen.`,
      )

      window.setTimeout(
        () =>
          setLayoutMessage(''),
        2500,
      )
    } catch (error) {
      console.error(
        'Izgled dokumenta nije moguće spremiti:',
        error,
      )

      setSelectedLayout(
        previous,
      )

      setLayoutMessage(
        'Izgled nije moguće spremiti.',
      )
    } finally {
      setIsSavingLayout(
        false,
      )
    }
  }

  function updateCustom<
    Key extends keyof WorkOrderBranding,
  >(
    key: Key,
    value: WorkOrderBranding[Key],
  ) {
    setCustomDraft(
      (current) => ({
        ...(current ??
          workOrderBranding),
        [key]: value,
        layout: 'custom',
      }),
    )
  }

  async function saveCustomSettings() {
    if (
      !customDraft ||
      isSavingCustom
    ) {
      return
    }

    try {
      setIsSavingCustom(true)
      setLayoutMessage('')

      const saved =
        await saveWorkOrderBranding({
          ...customDraft,
          layout: 'custom',
        })

      setSavedBranding(saved)
      setCustomDraft(saved)
      setSelectedLayout('custom')

      setLayoutMessage(
        'Custom izgled je spremljen za ovu tvrtku.',
      )
    } catch (error) {
      console.error(
        'Custom izgled nije moguće spremiti:',
        error,
      )

      setLayoutMessage(
        'Custom izgled nije moguće spremiti.',
      )
    } finally {
      setIsSavingCustom(false)
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
          console.error(
            'Probni PDF nije moguće otvoriti:',
            error,
          )
        }
      })()

      return
    }

    const html =
      activeType ===
      'offer'
        ? offerHtml
        : invoiceHtml

    const blob =
      new Blob(
        [html],
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
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
            Stil dokumenta
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Odaberi izgled radnog naloga
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Svaka tvrtka može spremiti svoj zadani izgled. Promjena se odmah prikazuje u A4 pregledu ispod.
          </p>
        </div>

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
                    isLoadingLayout ||
                    isSavingLayout
                  }
                  onClick={() =>
                    void selectLayout(
                      option.id,
                    )
                  }
                  className={`group overflow-hidden rounded-2xl border text-left transition ${
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
                        <Check size={19} />
                      ) : (
                        <Icon size={19} />
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-white">
                        {
                          option.title
                        }
                      </p>

                      {active && (
                        <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-blue-300">
                          Odabrano
                        </span>
                      )}
                    </div>

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

        {layoutMessage && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs font-semibold text-slate-300">
            {layoutMessage}
          </div>
        )}

        {selectedLayout === 'custom' &&
          customDraft && (
            <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                    Custom editor
                  </p>

                  <h3 className="mt-1 text-lg font-black text-white">
                    Napravi izgled samo za ovu firmu
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Promjene se odmah vide u pregledu. Klikni Spremi custom izgled kada završiš.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSavingCustom}
                  onClick={() =>
                    void saveCustomSettings()
                  }
                  className="h-11 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {isSavingCustom
                    ? 'Spremanje...'
                    : 'Spremi custom izgled'}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <CustomTextField
                  label="Naziv dokumenta"
                  value={customDraft.customDocumentTitle}
                  onChange={(value) =>
                    updateCustom(
                      'customDocumentTitle',
                      value,
                    )
                  }
                />

                <CustomSelectField
                  label="Poravnanje zaglavlja"
                  value={customDraft.headerAlignment}
                  options={[
                    ['left', 'Lijevo'],
                    ['center', 'Sredina'],
                    ['right', 'Desno'],
                  ]}
                  onChange={(value) =>
                    updateCustom(
                      'headerAlignment',
                      value as WorkOrderBranding['headerAlignment'],
                    )
                  }
                />

                <CustomTextField
                  label="Naziv sekcije opisa"
                  value={customDraft.customDescriptionLabel}
                  onChange={(value) =>
                    updateCustom(
                      'customDescriptionLabel',
                      value,
                    )
                  }
                />

                <CustomTextField
                  label="Naziv sekcije materijala"
                  value={customDraft.customMaterialsLabel}
                  onChange={(value) =>
                    updateCustom(
                      'customMaterialsLabel',
                      value,
                    )
                  }
                />

                <CustomTextField
                  label="Naziv sekcije fotografija"
                  value={customDraft.customPhotosLabel}
                  onChange={(value) =>
                    updateCustom(
                      'customPhotosLabel',
                      value,
                    )
                  }
                />

                <CustomTextField
                  label="Naziv potpisa i ovjere"
                  value={customDraft.customSignatureLabel}
                  onChange={(value) =>
                    updateCustom(
                      'customSignatureLabel',
                      value,
                    )
                  }
                />

                <CustomSelectField
                  label="Prikaz podataka investitora"
                  value={customDraft.customInfoStyle}
                  options={[
                    ['cards', 'Kartice'],
                    ['compact', 'Kompaktno'],
                  ]}
                  onChange={(value) =>
                    updateCustom(
                      'customInfoStyle',
                      value as WorkOrderBranding['customInfoStyle'],
                    )
                  }
                />

                <CustomSelectField
                  label="Prikaz materijala"
                  value={customDraft.customMaterialStyle}
                  options={[
                    ['table', 'Tablica'],
                    ['list', 'Popis / kartice'],
                  ]}
                  onChange={(value) =>
                    updateCustom(
                      'customMaterialStyle',
                      value as WorkOrderBranding['customMaterialStyle'],
                    )
                  }
                />

                <CustomSelectField
                  label="Redoslijed sekcija"
                  value={customDraft.customSectionOrder}
                  options={[
                    ['description-first', 'Opis pa materijal'],
                    ['materials-first', 'Materijal pa opis'],
                  ]}
                  onChange={(value) =>
                    updateCustom(
                      'customSectionOrder',
                      value as WorkOrderBranding['customSectionOrder'],
                    )
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <CustomColorField
                    label="Glavna boja"
                    value={customDraft.primaryColor}
                    onChange={(value) =>
                      updateCustom(
                        'primaryColor',
                        value,
                      )
                    }
                  />

                  <CustomColorField
                    label="Sekundarna boja"
                    value={customDraft.secondaryColor}
                    onChange={(value) =>
                      updateCustom(
                        'secondaryColor',
                        value,
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <CustomToggle
                  label="Prikaži logo"
                  checked={customDraft.showLogo}
                  onChange={(checked) =>
                    updateCustom(
                      'showLogo',
                      checked,
                    )
                  }
                />

                <CustomToggle
                  label="Prikaži pečat"
                  checked={customDraft.showStamp}
                  onChange={(checked) =>
                    updateCustom(
                      'showStamp',
                      checked,
                    )
                  }
                />

                <CustomToggle
                  label="Prikaži OIB"
                  checked={customDraft.showCompanyOib}
                  onChange={(checked) =>
                    updateCustom(
                      'showCompanyOib',
                      checked,
                    )
                  }
                />

                <CustomToggle
                  label="Prikaži IBAN"
                  checked={customDraft.showCompanyIban}
                  onChange={(checked) =>
                    updateCustom(
                      'showCompanyIban',
                      checked,
                    )
                  }
                />

                <CustomToggle
                  label="Prikaži telefon"
                  checked={customDraft.showCompanyPhone}
                  onChange={(checked) =>
                    updateCustom(
                      'showCompanyPhone',
                      checked,
                    )
                  }
                />

                <CustomToggle
                  label="Prikaži e-mail"
                  checked={customDraft.showCompanyEmail}
                  onChange={(checked) =>
                    updateCustom(
                      'showCompanyEmail',
                      checked,
                    )
                  }
                />
              </div>
            </div>
          )}
      </div>

      <div className="border-b border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
              Živi pregled
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Stvarni izgled dokumenta
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Preview koristi isti generator kao pravi dokument.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-950/70 p-1.5">
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
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() =>
                  setZoom(
                    (value) =>
                      Math.max(
                        50,
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
      </div>

      <div className="max-h-[78vh] overflow-auto bg-slate-950/70 p-4 sm:p-6">
        <div
          className="mx-auto origin-top"
          style={{
            width: 794,
            height: 1123,

            transform:
              `scale(${zoom / 100})`,

            marginBottom:
              `${1123 * (zoom / 100 - 1)}px`,
          }}
        >
          {activeType ===
          'work-order' ? (
            <iframe
              title="Preview radnog naloga"
              srcDoc={workOrderHtml}
              className="h-[1123px] w-[794px] border-0 bg-white shadow-2xl"
            />
          ) : (
            <iframe
              title={
                activeType ===
                'offer'
                  ? 'Preview ponude'
                  : 'Preview računa'
              }
              srcDoc={
                activeType ===
                'offer'
                  ? offerHtml
                  : invoiceHtml
              }
              className="h-[1123px] w-[794px] border-0 bg-white shadow-2xl"
            />
          )}
        </div>
      </div>
    </section>
  )
}


function CustomTextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white outline-none focus:border-violet-500"
      />
    </label>
  )
}

function CustomSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white outline-none focus:border-violet-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function CustomColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
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
            onChange(event.target.value)
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

function CustomToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
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
          onChange(event.target.checked)
        }
        className="h-5 w-5 accent-violet-600"
      />
    </label>
  )
}