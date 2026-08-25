import fs from 'node:fs'

const normalizedFiles = [
  'src/pages/NewWorkOrderPage.tsx',
  'src/pages/EditWorkOrderPage.tsx',
  'src/services/workOrders.service.ts',
]

for (const file of normalizedFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const normalized = source.replace(/\r\n/g, '\n')
  if (normalized !== source) {
    fs.writeFileSync(file, normalized)
    console.log(`normalized ${file}`)
  }
}

await import('./apply-work-order-discounts.mjs')

{
  const file = 'src/services/workOrders.service.ts'
  let source = fs.readFileSync(file, 'utf8')
  source = source.replaceAll(
    '  discountRate: number\n',
    '  discountRate?: number\n',
  )
  source = source.replace(
    'clampPercent(input.discountRate)',
    'clampPercent(input.discountRate ?? 0)',
  )
  fs.writeFileSync(file, source)
  console.log(`patched compatibility ${file}`)
}

for (const file of [
  'src/pages/NewWorkOrderPage.tsx',
  'src/pages/EditWorkOrderPage.tsx',
]) {
  let source = fs.readFileSync(file, 'utf8')
  source = source.replace(
    '  const materialPrice =\n    pricing.materialPrice\n',
    '',
  )
  source = source.replace(
    '  const materialPrice = pricing.materialPrice\n',
    '',
  )
  fs.writeFileSync(file, source)
}
