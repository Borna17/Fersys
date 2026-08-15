import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import {
  getCompanySettings,
} from '../services/companySettings.service'
import {
  getDocumentAppearanceSettings,
} from '../services/documentAppearance.service'
import {
  createPresetAppearance,
  type DocumentAppearance,
} from '../types/documentAppearance'

export type InvoicePdfItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
}

export type InvoicePdfData = {
  id: string
  invoiceNumber: string
  customerName: string
  customerType:
    | 'Fizička osoba'
    | 'Tvrtka'
    | 'Zgrada'
  oib: string
  email: string
  phone: string
  address: string
  city: string
  issueDate: string
  dueDate: string
  serviceDate: string
  status: string
  responsiblePerson: string
  description: string
  internalNote: string
  paymentMethod: string
  paymentModel: string
  paymentReference: string
  iban: string
  items: InvoicePdfItem[]
  createdAt: string
  updatedAt: string
  paidAt?: string
}

export type InvoicePdfSettings = {
  companyName: string
  companySubtitle: string
  companyAddress: string
  companyOib: string
  companyIban: string
  companyEmail: string
  companyPhone: string
  companyWebsite: string
  logoDataUrl?: string
  stampDataUrl?: string
  signatureDataUrl?: string

  preset: DocumentAppearance['preset']
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  borderColor: string
  backgroundColor: string

  headerAlignment:
    | 'left'
    | 'center'
    | 'right'
  density:
    | 'comfortable'
    | 'compact'
  infoStyle:
    | 'cards'
    | 'lines'
  tableStyle:
    | 'solid'
    | 'soft'
    | 'minimal'
  sectionStyle:
    | 'bar'
    | 'line'
    | 'plain'

  showLogo: boolean
  showStamp: boolean
  showSignature: boolean
  showFooter: boolean
  showWatermark: boolean

  documentTitle: string
  footerText: string
  watermarkText: string
}

const DEFAULT_APPEARANCE =
  createPresetAppearance('invoice', 'modern')

const DEFAULT_SETTINGS: InvoicePdfSettings = {
  companyName: 'Tvrtka',
  companySubtitle: '',
  companyAddress: '',
  companyOib: '',
  companyIban: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  logoDataUrl: undefined,
  stampDataUrl: undefined,
  signatureDataUrl: undefined,

  preset: DEFAULT_APPEARANCE.preset,
  primaryColor: DEFAULT_APPEARANCE.primaryColor,
  secondaryColor: DEFAULT_APPEARANCE.secondaryColor,
  accentColor: DEFAULT_APPEARANCE.accentColor,
  textColor: DEFAULT_APPEARANCE.textColor,
  borderColor: DEFAULT_APPEARANCE.borderColor,
  backgroundColor: DEFAULT_APPEARANCE.backgroundColor,

  headerAlignment: DEFAULT_APPEARANCE.headerAlignment,
  density: DEFAULT_APPEARANCE.density,
  infoStyle: DEFAULT_APPEARANCE.infoStyle,
  tableStyle: DEFAULT_APPEARANCE.tableStyle,
  sectionStyle: DEFAULT_APPEARANCE.sectionStyle,

  showLogo: DEFAULT_APPEARANCE.showLogo,
  showStamp: DEFAULT_APPEARANCE.showStamp,
  showSignature: DEFAULT_APPEARANCE.showSignature,
  showFooter: DEFAULT_APPEARANCE.showFooter,
  showWatermark: DEFAULT_APPEARANCE.showWatermark,

  documentTitle: DEFAULT_APPEARANCE.documentTitle,
  footerText: DEFAULT_APPEARANCE.footerText,
  watermarkText: DEFAULT_APPEARANCE.watermarkText,
}

const esc = (
  value: string | number | null | undefined,
) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const multi = (value: string) =>
  esc(value).replace(/\r?\n/g, '<br />')

function alpha(color: string, opacity: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
    ? `${color}${opacity}`
    : color
}

function currency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function number(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    maximumFractionDigits: 2,
  }).format(value)
}

function date(value: string) {
  if (!value) return '—'
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('hr-HR')
}

function itemNet(item: InvoicePdfItem) {
  return item.quantity * item.price * (1 - item.discount / 100)
}

function itemVat(item: InvoicePdfItem) {
  return itemNet(item) * (item.vat / 100)
}

function itemTotal(item: InvoicePdfItem) {
  return itemNet(item) + itemVat(item)
}

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
}

function companySettingsFromCurrent(
  settings: Awaited<
    ReturnType<typeof getCompanySettings>
  >,
): Partial<InvoicePdfSettings> {
  return {
    companyName: settings.name,
    companySubtitle: settings.documentWatermark,
    companyAddress: [
      settings.address,
      [settings.postalCode, settings.city]
        .filter(Boolean)
        .join(' '),
    ]
      .filter(Boolean)
      .join(', '),
    companyOib: settings.oib,
    companyIban: settings.iban,
    companyEmail: settings.email,
    companyPhone: settings.phone,
    companyWebsite: settings.website,
    logoDataUrl: settings.logoUrl || undefined,
    stampDataUrl: settings.stampUrl || undefined,
    signatureDataUrl: settings.signatureUrl || undefined,
  }
}

function appearanceToPdfSettings(
  appearance: DocumentAppearance,
): Partial<InvoicePdfSettings> {
  return {
    preset: appearance.preset,
    primaryColor: appearance.primaryColor,
    secondaryColor: appearance.secondaryColor,
    accentColor: appearance.accentColor,
    textColor: appearance.textColor,
    borderColor: appearance.borderColor,
    backgroundColor: appearance.backgroundColor,
    headerAlignment: appearance.headerAlignment,
    density: appearance.density,
    infoStyle: appearance.infoStyle,
    tableStyle: appearance.tableStyle,
    sectionStyle: appearance.sectionStyle,
    showLogo: appearance.showLogo,
    showStamp: appearance.showStamp,
    showSignature: appearance.showSignature,
    showFooter: appearance.showFooter,
    showWatermark: appearance.showWatermark,
    documentTitle: appearance.documentTitle || 'RAČUN',
    footerText: /fersys/i.test(appearance.footerText || '')
      ? 'Hvala na povjerenju.'
      : appearance.footerText,
    watermarkText: appearance.watermarkText,
  }
}

function paginateItems(items: InvoicePdfItem[]) {
  const pages: InvoicePdfItem[][] = []
  let current: InvoicePdfItem[] = []
  let weight = 0
  let first = true

  for (const item of items) {
    const rowWeight =
      1 + Math.min(1.2, item.description.length / 170)
    const capacity = first ? 12 : 17

    if (current.length && weight + rowWeight > capacity) {
      pages.push(current)
      current = []
      weight = 0
      first = false
    }

    current.push(item)
    weight += rowWeight
  }

  if (current.length || !pages.length) pages.push(current)
  return pages
}

function companyHtml(settings: InvoicePdfSettings) {
  const logo =
    settings.showLogo && settings.logoDataUrl
      ? `<img class="company-logo" src="${esc(
          settings.logoDataUrl,
        )}" alt="Logo tvrtke" />`
      : ''

  return `
    <div class="company">
      ${logo}
      <div class="company-copy">
        <div class="company-name">${esc(settings.companyName)}</div>
        ${
          settings.companySubtitle
            ? `<div class="company-subtitle">${esc(
                settings.companySubtitle,
              )}</div>`
            : ''
        }
        <div class="company-details">
          ${settings.companyAddress ? `<div>${esc(settings.companyAddress)}</div>` : ''}
          ${settings.companyOib ? `<div>OIB: ${esc(settings.companyOib)}</div>` : ''}
          ${
            settings.companyPhone || settings.companyEmail
              ? `<div>${esc(
                  [settings.companyPhone, settings.companyEmail]
                    .filter(Boolean)
                    .join(' • '),
                )}</div>`
              : ''
          }
        </div>
      </div>
    </div>
  `
}

function customerHtml(invoice: InvoicePdfData) {
  return `
    <div class="customer-block">
      <div class="eyebrow">KUPAC</div>
      <div class="customer-name">${esc(invoice.customerName)}</div>
      <div class="customer-details">
        ${
          invoice.address || invoice.city
            ? `<div>${esc(
                [invoice.address, invoice.city]
                  .filter(Boolean)
                  .join(', '),
              )}</div>`
            : ''
        }
        ${invoice.oib ? `<div>OIB: ${esc(invoice.oib)}</div>` : ''}
        ${invoice.email ? `<div>${esc(invoice.email)}</div>` : ''}
        ${invoice.phone ? `<div>${esc(invoice.phone)}</div>` : ''}
      </div>
    </div>
  `
}

function sectionTitle(
  label: string,
  settings: InvoicePdfSettings,
) {
  return `
    <div class="section-title section-${esc(
      settings.sectionStyle,
    )}">
      ${esc(label)}
    </div>
  `
}

function itemRows(
  items: InvoicePdfItem[],
  startIndex: number,
) {
  return items
    .map(
      (item, index) => `
        <div class="item-row">
          <div class="item-main">
            <strong>${startIndex + index + 1}. ${esc(item.name)}</strong>
            ${
              item.description
                ? `<small>${multi(item.description)}</small>`
                : ''
            }
          </div>
          <span>${number(item.quantity)} ${esc(item.unit)}</span>
          <span>${currency(item.price)}</span>
          <strong>${currency(itemTotal(item))}</strong>
        </div>
      `,
    )
    .join('')
}

function sidebarHtml(
  invoice: InvoicePdfData,
  settings: InvoicePdfSettings,
  continuation: boolean,
) {
  return `
    <aside class="sidebar">
      ${companyHtml(settings)}

      <div class="invoice-title">
        ${esc(settings.documentTitle || 'RAČUN')}
      </div>

      <div class="invoice-number">${esc(invoice.invoiceNumber)}</div>

      ${
        continuation
          ? `<div class="continuation">NASTAVAK DOKUMENTA</div>`
          : ''
      }

      <div class="sidebar-data">
        <div>
          <span>DATUM IZDAVANJA</span>
          <strong>${date(invoice.issueDate)}</strong>
        </div>
        <div>
          <span>DOSPIJEĆE</span>
          <strong>${date(invoice.dueDate)}</strong>
        </div>
        <div>
          <span>DATUM USLUGE</span>
          <strong>${date(invoice.serviceDate)}</strong>
        </div>
        <div>
          <span>IBAN</span>
          <strong>${esc(
            invoice.iban || settings.companyIban || '—',
          )}</strong>
        </div>
      </div>
    </aside>
  `
}

function totalsHtml(
  invoice: InvoicePdfData,
  settings: InvoicePdfSettings,
  base: number,
  net: number,
  vat: number,
  discount: number,
  total: number,
) {
  const stamp =
    settings.showStamp && settings.stampDataUrl
      ? `<img class="stamp" src="${esc(
          settings.stampDataUrl,
        )}" alt="Pečat" />`
      : ''

  return `
    <section class="bottom-grid">
      <div class="payment">
        <div class="eyebrow">PODACI ZA PLAĆANJE</div>
        <div class="pay-row">
          <span>Način plaćanja</span>
          <strong>${esc(
            invoice.paymentMethod || 'Transakcijski račun',
          )}</strong>
        </div>
        <div class="pay-row">
          <span>Model</span>
          <strong>${esc(invoice.paymentModel || 'HR00')}</strong>
        </div>
        <div class="pay-row">
          <span>Poziv na broj</span>
          <strong>${esc(
            invoice.paymentReference || invoice.invoiceNumber,
          )}</strong>
        </div>
      </div>

      <div class="totals">
        <div><span>Vrijednost</span><strong>${currency(base)}</strong></div>
        ${
          discount > 0
            ? `<div><span>Popust</span><strong>− ${currency(
                discount,
              )}</strong></div>`
            : ''
        }
        <div><span>Osnovica</span><strong>${currency(net)}</strong></div>
        <div><span>PDV</span><strong>${currency(vat)}</strong></div>
        <div class="grand">
          <span>UKUPNO ZA PLATITI</span>
          <strong>${currency(total)}</strong>
        </div>
      </div>
    </section>

    ${
      invoice.internalNote
        ? `<div class="note">${multi(invoice.internalNote)}</div>`
        : ''
    }

    <section class="issued-by">
      <div>
        <span>Račun izdao</span>
        <strong>${esc(
          invoice.responsiblePerson || settings.companyName,
        )}</strong>
      </div>
      ${stamp}
    </section>
  `
}

function css(settings: InvoicePdfSettings) {
  const p = settings.primaryColor
  const s = settings.secondaryColor
  const t = settings.textColor
  const b = settings.borderColor
  const bg = settings.backgroundColor
  const preset = settings.preset
  const compact = settings.density === 'compact'

  const side =
    preset === 'minimal'
      ? bg
      : preset === 'classic'
        ? s
        : s

  const sideText =
    preset === 'minimal'
      ? t
      : '#FFFFFF'

  return `
    *{box-sizing:border-box}
    html,body{
      margin:0;background:#dfe5ec;color:${t};
      font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      -webkit-print-color-adjust:exact;print-color-adjust:exact
    }

    .toolbar{
      position:sticky;top:0;z-index:20;display:flex;justify-content:center;
      gap:10px;padding:12px;background:rgba(15,23,42,.97)
    }
    .toolbar button{border:0;border-radius:10px;padding:10px 16px;font-weight:800}
    .toolbar .primary{background:${p};color:#fff}
    .toolbar .secondary{background:#1e293b;color:#fff}

    .pages{padding:14px 0 28px}

    .page{
      position:relative;display:grid;width:210mm;height:297mm;margin:0 auto 14px;
      overflow:hidden;grid-template-columns:${
        preset === 'minimal' ? '31% 69%' : '38% 62%'
      };
      background:${bg};box-shadow:0 18px 55px rgba(15,23,42,.18);break-after:page
    }

    .sidebar{
      position:relative;padding:${
        compact ? '11mm 8mm 9mm' : '12mm 9mm 10mm'
      };
      background:${side};color:${sideText};
      border-right:${preset === 'minimal' ? `1px solid ${b}` : '0'}
    }

    .sidebar::before{
      position:absolute;left:0;right:0;top:0;height:${
        preset === 'minimal' ? '2px' : preset === 'classic' ? '4px' : '6px'
      };
      background:${p};content:""
    }

    .company{display:flex;align-items:flex-start;gap:9px;min-width:0}
    .company-logo{width:${compact ? 42 : 48}px;height:${
      compact ? 42 : 48
    }px;object-fit:contain}
    .company-name{font-size:${compact ? 11.5 : 13}px;font-weight:950;color:${sideText}}
    .company-subtitle{margin-top:2px;font-size:5px;opacity:.65}
    .company-details{margin-top:5px;font-size:${
      compact ? 5.2 : 5.7
    }px;line-height:1.4;opacity:.7}

    .invoice-title{
      margin-top:${compact ? 30 : 38}px;font-size:${
        compact ? 27 : 31
      }px;line-height:.95;font-weight:950;color:${
        preset === 'minimal' ? p : sideText
      }
    }

    .invoice-number{margin-top:6px;font-size:8px;font-weight:950;opacity:.8}
    .continuation{margin-top:5px;font-size:5px;font-weight:900;letter-spacing:.1em;opacity:.55}

    .sidebar-data{margin-top:${compact ? 28 : 34}px;display:grid;gap:16px}
    .sidebar-data span{display:block;font-size:5px;font-weight:900;letter-spacing:.06em;opacity:.55}
    .sidebar-data strong{display:block;margin-top:4px;font-size:7px;line-height:1.35}

    .main{
      display:flex;min-height:0;height:100%;flex-direction:column;padding:${
        compact ? '11mm 10mm 9mm' : '12mm 11mm 10mm'
      }
    }

    .watermark{
      position:absolute;left:67%;top:54%;transform:translate(-50%,-50%) rotate(-30deg);
      color:${p};font-size:62px;font-weight:950;opacity:.03;white-space:nowrap
    }

    .customer-block{
      min-height:${compact ? 69 : 78}px;padding-bottom:10px;border-bottom:1px solid ${b}
    }
    .eyebrow{font-size:5.4px;font-weight:950;text-transform:uppercase;color:${alpha(t, '70')}}
    .customer-name{margin-top:6px;font-size:${compact ? 10 : 11}px;font-weight:950}
    .customer-details{margin-top:5px;font-size:${
      compact ? 5.7 : 6.2
    }px;line-height:1.4;color:${alpha(t, '82')}}

    .section-title{margin:${compact ? '12px 0 6px' : '15px 0 8px'};font-size:${
      compact ? 6.3 : 7
    }px;font-weight:950;text-transform:uppercase}
    .section-bar{padding:6px 8px;border-radius:5px;background:${p};color:#fff}
    .section-line{padding-bottom:4px;border-bottom:1.5px solid ${p};color:${p}}
    .section-plain{color:${t}}

    .table{overflow:hidden;border:1px solid ${b};border-radius:${
      preset === 'minimal' ? 4 : 7
    }px}
    .item-head,.item-row{display:grid;grid-template-columns:minmax(0,1.55fr) .55fr .8fr .9fr;gap:8px;align-items:center}
    .item-head{padding:${compact ? '5px 7px' : '6px 8px'};font-size:5px;font-weight:950;text-transform:uppercase}
    .table-solid .item-head{background:${p};color:#fff}
    .table-soft .item-head{background:${alpha(p, '18')};color:${t}}
    .table-minimal .item-head{background:transparent;color:${t}}
    .item-row{min-height:${compact ? 31 : 35}px;padding:${
      compact ? '4px 7px' : '5px 8px'
    };border-top:1px solid ${b};font-size:${compact ? 5.7 : 6.2}px}
    .item-row span,.item-row>strong{text-align:right}
    .item-main{text-align:left!important}
    .item-main strong{display:block;text-align:left}
    .item-main small{display:block;margin-top:2px;font-size:5px;line-height:1.3;color:${alpha(t, '78')}}
    .table-soft .item-row:nth-child(even){background:${alpha(p, '05')}}
    .table-minimal{border-left:0;border-right:0;border-radius:0}

    .description{
      margin-top:10px;padding:8px 9px;border-left:2px solid ${p};
      background:${alpha(p, '06')};font-size:6.2px;line-height:1.4;color:${alpha(t, '90')}
    }

    .bottom-grid{display:grid;grid-template-columns:1fr 220px;gap:18px;margin-top:15px}
    .pay-row{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid ${b};font-size:5.8px}
    .pay-row span{color:${alpha(t, '72')}}

    .totals>div{display:flex;justify-content:space-between;gap:12px;padding:4px 6px;border-bottom:1px solid ${b};font-size:6.2px}
    .totals .grand{margin-top:5px;border:0;border-radius:6px;padding:8px 9px;background:${
      preset === 'classic' ? s : preset === 'minimal' ? alpha(t, '0C') : alpha(p, '16')
    };color:${preset === 'classic' ? '#fff' : p};font-size:9.5px;font-weight:950}

    .note{margin-top:10px;padding:7px 8px;border:1px solid ${b};border-radius:6px;font-size:5.8px;line-height:1.4}
    .issued-by{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:12px;font-size:5.5px}
    .issued-by span{display:block;color:${alpha(t, '70')}}
    .issued-by strong{display:block;margin-top:2px;font-size:6.5px}
    .stamp{max-width:88px;max-height:48px;object-fit:contain}

    .footer{display:flex;justify-content:space-between;gap:15px;margin-top:auto;padding-top:7px;border-top:1px solid ${b};font-size:5px;color:${alpha(t, '6D')}}

    @media print{
      @page{size:A4;margin:0}
      html,body{background:#fff}
      .toolbar{display:none!important}
      .pages{padding:0}
      .page{margin:0;box-shadow:none}
    }
  `
}

export function buildInvoicePdfHtml(
  invoice: InvoicePdfData,
  customSettings: Partial<InvoicePdfSettings> = {},
) {
  const settings: InvoicePdfSettings = {
    ...DEFAULT_SETTINGS,
    ...customSettings,
  }

  const items = invoice.items.filter((item) => item.name.trim())
  const base = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  )
  const net = items.reduce((sum, item) => sum + itemNet(item), 0)
  const vat = items.reduce((sum, item) => sum + itemVat(item), 0)
  const discount = base - net
  const total = net + vat

  const pages = paginateItems(items)
  let itemIndex = 0

  const htmlPages = pages
    .map((pageItems, pageIndex) => {
      const first = pageIndex === 0
      const final = pageIndex === pages.length - 1
      const startIndex = itemIndex
      itemIndex += pageItems.length

      return `
        <section class="page">
          ${
            settings.showWatermark && settings.watermarkText
              ? `<div class="watermark">${esc(
                  settings.watermarkText,
                )}</div>`
              : ''
          }

          ${sidebarHtml(invoice, settings, !first)}

          <main class="main">
            ${customerHtml(invoice)}

            ${
              first && invoice.description
                ? `<div class="description">${multi(
                    invoice.description,
                  )}</div>`
                : ''
            }

            ${sectionTitle('Stavke računa', settings)}

            <div class="table table-${esc(settings.tableStyle)}">
              <div class="item-head">
                <span>OPIS</span>
                <span>KOL.</span>
                <span>CIJENA</span>
                <span>UKUPNO</span>
              </div>

              ${itemRows(pageItems, startIndex)}
            </div>

            ${
              final
                ? totalsHtml(
                    invoice,
                    settings,
                    base,
                    net,
                    vat,
                    discount,
                    total,
                  )
                : ''
            }

            ${
              settings.showFooter
                ? `<footer class="footer">
                    <span>${esc(settings.footerText || '')}</span>
                    <span>${esc(invoice.invoiceNumber)} · ${
                      pageIndex + 1
                    }/${pages.length}</span>
                  </footer>`
                : ''
            }
          </main>
        </section>
      `
    })
    .join('')

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(invoice.invoiceNumber)}</title>
  <style>${css(settings)}</style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Ispis / spremi kao PDF</button>
    <button class="secondary" onclick="window.close()">Zatvori</button>
  </div>
  <main class="pages">${htmlPages}</main>
</body>
</html>`
}

async function resolvedPdfSettings(
  customSettings: Partial<InvoicePdfSettings>,
) {
  const [company, appearanceResult] = await Promise.all([
    getCompanySettings(),
    getDocumentAppearanceSettings(),
  ])

  return {
    ...DEFAULT_SETTINGS,
    ...companySettingsFromCurrent(company),
    ...appearanceToPdfSettings(appearanceResult.settings.invoice),
    ...customSettings,
  } satisfies InvoicePdfSettings
}

async function waitForImages(doc: Document) {
  const images = Array.from(doc.querySelectorAll('img'))
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve()
            return
          }
          image.onload = () => resolve()
          image.onerror = () => resolve()
        }),
    ),
  )
}

async function renderHtmlPagesToPdf(
  html: string,
  fileName: string,
  backgroundColor: string,
) {
  const iframe = document.createElement('iframe')

  Object.assign(iframe.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '794px',
    height: '1123px',
    border: '0',
    pointerEvents: 'none',
    zIndex: '-2147483647',
  })

  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('PDF renderer nije dostupan.')

    doc.open()
    doc.write(html)
    doc.close()

    await new Promise<void>((resolve) =>
      window.setTimeout(resolve, 120),
    )
    await doc.fonts?.ready
    await waitForImages(doc)

    const toolbar = doc.querySelector('.toolbar') as HTMLElement | null
    if (toolbar) toolbar.style.display = 'none'

    const pages = Array.from(
      doc.querySelectorAll('.page'),
    ) as HTMLElement[]

    if (!pages.length) {
      throw new Error('PDF nema stranica za izradu.')
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    for (let i = 0; i < pages.length; i += 1) {
      pages[i].style.margin = '0'
      pages[i].style.boxShadow = 'none'

      const canvas = await html2canvas(pages[i], {
        scale: 3,
        backgroundColor,
        useCORS: true,
        allowTaint: false,
        logging: false,
      })

      const image = canvas.toDataURL('image/png')
      if (i > 0) pdf.addPage()

      pdf.addImage(
        image,
        'PNG',
        0,
        0,
        210,
        297,
        undefined,
        'FAST',
      )
    }

    pdf.save(fileName)
  } finally {
    iframe.remove()
  }
}

export function openInvoicePdf(
  invoice: InvoicePdfData,
  customSettings: Partial<InvoicePdfSettings> = {},
) {
  const previewWindow = window.open('', '_blank')

  if (!previewWindow) {
    window.alert(
      'Preglednik je blokirao novi prozor. Dopusti skočne prozore za FERSYS.',
    )
    return
  }

  previewWindow.document.write(
    '<p style="font-family:system-ui;padding:24px">Priprema računa...</p>',
  )

  void (async () => {
    try {
      const settings = await resolvedPdfSettings(customSettings)
      const html = buildInvoicePdfHtml(invoice, settings)
      previewWindow.document.open()
      previewWindow.document.write(html)
      previewWindow.document.close()
    } catch (error) {
      console.error(error)
      previewWindow.document.open()
      previewWindow.document.write(
        '<p style="font-family:system-ui;padding:24px">PDF računa nije moguće izraditi.</p>',
      )
      previewWindow.document.close()
    }
  })()
}

export async function downloadInvoicePdf(
  data: InvoicePdfData,
  customSettings: Partial<InvoicePdfSettings> = {},
) {
  try {
    const settings = await resolvedPdfSettings(customSettings)
    const html = buildInvoicePdfHtml(data, settings)
    const fileName = `${safeFileName(
      data.invoiceNumber || 'Racun',
    )}-${safeFileName(data.customerName || 'Kupac')}.pdf`

    await renderHtmlPagesToPdf(
      html,
      fileName,
      settings.backgroundColor || '#FFFFFF',
    )
  } catch (error) {
    console.error('downloadInvoicePdf error:', error)
    window.alert(
      error instanceof Error
        ? `PDF nije moguće izraditi: ${error.message}`
        : 'PDF nije moguće izraditi.',
    )
  }
}