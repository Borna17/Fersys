import fs from 'node:fs'

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source
  const index = source.indexOf(search)
  if (index < 0) {
    throw new Error(`Output patch nije pronašao očekivani blok: ${label}`)
  }
  return source.slice(0, index) + replacement + source.slice(index + search.length)
}

function patchDetails(source) {
  source = replaceOnce(
    source,
    "import {\n  downloadWorkOrderPdf,\n} from '../utils/workOrderPdf'\n",
    "import {\n  downloadWorkOrderPdf,\n} from '../utils/workOrderPdf'\nimport {\n  calculateWorkOrderPricing,\n  materialLineTotal,\n} from '../utils/workOrderPricing'\n",
    'details/import pricing',
  )

  source = replaceOnce(
    source,
    "  const vatValue =\n    order.totalPrice -\n    order.materialPrice -\n    order.labourPrice\n",
    "  const pricing =\n    calculateWorkOrderPricing({\n      materials: order.materials,\n      labourPrice: order.labourPrice,\n      discountRate: order.discountRate ?? 0,\n      vatRate: order.vatRate,\n    })\n",
    'details/pricing',
  )

  source = replaceOnce(
    source,
    "                              {material.quantity}{' '}\n                              {material.unit}\n                              {canViewPrices\n                                ? ` × ${money(\n                                    material.unitPrice,\n                                  )}`\n                                : ''}\n",
    "                              {material.quantity}{' '}\n                              {material.unit}\n                              {canViewPrices\n                                ? ` × ${money(\n                                    material.unitPrice,\n                                  )}`\n                                : ''}\n                              {canViewPrices &&\n                              (material.discountRate ?? 0) > 0\n                                ? ` · Popust ${material.discountRate}%`\n                                : ''}\n",
    'details/material discount label',
  )

  source = replaceOnce(
    source,
    "                              {money(\n                                material.quantity *\n                                  material.unitPrice,\n                              )}\n",
    "                              {money(\n                                materialLineTotal(material),\n                              )}\n",
    'details/material discounted total',
  )

  source = replaceOnce(
    source,
    "                          order.materialPrice,\n",
    "                          pricing.materialPrice,\n",
    'details/material summary',
  )

  source = replaceOnce(
    source,
    "                <Row\n                  label={`PDV ${order.vatRate}%`}\n                  value={\n                    canViewPrices\n                      ? money(vatValue)\n                      : 'Skriveno'\n                  }\n                />\n\n                <div className=\"border-t border-slate-700 pt-4\">\n",
    `                {canViewPrices && (\n                  <>\n                    <Row\n                      label=\"Međuzbroj\"\n                      value={money(pricing.subtotalBeforeDiscount)}\n                    />\n\n                    {pricing.discountRate > 0 && (\n                      <Row\n                        label={\\`Popust na cijeli posao ${pricing.discountRate}%\\`}\n                        value={\\`-${money(pricing.discountAmount)}\\`}\n                      />\n                    )}\n\n                    <Row\n                      label=\"Osnovica bez PDV-a\"\n                      value={money(pricing.taxableBase)}\n                    />\n                  </>\n                )}\n\n                <Row\n                  label={\\`PDV ${order.vatRate}%\\`}\n                  value={\n                    canViewPrices\n                      ? money(pricing.vatAmount)\n                      : 'Skriveno'\n                  }\n                />\n\n                <div className=\"border-t border-slate-700 pt-4\">\n`,
    'details/financial breakdown',
  )

  source = replaceOnce(
    source,
    "                            order.totalPrice,\n",
    "                            pricing.totalPrice,\n",
    'details/total summary',
  )

  return source
}

function patchPdf(source) {
  source = replaceOnce(
    source,
    "import {\n  getDocumentAppearanceSettings,\n} from '../services/documentAppearance.service'\n",
    "import {\n  getDocumentAppearanceSettings,\n} from '../services/documentAppearance.service'\nimport {\n  calculateWorkOrderPricing,\n  materialLineTotal,\n} from './workOrderPricing'\n",
    'pdf/import pricing',
  )

  source = replaceOnce(
    source,
    "const materialTotal = (item: WorkOrderMaterial) =>\n  Number(item.quantity || 0) * Number(item.unitPrice || 0)\n\nfunction totals(order: WorkOrder) {\n  const materialRows = order.materials.reduce(\n    (sum, item) => sum + materialTotal(item),\n    0,\n  )\n\n  const material =\n    materialRows > 0\n      ? materialRows\n      : Number(order.materialPrice || 0)\n\n  const labour = Number(order.labourPrice || 0)\n  const base = material + labour\n  const vat = base * (Number(order.vatRate || 0) / 100)\n\n  const total =\n    Number(order.totalPrice || 0) > 0\n      ? Number(order.totalPrice)\n      : base + vat\n\n  return { material, labour, vat, total }\n}\n",
    "function totals(order: WorkOrder) {\n  return calculateWorkOrderPricing({\n    materials: order.materials,\n    labourPrice: order.labourPrice,\n    discountRate: order.discountRate ?? 0,\n    vatRate: order.vatRate,\n  })\n}\n",
    'pdf/central totals',
  )

  source = replaceOnce(
    source,
    "                <div class=\"material-data\">\n                  <small>Jed. cijena</small>\n                  ${money(material.unitPrice)}\n                </div>\n\n                <div class=\"material-data material-total\">\n                  <small>Ukupno</small>\n                  ${money(materialTotal(material))}\n                </div>\n",
    `                <div class=\"material-data\">\n                  <small>Jed. cijena</small>\n                  ${money(material.unitPrice)}\n                </div>\n\n                <div class=\"material-data\">\n                  <small>Popust</small>\n                  ${number(material.discountRate ?? 0)}%\n                </div>\n\n                <div class=\"material-data material-total\">\n                  <small>Ukupno</small>\n                  ${money(materialLineTotal(material))}\n                </div>\n`,
    'pdf/material discount column',
  )

  source = replaceOnce(
    source,
    "    value.material !== 0 ||\n    value.labour !== 0 ||\n    value.vat !== 0 ||\n    value.total !== 0 ||\n",
    "    value.materialPrice !== 0 ||\n    value.labourPrice !== 0 ||\n    value.vatAmount !== 0 ||\n    value.totalPrice !== 0 ||\n",
    'pdf/has prices',
  )

  source = replaceOnce(
    source,
    "          <strong>${money(value.material)}</strong>\n",
    "          <strong>${money(value.materialPrice)}</strong>\n",
    'pdf/material total',
  )

  source = replaceOnce(
    source,
    "          <strong>${money(value.labour)}</strong>\n        </div>\n\n        <div class=\"total-row\">\n          <span>PDV ${number(order.vatRate)}%</span>\n          <strong>${money(value.vat)}</strong>\n        </div>\n\n        <div class=\"total-row grand\">\n          <span>UKUPNO</span>\n          <span>${money(value.total)}</span>\n",
    `          <strong>${money(value.labourPrice)}</strong>\n        </div>\n\n        <div class=\"total-row\">\n          <span>Međuzbroj</span>\n          <strong>${money(value.subtotalBeforeDiscount)}</strong>\n        </div>\n\n        ${\n          value.discountRate > 0\n            ? \\`\n              <div class=\"total-row\">\n                <span>Popust ${number(value.discountRate)}%</span>\n                <strong>-${money(value.discountAmount)}</strong>\n              </div>\n            \\`\n            : ''\n        }\n\n        <div class=\"total-row\">\n          <span>Osnovica bez PDV-a</span>\n          <strong>${money(value.taxableBase)}</strong>\n        </div>\n\n        <div class=\"total-row\">\n          <span>PDV ${number(order.vatRate)}%</span>\n          <strong>${money(value.vatAmount)}</strong>\n        </div>\n\n        <div class=\"total-row grand\">\n          <span>UKUPNO S PDV-OM</span>\n          <span>${money(value.totalPrice)}</span>\n`,
    'pdf/totals breakdown',
  )

  source = replaceOnce(
    source,
    "        28px minmax(0,1fr) 75px 92px 98px;\n",
    "        28px minmax(0,1fr) 68px 82px 58px 88px;\n",
    'pdf/material grid css',
  )

  return source
}

for (const [file, patch] of [
  ['src/pages/WorkOrderDetailsPage.tsx', patchDetails],
  ['src/utils/workOrderPdf.ts', patchPdf],
]) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const patched = patch(source)
  fs.writeFileSync(file, patched)
  console.log(`patched ${file}`)
}
