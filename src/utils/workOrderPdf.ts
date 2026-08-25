import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import {
  notifyDownloadError,
  notifyDownloadPreparing,
  saveBlobDownload,
} from './downloadFeedback'
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
  showTotals: boolean
}

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const multi = (value: string) =>
  esc(value).replace(/\r?\n/g, '<br>')

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('hr-HR').format(date)
}

function money(value: number) {
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

function durationFromTimes(
  arrivalTime: string,
  departureTime: string,
) {
  if (!arrivalTime || !departureTime) return 0

  const [ah, am] = arrivalTime.split(':').map(Number)
  const [dh, dm] = departureTime.split(':').map(Number)

  if ([ah, am, dh, dm].some((v) => !Number.isFinite(v))) {
    return 0
  }

  const start = ah * 60 + am
  let end = dh * 60 + dm

  if (end < start) end += 24 * 60
  return Math.max(0, end - start)
}

function durationLabel(order: WorkOrder) {
  const minutes =
    order.durationMinutes > 0
      ? order.durationMinutes
      : durationFromTimes(order.arrivalTime, order.departureTime)

  if (!minutes) return '—'

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours && rest) return `${hours} h ${rest} min`
  if (hours) return `${hours} h`
  return `${rest} min`
}

const materialTotal = (item: WorkOrderMaterial) =>
  Number(item.quantity || 0) * Number(item.unitPrice || 0)

function totals(order: WorkOrder) {
  const materialRows = order.materials.reduce(
    (sum, item) => sum + materialTotal(item),
    0,
  )

  const material =
    materialRows > 0
      ? materialRows
      : Number(order.materialPrice || 0)

  const labour = Number(order.labourPrice || 0)
  const base = material + labour
  const vat = base * (Number(order.vatRate || 0) / 100)

  const total =
    Number(order.totalPrice || 0) > 0
      ? Number(order.totalPrice)
      : base + vat

  return { material, labour, vat, total }
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
}

function alpha(color: string, opacity: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
    ? `${color}${opacity}`
    : color
}

function legacyAppearance(
  branding: WorkOrderBranding,
): DocumentAppearance {
  return {
    preset: branding.layout === 'minimal' ? 'minimal' : branding.layout,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    textColor: branding.textColor,
    borderColor: branding.borderColor,
    backgroundColor: branding.backgroundColor,
    headerAlignment: branding.headerAlignment,
    density: 'comfortable',
    infoStyle:
      branding.customInfoStyle === 'cards' ? 'cards' : 'lines',
    tableStyle:
      branding.customMaterialStyle === 'list' ? 'minimal' : 'solid',
    sectionStyle:
      branding.layout === 'classic'
        ? 'line'
        : branding.layout === 'minimal'
          ? 'plain'
          : 'bar',
    showLogo: branding.showLogo,
    showStamp: branding.showStamp,
    showSignature: true,
    showFooter: Boolean(branding.footerText),
    showWatermark: Boolean(branding.watermarkText),
    showItemImages: false,
    documentTitle:
      branding.customDocumentTitle || 'RADNI NALOG',
    footerText: /fersys/i.test(branding.footerText || '')
      ? ''
      : branding.footerText,
    watermarkText: branding.watermarkText,
  }
}

async function resolveAppearance(
  branding: WorkOrderBranding,
) {
  try {
    const result = await getDocumentAppearanceSettings()
    const stored = result.settings.workOrder

    return {
      ...stored,
      footerText: /fersys/i.test(stored.footerText || '')
        ? ''
        : stored.footerText,
    }
  } catch (error) {
    console.error(
      'Izgled radnog naloga nije moguće učitati, koristi se zadani izgled:',
      error,
    )
    return legacyAppearance(branding)
  }
}

function companyHtml(
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const logo =
    appearance.showLogo && branding.logo
      ? `<img class="company-logo" src="${esc(
          branding.logo,
        )}" alt="Logo tvrtke" />`
      : ''

  const lines: string[] = []

  if (branding.companyAddress) {
    lines.push(branding.companyAddress)
  }

  if (branding.showCompanyOib && branding.companyOib) {
    lines.push(`OIB: ${branding.companyOib}`)
  }

  if (branding.showCompanyIban && branding.companyIban) {
    lines.push(`IBAN: ${branding.companyIban}`)
  }

  const contact = [
    branding.showCompanyPhone ? branding.companyPhone : '',
    branding.showCompanyEmail ? branding.companyEmail : '',
    branding.showCompanyWebsite ? branding.companyWebsite : '',
  ]
    .filter(Boolean)
    .join('  •  ')

  if (contact) lines.push(contact)

  return `
    <div class="company">
      ${logo}
      <div class="company-copy">
        <div class="company-name">
          ${esc(branding.companyName || 'Vaša tvrtka')}
        </div>
        ${
          lines.length
            ? `<div class="company-details">${lines
                .map((line) => `<div>${esc(line)}</div>`)
                .join('')}</div>`
            : ''
        }
      </div>
    </div>
  `
}

function headerHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
  continuation: boolean,
) {
  return `
    <header class="document-header header-${esc(
      appearance.headerAlignment,
    )}">
      ${companyHtml(branding, appearance)}

      <div class="document-heading">
        ${
          continuation
            ? `<div class="continuation-label">NASTAVAK DOKUMENTA</div>`
            : ''
        }

        <h1>${esc(
          appearance.documentTitle || 'RADNI NALOG',
        )}</h1>

        <div class="document-number">
          <span>BR.</span>
          ${esc(order.orderNumber || '—')}
        </div>

        <div class="document-date">
          Datum: ${formatDate(order.date)}
        </div>
      </div>
    </header>
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
    order.customerOib ? `OIB: ${order.customerOib}` : '',
    order.customerPhone,
    order.customerEmail,
  ].filter(Boolean)

  const workers =
    order.assignedWorkers.filter(Boolean).join(', ') || '—'

  return `
    <section class="info-grid ${esc(appearance.infoStyle)}">
      <article class="info-block">
        <div class="info-title">INVESTITOR / NARUČITELJ</div>
        <div class="investor-name">${esc(customer)}</div>
        ${
          details.length
            ? `<div class="info-lines">${details
                .map((item) => `<div>${esc(item)}</div>`)
                .join('')}</div>`
            : ''
        }
      </article>

      <article class="info-block">
        <div class="info-title">PODACI NALOGA</div>

        <div class="meta-row">
          <span>Dolazak / odlazak</span>
          <strong>
            ${esc(
              `${order.arrivalTime || '—'} – ${
                order.departureTime || '—'
              }`,
            )}
          </strong>
        </div>

        <div class="meta-row">
          <span>Trajanje</span>
          <strong>${esc(durationLabel(order))}</strong>
        </div>

        <div class="meta-row">
          <span>Status</span>
          <strong>${esc(order.status || '—')}</strong>
        </div>

        <div class="meta-row">
          <span>Prioritet</span>
          <strong>${esc(order.priority || '—')}</strong>
        </div>

        <div class="meta-row">
          <span>Izvršitelji</span>
          <strong>${esc(workers)}</strong>
        </div>
      </article>
    </section>
  `
}

function sectionTitle(
  label: string,
  appearance: DocumentAppearance,
) {
  return `
    <div class="section-heading section-${esc(
      appearance.sectionStyle,
    )}">
      <span>${esc(label)}</span>
    </div>
  `
}

function descriptionHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  return `
    <section>
      ${sectionTitle(
        branding.customDescriptionLabel || 'Opis radova',
        appearance,
      )}

      <div class="description-block">
        ${
          order.title
            ? `<div class="work-title">${esc(order.title)}</div>`
            : ''
        }
        <div class="work-description">
          ${
            order.description
              ? multi(order.description)
              : 'Nema dodatnog opisa radova.'
          }
        </div>
      </div>
    </section>
  `
}

function materialsHtml(
  materials: WorkOrderMaterial[],
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  if (!materials.length) return ''

  return `
    <section>
      ${sectionTitle(
        branding.customMaterialsLabel || 'Utrošeni materijal',
        appearance,
      )}

      <div class="materials table-${esc(appearance.tableStyle)}">
        ${materials
          .map(
            (material, index) => `
              <article class="material-row">
                <div class="material-index">
                  ${String(index + 1).padStart(2, '0')}
                </div>

                <div class="material-main">
                  <div class="material-name">
                    ${esc(material.name)}
                  </div>
                </div>

                <div class="material-data">
                  <small>Količina</small>
                  ${number(material.quantity)} ${esc(material.unit)}
                </div>

                <div class="material-data">
                  <small>Jed. cijena</small>
                  ${money(material.unitPrice)}
                </div>

                <div class="material-data material-total">
                  <small>Ukupno</small>
                  ${money(materialTotal(material))}
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function totalsHtml(order: WorkOrder) {
  const value = totals(order)

  const hasPrices =
    value.material !== 0 ||
    value.labour !== 0 ||
    value.vat !== 0 ||
    value.total !== 0 ||
    Boolean(order.priceNote)

  if (!hasPrices) return ''

  return `
    <section class="totals-section">
      <div class="price-note">
        ${order.priceNote ? multi(order.priceNote) : ''}
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Materijal</span>
          <strong>${money(value.material)}</strong>
        </div>

        <div class="total-row">
          <span>Rad</span>
          <strong>${money(value.labour)}</strong>
        </div>

        <div class="total-row">
          <span>PDV ${number(order.vatRate)}%</span>
          <strong>${money(value.vat)}</strong>
        </div>

        <div class="total-row grand">
          <span>UKUPNO</span>
          <span>${money(value.total)}</span>
        </div>
      </div>
    </section>
  `
}

function photosHtml(
  photos: WorkOrderImage[],
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  if (!photos.length) return ''

  return `
    <section>
      ${sectionTitle(
        branding.customPhotosLabel || 'Fotografije',
        appearance,
      )}

      <div class="photo-grid photos-${Math.min(photos.length, 4)}">
        ${photos
          .map(
            (photo) => `
              <figure class="photo-card">
                <img
                  src="${esc(photo.dataUrl)}"
                  alt="${esc(photo.name)}"
                />
                ${
                  photo.name
                    ? `<figcaption>${esc(photo.name)}</figcaption>`
                    : ''
                }
              </figure>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function signatureHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  if (!appearance.showSignature) return ''

  const stamp =
    appearance.showStamp &&
    branding.showStamp &&
    branding.stamp
      ? `<img class="stamp-image" src="${esc(
          branding.stamp,
        )}" alt="Pečat tvrtke" />`
      : ''

  const investorSignature =
    order.investorSignature
      ? `<img class="signature-image" src="${esc(
          order.investorSignature,
        )}" alt="Potpis investitora" />`
      : ''

  return `
    <section class="signature-section">
      ${sectionTitle(
        branding.customSignatureLabel || 'Potpis i ovjera',
        appearance,
      )}

      <div class="signature-grid">
        <div class="signature-column executor-signature-column">
          <div class="signature-label">
            Izvršitelj / odgovorna osoba
          </div>

          <div class="signature-space executor-signature-space">
            ${stamp}
          </div>

          <div class="signature-line">
            ${esc(
              order.assignedWorkers[0] ||
                branding.companyName ||
                '—',
            )}
          </div>
        </div>

        <div class="signature-column investor-signature-column">
          <div class="signature-label">
            Investitor / naručitelj
          </div>

          <div class="signature-space">
            ${investorSignature}
          </div>

          <div class="signature-line">
            ${esc(
              order.investorName ||
                order.customerName ||
                'Potpis investitora',
            )}
          </div>
        </div>
      </div>
    </section>
  `
}

function footerHtml(
  order: WorkOrder,
  appearance: DocumentAppearance,
  page: number,
  totalPages: number,
) {
  if (!appearance.showFooter) return ''

  const footerText = /fersys/i.test(
    appearance.footerText || '',
  )
    ? ''
    : appearance.footerText

  return `
    <footer class="footer">
      <span>${esc(footerText)}</span>
      <span>${esc(order.orderNumber)} · ${page}/${totalPages}</span>
    </footer>
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
      ${esc(appearance.watermarkText)}
    </div>
  `
}

function paginate(
  order: WorkOrder,
  appearance: DocumentAppearance,
): PdfPage[] {
  const compact = appearance.density === 'compact'
  const firstMaterialLimit = compact ? 8 : 6
  const nextMaterialLimit = compact ? 13 : 10

  const pages: PdfPage[] = []

  const firstMaterials = order.materials.slice(
    0,
    firstMaterialLimit,
  )

  let materialIndex = firstMaterials.length

  const showPhotosOnFirst =
    order.images.length > 0 &&
    firstMaterials.length <= 2 &&
    order.description.length < 500

  const firstPhotos = showPhotosOnFirst
    ? order.images.slice(0, 2)
    : []

  let photoIndex = firstPhotos.length

  pages.push({
    materials: firstMaterials,
    photos: firstPhotos,
    first: true,
    last: false,
    showTotals: false,
  })

  while (materialIndex < order.materials.length) {
    const materials = order.materials.slice(
      materialIndex,
      materialIndex + nextMaterialLimit,
    )

    materialIndex += materials.length

    pages.push({
      materials,
      photos: [],
      first: false,
      last: false,
      showTotals: false,
    })
  }

  while (photoIndex < order.images.length) {
    const photos = order.images.slice(
      photoIndex,
      photoIndex + 4,
    )

    photoIndex += photos.length

    pages.push({
      materials: [],
      photos,
      first: false,
      last: false,
      showTotals: false,
    })
  }

  const last = pages[pages.length - 1]

  const lastTooBusy =
    last.photos.length >= 3 ||
    last.materials.length >=
      (compact ? 11 : 8)

  if (lastTooBusy) {
    pages.push({
      materials: [],
      photos: [],
      first: false,
      last: true,
      showTotals: true,
    })
  } else {
    last.showTotals = true
    last.last = true
  }

  pages.forEach((page, index) => {
    page.last = index === pages.length - 1
  })

  return pages
}

function css(
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const primary =
    appearance.primaryColor || branding.primaryColor || '#2563EB'
  const text =
    appearance.textColor || branding.textColor || '#0F172A'
  const border =
    appearance.borderColor || branding.borderColor || '#CBD5E1'
  const background =
    appearance.backgroundColor || branding.backgroundColor || '#FFFFFF'
  const compact = appearance.density === 'compact'

  return `
    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: #dfe5ec;
      color: ${text};
      font-family:
        Inter, -apple-system, BlinkMacSystemFont,
        "Segoe UI", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pdf-page {
      position: relative;
      display: flex;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      flex-direction: column;
      background: ${background};
      page-break-after: always;
    }

    .page-inner {
      position: relative;
      z-index: 2;
      display: flex;
      min-height: 0;
      height: 100%;
      flex-direction: column;
      padding: ${
        compact ? '39px 43px 34px' : '43px 47px 36px'
      };
    }

    ${
      branding.showBackgroundImage && branding.backgroundImage
        ? `
          .pdf-page::before {
            position: absolute;
            inset: 0;
            z-index: 0;
            background:
              url("${esc(branding.backgroundImage)}")
              center / cover no-repeat;
            opacity: .035;
            content: "";
          }
        `
        : ''
    }

    .watermark {
      position: absolute;
      left: 50%;
      top: 55%;
      z-index: 0;
      transform: translate(-50%, -50%) rotate(-31deg);
      color: ${primary};
      font-size: 68px;
      font-weight: 950;
      letter-spacing: .06em;
      opacity: .032;
      white-space: nowrap;
      pointer-events: none;
    }

    .document-header {
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        ${compact ? '210px' : '230px'};
      gap: ${compact ? 22 : 28}px;
      align-items: start;
      padding-bottom: ${compact ? 14 : 17}px;
      border-bottom: 3px solid ${primary};
    }

    .header-center {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
    }

    .header-center .company { justify-content: center; }
    .header-center .document-heading { text-align: center; }

    .header-right {
      grid-template-columns:
        ${compact ? '210px' : '230px'}
        minmax(0,1fr);
    }

    .header-right .company {
      order: 2;
      justify-content: flex-end;
      text-align: right;
    }

    .header-right .document-heading {
      order: 1;
      text-align: left;
    }

    .company {
      display: flex;
      min-width: 0;
      align-items: flex-start;
      gap: 12px;
    }

    .company-logo {
      display: block;
      width: ${compact ? 60 : 68}px;
      height: ${compact ? 60 : 68}px;
      flex: 0 0 ${compact ? 60 : 68}px;
      object-fit: contain;
    }

    .company-copy { min-width: 0; }

    .company-name {
      color: ${text};
      font-size: ${compact ? 18 : 20}px;
      line-height: 1.08;
      font-weight: 950;
      letter-spacing: -.02em;
    }

    .company-details {
      margin-top: 8px;
      color: ${alpha(text, '98')};
      font-size: ${compact ? 7.2 : 7.8}px;
      line-height: 1.45;
    }

    .company-details div { margin-top: 1px; }

    .document-heading { text-align: right; }

    .continuation-label {
      margin-bottom: 3px;
      color: ${alpha(text, '82')};
      font-size: 6px;
      font-weight: 850;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .document-heading h1 {
      margin: 0;
      color: ${primary};
      font-size: ${compact ? 29 : 34}px;
      line-height: .98;
      font-weight: 950;
      letter-spacing: -.04em;
      text-transform: uppercase;
    }

    .document-number {
      margin-top: ${compact ? 9 : 11}px;
      color: ${text};
      font-size: ${compact ? 13 : 15}px;
      font-weight: 950;
    }

    .document-number span {
      margin-right: 5px;
      color: ${alpha(text, '85')};
      font-size: 7px;
      font-weight: 800;
    }

    .document-date {
      margin-top: 7px;
      color: ${alpha(text, '8A')};
      font-size: 7.5px;
      font-weight: 700;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${compact ? 16 : 20}px;
      margin-top: ${compact ? 13 : 16}px;
    }

    .info-grid.cards .info-block {
      padding: ${compact ? 10 : 12}px;
      border: 1px solid ${border};
      border-radius: 8px;
      background: ${alpha(background, 'F4')};
    }

    .info-grid.lines .info-block {
      padding: ${compact ? '4px 0 8px' : '5px 0 10px'};
      border-bottom: 1px solid ${border};
    }

    .info-title {
      margin-bottom: 7px;
      color: ${primary};
      font-size: ${compact ? 7.5 : 8.2}px;
      font-weight: 950;
      letter-spacing: .07em;
      text-transform: uppercase;
    }

    .investor-name {
      color: ${text};
      font-size: ${compact ? 10 : 11}px;
      font-weight: 950;
    }

    .info-lines {
      margin-top: 5px;
      color: ${alpha(text, 'B4')};
      font-size: ${compact ? 7.2 : 7.8}px;
      line-height: 1.42;
    }

    .meta-row {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      gap: 14px;
      padding: 3px 0;
      border-bottom: 1px solid ${alpha(border, '80')};
      font-size: ${compact ? 7.1 : 7.6}px;
    }

    .meta-row:last-child { border-bottom: 0; }
    .meta-row span { color: ${alpha(text, '88')}; }
    .meta-row strong { color: ${text}; text-align: right; }

    .section-heading {
      margin:
        ${compact ? 10 : 13}px
        0
        ${compact ? 5 : 7}px;
      color: ${text};
      font-size: ${compact ? 8.1 : 8.8}px;
      font-weight: 950;
      letter-spacing: .035em;
      text-transform: uppercase;
    }

    .section-bar {
      border-radius: 5px;
      padding: 6px 8px;
      background: ${primary};
      color: white;
    }

    .section-line {
      border-bottom: 1px solid ${primary};
      padding-bottom: 5px;
      color: ${primary};
    }

    .section-plain { color: ${text}; }

    .description-block {
      padding: ${compact ? '8px 9px' : '10px 11px'};
      border-left: 2px solid ${primary};
      background: ${alpha(primary, '0C')};
    }

    .work-title {
      color: ${text};
      font-size: ${compact ? 8.8 : 9.5}px;
      line-height: 1.3;
      font-weight: 950;
    }

    .work-description {
      margin-top: 3px;
      color: ${alpha(text, 'B0')};
      font-size: ${compact ? 7.2 : 7.8}px;
      line-height: ${compact ? 1.38 : 1.45};
      overflow-wrap: anywhere;
    }

    .materials { border-top: 1px solid ${border}; }

    .material-row {
      display: grid;
      grid-template-columns:
        28px minmax(0,1fr) 75px 92px 98px;
      min-height: ${compact ? 38 : 43}px;
      align-items: center;
      column-gap: ${compact ? 8 : 10}px;
      padding: ${compact ? '4px 0' : '5px 0'};
      border-bottom: 1px solid ${border};
      break-inside: avoid;
    }

    .material-index {
      color: ${primary};
      font-size: ${compact ? 7.6 : 8.4}px;
      font-weight: 950;
      text-align: center;
    }

    .material-main { min-width: 0; }

    .material-name {
      color: ${text};
      font-size: ${compact ? 7.8 : 8.5}px;
      line-height: 1.25;
      font-weight: 900;
    }

    .material-data {
      padding-left: 7px;
      border-left: 1px solid ${border};
      color: ${text};
      font-size: ${compact ? 7 : 7.6}px;
      text-align: right;
      white-space: nowrap;
    }

    .material-data small {
      display: block;
      margin-bottom: 2px;
      color: ${alpha(text, '78')};
      font-size: 5.6px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .material-total { font-weight: 950; }

    .table-solid.materials {
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 5px;
    }

    .table-solid .material-row {
      padding-left: 6px;
      padding-right: 6px;
    }

    .table-soft .material-row:nth-child(even) {
      background: ${alpha(primary, '09')};
    }

    .table-minimal.materials {
      border-top: 1px solid ${text};
    }

    .totals-section {
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        ${compact ? 240 : 260}px;
      gap: ${compact ? 18 : 22}px;
      margin-top: ${compact ? 11 : 14}px;
      align-items: start;
      break-inside: avoid;
    }

    .price-note {
      color: ${alpha(text, 'A2')};
      font-size: ${compact ? 7 : 7.5}px;
      line-height: 1.45;
    }

    .totals { width: 100%; }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: ${compact ? '4px 6px' : '5px 7px'};
      border-bottom: 1px solid ${border};
      color: ${text};
      font-size: ${compact ? 7.3 : 7.9}px;
    }

    .total-row span:first-child {
      color: ${alpha(text, '90')};
    }

    .total-row.grand {
      margin-top: 5px;
      border: 0;
      border-radius: 5px;
      padding: ${compact ? '8px 9px' : '9px 10px'};
      background: ${alpha(primary, '1A')};
      color: ${primary};
      font-size: ${compact ? 10.5 : 11.8}px;
      font-weight: 950;
    }

    .total-row.grand span:first-child {
      color: ${primary};
    }

    .photo-grid {
      display: grid;
      width: 100%;
      gap: ${compact ? 10 : 12}px;
      align-items: start;
    }

    .photos-1 {
      grid-template-columns: 1fr;
    }

    .photos-2,
    .photos-3,
    .photos-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .photo-card {
      width: 100%;
      margin: 0;
      overflow: hidden;
      border: 1px solid ${border};
      border-radius: 7px;
      background: #fff;
      break-inside: avoid;
    }

    .photos-1 .photo-card {
      width: 100%;
      max-width: none;
    }

    .photo-card img {
      display: block;
      width: 100%;
      height: ${compact ? 270 : 292}px;
      padding: 5px;
      object-fit: contain;
      object-position: center;
      background: #fff;
    }

    .photos-1 .photo-card img {
      height: ${compact ? 395 : 425}px;
    }

    .photos-2 .photo-card img {
      height: ${compact ? 300 : 325}px;
    }

    .photos-3 .photo-card img,
    .photos-4 .photo-card img {
      height: ${compact ? 250 : 270}px;
    }

    .photo-card figcaption {
      min-height: 20px;
      border-top: 1px solid ${border};
      padding: 5px 7px;
      color: ${alpha(text, '8C')};
      font-size: 6px;
      line-height: 1.25;
    }

    .signature-section {
      margin-top: ${compact ? 14 : 18}px;
      break-inside: avoid;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: ${compact ? 52 : 64}px;
      align-items: end;
    }

    .signature-column {
      min-width: 0;
    }

    .signature-label {
      margin-bottom: 5px;
      color: ${alpha(text, '8A')};
      font-size: 6.8px;
    }

    .signature-space {
      display: flex;
      height: ${compact ? 82 : 96}px;
      align-items: flex-end;
      justify-content: center;
    }

    .executor-signature-space {
      align-items: flex-end;
      justify-content: center;
      padding-left: 0;
    }

    .signature-image {
      display: block;
      width: auto;
      height: auto;
      max-width: 92%;
      max-height: ${compact ? 68 : 78}px;
      object-fit: contain;
      object-position: center bottom;
    }

    .signature-line {
      border-top: 1px solid ${text};
      padding-top: 5px;
      color: ${text};
      font-size: 7px;
      font-weight: 750;
    }

    .stamp-image {
      display: block;
      width: auto;
      height: auto;
      max-width: ${compact ? 190 : 210}px;
      max-height: ${compact ? 72 : 80}px;
      object-fit: contain;
      object-position: center bottom;
    }

    .footer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: end;
      margin-top: auto;
      border-top: 1px solid ${primary};
      padding-top: 6px;
      color: ${alpha(text, '7D')};
      font-size: 6.3px;
    }

    @media print {
      @page { size: A4; margin: 0; }

      html, body { background: white; }

      .pdf-page {
        margin: 0;
        box-shadow: none;
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
  return `
    <article
      class="pdf-page preset-${esc(appearance.preset)}"
      data-pdf-page
    >
      ${watermarkHtml(appearance)}

      <div class="page-inner">
        ${headerHtml(
          order,
          branding,
          appearance,
          !page.first,
        )}

        ${
          page.first
            ? infoHtml(order, appearance) +
              descriptionHtml(order, branding, appearance)
            : ''
        }

        ${materialsHtml(
          page.materials,
          branding,
          appearance,
        )}

        ${photosHtml(
          page.photos,
          branding,
          appearance,
        )}

        ${page.showTotals ? totalsHtml(order) : ''}

        ${
          page.last
            ? signatureHtml(order, branding, appearance)
            : ''
        }

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
  const pages = paginate(order, appearance)

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
      <style>${css(branding, appearance)}</style>

      ${pages
        .map((page, index) =>
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
  const images = Array.from(
    target.querySelectorAll('img'),
  )

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

async function buildPdfDocument(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const appearance = await resolveAppearance(branding)

  const wrapper = document.createElement('div')
  wrapper.innerHTML = buildDocument(
    order,
    branding,
    appearance,
  )

  const target =
    wrapper.firstElementChild as HTMLElement | null

  if (!target) {
    throw new Error(
      'PDF dokument nije moguće pripremiti.',
    )
  }

  document.body.appendChild(target)

  try {
    await document.fonts?.ready
    await waitForImages(target)

    const pages = Array.from(
      target.querySelectorAll('[data-pdf-page]'),
    ) as HTMLElement[]

    if (!pages.length) {
      throw new Error(
        'PDF nema stranica za prikaz.',
      )
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await html2canvas(pages[index], {
        scale: 3,
        backgroundColor:
          appearance.backgroundColor || '#ffffff',
        useCORS: true,
        logging: false,
        imageTimeout: 5000,
      })

      const image =
        canvas.toDataURL(
          'image/jpeg',
          0.94,
        )

      if (index > 0) doc.addPage()

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

export function buildWorkOrderPdfHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const appearance = legacyAppearance(branding)

  const hiddenDocument = buildDocument(
    order,
    branding,
    appearance,
  )

  const visibleDocument = hiddenDocument.replace(
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
    html, body {
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

export async function downloadWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const fileName =
    `${safeFileName(
      order.orderNumber ||
        'radni-nalog',
    )}.pdf`

  notifyDownloadPreparing(
    fileName,
  )

  try {
    const doc =
      await buildPdfDocument(
        order,
        branding,
      )

    const blob =
      doc.output(
        'blob',
      )

    saveBlobDownload(
      blob,
      fileName,
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? `PDF nije moguće izraditi: ${error.message}`
        : 'PDF nije moguće izraditi.'

    notifyDownloadError(
      message,
      fileName,
    )

    throw error
  }
}

export async function getWorkOrderPdfBlob(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc = await buildPdfDocument(order, branding)
  return doc.output('blob')
}

export async function getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const blob = await getWorkOrderPdfBlob(order, branding)
  return URL.createObjectURL(blob)
}