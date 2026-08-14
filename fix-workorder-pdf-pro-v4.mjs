import fs from 'node:fs'
import path from 'node:path'

const rel = 'src/utils/workOrderPdf.ts'
const file = path.join(process.cwd(), rel)

if (!fs.existsSync(file)) {
  throw new Error(`Nedostaje ${rel}`)
}

const original = fs.readFileSync(file, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let text = original.replace(/\r\n/g, '\n')

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = path.join(
  process.cwd(),
  '.fersys-workorder-pdf-pro-backup',
  stamp,
  rel,
)

function replaceRequired(oldText, newText, label) {
  if (text.includes(newText)) return
  if (!text.includes(oldText)) {
    throw new Error(`Nije pronađeno: ${label}`)
  }
  text = text.replace(oldText, newText)
}

/* 1) Paginacija: mali/normalni servisni nalozi s do 3 slike ostaju na jednom A4. */
const paginateStart = text.indexOf('function paginateOrder(')
const paginateEnd = text.indexOf('\nfunction layoutClass(', paginateStart)

if (paginateStart < 0 || paginateEnd < 0) {
  throw new Error('paginateOrder blok nije pronađen')
}

const paginateReplacement = `function paginateOrder(
  order: WorkOrder,
): LogicalPage[] {
  const pages: LogicalPage[] = []

  const firstMaterialLimit = 12
  const descriptionLength =
    (order.title || '').length +
    (order.description || '').length

  /*
   * Profesionalni servisni nalog:
   * - do 3 fotografije ostaju na 1. stranici kad sadržaj nije velik
   * - ne ostavljamo pola prazne A4 stranice samo zato što postoje fotografije
   */
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
`

text =
  text.slice(0, paginateStart) +
  paginateReplacement +
  text.slice(paginateEnd)

/* 2) Precizan PRO V4 CSS override na kraju commonCss-a, prije @media print. */
const printAnchor = `    @media print {
      html,
      body {
        background: #fff;
      }
    }`

const proCss = `    /* FERSYS WORK ORDER — PRO V4 */
    .workorder-header {
      padding: 20px 42px 11px;
    }

    .workorder-topline {
      gap: 30px;
    }

    .workorder-topline .company-wrap {
      max-width: 68%;
    }

    .workorder-topline .logo,
    .workorder-topline .logo-fallback {
      width: 58px;
      height: 58px;
      flex-basis: 58px;
    }

    .workorder-topline .company-name {
      margin-top: 1px;
      font-size: 20px;
    }

    .workorder-topline .company-details {
      margin-top: 5px;
      font-size: 9.2px;
      line-height: 1.38;
    }

    .workorder-topline .document-heading {
      min-width: 205px;
    }

    .workorder-topline .document-title {
      font-size: 25px;
    }

    .workorder-meta-strip {
      grid-template-columns:
        1.12fr
        .92fr
        1.32fr
        .88fr
        .82fr
        .58fr;
      margin-top: 14px;
      border-radius: 10px;
    }

    .workorder-meta-strip > div {
      min-height: 48px;
      padding: 9px 10px;
      border-bottom: 0;
    }

    .workorder-meta-strip > div:nth-child(3n) {
      border-right: 1px solid ${border};
    }

    .workorder-meta-strip > div:last-child {
      border-right: 0;
    }

    .workorder-meta-strip > div:nth-last-child(-n + 3) {
      border-bottom: 0;
    }

    .workorder-meta-strip span {
      font-size: 7.7px;
      line-height: 1.15;
    }

    .workorder-meta-strip strong {
      margin-top: 5px;
      font-size: 9.8px;
      line-height: 1.25;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .page-content {
      padding: 0 42px;
    }

    .workorder-info-strip {
      grid-template-columns:
        minmax(0, 1fr)
        210px;
      gap: 10px;
      margin-bottom: 9px;
    }

    .workorder-investor,
    .workorder-workers {
      padding: 8px 11px;
      border-radius: 9px;
    }

    .workorder-investor .customer-name {
      margin-top: 4px;
      font-size: 13px;
    }

    .workorder-inline-details {
      margin-top: 5px;
      font-size: 8.7px;
      line-height: 1.28;
    }

    .workorder-workers strong {
      margin-top: 5px;
      font-size: 9.3px;
    }

    .section {
      margin-top: 11px;
    }

    .section-title {
      margin-bottom: 6px;
      font-size: 11.8px;
    }

    .description-box {
      padding: 10px 12px 11px;
      border-radius: 9px;
    }

    .work-title {
      margin-bottom: 5px;
      font-size: 10.4px;
    }

    .normal-text {
      font-size: 9.35px;
      line-height: 1.38;
    }

    .table-wrap {
      border-radius: 8px;
    }

    table {
      font-size: 8.9px;
    }

    th {
      padding: 6px 7px;
      font-size: 7.8px;
    }

    td {
      padding: 5px 7px;
    }

    .totals-wrap {
      margin-top: 7px;
    }

    .totals {
      width: 245px;
    }

    .total-row {
      padding: 2.5px 3px;
      font-size: 8.5px;
    }

    .grand-total {
      padding: 7px 9px;
      font-size: 11px;
    }

    .photo-grid.first-page {
      margin-top: 2px;
      gap: 9px;
    }

    .photo-grid.first-page.photo-count-1 {
      grid-template-columns: 1fr;
    }

    .photo-grid.first-page.photo-count-1 .photo-card img {
      height: 230px;
    }

    .photo-grid.first-page.photo-count-2 {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .photo-grid.first-page.photo-count-2 .photo-card img {
      height: 165px;
    }

    .photo-grid.first-page.photo-count-3 {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .photo-grid.first-page.photo-count-3 .photo-card img {
      height: 142px;
    }

    .photo-grid.first-page .photo-name {
      padding: 5px 7px;
      font-size: 7.4px;
    }

    .signature-section {
      padding: 8px 42px 11px;
    }

    .signature-title {
      margin-bottom: 5px;
      font-size: 9.5px;
    }

    .signature-grid {
      gap: 55px;
    }

    .signature-space {
      height: 42px;
    }

    .signature-space img {
      max-width: 165px;
      max-height: 41px;
    }

    .signature-line {
      padding-top: 4px;
    }

    .footer {
      margin: 0 42px 7px;
      font-size: 6.6px;
    }

    .continuation-header {
      display: flex;
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
      width: 38px;
      height: 38px;
      flex-basis: 38px;
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

${printAnchor}`

replaceRequired(
  printAnchor,
  proCss,
  'PRO V4 CSS',
)

/* 3) photosHtml mora znati je li prva stranica. */
if (!text.includes('firstPage = false')) {
  replaceRequired(
`function photosHtml(
  photos:
    WorkOrderImage[],
  branding:
    WorkOrderBranding,
) {`,
`function photosHtml(
  photos:
    WorkOrderImage[],
  branding:
    WorkOrderBranding,
  firstPage = false,
) {`,
    'photosHtml firstPage argument',
  )
}

replaceRequired(
`      <div class="photo-grid">
        ${items}
      </div>`,
`      <div class="photo-grid ${
        firstPage
          ? 'first-page photo-count-' +
            photos.length
          : ''
      }">
        ${items}
      </div>`,
  'photosHtml responsive class',
)

replaceRequired(
`          ${photosHtml(
            page.photos,
            branding,
          )}`,
`          ${photosHtml(
            page.photos,
            branding,
            page.showInfo,
          )}`,
  'photosHtml page call',
)

/* 4) Na nastavnim stranicama više NE ponavljamo cijeli blok meta podataka. */
const pageHtmlStart =
  text.indexOf('function pageHtml(')
const pageHtmlEnd =
  text.indexOf(
    '\nfunction buildDocument(',
    pageHtmlStart,
  )

if (
  pageHtmlStart < 0 ||
  pageHtmlEnd < 0
) {
  throw new Error(
    'pageHtml blok nije pronađen',
  )
}

const pageHtmlReplacement = `function continuationHeaderHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
  pageNumber: number,
) {
  return \`
    <div class="accent-line"></div>

    <header class="continuation-header">
      <div class="continuation-brand">
        \${companyLogoHtml(branding)}

        <div class="continuation-company">
          \${escapeHtml(
            branding.companyName,
          )}
        </div>
      </div>

      <div class="continuation-document">
        <strong>
          RADNI NALOG
        </strong>

        <span>
          \${escapeHtml(
            order.orderNumber,
          )}
          · stranica
          \${pageNumber}
        </span>
      </div>
    </header>
  \`
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

  return \`
    <article
      class="pdf-page \${layoutClass(
        branding,
      )}"
      data-pdf-page
    >
      <div class="page-body">
        \${
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
          \${
            page.showInfo
              ? infoHtml(order)
              : \`
                <div class="continuation-note">
                  Nastavak dokumenta
                </div>
              \`
          }

          \${descriptionHtml(
            order,
            branding,
            page.showDescription,
          )}

          \${materialsHtml(
            page.materials,
            branding,
          )}

          \${totalsHtml(
            order,
            page.showTotals,
          )}

          \${photosHtml(
            page.photos,
            branding,
            firstPage,
          )}
        </main>

        \${signatureHtml(
          order,
          branding,
          page.showSignature,
        )}

        \${footerHtml(
          order,
          branding,
        )}
      </div>
    </article>
  \`
}
`

text =
  text.slice(0, pageHtmlStart) +
  pageHtmlReplacement +
  text.slice(pageHtmlEnd)

/* 5) Stabilniji render na telefonu, dovoljno oštar za A4. */
text = text.replace(
  '            scale: 2,',
  '            scale: 1.7,',
)

/* Backup + write */
fs.mkdirSync(
  path.dirname(backup),
  { recursive: true },
)
fs.copyFileSync(file, backup)

fs.writeFileSync(
  file,
  eol === '\r\n'
    ? text.replace(/\n/g, '\r\n')
    : text,
  'utf8',
)

console.log(
  '✓ FERSYS Work Order PDF PRO V4 primijenjen.',
)
console.log(
  '✓ Do 3 slike ostaju na prvoj A4 stranici kod normalnog servisnog naloga.',
)
console.log(
  '✓ Meta podaci su veći i čitljiviji.',
)
console.log(
  '✓ Nastavne stranice imaju samo kompaktan logo + RADNI NALOG header.',
)
console.log(
  '✓ Potpis i ovjera ostaju na zadnjoj relevantnoj stranici.',
)
console.log(
  'Sada pokreni: npm run build',
)
