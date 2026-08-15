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
  createPresetAppearance(
    'offer',
    'modern',
  )

const DEFAULT_SETTINGS:
OfferPdfSettings = {
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

  primaryColor:
    DEFAULT_APPEARANCE.primaryColor,
  secondaryColor:
    DEFAULT_APPEARANCE.secondaryColor,
  accentColor:
    DEFAULT_APPEARANCE.accentColor,
  textColor:
    DEFAULT_APPEARANCE.textColor,
  borderColor:
    DEFAULT_APPEARANCE.borderColor,
  backgroundColor:
    DEFAULT_APPEARANCE.backgroundColor,

  headerAlignment:
    DEFAULT_APPEARANCE.headerAlignment,

  density:
    DEFAULT_APPEARANCE.density,

  infoStyle:
    DEFAULT_APPEARANCE.infoStyle,

  tableStyle:
    DEFAULT_APPEARANCE.tableStyle,

  sectionStyle:
    DEFAULT_APPEARANCE.sectionStyle,

  showLogo:
    DEFAULT_APPEARANCE.showLogo,
  showItemImages:
    DEFAULT_APPEARANCE.showItemImages,
  showSignature:
    DEFAULT_APPEARANCE.showSignature,
  showStamp:
    DEFAULT_APPEARANCE.showStamp,
  showFooter:
    DEFAULT_APPEARANCE.showFooter,
  showWatermark:
    DEFAULT_APPEARANCE.showWatermark,

  documentTitle:
    DEFAULT_APPEARANCE.documentTitle,

  // Namjerno bez FERSYS potpisa/brendinga.
  footerText: '',

  watermarkText:
    DEFAULT_APPEARANCE.watermarkText,
}

function escapeHtml(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function multilineHtml(
  value: string,
) {
  return escapeHtml(value)
    .replace(
      /\r?\n/g,
      '<br />',
    )
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  )
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      maximumFractionDigits: 2,
    },
  ).format(value)
}

function formatDate(
  value: string,
) {
  if (!value) return '—'

  const date =
    new Date(
      `${value}T12:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleDateString(
    'hr-HR',
  )
}

function itemNet(
  item: OfferPdfItem,
) {
  return (
    item.quantity *
    item.price *
    (
      1 -
      item.discount / 100
    )
  )
}

function itemVat(
  item: OfferPdfItem,
) {
  return (
    itemNet(item) *
    (item.vat / 100)
  )
}

function itemTotal(
  item: OfferPdfItem,
) {
  return (
    itemNet(item) +
    itemVat(item)
  )
}

function safeFileName(
  value: string,
) {
  return value
    .replace(
      /[\\/:*?"<>|]+/g,
      '-',
    )
    .replace(/\s+/g, '-')
}

function alphaColor(
  color: string,
  alpha: string,
) {
  return /^#[0-9A-Fa-f]{6}$/.test(
    color,
  )
    ? `${color}${alpha}`
    : color
}

function companySettingsFromCurrent(
  settings:
    Awaited<
      ReturnType<
        typeof getCompanySettings
      >
    >,
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
  }
}

function appearanceToPdfSettings(
  appearance:
    DocumentAppearance,
): Partial<OfferPdfSettings> {
  return {
    primaryColor:
      appearance.primaryColor,

    secondaryColor:
      appearance.secondaryColor,

    accentColor:
      appearance.accentColor,

    textColor:
      appearance.textColor,

    borderColor:
      appearance.borderColor,

    backgroundColor:
      appearance.backgroundColor,

    headerAlignment:
      appearance.headerAlignment,

    density:
      appearance.density,

    infoStyle:
      appearance.infoStyle,

    tableStyle:
      appearance.tableStyle,

    sectionStyle:
      appearance.sectionStyle,

    showLogo:
      appearance.showLogo,

    showStamp:
      appearance.showStamp,

    showSignature:
      appearance.showSignature,

    showFooter:
      appearance.showFooter,

    showWatermark:
      appearance.showWatermark,

    showItemImages:
      appearance.showItemImages,

    documentTitle:
      appearance.documentTitle ||
      'PONUDA',

    // Footer iz postavki ostaje podržan,
    // ali ako korisnik ostavi stari FERSYS tekst
    // ne prikazujemo ga.
    footerText:
      /fersys/i.test(
        appearance.footerText || '',
      )
        ? ''
        : appearance.footerText,

    watermarkText:
      appearance.watermarkText,
  }
}

function estimateItemWeight(
  item: OfferPdfItem,
  showImages: boolean,
  density:
    OfferPdfSettings['density'],
) {
  const textWeight =
    Math.min(
      1.25,
      (
        item.name.length +
        item.description.length
      ) / 180,
    )

  const imageWeight =
    showImages &&
    item.imageDataUrl
      ? 1.55
      : 0

  const densityWeight =
    density === 'compact'
      ? -0.15
      : 0

  return Math.max(
    0.85,
    1 +
      textWeight +
      imageWeight +
      densityWeight,
  )
}

type OfferPage = {
  items: OfferPdfItem[]
  first: boolean
  final: boolean
}

function paginateItems(
  items: OfferPdfItem[],
  settings: OfferPdfSettings,
) {
  const pages:
    OfferPage[] = []

  let current:
    OfferPdfItem[] = []

  let currentWeight = 0
  let firstPage = true

  const capacityForPage =
    (first: boolean) => {
      if (
        settings.density ===
        'compact'
      ) {
        return first
          ? 7.9
          : 11.3
      }

      return first
        ? 6.8
        : 9.7
    }

  for (const item of items) {
    const itemWeight =
      estimateItemWeight(
        item,
        settings.showItemImages,
        settings.density,
      )

    const capacity =
      capacityForPage(
        firstPage,
      )

    if (
      current.length > 0 &&
      currentWeight +
        itemWeight >
        capacity
    ) {
      pages.push({
        items: current,
        first: firstPage,
        final: false,
      })

      current = []
      currentWeight = 0
      firstPage = false
    }

    current.push(item)
    currentWeight += itemWeight
  }

  if (
    current.length > 0 ||
    pages.length === 0
  ) {
    pages.push({
      items: current,
      first: firstPage,
      final: false,
    })
  }

  /*
   * Zadnji blok (napomena, ukupno, potpisi) treba
   * rezervirati dosta prostora. Ako je zadnja stranica
   * puna stavkama, dodajemo zasebnu završnu stranicu.
   */
  const lastIndex =
    pages.length - 1

  const lastWeight =
    pages[lastIndex].items.reduce(
      (sum, item) =>
        sum +
        estimateItemWeight(
          item,
          settings.showItemImages,
          settings.density,
        ),
      0,
    )

  const finalSafeLimit =
    pages[lastIndex].first
      ? (
          settings.density ===
          'compact'
            ? 5.4
            : 4.7
        )
      : (
          settings.density ===
          'compact'
            ? 7.5
            : 6.4
        )

  if (
    lastWeight >
      finalSafeLimit &&
    pages[lastIndex].items.length > 0
  ) {
    pages.push({
      items: [],
      first: false,
      final: true,
    })
  } else {
    pages[lastIndex].final = true
  }

  return pages
}

function sectionTitleHtml(
  title: string,
  settings: OfferPdfSettings,
) {
  return `
    <div
      class="section-heading
        section-${escapeHtml(
          settings.sectionStyle,
        )}"
    >
      <span>
        ${escapeHtml(title)}
      </span>
    </div>
  `
}

function documentCss(
  settings: OfferPdfSettings,
) {
  const primary =
    settings.primaryColor

  const secondary =
    settings.secondaryColor

  const accent =
    settings.accentColor

  const text =
    settings.textColor

  const border =
    settings.borderColor

  const background =
    settings.backgroundColor

  const compact =
    settings.density ===
    'compact'

  return `
    :root {
      --primary: ${primary};
      --secondary: ${secondary};
      --accent: ${accent};
      --ink: ${text};
      --border: ${border};
      --background: ${background};
      --soft:
        ${alphaColor(
          primary,
          '12',
        )};
      --soft-strong:
        ${alphaColor(
          primary,
          '1D',
        )};
      --muted:
        ${alphaColor(
          text,
          '9A',
        )};
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      background: #dfe5ec;
      color: var(--ink);
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      -webkit-print-color-adjust:
        exact;
      print-color-adjust:
        exact;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background:
        rgba(
          15,
          23,
          42,
          .97
        );
    }

    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 800;
      cursor: pointer;
    }

    .toolbar .primary {
      background: var(--primary);
      color: white;
    }

    .toolbar .secondary {
      border:
        1px solid
        #475569;
      background: #1e293b;
      color: #e2e8f0;
    }

    .pages {
      padding: 14px 0 28px;
    }

    .page {
      position: relative;
      display: flex;
      width: 210mm;
      height: 297mm;
      margin: 0 auto 14px;
      overflow: hidden;
      flex-direction: column;
      padding:
        ${compact ? '10mm 11mm 9mm' : '11mm 12mm 9mm'};
      background: var(--background);
      box-shadow:
        0 18px 55px
        rgba(15,23,42,.18);
      break-after: page;
    }

    .page-content {
      position: relative;
      z-index: 2;
      display: flex;
      min-height: 0;
      flex: 1;
      flex-direction: column;
    }

    .watermark {
      position: absolute;
      left: 50%;
      top: 53%;
      z-index: 0;
      transform:
        translate(-50%, -50%)
        rotate(-31deg);
      color: var(--primary);
      font-size: 64px;
      font-weight: 950;
      letter-spacing: .06em;
      opacity: .035;
      white-space: nowrap;
      pointer-events: none;
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        ${compact ? '205px' : '220px'};
      gap: ${compact ? 22 : 28}px;
      align-items: start;
      padding-bottom:
        ${compact ? 12 : 15}px;
      border-bottom:
        2px solid
        var(--primary);
    }

    .header.align-center {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
    }

    .header.align-center
    .company {
      justify-content: center;
    }

    .header.align-center
    .document-heading {
      text-align: center;
    }

    .header.align-right {
      grid-template-columns:
        ${compact ? '205px' : '220px'}
        minmax(0, 1fr);
    }

    .header.align-right
    .company {
      order: 2;
      justify-content: flex-end;
      text-align: right;
    }

    .header.align-right
    .document-heading {
      order: 1;
      text-align: left;
    }

    .company {
      display: flex;
      min-width: 0;
      align-items: flex-start;
      gap: 11px;
    }

    .logo {
      display: block;
      width: ${compact ? 55 : 62}px;
      height: ${compact ? 55 : 62}px;
      flex:
        0 0
        ${compact ? 55 : 62}px;
      object-fit: contain;
    }

    .company-copy {
      min-width: 0;
    }

    .company-name {
      color: var(--ink);
      font-size:
        ${compact ? 17 : 19}px;
      line-height: 1.08;
      font-weight: 950;
      letter-spacing: -.02em;
    }

    .company-subtitle {
      margin-top: 3px;
      color: var(--muted);
      font-size: 8px;
      font-weight: 650;
    }

    .company-lines {
      margin-top: 8px;
      color: var(--muted);
      font-size:
        ${compact ? 7.1 : 7.6}px;
      line-height: 1.45;
    }

    .company-lines div {
      margin-top: 1px;
    }

    .document-heading {
      text-align: right;
    }

    .document-title {
      margin: 0;
      color: var(--primary);
      font-size:
        ${compact ? 29 : 34}px;
      line-height: .98;
      font-weight: 950;
      letter-spacing: -.04em;
      text-transform: uppercase;
    }

    .document-number {
      margin-top:
        ${compact ? 9 : 11}px;
      color: var(--ink);
      font-size:
        ${compact ? 13 : 15}px;
      font-weight: 950;
    }

    .document-number span {
      margin-right: 5px;
      color: var(--muted);
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .document-date {
      margin-top: 7px;
      color: var(--muted);
      font-size: 8px;
      font-weight: 700;
    }

    .info-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: ${compact ? 16 : 20}px;
      margin-top:
        ${compact ? 11 : 14}px;
    }

    .info-grid.cards
    .info-block {
      padding:
        ${compact ? 10 : 12}px;
      border:
        1px solid
        var(--border);
      border-radius: 8px;
      background:
        ${alphaColor(
          background,
          'F2',
        )};
    }

    .info-grid.lines
    .info-block {
      padding:
        ${compact ? '3px 0 7px' : '4px 0 9px'};
      border-bottom:
        1px solid
        var(--border);
    }

    .info-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 7px;
      color: var(--primary);
      font-size:
        ${compact ? 7.6 : 8.2}px;
      font-weight: 950;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .investor-name {
      color: var(--ink);
      font-size:
        ${compact ? 10 : 11}px;
      font-weight: 950;
    }

    .info-lines {
      margin-top: 5px;
      color: var(--ink);
      font-size:
        ${compact ? 7.5 : 8}px;
      line-height: 1.42;
    }

    .meta-row {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        auto;
      gap: 14px;
      padding: 3px 0;
      border-bottom:
        1px solid
        ${alphaColor(
          border,
          '80',
        )};
      font-size:
        ${compact ? 7.3 : 7.8}px;
    }

    .meta-row:last-child {
      border-bottom: 0;
    }

    .meta-row span {
      color: var(--muted);
    }

    .meta-row strong {
      color: var(--ink);
      text-align: right;
    }

    .offer-description {
      margin-top:
        ${compact ? 8 : 10}px;
      padding:
        ${compact ? '7px 9px' : '8px 10px'};
      border-left:
        2px solid
        var(--primary);
      background:
        var(--soft);
      color: var(--ink);
      font-size:
        ${compact ? 7.5 : 8}px;
      line-height: 1.45;
    }

    .section-heading {
      margin:
        ${compact ? 10 : 13}px
        0
        ${compact ? 5 : 7}px;
      color: var(--ink);
      font-size:
        ${compact ? 8.2 : 9}px;
      font-weight: 950;
      letter-spacing: .035em;
      text-transform: uppercase;
    }

    .section-heading span {
      display: inline-flex;
      align-items: center;
    }

    .section-bar {
      border-radius: 5px;
      padding: 6px 8px;
      background: var(--primary);
      color: white;
    }

    .section-line {
      border-bottom:
        1px solid
        var(--primary);
      padding-bottom: 5px;
      color: var(--primary);
    }

    .section-plain {
      color: var(--ink);
    }

    .items {
      border-top:
        1px solid
        var(--border);
    }

    .item-row {
      display: grid;
      grid-template-columns:
        28px
        ${settings.showItemImages ? '78px' : '0px'}
        minmax(0, 1fr)
        68px
        78px
        90px;
      min-height:
        ${compact ? 48 : 55}px;
      align-items: center;
      column-gap:
        ${compact ? 8 : 10}px;
      padding:
        ${compact ? '5px 0' : '6px 0'};
      border-bottom:
        1px solid
        var(--border);
      break-inside: avoid;
    }

    .item-row.no-image-column {
      grid-template-columns:
        28px
        minmax(0, 1fr)
        68px
        78px
        90px;
    }

    .item-index {
      color: var(--primary);
      font-size:
        ${compact ? 8 : 9}px;
      font-weight: 950;
      text-align: center;
    }

    .item-image-wrap {
      display: grid;
      width: 78px;
      height:
        ${compact ? 48 : 55}px;
      place-items: center;
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 5px;
      background:
        ${alphaColor(
          border,
          '18',
        )};
    }

    .item-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: white;
    }

    .item-image-placeholder {
      color: var(--muted);
      font-size: 6.5px;
      font-weight: 700;
      text-align: center;
      opacity: .55;
    }

    .item-main {
      min-width: 0;
    }

    .item-name {
      color: var(--ink);
      font-size:
        ${compact ? 8.1 : 8.8}px;
      line-height: 1.25;
      font-weight: 950;
    }

    .item-description {
      margin-top: 2px;
      color: var(--muted);
      font-size:
        ${compact ? 6.8 : 7.2}px;
      line-height: 1.35;
    }

    .item-data {
      min-width: 0;
      padding-left: 7px;
      border-left:
        1px solid
        var(--border);
      color: var(--ink);
      font-size:
        ${compact ? 7.2 : 7.7}px;
      text-align: right;
    }

    .item-data small {
      display: block;
      margin-bottom: 2px;
      color: var(--muted);
      font-size: 5.8px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .item-total {
      color: var(--ink);
      font-size:
        ${compact ? 8 : 8.6}px;
      font-weight: 950;
    }

    .item-discount {
      margin-top: 2px;
      color: var(--muted);
      font-size: 5.8px;
    }

    .table-solid
    .items {
      border:
        1px solid
        var(--border);
      border-radius: 5px;
      overflow: hidden;
    }

    .table-solid
    .item-row {
      padding-left: 6px;
      padding-right: 6px;
    }

    .table-soft
    .item-row:nth-child(even) {
      background: var(--soft);
    }

    .table-minimal
    .items {
      border-top:
        1px solid
        var(--ink);
    }

    .final-grid {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        ${compact ? 245 : 265}px;
      gap:
        ${compact ? 18 : 22}px;
      margin-top:
        ${compact ? 11 : 14}px;
      align-items: start;
      break-inside: avoid;
    }

    .notes {
      min-width: 0;
    }

    .note-title {
      color: var(--primary);
      font-size:
        ${compact ? 7.7 : 8.2}px;
      font-weight: 950;
      text-transform: uppercase;
    }

    .note-body {
      margin-top: 6px;
      color: var(--ink);
      font-size:
        ${compact ? 7.1 : 7.6}px;
      line-height: 1.48;
    }

    .note-body + .note-body {
      margin-top: 7px;
      padding-top: 7px;
      border-top:
        1px solid
        var(--border);
    }

    .totals {
      width: 100%;
    }

    .total-row {
      display: flex;
      justify-content:
        space-between;
      gap: 12px;
      padding:
        ${compact ? '4px 6px' : '5px 7px'};
      border-bottom:
        1px solid
        var(--border);
      color: var(--ink);
      font-size:
        ${compact ? 7.4 : 8}px;
    }

    .total-row span:first-child {
      color: var(--muted);
    }

    .total-row.grand {
      margin-top: 5px;
      border: 0;
      border-radius: 5px;
      padding:
        ${compact ? '8px 9px' : '9px 10px'};
      background:
        var(--soft-strong);
      color: var(--primary);
      font-size:
        ${compact ? 10.5 : 12}px;
      font-weight: 950;
    }

    .total-row.grand
    span:first-child {
      color: var(--primary);
    }

    .signature-grid {
      display: grid;
      grid-template-columns:
        1fr 96px 1fr;
      gap: 22px;
      align-items: end;
      margin-top:
        ${compact ? 14 : 18}px;
      break-inside: avoid;
    }

    .signature-column {
      min-width: 0;
    }

    .signature-label {
      color: var(--muted);
      font-size: 7px;
    }

    .signature-space {
      position: relative;
      display: flex;
      height:
        ${compact ? 39 : 46}px;
      align-items: flex-end;
      justify-content: center;
    }

    .signature-image {
      display: block;
      max-width: 135px;
      max-height:
        ${compact ? 34 : 41}px;
      object-fit: contain;
    }

    .signature-line {
      border-top:
        1px solid
        var(--ink);
      padding-top: 4px;
      color: var(--ink);
      font-size: 7px;
    }

    .signature-line strong {
      display: block;
      margin-top: 2px;
      font-size: 7.5px;
    }

    .stamp-column {
      display: flex;
      min-height:
        ${compact ? 58 : 68}px;
      align-items: center;
      justify-content: center;
    }

    .stamp-image {
      display: block;
      max-width:
        ${compact ? 86 : 96}px;
      max-height:
        ${compact ? 58 : 68}px;
      object-fit: contain;
    }

    .footer {
      display: grid;
      grid-template-columns:
        1fr auto;
      gap: 18px;
      align-items: end;
      margin-top: auto;
      border-top:
        1px solid
        var(--primary);
      padding-top: 6px;
      color: var(--muted);
      font-size: 6.5px;
    }

    .footer-center {
      text-align: right;
    }

    .continuation {
      margin-top: 8px;
      color: var(--muted);
      font-size: 7px;
      font-weight: 750;
      text-transform: uppercase;
    }

    @media print {
      @page {
        size: A4;
        margin: 0;
      }

      html,
      body {
        background: white;
      }

      .toolbar {
        display: none !important;
      }

      .pages {
        padding: 0;
      }

      .page {
        margin: 0;
        box-shadow: none;
      }
    }
  `
}

function companyBlock(
  settings:
    OfferPdfSettings,
) {
  const logo =
    settings.showLogo &&
    settings.logoDataUrl
      ? `
        <img
          class="logo"
          src="${escapeHtml(
            settings.logoDataUrl,
          )}"
          alt="Logo tvrtke"
        />
      `
      : ''

  const companyLines = [
    settings.companyAddress,

    settings.companyOib
      ? `OIB: ${settings.companyOib}`
      : '',

    settings.companyIban
      ? `IBAN: ${settings.companyIban}`
      : '',

    [
      settings.companyPhone,
      settings.companyEmail,
    ]
      .filter(Boolean)
      .join('  •  '),

    settings.companyWebsite,
  ]
    .filter(Boolean)
    .map(
      (line) =>
        `<div>${escapeHtml(
          line,
        )}</div>`,
    )
    .join('')

  return `
    <div class="company">
      ${logo}

      <div class="company-copy">
        <div class="company-name">
          ${escapeHtml(
            settings.companyName,
          )}
        </div>

        ${
          settings.companySubtitle
            ? `
              <div
                class="company-subtitle"
              >
                ${escapeHtml(
                  settings.companySubtitle,
                )}
              </div>
            `
            : ''
        }

        <div class="company-lines">
          ${companyLines}
        </div>
      </div>
    </div>
  `
}

function customerLines(
  offer: OfferPdfData,
) {
  const address =
    [
      offer.address,
      offer.city,
    ]
      .filter(Boolean)
      .join(', ')

  return [
    address
      ? `
        <div>
          ${escapeHtml(address)}
        </div>
      `
      : '',

    offer.oib
      ? `
        <div>
          OIB:
          ${escapeHtml(
            offer.oib,
          )}
        </div>
      `
      : '',

    offer.email
      ? `
        <div>
          ${escapeHtml(
            offer.email,
          )}
        </div>
      `
      : '',

    offer.phone
      ? `
        <div>
          ${escapeHtml(
            offer.phone,
          )}
        </div>
      `
      : '',
  ]
    .filter(Boolean)
    .join('')
}

function infoGridHtml(
  offer: OfferPdfData,
  settings: OfferPdfSettings,
) {
  return `
    <section
      class="info-grid
        ${escapeHtml(
          settings.infoStyle,
        )}"
    >
      <article class="info-block">
        <div class="info-title">
          INVESTITOR
        </div>

        <div class="investor-name">
          ${escapeHtml(
            offer.customerName,
          )}
        </div>

        <div class="info-lines">
          ${customerLines(offer)}
        </div>
      </article>

      <article class="info-block">
        <div class="info-title">
          PODACI PONUDE
        </div>

        <div class="meta-row">
          <span>Datum ponude</span>
          <strong>
            ${formatDate(
              offer.date,
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Vrijedi do</span>
          <strong>
            ${formatDate(
              offer.validUntil,
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Status</span>
          <strong>
            ${escapeHtml(
              offer.status,
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Izradio</span>
          <strong>
            ${escapeHtml(
              offer.responsiblePerson ||
              '—',
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Valuta</span>
          <strong>EUR</strong>
        </div>
      </article>
    </section>
  `
}

function itemRows(
  items: OfferPdfItem[],
  startIndex: number,
  settings: OfferPdfSettings,
) {
  if (!items.length) {
    return ''
  }

  return items
    .map(
      (
        item,
        index,
      ) => {
        const showImageColumn =
          settings.showItemImages

        const image =
          showImageColumn &&
          item.imageDataUrl
            ? `
              <div
                class="item-image-wrap"
              >
                <img
                  class="item-image"
                  src="${escapeHtml(
                    item.imageDataUrl,
                  )}"
                  alt="${escapeHtml(
                    item.imageName ||
                    item.name,
                  )}"
                />
              </div>
            `
            : (
                showImageColumn
                  ? `
                    <div
                      class="item-image-wrap"
                    >
                      <div
                        class="item-image-placeholder"
                      >
                        bez slike
                      </div>
                    </div>
                  `
                  : ''
              )

        return `
          <article
            class="item-row
              ${
                showImageColumn
                  ? ''
                  : 'no-image-column'
              }"
          >
            <div class="item-index">
              ${String(
                startIndex +
                index +
                1,
              ).padStart(2, '0')}
            </div>

            ${image}

            <div class="item-main">
              <div class="item-name">
                ${escapeHtml(
                  item.name,
                )}
              </div>

              ${
                item.description
                  ? `
                    <div
                      class="item-description"
                    >
                      ${multilineHtml(
                        item.description,
                      )}
                    </div>
                  `
                  : ''
              }
            </div>

            <div class="item-data">
              <small>Količina</small>
              ${formatNumber(
                item.quantity,
              )}
              ${escapeHtml(
                item.unit,
              )}
            </div>

            <div class="item-data">
              <small>Jed. cijena</small>
              ${formatCurrency(
                item.price,
              )}

              ${
                item.discount > 0
                  ? `
                    <div
                      class="item-discount"
                    >
                      Popust
                      ${formatNumber(
                        item.discount,
                      )}%
                    </div>
                  `
                  : ''
              }
            </div>

            <div
              class="item-data
                item-total"
            >
              <small>Ukupno</small>
              ${formatCurrency(
                itemTotal(item),
              )}
            </div>
          </article>
        `
      },
    )
    .join('')
}

function finalBlockHtml(
  offer: OfferPdfData,
  settings: OfferPdfSettings,
  base: number,
  net: number,
  vat: number,
  discount: number,
  total: number,
) {
  const notes: string[] = []

  if (
    offer.description.trim()
  ) {
    notes.push(
      `
        <div class="note-body">
          ${multilineHtml(
            offer.description,
          )}
        </div>
      `,
    )
  }

  if (
    offer.paymentTerms.trim()
  ) {
    notes.push(
      `
        <div class="note-body">
          ${multilineHtml(
            offer.paymentTerms,
          )}
        </div>
      `,
    )
  }

  if (
    offer.internalNote.trim()
  ) {
    notes.push(
      `
        <div class="note-body">
          ${multilineHtml(
            offer.internalNote,
          )}
        </div>
      `,
    )
  }

  const signatureImage =
    settings.signatureDataUrl
      ? `
        <img
          class="signature-image"
          src="${escapeHtml(
            settings.signatureDataUrl,
          )}"
          alt="Potpis"
        />
      `
      : ''

  const stamp =
    settings.showStamp &&
    settings.stampDataUrl
      ? `
        <img
          class="stamp-image"
          src="${escapeHtml(
            settings.stampDataUrl,
          )}"
          alt="Pečat"
        />
      `
      : ''

  return `
    <section class="final-grid">
      <div class="notes">
        <div class="note-title">
          NAPOMENA I UVJETI
        </div>

        ${
          notes.length
            ? notes.join('')
            : `
              <div class="note-body">
                Ponuda vrijedi do
                <strong>
                  ${formatDate(
                    offer.validUntil,
                  )}
                </strong>.
              </div>
            `
        }
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Međuzbroj</span>
          <strong>
            ${formatCurrency(base)}
          </strong>
        </div>

        ${
          discount > 0
            ? `
              <div class="total-row">
                <span>Popust</span>
                <strong>
                  −
                  ${formatCurrency(
                    discount,
                  )}
                </strong>
              </div>
            `
            : ''
        }

        <div class="total-row">
          <span>Osnovica</span>
          <strong>
            ${formatCurrency(net)}
          </strong>
        </div>

        <div class="total-row">
          <span>PDV</span>
          <strong>
            ${formatCurrency(vat)}
          </strong>
        </div>

        <div
          class="total-row grand"
        >
          <span>
            UKUPNO ZA UPLATU
          </span>

          <span>
            ${formatCurrency(total)}
          </span>
        </div>
      </div>
    </section>

    ${
      settings.showSignature
        ? `
          <section
            class="signature-grid"
          >
            <div
              class="signature-column"
            >
              <div
                class="signature-label"
              >
                Ponudu izradio:
              </div>

              <div
                class="signature-space"
              >
                ${signatureImage}
              </div>

              <div
                class="signature-line"
              >
                <strong>
                  ${escapeHtml(
                    offer.responsiblePerson ||
                    settings.companyName,
                  )}
                </strong>

                ${escapeHtml(
                  settings.companyName,
                )}
              </div>
            </div>

            <div
              class="stamp-column"
            >
              ${stamp}
            </div>

            <div
              class="signature-column"
            >
              <div
                class="signature-label"
              >
                Ovlaštena osoba /
                investitor:
              </div>

              <div
                class="signature-space"
              ></div>

              <div
                class="signature-line"
              >
                <strong>
                  Potpis / pečat
                </strong>
              </div>
            </div>
          </section>
        `
        : ''
    }
  `
}

async function waitForPdfImages(
  target: Document,
) {
  const images =
    Array.from(
      target.querySelectorAll(
        'img',
      ),
    )

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>(
          (resolve) => {
            if (image.complete) {
              resolve()
              return
            }

            image.onload =
              () => resolve()

            image.onerror =
              () => resolve()
          },
        ),
    ),
  )
}

async function renderHtmlPagesToPdf(
  html: string,
  fileName: string,
  backgroundColor: string,
) {
  const iframe =
    document.createElement(
      'iframe',
    )

  Object.assign(
    iframe.style,
    {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '794px',
      height: '1123px',
      border: '0',
      pointerEvents:
        'none',
      zIndex:
        '-2147483647',
    },
  )

  document.body.appendChild(
    iframe,
  )

  try {
    const iframeDocument =
      iframe.contentDocument

    if (!iframeDocument) {
      throw new Error(
        'PDF renderer nije dostupan.',
      )
    }

    iframeDocument.open()
    iframeDocument.write(
      html,
    )
    iframeDocument.close()

    await new Promise<void>(
      (resolve) =>
        window.setTimeout(
          resolve,
          120,
        ),
    )

    await iframeDocument
      .fonts?.ready

    await waitForPdfImages(
      iframeDocument,
    )

    const toolbar =
      iframeDocument.querySelector(
        '.toolbar',
      ) as HTMLElement | null

    if (toolbar) {
      toolbar.style.display =
        'none'
    }

    const pages =
      Array.from(
        iframeDocument.querySelectorAll(
          '.page',
        ),
      ) as HTMLElement[]

    if (!pages.length) {
      throw new Error(
        'PDF nema stranica za izradu.',
      )
    }

    const doc =
      new jsPDF({
        orientation:
          'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

    for (
      let index = 0;
      index < pages.length;
      index += 1
    ) {
      pages[index].style.margin =
        '0'

      pages[index].style.boxShadow =
        'none'

      const canvas =
        await html2canvas(
          pages[index],
          {
            scale: 2,
            backgroundColor,
            useCORS: true,
            allowTaint: false,
            logging: false,
          },
        )

      const image =
        canvas.toDataURL(
          'image/jpeg',
          0.96,
        )

      if (index > 0) {
        doc.addPage()
      }

      doc.addImage(
        image,
        'JPEG',
        0,
        0,
        210,
        297,
        undefined,
        'FAST',
      )
    }

    doc.save(fileName)
  } finally {
    iframe.remove()
  }
}

export function buildOfferPdfHtml(
  offer: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  const settings:
    OfferPdfSettings = {
      ...DEFAULT_SETTINGS,
      ...customSettings,
    }

  const items =
    offer.items.filter(
      (item) =>
        item.name.trim(),
    )

  const base =
    items.reduce(
      (sum, item) =>
        sum +
        item.quantity *
        item.price,
      0,
    )

  const net =
    items.reduce(
      (sum, item) =>
        sum +
        itemNet(item),
      0,
    )

  const vat =
    items.reduce(
      (sum, item) =>
        sum +
        itemVat(item),
      0,
    )

  const discount =
    base - net

  const total =
    net + vat

  const pages =
    paginateItems(
      items,
      settings,
    )

  let rowIndex = 0

  const pageHtml =
    pages
      .map(
        (
          page,
          pageIndex,
        ) => {
          const startIndex =
            rowIndex

          rowIndex +=
            page.items.length

          return `
            <section class="page">
              ${
                settings.showWatermark &&
                settings.watermarkText
                  ? `
                    <div
                      class="watermark"
                    >
                      ${escapeHtml(
                        settings.watermarkText,
                      )}
                    </div>
                  `
                  : ''
              }

              <div
                class="page-content"
              >
                <header
                  class="header
                    align-${escapeHtml(
                      settings.headerAlignment,
                    )}"
                >
                  ${companyBlock(
                    settings,
                  )}

                  <div
                    class="document-heading"
                  >
                    <h1
                      class="document-title"
                    >
                      ${escapeHtml(
                        settings.documentTitle ||
                        'PONUDA',
                      )}
                    </h1>

                    <div
                      class="document-number"
                    >
                      <span>BR.</span>
                      ${escapeHtml(
                        offer.offerNumber,
                      )}
                    </div>

                    <div
                      class="document-date"
                    >
                      Datum:
                      ${formatDate(
                        offer.date,
                      )}
                    </div>
                  </div>
                </header>

                ${
                  page.first
                    ? `
                      ${infoGridHtml(
                        offer,
                        settings,
                      )}

                      ${
                        offer.description
                          ? `
                            <div
                              class="offer-description"
                            >
                              ${multilineHtml(
                                offer.description,
                              )}
                            </div>
                          `
                          : ''
                      }
                    `
                    : `
                      <div
                        class="continuation"
                      >
                        Nastavak ponude
                        ${escapeHtml(
                          offer.offerNumber,
                        )}
                      </div>
                    `
                }

                ${
                  page.items.length > 0
                    ? `
                      ${sectionTitleHtml(
                        'Popis stavki',
                        settings,
                      )}

                      <div
                        class="table-${escapeHtml(
                          settings.tableStyle,
                        )}"
                      >
                        <div class="items">
                          ${itemRows(
                            page.items,
                            startIndex,
                            settings,
                          )}
                        </div>
                      </div>
                    `
                    : ''
                }

                ${
                  page.final
                    ? finalBlockHtml(
                        offer,
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
                    ? `
                      <footer
                        class="footer"
                      >
                        <span>
                          ${escapeHtml(
                            settings.footerText,
                          )}
                        </span>

                        <span
                          class="footer-center"
                        >
                          ${pageIndex + 1}
                          /
                          ${pages.length}
                        </span>
                      </footer>
                    `
                    : ''
                }
              </div>
            </section>
          `
        },
      )
      .join('')

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />

  <title>
    ${escapeHtml(
      offer.offerNumber,
    )}
  </title>

  <style>
    ${documentCss(
      settings,
    )}
  </style>
</head>

<body>
  <div class="toolbar">
    <button
      class="primary"
      onclick="window.print()"
    >
      Ispis / spremi kao PDF
    </button>

    <button
      class="secondary"
      onclick="window.close()"
    >
      Zatvori
    </button>
  </div>

  <main class="pages">
    ${pageHtml}
  </main>

  <script>
    document.title =
      ${JSON.stringify(
        `${safeFileName(
          offer.offerNumber ||
          'Ponuda',
        )}-${safeFileName(
          offer.customerName ||
          'Investitor',
        )}`,
      )};
  </script>
</body>
</html>`
}

async function resolvedPdfSettings(
  customSettings:
    Partial<OfferPdfSettings>,
) {
  const [
    company,
    appearanceResult,
  ] =
    await Promise.all([
      getCompanySettings(),
      getDocumentAppearanceSettings(),
    ])

  const appearance =
    appearanceResult.settings.offer

  return {
    ...DEFAULT_SETTINGS,
    ...companySettingsFromCurrent(
      company,
    ),
    ...appearanceToPdfSettings(
      appearance,
    ),
    ...customSettings,
  } satisfies OfferPdfSettings
}

export function openOfferPdf(
  offer: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  const previewWindow =
    window.open(
      '',
      '_blank',
    )

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
      const settings =
        await resolvedPdfSettings(
          customSettings,
        )

      const html =
        buildOfferPdfHtml(
          offer,
          settings,
        )

      previewWindow.document.open()
      previewWindow.document.write(
        html,
      )
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
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  try {
    const settings =
      await resolvedPdfSettings(
        customSettings,
      )

    const html =
      buildOfferPdfHtml(
        data,
        settings,
      )

    const fileName =
      `${safeFileName(
        data.offerNumber ||
        'Ponuda',
      )}-${safeFileName(
        data.customerName ||
        'Investitor',
      )}.pdf`

    await renderHtmlPagesToPdf(
      html,
      fileName,
      settings.backgroundColor ||
      '#FFFFFF',
    )
  } catch (error) {
    console.error(
      'downloadOfferPdf error:',
      error,
    )

    window.alert(
      error instanceof Error
        ? `PDF nije moguće izraditi: ${error.message}`
        : 'PDF nije moguće izraditi.',
    )
  }
}