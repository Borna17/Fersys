import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
  WorkOrderMaterial,
} from '../types/workOrder'

import {
  getDocumentDesign,
  type DocumentDesign,
} from '../services/documentDesign.service'

import {
  escapeHtml,
  formatCurrencyEur,
  formatDateHr,
  formatNumberHr,
  getHtmlPagesPdfBlobUrl,
  htmlPagesToPdfBlob,
  multilineHtml,
  safeFileName,
} from './pdfDocumentCore'

type WorkOrderPage = {
  materials: WorkOrderMaterial[]
  photos: WorkOrderImage[]
  first: boolean
  final: boolean
  photosOnly: boolean
}

function durationText(
  minutes: number,
) {
  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return '—'
  }

  const hours =
    Math.floor(
      minutes / 60,
    )

  const rest =
    minutes % 60

  if (
    hours > 0 &&
    rest > 0
  ) {
    return `${hours} h ${rest} min`
  }

  if (hours > 0) {
    return `${hours} h`
  }

  return `${rest} min`
}

function durationFromTimes(
  arrival: string,
  departure: string,
) {
  if (
    !arrival ||
    !departure
  ) {
    return 0
  }

  const [
    startHour,
    startMinute,
  ] =
    arrival
      .split(':')
      .map(Number)

  const [
    endHour,
    endMinute,
  ] =
    departure
      .split(':')
      .map(Number)

  if (
    !Number.isFinite(
      startHour,
    ) ||
    !Number.isFinite(
      startMinute,
    ) ||
    !Number.isFinite(
      endHour,
    ) ||
    !Number.isFinite(
      endMinute,
    )
  ) {
    return 0
  }

  const start =
    startHour * 60 +
    startMinute

  let end =
    endHour * 60 +
    endMinute

  if (end < start) {
    end += 24 * 60
  }

  return Math.max(
    0,
    end - start,
  )
}

function totalDuration(
  order: WorkOrder,
) {
  if (
    Number.isFinite(
      order.durationMinutes,
    ) &&
    order.durationMinutes > 0
  ) {
    return order.durationMinutes
  }

  return durationFromTimes(
    order.arrivalTime,
    order.departureTime,
  )
}

function calculateMaterialTotal(
  material:
    WorkOrderMaterial,
) {
  return (
    material.quantity *
    material.unitPrice
  )
}

function calculatedMaterialPrice(
  order: WorkOrder,
) {
  const fromRows =
    order.materials.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        calculateMaterialTotal(
          item,
        ),
      0,
    )

  return fromRows > 0
    ? fromRows
    : order.materialPrice || 0
}

function calculatedTotals(
  order: WorkOrder,
) {
  const labour =
    Number.isFinite(
      order.labourPrice,
    )
      ? order.labourPrice
      : 0

  const material =
    calculatedMaterialPrice(
      order,
    )

  const base =
    labour + material

  const vat =
    base *
    ((order.vatRate || 0) /
      100)

  return {
    labour,
    material,
    vat,
    total:
      order.totalPrice > 0
        ? order.totalPrice
        : base + vat,
  }
}

function companyMeta(
  branding:
    WorkOrderBranding,
) {
  const values = [
    branding.companyAddress,
    branding.companyOib
      ? `OIB: ${branding.companyOib}`
      : '',
    branding.companyPhone,
    branding.companyEmail,
  ].filter(Boolean)

  return values
    .map(
      (value) =>
        `<span>${escapeHtml(
          value,
        )}</span>`,
    )
    .join('')
}

function logo(
  branding:
    WorkOrderBranding,
  design:
    DocumentDesign,
) {
  if (
    design.showLogo &&
    branding.logo
  ) {
    return `
      <img
        class="brand-logo"
        src="${escapeHtml(
          branding.logo,
        )}"
        alt="Logo"
      />
    `
  }

  return `
    <div class="brand-fallback">
      ${escapeHtml(
        branding.companyName
          .slice(0, 2)
          .toUpperCase(),
      )}
    </div>
  `
}

function paginate(
  order: WorkOrder,
  design:
    DocumentDesign,
) {
  const pages:
    WorkOrderPage[] = []

  const firstMaterialLimit =
    order.images.length > 0
      ? 11
      : 14

  const firstMaterials =
    order.materials.slice(
      0,
      firstMaterialLimit,
    )

  const firstPhotos =
    design
      .workOrderShowPhotos
      ? order.images.slice(
          0,
          3,
        )
      : []

  pages.push({
    materials:
      firstMaterials,
    photos:
      firstPhotos,
    first: true,
    final:
      order.materials.length <=
        firstMaterialLimit &&
      (
        !design
          .workOrderShowPhotos ||
        order.images.length <= 3
      ),
    photosOnly: false,
  })

  let materialIndex =
    firstMaterials.length

  while (
    materialIndex <
    order.materials.length
  ) {
    const rows =
      order.materials.slice(
        materialIndex,
        materialIndex + 20,
      )

    materialIndex +=
      rows.length

    pages.push({
      materials: rows,
      photos: [],
      first: false,
      final:
        materialIndex >=
          order.materials.length &&
        (
          !design
            .workOrderShowPhotos ||
          order.images.length <= 3
        ),
      photosOnly: false,
    })
  }

  if (
    design.workOrderShowPhotos &&
    order.images.length > 3
  ) {
    for (
      let index = 3;
      index <
      order.images.length;
      index += 6
    ) {
      pages.push({
        materials: [],
        photos:
          order.images.slice(
            index,
            index + 6,
          ),
        first: false,
        final:
          index + 6 >=
          order.images.length,
        photosOnly: true,
      })
    }
  }

  return pages
}

function css(
  design:
    DocumentDesign,
) {
  return `
    :root {
      --primary: ${
        design.primaryColor ||
        '#2563EB'
      };
      --navy: ${
        design.secondaryColor ||
        '#071B46'
      };
      --accent: ${
        design.accentColor ||
        '#2563EB'
      };
      --ink: #0F172A;
      --muted: #475569;
      --subtle: #64748B;
      --border: #CBD5E1;
      --soft: #F5F8FC;
      --blue-soft: #EEF4FF;
    }

    * {
      box-sizing: border-box;
      letter-spacing: normal;
      word-spacing: normal;
    }

    html,
    body {
      margin: 0;
      background: #DDE4EC;
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
      padding: 10px;
      background: #07152F;
    }

    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 15px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }

    .toolbar .primary {
      background: var(--primary);
      color: white;
    }

    .toolbar .secondary {
      background: #17233A;
      color: #E2E8F0;
    }

    .pdf-stack {
      padding: 14px 0 28px;
    }

    .pdf-page {
      width: 794px;
      height: 1123px;
      margin: 0 auto 16px;
      overflow: hidden;
      background: white;
      box-shadow:
        0 18px 52px
        rgba(15, 23, 42, .18);
      break-after: page;
    }

    .page {
      display: flex;
      height: 100%;
      flex-direction: column;
      padding: 34px 38px 28px;
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        auto;
      gap: 22px;
      align-items: start;
      padding-bottom: 13px;
      border-bottom:
        3px solid
        var(--navy);
    }

    .brand {
      display: flex;
      min-width: 0;
      gap: 13px;
      align-items: flex-start;
    }

    .brand-logo,
    .brand-fallback {
      width: 62px;
      height: 48px;
      flex: 0 0 62px;
      object-fit: contain;
    }

    .brand-fallback {
      display: grid;
      place-items: center;
      border-radius: 14px;
      background:
        linear-gradient(
          135deg,
          var(--primary),
          #7C3AED
        );
      color: white;
      font-size: 17px;
      font-weight: 900;
    }

    .brand h1 {
      margin: 0;
      color: var(--navy);
      font-size: 22px;
      line-height: 1.05;
      font-weight: 900;
    }

    .brand-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-top: 7px;
      color: var(--subtle);
      font-size: 9px;
      line-height: 1.35;
    }

    .document-title {
      min-width: 245px;
      text-align: right;
    }

    .document-title .kicker {
      color: var(--primary);
      font-size: 9px;
      line-height: 1.2;
      font-weight: 950;
      letter-spacing:
        .17em;
      text-transform: uppercase;
    }

    .document-title h2 {
      margin: 5px 0 7px;
      color: var(--navy);
      font-size: 29px;
      line-height: .95;
      font-weight: 950;
    }

    .document-number {
      display: inline-block;
      border-radius: 6px;
      padding: 6px 10px;
      background: var(--primary);
      color: white;
      font-size: 10px;
      font-weight: 900;
    }

    .quick-grid {
      display: grid;
      grid-template-columns:
        1.35fr
        .95fr
        .82fr
        .82fr;
      margin-top: 15px;
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 10px;
      background: var(--border);
      gap: 1px;
    }

    .quick-item {
      min-width: 0;
      min-height: 72px;
      padding: 10px 11px;
      background: white;
    }

    .quick-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #1E40AF;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .quick-value {
      display: block;
      margin-top: 8px;
      color: var(--navy);
      font-size: 11px;
      line-height: 1.35;
      font-weight: 850;
      overflow-wrap: anywhere;
    }

    .two-col {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 10px;
      margin-top: 11px;
    }

    .card {
      min-width: 0;
      min-height: 99px;
      border:
        1px solid
        var(--border);
      border-radius: 10px;
      padding: 11px 12px;
      background: white;
    }

    .card.soft {
      background:
        var(--blue-soft);
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 8px;
      color: var(--navy);
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .card p {
      margin: 3px 0;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.4;
    }

    .card strong {
      color: var(--navy);
    }

    .work-time {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 4px 12px;
    }

    .work-time .full {
      grid-column: 1 / -1;
    }

    .duration-pill {
      display: inline-flex;
      align-items: center;
      margin-top: 6px;
      border-radius: 999px;
      padding: 5px 9px;
      background: var(--primary);
      color: white;
      font-size: 10px;
      font-weight: 900;
    }

    .section {
      margin-top: 12px;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      color: var(--navy);
      font-size: 13px;
      line-height: 1.2;
      font-weight: 950;
      text-transform: uppercase;
    }

    .section-heading::before {
      width: 4px;
      height: 17px;
      border-radius: 4px;
      background: var(--primary);
      content: "";
    }

    .description {
      border:
        1px solid
        var(--border);
      border-left:
        4px solid
        var(--primary);
      border-radius:
        0 9px 9px 0;
      padding: 10px 12px;
      color: #334155;
      font-size: 10.5px;
      line-height: 1.45;
    }

    .description strong {
      display: block;
      margin-bottom: 4px;
      color: var(--navy);
      font-size: 11px;
    }

    .table-wrap {
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse:
        collapse;
      table-layout: fixed;
    }

    th {
      padding: 7px 6px;
      background:
        linear-gradient(
          90deg,
          #071A43,
          #0A2A68
        );
      color: white;
      font-size: 9px;
      line-height: 1.2;
      text-align: left;
      text-transform: uppercase;
    }

    td {
      padding: 6px;
      border-bottom:
        1px solid
        #DDE5EE;
      color: #1E293B;
      font-size: 9.5px;
      line-height: 1.25;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    td.name {
      color: var(--navy);
      font-weight: 800;
    }

    .right {
      text-align: right;
      white-space: nowrap;
    }

    .center {
      text-align: center;
    }

    .material-total {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
      margin-top: 0;
      border:
        1px solid
        var(--border);
      border-top: 0;
      border-radius:
        0 0 8px 8px;
      padding: 7px 10px;
      background: #EEF3FA;
      color: var(--navy);
      font-size: 10.5px;
      font-weight: 900;
    }

    .bottom-row {
      display: grid;
      grid-template-columns:
        .72fr 1.28fr;
      gap: 10px;
      margin-top: 11px;
    }

    .note-card,
    .photos-card {
      border:
        1px solid
        var(--border);
      border-radius: 9px;
      padding: 10px;
      background: white;
    }

    .note-card h3,
    .photos-card h3 {
      margin: 0 0 8px;
      color: var(--navy);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .note-card p {
      margin: 0;
      color: #334155;
      font-size: 9.5px;
      line-height: 1.45;
    }

    .photo-grid {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 7px;
    }

    .photo {
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 7px;
      background: #F8FAFC;
    }

    .photo img {
      display: block;
      width: 100%;
      height: 80px;
      object-fit: cover;
    }

    .photo span {
      display: block;
      padding: 4px 5px;
      color: var(--subtle);
      font-size: 7.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .signatures {
      display: grid;
      grid-template-columns:
        .9fr 1.1fr;
      gap: 12px;
      margin-top: 11px;
    }

    .signature-card {
      border:
        1px solid
        var(--border);
      border-radius: 9px;
      padding: 10px 12px;
      background: white;
    }

    .signature-card h3 {
      margin: 0;
      color: var(--navy);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .signature-space {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 69px;
      margin-top: 8px;
      border:
        1px solid
        #C8D3E2;
      border-radius: 7px;
      background: #FCFDFF;
    }

    .signature-space img {
      max-width: 88%;
      max-height: 62px;
      object-fit: contain;
    }

    .signature-name {
      margin-top: 6px;
      color: #334155;
      font-size: 9px;
      font-weight: 700;
    }

    .finance {
      display: grid;
      grid-template-columns:
        repeat(4, 1fr);
      gap: 1px;
      margin-top: 10px;
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 8px;
      background: var(--border);
    }

    .finance > div {
      padding: 7px 8px;
      background: #F8FAFC;
    }

    .finance span {
      display: block;
      color: var(--subtle);
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .finance strong {
      display: block;
      margin-top: 3px;
      color: var(--navy);
      font-size: 10px;
    }

    .finance .grand {
      background: var(--primary);
    }

    .finance .grand span,
    .finance .grand strong {
      color: white;
    }

    .continuation {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 12px;
      border-bottom:
        2px solid
        var(--navy);
    }

    .continuation strong {
      color: var(--navy);
      font-size: 17px;
    }

    .continuation span {
      color: var(--subtle);
      font-size: 10px;
    }

    .photos-only-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 12px;
      margin-top: 14px;
    }

    .photos-only-grid .photo img {
      height: 250px;
    }

    .footer {
      display: flex;
      justify-content:
        space-between;
      gap: 20px;
      margin-top: auto;
      padding-top: 7px;
      border-top:
        1px solid
        var(--border);
      color: #64748B;
      font-size: 8px;
    }

    .preset-classic .header {
      margin:
        -34px -38px 0;
      padding:
        25px 38px 18px;
      border: 0;
      background: var(--navy);
    }

    .preset-classic .brand h1,
    .preset-classic .document-title h2 {
      color: white;
    }

    .preset-classic .brand-meta,
    .preset-classic .document-title .kicker {
      color: #CBD5E1;
    }

    .preset-classic .quick-grid {
      margin-top: 16px;
    }

    .preset-custom .header {
      border-bottom-color:
        var(--primary);
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
        display: none;
      }

      .pdf-stack {
        padding: 0;
      }

      .pdf-page {
        margin: 0;
        box-shadow: none;
      }
    }
  `
}

function header(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  design:
    DocumentDesign,
) {
  return `
    <header class="header">
      <div class="brand">
        ${logo(
          branding,
          design,
        )}

        <div>
          <h1>${escapeHtml(
            branding.companyName,
          )}</h1>

          <div class="brand-meta">
            ${companyMeta(
              branding,
            )}
          </div>
        </div>
      </div>

      <div class="document-title">
        <div class="kicker">
          Servis / evidencija rada
        </div>

        <h2>
          RADNI NALOG
        </h2>

        <span class="document-number">
          ${escapeHtml(
            order.orderNumber,
          )}
        </span>
      </div>
    </header>
  `
}

function continuationHeader(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
) {
  return `
    <header class="continuation">
      <strong>
        ${escapeHtml(
          branding.companyName,
        )}
      </strong>

      <span>
        RADNI NALOG ·
        ${escapeHtml(
          order.orderNumber,
        )}
      </span>
    </header>
  `
}

function firstInfo(
  order: WorkOrder,
) {
  const duration =
    totalDuration(
      order,
    )

  return `
    <section class="quick-grid">
      <div class="quick-item">
        <span class="quick-label">
          ⌖ Lokacija
        </span>

        <strong class="quick-value">
          ${escapeHtml(
            order.address ||
              '—',
          )}
        </strong>
      </div>

      <div class="quick-item">
        <span class="quick-label">
          ♙ Investitor
        </span>

        <strong class="quick-value">
          ${escapeHtml(
            order.customerName ||
              order.investorName ||
              '—',
          )}
        </strong>
      </div>

      <div class="quick-item">
        <span class="quick-label">
          Datum
        </span>

        <strong class="quick-value">
          ${formatDateHr(
            order.date,
          )}
        </strong>
      </div>

      <div class="quick-item">
        <span class="quick-label">
          Status
        </span>

        <strong class="quick-value">
          ${escapeHtml(
            order.status ||
              '—',
          )}
        </strong>
      </div>
    </section>

    <section class="two-col">
      <article class="card">
        <div class="card-title">
          Kontakt investitora
        </div>

        ${
          order.customerOib
            ? `<p><strong>OIB:</strong> ${escapeHtml(
                order.customerOib,
              )}</p>`
            : ''
        }

        ${
          order.customerPhone
            ? `<p>${escapeHtml(
                order.customerPhone,
              )}</p>`
            : ''
        }

        ${
          order.customerEmail
            ? `<p>${escapeHtml(
                order.customerEmail,
              )}</p>`
            : ''
        }
      </article>

      <article class="card soft">
        <div class="card-title">
          Evidencija rada
        </div>

        <div class="work-time">
          <p>
            <strong>Dolazak:</strong>
            ${escapeHtml(
              order.arrivalTime ||
                '—',
            )}
          </p>

          <p>
            <strong>Odlazak:</strong>
            ${escapeHtml(
              order.departureTime ||
                '—',
            )}
          </p>

          <p class="full">
            <strong>Radnik:</strong>
            ${escapeHtml(
              order.assignedWorkers
                .join(', ') ||
                '—',
            )}
          </p>
        </div>

        <span class="duration-pill">
          Ukupno zadržavanje:
          ${durationText(
            duration,
          )}
        </span>
      </article>
    </section>

    ${
      order.description ||
      order.title
        ? `
          <section class="section">
            <div class="section-heading">
              Izvedeni radovi
            </div>

            <div class="description">
              ${
                order.title
                  ? `<strong>${escapeHtml(
                      order.title,
                    )}</strong>`
                  : ''
              }

              ${multilineHtml(
                order.description ||
                  '',
              )}
            </div>
          </section>
        `
        : ''
    }
  `
}

function materials(
  rows:
    WorkOrderMaterial[],
  startIndex:
    number,
  materialTotal:
    number,
  isLastMaterialPage:
    boolean,
) {
  if (!rows.length) {
    return ''
  }

  return `
    <section class="section">
      <div class="section-heading">
        Utrošeni materijal
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:7%" class="center">
                #
              </th>

              <th style="width:43%">
                Materijal
              </th>

              <th style="width:10%" class="right">
                Kol.
              </th>

              <th style="width:10%" class="center">
                JM
              </th>

              <th style="width:14%" class="right">
                Cijena
              </th>

              <th style="width:16%" class="right">
                Ukupno
              </th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(
                (
                  item,
                  index,
                ) => `
                  <tr>
                    <td class="center">
                      ${startIndex + index + 1}
                    </td>

                    <td class="name">
                      ${escapeHtml(
                        item.name,
                      )}
                    </td>

                    <td class="right">
                      ${formatNumberHr(
                        item.quantity,
                      )}
                    </td>

                    <td class="center">
                      ${escapeHtml(
                        item.unit,
                      )}
                    </td>

                    <td class="right">
                      ${formatCurrencyEur(
                        item.unitPrice,
                      )}
                    </td>

                    <td class="right">
                      <strong>${formatCurrencyEur(
                        calculateMaterialTotal(
                          item,
                        ),
                      )}</strong>
                    </td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>

      ${
        isLastMaterialPage
          ? `
            <div class="material-total">
              <span>
                UKUPNO MATERIJAL:
              </span>

              <strong>
                ${formatCurrencyEur(
                  materialTotal,
                )}
              </strong>
            </div>
          `
          : ''
      }
    </section>
  `
}

function photos(
  images:
    WorkOrderImage[],
) {
  if (!images.length) {
    return ''
  }

  return `
    <article class="photos-card">
      <h3>
        Fotodokumentacija
        (${images.length})
      </h3>

      <div class="photo-grid">
        ${images
          .map(
            (
              image,
              index,
            ) => `
              <div class="photo">
                <img
                  src="${escapeHtml(
                    image.dataUrl,
                  )}"
                  alt="Fotografija ${index + 1}"
                />

                <span>
                  ${escapeHtml(
                    image.name ||
                      `Fotografija ${index + 1}`,
                  )}
                </span>
              </div>
            `,
          )
          .join('')}
      </div>
    </article>
  `
}

function finalContent(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  design:
    DocumentDesign,
  pagePhotos:
    WorkOrderImage[],
) {
  const totals =
    calculatedTotals(
      order,
    )

  const stamp =
    design.showStamp &&
    branding.stamp
      ? `
        <img
          src="${escapeHtml(
            branding.stamp,
          )}"
          alt="Pečat"
        />
      `
      : ''

  const investorSignature =
    order.investorSignature
      ? `
        <img
          src="${escapeHtml(
            order.investorSignature,
          )}"
          alt="Potpis investitora"
        />
      `
      : ''

  return `
    <section class="bottom-row">
      <article class="note-card">
        <h3>
          Napomena
        </h3>

        <p>
          ${multilineHtml(
            order.priceNote ||
              'Sustav uredno ispitan i funkcionalan. Preporuka redovitog održavanja.',
          )}
        </p>
      </article>

      ${
        pagePhotos.length
          ? photos(
              pagePhotos,
            )
          : `
            <article class="photos-card">
              <h3>
                Fotodokumentacija
              </h3>

              <p style="margin:0;color:#64748B;font-size:9.5px;">
                Nema priloženih fotografija.
              </p>
            </article>
          `
      }
    </section>

    ${
      design
        .workOrderShowPrices
        ? `
          <section class="finance">
            <div>
              <span>Rad</span>
              <strong>${formatCurrencyEur(
                totals.labour,
              )}</strong>
            </div>

            <div>
              <span>Materijal</span>
              <strong>${formatCurrencyEur(
                totals.material,
              )}</strong>
            </div>

            <div>
              <span>PDV</span>
              <strong>${formatCurrencyEur(
                totals.vat,
              )}</strong>
            </div>

            <div class="grand">
              <span>Ukupno</span>
              <strong>${formatCurrencyEur(
                totals.total,
              )}</strong>
            </div>
          </section>
        `
        : ''
    }

    ${
      design.showSignature
        ? `
          <section class="signatures">
            <article class="signature-card">
              <h3>
                Pečat / štambilj
              </h3>

              <div class="signature-space">
                ${stamp}
              </div>

              <div class="signature-name">
                ${escapeHtml(
                  branding.companyName,
                )}
              </div>
            </article>

            <article class="signature-card">
              <h3>
                Potpis investitora
              </h3>

              <div class="signature-space">
                ${investorSignature}
              </div>

              <div class="signature-name">
                ${escapeHtml(
                  order.investorName ||
                    order.customerName ||
                    'Investitor',
                )}
              </div>
            </article>
          </section>
        `
        : ''
    }
  `
}

function photoAttachment(
  images:
    WorkOrderImage[],
) {
  return `
    <section class="section">
      <div class="section-heading">
        Fotodokumentacija
      </div>

      <div class="photos-only-grid">
        ${images
          .map(
            (
              image,
              index,
            ) => `
              <div class="photo">
                <img
                  src="${escapeHtml(
                    image.dataUrl,
                  )}"
                  alt="Fotografija ${index + 1}"
                />

                <span>
                  ${escapeHtml(
                    image.name ||
                      `Fotografija ${index + 1}`,
                  )}
                </span>
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function fallbackDesign(
  branding:
    WorkOrderBranding,
): DocumentDesign {
  return {
    preset:
      branding.layout ===
      'classic'
        ? 'classic'
        : branding.layout ===
            'custom' ||
          branding.layout ===
            'minimal'
          ? 'custom'
          : 'modern',
    density: 'auto',
    primaryColor:
      branding.primaryColor ||
      '#2563EB',
    secondaryColor:
      branding.secondaryColor ||
      '#071B46',
    accentColor:
      branding.accentColor ||
      '#2563EB',
    textColor:
      branding.textColor ||
      '#0F172A',
    borderColor:
      branding.borderColor ||
      '#CBD5E1',
    compactMargins: false,
    showLogo:
      branding.showLogo,
    showFooter:
      branding.showDocumentFooter,
    showStamp:
      branding.showStamp,
    showSignature:
      branding.showSignatureBlock,
    workOrderShowPrices: true,
    workOrderShowPhotos: true,
    offerShowItemImages: true,
    offerShowAcceptance: true,
    invoiceShowPaymentBox: true,
    invoiceShowResponsiblePerson: true,
  }
}

export function
buildWorkOrderPdfHtml(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  designOverride?:
    DocumentDesign,
) {
  const design =
    designOverride ??
    fallbackDesign(
      branding,
    )

  const pages =
    paginate(
      order,
      design,
    )

  const materialPrice =
    calculatedMaterialPrice(
      order,
    )

  let materialIndex = 0

  const htmlPages =
    pages.map(
      (
        page,
        pageIndex,
      ) => {
        const startIndex =
          materialIndex

        materialIndex +=
          page.materials.length

        const remainingMaterial =
          materialIndex <
          order.materials.length

        const isFinalContentPage =
          page.final &&
          !page.photosOnly

        return `
          <section class="pdf-page preset-${design.preset}">
            <div class="page">
              ${
                page.first
                  ? header(
                      order,
                      branding,
                      design,
                    )
                  : continuationHeader(
                      order,
                      branding,
                    )
              }

              ${
                page.first
                  ? firstInfo(
                      order,
                    )
                  : ''
              }

              ${
                page.photosOnly
                  ? photoAttachment(
                      page.photos,
                    )
                  : materials(
                      page.materials,
                      startIndex,
                      materialPrice,
                      !remainingMaterial,
                    )
              }

              ${
                isFinalContentPage
                  ? finalContent(
                      order,
                      branding,
                      design,
                      page.photos,
                    )
                  : ''
              }

              ${
                design.showFooter
                  ? `
                    <footer class="footer">
                      <span>
                        ${escapeHtml(
                          branding.footerText ||
                            'Hvala na povjerenju.',
                        )}
                      </span>

                      <span>
                        ${escapeHtml(
                          order.orderNumber,
                        )}
                        ·
                        ${pageIndex + 1}/${pages.length}
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

  <title>${escapeHtml(
    order.orderNumber,
  )}</title>

  <style>
    ${css(
      design,
    )}
  </style>
</head>

<body>
  <div class="toolbar">
    <button
      class="primary"
      onclick="window.print()"
    >
      Ispis / spremi PDF
    </button>

    <button
      class="secondary"
      onclick="window.close()"
    >
      Zatvori
    </button>
  </div>

  <main class="pdf-stack">
    ${htmlPages}
  </main>
</body>
</html>`
}

async function
resolveDesign(
  override?:
    DocumentDesign,
) {
  if (override) {
    return override
  }

  try {
    return await getDocumentDesign(
      'workOrder',
    )
  } catch {
    return undefined
  }
}

export async function
getWorkOrderPdfBlob(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  designOverride?:
    DocumentDesign,
) {
  const design =
    await resolveDesign(
      designOverride,
    )

  return htmlPagesToPdfBlob(
    buildWorkOrderPdfHtml(
      order,
      branding,
      design,
    ),
  )
}

export async function
getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  designOverride?:
    DocumentDesign,
) {
  const design =
    await resolveDesign(
      designOverride,
    )

  return getHtmlPagesPdfBlobUrl(
    buildWorkOrderPdfHtml(
      order,
      branding,
      design,
    ),
  )
}

export async function
downloadWorkOrderPdf(
  order: WorkOrder,
  branding:
    WorkOrderBranding,
  designOverride?:
    DocumentDesign,
) {
  const blob =
    await getWorkOrderPdfBlob(
      order,
      branding,
      designOverride,
    )

  const url =
    URL.createObjectURL(
      blob,
    )

  const anchor =
    document.createElement(
      'a',
    )

  anchor.href = url
  anchor.download =
    `${safeFileName(
      order.orderNumber ||
        'radni-nalog',
    )}.pdf`

  document.body.appendChild(
    anchor,
  )
  anchor.click()
  anchor.remove()

  window.setTimeout(
    () =>
      URL.revokeObjectURL(
        url,
      ),
    3000,
  )
}
