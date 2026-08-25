import fs from 'node:fs'

for (const file of [
  'src/pages/NewWorkOrderPage.tsx',
  'src/pages/EditWorkOrderPage.tsx',
]) {
  const source = fs.readFileSync(file, 'utf8')
  const normalized = source.replace(/\r\n/g, '\n')
  if (normalized !== source) {
    fs.writeFileSync(file, normalized)
    console.log(`normalized ${file}`)
  }
}

await import('./apply-work-order-discounts.mjs')
