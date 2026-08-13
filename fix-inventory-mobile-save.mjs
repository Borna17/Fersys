import fs from 'node:fs'
import path from 'node:path'

const rel = 'src/pages/NewInventoryItemPage.tsx'
const file = path.join(process.cwd(), rel)

if (!fs.existsSync(file)) {
  console.error(`Nije pronađen ${rel}. Pokreni skriptu iz root FERSYS projekta.`)
  process.exit(1)
}

let text = fs.readFileSync(file, 'utf8')

const oldClass = 'className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"'
const newClass = 'className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden"'

if (text.includes(newClass)) {
  console.log('✓ Fix je već primijenjen.')
  process.exit(0)
}

if (!text.includes(oldClass)) {
  console.error('Nisam pronašao očekivani mobile Save bar. Datoteka se razlikuje od aktualnog GitHub main brancha.')
  process.exit(1)
}

text = text.replace(oldClass, newClass)

// Daj dovoljno prostora da zadnji sadržaj ne završi ispod Save bara + mobilne navigacije.
text = text.replace(
  'className="mx-auto w-full max-w-[1450px] space-y-4 pb-28 sm:space-y-6 sm:pb-12"',
  'className="mx-auto w-full max-w-[1450px] space-y-4 pb-44 sm:space-y-6 sm:pb-12"'
)

fs.writeFileSync(file, text, 'utf8')
console.log('✓ Popravljen mobile gumb "Spremi artikl".')
console.log('✓ Gumb je sada iznad donje FERSYS navigacije i ostaje vidljiv.')
console.log('Sada pokreni: npm run build')
