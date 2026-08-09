import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
  WorkOrderMaterial,
} from '../types/workOrder'

type LogicalPage = {
  descriptionTitle?: string
  description?: string
  materials: WorkOrderMaterial[]
  photos: WorkOrderImage[]
  showInfo: boolean
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
  return escapeHtml(value)
    .replace(/\r?\n/g, '<br>')
}

function formatDate(value: string) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(`${value}T00:00:00`)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    },
  ).format(value)
}

function durationLabel(
  minutes: number,
) {
  if (!minutes) {
    return '—'
  }

  const hours =
    Math.floor(minutes / 60)

  const rest =
    minutes % 60

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) {
    return `${hours} h`
  }

  return `${rest} min`
}

function splitDescription(
  text: string,
  firstSize = 850,
  nextSize = 1500,
) {
  const clean =
    text.trim()

  if (!clean) {
    return ['']
  }

  const chunks: string[] = []
  let remaining = clean
  let limit = firstSize

  while (
    remaining.length > limit
  ) {
    let cut =
      remaining.lastIndexOf(
        ' ',
        limit,
      )

    if (
      cut <
      limit * 0.65
    ) {
      cut = limit
    }

    chunks.push(
      remaining
        .slice(0, cut)
        .trim(),
    )

    remaining =
      remaining
        .slice(cut)
        .trim()

    limit = nextSize
  }

  if (remaining) {
    chunks.push(remaining)
  }

  return chunks
}

function paginateOrder(
  order: WorkOrder,
): LogicalPage[] {
  const descriptionChunks =
    splitDescription(
      order.description,
    )

  const pages:
    LogicalPage[] = []

  const firstDescription =
    descriptionChunks.shift() ??
    ''

  const firstMaterials =
    order.materials.slice(0, 7)

  pages.push({
    descriptionTitle:
      order.title,
    description:
      firstDescription,
    materials:
      firstMaterials,
    photos: [],
    showInfo: true,
    showTotals:
      order.materials.length <=
        firstMaterials.length &&
      descriptionChunks.length === 0,
    showSignature: false,
  })

  let materialIndex =
    firstMaterials.length

  while (
    descriptionChunks.length > 0 ||
    materialIndex <
      order.materials.length
  ) {
    const description =
      descriptionChunks.shift() ??
      ''

    const materialLimit =
      description
        ? 8
        : 13

    const materials =
      order.materials.slice(
        materialIndex,
        materialIndex +
          materialLimit,
      )

    materialIndex +=
      materials.length

    pages.push({
      descriptionTitle:
        description
          ? 'Opis radova – nastavak'
          : undefined,
      description,
      materials,
      photos: [],
      showInfo: false,
      showTotals:
        materialIndex >=
          order.materials.length &&
        descriptionChunks.length ===
          0,
      showSignature: false,
    })
  }

  if (
    order.images.length > 0
  ) {
    for (
      let index = 0;
      index <
      order.images.length;
      index += 4
    ) {
      pages.push({
        materials: [],
        photos:
          order.images.slice(
            index,
            index + 4,
          ),
        showInfo: false,
        showTotals: false,
        showSignature: false,
      })
    }
  }

  const lastPage =
    pages[
      pages.length - 1
    ]

  if (
    order.images.length === 0
  ) {
    lastPage.showSignature =
      true
  } else {
    /*
     * Fotografije na zadnjoj stranici
     * mogu zauzeti previše prostora.
     * Ako su 3 ili 4, potpis dobiva
     * svoju završnu stranicu.
     */
    if (
      lastPage.photos.length <= 2
    ) {
      lastPage.showSignature =
        true
    } else {
      pages.push({
        materials: [],
        photos: [],
        showInfo: false,
        showTotals: false,
        showSignature: true,
      })
    }
  }

  /*
   * Ukupni iznos treba biti prije
   * fotografija/potpisa, na posljednjoj
   * stranici koja sadrži materijal.
   */
  const materialPage =
    [...pages]
      .reverse()
      .find(
        (page) =>
          page.materials.length >
            0 ||
          page.description !==
            undefined,
      )

  if (materialPage) {
    for (
      const page of pages
    ) {
      page.showTotals = false
    }

    materialPage.showTotals =
      true
  }

  return pages
}

function layoutClass(
  branding: WorkOrderBranding,
) {
  if (
    branding.layout === 'classic'
  ) {
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
    branding.primaryColor ||
    '#2563EB'

  const secondary =
    branding.secondaryColor ||
    '#0F172A'

  const text =
    branding.textColor ||
    '#0F172A'

  const border =
    branding.borderColor ||
    '#CBD5E1'

  const background =
    branding.backgroundColor ||
    '#FFFFFF'

  return `
    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #dfe5ec;
      color: ${text};
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      font-kerning: normal;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
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

    .page-content {
      flex: 1 1 auto;
      padding: 0 58px;
    }

    .top-line {
      height: 7px;
      background: ${primary};
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        auto;
      gap: 24px;
      align-items: start;
      padding: 32px 58px 24px;
    }

    .company-wrap {
      display: flex;
      gap: 17px;
      min-width: 0;
    }

    .logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      flex: 0 0 72px;
    }

    .logo-fallback {
      display: grid;
      width: 72px;
      height: 72px;
      place-items: center;
      flex: 0 0 72px;
      border-radius: 15px;
      background: ${primary};
      color: #fff;
      font-size: 24px;
      font-weight: 800;
    }

    .company-name {
      margin: 2px 0 0;
      color: ${secondary};
      font-size: 25px;
      line-height: 1.1;
      font-weight: 800;
    }

    .company-details {
      margin-top: 8px;
      color: #64748b;
      font-size: 12px;
      line-height: 1.55;
    }

    .document-heading {
      min-width: 190px;
      text-align: right;
    }

    .document-kicker {
      color: ${primary};
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .document-number {
      margin-top: 7px;
      color: ${secondary};
      font-size: 23px;
      font-weight: 900;
    }

    .document-meta {
      margin-top: 7px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.6;
    }

    .divider {
      height: 1px;
      margin: 0 58px 22px;
      background: #e2e8f0;
    }

    .info-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 14px;
      margin-bottom: 24px;
    }

    .info-card {
      min-height: 124px;
      padding: 17px 18px;
      border: 1px solid ${border};
      border-radius: 13px;
      background: #fff;
    }

    .info-card.muted {
      background: #f8fafc;
    }

    .eyebrow {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .customer-name {
      margin-top: 10px;
      color: ${secondary};
      font-size: 17px;
      font-weight: 800;
    }

    .info-line {
      margin-top: 6px;
      color: #475569;
      font-size: 12px;
      line-height: 1.35;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin-top: 7px;
      color: #64748b;
      font-size: 11.5px;
    }

    .meta-row strong {
      max-width: 65%;
      color: ${secondary};
      text-align: right;
    }

    .section {
      margin-top: 21px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 9px;
      margin: 0 0 11px;
      color: ${secondary};
      font-size: 15px;
      font-weight: 850;
    }

    .section-title::before {
      width: 4px;
      height: 25px;
      border-radius: 3px;
      background: ${primary};
      content: "";
    }

    .description-box {
      padding: 14px 17px;
      border: 1px solid ${border};
      border-radius: 12px;
      background: #fff;
    }

    .work-title {
      display: block;
      margin-bottom: 6px;
      color: ${secondary};
      font-size: 13px;
      font-weight: 800;
    }

    .normal-text {
      color: #334155;
      font-size: 12.5px;
      line-height: 1.55;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: normal;
      letter-spacing: 0;
      word-spacing: 0;
    }

    .table-wrap {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11.5px;
    }

    th {
      padding: 9px 10px;
      background: ${primary};
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      text-align: left;
    }

    th:nth-child(1) { width: 55%; }
    th:nth-child(2) { width: 15%; }
    th:nth-child(3) { width: 15%; }
    th:nth-child(4) { width: 15%; }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
      overflow-wrap: anywhere;
      letter-spacing: 0;
      word-spacing: 0;
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
      margin-top: 15px;
    }

    .totals {
      width: 280px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      padding: 4px 2px;
      color: #64748b;
      font-size: 11px;
    }

    .total-row strong {
      color: ${secondary};
    }

    .grand-total {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin-top: 3px;
      border-radius: 9px;
      padding: 10px 12px;
      background: color-mix(
        in srgb,
        ${primary} 9%,
        white
      );
      color: ${primary};
      font-size: 15px;
      font-weight: 900;
    }

    .price-note {
      margin-top: 8px;
      color: #64748b;
      font-size: 10px;
      line-height: 1.4;
    }

    .photo-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 13px;
    }

    .photo-card {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 11px;
      background: #f8fafc;
    }

    .photo-card img {
      display: block;
      width: 100%;
      height: 230px;
      object-fit: contain;
      background: #fff;
    }

    .photo-name {
      overflow: hidden;
      padding: 7px 9px;
      color: #64748b;
      font-size: 9px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .signature-section {
      margin-top: auto;
      padding: 20px 58px 24px;
    }

    .signature-title {
      margin-bottom: 18px;
      color: ${secondary};
      font-size: 14px;
      font-weight: 800;
    }

    .signature-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 72px;
    }

    .signature-space {
      display: flex;
      height: 73px;
      align-items: flex-end;
      justify-content: center;
    }

    .signature-space img {
      max-width: 165px;
      max-height: 68px;
      object-fit: contain;
    }

    .signature-line {
      border-top: 1px solid #94a3b8;
      padding-top: 7px;
      text-align: center;
    }

    .signature-line strong {
      display: block;
      color: ${secondary};
      font-size: 10.5px;
    }

    .signature-line span {
      display: block;
      margin-top: 3px;
      color: #94a3b8;
      font-size: 9px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 0 58px 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 7px;
      color: #94a3b8;
      font-size: 8px;
    }

    .continuation-note {
      margin-bottom: 16px;
      color: #94a3b8;
      font-size: 10px;
    }

    /* CLASSIC */
    .layout-classic .top-line {
      display: none;
    }

    .layout-classic .header {
      margin-bottom: 24px;
      padding-top: 27px;
      padding-bottom: 27px;
      background: ${secondary};
    }

    .layout-classic .company-name,
    .layout-classic .document-number {
      color: #fff;
    }

    .layout-classic .company-details,
    .layout-classic .document-meta {
      color: #cbd5e1;
    }

    .layout-classic .document-kicker {
      color: #fff;
      opacity: .78;
    }

    .layout-classic .divider {
      display: none;
    }

    .layout-classic .page-content {
      padding-top: 0;
    }

    .layout-classic .info-grid {
      grid-template-columns:
        repeat(4, 1fr);
      gap: 10px;
    }

    .layout-classic .info-card {
      min-height: 83px;
      padding: 12px;
      border: 0;
      background: #f5f7fb;
    }

    .layout-classic .classic-customer {
      grid-column: span 2;
    }

    .layout-classic .classic-document {
      grid-column: span 2;
    }

    .layout-classic .section-title {
      margin-bottom: 8px;
    }

    .layout-classic .section-title::before {
      display: none;
    }

    .layout-classic .description-box {
      padding: 0;
      border: 0;
      background: transparent;
    }

    .layout-classic .table-wrap {
      border: 0;
      border-radius: 0;
    }

    .layout-classic th {
      background: ${secondary};
    }

    .layout-classic .grand-total {
      color: ${secondary};
      background: #f1f5f9;
    }

    /* CUSTOM */
    .layout-custom .header {
      border-bottom: 2px solid ${primary};
    }

    .layout-custom .info-card {
      border-radius: 4px;
    }

    .layout-custom .description-box,
    .layout-custom .table-wrap,
    .layout-custom .photo-card {
      border-radius: 4px;
    }

    .layout-custom .section-title::before {
      width: 28px;
      height: 3px;
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
              center / cover no-repeat;
            opacity: .08;
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
      html, body {
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

  return `
    <div class="top-line"></div>

    <header class="header">
      <div class="company-wrap">
        ${companyLogoHtml(
          branding,
        )}

        <div>
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
          RADNI NALOG
        </div>

        <div class="document-number">
          ${escapeHtml(
            order.orderNumber,
          )}
        </div>

        <div class="document-meta">
          Datum:
          ${escapeHtml(
            formatDate(order.date),
          )}
          <br>
          Stranica ${pageNumber}
        </div>
      </div>
    </header>

    <div class="divider"></div>
  `
}

function infoHtml(
  order: WorkOrder,
) {
  return `
    <section class="info-grid">
      <article class="info-card classic-customer">
        <div class="eyebrow">
          Kupac / investitor
        </div>

        <div class="customer-name">
          ${escapeHtml(
            order.customerName ||
            '—',
          )}
        </div>

        <div class="info-line">
          ${escapeHtml(
            order.address || '—',
          )}
        </div>

        <div class="info-line">
          OIB:
          ${escapeHtml(
            order.customerOib ||
            '—',
          )}
        </div>

        ${
          order.customerPhone ||
          order.customerEmail
            ? `
              <div class="info-line">
                ${escapeHtml(
                  [
                    order.customerPhone,
                    order.customerEmail,
                  ]
                    .filter(Boolean)
                    .join(' • '),
                )}
              </div>
            `
            : ''
        }
      </article>

      <article class="info-card muted classic-document">
        <div class="eyebrow">
          Podaci dokumenta
        </div>

        <div class="meta-row">
          <span>Vrijeme</span>
          <strong>
            ${escapeHtml(
              `${order.arrivalTime || '—'} – ${order.departureTime || '—'}`,
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Trajanje</span>
          <strong>
            ${escapeHtml(
              durationLabel(
                order.durationMinutes,
              ),
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Status</span>
          <strong>
            ${escapeHtml(
              order.status,
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Radnici</span>
          <strong>
            ${escapeHtml(
              order.assignedWorkers.join(
                ', ',
              ) || '—',
            )}
          </strong>
        </div>
      </article>
    </section>
  `
}

function descriptionHtml(
  page: LogicalPage,
) {
  if (
    page.description === undefined
  ) {
    return ''
  }

  return `
    <section class="section">
      <h2 class="section-title">
        ${
          page.descriptionTitle ===
          'Opis radova – nastavak'
            ? 'Opis radova – nastavak'
            : 'Opis radova'
        }
      </h2>

      <div class="description-box">
        ${
          page.descriptionTitle &&
          page.descriptionTitle !==
            'Opis radova – nastavak'
            ? `
              <strong class="work-title">
                ${escapeHtml(
                  page.descriptionTitle,
                )}
              </strong>
            `
            : ''
        }

        <div class="normal-text">
          ${
            page.description
              ? multilineHtml(
                  page.description,
                )
              : 'Nema dodatnog opisa.'
          }
        </div>
      </div>
    </section>
  `
}

function materialsHtml(
  page: LogicalPage,
) {
  if (
    page.materials.length === 0
  ) {
    return ''
  }

  const rows =
    page.materials
      .map(
        (material) => `
          <tr>
            <td>
              ${escapeHtml(
                material.name,
              )}
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
                    material.quantity *
                      material.unitPrice,
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
        Utrošeni materijal
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
  if (!show) {
    return ''
  }

  const vatValue =
    order.totalPrice -
    order.materialPrice -
    order.labourPrice

  return `
    <div class="totals-wrap">
      <div class="totals">
        <div class="total-row">
          <span>Materijal</span>
          <strong>
            ${escapeHtml(
              formatMoney(
                order.materialPrice,
              ),
            )}
          </strong>
        </div>

        <div class="total-row">
          <span>Rad</span>
          <strong>
            ${escapeHtml(
              formatMoney(
                order.labourPrice,
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
              formatMoney(vatValue),
            )}
          </strong>
        </div>

        <div class="grand-total">
          <span>UKUPNO</span>

          <strong>
            ${escapeHtml(
              formatMoney(
                order.totalPrice,
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
  page: LogicalPage,
) {
  if (
    page.photos.length === 0
  ) {
    return ''
  }

  const items =
    page.photos
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
        Fotografije
      </h2>

      <div class="photo-grid">
        ${items}
      </div>
    </section>
  `
}

function signatureHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  show: boolean,
) {
  if (!show) {
    return ''
  }

  return `
    <section class="signature-section">
      <div class="signature-title">
        Potpis i ovjera
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
  branding: WorkOrderBranding,
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
  branding: WorkOrderBranding,
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
            page,
          )}

          ${materialsHtml(
            page,
          )}

          ${totalsHtml(
            order,
            page.showTotals,
          )}

          ${photosHtml(
            page,
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
  branding: WorkOrderBranding,
) {
  const pages =
    paginateOrder(order)

  return `
    <div
      data-fersys-work-order
      style="
        position: fixed;
        left: -100000px;
        top: 0;
        width: 794px;
        background: #fff;
        z-index: -1;
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
            if (
              image.complete
            ) {
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
  branding: WorkOrderBranding,
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

export function buildWorkOrderPdfHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  return buildDocument(
    order,
    branding,
  )
}

export async function downloadWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
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

export async function getWorkOrderPdfBlob(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    await buildPdfDocument(
      order,
      branding,
    )

  return doc.output('blob')
}

export async function getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding: WorkOrderBranding,
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