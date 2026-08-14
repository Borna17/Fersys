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

/* 1) Paginacija */
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

/* 2) PRO V4.1 CSS override — bitno: \${border} ostaje literal za workOrderPdf.ts */
const printAnchor = `    @media print {
      html,
      body {
        background: #fff;
      }
    }`

const proCss = `    /* FERSYS WORK ORDER — PRO V4.1 */
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
      border-right: 1px solid \${border};
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

    .signature-section {
      padding: 8px 42px 11px;
    }

    .signature-title {
      margin-bottom: 5px;
      font-size: 9.5px;
    }

    .signature-space {
      height: 42px;
    }

    .signature-space img {
      max-width: 165px;
      max-height: 41px;
    }

    .continuation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 17px 42px 12px;
      border-bottom: 1px solid \${border};
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
      color: \${secondary};
      font-size: 15px;
      font-weight: 900;
    }

    .continuation-document {
      text-align: right;
    }

    .continuation-document strong {
      display: block;
      color: \${secondary};
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
  'PRO V4.1 CSS',
)

/* 3) photosHtml */
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
    'photosHtml argument',
  )
}

if (text.includes('<div class="photo-grid">')) {
  text = text.replace(
    `<div class="photo-grid">`,
    `<div class="photo-grid \${firstPage ? 'first-page photo-count-' + photos.length : ''}">`,
  )
}

/* 4) nastavne stranice - kompaktan header */
const pageStart = text.indexOf('function pageHtml(')
const pageEnd = text.indexOf('\nfunction buildDocument(', pageStart)

if (pageStart < 0 || pageEnd < 0) {
  throw new Error('pageHtml blok nije pronađen')
}

const pageReplacement = `function continuationHeaderHtml(
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
        <strong>RADNI NALOG</strong>
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
  text.slice(0, pageStart) +
  pageReplacement +
  text.slice(pageEnd)

text = text.replace(
  '            scale: 2,',
  '            scale: 1.7,',
)

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

console.log('✓ PRO V4.1 primijenjen.')
console.log('✓ Ispravljena border/secondary interpolation greška u patch skripti.')
console.log('Sada pokreni: npm run build')
