import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import type {
  WorkOrder,
  WorkOrderBranding,
} from '../types/workOrder'

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

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function formatDate(
  value: string,
) {
  if (!value) return '—'

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(
    new Date(
      `${value}T00:00:00`,
    ),
  )
}

function durationLabel(
  minutes: number,
) {
  if (!minutes) return '—'

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

function densityClass(
  order: WorkOrder,
) {
  const itemCount =
    order.materials.length

  const textLength =
    (
      order.title +
      order.description
    ).length

  if (
    itemCount >= 11 ||
    textLength > 850
  ) {
    return 'density-tight'
  }

  if (
    itemCount >= 7 ||
    textLength > 500
  ) {
    return 'density-compact'
  }

  return 'density-normal'
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
  const logo =
    branding.showLogo &&
    branding.logo
      ? `<img class="logo" src="${escapeHtml(
          branding.logo,
        )}" alt="Logo" />`
      : `<div class="logo-fallback">${escapeHtml(
          (
            branding.companyName ||
            'FT'
          )
            .slice(0, 2)
            .toUpperCase(),
        )}</div>`

  const companyLines = [
    branding.companyAddress,
    branding.showCompanyOib &&
    branding.companyOib
      ? `OIB: ${branding.companyOib}`
      : '',
    branding.showCompanyIban &&
    branding.companyIban
      ? `IBAN: ${branding.companyIban}`
      : '',
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
    branding.showCompanyWebsite
      ? branding.companyWebsite
      : '',
  ]
    .filter(Boolean)
    .map(
      (line) =>
        `<div>${escapeHtml(
          line,
        )}</div>`,
    )
    .join('')

  const materialRows =
    order.materials.length
      ? order.materials
          .map(
            (
              material,
            ) => `
              <tr>
                <td>${escapeHtml(
                  material.name,
                )}</td>
                <td class="center">${escapeHtml(
                  material.quantity,
                )} ${escapeHtml(
                  material.unit,
                )}</td>
                <td class="right">${formatMoney(
                  material.unitPrice,
                )}</td>
                <td class="right strong">${formatMoney(
                  material.quantity *
                    material.unitPrice,
                )}</td>
              </tr>
            `,
          )
          .join('')
      : `
        <tr>
          <td colspan="4" class="empty">
            Nema evidentiranog materijala.
          </td>
        </tr>
      `

  const vatValue =
    order.totalPrice -
    order.materialPrice -
    order.labourPrice

  const stamp =
    branding.showStamp &&
    branding.stamp
      ? `<img class="stamp" src="${escapeHtml(
          branding.stamp,
        )}" alt="Pečat" />`
      : ''

  const investorSignature =
    order.investorSignature
      ? `<img class="signature-image" src="${escapeHtml(
          order.investorSignature,
        )}" alt="Potpis investitora" />`
      : ''

  return `
    <article class="pdf-page ${densityClass(
      order,
    )}">
      <div class="top-line"></div>

      <header class="header">
        <div class="company">
          ${logo}

          <div class="company-copy">
            <h1>${escapeHtml(
              branding.companyName ||
                'Naziv tvrtke',
            )}</h1>

            <div class="company-lines">
              ${companyLines}
            </div>
          </div>
        </div>

        <div class="document-heading">
          <div class="kicker">
            RADNI NALOG
          </div>

          <div class="document-number">
            ${escapeHtml(
              order.orderNumber,
            )}
          </div>

          <div class="document-date">
            Datum:
            ${escapeHtml(
              formatDate(
                order.date,
              ),
            )}
          </div>
        </div>
      </header>

      <section class="info-grid">
        <article class="info-card">
          <div class="eyebrow">
            KUPAC / INVESTITOR
          </div>

          <div class="customer-name">
            ${escapeHtml(
              order.customerName,
            )}
          </div>

          ${
            order.address
              ? `<div class="info-line">${escapeHtml(
                  order.address,
                )}</div>`
              : ''
          }

          ${
            order.customerOib
              ? `<div class="info-line">OIB: ${escapeHtml(
                  order.customerOib,
                )}</div>`
              : ''
          }

          ${
            order.customerPhone ||
            order.customerEmail
              ? `<div class="info-line">${escapeHtml(
                  [
                    order.customerPhone,
                    order.customerEmail,
                  ]
                    .filter(Boolean)
                    .join(' • '),
                )}</div>`
              : ''
          }
        </article>

        <article class="info-card muted-card">
          <div class="eyebrow">
            PODACI DOKUMENTA
          </div>

          <div class="meta-row">
            <span>Vrijeme</span>
            <strong>${escapeHtml(
              `${order.arrivalTime || '—'} – ${order.departureTime || '—'}`,
            )}</strong>
          </div>

          <div class="meta-row">
            <span>Trajanje</span>
            <strong>${escapeHtml(
              durationLabel(
                order.durationMinutes,
              ),
            )}</strong>
          </div>

          <div class="meta-row">
            <span>Status</span>
            <strong>${escapeHtml(
              order.status,
            )}</strong>
          </div>

          <div class="meta-row">
            <span>Radnici</span>
            <strong>${escapeHtml(
              order.assignedWorkers
                .join(', ') ||
                '—',
            )}</strong>
          </div>
        </article>
      </section>

      <section class="section">
        <h2>Opis radova</h2>

        <div class="description-box">
          ${
            order.title
              ? `<strong class="work-title">${escapeHtml(
                  order.title,
                )}</strong>`
              : ''
          }

          ${
            order.description
              ? `<div class="normal-text">${multilineHtml(
                  order.description,
                )}</div>`
              : `<div class="normal-text muted">Nema dodatnog opisa.</div>`
          }
        </div>
      </section>

      <section class="section">
        <h2>Utrošeni materijal</h2>

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
              ${materialRows}
            </tbody>
          </table>
        </div>
      </section>

      <section class="totals-wrap">
        <div class="totals">
          <div class="total-row">
            <span>Materijal</span>
            <strong>${formatMoney(
              order.materialPrice,
            )}</strong>
          </div>

          <div class="total-row">
            <span>Rad</span>
            <strong>${formatMoney(
              order.labourPrice,
            )}</strong>
          </div>

          <div class="total-row">
            <span>PDV ${escapeHtml(
              order.vatRate,
            )}%</span>
            <strong>${formatMoney(
              vatValue,
            )}</strong>
          </div>

          <div class="grand-total">
            <span>UKUPNO</span>
            <strong>${formatMoney(
              order.totalPrice,
            )}</strong>
          </div>
        </div>
      </section>

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

      <section class="signature-section">
        <h2>Potpis i ovjera</h2>

        <div class="signature-grid">
          <div class="signature-card">
            <div class="signature-space">
              ${stamp}
            </div>

            <div class="signature-line">
              <strong>Izvođač radova</strong>
              <span>Pečat / potpis</span>
            </div>
          </div>

          <div class="signature-card">
            <div class="signature-space">
              ${investorSignature}
            </div>

            <div class="signature-line">
              <strong>${escapeHtml(
                order.investorName ||
                  'Investitor',
              )}</strong>
              <span>Potpis investitora</span>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <span>${escapeHtml(
          branding.footerText ||
            '',
        )}</span>

        <span>${escapeHtml(
          order.orderNumber,
        )}</span>
      </footer>
    </article>
  `
}

function workOrderCss(
  primary: string,
) {
  return `
    * {
      box-sizing: border-box;
      letter-spacing: normal;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #334155;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-style: normal;
      font-kerning: normal;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing:
        antialiased;
    }

    .pdf-page {
      position: relative;
      width: 794px;
      min-height: 1123px;
      padding: 42px 46px 38px;
      overflow: hidden;
      background: #ffffff;
    }

    .top-line {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 8px;
      background: ${primary};
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr) auto;
      gap: 24px;
      align-items: start;
      padding-bottom: 22px;
      border-bottom:
        1px solid #dbe3ee;
    }

    .company {
      display: flex;
      gap: 15px;
      min-width: 0;
    }

    .logo,
    .logo-fallback {
      width: 72px;
      height: 72px;
      flex: 0 0 72px;
    }

    .logo {
      object-fit: contain;
    }

    .logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: ${primary};
      color: #fff;
      font-size: 24px;
      font-weight: 700;
    }

    .company-copy h1 {
      margin: 2px 0 0;
      color: #0f172a;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-size: 26px;
      line-height: 1.15;
      font-weight: 700;
      letter-spacing: normal;
    }

    .company-lines {
      margin-top: 8px;
      color: #475569;
      font-size: 13px;
      line-height: 1.5;
      font-weight: 400;
      letter-spacing: normal;
    }

    .document-heading {
      min-width: 185px;
      text-align: right;
    }

    .kicker {
      color: ${primary};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .14em;
    }

    .document-number {
      margin-top: 7px;
      color: #0f172a;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: normal;
    }

    .document-date {
      margin-top: 8px;
      color: #64748b;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: normal;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 20px;
    }

    .info-card {
      min-height: 130px;
      padding: 16px 18px;
      border:
        1px solid #dbe3ee;
      border-radius: 14px;
      background: #fff;
    }

    .muted-card {
      background: #f8fafc;
    }

    .eyebrow {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .12em;
    }

    .customer-name {
      margin-top: 11px;
      color: #0f172a;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: normal;
    }

    .info-line {
      margin-top: 6px;
      color: #475569;
      font-size: 13px;
      line-height: 1.35;
      font-weight: 400;
      letter-spacing: normal;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 5px 0;
      color: #64748b;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: normal;
    }

    .meta-row strong {
      max-width: 62%;
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      letter-spacing: normal;
    }

    .section {
      margin-top: 19px;
    }

    .section h2,
    .signature-section > h2 {
      position: relative;
      margin: 0 0 10px;
      padding-left: 15px;
      color: #0f172a;
      font-size: 16px;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: normal;
    }

    .section h2::before,
    .signature-section > h2::before {
      position: absolute;
      top: -3px;
      bottom: -3px;
      left: 0;
      width: 4px;
      content: "";
      background: ${primary};
    }

    .description-box {
      padding: 13px 16px;
      border:
        1px solid #dbe3ee;
      border-radius: 12px;
      color: #334155;
      font-size: 13px;
      line-height: 1.55;
      font-weight: 400;
      letter-spacing: normal;
    }

    .work-title {
      display: block;
      margin-bottom: 5px;
      color: #1e293b;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: normal;
    }

    .normal-text {
      color: #334155;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-size: 13px;
      line-height: 1.55;
      font-weight: 400;
      letter-spacing: normal;
      word-spacing: normal;
      white-space: normal;
    }

    .muted {
      color: #94a3b8;
    }

    .table-wrap {
      overflow: hidden;
      border:
        1px solid #dbe3ee;
      border-radius: 11px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-size: 12px;
      font-weight: 400;
      letter-spacing: normal;
    }

    th {
      padding: 9px 10px;
      background: ${primary};
      color: #ffffff;
      font-size: 11px;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: normal;
      text-align: left;
    }

    th:nth-child(1) {
      width: 55%;
    }

    th:nth-child(2) {
      width: 15%;
    }

    th:nth-child(3) {
      width: 15%;
    }

    th:nth-child(4) {
      width: 15%;
    }

    td {
      padding: 8px 10px;
      border-bottom:
        1px solid #e2e8f0;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.25;
      font-weight: 400;
      letter-spacing: normal;
      word-spacing: normal;
      vertical-align: middle;
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

    .strong {
      font-weight: 700;
    }

    .empty {
      padding: 14px;
      color: #94a3b8;
      text-align: center;
    }

    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }

    .totals {
      width: 290px;
    }

    .total-row,
    .grand-total {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 5px 2px;
      color: #64748b;
      font-size: 13px;
      font-weight: 400;
      letter-spacing: normal;
    }

    .total-row strong {
      color: #1e293b;
      font-weight: 700;
      letter-spacing: normal;
    }

    .grand-total {
      margin-top: 2px;
      color: ${primary};
      font-size: 18px;
      font-weight: 700;
    }

    .grand-total strong {
      font-weight: 700;
    }

    .price-note {
      margin-top: 8px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.4;
      font-weight: 400;
      letter-spacing: normal;
    }

    .signature-section {
      margin-top: 22px;
      break-inside: avoid;
    }

    .signature-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 70px;
      margin-top: 18px;
    }

    .signature-space {
      position: relative;
      height: 62px;
    }

    .stamp,
    .signature-image {
      position: absolute;
      left: 50%;
      bottom: 5px;
      max-width: 150px;
      max-height: 58px;
      object-fit: contain;
      transform: translateX(-50%);
    }

    .signature-line {
      border-top:
        1px solid #94a3b8;
      padding-top: 7px;
      text-align: center;
    }

    .signature-line strong {
      display: block;
      color: #1e293b;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: normal;
    }

    .signature-line span {
      display: block;
      margin-top: 2px;
      color: #94a3b8;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: normal;
    }

    footer {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      margin-top: 18px;
      padding-top: 7px;
      border-top:
        1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 9px;
      font-weight: 400;
      letter-spacing: normal;
    }

    .density-compact {
      padding-top: 36px;
    }

    .density-compact .header {
      padding-bottom: 17px;
    }

    .density-compact .logo,
    .density-compact .logo-fallback {
      width: 62px;
      height: 62px;
      flex-basis: 62px;
    }

    .density-compact .info-grid {
      margin-top: 15px;
    }

    .density-compact .info-card {
      min-height: 112px;
      padding: 13px 15px;
    }

    .density-compact .section {
      margin-top: 14px;
    }

    .density-compact td {
      padding-top: 6px;
      padding-bottom: 6px;
    }

    .density-compact .signature-section {
      margin-top: 16px;
    }

    .density-tight {
      padding-top: 31px;
    }

    .density-tight .logo,
    .density-tight .logo-fallback {
      width: 54px;
      height: 54px;
      flex-basis: 54px;
    }

    .density-tight .company-copy h1 {
      font-size: 22px;
    }

    .density-tight .header {
      padding-bottom: 13px;
    }

    .density-tight .info-grid {
      margin-top: 12px;
      gap: 10px;
    }

    .density-tight .info-card {
      min-height: 100px;
      padding: 11px 13px;
    }

    .density-tight .section {
      margin-top: 11px;
    }

    .density-tight .description-box {
      padding: 9px 12px;
    }

    .density-tight td {
      padding-top: 5px;
      padding-bottom: 5px;
      font-size: 11px;
    }

    .density-tight th {
      padding-top: 7px;
      padding-bottom: 7px;
    }

    .density-tight .signature-section {
      margin-top: 12px;
    }

    .density-tight .signature-space {
      height: 48px;
    }
  `
}

function buildDocument(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  return `
    <div
      data-fersys-work-order
      style="
        position: fixed;
        left: -100000px;
        top: 0;
        width: 794px;
        background: white;
        z-index: -1;
      "
    >
      <style>
        ${workOrderCss(
          branding.primaryColor ||
            '#2563EB',
        )}
      </style>

      ${buildWorkOrderPdfHtml(
        order,
        branding,
      )}
    </div>
  `
}

async function renderWorkOrderCanvas(
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

    return await html2canvas(
      target.querySelector(
        '.pdf-page',
      ) as HTMLElement,
      {
        scale: 2,
        backgroundColor:
          '#ffffff',
        useCORS: true,
        logging: false,
      },
    )
  } finally {
    target.remove()
  }
}

function canvasToPdf(
  canvas: HTMLCanvasElement,
) {
  const doc =
    new jsPDF({
      orientation:
        'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

  const pageWidth =
    210

  const pageHeight =
    297

  const sourcePageHeight =
    Math.floor(
      canvas.width *
        (pageHeight /
          pageWidth),
    )

  let sourceY = 0
  let pageIndex = 0

  while (
    sourceY <
    canvas.height
  ) {
    const sliceHeight =
      Math.min(
        sourcePageHeight,
        canvas.height -
          sourceY,
      )

    const pageCanvas =
      document.createElement(
        'canvas',
      )

    pageCanvas.width =
      canvas.width

    pageCanvas.height =
      sourcePageHeight

    const context =
      pageCanvas.getContext(
        '2d',
      )

    if (!context) {
      throw new Error(
        'PDF stranicu nije moguće pripremiti.',
      )
    }

    context.fillStyle =
      '#ffffff'

    context.fillRect(
      0,
      0,
      pageCanvas.width,
      pageCanvas.height,
    )

    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    )

    if (pageIndex > 0) {
      doc.addPage()
    }

    const imageData =
      pageCanvas.toDataURL(
        'image/jpeg',
        0.96,
      )

    doc.addImage(
      imageData,
      'JPEG',
      0,
      0,
      pageWidth,
      pageHeight,
      undefined,
      'FAST',
    )

    sourceY +=
      sourcePageHeight

    pageIndex += 1
  }

  return doc
}

export async function createWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const canvas =
    await renderWorkOrderCanvas(
      order,
      branding,
    )

  return canvasToPdf(
    canvas,
  )
}

export async function getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    await createWorkOrderPdf(
      order,
      branding,
    )

  return doc.output(
    'bloburl',
  )
}

export async function downloadWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    await createWorkOrderPdf(
      order,
      branding,
    )

  doc.save(
    `${safeFileName(
      order.orderNumber,
    )}-${safeFileName(
      order.customerName,
    )}.pdf`,
  )
}