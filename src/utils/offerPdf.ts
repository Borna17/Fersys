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

export type OfferPdfItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
  imageDataUrl?: string
  imageName?: string
}

export type OfferPdfData = {
  id: string
  offerNumber: string
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
  date: string
  validUntil: string
  status: string
  responsiblePerson: string
  description: string
  internalNote: string
  paymentTerms: string
  items: OfferPdfItem[]
  createdAt: string
  updatedAt: string
  version: number
}

export type OfferPdfSettings = {
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
  showItemImages: boolean
  showSignature: boolean
  showStamp: boolean
  showFooter: boolean
  showWatermark: boolean

  documentTitle: string
  footerText: string
  watermarkText: string
}

const DEFAULT_APPEARANCE =
  createPresetAppearance('offer', 'modern')

const DEFAULT_SETTINGS: OfferPdfSettings = {
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
  showItemImages: DEFAULT_APPEARANCE.showItemImages,
  showSignature: DEFAULT_APPEARANCE.showSignature,
  showStamp: DEFAULT_APPEARANCE.showStamp,
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
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('hr-HR')
}

function itemNet(item: OfferPdfItem) {
  return item.quantity * item.price * (1 - item.discount / 100)
}

function itemVat(item: OfferPdfItem) {
  return itemNet(item) * (item.vat / 100)
}

function itemTotal(item: OfferPdfItem) {
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
): Partial<OfferPdfSettings> {
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
): Partial<OfferPdfSettings> {
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
    showItemImages: appearance.showItemImages,
    documentTitle: appearance.documentTitle || 'PONUDA',
    footerText: /fersys/i.test(appearance.footerText || '')
      ? 'Hvala na povjerenju.'
      : appearance.footerText,
    watermarkText: appearance.watermarkText,
  }
}

type OfferPage = {
  items: OfferPdfItem[]
  first: boolean
  final: boolean
}

function itemWeight(
  item: OfferPdfItem,
  settings: OfferPdfSettings,
) {
  return (
    1 +
    Math.min(1.2, (item.name.length + item.description.length) / 180) +
    (settings.showItemImages && item.imageDataUrl ? 1.35 : 0)
  )
}

function paginateItems(
  items: OfferPdfItem[],
  settings: OfferPdfSettings,
): OfferPage[] {
  const pages: OfferPage[] = []
  let current: OfferPdfItem[] = []
  let weight = 0
  let first = true

  for (const item of items) {
    const row = itemWeight(item, settings)
    const capacity =
      settings.density === 'compact'
        ? first
          ? 8.3
          : 11
        : first
          ? 7
          : 9.5

    if (current.length && weight + row > capacity) {
      pages.push({
        items: current,
        first,
        final: false,
      })
      current = []
      weight = 0
      first = false
    }

    current.push(item)
    weight += row
  }

  pages.push({
    items: current,
    first,
    final: true,
  })

  pages.forEach((page, index) => {
    page.final = index === pages.length - 1
  })

  return pages
}

function companyHtml(settings: OfferPdfSettings) {
  const logo =
    settings.showLogo && settings.logoDataUrl
      ? `<img class="company-logo" src="${esc(
          settings.logoDataUrl,
        )}" alt="Logo tvrtke" />`
      : ''

  const details = [
    settings.companyAddress,
    settings.companyOib ? `OIB: ${settings.companyOib}` : '',
    [
      settings.companyPhone,
      settings.companyEmail,
      settings.companyWebsite,
    ]
      .filter(Boolean)
      .join(' • '),
  ].filter(Boolean)

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
          ${details
            .map((line) => `<div>${esc(line)}</div>`)
            .join('')}
        </div>
      </div>
    </div>
  `
}

function sectionTitle(
  label: string,
  settings: OfferPdfSettings,
) {
  return `
    <div class="section-title section-${esc(
      settings.sectionStyle,
    )}">
      ${esc(label)}
    </div>
  `
}

function partyHtml(
  offer: OfferPdfData,
  settings: OfferPdfSettings,
) {
  const address = [offer.address, offer.city]
    .filter(Boolean)
    .join(', ')

  return `
    <section class="party-grid info-${esc(settings.infoStyle)}">
      <article class="party-card">
        <div class="eyebrow">NARUČITELJ</div>
        <div class="party-name">${esc(offer.customerName)}</div>
        <div class="party-details">
          ${address ? `<div>${esc(address)}</div>` : ''}
          ${offer.oib ? `<div>OIB: ${esc(offer.oib)}</div>` : ''}
          ${offer.email ? `<div>${esc(offer.email)}</div>` : ''}
          ${offer.phone ? `<div>${esc(offer.phone)}</div>` : ''}
        </div>
      </article>

      <article class="party-card">
        <div class="eyebrow">PODACI PONUDE</div>
        <div class="meta"><span>Datum</span><strong>${date(
          offer.date,
        )}</strong></div>
        <div class="meta"><span>Vrijedi do</span><strong>${date(
          offer.validUntil,
        )}</strong></div>
        <div class="meta"><span>Status</span><strong>${esc(
          offer.status,
        )}</strong></div>
        <div class="meta"><span>Izradio</span><strong>${esc(
          offer.responsiblePerson || '—',
        )}</strong></div>
      </article>
    </section>
  `
}

function itemRows(
  items: OfferPdfItem[],
  start: number,
  settings: OfferPdfSettings,
) {
  return items
    .map((item, index) => {
      const image =
        settings.showItemImages && item.imageDataUrl
          ? `<img class="item-image" src="${esc(
              item.imageDataUrl,
            )}" alt="${esc(item.imageName || item.name)}" />`
          : ''

      return `
        <article class="item-row ${
          image ? 'with-image' : ''
        }">
          <div class="item-index">${String(start + index + 1).padStart(
            2,
            '0',
          )}</div>

          ${image ? `<div class="item-image-box">${image}</div>` : ''}

          <div class="item-main">
            <div class="item-name">${esc(item.name)}</div>
            ${
              item.description
                ? `<div class="item-description">${multi(
                    item.description,
                  )}</div>`
                : ''
            }
          </div>

          <div class="item-data">
            <small>KOL.</small>
            ${number(item.quantity)} ${esc(item.unit)}
          </div>

          <div class="item-data">
            <small>CIJENA</small>
            ${currency(item.price)}
            ${
              item.discount > 0
                ? `<div class="discount">-${number(
                    item.discount,
                  )}%</div>`
                : ''
            }
          </div>

          <div class="item-data total">
            <small>UKUPNO</small>
            ${currency(itemTotal(item))}
          </div>
        </article>
      `
    })
    .join('')
}

function finalHtml(
  offer: OfferPdfData,
  settings: OfferPdfSettings,
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

  const signature =
    settings.signatureDataUrl
      ? `<img class="signature" src="${esc(
          settings.signatureDataUrl,
        )}" alt="Potpis" />`
      : ''

  return `
    <section class="final-grid">
      <div class="notes">
        <div class="eyebrow">NAPOMENA I UVJETI</div>
        ${
          offer.description
            ? `<div class="note">${multi(offer.description)}</div>`
            : ''
        }
        ${
          offer.paymentTerms
            ? `<div class="note">${multi(offer.paymentTerms)}</div>`
            : ''
        }
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
          <span>UKUPNO</span>
          <strong>${currency(total)}</strong>
        </div>
      </div>
    </section>

    ${
      settings.showSignature
        ? `
          <section class="signature-grid">
            <div class="signature-box">
              <div class="signature-label">Ponudu izradio</div>
              <div class="signature-visual">${signature}${stamp}</div>
              <div class="signature-name">${esc(
                offer.responsiblePerson || settings.companyName,
              )}</div>
            </div>

            <div class="signature-box">
              <div class="signature-label">Prihvat ponude / investitor</div>
              <div class="signature-visual"></div>
              <div class="signature-name">${esc(
                offer.customerName,
              )}</div>
            </div>
          </section>
        `
        : ''
    }
  `
}

function css(settings: OfferPdfSettings) {
  const p = settings.primaryColor
  const s = settings.secondaryColor
  const t = settings.textColor
  const b = settings.borderColor
  const bg = settings.backgroundColor
  const compact = settings.density === 'compact'
  const preset = settings.preset

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
    .toolbar button{border:0;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer}
    .toolbar .primary{background:${p};color:#fff}
    .toolbar .secondary{background:#1e293b;color:#e2e8f0}

    .pages{padding:14px 0 28px}
    .page{
      position:relative;display:flex;width:210mm;height:297mm;margin:0 auto 14px;
      overflow:hidden;flex-direction:column;padding:${
        compact ? '10mm 11mm 9mm' : '11mm 12mm 9mm'
      };
      background:${bg};box-shadow:0 18px 55px rgba(15,23,42,.18);break-after:page
    }

    .page::before{
      position:absolute;left:0;right:0;top:0;height:${
        preset === 'minimal' ? '2px' : preset === 'classic' ? '4px' : '6px'
      };
      background:${preset === 'classic' ? s : p};content:""
    }

    .page-content{display:flex;min-height:0;height:100%;flex-direction:column}
    .watermark{
      position:absolute;left:50%;top:54%;transform:translate(-50%,-50%) rotate(-30deg);
      color:${p};font-size:64px;font-weight:950;opacity:.035;white-space:nowrap
    }

    .company{display:flex;min-width:0;align-items:center;gap:10px}
    .company-logo{width:${compact ? 48 : 55}px;height:${
      compact ? 48 : 55
    }px;object-fit:contain}
    .company-name{font-size:${compact ? 13 : 15}px;font-weight:950}
    .company-subtitle{margin-top:2px;font-size:6px;color:${alpha(t, '82')}}
    .company-details{margin-top:5px;font-size:${
      compact ? 5.6 : 6.2
    }px;line-height:1.4;color:${alpha(t, '82')}}

    .header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
    .align-center{flex-direction:column;align-items:center;text-align:center}
    .align-right{flex-direction:row-reverse;text-align:right}

    .offer-heading{margin-top:${compact ? 22 : 28}px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
    .offer-kicker{color:${p};font-size:6px;font-weight:950;letter-spacing:.15em;text-transform:uppercase}
    .offer-title{margin-top:4px;font-size:${
      compact ? 27 : 32
    }px;line-height:.95;font-weight:950}
    .offer-number{text-align:right;font-size:7px;color:${alpha(t, '88')}}
    .offer-number strong{display:block;color:${t};font-size:${
      compact ? 10 : 11
    }px;margin-bottom:4px}

    .party-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
    .party-card{min-height:${compact ? 64 : 72}px;padding:${
      compact ? 8 : 10
    }px;border:1px solid ${b};border-radius:${
      preset === 'minimal' ? 4 : 7
    }px}
    .info-lines .party-card{border-width:0 0 1px 0;border-radius:0;padding-left:0;padding-right:0}
    .eyebrow{font-size:5.4px;font-weight:950;text-transform:uppercase;color:${alpha(t, '70')}}
    .party-name{margin-top:6px;font-size:${compact ? 8 : 9}px;font-weight:950}
    .party-details{margin-top:4px;font-size:${
      compact ? 5.5 : 6
    }px;line-height:1.35;color:${alpha(t, '82')}}
    .meta{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid ${alpha(b, '88')};font-size:5.8px}
    .meta:last-child{border-bottom:0}
    .meta span{color:${alpha(t, '75')}}

    .section-title{margin:${compact ? '10px 0 5px' : '13px 0 7px'};font-size:${
      compact ? 6.4 : 7
    }px;font-weight:950;text-transform:uppercase}
    .section-bar{padding:6px 8px;border-radius:5px;background:${p};color:#fff}
    .section-line{padding-bottom:4px;border-bottom:1.5px solid ${p};color:${p}}
    .section-plain{color:${t}}

    .items{border:1px solid ${b};border-radius:${
      preset === 'minimal' ? 4 : 7
    }px;overflow:hidden}
    .item-row{
      display:grid;grid-template-columns:27px minmax(0,1fr) 72px 85px 92px;
      gap:8px;align-items:center;min-height:${
        compact ? 38 : 44
      }px;padding:${compact ? '5px 7px' : '6px 8px'};border-top:1px solid ${b}
    }
    .item-row:first-child{border-top:0}
    .item-row.with-image{grid-template-columns:27px 70px minmax(0,1fr) 72px 85px 92px}
    .table-soft .item-row:nth-child(even){background:${alpha(p, '06')}}
    .table-minimal .items{border-left:0;border-right:0;border-radius:0}
    .table-solid .item-row:first-child{box-shadow:inset 0 5px 0 ${p}}
    .item-index{color:${p};font-size:7px;font-weight:950;text-align:center}
    .item-image-box{width:70px;height:${
      compact ? 43 : 48
    }px;display:grid;place-items:center;overflow:hidden;border:1px solid ${b};border-radius:5px;background:#fff}
    .item-image{width:100%;height:100%;object-fit:contain}
    .item-name{font-size:${compact ? 7.3 : 8}px;font-weight:950}
    .item-description{margin-top:2px;font-size:${
      compact ? 5.7 : 6.2
    }px;line-height:1.35;color:${alpha(t, '82')}}
    .item-data{padding-left:6px;border-left:1px solid ${b};font-size:${
      compact ? 5.8 : 6.3
    }px;text-align:right}
    .item-data small{display:block;margin-bottom:2px;font-size:4.8px;color:${alpha(t, '70')}}
    .item-data.total{font-weight:950}
    .discount{margin-top:2px;font-size:4.8px;color:${alpha(t, '70')}}

    .final-grid{display:grid;grid-template-columns:1fr 255px;gap:22px;margin-top:14px}
    .note{margin-top:6px;font-size:6.2px;line-height:1.4;color:${alpha(t, '90')}}
    .totals>div{display:flex;justify-content:space-between;gap:12px;padding:4px 6px;border-bottom:1px solid ${b};font-size:6.4px}
    .totals .grand{margin-top:5px;border:0;border-radius:6px;padding:8px 9px;background:${
      preset === 'classic' ? s : preset === 'minimal' ? alpha(t, '0B') : alpha(p, '18')
    };color:${preset === 'classic' ? '#fff' : p};font-size:10px;font-weight:950}

    .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:13px}
    .signature-box{height:78px;padding:7px 9px;border:1px solid ${b};border-radius:${
      preset === 'minimal' ? 4 : 7
    }px}
    .signature-label{font-size:5.3px;color:${alpha(t, '72')}}
    .signature-visual{display:flex;height:48px;align-items:center;justify-content:center;gap:10px}
    .signature,.stamp{max-width:95px;max-height:42px;object-fit:contain}
    .signature-name{font-size:6.4px;font-weight:900}

    .continuation{margin-top:14px;font-size:6px;font-weight:900;color:${alpha(t, '75')};text-transform:uppercase}
    .footer{display:flex;justify-content:space-between;gap:15px;margin-top:auto;padding-top:7px;border-top:1px solid ${b};font-size:5.2px;color:${alpha(t, '6F')}}

    @media print{
      @page{size:A4;margin:0}
      html,body{background:#fff}
      .toolbar{display:none!important}
      .pages{padding:0}
      .page{margin:0;box-shadow:none}
    }
  `
}

function buildPage(
  page: OfferPage,
  pageIndex: number,
  totalPages: number,
  startIndex: number,
  offer: OfferPdfData,
  settings: OfferPdfSettings,
  totals: {
    base: number
    net: number
    vat: number
    discount: number
    total: number
  },
) {
  return `
    <section class="page">
      ${
        settings.showWatermark && settings.watermarkText
          ? `<div class="watermark">${esc(settings.watermarkText)}</div>`
          : ''
      }

      <div class="page-content">
        <header class="header align-${esc(settings.headerAlignment)}">
          ${companyHtml(settings)}
        </header>

        <div class="offer-heading">
          <div>
            <div class="offer-kicker">KOMERCIJALNA PONUDA</div>
            <div class="offer-title">${esc(
              settings.documentTitle || 'PONUDA',
            )}</div>
          </div>

          <div class="offer-number">
            <strong>${esc(offer.offerNumber)}</strong>
            Vrijedi do ${date(offer.validUntil)}
          </div>
        </div>

        ${
          page.first
            ? partyHtml(offer, settings)
            : `<div class="continuation">Nastavak ponude ${esc(
                offer.offerNumber,
              )}</div>`
        }

        ${sectionTitle('Stavke ponude', settings)}

        <div class="table-${esc(settings.tableStyle)}">
          <div class="items">
            ${itemRows(page.items, startIndex, settings)}
          </div>
        </div>

        ${
          page.final
            ? finalHtml(
                offer,
                settings,
                totals.base,
                totals.net,
                totals.vat,
                totals.discount,
                totals.total,
              )
            : ''
        }

        ${
          settings.showFooter
            ? `<footer class="footer">
                <span>${esc(settings.footerText || '')}</span>
                <span>${pageIndex + 1} / ${totalPages}</span>
              </footer>`
            : ''
        }
      </div>
    </section>
  `
}

export function buildOfferPdfHtml(
  offer: OfferPdfData,
  customSettings: Partial<OfferPdfSettings> = {},
) {
  const settings: OfferPdfSettings = {
    ...DEFAULT_SETTINGS,
    ...customSettings,
  }

  const items = offer.items.filter((item) => item.name.trim())
  const base = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  )
  const net = items.reduce((sum, item) => sum + itemNet(item), 0)
  const vat = items.reduce((sum, item) => sum + itemVat(item), 0)
  const discount = base - net
  const total = net + vat
  const pages = paginateItems(items, settings)

  let index = 0
  const pageHtml = pages
    .map((page, pageIndex) => {
      const start = index
      index += page.items.length
      return buildPage(
        page,
        pageIndex,
        pages.length,
        start,
        offer,
        settings,
        { base, net, vat, discount, total },
      )
    })
    .join('')

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(offer.offerNumber)}</title>
  <style>${css(settings)}</style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Ispis / spremi kao PDF</button>
    <button class="secondary" onclick="window.close()">Zatvori</button>
  </div>
  <main class="pages">${pageHtml}</main>
</body>
</html>`
}

async function resolvedPdfSettings(
  customSettings: Partial<OfferPdfSettings>,
) {
  const [company, appearanceResult] = await Promise.all([
    getCompanySettings(),
    getDocumentAppearanceSettings(),
  ])

  return {
    ...DEFAULT_SETTINGS,
    ...companySettingsFromCurrent(company),
    ...appearanceToPdfSettings(appearanceResult.settings.offer),
    ...customSettings,
  } satisfies OfferPdfSettings
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

export function openOfferPdf(
  offer: OfferPdfData,
  customSettings: Partial<OfferPdfSettings> = {},
) {
  const previewWindow = window.open('', '_blank')

  if (!previewWindow) {
    window.alert(
      'Preglednik je blokirao novi prozor. Dopusti skočne prozore za FERSYS.',
    )
    return
  }

  previewWindow.document.write(
    '<p style="font-family:system-ui;padding:24px">Priprema ponude...</p>',
  )

  void (async () => {
    try {
      const settings = await resolvedPdfSettings(customSettings)
      const html = buildOfferPdfHtml(offer, settings)
      previewWindow.document.open()
      previewWindow.document.write(html)
      previewWindow.document.close()
    } catch (error) {
      console.error(error)
      previewWindow.document.open()
      previewWindow.document.write(
        '<p style="font-family:system-ui;padding:24px">PDF ponude nije moguće izraditi.</p>',
      )
      previewWindow.document.close()
    }
  })()
}

export async function downloadOfferPdf(
  data: OfferPdfData,
  customSettings: Partial<OfferPdfSettings> = {},
) {
  try {
    const settings = await resolvedPdfSettings(customSettings)
    const html = buildOfferPdfHtml(data, settings)
    const fileName = `${safeFileName(
      data.offerNumber || 'Ponuda',
    )}-${safeFileName(data.customerName || 'Investitor')}.pdf`

    await renderHtmlPagesToPdf(
      html,
      fileName,
      settings.backgroundColor || '#FFFFFF',
    )
  } catch (error) {
    console.error('downloadOfferPdf error:', error)
    window.alert(
      error instanceof Error
        ? `PDF nije moguće izraditi: ${error.message}`
        : 'PDF nije moguće izraditi.',
    )
  }
}