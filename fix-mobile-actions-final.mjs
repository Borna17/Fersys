import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-mobile-actions-backup', stamp)

function load(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)
  const original = fs.readFileSync(file, 'utf8')
  return { rel, file, eol: original.includes('\r\n') ? '\r\n' : '\n', text: original.replace(/\r\n/g, '\n') }
}
function save(s) {
  const backup = path.join(backupRoot, s.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(s.file, backup)
  fs.writeFileSync(s.file, s.eol === '\r\n' ? s.text.replace(/\n/g, '\r\n') : s.text, 'utf8')
  console.log(`✓ ${s.rel}`)
}
function rep(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) throw new Error(`Nije pronađeno: ${label}`)
  return text.replace(oldText, newText)
}

function patchList(rel, color, route, label, conditional='') {
  const s = load(rel)
  const oldClass = `className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-${color}-600 text-white shadow-lg shadow-${color}-950/30 active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"`
  const newClass = `className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-${color}-600 px-5 text-white shadow-lg shadow-${color}-950/30 active:scale-95 sm:flex sm:gap-2"`
  s.text = rep(s.text, oldClass, newClass, `${rel} desktop create`)

  const anchor = `        </div>\n\n        <div className="relative mt-5 grid grid-cols-4 gap-2">`
  const condOpen = conditional ? `{${conditional} && (\n` : ''
  const condClose = conditional ? `        )}\n\n` : ''
  const button = `${condOpen}        <button
          type="button"
          onClick={() => navigate('${route}')}
          className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-${color}-600 px-5 text-sm font-black text-white shadow-lg shadow-${color}-950/30 active:scale-[0.99] sm:hidden"
        >
          <Plus size={20} />
          ${label}
        </button>
${condClose}        <div className="relative mt-5 grid grid-cols-4 gap-2">`
  s.text = rep(s.text, anchor, button, `${rel} mobile create`)
  save(s)
}

function patchWorkOrders() {
  patchList('src/pages/WorkOrdersPage.tsx','blue','/work-orders/new','Novi radni nalog','canManageWorkOrders')
}
function patchOffers() {
  const s = load('src/pages/OffersPage.tsx')
  const oldClass = 'className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"'
  const newClass = 'className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:gap-2"'
  s.text = rep(s.text, oldClass, newClass, 'offers desktop create')
  const anchor = `          </div>\n\n          <div className="relative mt-5 grid grid-cols-4 gap-2">`
  const ins = `          </div>

          <button
            type="button"
            onClick={() => navigate('/offers/new')}
            className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
          >
            <Plus size={20} />
            Nova ponuda
          </button>

          <div className="relative mt-5 grid grid-cols-4 gap-2">`
  s.text = rep(s.text, anchor, ins, 'offers mobile create')
  save(s)
}
function patchInvoices() {
  const s = load('src/pages/InvoicesPage.tsx')
  s.text = rep(s.text,
    'className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"',
    'className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:gap-2"',
    'invoices desktop create')
  const anchor = `        </div>\n\n        <div className="relative mt-5 grid grid-cols-4 gap-2">`
  const ins = `        </div>

        <button
          type="button"
          onClick={() => navigate('/invoices/new')}
          className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
        >
          <Plus size={20} />
          Novi račun
        </button>

        <div className="relative mt-5 grid grid-cols-4 gap-2">`
  s.text = rep(s.text, anchor, ins, 'invoices mobile create')
  s.text = s.text.replace(
    'className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"\n                          aria-label="Uredi račun"',
    'className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-3 text-xs font-black text-violet-200"\n                          aria-label="Uredi račun"'
  ).replace(
    '<Pencil\n                            size={17}\n                          />\n                        </button>',
    '<Pencil size={16} />\n                          Uredi\n                        </button>'
  )
  save(s)
}
function patchIncoming() {
  const s = load('src/pages/IncomingInvoicesPage.tsx')
  s.text = rep(s.text,
    'className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"',
    'className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:gap-2"',
    'incoming desktop create')
  const anchor = `          </div>\n\n          <div className="relative mt-5 grid grid-cols-4 gap-2">`
  const ins = `          </div>

          <button
            type="button"
            onClick={() => navigate('/incoming-invoices/new')}
            className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
          >
            <Plus size={20} />
            Novi ulazni račun
          </button>

          <div className="relative mt-5 grid grid-cols-4 gap-2">`
  s.text = rep(s.text, anchor, ins, 'incoming mobile create')
  s.text = s.text.replace(
    'className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"\n                          >\n                            <Pencil\n                              size={17}\n                            />',
    'className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-3 text-xs font-black text-violet-200"\n                          >\n                            <Pencil size={16} />\n                            Uredi'
  )
  save(s)
}
function patchDetails(rel, routePrefix, label, color, hasCondition) {
  const s = load(rel)
  const entity = routePrefix === '/offers' ? 'offer' : 'order'
  const tiny = routePrefix === '/offers'
    ? `              <button
                type="button"
                onClick={() =>
                  navigate(
                    \`/offers/\${offer.id}/edit\`,
                  )
                }
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white active:scale-95 sm:hidden"
                aria-label="Uredi ponudu"
              >
                <Pencil size={19} />
              </button>`
    : `                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        \`/work-orders/\${order.id}/edit\`,
                      )
                    }
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white active:scale-95 sm:hidden"
                    aria-label="Uredi nalog"
                  >
                    <Pencil size={19} />
                  </button>`
  s.text = rep(s.text, tiny, routePrefix === '/offers' ? '              <div className="sm:hidden" />' : '                  <div className="sm:hidden" />', `${rel} tiny edit`)
  const anchor = `            <div className="mt-4 hidden gap-3 sm:flex">`
  const conditionOpen = hasCondition ? `{canManageWorkOrders &&\n              canEditThisOrder && (\n` : ''
  const conditionClose = hasCondition ? `              )}\n\n` : ''
  const button = `${conditionOpen}            <button
              type="button"
              onClick={() =>
                navigate(
                  \`${routePrefix}/\${${entity}.id}/edit\`,
                )
              }
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-${color}-600 px-5 text-sm font-black text-white active:scale-[0.99] sm:hidden"
            >
              <Pencil size={18} />
              ${label}
            </button>
${conditionClose}            <div className="mt-4 hidden gap-3 sm:flex">`
  s.text = rep(s.text, anchor, button, `${rel} large edit`)
  save(s)
}
function patchSaveBar(rel) {
  const s = load(rel)
  s.text = rep(
    s.text,
    'className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"',
    'className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden"',
    `${rel} save bar`
  )
  s.text = s.text.replace('space-y-4 pb-24 sm:space-y-6 sm:pb-10','space-y-4 pb-44 sm:space-y-6 sm:pb-10')
  save(s)
}

try {
  patchWorkOrders()
  patchOffers()
  patchInvoices()
  patchIncoming()
  patchDetails('src/pages/OfferDetailsPage.tsx','/offers','Uredi ponudu','violet',false)
  patchDetails('src/pages/WorkOrderDetailsPage.tsx','/work-orders','Uredi radni nalog','blue',true)

  ;[
    'src/pages/NewWorkOrderPage.tsx',
    'src/pages/EditWorkOrderPage.tsx',
    'src/pages/NewOfferPage.tsx',
    'src/pages/NewInvoicePage.tsx',
    'src/pages/NewIncomingInvoicePage.tsx',
  ].forEach(patchSaveBar)

  console.log('✓ Mobile create/edit/save akcije su popravljene.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('✗', error instanceof Error ? error.message : error)
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}

