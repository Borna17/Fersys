import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
  WorkOrderMaterial,
} from '../types/workOrder'

import type {
  DocumentAppearance,
} from '../types/documentAppearance'

import {
  getDocumentAppearanceSettings,
} from '../services/documentAppearance.service'

type PdfPage = {
  materials: WorkOrderMaterial[]
  photos: WorkOrderImage[]
  first: boolean
  last: boolean
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

function durationLabel(order: WorkOrder) {
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

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) return `${hours} h`

  return `${rest} min`
}

function materialTotal(item: WorkOrderMaterial) {
  return (
    Number(item.quantity || 0) *
    Number(item.unitPrice || 0)
  )
}

function calculatedTotals(order: WorkOrder) {
  const materialFromRows =
    order.materials.reduce(
      (sum, item) =>
        sum + materialTotal(item),
      0,
    )

  const material =
    materialFromRows > 0
      ? materialFromRows
      : Number(order.materialPrice || 0)

  const labour =
    Number(order.labourPrice || 0)

  const base =
    material + labour

  const vat =
    base *
    (Number(order.vatRate || 0) / 100)

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

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
}

function alphaHex(
  color: string,
  alpha: string,
) {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
    ? `${color}${alpha}`
    : color
}

function companyLogoHtml(
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  if (
    appearance.showLogo &&
    branding.logo
  ) {
    return `
      <div class="company-logo-box">
        <img
          class="company-logo"
          src="${escapeHtml(
            branding.logo,
          )}"
          alt=""
        />
      </div>
    `
  }

  if (!appearance.showLogo) {
    return ''
  }

  const fallback =
    (
      branding.companyName ||
      'FY'
    )
      .slice(0, 2)
      .toUpperCase()

  return `
    <div class="company-logo-fallback">
      ${escapeHtml(fallback)}
    </div>
  `
}

function companyHtml(
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const details: string[] = []

  if (branding.companyAddress) {
    details.push(branding.companyAddress)
  }

  const contact = [
    branding.showCompanyPhone
      ? branding.companyPhone
      : '',
    branding.showCompanyEmail
      ? branding.companyEmail
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  if (contact) {
    details.push(contact)
  }

  const business = [
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
    .join(' · ')

  if (business) {
    details.push(business)
  }

  return `
    <div class="company-block">
      ${companyLogoHtml(
        branding,
        appearance,
      )}

      <div class="company-copy">
        <div class="company-name">
          ${escapeHtml(
            branding.companyName ||
            'Vaša tvrtka',
          )}
        </div>

        ${
          details.length
            ? `
              <div class="company-details">
                ${details
                  .map(
                    (line) =>
                      `<div>${escapeHtml(
                        line,
                      )}</div>`,
                  )
                  .join('')}
              </div>
            `
            : ''
        }
      </div>
    </div>
  `
}

function documentHeaderHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const alignment =
    appearance.headerAlignment

  return `
    <div class="top-accent"></div>

    <header
      class="document-header header-${escapeHtml(
        alignment,
      )}"
    >
      <div class="header-row">
        ${companyHtml(
          branding,
          appearance,
        )}

        <div class="document-heading">
          <div class="document-kicker">
            SERVISNI DOKUMENT
          </div>

          <div class="document-title">
            ${escapeHtml(
              appearance.documentTitle ||
              'RADNI NALOG',
            )}
          </div>
        </div>
      </div>

      ${metaGridHtml(order)}
    </header>
  `
}

function continuationHeaderHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
  pageNumber: number,
) {
  return `
    <div class="top-accent"></div>

    <header class="continuation-header">
      ${companyHtml(
        branding,
        appearance,
      )}

      <div class="continuation-right">
        <strong>
          ${escapeHtml(
            appearance.documentTitle ||
            'RADNI NALOG',
          )}
        </strong>

        <span>
          ${escapeHtml(
            order.orderNumber,
          )} · ${pageNumber}
        </span>
      </div>
    </header>
  `
}

function metaGridHtml(order: WorkOrder) {
  const items = [
    ['Broj naloga', order.orderNumber || '—'],
    ['Datum', formatDate(order.date)],
    [
      'Dolazak / odlazak',
      `${order.arrivalTime || '—'} – ${
        order.departureTime || '—'
      }`,
    ],
    ['Trajanje', durationLabel(order)],
    ['Status', order.status || '—'],
    ['Stranica', '1'],
  ]

  return `
    <div class="meta-grid">
      ${items
        .map(
          ([label, value]) => `
            <div class="meta-cell">
              <div class="meta-label">
                ${escapeHtml(label)}
              </div>

              <div class="meta-value">
                ${escapeHtml(value)}
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `
}

function infoHtml(
  order: WorkOrder,
  appearance: DocumentAppearance,
) {
  const customer =
    order.customerName ||
    order.investorName ||
    '—'

  const details = [
    order.address,
    order.customerOib
      ? `OIB: ${order.customerOib}`
      : '',
    order.customerPhone,
    order.customerEmail,
  ].filter(Boolean)

  const workers =
    order.assignedWorkers.join(' · ') ||
    '—'

  if (appearance.infoStyle === 'lines') {
    return `
      <section class="info-lines">
        <div class="info-line-row">
          <span>Investitor / naručitelj</span>
          <strong>
            ${escapeHtml(customer)}
          </strong>
        </div>

        ${
          details.length
            ? `
              <div class="info-line-row info-line-small">
                <span>Podaci</span>
                <strong>
                  ${escapeHtml(
                    details.join(' · '),
                  )}
                </strong>
              </div>
            `
            : ''
        }

        <div class="info-line-row">
          <span>Izvršitelji</span>
          <strong>
            ${escapeHtml(workers)}
          </strong>
        </div>
      </section>
    `
  }

  return `
    <section class="info-cards">
      <article class="info-card investor-card">
        <div class="eyebrow">
          Investitor / naručitelj
        </div>

        <div class="customer-name">
          ${escapeHtml(customer)}
        </div>

        ${
          details.length
            ? `
              <div class="customer-details">
                ${details
                  .map(
                    (item) =>
                      `<span>${escapeHtml(
                        item,
                      )}</span>`,
                  )
                  .join('')}
              </div>
            `
            : ''
        }
      </article>

      <article class="info-card workers-card">
        <div class="eyebrow">
          Izvršitelji
        </div>

        <div class="workers-value">
          ${escapeHtml(workers)}
        </div>
      </article>
    </section>
  `
}

function sectionTitleHtml(
  label: string,
  appearance: DocumentAppearance,
) {
  if (
    appearance.sectionStyle === 'bar'
  ) {
    return `
      <div class="section-title section-title-bar">
        ${escapeHtml(label)}
      </div>
    `
  }

  if (
    appearance.sectionStyle === 'line'
  ) {
    return `
      <div class="section-title section-title-line">
        ${escapeHtml(label)}
      </div>
    `
  }

  return `
    <div class="section-title section-title-plain">
      ${escapeHtml(label)}
    </div>
  `
}

function descriptionHtml(
  order: WorkOrder,
  appearance: DocumentAppearance,
) {
  return `
    <section class="content-section">
      ${sectionTitleHtml(
        'Opis radova',
        appearance,
      )}

      <div class="description-box">
        ${
          order.title
            ? `
              <div class="work-title">
                ${escapeHtml(
                  order.title,
                )}
              </div>
            `
            : ''
        }

        <div class="description-text">
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

function emptyMaterialRowHtml() {
  return `
    <tr class="empty-row">
      <td colspan="4">
        Nema evidentiranog materijala.
      </td>
    </tr>
  `
}

function materialsTableHtml(
  materials: WorkOrderMaterial[],
  appearance: DocumentAppearance,
) {
  const rows =
    materials.length > 0
      ? materials
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
      : emptyMaterialRowHtml()

  return `
    <div
      class="material-table-wrap table-${escapeHtml(
        appearance.tableStyle,
      )}"
    >
      <table class="material-table">
        <thead>
          <tr>
            <th>Opis</th>
            <th class="center">Kol.</th>
            <th class="right">Cijena</th>
            <th class="right">Ukupno</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `
}

function totalsHtml(order: WorkOrder) {
  const totals =
    calculatedTotals(order)

  const hasPriceData =
    totals.material !== 0 ||
    totals.labour !== 0 ||
    totals.vat !== 0 ||
    totals.total !== 0 ||
    Boolean(order.priceNote)

  if (!hasPriceData) {
    return ''
  }

  return `
    <div class="totals-row">
      <div class="totals-spacer"></div>

      <div class="totals-box">
        <div>
          <span>Materijal</span>
          <strong>
            ${escapeHtml(
              formatMoney(
                totals.material,
              ),
            )}
          </strong>
        </div>

        <div>
          <span>Rad</span>
          <strong>
            ${escapeHtml(
              formatMoney(
                totals.labour,
              ),
            )}
          </strong>
        </div>

        <div>
          <span>
            PDV ${escapeHtml(
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

function materialsHtml(
  materials: WorkOrderMaterial[],
  order: WorkOrder,
  appearance: DocumentAppearance,
  showTotals: boolean,
) {
  return `
    <section class="content-section">
      ${sectionTitleHtml(
        'Utrošeni materijal',
        appearance,
      )}

      ${materialsTableHtml(
        materials,
        appearance,
      )}

      ${
        showTotals
          ? totalsHtml(order)
          : ''
      }
    </section>
  `
}

function photosHtml(
  photos: WorkOrderImage[],
  appearance: DocumentAppearance,
) {
  if (!photos.length) return ''

  return `
    <section class="content-section photos-section">
      ${sectionTitleHtml(
        'Fotografije',
        appearance,
      )}

      <div class="photo-grid">
        ${photos
          .map(
            (image) => `
              <figure class="photo-card">
                <img
                  src="${escapeHtml(
                    image.dataUrl,
                  )}"
                  alt=""
                />

                <figcaption>
                  ${escapeHtml(
                    image.name,
                  )}
                </figcaption>
              </figure>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function signatureBoxHtml(
  title: string,
  subtitle: string,
  image: string,
) {
  return `
    <div class="signature-box">
      <div class="signature-image-space">
        ${
          image
            ? `
              <img
                src="${escapeHtml(image)}"
                alt=""
              />
            `
            : ''
        }
      </div>

      <div class="signature-caption">
        <strong>
          ${escapeHtml(title)}
        </strong>

        <span>
          ${escapeHtml(subtitle)}
        </span>
      </div>
    </div>
  `
}

function signatureHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  if (!appearance.showSignature) {
    return ''
  }

  const stamp =
    appearance.showStamp
      ? branding.stamp
      : ''

  const investor =
    order.investorSignature || ''

  return `
    <section class="signature-grid">
      ${signatureBoxHtml(
        'Izvođač radova',
        appearance.showStamp
          ? 'Pečat / potpis'
          : 'Potpis',
        stamp,
      )}

      ${signatureBoxHtml(
        order.investorName ||
          order.customerName ||
          'Investitor',
        'Potpis investitora',
        investor,
      )}
    </section>
  `
}

function watermarkHtml(
  appearance: DocumentAppearance,
) {
  if (
    !appearance.showWatermark ||
    !appearance.watermarkText
  ) {
    return ''
  }

  return `
    <div class="watermark">
      ${escapeHtml(
        appearance.watermarkText,
      )}
    </div>
  `
}

function footerHtml(
  order: WorkOrder,
  appearance: DocumentAppearance,
  pageNumber: number,
  totalPages: number,
) {
  if (!appearance.showFooter) {
    return ''
  }

  return `
    <footer class="document-footer">
      <span>
        ${escapeHtml(
          appearance.footerText || '',
        )}
      </span>

      <span>
        ${escapeHtml(
          order.orderNumber,
        )} · ${pageNumber} / ${totalPages}
      </span>
    </footer>
  `
}

function paginate(order: WorkOrder): PdfPage[] {
  const pages: PdfPage[] = []

  const firstMaterialLimit = 8
  const continuationMaterialLimit = 16

  const firstMaterials =
    order.materials.slice(
      0,
      firstMaterialLimit,
    )

  pages.push({
    materials: firstMaterials,
    photos: [],
    first: true,
    last: false,
  })

  let materialIndex =
    firstMaterials.length

  while (
    materialIndex <
    order.materials.length
  ) {
    const materials =
      order.materials.slice(
        materialIndex,
        materialIndex +
          continuationMaterialLimit,
      )

    materialIndex +=
      materials.length

    pages.push({
      materials,
      photos: [],
      first: false,
      last: false,
    })
  }

  for (
    let index = 0;
    index < order.images.length;
    index += 4
  ) {
    pages.push({
      materials: [],
      photos:
        order.images.slice(
          index,
          index + 4,
        ),
      first: false,
      last: false,
    })
  }

  if (!pages.length) {
    pages.push({
      materials: [],
      photos: [],
      first: true,
      last: true,
    })
  }

  pages.forEach(
    (page, index) => {
      page.last =
        index === pages.length - 1
    },
  )

  return pages
}

function css(
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const primary =
    appearance.primaryColor || '#2563EB'


  const accent =
    appearance.accentColor || '#38BDF8'

  const text =
    appearance.textColor || '#0F172A'

  const border =
    appearance.borderColor || '#CBD5E1'

  const background =
    appearance.backgroundColor || '#FFFFFF'

  const compact =
    appearance.density === 'compact'

  const outerPadding =
    compact ? 38 : 42

  const sectionGap =
    compact ? 8 : 11

  const bodyText =
    compact ? 8.7 : 9.4

  const rowPadding =
    compact ? '4px 6px' : '5px 7px'

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

    .page-inner {
      position: relative;
      z-index: 1;
      display: flex;
      height: 100%;
      flex-direction: column;
    }

    .top-accent {
      flex: 0 0 auto;
      height: 7px;
      background: ${primary};
    }

    .document-header {
      flex: 0 0 auto;
      padding:
        ${compact ? 17 : 20}px
        ${outerPadding}px
        ${compact ? 10 : 12}px;
    }

    .header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }

    .company-block {
      display: flex;
      min-width: 0;
      max-width: 68%;
      align-items: flex-start;
      gap: 12px;
    }

    .company-logo-box,
    .company-logo-fallback {
      width: 74px;
      height: 74px;
      flex: 0 0 74px;
    }

    .company-logo-box {
      display: grid;
      place-items: center;
      background: transparent;
    }

    .company-logo {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .company-logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: ${alphaHex(
        primary,
        '12',
      )};
      color: ${primary};
      font-size: 18px;
      font-weight: 950;
    }

    .company-copy {
      min-width: 0;
      padding-top: 7px;
    }

    .company-name {
      color: ${text};
      font-size: 19px;
      line-height: 1.12;
      font-weight: 950;
    }

    .company-details {
      margin-top: 6px;
      color: ${text};
      font-size: 8.6px;
      line-height: 1.35;
      opacity: .52;
    }

    .document-heading {
      min-width: 205px;
      padding-top: 8px;
      text-align: right;
    }

    .header-center .header-row {
      display: grid;
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
    }

    .header-center .company-block {
      max-width: 100%;
      justify-content: center;
    }

    .header-center .document-heading {
      min-width: 0;
      padding-top: 2px;
      text-align: center;
    }

    .header-right .header-row {
      flex-direction: row-reverse;
    }

    .header-right .document-heading {
      text-align: left;
    }

    .document-kicker {
      color: ${primary};
      font-size: 7.2px;
      font-weight: 950;
      letter-spacing: .19em;
      text-transform: uppercase;
    }

    .document-title {
      margin-top: 8px;
      color: ${primary};
      font-size: 25px;
      line-height: 1;
      font-weight: 950;
    }

    .meta-grid {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      margin-top: 15px;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 10px;
    }

    .meta-cell {
      min-width: 0;
      min-height: ${compact ? 37 : 42}px;
      padding:
        ${compact ? 6 : 8}px
        9px;
      border-right:
        1px solid ${border};
      border-bottom:
        1px solid ${border};
    }

    .meta-cell:nth-child(3n) {
      border-right: 0;
    }

    .meta-cell:nth-last-child(-n + 3) {
      border-bottom: 0;
    }

    .meta-label {
      color: ${text};
      font-size: 6.8px;
      font-weight: 950;
      letter-spacing: .05em;
      text-transform: uppercase;
      opacity: .38;
    }

    .meta-value {
      margin-top: 4px;
      color: ${text};
      font-size: 9.5px;
      line-height: 1.22;
      font-weight: 950;
      overflow-wrap: anywhere;
    }

    .page-content {
      flex: 1 1 auto;
      min-height: 0;
      padding:
        0 ${outerPadding}px;
    }

    .info-cards {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        31%;
      gap: 10px;
      margin-bottom: ${sectionGap}px;
    }

    .info-card {
      min-width: 0;
      min-height: ${compact ? 62 : 70}px;
      border: 1px solid ${border};
      border-radius: 10px;
      padding:
        ${compact ? 8 : 10}px
        11px;
      background: ${background};
    }

    .workers-card {
      background: ${alphaHex(
        primary,
        '0D',
      )};
    }

    .eyebrow {
      color: ${text};
      font-size: 6.8px;
      font-weight: 950;
      letter-spacing: .05em;
      text-transform: uppercase;
      opacity: .38;
    }

    .customer-name,
    .workers-value {
      margin-top: 7px;
      color: ${text};
      font-size: 11px;
      line-height: 1.25;
      font-weight: 950;
    }

    .customer-details {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-top: 5px;
      color: ${text};
      font-size: 7.4px;
      line-height: 1.3;
      opacity: .52;
    }

    .customer-details span + span::before {
      margin-right: 8px;
      content: "·";
      opacity: .45;
    }

    .info-lines {
      margin-bottom: ${sectionGap}px;
      border-top: 1px solid ${border};
      border-bottom: 1px solid ${border};
    }

    .info-line-row {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 18px;
      padding: 7px 0;
      border-bottom: 1px solid ${border};
      font-size: 8.8px;
    }

    .info-line-row:last-child {
      border-bottom: 0;
    }

    .info-line-row span {
      font-weight: 900;
      text-transform: uppercase;
      opacity: .42;
    }

    .info-line-row strong {
      min-width: 0;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .info-line-small {
      font-size: 7.7px;
    }

    .content-section {
      margin-top: ${sectionGap}px;
    }

    .section-title {
      margin:
        ${compact ? 8 : 11}px
        0
        ${compact ? 6 : 8}px;
      font-size: 8.5px;
      line-height: 1.2;
      font-weight: 950;
      text-transform: uppercase;
    }

    .section-title-bar {
      border-radius: 7px;
      padding: 7px 9px;
      background: ${primary};
      color: #fff;
    }

    .section-title-line {
      border-bottom:
        1.5px solid ${primary};
      padding-bottom: 5px;
      color: ${primary};
    }

    .section-title-plain {
      color: ${text};
    }

    .description-box {
      border: 1px solid ${border};
      border-radius: 9px;
      padding:
        ${compact ? 7 : 9}px
        10px;
      background: ${background};
    }

    .work-title {
      color: ${text};
      font-size: ${compact ? 9 : 9.6}px;
      line-height: 1.28;
      font-weight: 950;
    }

    .description-text {
      margin-top: 5px;
      color: ${text};
      font-size: ${bodyText}px;
      line-height: ${compact ? 1.26 : 1.34};
      overflow-wrap: anywhere;
      opacity: .78;
    }

    .material-table-wrap {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 8px;
    }

    .material-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: ${compact ? 7.8 : 8.4}px;
    }

    .material-table th {
      padding:
        ${compact ? '5px 6px' : '6px 7px'};
      font-size: 6.8px;
      font-weight: 950;
      text-align: left;
      text-transform: uppercase;
    }

    .material-table th:nth-child(1) {
      width: 46%;
    }

    .material-table th:nth-child(2) {
      width: 16%;
    }

    .material-table th:nth-child(3) {
      width: 18%;
    }

    .material-table th:nth-child(4) {
      width: 20%;
    }

    .table-solid thead {
      background: ${primary};
      color: #fff;
    }

    .table-soft thead {
      background: ${alphaHex(
        primary,
        '18',
      )};
      color: ${text};
    }

    .table-minimal thead {
      background: ${background};
      color: ${text};
    }

    .material-table td {
      padding: ${rowPadding};
      border-top:
        1px solid ${border};
      color: ${text};
      vertical-align: middle;
      overflow-wrap: anywhere;
    }

    .table-minimal {
      border-left: 0;
      border-right: 0;
      border-radius: 0;
    }

    .table-minimal .material-table th,
    .table-minimal .material-table td {
      padding-left: 0;
      padding-right: 0;
    }

    .center {
      text-align: center !important;
    }

    .right {
      text-align: right !important;
      white-space: nowrap;
    }

    .empty-row td {
      height: 31px;
      text-align: center;
      opacity: .38;
    }

    .totals-row {
      display: grid;
      grid-template-columns:
        1fr 235px;
      gap: 18px;
      margin-top: 8px;
    }

    .totals-box {
      font-size: 7.7px;
    }

    .totals-box > div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 2px 3px;
    }

    .totals-box > div > span {
      opacity: .55;
    }

    .totals-box .grand-total {
      margin-top: 3px;
      border-radius: 7px;
      padding: 7px 9px;
      background: ${primary};
      color: #fff;
      font-size: 10.3px;
      font-weight: 950;
    }

    .totals-box .price-note {
      display: block;
      margin-top: 5px;
      color: ${text};
      font-size: 7px;
      line-height: 1.3;
      opacity: .55;
    }

    .signature-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 18px;
      margin-top: 13px;
    }

    .signature-box {
      height: ${compact ? 85 : 92}px;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 9px;
      background: ${background};
    }

    .signature-image-space {
      display: flex;
      height: ${compact ? 58 : 64}px;
      align-items: center;
      justify-content: center;
      padding: 3px 8px;
    }

    .signature-image-space img {
      display: block;
      max-width: 225px;
      max-height: ${compact ? 56 : 62}px;
      object-fit: contain;
    }

    .signature-caption {
      border-top:
        1px solid ${border};
      padding: 5px 8px;
      text-align: center;
    }

    .signature-caption strong {
      display: block;
      color: ${text};
      font-size: 7.7px;
      line-height: 1.1;
    }

    .signature-caption span {
      display: block;
      margin-top: 2px;
      color: ${text};
      font-size: 6.4px;
      opacity: .42;
    }

    .photo-grid {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .photo-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 9px;
      background: ${background};
    }

    .photo-card img {
      display: block;
      width: 100%;
      height: 305px;
      object-fit: contain;
      background: #fff;
    }

    .photo-card figcaption {
      overflow: hidden;
      border-top:
        1px solid ${border};
      padding: 5px 7px;
      color: ${text};
      font-size: 7px;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: .48;
    }

    .continuation-header {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin: 0 ${outerPadding}px;
      border-bottom:
        1px solid ${border};
      padding:
        ${compact ? 12 : 15}px
        0
        ${compact ? 9 : 11}px;
    }

    .continuation-header .company-block {
      max-width: 65%;
    }

    .continuation-header
    .company-logo-box,
    .continuation-header
    .company-logo-fallback {
      width: 42px;
      height: 42px;
      flex-basis: 42px;
    }

    .continuation-header
    .company-copy {
      padding-top: 2px;
    }

    .continuation-header
    .company-name {
      font-size: 12px;
    }

    .continuation-header
    .company-details {
      display: none;
    }

    .continuation-right {
      text-align: right;
    }

    .continuation-right strong {
      display: block;
      color: ${primary};
      font-size: 13px;
      font-weight: 950;
    }

    .continuation-right span {
      display: block;
      margin-top: 3px;
      font-size: 7px;
      opacity: .42;
    }

    .continuation-note {
      margin-top: 10px;
      font-size: 7px;
      font-weight: 800;
      text-transform: uppercase;
      opacity: .32;
    }

    .document-footer {
      display: flex;
      flex: 0 0 auto;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      margin:
        10px
        ${outerPadding}px
        12px;
      border-top:
        1px solid ${border};
      padding-top: 6px;
      color: ${text};
      font-size: 6.2px;
      opacity: .4;
    }

    .watermark {
      position: absolute;
      left: 50%;
      top: 52%;
      z-index: 0;
      transform:
        translate(-50%, -50%)
        rotate(-32deg);
      color: ${primary};
      font-size: 76px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: .03em;
      opacity: .045;
      white-space: nowrap;
      pointer-events: none;
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
              url("${escapeHtml(
                branding.backgroundImage,
              )}")
              center / cover
              no-repeat;
            opacity: .05;
            content: "";
          }
        `
        : ''
    }

    .preset-classic .document-title,
    .preset-classic .document-kicker {
      color: ${primary};
    }

    .preset-classic .company-name {
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-weight: 700;
    }

    .preset-classic .document-title {
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-weight: 700;
    }

    .preset-minimal .top-accent {
      height: 2px;
    }

    .preset-minimal .document-title {
      color: ${text};
    }

    .preset-minimal .document-kicker {
      color: ${text};
      opacity: .48;
    }

    .preset-minimal .workers-card {
      background: ${background};
    }

    .preset-minimal .signature-box,
    .preset-minimal .description-box,
    .preset-minimal .info-card,
    .preset-minimal .meta-grid {
      border-radius: 3px;
    }

    .preset-custom .top-accent {
      background:
        linear-gradient(
          90deg,
          ${primary},
          ${accent}
        );
    }

    @media print {
      html,
      body {
        background: #fff;
      }
    }
  `
}

function pageHtml(
  page: PdfPage,
  pageNumber: number,
  totalPages: number,
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const presetClass =
    `preset-${appearance.preset}`


  const noMaterialContinuation =
    order.materials.length <= 8

  const showTotals =
    page.first
      ? noMaterialContinuation
      : (
          page.materials.length > 0 &&
          (
            pageNumber ===
            Math.ceil(
              Math.max(
                order.materials.length - 8,
                0,
              ) / 16,
            ) + 1
          )
        )

  const showSignature =
    page.last ||
    (
      order.images.length === 0 &&
      showTotals
    )

  return `
    <article
      class="pdf-page ${presetClass}"
      data-pdf-page
    >
      ${watermarkHtml(appearance)}

      <div class="page-inner">
        ${
          page.first
            ? documentHeaderHtml(
                order,
                branding,
                appearance,
              )
            : continuationHeaderHtml(
                order,
                branding,
                appearance,
                pageNumber,
              )
        }

        <main class="page-content">
          ${
            page.first
              ? infoHtml(
                  order,
                  appearance,
                )
              : `
                <div class="continuation-note">
                  Nastavak dokumenta
                </div>
              `
          }

          ${
            page.first
              ? descriptionHtml(
                  order,
                  appearance,
                )
              : ''
          }

          ${
            page.first ||
            page.materials.length > 0
              ? materialsHtml(
                  page.materials,
                  order,
                  appearance,
                  showTotals,
                )
              : ''
          }

          ${photosHtml(
            page.photos,
            appearance,
          )}

          ${
            showSignature
              ? signatureHtml(
                  order,
                  branding,
                  appearance,
                )
              : ''
          }
        </main>

        ${footerHtml(
          order,
          appearance,
          pageNumber,
          totalPages,
        )}
      </div>
    </article>
  `
}

function buildDocument(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const pages =
    paginate(order)

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
        ${css(
          branding,
          appearance,
        )}
      </style>

      ${pages
        .map(
          (page, index) =>
            pageHtml(
              page,
              index + 1,
              pages.length,
              order,
              branding,
              appearance,
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
      target.querySelectorAll('img'),
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

async function resolveAppearance() {
  try {
    const result =
      await getDocumentAppearanceSettings()

    return result.settings.workOrder
  } catch (error) {
    console.error(
      'Izgled radnog naloga nije moguće učitati, koristi se zadani izgled:',
      error,
    )

    return null
  }
}

function legacyAppearance(
  branding: WorkOrderBranding,
): DocumentAppearance {
  return {
    preset:
      branding.layout === 'minimal'
        ? 'minimal'
        : branding.layout,
    primaryColor:
      branding.primaryColor,
    secondaryColor:
      branding.secondaryColor,
    accentColor:
      branding.accentColor,
    textColor:
      branding.textColor,
    borderColor:
      branding.borderColor,
    backgroundColor:
      branding.backgroundColor,
    headerAlignment:
      branding.headerAlignment,
    density: 'comfortable',
    infoStyle:
      branding.customInfoStyle ===
      'cards'
        ? 'cards'
        : 'lines',
    tableStyle:
      branding.customMaterialStyle ===
      'list'
        ? 'minimal'
        : 'solid',
    sectionStyle:
      branding.layout === 'classic'
        ? 'line'
        : branding.layout === 'minimal'
          ? 'plain'
          : 'bar',
    showLogo:
      branding.showLogo,
    showStamp:
      branding.showStamp,
    showSignature: true,
    showFooter:
      Boolean(
        branding.footerText,
      ),
    showWatermark:
      Boolean(
        branding.watermarkText,
      ),
    showItemImages: false,
    documentTitle:
      branding.customDocumentTitle ||
      'RADNI NALOG',
    footerText:
      branding.footerText,
    watermarkText:
      branding.watermarkText,
  }
}

async function buildPdfDocument(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const storedAppearance =
    await resolveAppearance()

  const appearance =
    storedAppearance ||
    legacyAppearance(branding)

  const wrapper =
    document.createElement('div')

  wrapper.innerHTML =
    buildDocument(
      order,
      branding,
      appearance,
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

  document.body.appendChild(target)

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
        orientation: 'portrait',
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
            scale: 1.8,
            backgroundColor:
              appearance.backgroundColor ||
              '#ffffff',
            useCORS: true,
            logging: false,
          },
        )

      const image =
        canvas.toDataURL(
          'image/jpeg',
          0.95,
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

export function
buildWorkOrderPdfHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const appearance =
    legacyAppearance(branding)

  const hiddenDocument =
    buildDocument(
      order,
      branding,
      appearance,
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

export async function
getWorkOrderPdfBlob(
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

export async function
getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const blob =
    await getWorkOrderPdfBlob(
      order,
      branding,
    )

  return URL.createObjectURL(blob)
}