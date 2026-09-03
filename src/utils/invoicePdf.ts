import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import {
  notifyDownloadError,
  notifyDownloadPreparing,
  saveBlobDownload,
} from './downloadFeedback'
import { getCompanySettings } from '../services/companySettings.service'
import { getDocumentAppearanceSettings } from '../services/documentAppearance.service'
import {
  createPresetAppearance,
  type DocumentAppearance,
} from '../types/documentAppearance'
import { createHub3Pdf417DataUrl } from './hub3Barcode'

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
  customerType: 'Fizička osoba' | 'Tvrtka' | 'Zgrada'
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
  complianceSnapshot?: {
    practiceDocument?: boolean
    countryCode?: string
    operatingMode?: string
    fiscalizationMode?: string
  }
}

export type InvoicePdfSettings = {
  companyName: string
  companySubtitle: string
  companyAddress: string
  companyStreetAddress: string
  companyPostalCity: string
  companyOib: string
  companyIban: string
  companyEmail: string
  companyPhone: string
  companyWebsite: string
  logoDataUrl?: string
  stampDataUrl?: string
  signatureDataUrl?: string
  quickPayBarcodeDataUrl?: string
  quickPayBarcodeError?: string
  preset: DocumentAppearance['preset']
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  borderColor: string
  backgroundColor: string
  headerAlignment: 'left' | 'center' | 'right'
  density: 'comfortable' | 'compact'
  infoStyle: 'cards' | 'lines'
  tableStyle: 'solid' | 'soft' | 'minimal'
  sectionStyle: 'bar' | 'line' | 'plain'
  showLogo: boolean
  showStamp: boolean
  showSignature: boolean
  showFooter: boolean
  showWatermark: boolean
  documentTitle: string
  footerText: string
  watermarkText: string
}

const DEFAULT_APPEARANCE = createPresetAppearance('invoice', 'modern')

const DEFAULT_SETTINGS: InvoicePdfSettings = {
  companyName: 'Tvrtka',
  companySubtitle: '',
  companyAddress: '',
  companyStreetAddress: '',
  companyPostalCity: '',
  companyOib: '',
  companyIban: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
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
  documentTitle: DEFAULT_APPEARANCE.documentTitle || 'RAČUN',
  footerText: DEFAULT_APPEARANCE.footerText,
  watermarkText: DEFAULT_APPEARANCE.watermarkText,
}

const esc = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const multi = (value: string) => esc(value).replace(/\r?\n/g, '<br />')

function alpha(color: string, opacity: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? `${color}${opacity}` : color
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
  }).format(Number.isFinite(value) ? value : 0)
}

function date(value: string) {
  if (!value) return '—'
  const parsed = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('hr-HR')
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-')
}

function itemBase(item: InvoicePdfItem) {
  return item.quantity * item.price
}

function itemNet(item: InvoicePdfItem) {
  return itemBase(item) * (1 - item.discount / 100)
}

function itemVat(item: InvoicePdfItem) {
  return itemNet(item) * (item.vat / 100)
}

function itemTotal(item: InvoicePdfItem) {
  return itemNet(item) + itemVat(item)
}

function calculateTotals(invoice: InvoicePdfData) {
  const items = invoice.items.filter((item) => item.name.trim())
  const base = items.reduce((sum, item) => sum + itemBase(item), 0)
  const net = items.reduce((sum, item) => sum + itemNet(item), 0)
  const vat = items.reduce((sum, item) => sum + itemVat(item), 0)
  return {
    items,
    base,
    net,
    vat,
    discount: base - net,
    total: net + vat,
  }
}

function companySettingsFromCurrent(
  settings: Awaited<ReturnType<typeof getCompanySettings>>,
): Partial<InvoicePdfSettings> {
  const postalCity = [settings.postalCode, settings.city].filter(Boolean).join(' ')
  return {
    companyName: settings.name,
    companySubtitle: settings.documentWatermark,
    companyAddress: [settings.address, postalCity, settings.country].filter(Boolean).join(', '),
    companyStreetAddress: settings.address,
    companyPostalCity: postalCity,
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
    footerText: appearance.footerText,
    watermarkText: appearance.watermarkText,
  }
}

function paginateItems(items: InvoicePdfItem[]) {
  if (!items.length) return [[]]

  const pages: InvoicePdfItem[][] = []
  let cursor = 0

  while (cursor < items.length) {
    const remaining = items.length - cursor
    const isFirst = pages.length === 0
    const finalCapacity = isFirst ? 6 : 8

    if (remaining <= finalCapacity) {
      pages.push(items.slice(cursor))
      break
    }

    const capacity = isFirst ? 9 : 11
    const take = Math.min(capacity, Math.max(1, remaining - 4))
    pages.push(items.slice(cursor, cursor + take))
    cursor += take
  }

  return pages
}

function companyHtml(settings: InvoicePdfSettings) {
  const logo = settings.showLogo && settings.logoDataUrl
    ? `<img class="company-logo" src="${esc(settings.logoDataUrl)}" alt="Logo tvrtke" />`
    : ''

  return `
    <div class="company company-${esc(settings.headerAlignment)}">
      ${logo}
      <div class="company-copy">
        <div class="company-name">${esc(settings.companyName)}</div>
        ${settings.companyAddress ? `<div>${esc(settings.companyAddress)}</div>` : ''}
        ${settings.companyOib ? `<div>OIB: ${esc(settings.companyOib)}</div>` : ''}
        ${settings.companyPhone || settings.companyEmail
          ? `<div>${esc([settings.companyPhone, settings.companyEmail].filter(Boolean).join(' • '))}</div>`
          : ''}
      </div>
    </div>
  `
}

function headerHtml(
  invoice: InvoicePdfData,
  settings: InvoicePdfSettings,
  continuation: boolean,
) {
  return `
    <header class="document-header">
      ${companyHtml(settings)}
      <div class="title-block">
        <div class="document-title">${esc(settings.documentTitle || 'RAČUN')}</div>
        <div class="document-number">${esc(invoice.invoiceNumber)}</div>
        ${continuation ? '<div class="continuation">NASTAVAK</div>' : ''}
      </div>
    </header>
  `
}

function customerAndMetaHtml(invoice: InvoicePdfData, settings: InvoicePdfSettings) {
  const customerDetails = [
    [invoice.address, invoice.city].filter(Boolean).join(', '),
    invoice.oib ? `OIB: ${invoice.oib}` : '',
    invoice.email,
    invoice.phone,
  ].filter(Boolean)

  return `
    <section class="info-grid info-${esc(settings.infoStyle)}">
      <div class="customer-block">
        <div class="eyebrow">KUPAC</div>
        <div class="customer-name">${esc(invoice.customerName || '—')}</div>
        ${customerDetails.length
          ? `<div class="customer-details">${customerDetails.map((line) => `<div>${esc(line)}</div>`).join('')}</div>`
          : ''}
      </div>

      <div class="meta-block">
        <div><span>Datum</span><strong>${date(invoice.issueDate)}</strong></div>
        <div><span>Dospijeće</span><strong>${date(invoice.dueDate)}</strong></div>
        <div><span>Datum usluge</span><strong>${date(invoice.serviceDate)}</strong></div>
      </div>
    </section>
  `
}

function sectionTitle(label: string, settings: InvoicePdfSettings) {
  return `<div class="section-title section-${esc(settings.sectionStyle)}">${esc(label)}</div>`
}

function itemRows(items: InvoicePdfItem[], startIndex: number) {
  return items.map((item, index) => `
    <div class="item-row">
      <div class="item-main">
        <strong>${startIndex + index + 1}. ${esc(item.name)}</strong>
        ${item.description ? `<small>${multi(item.description)}</small>` : ''}
      </div>
      <span>${number(item.quantity)} ${esc(item.unit)}</span>
      <span>${currency(item.price)}</span>
      <strong>${currency(itemTotal(item))}</strong>
    </div>
  `).join('')
}

function quickPayHtml(
  invoice: InvoicePdfData,
  settings: InvoicePdfSettings,
  total: number,
) {
  if (!settings.quickPayBarcodeDataUrl) return ''

  return `
    <section class="quick-pay">
      <div>
        <div class="eyebrow">BRZO PLAĆANJE</div>
        <strong>Skeniraj 2D barkod mobilnim bankarstvom</strong>
        <span>${currency(total)} · ${esc(invoice.paymentModel || 'HR00')} ${esc(invoice.paymentReference || '')}</span>
      </div>
      <img src="${esc(settings.quickPayBarcodeDataUrl)}" alt="HUB3 PDF417 barkod" />
    </section>
  `
}

function finalHtml(
  invoice: InvoicePdfData,
  settings: InvoicePdfSettings,
  totals: ReturnType<typeof calculateTotals>,
) {
  const stamp = settings.showStamp && settings.stampDataUrl
    ? `<img class="stamp" src="${esc(settings.stampDataUrl)}" alt="Pečat" />`
    : ''
  const signature = settings.showSignature && settings.signatureDataUrl
    ? `<img class="signature" src="${esc(settings.signatureDataUrl)}" alt="Potpis" />`
    : ''
  const responsiblePerson = invoice.responsiblePerson.trim()
  const customerName = invoice.customerName.trim()
  const issuer =
    responsiblePerson &&
    responsiblePerson.toLocaleLowerCase('hr-HR') !==
      customerName.toLocaleLowerCase('hr-HR')
      ? responsiblePerson
      : settings.companyName || '—'

  return `
    <section class="summary-grid">
      <div class="payment-card">
        <div class="eyebrow">PODACI ZA PLAĆANJE</div>
        <div class="pay-row"><span>Način plaćanja</span><strong>${esc(invoice.paymentMethod || 'Transakcijski račun')}</strong></div>
        <div class="pay-row"><span>IBAN</span><strong>${esc(invoice.iban || settings.companyIban || '—')}</strong></div>
        <div class="pay-row"><span>Model</span><strong>${esc(invoice.paymentModel || 'HR00')}</strong></div>
        <div class="pay-row"><span>Poziv na broj</span><strong>${esc(invoice.paymentReference || '—')}</strong></div>
      </div>

      <div class="totals">
        <div><span>Vrijednost</span><strong>${currency(totals.base)}</strong></div>
        ${totals.discount > 0 ? `<div><span>Popust</span><strong>− ${currency(totals.discount)}</strong></div>` : ''}
        <div><span>Osnovica</span><strong>${currency(totals.net)}</strong></div>
        <div><span>PDV</span><strong>${currency(totals.vat)}</strong></div>
        <div class="grand"><span>UKUPNO ZA PLATITI</span><strong>${currency(totals.total)}</strong></div>
      </div>
    </section>

    ${quickPayHtml(invoice, settings, totals.total)}

    ${invoice.internalNote ? `<div class="note">${multi(invoice.internalNote)}</div>` : ''}

    ${(settings.showSignature || settings.showStamp) ? `
      <section class="issued-by">
        <div>
          <span>Račun izdao</span>
          <strong>${esc(issuer)}</strong>
        </div>
        <div class="issued-media">${signature}${stamp}</div>
      </section>
    ` : ''}
  `
}

function css(settings: InvoicePdfSettings) {
  const p = settings.primaryColor
  const s = settings.secondaryColor
  const a = settings.accentColor
  const t = settings.textColor
  const b = settings.borderColor
  const bg = settings.backgroundColor
  const compact = settings.density === 'compact'

  const tableHead = settings.tableStyle === 'soft'
    ? `linear-gradient(90deg, ${p}, ${a})`
    : settings.tableStyle === 'minimal'
      ? s
      : p

  const grand = settings.preset === 'minimal'
    ? s
    : settings.preset === 'classic'
      ? p
      : `linear-gradient(90deg, ${p}, ${a})`

  return `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      background: #dfe5ec;
      color: ${t};
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background: rgba(15,23,42,.97);
    }
    .toolbar button { border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 800; }
    .toolbar .primary { background: ${p}; color: #fff; }
    .toolbar .secondary { background: #1e293b; color: #fff; }
    .pages { padding: 14px 0 28px; }
    .page {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 210mm;
      height: 297mm;
      margin: 0 auto 14px;
      overflow: hidden;
      padding: ${compact ? '10mm 11mm 8mm' : '12mm 12mm 9mm'};
      background: ${bg};
      box-shadow: 0 18px 55px rgba(15,23,42,.18);
      break-after: page;
    }
    .watermark {
      position: absolute;
      left: 50%;
      top: 52%;
      transform: translate(-50%,-50%) rotate(-28deg);
      color: ${p};
      font-size: 62px;
      font-weight: 950;
      opacity: .035;
      white-space: nowrap;
    }
    .document-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      padding-bottom: ${compact ? '10px' : '13px'};
      border-bottom: 1.4px solid ${t};
    }
    .company {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
      max-width: 66%;
    }
    .company-center { text-align: center; }
    .company-right { text-align: right; flex-direction: row-reverse; }
    .company-logo {
      width: ${compact ? 54 : 62}px;
      height: ${compact ? 46 : 54}px;
      flex: 0 0 auto;
      object-fit: contain;
    }
    .company-copy { min-width: 0; font-size: ${compact ? 8.8 : 9.4}px; line-height: 1.42; color: ${alpha(t, '88')}; }
    .company-name { margin-bottom: 3px; font-size: ${compact ? 18 : 20}px; line-height: 1.08; font-weight: 950; color: ${t}; }
    .title-block { flex: 0 0 auto; text-align: right; }
    .document-title { font-size: ${compact ? 30 : 34}px; line-height: .95; font-weight: 950; letter-spacing: -.03em; }
    .document-number { margin-top: 7px; color: ${p}; font-size: ${compact ? 13 : 14}px; font-weight: 950; }
    .continuation { margin-top: 4px; color: ${alpha(t, '70')}; font-size: 8px; font-weight: 900; letter-spacing: .12em; }
    .info-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(0,1fr) 225px;
      gap: 18px;
      margin-top: ${compact ? '13px' : '17px'};
    }
    .info-cards > div { border: 1px solid ${b}; border-radius: 7px; padding: 9px 10px; background: ${alpha(p, '05')}; }
    .customer-block { min-width: 0; }
    .eyebrow { color: ${alpha(t, '70')}; font-size: 9px; font-weight: 950; text-transform: uppercase; }
    .customer-name { margin-top: 6px; font-size: ${compact ? 13 : 14.5}px; font-weight: 950; }
    .customer-details { margin-top: 4px; color: ${alpha(t, '82')}; font-size: 9px; line-height: 1.4; }
    .meta-block { font-size: 9px; }
    .meta-block > div { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-bottom: 1px solid ${alpha(b, 'AA')}; }
    .meta-block span { color: ${alpha(t, '72')}; }
    .meta-block strong { text-align: right; }
    .description { margin-top: 10px; padding: 8px 10px; border-left: 2px solid ${p}; background: ${alpha(p, '06')}; font-size: 9px; line-height: 1.42; }
    .section-title { margin: ${compact ? '11px 0 6px' : '14px 0 7px'}; font-size: 10px; font-weight: 950; text-transform: uppercase; }
    .section-bar { padding: 6px 8px; border-radius: 6px; background: ${p}; color: #fff; }
    .section-line { padding-bottom: 4px; border-bottom: 1.5px solid ${p}; color: ${p}; }
    .section-plain { color: ${p}; }
    .table { position: relative; z-index: 1; overflow: hidden; border: 1px solid ${b}; border-radius: 7px; }
    .item-head, .item-row { display: grid; grid-template-columns: minmax(0,1.55fr) .55fr .8fr .9fr; gap: 8px; align-items: center; }
    .item-head { padding: ${compact ? '6px 8px' : '8px 9px'}; background: ${tableHead}; color: #fff; font-size: 8.5px; font-weight: 950; text-transform: uppercase; }
    .table-minimal .item-head { color: ${settings.tableStyle === 'minimal' && settings.preset === 'minimal' ? t : '#fff'}; }
    .item-row { min-height: ${compact ? 34 : 40}px; padding: ${compact ? '5px 8px' : '6px 9px'}; border-top: 1px solid ${b}; font-size: ${compact ? 9 : 9.5}px; line-height: 1.3; }
    .table-soft .item-row:nth-child(odd) { background: ${alpha(p, '05')}; }
    .item-row span, .item-row > strong { text-align: right; }
    .item-main { min-width: 0; text-align: left !important; }
    .item-main strong { display: block; text-align: left; }
    .item-main small { display: block; margin-top: 2px; color: ${alpha(t, '72')}; font-size: 8px; line-height: 1.35; }
    .summary-grid { display: grid; grid-template-columns: minmax(0,1fr) 46%; gap: 20px; margin-top: 14px; align-items: start; }
    .payment-card { border: 1px solid ${alpha(p, '55')}; border-radius: 7px; padding: 10px; background: ${alpha(p, '04')}; }
    .pay-row, .totals > div { display: flex; justify-content: space-between; gap: 10px; padding: 5px 2px; border-bottom: 1px solid ${b}; font-size: 8.8px; }
    .pay-row span, .totals span { color: ${alpha(t, '72')}; }
    .pay-row strong { max-width: 65%; text-align: right; overflow-wrap: anywhere; }
    .totals .grand {
      margin-top: 7px;
      padding: 10px 11px;
      border: 0;
      border-radius: 7px;
      background: ${grand};
      color: #fff;
      align-items: center;
    }
    .totals .grand span { color: rgba(255,255,255,.76); font-size: 9px; font-weight: 950; }
    .totals .grand strong { font-size: 15px; }
    .quick-pay { display: grid; grid-template-columns: minmax(0,1fr) 62mm; gap: 12px; align-items: center; margin-top: 11px; padding: 9px 10px; border: 1px solid ${alpha(p, '55')}; border-radius: 7px; background: ${alpha(p, '035')}; }
    .quick-pay > div { display: flex; min-width: 0; flex-direction: column; gap: 4px; font-size: 8.3px; }
    .quick-pay > div > strong { font-size: 9.5px; }
    .quick-pay > div > span { color: ${alpha(t, '78')}; }
    .quick-pay img { display: block; width: 60mm; max-height: 27mm; object-fit: contain; background: #fff; }
    .note { margin-top: 9px; padding: 8px 9px; border: 1px solid ${b}; border-radius: 6px; font-size: 8.5px; line-height: 1.4; }
    .issued-by { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 9px; font-size: 8.5px; }
    .issued-by span { display: block; color: ${alpha(t, '70')}; }
    .issued-by strong { display: block; margin-top: 2px; font-size: 10px; }
    .issued-media { display: flex; align-items: center; gap: 8px; }
    .stamp { max-width: 165px; max-height: 82px; object-fit: contain; }
    .signature { max-width: 180px; max-height: 58px; object-fit: contain; }
    .footer { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 15px; margin-top: auto; padding-top: 7px; border-top: 1px solid ${alpha(p, '55')}; color: ${alpha(t, '6D')}; font-size: 7.8px; }

    @media print {
      @page { size: A4; margin: 0; }
      html, body { background: #fff; }
      .toolbar { display: none !important; }
      .pages { padding: 0; }
      .page { margin: 0; box-shadow: none; }
    }
  `
}

export function buildInvoicePdfHtml(
  invoice: InvoicePdfData,
  customSettings: Partial<InvoicePdfSettings> = {},
) {
  const settings: InvoicePdfSettings = { ...DEFAULT_SETTINGS, ...customSettings }
  const totals = calculateTotals(invoice)
  const pages = paginateItems(totals.items)
  let itemIndex = 0

  const htmlPages = pages.map((pageItems, pageIndex) => {
    const first = pageIndex === 0
    const final = pageIndex === pages.length - 1
    const startIndex = itemIndex
    itemIndex += pageItems.length

    return `
      <section class="page">
        ${settings.showWatermark && settings.watermarkText
          ? `<div class="watermark">${esc(settings.watermarkText)}</div>`
          : ''}
        ${invoice.complianceSnapshot?.practiceDocument
          ? `<div style="margin-bottom:12px;border:1px solid #f59e0b;border-radius:10px;padding:8px 12px;text-align:center;font-size:11px;font-weight:800;color:#92400e;background:#fffbeb">PROBNI DOKUMENT – NIJE FISKALIZIRAN I NIJE ZA SLUŽBENO IZDAVANJE</div>`
          : ''}
        ${headerHtml(invoice, settings, !first)}
        ${first ? customerAndMetaHtml(invoice, settings) : ''}
        ${first && invoice.description ? `<div class="description">${multi(invoice.description)}</div>` : ''}
        ${sectionTitle(first ? 'Stavke računa' : 'Stavke računa · nastavak', settings)}
        <div class="table table-${esc(settings.tableStyle)}">
          <div class="item-head">
            <span>OPIS</span><span>KOL.</span><span>CIJENA</span><span>UKUPNO</span>
          </div>
          ${itemRows(pageItems, startIndex)}
        </div>
        ${final ? finalHtml(invoice, settings, totals) : ''}
        ${settings.showFooter ? `
          <footer class="footer">
            <span>${esc(settings.footerText || '')}</span>
            <span>${esc(invoice.invoiceNumber)} · ${pageIndex + 1}/${pages.length}</span>
          </footer>
        ` : ''}
      </section>
    `
  }).join('')

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

async function preparePdfSettings(
  invoice: InvoicePdfData,
  customSettings: Partial<InvoicePdfSettings>,
) {
  const settings = await resolvedPdfSettings(customSettings)
  const { total } = calculateTotals(invoice)
  const iban = (invoice.iban || settings.companyIban || '')
    .replace(/\s+/g, '')
    .toUpperCase()

  if (!iban || total <= 0) return settings

  try {
    const barcode = createHub3Pdf417DataUrl({
      amount: total,
      payerName: invoice.customerName,
      payerStreet: invoice.address,
      payerPostalCity: invoice.city,
      recipientName: settings.companyName,
      recipientStreet: settings.companyStreetAddress,
      recipientPostalCity: settings.companyPostalCity,
      iban,
      model: invoice.paymentModel,
      reference: invoice.paymentReference,
      purposeCode: 'OTHR',
      description: `Račun ${invoice.invoiceNumber}`,
    })

    return {
      ...settings,
      quickPayBarcodeDataUrl: barcode,
      quickPayBarcodeError: undefined,
    }
  } catch (error) {
    console.warn('HUB3 barkod nije generiran:', error)
    return {
      ...settings,
      quickPayBarcodeDataUrl: undefined,
      quickPayBarcodeError: error instanceof Error
        ? error.message
        : 'HUB3 barkod nije moguće generirati.',
    }
  }
}

async function waitForImages(doc: Document) {
  const images = Array.from(doc.querySelectorAll('img'))
  await Promise.all(images.map((image) => new Promise<void>((resolve) => {
    if (image.complete) {
      resolve()
      return
    }
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })))
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

    await new Promise<void>((resolve) => window.setTimeout(resolve, 140))
    await doc.fonts?.ready
    await waitForImages(doc)

    const toolbar = doc.querySelector('.toolbar') as HTMLElement | null
    if (toolbar) toolbar.style.display = 'none'

    const pages = Array.from(doc.querySelectorAll('.page')) as HTMLElement[]
    if (!pages.length) throw new Error('PDF nema stranica za izradu.')

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    for (let index = 0; index < pages.length; index += 1) {
      pages[index].style.margin = '0'
      pages[index].style.boxShadow = 'none'

      const canvas = await html2canvas(pages[index], {
        scale: 2.2,
        backgroundColor,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 5000,
      })

      const image = canvas.toDataURL('image/jpeg', 0.92)
      if (index > 0) pdf.addPage()
      pdf.addImage(image, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
    }

    saveBlobDownload(pdf.output('blob'), fileName)
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
    window.alert('Preglednik je blokirao novi prozor. Dopusti skočne prozore za FERSYS.')
    return
  }

  previewWindow.document.write(
    '<p style="font-family:system-ui;padding:24px">Priprema računa i HUB3 barkoda...</p>',
  )

  void (async () => {
    try {
      const settings = await preparePdfSettings(invoice, customSettings)
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
  const fileName = `${safeFileName(data.invoiceNumber || 'Racun')}-${safeFileName(data.customerName || 'Kupac')}.pdf`
  notifyDownloadPreparing(fileName)

  try {
    const settings = await preparePdfSettings(data, customSettings)
    const html = buildInvoicePdfHtml(data, settings)
    await renderHtmlPagesToPdf(
      html,
      fileName,
      settings.backgroundColor || '#FFFFFF',
    )
  } catch (error) {
    console.error('downloadInvoicePdf error:', error)
    const message = error instanceof Error
      ? `PDF nije moguće izraditi: ${error.message}`
      : 'PDF nije moguće izraditi.'
    notifyDownloadError(message, fileName)
    window.alert(message)
  }
}
