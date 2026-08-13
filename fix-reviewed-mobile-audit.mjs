import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-mobile-audit-real-backup', stamp)

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
    s.eol === '\r\n' ? s.text.replace(/\n/g, '\r\n') : s.text,
    'utf8',
  )
  console.log(`✓ ${s.rel}`)
}

function rep(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) throw new Error(`Nije pronađeno: ${label}`)
  return text.replace(oldText, newText)
}

function patchCalendar() {
  const s = load('src/pages/CalendarPage.tsx')

  s.text = rep(
    s.text,
`          <button
            type="button"
            onClick={() => openNewEvent()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white active:scale-95 sm:hidden"
            aria-label="Novi termin"
          >
            <Plus size={21} />
          </button>`,
`          <div className="sm:hidden" />`,
    'Calendar small mobile plus',
  )

  const metrics = `        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <HeroMetric label="Mjesec" value={\`${'${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}.'}\`} />
          <HeroMetric label="Termini" value={String(events.length)} />
          <HeroMetric label="Google" value={googleAccessToken ? 'Povezan' : 'Nije povezan'} />
        </div>`

  const metricsWithButton = `${metrics}

        <button
          type="button"
          onClick={() => openNewEvent()}
          className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
        >
          <Plus size={20} />
          Novi termin
        </button>`

  s.text = rep(s.text, metrics, metricsWithButton, 'Calendar mobile CTA')

  s.text = rep(
    s.text,
`      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={() => openNewEvent()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          <Plus size={18} />
          Novi termin
        </button>
      </div>

`,
``,
    'Calendar overlapping fixed mobile CTA',
  )

  save(s)
}

function patchOfferDetails() {
  const s = load('src/pages/OfferDetailsPage.tsx')

  s.text = rep(
    s.text,
`      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={() =>
            navigate(
              \`/offers/\${offer.id}/edit\`,
            )
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          <Pencil size={18} />
          Uredi ponudu
        </button>
      </div>

`,
``,
    'OfferDetails duplicate fixed edit bar',
  )

  s.text = s.text.replace(
    'className="mx-auto w-full max-w-[1450px] space-y-4 pb-24 sm:space-y-6 sm:pb-10"',
    'className="mx-auto w-full max-w-[1450px] space-y-4 pb-10 sm:space-y-6 sm:pb-10"',
  )

  save(s)
}

function patchWorkOrderDetails() {
  const s = load('src/pages/WorkOrderDetailsPage.tsx')

  const oldMobileEdit = `{canManageWorkOrders &&
              canEditThisOrder && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  \`/work-orders/\${order.id}/edit\`,
                )
              }
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white active:scale-[0.99] sm:hidden"
            >
              <Pencil size={18} />
              Uredi radni nalog
            </button>
              )}`

  const newMobileActions = `            <div className="mt-4 grid grid-cols-2 gap-2 sm:hidden">
              {canManageWorkOrders &&
                canEditThisOrder ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        \`/work-orders/\${order.id}/edit\`,
                      )
                    }
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white active:scale-[0.99]"
                  >
                    <Pencil size={18} />
                    Uredi
                  </button>
                ) : (
                  <div />
                )}

              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownloadPdf}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white active:scale-[0.99] disabled:opacity-50"
              >
                <Download size={18} />
                {isDownloading ? 'PDF...' : 'PDF'}
              </button>
            </div>`

  s.text = rep(
    s.text,
    oldMobileEdit,
    newMobileActions,
    'WorkOrderDetails mobile edit/pdf actions',
  )

  s.text = rep(
    s.text,
`        <div className="h-20 sm:hidden" />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-xl gap-2">
          {canManageWorkOrders &&
            canEditThisOrder && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    \`/work-orders/\${order.id}/edit\`,
                  )
                }
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-white"
                aria-label="Uredi nalog"
              >
                <Pencil size={18} />
              </button>
            )}

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPdf}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
          >
            <Download size={18} />
            {isDownloading
              ? 'Izrada PDF-a...'
              : 'Preuzmi PDF'}
          </button>
        </div>
      </div>

`,
`      </section>

`,
    'WorkOrderDetails overlapping fixed bar',
  )

  save(s)
}

function writeAuditNote() {
  const note = `FERSYS MOBILE AUDIT — REVIEWED

Pregledano 5 upozorenja iz statičkog audita.

STVARNE GREŠKE — POPRAVLJENE:
- CalendarPage.tsx — page-level fixed bottom CTA se preklapao s globalnom mobilnom navigacijom.
- OfferDetailsPage.tsx — dupli page-level fixed "Uredi ponudu" bar; Uredi + PDF već postoje u hero dijelu.
- WorkOrderDetailsPage.tsx — page-level fixed Edit/PDF bar se preklapao s globalnom mobilnom navigacijom.

FALSE POSITIVE — NAMJERNO OSTAVLJENO:
- CustomersPage.tsx — bottom-0 je submit unutar modalnog overlay-a z-[120], nije page-level akcija.
- CustomerProfilePage.tsx — bottom-0 je submit unutar edit modala, nije page-level akcija.

Zaključak: nije ispravno automatski pomicati svaki bottom-0. Modalni footer treba ostati na dnu modala; problem su page-level fixed action barovi iznad globalne FERSYS navigacije.
`
  fs.writeFileSync(path.join(root, 'FERSYS_MOBILE_AUDIT_REVIEWED.txt'), note, 'utf8')
}

try {
  console.log('FERSYS mobile audit — reviewed fixes')
  console.log(`Backup: ${backupRoot}`)
  patchCalendar()
  patchOfferDetails()
  patchWorkOrderDetails()
  writeAuditNote()
  console.log('')
  console.log('✓ 3 stvarna problema popravljena.')
  console.log('✓ 2 modalna bottom-0 upozorenja provjerena i namjerno nisu mijenjana.')
  console.log('✓ Kreiran FERSYS_MOBILE_AUDIT_REVIEWED.txt')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error('✗', error instanceof Error ? error.message : error)
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}
