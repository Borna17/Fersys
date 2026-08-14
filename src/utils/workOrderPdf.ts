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
  const descriptionLength =
    (order.title || '').length +
    (order.description || '').length

  const compactFirstPage =
    order.images.length <= 3 &&
    order.materials.length <= 8 &&
    descriptionLength <= 1800

  const firstPagePhotoCount =
    compactFirstPage
      ? order.images.length
      : 0

  pages.push({
    materials:
      order.materials.slice(
        0,
        firstMaterialLimit,
      ),
    photos:
      order.images.slice(
        0,
        firstPagePhotoCount,
      ),
    showInfo: true,
    showDescription: true,
    showTotals:
      order.materials.length <=
      firstMaterialLimit,
    showSignature:
      order.materials.length <=
        firstMaterialLimit &&
      firstPagePhotoCount ===
        order.images.length,
  })

  let materialIndex =
    firstMaterialLimit

  while (
    materialIndex <
    order.materials.length
  ) {
    const materials =
      order.materials.slice(
        materialIndex,
        materialIndex + 18,
      )

    materialIndex +=
      materials.length

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

  for (
    let index =
      firstPagePhotoCount;
    index <
    order.images.length;
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

  return pages
}

function layoutClass(
  branding: WorkOrderBranding,
) {
  if (branding.layout === 'classic') {
    return 'layout-classic'
  }

  if (branding.layout === 'minimal') {
    return 'layout-minimal'
  }

  if (branding.layout === 'custom') {
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

  const headingAlignment =
    branding.layout === 'custom'
      ? branding.headerAlignment === 'center'
        ? 'center'
        : branding.headerAlignment === 'left'
          ? 'left'
          : 'right'
      : 'right'

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
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
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
      position: relative;
      z-index: 1;
      display: flex;
      height: 100%;
      flex-direction: column;
    }

    .accent-line {
      flex: 0 0 auto;
      height: 7px;
      background: ${primary};
    }

    .workorder-header {
      flex: 0 0 auto;
      padding: 22px 42px 12px;
    }

    .workorder-topline {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 28px;
    }

    .company-wrap {
      display: flex;
      flex: 1 1 auto;
      gap: 17px;
      min-width: 0;
      max-width: 68%;
    }

    .logo,
    .logo-fallback {
      width: 76px;
      height: 76px;
      flex: 0 0 76px;
      object-fit: contain;
    }

    .logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: ${primary};
      color: #fff;
      font-size: 23px;
      font-weight: 900;
    }

    .company-copy {
      min-width: 0;
    }

    .company-name {
      margin-top: 2px;
      color: ${secondary};
      font-size: 21px;
      line-height: 1.1;
      font-weight: 900;
      overflow-wrap: anywhere;
    }

    .company-details {
      margin-top: 6px;
      color: #64748b;
      font-size: 9.3px;
      line-height: 1.42;
    }

    .document-heading {
      flex: 0 0 auto;
      min-width: 205px;
      padding-top: 3px;
      text-align: ${headingAlignment};
    }

    .document-kicker {
      color: ${primary};
      font-size: 8.5px;
      font-weight: 900;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    .document-title {
      margin-top: 5px;
      color: ${secondary};
      font-size: 26px;
      line-height: 1;
      font-weight: 950;
    }

    .workorder-meta-strip {
      display: grid;
      grid-template-columns: 1.12fr .92fr 1.32fr .88fr .82fr .58fr;
      margin-top: 14px;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 10px;
      background: #fff;
    }

    .workorder-meta-strip > div {
      min-width: 0;
      min-height: 48px;
      padding: 8px 10px;
      border-right: 1px solid ${border};
    }

    .workorder-meta-strip > div:last-child {
      border-right: 0;
    }

    .workorder-meta-strip span {
      display: block;
      color: #94a3b8;
      font-size: 7.6px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: .055em;
      text-transform: uppercase;
    }

    .workorder-meta-strip strong {
      display: block;
      margin-top: 5px;
      color: ${secondary};
      font-size: 9.8px;
      line-height: 1.23;
      font-weight: 900;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .page-content {
      flex: 1 1 auto;
      min-height: 0;
      padding: 0 42px;
    }

    .workorder-info-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 210px;
      gap: 10px;
      margin-bottom: 9px;
    }

    .workorder-investor,
    .workorder-workers {
      min-width: 0;
      padding: 9px 11px;
      border: 1px solid ${border};
      border-radius: 9px;
      background: #fff;
    }

    .workorder-workers {
      background: #f8fafc;
    }

    .eyebrow {
      color: #94a3b8;
      font-size: 7.7px;
      font-weight: 900;
      letter-spacing: .075em;
      text-transform: uppercase;
    }

    .customer-name {
      margin-top: 4px;
      color: ${secondary};
      font-size: 13.2px;
      line-height: 1.2;
      font-weight: 900;
      overflow-wrap: anywhere;
    }

    .workorder-inline-details {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-top: 5px;
      color: #64748b;
      font-size: 8.7px;
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
      font-size: 9.4px;
      line-height: 1.34;
      overflow-wrap: anywhere;
    }

    .section {
      margin-top: 10px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0 0 5px;
      color: ${secondary};
      font-size: 11.6px;
      font-weight: 900;
    }

    .section-title::before {
      width: 3px;
      height: 16px;
      border-radius: 4px;
      background: ${primary};
      content: "";
    }

    .description-box {
      padding: 8px 10px;
      border: 1px solid ${border};
      border-radius: 9px;
      background: #fff;
    }

    .work-title {
      display: block;
      margin-bottom: 3px;
      color: ${secondary};
      font-size: 10.1px;
      font-weight: 900;
    }

    .normal-text {
      color: #334155;
      font-size: 9px;
      line-height: 1.31;
      overflow-wrap: anywhere;
    }

    .table-wrap {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8.65px;
    }

    th {
      padding: 5px 6px;
      background: ${secondary};
      color: #fff;
      font-size: 7.65px;
      font-weight: 900;
      text-align: left;
      text-transform: uppercase;
    }

    th:nth-child(1) { width: 48%; }
    th:nth-child(2) { width: 16%; }
    th:nth-child(3) { width: 17%; }
    th:nth-child(4) { width: 19%; }

    td {
      padding: 4.3px 6px;
      border-bottom: 1px solid #e5eaf0;
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
      margin-top: 7px;
    }

    .totals {
      width: 245px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 2.5px 3px;
      color: #64748b;
      font-size: 8.5px;
    }

    .total-row strong {
      color: ${secondary};
    }

    .grand-total {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin-top: 3px;
      border-radius: 8px;
      padding: 7px 9px;
      background: ${primary};
      color: #fff;
      font-size: 11.2px;
      font-weight: 950;
    }

    .price-note {
      margin-top: 6px;
      color: #64748b;
      font-size: 8px;
      line-height: 1.3;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .photo-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 9px;
      background: #f8fafc;
    }

    .photo-card img {
      display: block;
      width: 100%;
      height: 205px;
      object-fit: contain;
      background: #fff;
    }

    .photo-name {
      overflow: hidden;
      padding: 5px 7px;
      color: #64748b;
      font-size: 7.6px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .photo-grid.first-page {
      margin-top: 1px;
      gap: 9px;
    }

    .photo-grid.first-page.photo-count-1 {
      grid-template-columns: 1fr;
    }

    .photo-grid.first-page.photo-count-1 .photo-card img {
      height: 228px;
    }

    .photo-grid.first-page.photo-count-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .photo-grid.first-page.photo-count-2 .photo-card img {
      height: 162px;
    }

    .photo-grid.first-page.photo-count-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .photo-grid.first-page.photo-count-3 .photo-card img {
      height: 136px;
    }

    .signature-section {
      flex: 0 0 auto;
      margin-top: auto;
      padding: 8px 42px 11px;
    }

    .signature-title {
      margin-bottom: 5px;
      color: ${secondary};
      font-size: 9.5px;
      font-weight: 900;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
    }

    .signature-space {
      display: flex;
      height: 48px;
      align-items: flex-end;
      justify-content: center;
    }

    .signature-space img {
      max-width: 178px;
      max-height: 47px;
      object-fit: contain;
    }

    .signature-line {
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      text-align: center;
    }

    .signature-line strong {
      display: block;
      color: ${secondary};
      font-size: 9px;
    }

    .signature-line span {
      display: block;
      margin-top: 2px;
      color: #94a3b8;
      font-size: 7.4px;
    }

    .footer {
      display: flex;
      flex: 0 0 auto;
      justify-content: space-between;
      gap: 16px;
      margin: 0 42px 8px;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      color: #94a3b8;
      font-size: 6.8px;
    }

    .continuation-note {
      margin-bottom: 8px;
      color: #94a3b8;
      font-size: 8px;
    }

    .continuation-header {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 17px 42px 12px;
      border-bottom: 1px solid ${border};
    }

    .continuation-brand {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }

    .continuation-header .logo,
    .continuation-header .logo-fallback {
      width: 42px;
      height: 42px;
      flex-basis: 42px;
    }

    .continuation-company {
      color: ${secondary};
      font-size: 15px;
      font-weight: 900;
    }

    .continuation-document {
      text-align: right;
    }

    .continuation-document strong {
      display: block;
      color: ${secondary};
      font-size: 16px;
      font-weight: 950;
    }

    .continuation-document span {
      display: block;
      margin-top: 3px;
      color: #94a3b8;
      font-size: 8px;
      font-weight: 800;
    }

    /* MODERN */
    .layout-modern .workorder-meta-strip {
      border-color: ${primary};
      box-shadow: 0 5px 15px rgba(15,23,42,.045);
    }

    .layout-modern .workorder-investor,
    .layout-modern .workorder-workers,
    .layout-modern .description-box,
    .layout-modern .table-wrap {
      box-shadow: 0 4px 14px rgba(15,23,42,.04);
    }

    .layout-modern .document-heading {
      border-left: 4px solid ${primary};
      padding-left: 16px;
    }

    /* CLASSIC */
    .layout-classic .accent-line {
      display: none;
    }

    .layout-classic .workorder-header {
      margin-bottom: 10px;
      padding-top: 21px;
      padding-bottom: 16px;
      background: ${secondary};
    }

    .layout-classic .company-name,
    .layout-classic .document-title {
      color: #fff;
    }

    .layout-classic .company-details,
    .layout-classic .document-kicker {
      color: #cbd5e1;
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
    .layout-classic .workorder-workers,
    .layout-classic .description-box,
    .layout-classic .table-wrap,
    .layout-classic .grand-total {
      border-radius: 3px;
    }

    .layout-classic .section-title::before {
      border-radius: 0;
      background: ${secondary};
    }

    /* MINIMAL */
    .layout-minimal .accent-line {
      height: 3px;
    }

    .layout-minimal .document-kicker {
      display: none;
    }

    .layout-minimal .document-title {
      font-size: 24px;
      font-weight: 800;
    }

    .layout-minimal .workorder-meta-strip,
    .layout-minimal .workorder-investor,
    .layout-minimal .workorder-workers,
    .layout-minimal .description-box,
    .layout-minimal .table-wrap {
      border-radius: 0;
      box-shadow: none;
    }

    .layout-minimal .workorder-workers,
    .layout-minimal tbody tr:nth-child(even) td {
      background: #fff;
    }

    .layout-minimal .section-title::before {
      width: 2px;
      border-radius: 0;
    }

    .layout-minimal th {
      background: #f1f5f9;
      color: ${secondary};
      border-bottom: 1px solid ${border};
    }

    .layout-minimal .grand-total {
      border: 1px solid ${border};
      background: #fff;
      color: ${secondary};
    }

    /* CUSTOM */
    .layout-custom .accent-line {
      height: 9px;
      background: linear-gradient(90deg, ${primary}, ${secondary});
    }

    .layout-custom .document-title,
    .layout-custom .section-title {
      color: ${primary};
    }

    .layout-custom .workorder-meta-strip,
    .layout-custom .workorder-investor,
    .layout-custom .workorder-workers {
      border-color: ${primary};
    }

    .layout-custom th {
      background: linear-gradient(90deg, ${secondary}, ${primary});
    }

    ${
      branding.showBackgroundImage &&
      branding.backgroundImage
        ? `
          .pdf-page::before {
            position: absolute;
            inset: 0;
            z-index: 0;
            background: url("${branding.backgroundImage}") center / cover no-repeat;
            opacity: .055;
            content: "";
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
  firstPage = false,
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

      <div class="photo-grid ${firstPage ? 'first-page photo-count-' + photos.length : ''}">
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

function continuationHeaderHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  pageNumber: number,
) {
  return `
    <div class="accent-line"></div>

    <header class="continuation-header">
      <div class="continuation-brand">
        ${companyLogoHtml(branding)}

        <div class="continuation-company">
          ${escapeHtml(
            branding.companyName,
          )}
        </div>
      </div>

      <div class="continuation-document">
        <strong>RADNI NALOG</strong>
        <span>
          ${escapeHtml(
            order.orderNumber,
          )}
          · stranica
          ${pageNumber}
        </span>
      </div>
    </header>
  `
}

function pageHtml(
  page: LogicalPage,
  index: number,
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  const firstPage =
    index === 0

  return `
    <article
      class="pdf-page ${layoutClass(
        branding,
      )}"
      data-pdf-page
    >
      <div class="page-body">
        ${
          firstPage
            ? headerHtml(
                order,
                branding,
                1,
              )
            : continuationHeaderHtml(
                order,
                branding,
                index + 1,
              )
        }

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
            firstPage,
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
            scale: 1.7,
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
      /style="[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*-2147483647;[\s\S]*?"/,
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