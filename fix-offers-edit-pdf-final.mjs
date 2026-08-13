import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-offers-edit-pdf-backup', stamp)

function load(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)
  const original = fs.readFileSync(file, 'utf8')
  return {
    rel,
    file,
    eol: original.includes('\r\n') ? '\r\n' : '\n',
    text: original.replace(/\r\n/g, '\n'),
  }
}

function save(s) {
  const backup = path.join(backupRoot, s.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(s.file, backup)
  fs.writeFileSync(
    s.file,
    s.eol === '\r\n'
      ? s.text.replace(/\n/g, '\r\n')
      : s.text,
    'utf8',
  )
  console.log(`✓ ${s.rel}`)
}

function rep(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) {
    throw new Error(`Nije pronađeno: ${label}`)
  }
  return text.replace(oldText, newText)
}

function patchOfferDetails() {
  const s = load('src/pages/OfferDetailsPage.tsx')

  s.text = rep(
    s.text,
`  Clock3,
  FileText,`,
`  Clock3,
  Download,
  FileText,`,
    'Download icon',
  )

  if (!s.text.includes("from '../utils/offerPdf'")) {
    s.text = rep(
      s.text,
`import type {
  Offer,
  OfferItem,
  OfferStatus,
} from '../types/offers'`,
`import type {
  Offer,
  OfferItem,
  OfferStatus,
} from '../types/offers'
import {
  openOfferPdf,
} from '../utils/offerPdf'`,
      'openOfferPdf import',
    )
  }

  const mobileEdit = `            <button
              type="button"
              onClick={() =>
                navigate(
                  \`/offers/\${offer.id}/edit\`,
                )
              }
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white active:scale-[0.99] sm:hidden"
            >
              <Pencil size={18} />
              Uredi ponudu
            </button>`

  const mobileActions = `            <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    \`/offers/\${offer.id}/edit\`,
                  )
                }
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white active:scale-[0.99]"
              >
                <Pencil size={18} />
                Uredi
              </button>

              <button
                type="button"
                onClick={() =>
                  openOfferPdf(offer)
                }
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white active:scale-[0.99]"
              >
                <Download size={18} />
                PDF
              </button>
            </div>`

  s.text = rep(
    s.text,
    mobileEdit,
    mobileActions,
    'mobile edit/pdf actions',
  )

  const desktopEdit = `              <button
                type="button"
                onClick={() =>
                  navigate(
                    \`/offers/\${offer.id}/edit\`,
                  )
                }
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 font-black text-white"
              >
                <Pencil size={18} />
                Uredi ponudu
              </button>`

  const desktopActions = `${desktopEdit}

              <button
                type="button"
                onClick={() =>
                  openOfferPdf(offer)
                }
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
              >
                <Download size={18} />
                Preuzmi PDF
              </button>`

  s.text = rep(
    s.text,
    desktopEdit,
    desktopActions,
    'desktop PDF action',
  )

  save(s)
}

function patchOffersList() {
  const s = load('src/pages/OffersPage.tsx')

  if (!s.text.includes("from '../utils/offerPdf'")) {
    s.text = rep(
      s.text,
`import type {
  DatePreset,
  ExportMode,
  Offer,
  OfferItem,
  OfferStatus,
} from '../types/offers'`,
`import type {
  DatePreset,
  ExportMode,
  Offer,
  OfferItem,
  OfferStatus,
} from '../types/offers'
import {
  openOfferPdf,
} from '../utils/offerPdf'`,
      'OffersPage openOfferPdf import',
    )
  }

  // Ensure download icon is available.
  if (!s.text.includes('  Download,\n')) {
    s.text = rep(
      s.text,
`  CircleAlert,
  Download,`,
`  CircleAlert,
  Download,`,
      'Download icon already expected',
    )
  }

  // Add direct mobile actions before existing "Otvori" button when card action row is found.
  const openButton = `                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              \`/offers/\${offer.id}\`,
                            )
                          }
                          className="min-h-11 flex-1 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                        >
                          Otvori
                        </button>`

  const expandedButtons = `                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              \`/offers/\${offer.id}/edit\`,
                            )
                          }
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-3 text-xs font-black text-violet-200"
                        >
                          Uredi
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openOfferPdf(offer)
                          }
                          className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"
                          aria-label="PDF ponude"
                        >
                          <Download size={17} />
                        </button>

${openButton}`

  if (s.text.includes(openButton) && !s.text.includes('aria-label="PDF ponude"')) {
    s.text = s.text.replace(openButton, expandedButtons)
  }

  save(s)
}

try {
  console.log('FERSYS offers edit + PDF FINAL')
  console.log(`Backup: ${backupRoot}`)
  patchOfferDetails()
  patchOffersList()
  console.log('')
  console.log('✓ Postojeća ponuda se može otvoriti, urediti i ponovno otvoriti/preuzeti kao PDF.')
  console.log('✓ Mobile i desktop imaju jasne akcije.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error('✗', error instanceof Error ? error.message : error)
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}
