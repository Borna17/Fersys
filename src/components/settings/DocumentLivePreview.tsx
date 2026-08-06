import {
  Download,
  FileText,
  Minus,
  Plus,
  ReceiptText,
  Wrench,
} from 'lucide-react'
import {
  useMemo,
  useRef,
  useState,
} from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import type {
  CompanySettings,
} from '../../services/companySettings.service'

type PreviewType =
  | 'work-order'
  | 'offer'
  | 'invoice'

const documentTabs: Array<{
  id: PreviewType
  label: string
  icon: typeof FileText
}> = [
  {
    id: 'work-order',
    label: 'Radni nalog',
    icon: Wrench,
  },
  {
    id: 'offer',
    label: 'Ponuda',
    icon: FileText,
  },
  {
    id: 'invoice',
    label: 'Račun',
    icon: ReceiptText,
  },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value: Date) {
  return value.toLocaleDateString('hr-HR')
}

function getDocumentNumber(
  type: PreviewType,
  settings: CompanySettings,
) {
  const year = new Date().getFullYear()

  if (type === 'work-order') {
    return `${settings.workOrderPrefix || 'RN'}-${year}-001`
  }

  if (type === 'offer') {
    return `${settings.offerPrefix || 'P'}-${year}-001`
  }

  return `${settings.invoicePrefix || 'R'}-${year}-001`
}

function getDocumentTitle(type: PreviewType) {
  if (type === 'work-order') {
    return 'RADNI NALOG'
  }

  if (type === 'offer') {
    return 'PONUDA'
  }

  return 'RAČUN'
}

export default function DocumentLivePreview({
  settings,
}: {
  settings: CompanySettings
}) {
  const previewRef =
    useRef<HTMLDivElement | null>(null)

  const [activeType, setActiveType] =
    useState<PreviewType>('work-order')

  const [zoom, setZoom] =
    useState(72)

  const [isDownloading, setIsDownloading] =
    useState(false)

  const issueDate = useMemo(
    () => new Date(),
    [],
  )

  const dueDate = useMemo(() => {
    const next = new Date(issueDate)

    next.setDate(
      next.getDate() +
        (activeType === 'offer'
          ? settings.defaultOfferValidityDays
          : settings.defaultPaymentDays),
    )

    return next
  }, [
    activeType,
    issueDate,
    settings.defaultOfferValidityDays,
    settings.defaultPaymentDays,
  ])

  const documentNumber =
    getDocumentNumber(activeType, settings)

  async function downloadPreviewPdf() {
    if (!previewRef.current || isDownloading) {
      return
    }

    try {
      setIsDownloading(true)

      const canvas = await html2canvas(
        previewRef.current,
        {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
        },
      )

      const image =
        canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth =
        pdf.internal.pageSize.getWidth()

      const pageHeight =
        pdf.internal.pageSize.getHeight()

      pdf.addImage(
        image,
        'PNG',
        0,
        0,
        pageWidth,
        pageHeight,
      )

      pdf.save(
        `FERSYS-${getDocumentTitle(
          activeType,
        )
          .toLowerCase()
          .replace(/\s+/g, '-')}-preview.pdf`,
      )
    } catch (error) {
      console.error(
        'Probni PDF nije moguće preuzeti:',
        error,
      )

      window.alert(
        'Probni PDF trenutno nije moguće preuzeti.',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
      <div className="border-b border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
              Živi pregled
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Izgled PDF dokumenta
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Promjene se prikazuju bez spremanja dokumenta.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-950/70 p-1.5">
            {documentTabs.map((tab) => {
              const Icon = tab.icon
              const active =
                activeType === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveType(tab.id)
                  }
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-black transition sm:text-sm ${
                    active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span className="truncate">
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() =>
                  setZoom((value) =>
                    Math.max(45, value - 5),
                  )
                }
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Smanji pregled"
              >
                <Minus size={17} />
              </button>

              <span className="min-w-12 text-center text-xs font-black text-slate-300">
                {zoom}%
              </span>

              <button
                type="button"
                onClick={() =>
                  setZoom((value) =>
                    Math.min(100, value + 5),
                  )
                }
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Povećaj pregled"
              >
                <Plus size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                void downloadPreviewPdf()
              }}
              disabled={isDownloading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={17} />
              {isDownloading
                ? 'Izrada PDF-a...'
                : 'Preuzmi probni PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[76vh] overflow-auto bg-slate-950/70 p-4 sm:p-6">
        <div
          className="mx-auto origin-top transition-transform"
          style={{
            width: '794px',
            minHeight: '1123px',
            transform: `scale(${zoom / 100})`,
            marginBottom:
              `${1123 * (zoom / 100 - 1)}px`,
          }}
        >
          <article
            ref={previewRef}
            className="relative min-h-[1123px] overflow-hidden bg-white p-12 text-slate-900 shadow-2xl"
            style={{
              fontFamily:
                'Arial, Helvetica, sans-serif',
            }}
          >
            {settings.documentWatermark.trim() && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
                <p
                  className="rotate-[-35deg] select-none text-7xl font-black uppercase tracking-[0.18em]"
                  style={{
                    color:
                      `${settings.primaryColor}12`,
                  }}
                >
                  {settings.documentWatermark}
                </p>
              </div>
            )}

            <div
              className="absolute inset-x-0 top-0 h-2"
              style={{
                backgroundColor:
                  settings.primaryColor,
              }}
            />

            <header className="relative z-10 flex items-start justify-between gap-8 border-b border-slate-200 pb-8">
              <div className="flex min-w-0 items-start gap-5">
                {settings.logoUrl ? (
                  <div className="grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                    <img
                      src={settings.logoUrl}
                      alt="Logo tvrtke"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="grid h-24 w-24 shrink-0 place-items-center rounded-xl text-2xl font-black text-white"
                    style={{
                      backgroundColor:
                        settings.primaryColor,
                    }}
                  >
                    {(settings.name || 'FT')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) =>
                        part[0]?.toUpperCase(),
                      )
                      .join('')}
                  </div>
                )}

                <div className="min-w-0 pt-1">
                  <h3 className="text-2xl font-black">
                    {settings.name ||
                      'Naziv tvrtke'}
                  </h3>

                  <div className="mt-2 space-y-1 text-sm leading-5 text-slate-600">
                    <p>
                      {[
                        settings.address,
                        [
                          settings.postalCode,
                          settings.city,
                        ]
                          .filter(Boolean)
                          .join(' '),
                      ]
                        .filter(Boolean)
                        .join(', ') ||
                        'Adresa tvrtke'}
                    </p>

                    {settings.oib && (
                      <p>OIB: {settings.oib}</p>
                    )}

                    {settings.phone && (
                      <p>{settings.phone}</p>
                    )}

                    {settings.email && (
                      <p>{settings.email}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className="text-sm font-black uppercase tracking-[0.18em]"
                  style={{
                    color:
                      settings.primaryColor,
                  }}
                >
                  {getDocumentTitle(
                    activeType,
                  )}
                </p>

                <p className="mt-2 text-xl font-black">
                  {documentNumber}
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  Datum: {formatDate(issueDate)}
                </p>

                {activeType !==
                  'work-order' && (
                  <p className="mt-1 text-sm text-slate-500">
                    {activeType === 'offer'
                      ? 'Vrijedi do'
                      : 'Dospijeće'}
                    : {formatDate(dueDate)}
                  </p>
                )}
              </div>
            </header>

            <main className="relative z-10">
              <section className="mt-8 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Kupac / investitor
                  </p>

                  <h4 className="mt-3 text-lg font-black">
                    Ivan Horvat
                  </h4>

                  <div className="mt-2 space-y-1 text-sm leading-5 text-slate-600">
                    <p>Ulica hrvatskih branitelja 12</p>
                    <p>35000 Slavonski Brod</p>
                    <p>OIB: 12345678901</p>
                    <p>ivan.horvat@primjer.hr</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Podaci dokumenta
                  </p>

                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Odgovorna osoba
                      </dt>
                      <dd className="font-bold">
                        Borna Ferfolja
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Status
                      </dt>
                      <dd className="font-bold">
                        {activeType ===
                        'work-order'
                          ? 'Novi'
                          : 'Nacrt'}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Valuta
                      </dt>
                      <dd className="font-bold">
                        {settings.currency ||
                          'EUR'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              {activeType ===
              'work-order' ? (
                <WorkOrderContent
                  settings={settings}
                />
              ) : (
                <FinancialDocumentContent
                  type={activeType}
                  settings={settings}
                />
              )}
            </main>

            <footer className="absolute inset-x-12 bottom-10 z-10 border-t border-slate-200 pt-5">
              <div className="flex items-end justify-between gap-8">
                <div className="max-w-[65%] text-xs leading-5 text-slate-500">
                  <p>
                    {settings.documentFooter ||
                      'Dokument je izrađen u poslovnom sustavu FERSYS.'}
                  </p>

                  {settings.iban && (
                    <p className="mt-1">
                      IBAN: {settings.iban}
                      {settings.bankName
                        ? ` · ${settings.bankName}`
                        : ''}
                    </p>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-400">
                  Stranica 1 / 1
                </p>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </section>
  )
}

function WorkOrderContent({
  settings,
}: {
  settings: CompanySettings
}) {
  return (
    <>
      <section className="mt-8">
        <h4
          className="border-l-4 pl-3 text-base font-black"
          style={{
            borderColor:
              settings.primaryColor,
          }}
        >
          Opis radova
        </h4>

        <div className="mt-4 rounded-xl border border-slate-200 p-5 text-sm leading-6 text-slate-600">
          Izvršen pregled i servis plinskog bojlera.
          Očišćen izmjenjivač, provjeren tlak sustava
          i ispitana sigurnost rada uređaja.
        </div>
      </section>

      <section className="mt-8">
        <h4
          className="border-l-4 pl-3 text-base font-black"
          style={{
            borderColor:
              settings.primaryColor,
          }}
        >
          Utrošeni materijal
        </h4>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr
              className="text-left text-white"
              style={{
                backgroundColor:
                  settings.primaryColor,
              }}
            >
              <th className="px-3 py-3">
                Materijal
              </th>
              <th className="px-3 py-3 text-center">
                Količina
              </th>
              <th className="px-3 py-3 text-right">
                Cijena
              </th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-3">
                Brtva servisnog poklopca
              </td>
              <td className="px-3 py-3 text-center">
                1 kom
              </td>
              <td className="px-3 py-3 text-right">
                {formatCurrency(18)}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="px-3 py-3">
                Sredstvo za čišćenje
              </td>
              <td className="px-3 py-3 text-center">
                1 kom
              </td>
              <td className="px-3 py-3 text-right">
                {formatCurrency(12)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Vrijeme rada
          </p>

          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
            <p>Dolazak: 09:00</p>
            <p className="mt-1">Odlazak: 11:30</p>
            <p className="mt-1 font-black">
              Trajanje: 2 h 30 min
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Ukupna vrijednost
          </p>

          <p
            className="mt-3 text-3xl font-black"
            style={{
              color:
                settings.primaryColor,
            }}
          >
            {formatCurrency(155)}
          </p>
        </div>
      </section>

      <section className="mt-12 grid grid-cols-2 gap-12">
        <SignatureArea
          title="Izvršitelj"
          image={settings.signatureUrl}
        />

        <SignatureArea
          title="Investitor"
        />
      </section>

      {settings.stampUrl && (
        <img
          src={settings.stampUrl}
          alt="Pečat"
          className="absolute bottom-28 left-1/2 h-24 max-w-40 -translate-x-1/2 object-contain opacity-90"
        />
      )}
    </>
  )
}

function FinancialDocumentContent({
  type,
  settings,
}: {
  type: 'offer' | 'invoice'
  settings: CompanySettings
}) {
  const items = [
    {
      name: 'Servis plinskog bojlera',
      quantity: 1,
      unit: 'usl',
      price: 120,
      vat: settings.defaultVatRate,
    },
    {
      name: 'Potrošni materijal',
      quantity: 1,
      unit: 'kompl',
      price: 30,
      vat: settings.defaultVatRate,
    },
  ]

  const net = items.reduce(
    (sum, item) =>
      sum + item.quantity * item.price,
    0,
  )

  const vat =
    net *
    ((settings.defaultVatRate || 0) /
      100)

  return (
    <>
      <section className="mt-8">
        <h4
          className="border-l-4 pl-3 text-base font-black"
          style={{
            borderColor:
              settings.primaryColor,
          }}
        >
          {type === 'offer'
            ? 'Predmet ponude'
            : 'Stavke računa'}
        </h4>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Servis i održavanje sustava grijanja prema
          dogovoru s kupcem.
        </p>
      </section>

      <table className="mt-7 w-full border-collapse text-sm">
        <thead>
          <tr
            className="text-left text-white"
            style={{
              backgroundColor:
                settings.primaryColor,
            }}
          >
            <th className="px-3 py-3">
              R.br.
            </th>
            <th className="px-3 py-3">
              Naziv stavke
            </th>
            <th className="px-3 py-3 text-center">
              Kol.
            </th>
            <th className="px-3 py-3 text-center">
              JM
            </th>
            <th className="px-3 py-3 text-right">
              Cijena
            </th>
            <th className="px-3 py-3 text-right">
              PDV
            </th>
            <th className="px-3 py-3 text-right">
              Ukupno
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.name}
              className="border-b border-slate-200"
            >
              <td className="px-3 py-3">
                {index + 1}
              </td>
              <td className="px-3 py-3 font-bold">
                {item.name}
              </td>
              <td className="px-3 py-3 text-center">
                {item.quantity}
              </td>
              <td className="px-3 py-3 text-center">
                {item.unit}
              </td>
              <td className="px-3 py-3 text-right">
                {formatCurrency(item.price)}
              </td>
              <td className="px-3 py-3 text-right">
                {item.vat}%
              </td>
              <td className="px-3 py-3 text-right font-black">
                {formatCurrency(
                  item.price *
                    (1 + item.vat / 100),
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="ml-auto mt-8 w-80 rounded-xl bg-slate-50 p-5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Osnovica</span>
          <strong>
            {formatCurrency(net)}
          </strong>
        </div>

        <div className="mt-3 flex justify-between text-sm text-slate-600">
          <span>
            PDV {settings.defaultVatRate}%
          </span>
          <strong>
            {formatCurrency(vat)}
          </strong>
        </div>

        <div
          className="mt-4 flex justify-between border-t pt-4 text-lg font-black"
          style={{
            borderColor:
              `${settings.primaryColor}55`,
            color:
              settings.primaryColor,
          }}
        >
          <span>Ukupno</span>
          <span>
            {formatCurrency(net + vat)}
          </span>
        </div>
      </section>

      {type === 'offer' && (
        <section className="mt-8 rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Uvjeti plaćanja
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Plaćanje u roku od{' '}
            {settings.defaultPaymentDays} dana.
            Ponuda vrijedi{' '}
            {settings.defaultOfferValidityDays}{' '}
            dana.
          </p>
        </section>
      )}

      <section className="mt-10 grid grid-cols-2 gap-12">
        <SignatureArea
          title="Odgovorna osoba"
          image={settings.signatureUrl}
        />

        {settings.stampUrl ? (
          <div className="text-center">
            <img
              src={settings.stampUrl}
              alt="Pečat"
              className="mx-auto h-24 max-w-40 object-contain"
            />
            <p className="mt-2 text-xs font-bold text-slate-500">
              Pečat tvrtke
            </p>
          </div>
        ) : (
          <SignatureArea title="Pečat tvrtke" />
        )}
      </section>
    </>
  )
}

function SignatureArea({
  title,
  image,
}: {
  title: string
  image?: string
}) {
  return (
    <div className="text-center">
      <div className="flex h-20 items-end justify-center">
        {image && (
          <img
            src={image}
            alt={title}
            className="max-h-20 max-w-44 object-contain"
          />
        )}
      </div>

      <div className="border-t border-slate-400 pt-2">
        <p className="text-xs font-bold text-slate-500">
          {title}
        </p>
      </div>
    </div>
  )
}
