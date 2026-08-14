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

function replaceExact(oldText, newText, label) {
  if (text.includes(newText)) {
    console.log(`• ${label}: već primijenjeno`)
    return
  }

  if (!text.includes(oldText)) {
    throw new Error(`Nije pronađen očekivani blok: ${label}`)
  }

  text = text.replace(oldText, newText)
  console.log(`✓ ${label}`)
}

try {
  // 1) PAGINACIJA
  const paginateStart = text.indexOf('function paginateOrder(')
  const layoutStart = text.indexOf('\nfunction layoutClass(', paginateStart)

  if (paginateStart < 0 || layoutStart < 0) {
    throw new Error('Nije pronađena paginateOrder funkcija.')
  }

  const newPaginate = `function paginateOrder(
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
      ? Math.min(
          3,
          order.images.length,
        )
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

  text =
    text.slice(0, paginateStart) +
    newPaginate +
    text.slice(layoutStart)

  console.log('✓ Paginacija: materijal / 3 slike / nastavak')

  // 2) MODERN / CLASSIC / MINIMAL
  const layoutClassStart = text.indexOf('function layoutClass(')
  const commonCssStart = text.indexOf('\nfunction commonCss(', layoutClassStart)

  if (layoutClassStart < 0 || commonCssStart < 0) {
    throw new Error('Nije pronađena layoutClass funkcija.')
  }

  const newLayoutClass = `function layoutClass(
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

  text =
    text.slice(0, layoutClassStart) +
    newLayoutClass +
    text.slice(commonCssStart)

  console.log('✓ Modern / Classic / Minimal preset')

  // 3) FINALNI CSS — važno: ${...} mora ostati literal unutar workOrderPdf.ts
  const printMarker = `    @media print {
      html,
      body {
        background: #fff;
      }
    }`

  const finalCss = String.raw`

    /* ==========================================================
       FERSYS RADNI NALOG — FINAL MODERN / CLASSIC / MINIMAL V2
       ========================================================== */

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

    .workorder-topline .logo-fallback {
      display: grid;
      place-items: center;
      min-width: 96px;
      border-radius: 12px;
    }

    .workorder-topline .company-copy {
      min-width: 0;
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
      border-left: 3px solid \${primary};
      text-align: right;
    }

    .workorder-topline .document-kicker {
      font-size: 9.5px;
      letter-spacing: .12em;
    }

    .workorder-topline .document-title {
      margin-top: 4px;
      font-size: 26px;
      line-height: 1;
    }

    .workorder-meta-strip {
      grid-template-columns:
        1.25fr
        1fr
        1.45fr
        1fr
        .9fr
        .55fr;
      margin-top: 12px;
      border-radius: 9px;
    }

    .workorder-meta-strip > div {
      padding: 8px 8px;
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
        minmax(0, 1fr)
        225px;
      gap: 10px;
      margin-bottom: 8px;
    }

    .workorder-investor,
    .workorder-workers {
      padding: 9px 11px;
      border-radius: 9px;
    }

    .eyebrow {
      font-size: 8.2px;
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

    .workorder-workers strong {
      margin-top: 5px;
      font-size: 9.8px;
      line-height: 1.3;
    }

    /* Kompaktniji opis da ostane više mjesta materijalu i slikama. */
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

    .photo-grid {
      gap: 8px;
    }

    .photo-grid.photo-count-1 {
      grid-template-columns: 1fr;
    }

    .photo-grid.photo-count-2 {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .photo-grid.photo-count-3 {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .photo-grid.photo-count-4 {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .photo-card {
      margin: 0;
      border-radius: 8px;
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

    .photo-name {
      padding: 4px 6px;
      font-size: 7.2px;
    }

    .signature-section {
      margin-top: auto;
      padding: 8px 40px 12px;
    }

    .signature-title {
      margin-bottom: 5px;
      font-size: 10px;
    }

    .signature-grid {
      gap: 52px;
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

    .signature-line strong {
      font-size: 9px;
    }

    .signature-line span {
      font-size: 7.5px;
    }

    .footer {
      margin: 0 40px 7px;
      font-size: 6.8px;
    }

    .layout-modern .document-heading {
      border-left-color: \${primary};
    }

    .layout-modern .workorder-meta-strip {
      border-color: \${primary};
      box-shadow: 0 4px 12px rgba(15,23,42,.04);
    }

    .layout-modern .workorder-investor,
    .layout-modern .workorder-workers,
    .layout-modern .description-box,
    .layout-modern .table-wrap {
      box-shadow: 0 3px 10px rgba(15,23,42,.035);
    }

    .layout-classic .workorder-header {
      margin-bottom: 8px;
      padding-top: 18px;
      padding-bottom: 14px;
      background: \${secondary};
    }

    .layout-classic .workorder-topline .document-heading {
      border-left-color: \${primary};
    }

    .layout-classic .workorder-topline .company-name,
    .layout-classic .workorder-topline .document-title {
      color: #fff;
    }

    .layout-classic .workorder-topline .company-details,
    .layout-classic .workorder-topline .document-kicker {
      color: #cbd5e1;
    }

    .layout-classic .workorder-meta-strip {
      border-color: rgba(255,255,255,.18);
      background: rgba(255,255,255,.08);
    }

    .layout-classic .workorder-meta-strip > div {
      border-color: rgba(255,255,255,.15);
    }

    .layout-classic .workorder-meta-strip span {
      color: #cbd5e1;
    }

    .layout-classic .workorder-meta-strip strong {
      color: #fff;
    }

    .layout-classic .workorder-investor,
    .layout-classic .workorder-workers,
    .layout-classic .description-box,
    .layout-classic .table-wrap {
      border-radius: 3px;
    }

    .layout-minimal .accent-line {
      height: 4px;
      background: \${primary};
    }

    .layout-minimal .workorder-topline .document-heading {
      border-left: 0;
      padding-left: 0;
    }

    .layout-minimal .workorder-meta-strip {
      border-color: #e2e8f0;
      box-shadow: none;
    }

    .layout-minimal .workorder-investor,
    .layout-minimal .workorder-workers,
    .layout-minimal .description-box,
    .layout-minimal .table-wrap {
      border-color: #e2e8f0;
      box-shadow: none;
      background: #fff;
    }

    .layout-minimal .section-title::before {
      width: 2px;
      background: \${primary};
    }

    .layout-minimal th {
      background: \${secondary};
    }

    .layout-minimal .grand-total {
      background: \${secondary};
      color: #fff;
    }

    /* ========================================================== */
`

  if (!text.includes('FERSYS RADNI NALOG — FINAL MODERN / CLASSIC / MINIMAL V2')) {
    const oldV1Start = text.indexOf('    /* ==========================================================\n       FERSYS RADNI NALOG — FINAL MODERN / CLASSIC / MINIMAL')
    if (oldV1Start >= 0) {
      const oldV1End = text.indexOf('    /* ========================================================== */', oldV1Start)
      if (oldV1End >= 0) {
        const end = oldV1End + '    /* ========================================================== */'.length
        text = text.slice(0, oldV1Start) + text.slice(end)
      }
    }

    if (!text.includes(printMarker)) {
      throw new Error('Nije pronađen @media print blok.')
    }

    text = text.replace(
      printMarker,
      finalCss + '\n' + printMarker,
    )
    console.log('✓ Finalni Work Order CSS V2')
  }

  // 4) photo-count klasa
  if (!text.includes('photo-grid photo-count-\${photos.length}')) {
    replaceExact(
`      <div class="photo-grid">
        \${items}
      </div>`,
`      <div class="photo-grid photo-count-\${photos.length}">
        \${items}
      </div>`,
      'Photo count grid',
    )
  } else {
    console.log('• Photo count grid: već postoji')
  }

  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(file, backup)

  fs.writeFileSync(
    file,
    eol === '\r\n'
      ? text.replace(/\n/g, '\r\n')
      : text,
    'utf8',
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
    error instanceof Error ? error.message : error,
  )
  process.exit(1)
}


