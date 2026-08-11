import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

function root(start) {
  let current = start
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(current, 'package.json'))) return current
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  throw new Error('Ne mogu pronaći FERSYS projekt. Stavi file u FERSYS-WINDOWS/src.')
}

const ROOT = root(here)
const target = path.join(ROOT, 'src/utils/workOrderPdf.ts')

if (!fs.existsSync(target)) {
  throw new Error('Nedostaje src/utils/workOrderPdf.ts')
}

let source = fs.readFileSync(target, 'utf8')
const backupDir = path.join(
  ROOT,
  '.fersys-backup-workorder-spacing',
  new Date().toISOString().replace(/[:.]/g, '-'),
)
fs.mkdirSync(backupDir, { recursive: true })
fs.copyFileSync(target, path.join(backupDir, 'workOrderPdf.ts'))

function exact(from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Nisam pronašao očekivani dio: ${label}. NIŠTA nije spremljeno.`)
  }
  source = source.replace(from, to)
}

/*
  Cilj:
  - ne pokušavati nagurati previše sadržaja na 1. stranicu
  - standardna, čitljiva tipografija
  - više zraka između blokova
  - i dalje profesionalan A4 i automatski nastavak na sljedeću stranicu
*/

exact(
`  const firstMaterialLimit =
    order.images.length > 0
      ? 11
      : 14`,
`  const firstMaterialLimit =
    order.images.length > 0
      ? 7
      : 9`,
'broj materijala na prvoj stranici',
)

exact(
`        materialIndex + 20,`,
`        materialIndex + 16,`,
'broj materijala na nastavku',
)

exact(
`      padding: 34px 38px 28px;`,
`      padding: 42px 46px 34px;`,
'rubovi A4 stranice',
)

exact(
`      gap: 22px;
      align-items: start;
      padding-bottom: 13px;`,
`      gap: 28px;
      align-items: start;
      padding-bottom: 18px;`,
'razmak zaglavlja',
)

exact(
`      width: 62px;
      height: 48px;
      flex: 0 0 62px;`,
`      width: 72px;
      height: 56px;
      flex: 0 0 72px;`,
'veličina loga',
)

exact(
`      font-size: 22px;
      line-height: 1.05;`,
`      font-size: 24px;
      line-height: 1.1;`,
'naziv firme',
)

exact(
`      margin-top: 7px;
      color: var(--subtle);
      font-size: 9px;
      line-height: 1.35;`,
`      margin-top: 8px;
      color: var(--subtle);
      font-size: 10.5px;
      line-height: 1.5;`,
'podaci firme',
)

exact(
`      min-width: 245px;`,
`      min-width: 230px;`,
'širina naslova dokumenta',
)

exact(
`      font-size: 29px;
      line-height: .95;`,
`      font-size: 31px;
      line-height: 1;`,
'naslov radnog naloga',
)

exact(
`      margin-top: 15px;`,
`      margin-top: 19px;`,
'razmak osnovnih podataka',
)

exact(
`      min-height: 72px;
      padding: 10px 11px;`,
`      min-height: 84px;
      padding: 13px 14px;`,
'osnovna polja',
)

exact(
`      font-size: 9px;
      font-weight: 900;`,
`      font-size: 10px;
      font-weight: 900;`,
'oznake osnovnih polja',
)

exact(
`      margin-top: 8px;
      color: var(--navy);
      font-size: 11px;
      line-height: 1.35;`,
`      margin-top: 9px;
      color: var(--navy);
      font-size: 12.5px;
      line-height: 1.45;`,
'vrijednosti osnovnih polja',
)

exact(
`      gap: 10px;
      margin-top: 11px;`,
`      gap: 14px;
      margin-top: 15px;`,
'kontakt i evidencija razmak',
)

exact(
`      min-height: 99px;`,
`      min-height: 118px;`,
'kontakt i evidencija visina',
)

exact(
`      padding: 11px 12px;`,
`      padding: 14px 15px;`,
'kontakt i evidencija padding',
)

exact(
`      margin-bottom: 8px;
      color: var(--navy);
      font-size: 11px;`,
`      margin-bottom: 10px;
      color: var(--navy);
      font-size: 12px;`,
'naslovi kartica',
)

exact(
`      margin: 3px 0;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.4;`,
`      margin: 4px 0;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;`,
'tekst kartica',
)

exact(
`      margin-top: 12px;`,
`      margin-top: 16px;`,
'razmak sekcija',
)

exact(
`      margin-bottom: 6px;
      color: var(--navy);
      font-size: 13px;`,
`      margin-bottom: 9px;
      color: var(--navy);
      font-size: 14px;`,
'naslovi sekcija',
)

/* Dodatno povećanje tablice i opisa, ali samo ako postoje očekivani CSS blokovi. */
source = source
  .replaceAll('font-size: 8px;', 'font-size: 10px;')
  .replaceAll('font-size: 8.5px;', 'font-size: 10px;')
  .replaceAll('font-size: 9.5px;', 'font-size: 10.5px;')

/* Redovi tablice trebaju disati; ne diramo širine stupaca ni poslovnu logiku. */
source = source.replace(
  /(\.materials-table[\s\S]*?th[\s\S]*?padding:)\s*([^;]+);/,
  '$1 9px 8px;',
)
source = source.replace(
  /(\.materials-table[\s\S]*?td[\s\S]*?padding:)\s*([^;]+);/,
  '$1 8px 8px;',
)

fs.writeFileSync(target, source, 'utf8')

console.log('')
console.log('FERSYS — WORK ORDER READABLE FINAL')
console.log('===================================')
console.log('✅ Sadržaj više nije naguran.')
console.log('✅ Veći logo, naziv firme i podaci.')
console.log('✅ Veća osnovna polja, kontakt i evidencija rada.')
console.log('✅ Veći razmaci između sekcija.')
console.log('✅ Manje materijala na prvoj stranici; višak ide uredno na stranicu 2.')
console.log('✅ PDF logika, izračun vremena i download nisu uklonjeni.')
console.log('')
console.log('Backup:', backupDir)
console.log('')
console.log('Sada RUČNO pokreni: npm run build')
