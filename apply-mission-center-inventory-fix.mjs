import fs from 'node:fs'

const path = 'src/services/missionCenter.service.ts'
let source = fs.readFileSync(path, 'utf8')

const oldImport = `import {\n  getInventoryItems,\n} from '../utils/inventoryStorage'`
const oldImportCrLf = `import {\r\n  getInventoryItems,\r\n} from '../utils/inventoryStorage'`
const newImport = `import {\n  getInventoryItems,\n} from './inventory.service'`

if (source.includes(oldImport)) {
  source = source.replace(oldImport, newImport)
} else if (source.includes(oldImportCrLf)) {
  source = source.replace(oldImportCrLf, newImport)
} else if (!source.includes("from './inventory.service'")) {
  throw new Error('Nije pronadjen stari inventoryStorage import u missionCenter.service.ts')
}

const oldCall = `const items =\n      getInventoryItems()`
const oldCallCrLf = `const items =\r\n      getInventoryItems()`
const newCall = `const items =\n      await getInventoryItems()`

if (source.includes(oldCall)) {
  source = source.replace(oldCall, newCall)
} else if (source.includes(oldCallCrLf)) {
  source = source.replace(oldCallCrLf, newCall)
} else if (!source.includes('await getInventoryItems()')) {
  throw new Error('Nije pronadjen getInventoryItems poziv u missionCenter.service.ts')
}

source = source.replace(
  /\/\*[\s\S]*?Skladište trenutno koristi[\s\S]*?isti izvor\.\s*\*\//,
  `/* Mission Center mora koristiti isti Supabase izvor kao prava stranica Skladište. */`,
)

fs.writeFileSync(path, source, 'utf8')

const verify = fs.readFileSync(path, 'utf8')
if (!verify.includes("from './inventory.service'")) {
  throw new Error('Provjera nije prosla: inventory.service import nedostaje')
}
if (!verify.includes('await getInventoryItems()')) {
  throw new Error('Provjera nije prosla: async inventory count nedostaje')
}
if (verify.includes("../utils/inventoryStorage")) {
  throw new Error('Provjera nije prosla: stari localStorage import je jos prisutan')
}

console.log('POTVRDENO: FERSYS Setup sada provjerava artikle iz istog Supabase skladista kao InventoryPage.')
console.log('POTVRDENO: getInventoryItemCount koristi await getInventoryItems().')
