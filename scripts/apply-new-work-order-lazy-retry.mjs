import fs from 'node:fs'

const path = 'src/router/AppRouter.tsx'
let source = fs.readFileSync(path, 'utf8')

if (!source.includes("../utils/lazyWithRetry")) {
  const anchor = "import { WorkOrdersPage } from '../pages/WorkOrdersPage'"
  if (!source.includes(anchor)) throw new Error('WorkOrdersPage import anchor nije pronađen.')
  source = source.replace(
    anchor,
    `${anchor}\nimport { lazyWithRetry } from '../utils/lazyWithRetry'`,
  )
}

const oldBlock = `const NewWorkOrderPage = lazy(\n  () => import('../pages/NewWorkOrderPage').then((module) => ({ default: module.NewWorkOrderPage })),\n)`
const newBlock = `const NewWorkOrderPage = lazyWithRetry(\n  () => import('../pages/NewWorkOrderPage').then((module) => ({ default: module.NewWorkOrderPage })),\n  'NewWorkOrderPage',\n)`

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock)
} else if (!source.includes("'NewWorkOrderPage',")) {
  throw new Error('NewWorkOrderPage lazy blok nije pronađen.')
}

fs.writeFileSync(path, source)
console.log('NewWorkOrderPage sada koristi lazy retry zaštitu.')
