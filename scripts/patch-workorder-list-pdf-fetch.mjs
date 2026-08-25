import fs from 'node:fs'

const file = 'src/pages/WorkOrdersPage.tsx'
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')

const importOld = `  getWorkOrders,\n  redactWorkOrderPrices,`
const importNew = `  getWorkOrderById,\n  getWorkOrders,\n  redactWorkOrderPrices,`

if (!source.includes('getWorkOrderById,')) {
  if (!source.includes(importOld)) {
    throw new Error('Import blok nije pronađen.')
  }
  source = source.replace(importOld, importNew)
}

const functionOld = `  async function downloadPdf(\n    order: CloudWorkOrder,\n  ) {\n    try {\n      setDownloadingId(order.id)\n\n      const branding =\n        await getWorkOrderBrandingFromCompanySettings()\n\n      await downloadWorkOrderPdf(\n        canViewPrices\n          ? order\n          : redactWorkOrderPrices(\n              order,\n            ),\n        branding,\n      )`

const functionNew = `  async function downloadPdf(\n    order: CloudWorkOrder,\n  ) {\n    try {\n      setDownloadingId(order.id)\n\n      const fullOrder =\n        await getWorkOrderById(\n          order.id,\n        )\n\n      if (!fullOrder) {\n        throw new Error(\n          'Radni nalog nije pronađen.',\n        )\n      }\n\n      const branding =\n        await getWorkOrderBrandingFromCompanySettings()\n\n      await downloadWorkOrderPdf(\n        canViewPrices\n          ? fullOrder\n          : redactWorkOrderPrices(\n              fullOrder,\n            ),\n        branding,\n      )`

if (!source.includes('const fullOrder =')) {
  if (!source.includes(functionOld)) {
    throw new Error('downloadPdf blok nije pronađen.')
  }
  source = source.replace(functionOld, functionNew)
}

fs.writeFileSync(file, source)
console.log('patched WorkOrdersPage.tsx')
