import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const rel = 'src/utils/workOrderPdf.ts'
const file = path.join(root, rel)

if (!fs.existsSync(file)) {
  console.error(`Nedostaje ${rel}`)
  process.exit(1)
}

const original = fs.readFileSync(file, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let text = original.replace(/\r\n/g, '\n')

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = path.join(
  root,
  '.fersys-workorder-layout-backup',
  stamp,
  rel,
)

function replaceFunction(name, nextName, replacement) {
  const start = text.indexOf(`function ${name}(`)
  const end = text.indexOf(`\nfunction ${nextName}(`, start)
  if (start < 0 || end < 0) {
    throw new Error(`Ne mogu pronaći funkciju ${name}`)
  }
  text = text.slice(0, start) + replacement + text.slice(end)
}

function insertBeforeOnce(marker, block, uniqueMarker) {
  if (text.includes(uniqueMarker)) {
    console.log(`• ${uniqueMarker}: već postoji`)
    return
  }
  const idx = text.indexOf(marker)
  if (idx < 0) throw new Error(`Ne mogu pronaći marker za CSS`)
  text = text.slice(0, idx) + block + '\n' + text.slice(idx)
}

try {
  // 1) Paginacija
  replaceFunction(
    'paginateOrder',
    'layoutClass',
`function paginateOrder(
  order: WorkOrder,
): LogicalPage[] {
  const pages: LogicalPage[] = []

  const descriptionLength =
    (order.title || '').length +
    (order.description || '').length

  const canFitPhotosOnFirstPage =
    order.images.length > 0 &&
    order.materials.length <= 5 &&
    descriptionLength <= 850

  const firstPagePhotoCount =
    canFitPhotosOnFirstPage
      ? Math.min(3, order.images.length)
      : 0

  const firstMaterialLimit =
    firstPagePhotoCount > 0
      ? 5
      : descriptionLength > 1400
        ? 8
        : 11

  const firstMaterials =
    order.materials.slice(
      0,
      firstMaterialLimit,
    )

  const firstPageHasAllMaterials =
    firstMaterials.length ===
    order.materials.length

  const firstPageHasAllPhotos =
    firstPagePhotoCount ===
    order.images.length

  pages.push({
    materials: firstMaterials,
    photos:
      order.images.slice(
        0,
        firstPagePhotoCount,
      ),
    showInfo: true,
    showDescription: true,
    showTotals:
      firstPageHasAllMaterials,
    showSignature:
      firstPageHasAllMaterials &&
      firstPageHasAllPhotos,
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
        materialIndex + 18,
      )

    materialIndex +=
      materials.length

    const isLastMaterialPage =
      materialIndex >=
      order.materials.length

    const hasRemainingPhotos =
      order.images.length >
      firstPagePhotoCount

    pages.push({
      materials,
      photos: [],
      showInfo: false,
      showDescription: false,
      showTotals:
        isLastMaterialPage,
      showSignature:
        isLastMaterialPage &&
        !hasRemainingPhotos,
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
  )
  console.log('✓ Paginacija')

  // 2) Layout class
  replaceFunction(
    'layoutClass',
    'commonCss',
`function layoutClass(
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
`
  )
  console.log('✓ Modern / Classic / Minimal')

  // 3) Ako renderPhotoSection još nema photo-count klasu, dodaj je tolerantno.
  if (!text.includes('photo-grid photo-count-${photos.length}')) {
    const photoGridRegex = /<div class="photo-grid">\s*\$\{items\}\s*<\/div>/
    if (photoGridRegex.test(text)) {
      text = text.replace(
        photoGridRegex,
        '<div class="photo-grid photo-count-${photos.length}">\\n        ${items}\\n      </div>'
      )
      console.log('✓ Photo count grid')
    } else {
      console.log('• Photo count grid: preskočeno (nije potreban ili je već drugačije implementiran)')
    }
  } else {
    console.log('• Photo count grid: već postoji')
  }

  // 4) Završni CSS — literalno, bez evaluacije ${primary}
  const printMarker = `    @media print {
      html,
      body {
        background: #fff;
      }
    }`

  const finalCss = String.raw`
    /* FERSYS WORKORDER FINAL V3 */

    .workorder-header {
      padding: 22px 40px 12px;
    }

    .workorder-topline {
      gap: 20px;
      align-items: center;
    }

    .workorder-topline .company-wrap {
      display: grid;
      grid-template-columns:
        minmax(96px, 132px)
        minmax(0, 1fr);
      gap: 16px;
      align-items: center;
      max-width: calc(100% - 230px);
    }

    .workorder-topline .logo,
    .workorder-topline .logo-fallback {
      width: 100%;
      max-width: 132px;
      height: 78px;
      max-height: 78px;
      flex-basis: auto;
      object-fit: contain;
      object-position: left center;
    }

    .workorder-topline .company-name {
      font-size: 20px;
      line-height: 1.08;
    }

    .workorder-topline .company-details {
      margin-top: 5px;
      font-size: 9.8px;
      line-height: 1.42;
    }

    .workorder-topline .document-heading {
      flex: 0 0 210px;
      min-width: 210px;
      padding-left: 18px;
      border-left: 3px solid ${primary};
      text-align: right;
    }

    .workorder-topline .document-title {
      margin-top: 4px;
      font-size: 26px;
      line-height: 1;
    }

    .workorder-meta-strip {
      grid-template-columns:
        1.25fr 1fr 1.45fr 1fr .9fr .55fr;
      margin-top: 12px;
      border-radius: 9px;
    }

    .workorder-meta-strip > div {
      padding: 8px;
    }

    .workorder-meta-strip span {
      font-size: 7.4px;
      line-height: 1.18;
    }

    .workorder-meta-strip strong {
      margin-top: 3px;
      font-size: 9.7px;
      line-height: 1.2;
    }

    .page-content {
      padding: 0 40px;
    }

    .workorder-info-strip {
      grid-template-columns:
        minmax(0, 1fr) 225px;
      gap: 10px;
      margin-bottom: 8px;
    }

    .workorder-investor,
    .workorder-workers {
      padding: 9px 11px;
      border-radius: 9px;
    }

    .workorder-investor .customer-name {
      margin-top: 3px;
      font-size: 13.5px;
    }

    .workorder-inline-details {
      margin-top: 4px;
      font-size: 8.9px;
      line-height: 1.3;
    }

    .section {
      margin-top: 8px;
    }

    .section-title {
      margin-bottom: 4px;
      font-size: 11.8px;
    }

    .section-title::before {
      width: 3px;
      height: 15px;
    }

    .description-box {
      min-height: 0;
      padding: 7px 9px;
      border-radius: 8px;
    }

    .work-title {
      margin-bottom: 2px;
      font-size: 10.5px;
    }

    .normal-text {
      font-size: 9.6px;
      line-height: 1.27;
    }

    table {
      font-size: 9px;
    }

    th {
      padding: 5px 6px;
      font-size: 8px;
    }

    td {
      padding: 4.5px 6px;
    }

    .totals-wrap {
      margin-top: 6px;
    }

    .totals {
      width: 245px;
    }

    .total-row {
      padding: 2.5px 3px;
      font-size: 8.8px;
    }

    .grand-total {
      padding: 7px 9px;
      font-size: 11.5px;
    }

    .photo-grid.photo-count-1 {
      grid-template-columns: 1fr;
    }

    .photo-grid.photo-count-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .photo-grid.photo-count-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .photo-grid.photo-count-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .photo-card img {
      width: 100%;
      object-fit: cover;
      background: #fff;
    }

    .photo-grid.photo-count-1 .photo-card img {
      height: 245px;
    }

    .photo-grid.photo-count-2 .photo-card img {
      height: 155px;
    }

    .photo-grid.photo-count-3 .photo-card img {
      height: 125px;
    }

    .photo-grid.photo-count-4 .photo-card img {
      height: 185px;
    }

    .signature-section {
      margin-top: auto;
      padding: 8px 40px 12px;
    }

    .signature-space {
      height: 60px;
    }

    .signature-space img {
      display: block;
      width: auto;
      height: auto;
      max-width: 155px;
      max-height: 58px;
      margin: 0 auto;
      object-fit: contain;
      mix-blend-mode: multiply;
      filter: contrast(1.08);
      background: transparent;
    }

    .footer {
      margin: 0 40px 7px;
      font-size: 6.8px;
    }

    .layout-classic .workorder-header {
      margin-bottom: 8px;
      padding-top: 18px;
      padding-bottom: 14px;
      background: ${secondary};
    }

    .layout-classic .workorder-topline .company-name,
    .layout-classic .workorder-topline .document-title {
      color: #fff;
    }

    .layout-classic .workorder-topline .company-details,
    .layout-classic .workorder-topline .document-kicker {
      color: #cbd5e1;
    }

    .layout-minimal .accent-line {
      height: 4px;
      background: ${primary};
    }

    .layout-minimal .workorder-topline .document-heading {
      border-left: 0;
      padding-left: 0;
    }

    .layout-minimal .workorder-investor,
    .layout-minimal .workorder-workers,
    .layout-minimal .description-box,
    .layout-minimal .table-wrap {
      box-shadow: none;
      background: #fff;
    }
`

  // Remove older final blocks to avoid stacking overrides.
  text = text.replace(
    /\n\s*\/\* FERSYS WORKORDER FINAL V3 \*\/[\s\S]*?(?=\n\s*@media print \{)/,
    '\n'
  )
  text = text.replace(
    /\n\s*\/\* ==========================================================\n\s*FERSYS RADNI NALOG — FINAL MODERN \/ CLASSIC \/ MINIMAL[\s\S]*?\/\* ========================================================== \*\/\n?/,
    '\n'
  )

  insertBeforeOnce(
    printMarker,
    finalCss,
    'FERSYS WORKORDER FINAL V3'
  )
  console.log('✓ Finalni CSS V3')

  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(file, backup)

  fs.writeFileSync(
    file,
    eol === '\r\n'
      ? text.replace(/\n/g, '\r\n')
      : text,
    'utf8'
  )

  console.log('')
  console.log('GOTOVO')
  console.log('Promijenjen je samo src/utils/workOrderPdf.ts')
  console.log('Ponude i računi nisu dirani.')
  console.log(`Backup: ${backup}`)
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error(
    'PATCH ZAUSTAVLJEN:',
    error instanceof Error ? error.message : error
  )
  process.exit(1)
}
