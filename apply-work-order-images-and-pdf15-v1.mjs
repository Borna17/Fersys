import fs from 'node:fs'

const workOrdersPath = 'src/services/workOrders.service.ts'
const pdfPath = 'src/utils/workOrderPdf.ts'

function fail(message) {
  console.error(`\nGRESKA: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(workOrdersPath)) fail(`Ne postoji ${workOrdersPath}`)
if (!fs.existsSync(pdfPath)) fail(`Ne postoji ${pdfPath}`)

let workOrders = fs.readFileSync(workOrdersPath, 'utf8')
let pdf = fs.readFileSync(pdfPath, 'utf8')

// 1) Import hydratora fotografija.
if (!workOrders.includes("getWorkOrderImagesForDisplay")) {
  const anchor = "import { assertCanCreate } from '../subscription/subscription.service'"
  if (!workOrders.includes(anchor)) fail('Nije pronaden import assertCanCreate u workOrders.service.ts')
  workOrders = workOrders.replace(
    anchor,
    `${anchor}\nimport { getWorkOrderImagesForDisplay } from './workOrderImages.service'`,
  )
}

// 2) Ne spremamo signed URL-ove galerije natrag u work_orders.images.
// Zadrzavamo samo prave lokalne data URL slike (legacy + nove slike prije synca).
if (workOrders.includes('    images: input.images,')) {
  workOrders = workOrders.replace(
    '    images: input.images,',
    "    images: input.images.filter((image) => image.dataUrl.startsWith('data:')),",
  )
}

// 3) Nakon laganog RPC-a nadopuni nalog fotografijama iz Storagea/legacy fallbacka.
if (!workOrders.includes('const hydratedImages =')) {
  const re = /  const order =\s*\n\s*mapWorkOrder\(\s*\n\s*row as WorkOrderRow,\s*\n\s*\)\s*\n\s*\n  workOrderVersionById\.set\(\s*\n\s*workOrderId,\s*\n\s*order\.updatedAt,\s*\n\s*\)\s*\n\s*\n  return order/

  const replacement = `  const order =\n    mapWorkOrder(\n      row as WorkOrderRow,\n    )\n\n  const hydratedImages =\n    await getWorkOrderImagesForDisplay(\n      workOrderId,\n    )\n\n  const hydratedOrder: CloudWorkOrder = {\n    ...order,\n    images: hydratedImages,\n  }\n\n  workOrderVersionById.set(\n    workOrderId,\n    hydratedOrder.updatedAt,\n  )\n\n  return hydratedOrder`

  if (!re.test(workOrders)) {
    fail('Nije pronaden ocekivani getWorkOrderById blok za hydration fotografija')
  }
  workOrders = workOrders.replace(re, replacement)
}

// 4) PDF: nastavne stranice koriste do 15 materijala.
if (/const nextMaterialLimit = compact \? 13 : 10/.test(pdf)) {
  pdf = pdf.replace(
    /const nextMaterialLimit = compact \? 13 : 10/,
    'const nextMaterialLimit = 15',
  )
} else if (!pdf.includes('const nextMaterialLimit = 15')) {
  fail('Nije pronaden PDF nextMaterialLimit niti je vec postavljen na 15')
}

fs.writeFileSync(workOrdersPath, workOrders, 'utf8')
fs.writeFileSync(pdfPath, pdf, 'utf8')

const verifyWorkOrders = fs.readFileSync(workOrdersPath, 'utf8')
const verifyPdf = fs.readFileSync(pdfPath, 'utf8')

const checks = [
  [verifyWorkOrders.includes("import { getWorkOrderImagesForDisplay } from './workOrderImages.service'"), 'import hydratora fotografija'],
  [verifyWorkOrders.includes('const hydratedImages ='), 'hydration fotografija u getWorkOrderById'],
  [verifyWorkOrders.includes('images: hydratedImages'), 'slike spojene u radni nalog'],
  [verifyWorkOrders.includes("images: input.images.filter((image) => image.dataUrl.startsWith('data:'))"), 'signed URL se ne sprema natrag u work_orders'],
  [verifyPdf.includes('const nextMaterialLimit = 15'), 'PDF nastavna stranica = 15 materijala'],
  [!verifyPdf.includes('const nextMaterialLimit = compact ? 13 : 10'), 'stari PDF limit 10 je uklonjen'],
]

const failed = checks.filter(([ok]) => !ok)
if (failed.length) {
  for (const [, label] of failed) console.error(`NIJE POTVRDENO: ${label}`)
  process.exit(1)
}

console.log('\nPOTVRDENO: Radni nalog sada ucitava fotografije iz Storage galerije uz legacy fallback.')
console.log('POTVRDENO: Uredjivanje ne sprema privremene signed URL-ove natrag u work_orders.images.')
console.log('POTVRDENO: PDF nastavne stranice sada koriste maksimalno 15 stavki materijala.')
console.log('\nSljedeci korak: npm run build')
