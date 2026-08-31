import fs from 'node:fs'

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Nije pronađen očekivani dio: ${label}`)
  }
  return source.replace(from, to)
}

// 1) Novi radni nalog: odabrani investitor je kompaktan dok korisnik ne otvori detalje.
const workOrderPath = 'src/pages/NewWorkOrderPage.tsx'
let workOrder = fs.readFileSync(workOrderPath, 'utf8')

workOrder = mustReplace(
  workOrder,
  `  Check,\n  Clock3,`,
  `  Check,\n  ChevronDown,\n  ChevronUp,\n  Clock3,`,
  'lucide ikone za detalje investitora',
)

workOrder = mustReplace(
  workOrder,
  `  const [showCustomerResults, setShowCustomerResults] =\n    useState(false)\n`,
  `  const [showCustomerResults, setShowCustomerResults] =\n    useState(false)\n  const [showCustomerDetails, setShowCustomerDetails] =\n    useState(false)\n`,
  'state za sažete detalje investitora',
)

workOrder = mustReplace(
  workOrder,
  `    if (!customer) {\n      setCustomerName('')`,
  `    if (!customer) {\n      setShowCustomerDetails(false)\n      setCustomerName('')`,
  'reset detalja kod uklanjanja investitora',
)

workOrder = mustReplace(
  workOrder,
  `    setCustomerName(\n      customer.name,\n    )\n    setCustomerSearch(customer.name)`,
  `    setCustomerName(\n      customer.name,\n    )\n    setShowCustomerDetails(false)\n    setCustomerSearch(customer.name)`,
  'zatvaranje detalja nakon odabira investitora',
)

const oldSelectedCustomer = `            {customerId && (\n              <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">\n                <div className="min-w-0">\n                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">\n                    Odabrani investitor\n                  </p>\n                  <p className="truncate text-sm font-black text-white">\n                    {customerName}\n                  </p>\n                </div>\n\n                <button\n                  type="button"\n                  onClick={() => {\n                    handleCustomerChange('')\n                    setShowCustomerResults(true)\n                  }}\n                  className="ml-3 shrink-0 text-xs font-black text-slate-400"\n                >\n                  Promijeni\n                </button>\n              </div>\n            )}`

const newSelectedCustomer = `            {customerId && (\n              <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">\n                <div className="flex items-center gap-3">\n                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">\n                    <UserRound size={18} />\n                  </span>\n\n                  <button\n                    type="button"\n                    onClick={() =>\n                      setShowCustomerDetails((current) => !current)\n                    }\n                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"\n                    aria-expanded={showCustomerDetails}\n                  >\n                    <span className="min-w-0">\n                      <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">\n                        Odabrani investitor\n                      </span>\n                      <span className="mt-0.5 block truncate text-sm font-black text-white">\n                        {customerName}\n                      </span>\n                    </span>\n\n                    <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-slate-950/35 px-2.5 py-2 text-[11px] font-black text-slate-300">\n                      {showCustomerDetails ? 'Sakrij' : 'Detalji'}\n                      {showCustomerDetails ? (\n                        <ChevronUp size={15} />\n                      ) : (\n                        <ChevronDown size={15} />\n                      )}\n                    </span>\n                  </button>\n\n                  <button\n                    type="button"\n                    onClick={() => {\n                      handleCustomerChange('')\n                      setShowCustomerResults(true)\n                    }}\n                    className="shrink-0 rounded-xl px-2 py-2 text-[11px] font-black text-slate-400 active:bg-slate-800"\n                  >\n                    Promijeni\n                  </button>\n                </div>\n              </div>\n            )}`

workOrder = mustReplace(
  workOrder,
  oldSelectedCustomer,
  newSelectedCustomer,
  'sažeta kartica odabranog investitora',
)

const detailsStart = `          <Field label="Ime i prezime osobe / investitora *">`
const detailsEnd = `          </Field>\n        </MobileSection>`
const startIndex = workOrder.indexOf(detailsStart)
const endIndex = workOrder.indexOf(detailsEnd, startIndex)
if (startIndex < 0 || endIndex < 0) {
  throw new Error('Nije pronađen blok detalja investitora u novom radnom nalogu.')
}
const originalDetails = workOrder.slice(startIndex, endIndex + `          </Field>`.length)
const wrappedDetails = `          {(!customerId || showCustomerDetails) && (\n            <>\n${originalDetails
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}\n            </>\n          )}`
workOrder = workOrder.slice(0, startIndex) + wrappedDetails + workOrder.slice(endIndex + `          </Field>`.length)

fs.writeFileSync(workOrderPath, workOrder)

// 2) Profil investitora: trajna napomena + vidljivi banner koji se može privremeno zatvoriti.
const profilePath = 'src/pages/CustomerProfilePage.tsx'
let profile = fs.readFileSync(profilePath, 'utf8')

profile = mustReplace(
  profile,
  `  const [editNotes, setEditNotes] =\n    useState('')\n  const [editStatus, setEditStatus] =`,
  `  const [editNotes, setEditNotes] =\n    useState('')\n  const [noteDraft, setNoteDraft] =\n    useState('')\n  const [isSavingNote, setIsSavingNote] =\n    useState(false)\n  const [isNoteDismissed, setIsNoteDismissed] =\n    useState(false)\n  const [editStatus, setEditStatus] =`,
  'state za napomenu investitora',
)

profile = mustReplace(
  profile,
  `  useEffect(() => {\n    let cancelled = false\n\n    void (async () => {\n      if (!id) {`,
  `  useEffect(() => {\n    setIsNoteDismissed(false)\n  }, [id])\n\n  useEffect(() => {\n    let cancelled = false\n\n    void (async () => {\n      if (!id) {`,
  'reset zatvorene napomene pri otvaranju investitora',
)

profile = mustReplace(
  profile,
  `        if (!cancelled) {\n          setCustomer(savedCustomer)\n        }`,
  `        if (!cancelled) {\n          setCustomer(savedCustomer)\n          setNoteDraft(savedCustomer?.notes ?? '')\n          setIsNoteDismissed(false)\n        }`,
  'učitavanje teksta napomene',
)

const insertBeforeDelete = `  async function handleDeleteCustomer() {`
const noteHandler = `  async function handleSaveCustomerNote() {\n    if (!customer || isSavingNote) {\n      return\n    }\n\n    try {\n      setIsSavingNote(true)\n\n      const updatedCustomer =\n        await updateCustomer(\n          customer.id,\n          {\n            type: customer.type,\n            name: customer.name,\n            contactPerson:\n              customer.contactPerson,\n            logo: customer.logo,\n            oib: customer.oib,\n            phone: customer.phone,\n            email: customer.email,\n            street: customer.street,\n            city: customer.city,\n            postalCode:\n              customer.postalCode,\n            iban: customer.iban,\n            notes: noteDraft.trim(),\n            status: customer.status,\n          },\n        )\n\n      setCustomer(updatedCustomer)\n      setNoteDraft(updatedCustomer.notes)\n      setEditNotes(updatedCustomer.notes)\n      setIsNoteDismissed(false)\n    } catch (error) {\n      window.alert(\n        error instanceof Error\n          ? error.message\n          : 'Napomenu nije moguće spremiti.',\n      )\n    } finally {\n      setIsSavingNote(false)\n    }\n  }\n\n`
profile = mustReplace(
  profile,
  insertBeforeDelete,
  noteHandler + insertBeforeDelete,
  'spremanje napomene investitora',
)

const quickActionsAnchor = `        <section className="grid grid-cols-3 gap-2">`
const noteBanner = `        {customer.notes.trim() && !isNoteDismissed && (\n          <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 shadow-lg shadow-amber-950/10 sm:p-5">\n            <div className="flex items-start gap-3">\n              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">\n                <NotebookPen size={19} />\n              </span>\n\n              <button\n                type="button"\n                onClick={() => setActiveTab('notes')}\n                className="min-w-0 flex-1 text-left"\n              >\n                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">\n                  Napomena investitora\n                </span>\n                <span className="mt-1 block whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-50">\n                  {customer.notes}\n                </span>\n                <span className="mt-2 block text-[11px] font-black text-amber-300/80">\n                  Dodirni za uređivanje\n                </span>\n              </button>\n\n              <button\n                type="button"\n                onClick={() => setIsNoteDismissed(true)}\n                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950/25 text-amber-200 active:bg-slate-950/45"\n                aria-label="Privremeno sakrij napomenu"\n                title="Sakrij do sljedećeg otvaranja investitora"\n              >\n                <X size={17} />\n              </button>\n            </div>\n          </section>\n        )}\n\n`
profile = mustReplace(
  profile,
  quickActionsAnchor,
  noteBanner + quickActionsAnchor,
  'vidljivi banner napomene',
)

const oldNotesTab = `        {activeTab === 'notes' && (\n          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">\n            <div className="flex items-center gap-3">\n              <NotebookPen\n                size={22}\n                className="text-amber-400"\n              />\n              <h2 className="text-lg font-black text-white">\n                Napomene\n              </h2>\n            </div>\n\n            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-800/60 p-4 text-sm leading-7 text-slate-300">\n              {customer.notes ||\n                'Za ovog investitora još nema spremljenih napomena.'}\n            </p>\n\n            <button\n              type="button"\n              onClick={openEditModal}\n              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white"\n            >\n              <Edit3 size={17} />\n              Uredi napomenu\n            </button>\n          </section>\n        )}`

const newNotesTab = `        {activeTab === 'notes' && (\n          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">\n            <div className="flex items-center gap-3">\n              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-300">\n                <NotebookPen size={21} />\n              </span>\n              <div>\n                <h2 className="text-lg font-black text-white">\n                  Napomena investitora\n                </h2>\n                <p className="mt-1 text-xs leading-5 text-slate-500">\n                  Zapiši nedovršene radove, dogovore ili nešto što treba provjeriti.\n                </p>\n              </div>\n            </div>\n\n            <textarea\n              rows={6}\n              value={noteDraft}\n              onChange={(event) =>\n                setNoteDraft(event.target.value)\n              }\n              placeholder="Npr. Potrebno se vratiti i zamijeniti ventil nakon dolaska dijela..."\n              className="mt-4 w-full resize-y rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"\n            />\n\n            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">\n              <p className="text-xs leading-5 text-slate-500">\n                X na upozorenju samo ga privremeno sakrije. Za trajno uklanjanje obriši tekst ovdje i spremi.\n              </p>\n\n              <button\n                type="button"\n                onClick={() => void handleSaveCustomerNote()}\n                disabled={isSavingNote || noteDraft.trim() === customer.notes.trim()}\n                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-black text-slate-950 disabled:opacity-40"\n              >\n                {isSavingNote ? (\n                  <Loader2 size={17} className="animate-spin" />\n                ) : (\n                  <Save size={17} />\n                )}\n                {isSavingNote ? 'Spremanje...' : 'Spremi napomenu'}\n              </button>\n            </div>\n          </section>\n        )}`
profile = mustReplace(
  profile,
  oldNotesTab,
  newNotesTab,
  'uređivač napomene u kartici Napomene',
)

// Kad se napomena spremi kroz opći modal, osvježi i brzi editor/banner.
profile = mustReplace(
  profile,
  `      setCustomer(updatedCustomer)\n      setIsEditModalOpen(false)`,
  `      setCustomer(updatedCustomer)\n      setNoteDraft(updatedCustomer.notes)\n      setIsNoteDismissed(false)\n      setIsEditModalOpen(false)`,
  'sinkronizacija napomene nakon uređivanja investitora',
)

fs.writeFileSync(profilePath, profile)

console.log('FERSYS: sažeti investitor u novom radnom nalogu i trajna napomena investitora su primijenjeni.')
