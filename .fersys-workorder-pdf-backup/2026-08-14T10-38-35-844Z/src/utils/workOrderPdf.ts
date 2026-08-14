import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
  WorkOrderMaterial,
} from '../types/workOrder'

type LogicalPage = {
  materials: WorkOrderMaterial[]
  photos: WorkOrderImage[]
  showInfo: boolean
  showDescription: boolean
  showTotals: boolean
  showSignature: boolean
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function multilineHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

function formatDate(value: string) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('hr-HR').format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function durationFromTimes(
  arrivalTime: string,
  departureTime: string,
) {
  if (!arrivalTime || !departureTime) return 0

  const [ah, am] = arrivalTime.split(':').map(Number)
  const [dh, dm] = departureTime.split(':').map(Number)

  if (
    [ah, am, dh, dm].some(
      (value) => !Number.isFinite(value),
    )
  ) {
    return 0
  }

  const start = ah * 60 + am
  let end = dh * 60 + dm

  if (end < start) {
    end += 24 * 60
  }

  return Math.max(0, end - start)
}

function durationLabel(
  order: WorkOrder,
) {
  const minutes =
    order.durationMinutes > 0
      ? order.durationMinutes
      : durationFromTimes(
          order.arrivalTime,
          order.departureTime,
        )

  if (!minutes) return '—'

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours && rest) return `${hours} h ${rest} min`
  if (hours) return `${hours} h`
  return `${rest} min`
}

function materialTotal(
  item: WorkOrderMaterial,
) {
  return item.quantity * item.unitPrice
}

function calculatedMaterialTotal(
  order: WorkOrder,
) {
  const total = order.materials.reduce(
    (sum, item) => sum + materialTotal(item),
    0,
  )

  return total > 0
    ? total
    : Number(order.materialPrice || 0)
}

function calculatedTotals(
  order: WorkOrder,
) {
  const material = calculatedMaterialTotal(order)
  const labour = Number(order.labourPrice || 0)
  const base = material + labour
  const vat =
    base * (Number(order.vatRate || 0) / 100)

  const total =
    Number(order.totalPrice || 0) > 0
      ? Number(order.totalPrice)
      : base + vat

  return {
    material,
    labour,
    vat,
    total,
  }
}

function paginateOrder(
  order: WorkOrder,
): LogicalPage[] {
  const pages: LogicalPage[] = []
  const firstMaterialLimit = 12

  pages.push({
    materials:
      order.materials.slice(
        0,
        firstMaterialLimit,
      ),
    photos: [],
    showInfo: true,
    showDescription: true,
    showTotals:
      order.materials.length <=
      firstMaterialLimit,
    showSignature:
      order.materials.length <=
        firstMaterialLimit &&
      order.images.length === 0,
  })

  let materialIndex = firstMaterialLimit

  while (
    materialIndex <
    order.materials.length
  ) {
    const materials =
      order.materials.slice(
        materialIndex,
        materialIndex + 18,
      )

    materialIndex += materials.length

    const isLastMaterialPage =
      materialIndex >=
      order.materials.length

    pages.push({
      materials,
      photos: [],
      showInfo: false,
      showDescription: false,
      showTotals:
        isLastMaterialPage,
      showSignature:
        isLastMaterialPage &&
        order.images.length === 0,
    })
  }

  if (order.images.length > 0) {
    for (
      let index = 0;
      index < order.images.length;
      index += 4
    ) {
      const photos =
        order.images.slice(
          index,
          index + 4,
        )

      const isLastPhotoPage =
        index + 4 >=
        order.images.length

      pages.push({
        materials: [],
        photos,
        showInfo: false,
        showDescription: false,
        showTotals: false,
        showSignature:
          isLastPhotoPage,
      })
    }
  }

  return pages
}

function layoutClass(
  branding: WorkOrderBranding,
) {
  if (branding.layout === 'classic') {
    return 'layout-classic'
  }

  if (
    branding.layout === 'custom' ||
    branding.layout === 'minimal'
  ) {
    return 'layout-custom'
  }

  return 'layout-modern'
}

function commonCss(
  branding: WorkOrderBranding,
) {
  const primary =
    branding.primaryColor || '#2563EB'

  const secondary =
    branding.secondaryColor || '#0F172A'

  const text =
    branding.textColor || '#0F172A'

  const border =
    branding.borderColor || '#D6DEE8'

  const background =
    branding.backgroundColor || '#FFFFFF'

  return `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #dfe5ec;
      color: ${text};
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    .pdf-page {
      position: relative;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      background: ${background};
      page-break-after: always;
    }

    .page-body {
      display: flex;
      height: 100%;
      flex-direction: column;
    }

    .accent-line {
      height: 7px;
      background: ${primary};
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        240px;
      gap: 28px;
      align-items: start;
      padding:
        31px 52px
        20px;
    }

    .company-wrap {
      display: flex;
      gap: 16px;
      min-width: 0;
    }

    .logo,
    .logo-fallback {
      width: 68px;
      height: 68px;
      flex: 0 0 68px;
      object-fit: contain;
    }

    .logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: ${primary};
      color: #fff;
      font-size: 22px;
      font-weight: 900;
    }

    .company-name {
      margin: 2px 0 0;
      color: ${secondary};
      font-size: 24px;
      line-height: 1.1;
      font-weight: 900;
    }

    .company-details {
      margin-top: 7px;
      color: #64748b;
      font-size: 10.5px;
      line-height: 1.48;
    }

    .document-heading {
      text-align: right;
    }

    .document-kicker {
      color: ${primary};
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    .document-title {
      margin-top: 5px;
      color: ${secondary};
      font-size: 28px;
      line-height: 1;
      font-weight: 950;
    }

    .document-number {
      display: inline-block;
      margin-top: 8px;
      border-radius: 999px;
      padding: 5px 10px;
      background: #eef4ff;
      color: ${primary};
      font-size: 10px;
      font-weight: 900;
    }

    .document-meta {
      margin-top: 8px;
      color: #64748b;
      font-size: 9.5px;
      line-height: 1.5;
    }

    .divider {
      height: 1px;
      margin: 0 52px 16px;
      background: #e2e8f0;
    }

    .page-content {
      flex: 1 1 auto;
      padding: 0 52px;
    }

    .info-grid {
      display: grid;
      grid-template-columns:
        1.05fr .95fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .info-card {
      min-height: 112px;
      padding: 14px 15px;
      border: 1px solid ${border};
      border-radius: 12px;
      background: #fff;
    }

    .info-card.muted {
      background: #f8fafc;
    }

    .eyebrow {
      color: #94a3b8;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .09em;
      text-transform: uppercase;
    }

    .customer-name {
      margin-top: 7px;
      color: ${secondary};
      font-size: 16px;
      font-weight: 900;
    }

    .info-line {
      margin-top: 5px;
      color: #475569;
      font-size: 10.5px;
      line-height: 1.35;
    }

    .meta-row {
      display: flex;
      justify-content:
        space-between;
      gap: 14px;
      margin-top: 6px;
      color: #64748b;
      font-size: 10px;
    }

    .meta-row strong {
      max-width: 67%;
      color: ${secondary};
      text-align: right;
    }

    .duration {
      margin-top: 9px;
      border-radius: 999px;
      padding: 6px 9px;
      background: ${primary};
      color: #fff;
      font-size: 10px;
      font-weight: 900;
      text-align: center;
    }

    .section {
      margin-top: 15px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px;
      color: ${secondary};
      font-size: 13.5px;
      font-weight: 900;
    }

    .section-title::before {
      width: 4px;
      height: 20px;
      border-radius: 4px;
      background: ${primary};
      content: "";
    }

    .description-box {
      padding: 11px 14px;
      border: 1px solid ${border};
      border-radius: 10px;
      background: #fff;
    }

    .work-title {
      display: block;
      margin-bottom: 5px;
      color: ${secondary};
      font-size: 11.5px;
      font-weight: 900;
    }

    .normal-text {
      color: #334155;
      font-size: 10.8px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .table-wrap {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 9px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9.8px;
    }

    th {
      padding: 7px 8px;
      background: ${secondary};
      color: #fff;
      font-size: 8.7px;
      font-weight: 900;
      text-align: left;
      text-transform: uppercase;
    }

    th:nth-child(1) { width: 45%; }
    th:nth-child(2) { width: 17%; }
    th:nth-child(3) { width: 18%; }
    th:nth-child(4) { width: 20%; }

    td {
      padding: 6px 8px;
      border-bottom:
        1px solid
        #e5eaf0;
      color: #1e293b;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }

    tbody tr:nth-child(even) td {
      background: #f8fafc;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
      white-space: nowrap;
    }

    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .totals {
      width: 275px;
    }

    .total-row {
      display: flex;
      justify-content:
        space-between;
      gap: 15px;
      padding: 4px 3px;
      color: #64748b;
      font-size: 9.5px;
    }

    .total-row strong {
      color: ${secondary};
    }

    .grand-total {
      display: flex;
      justify-content:
        space-between;
      gap: 15px;
      margin-top: 3px;
      border-radius: 8px;
      padding: 9px 11px;
      background: #eef4ff;
      color: ${primary};
      font-size: 13px;
      font-weight: 950;
    }

    .price-note {
      margin-top: 7px;
      color: #64748b;
      font-size: 9px;
      line-height: 1.35;
    }

    .photo-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 12px;
    }

    .photo-card {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 10px;
      background: #f8fafc;
    }

    .photo-card img {
      display: block;
      width: 100%;
      height: 225px;
      object-fit: contain;
      background: #fff;
    }

    .photo-name {
      overflow: hidden;
      padding: 6px 8px;
      color: #64748b;
      font-size: 8.5px;
      text-overflow:
        ellipsis;
      white-space: nowrap;
    }

    .signature-section {
      margin-top: auto;
      padding:
        17px 52px
        22px;
    }

    .signature-title {
      margin-bottom: 14px;
      color: ${secondary};
      font-size: 12px;
      font-weight: 900;
    }

    .signature-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 65px;
    }

    .signature-space {
      display: flex;
      height: 62px;
      align-items: flex-end;
      justify-content: center;
    }

    .signature-space img {
      max-width: 155px;
      max-height: 58px;
      object-fit: contain;
    }

    .signature-line {
      border-top:
        1px solid
        #94a3b8;
      padding-top: 6px;
      text-align: center;
    }

    .signature-line strong {
      display: block;
      color: ${secondary};
      font-size: 10px;
    }

    .signature-line span {
      display: block;
      margin-top: 2px;
      color: #94a3b8;
      font-size: 8.5px;
    }

    .footer {
      display: flex;
      justify-content:
        space-between;
      gap: 16px;
      margin: 0 52px 13px;
      border-top:
        1px solid
        #e2e8f0;
      padding-top: 6px;
      color: #94a3b8;
      font-size: 7.5px;
    }

    .continuation-note {
      margin-bottom: 13px;
      color: #94a3b8;
      font-size: 9px;
    }

    /* Jasno različiti preset izgledi */
    .layout-classic .page-body {
      background: #fff;
    }

    .layout-classic .header {
      grid-template-columns: minmax(0, 1fr) 220px;
      margin: 0 0 16px;
      padding: 27px 52px 24px;
      background: ${secondary};
    }

    .layout-classic .company-name,
    .layout-classic .document-title {
      color: #fff;
    }

    .layout-classic .company-details,
    .layout-classic .document-meta,
    .layout-classic .document-kicker {
      color: #cbd5e1;
    }

    .layout-classic .document-number {
      background: rgba(255,255,255,.12);
      color: #fff;
    }

    .layout-classic .divider {
      display: none;
    }

    .layout-classic .info-card,
    .layout-classic .description-box,
    .layout-classic .table-wrap {
      border-radius: 4px;
    }

    .layout-classic .section-title::before {
      border-radius: 0;
      background: ${secondary};
    }

    .layout-classic th {
      background: ${secondary};
    }

    .layout-modern .header {
      padding-top: 34px;
      padding-bottom: 22px;
    }

    .layout-modern .document-heading {
      border-left: 4px solid ${primary};
      padding-left: 18px;
    }

    .layout-modern .info-card {
      box-shadow: 0 7px 20px rgba(15,23,42,.06);
    }

    .layout-modern .info-card.muted {
      background: #f8fafc;
    }

    .layout-modern .description-box,
    .layout-modern .table-wrap {
      box-shadow: 0 5px 16px rgba(15,23,42,.045);
    }

    .layout-modern .grand-total {
      background: ${primary};
      color: #fff;
    }

    .layout-custom .accent-line {
      height: 10px;
      background:
        linear-gradient(
          90deg,
          ${primary},
          ${secondary}
        );
    }

    .layout-custom .header {
      border-bottom: 0;
      padding-bottom: 16px;
    }

    .layout-custom .document-heading {
      text-align: ${
        branding.headerAlignment === 'center'
          ? 'center'
          : branding.headerAlignment === 'left'
            ? 'left'
            : 'right'
      };
    }

    .layout-custom .document-title {
      color: ${primary};
    }

    .layout-custom .info-card {
      border: 2px solid ${primary};
    }

    .layout-custom .section-title {
      color: ${primary};
    }

    .layout-custom th {
      background:
        linear-gradient(
          90deg,
          ${secondary},
          ${primary}
        );
    }



    /* FERSYS Work Order PRO V2 */
    .workorder-header {
      display: block;
      padding: 22px 42px 12px;
    }

    .workorder-topline {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }

    .workorder-topline .company-wrap {
      flex: 1 1 auto;
      max-width: 72%;
    }

    .workorder-topline .logo,
    .workorder-topline .logo-fallback {
      width: 54px;
      height: 54px;
      flex-basis: 54px;
    }

    .workorder-topline .company-name {
      font-size: 20px;
    }

    .workorder-topline .company-details {
      margin-top: 4px;
      font-size: 9px;
      line-height: 1.32;
    }

    .workorder-topline .document-heading {
      flex: 0 0 auto;
      min-width: 180px;
      text-align: right;
    }

    .workorder-topline .document-title {
      margin-top: 3px;
      font-size: 24px;
    }

    .workorder-meta-strip {
      display: grid;
      grid-template-columns: 1.25fr 1fr 1.35fr .95fr 1fr .55fr;
      gap: 0;
      margin-top: 14px;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 9px;
      background: #fff;
    }

    .workorder-meta-strip > div {
      min-width: 0;
      padding: 8px 9px;
      border-right: 1px solid ${border};
    }

    .workorder-meta-strip > div:last-child {
      border-right: 0;
    }

    .workorder-meta-strip span {
      display: block;
      color: #94a3b8;
      font-size: 7.2px;
      font-weight: 900;
      letter-spacing: .06em;
      text-transform: uppercase;
    }

    .workorder-meta-strip strong {
      display: block;
      overflow: hidden;
      margin-top: 3px;
      color: ${secondary};
      font-size: 9.3px;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .page-content {
      padding: 0 42px;
    }

    .workorder-info-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 245px;
      gap: 10px;
      margin-bottom: 10px;
    }

    .workorder-investor,
    .workorder-workers {
      min-width: 0;
      border: 1px solid ${border};
      border-radius: 9px;
      padding: 10px 12px;
      background: #fff;
    }

    .workorder-workers {
      background: #f8fafc;
    }

    .workorder-investor .customer-name {
      margin-top: 4px;
      font-size: 13px;
    }

    .workorder-inline-details {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-top: 5px;
      color: #64748b;
      font-size: 8.8px;
      line-height: 1.3;
    }

    .workorder-inline-details span + span::before {
      margin-right: 8px;
      color: #cbd5e1;
      content: "•";
    }

    .workorder-workers strong {
      display: block;
      margin-top: 6px;
      color: ${secondary};
      font-size: 9.5px;
      line-height: 1.35;
    }

    .section {
      margin-top: 10px;
    }

    .section-title {
      margin-bottom: 5px;
      font-size: 11.5px;
    }

    .section-title::before {
      width: 3px;
      height: 16px;
    }

    .description-box {
      padding: 8px 10px;
    }

    .work-title {
      margin-bottom: 3px;
      font-size: 10.2px;
    }

    .normal-text {
      font-size: 9.2px;
      line-height: 1.32;
    }

    table {
      font-size: 8.7px;
    }

    th {
      padding: 5px 6px;
      font-size: 7.8px;
    }

    td {
      padding: 4.5px 6px;
    }

    .totals-wrap {
      margin-top: 8px;
    }

    .totals {
      width: 250px;
    }

    .total-row {
      padding: 3px;
      font-size: 8.7px;
    }

    .grand-total {
      padding: 7px 9px;
      font-size: 11.5px;
    }

    .photo-grid {
      gap: 10px;
    }

    .photo-card img {
      height: 205px;
    }

    .signature-section {
      margin-top: auto;
      padding: 10px 42px 14px;
    }

    .signature-title {
      margin-bottom: 7px;
      font-size: 10px;
    }

    .signature-grid {
      gap: 48px;
    }

    .signature-space {
      height: 48px;
    }

    .signature-space img {
      max-width: 170px;
      max-height: 47px;
    }

    .signature-line {
      padding-top: 4px;
    }

    .signature-line strong {
      font-size: 9px;
    }

    .signature-line span {
      font-size: 7.5px;
    }

    .footer {
      margin: 0 42px 8px;
      padding-top: 4px;
      font-size: 6.8px;
    }

    .continuation-note {
      margin-bottom: 8px;
      font-size: 8px;
    }

    .layout-modern .workorder-meta-strip {
      border-color: ${primary};
      box-shadow: 0 5px 15px rgba(15,23,42,.045);
    }

    .layout-classic .workorder-header {
      margin-bottom: 10px;
      padding-top: 18px;
      padding-bottom: 15px;
      background: ${secondary};
    }

    .layout-classic .workorder-meta-strip {
      border-color: rgba(255,255,255,.16);
      background: rgba(255,255,255,.07);
    }

    .layout-classic .workorder-meta-strip > div {
      border-color: rgba(255,255,255,.13);
    }

    .layout-classic .workorder-meta-strip span {
      color: #94a3b8;
    }

    .layout-classic .workorder-meta-strip strong {
      color: #fff;
    }

    .layout-classic .workorder-investor,
    .layout-classic .workorder-workers {
      border-radius: 2px;
    }

    .layout-custom .workorder-meta-strip {
      border: 2px solid ${primary};
    }

    .layout-custom .workorder-workers {
      background: #eef4ff;
    }

    ${
      branding.showBackgroundImage &&
      branding.backgroundImage
        ? `
          .pdf-page::before {
            position: absolute;
            inset: 0;
            z-index: 0;
            background:
              url("${branding.backgroundImage}")
              center / cover
              no-repeat;
            opacity: .06;
            content: "";
          }

          .page-body {
            position: relative;
            z-index: 1;
          }
        `
        : ''
    }

    @media print {
      html,
      body {
        background: #fff;
      }
    }
  `
}

function companyLogoHtml(
  branding: WorkOrderBranding,
) {
  if (
    branding.showLogo &&
    branding.logo
  ) {
    return `
      <img
        class="logo"
        src="${escapeHtml(
          branding.logo,
        )}"
        alt=""
      />
    `
  }

  return `
    <div class="logo-fallback">
      ${escapeHtml(
        (
          branding.companyName ||
          'FY'
        )
          .slice(0, 2)
          .toUpperCase(),
      )}
    </div>
  `
}

function headerHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  pageNumber: number,
) {
  const companyLines = [
    branding.companyAddress,
    [
      branding.showCompanyPhone
        ? branding.companyPhone
        : '',
      branding.showCompanyEmail
        ? branding.companyEmail
        : '',
    ]
      .filter(Boolean)
      .join(' • '),
    [
      branding.showCompanyOib &&
      branding.companyOib
        ? `OIB: ${branding.companyOib}`
        : '',
      branding.showCompanyIban &&
      branding.companyIban
        ? `IBAN: ${branding.companyIban}`
        : '',
    ]
      .filter(Boolean)
      .join(' • '),
  ]
    .filter(Boolean)
    .map(
      (line) =>
        `<div>${escapeHtml(line)}</div>`,
    )
    .join('')

  const title =
    branding.layout === 'custom'
      ? (
          branding.customDocumentTitle ||
          'RADNI NALOG'
        )
      : 'RADNI NALOG'

  return `
    <div class="accent-line"></div>

    <header class="header workorder-header">
      <div class="workorder-topline">
        <div class="company-wrap">
          ${companyLogoHtml(
            branding,
          )}

          <div class="company-copy">
            <div class="company-name">
              ${escapeHtml(
                branding.companyName,
              )}
            </div>

            <div class="company-details">
              ${companyLines}
            </div>
          </div>
        </div>

        <div class="document-heading">
          <div class="document-kicker">
            Servisni dokument
          </div>

          <div class="document-title">
            ${escapeHtml(title)}
          </div>
        </div>
      </div>

      <div class="workorder-meta-strip">
        <div>
          <span>Broj naloga</span>
          <strong>
            ${escapeHtml(
              order.orderNumber,
            )}
          </strong>
        </div>

        <div>
          <span>Datum</span>
          <strong>
            ${escapeHtml(
              formatDate(order.date),
            )}
          </strong>
        </div>

        <div>
          <span>Dolazak / odlazak</span>
          <strong>
            ${escapeHtml(
              order.arrivalTime ||
              '—',
            )}
            –
            ${escapeHtml(
              order.departureTime ||
              '—',
            )}
          </strong>
        </div>

        <div>
          <span>Trajanje</span>
          <strong>
            ${escapeHtml(
              durationLabel(order),
            )}
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            ${escapeHtml(
              order.status ||
              '—',
            )}
          </strong>
        </div>

        <div>
          <span>Stranica</span>
          <strong>
            ${pageNumber}
          </strong>
        </div>
      </div>
    </header>
  `
}

function infoHtml(
  order: WorkOrder,
) {
  return `
    <section class="workorder-info-strip">
      <article class="workorder-investor">
        <div class="eyebrow">
          Investitor / naručitelj
        </div>

        <div class="customer-name">
          ${escapeHtml(
            order.customerName ||
            order.investorName ||
            '—',
          )}
        </div>

        <div class="workorder-inline-details">
          <span>
            ${escapeHtml(
              order.address ||
              '—',
            )}
          </span>

          ${
            order.customerOib
              ? `
                <span>
                  OIB:
                  ${escapeHtml(
                    order.customerOib,
                  )}
                </span>
              `
              : ''
          }

          ${
            order.customerPhone
              ? `
                <span>
                  ${escapeHtml(
                    order.customerPhone,
                  )}
                </span>
              `
              : ''
          }

          ${
            order.customerEmail
              ? `
                <span>
                  ${escapeHtml(
                    order.customerEmail,
                  )}
                </span>
              `
              : ''
          }
        </div>
      </article>

      <article class="workorder-workers">
        <div class="eyebrow">
          Izvršitelji
        </div>

        <strong>
          ${escapeHtml(
            order.assignedWorkers
              .join(', ') ||
            '—',
          )}
        </strong>
      </article>
    </section>
  `
}

function descriptionHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  show: boolean,
) {
  if (!show) return ''

  const label =
    branding.layout === 'custom'
      ? (
          branding.customDescriptionLabel ||
          'Opis radova'
        )
      : 'Opis radova'

  return `
    <section class="section">
      <h2 class="section-title">
        ${escapeHtml(label)}
      </h2>

      <div class="description-box">
        ${
          order.title
            ? `
              <strong class="work-title">
                ${escapeHtml(
                  order.title,
                )}
              </strong>
            `
            : ''
        }

        <div class="normal-text">
          ${
            order.description
              ? multilineHtml(
                  order.description,
                )
              : 'Nema dodatnog opisa.'
          }
        </div>
      </div>
    </section>
  `
}

function materialsHtml(
  materials:
    WorkOrderMaterial[],
  branding:
    WorkOrderBranding,
) {
  if (!materials.length) return ''

  const label =
    branding.layout === 'custom'
      ? (
          branding.customMaterialsLabel ||
          'Utrošeni materijal'
        )
      : 'Utrošeni materijal'

  const rows =
    materials
      .map(
        (material) => `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  material.name,
                )}
              </strong>
            </td>

            <td class="center">
              ${escapeHtml(
                `${material.quantity} ${material.unit}`,
              )}
            </td>

            <td class="right">
              ${escapeHtml(
                formatMoney(
                  material.unitPrice,
                ),
              )}
            </td>

            <td class="right">
              <strong>
                ${escapeHtml(
                  formatMoney(
                    materialTotal(
                      material,
                    ),
                  ),
                )}
              </strong>
            </td>
          </tr>
        `,
      )
      .join('')

  return `
    <section class="section">
      <h2 class="section-title">
        ${escapeHtml(label)}
      </h2>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Materijal</th>
              <th class="center">
                Količina
              </th>
              <th class="right">
                Cijena
              </th>
              <th class="right">
                Ukupno
              </th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function totalsHtml(
  order: WorkOrder,
  show: boolean,
) {
  if (!show) return ''

  const totals =
    calculatedTotals(order)

  return `
    <div class="totals-wrap">
      <div class="totals">
        <div class="total-row">
          <span>Materijal</span>
          <strong>
            ${escapeHtml(
              formatMoney(
                totals.material,
              ),
            )}
          </strong>
        </div>

        <div class="total-row">
          <span>Rad</span>
          <strong>
            ${escapeHtml(
              formatMoney(
                totals.labour,
              ),
            )}
          </strong>
        </div>

        <div class="total-row">
          <span>
            PDV
            ${escapeHtml(
              order.vatRate,
            )}%
          </span>

          <strong>
            ${escapeHtml(
              formatMoney(
                totals.vat,
              ),
            )}
          </strong>
        </div>

        <div class="grand-total">
          <span>UKUPNO</span>

          <strong>
            ${escapeHtml(
              formatMoney(
                totals.total,
              ),
            )}
          </strong>
        </div>

        ${
          order.priceNote
            ? `
              <div class="price-note">
                <strong>Napomena:</strong>
                ${multilineHtml(
                  order.priceNote,
                )}
              </div>
            `
            : ''
        }
      </div>
    </div>
  `
}

function photosHtml(
  photos:
    WorkOrderImage[],
  branding:
    WorkOrderBranding,
) {
  if (!photos.length) return ''

  const label =
    branding.layout === 'custom'
      ? (
          branding.customPhotosLabel ||
          'Fotografije'
        )
      : 'Fotografije'

  const items =
    photos
      .map(
        (image) => `
          <figure class="photo-card">
            <img
              src="${escapeHtml(
                image.dataUrl,
              )}"
              alt=""
            />

            <figcaption class="photo-name">
              ${escapeHtml(
                image.name,
              )}
            </figcaption>
          </figure>
        `,
      )
      .join('')

  return `
    <section class="section">
      <h2 class="section-title">
        ${escapeHtml(label)}
      </h2>

      <div class="photo-grid">
        ${items}
      </div>
    </section>
  `
}

function signatureHtml(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  show: boolean,
) {
  if (!show) return ''

  const label =
    branding.layout === 'custom'
      ? (
          branding.customSignatureLabel ||
          'Potpis i ovjera'
        )
      : 'Potpis i ovjera'

  return `
    <section class="signature-section">
      <div class="signature-title">
        ${escapeHtml(label)}
      </div>

      <div class="signature-grid">
        <div>
          <div class="signature-space">
            ${
              branding.showStamp &&
              branding.stamp
                ? `
                  <img
                    src="${escapeHtml(
                      branding.stamp,
                    )}"
                    alt=""
                  />
                `
                : ''
            }
          </div>

          <div class="signature-line">
            <strong>
              Izvođač radova
            </strong>

            <span>
              Pečat / potpis
            </span>
          </div>
        </div>

        <div>
          <div class="signature-space">
            ${
              order.investorSignature
                ? `
                  <img
                    src="${escapeHtml(
                      order.investorSignature,
                    )}"
                    alt=""
                  />
                `
                : ''
            }
          </div>

          <div class="signature-line">
            <strong>
              ${escapeHtml(
                order.investorName ||
                order.customerName ||
                'Investitor',
              )}
            </strong>

            <span>
              Potpis investitora
            </span>
          </div>
        </div>
      </div>
    </section>
  `
}

function footerHtml(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  return `
    <footer class="footer">
      <span>
        ${escapeHtml(
          branding.footerText ||
          '',
        )}
      </span>

      <span>
        ${escapeHtml(
          order.orderNumber,
        )}
      </span>
    </footer>
  `
}

function pageHtml(
  page: LogicalPage,
  index: number,
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  return `
    <article
      class="pdf-page ${layoutClass(
        branding,
      )}"
      data-pdf-page
    >
      <div class="page-body">
        ${headerHtml(
          order,
          branding,
          index + 1,
        )}

        <main class="page-content">
          ${
            page.showInfo
              ? infoHtml(order)
              : `
                <div class="continuation-note">
                  Nastavak dokumenta
                </div>
              `
          }

          ${descriptionHtml(
            order,
            branding,
            page.showDescription,
          )}

          ${materialsHtml(
            page.materials,
            branding,
          )}

          ${totalsHtml(
            order,
            page.showTotals,
          )}

          ${photosHtml(
            page.photos,
            branding,
          )}
        </main>

        ${signatureHtml(
          order,
          branding,
          page.showSignature,
        )}

        ${footerHtml(
          order,
          branding,
        )}
      </div>
    </article>
  `
}

function buildDocument(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const pages =
    paginateOrder(order)

  return `
    <div
      data-fersys-work-order
      style="
        position: fixed;
        left: 0;
        top: 0;
        width: 794px;
        background: #fff;
        pointer-events: none;
        z-index: -2147483647;
      "
    >
      <style>
        ${commonCss(
          branding,
        )}
      </style>

      ${pages
        .map(
          (page, index) =>
            pageHtml(
              page,
              index,
              order,
              branding,
            ),
        )
        .join('')}
    </div>
  `
}

async function waitForImages(
  target: HTMLElement,
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

async function buildPdfDocument(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const wrapper =
    document.createElement(
      'div',
    )

  wrapper.innerHTML =
    buildDocument(
      order,
      branding,
    )

  const target =
    wrapper.firstElementChild as
      | HTMLElement
      | null

  if (!target) {
    throw new Error(
      'PDF dokument nije moguće pripremiti.',
    )
  }

  document.body.appendChild(
    target,
  )

  try {
    await document.fonts?.ready
    await waitForImages(target)

    const pageElements =
      Array.from(
        target.querySelectorAll(
          '[data-pdf-page]',
        ),
      ) as HTMLElement[]

    if (
      pageElements.length === 0
    ) {
      throw new Error(
        'PDF nema stranica za prikaz.',
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
      index <
      pageElements.length;
      index += 1
    ) {
      const canvas =
        await html2canvas(
          pageElements[index],
          {
            scale: 2,
            backgroundColor:
              '#ffffff',
            useCORS: true,
            logging: false,
          },
        )

      const image =
        canvas.toDataURL(
          'image/jpeg',
          0.94,
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

    return doc
  } finally {
    target.remove()
  }
}

function safeFileName(
  value: string,
) {
  return value
    .trim()
    .replace(
      /[\\/:*?"<>|]+/g,
      '-',
    )
    .replace(/\s+/g, '-')
}

export function
buildWorkOrderPdfHtml(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const hiddenDocument =
    buildDocument(
      order,
      branding,
    )

  const visibleDocument =
    hiddenDocument.replace(
      /style="[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*-1;[\s\S]*?"/,
      'style="width:794px;margin:0 auto;background:#fff;"',
    )

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: #dfe5ec;
    }

    [data-fersys-work-order] {
      position: static !important;
      left: auto !important;
      top: auto !important;
      z-index: auto !important;
    }

    .pdf-page {
      margin: 0 auto 14px;
      box-shadow:
        0 18px 50px
        rgba(15,23,42,.14);
    }
  </style>
</head>

<body>
  ${visibleDocument}
</body>
</html>`
}

export async function
downloadWorkOrderPdf(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const doc =
    await buildPdfDocument(
      order,
      branding,
    )

  doc.save(
    `${safeFileName(
      order.orderNumber ||
      'radni-nalog',
    )}.pdf`,
  )
}

export async function
getWorkOrderPdfBlob(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const doc =
    await buildPdfDocument(
      order,
      branding,
    )

  return doc.output('blob')
}

export async function
getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const blob =
    await getWorkOrderPdfBlob(
      order,
      branding,
    )

  return URL.createObjectURL(
    blob,
  )
}
