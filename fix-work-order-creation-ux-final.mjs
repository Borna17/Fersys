import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-workorder-ux-backup', stamp)

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

const page = load('src/pages/NewWorkOrderPage.tsx')

page.text = rep(
  page.text,
`const inputClass =
  'h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600'`,
`const inputClass =
  'h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600'

const FINALIZED_DRAFT_KEY =
  'fersys_finalized_work_order_draft_id'`,
  'finalized key',
)

page.text = rep(
  page.text,
`  const [customerId, setCustomerId] =
    useState('')
  const [customerName, setCustomerName] =
    useState('')`,
`  const [customerId, setCustomerId] =
    useState('')
  const [customerName, setCustomerName] =
    useState('')
  const [customerSearch, setCustomerSearch] =
    useState('')
  const [showCustomerResults, setShowCustomerResults] =
    useState(false)`,
  'customer search state',
)

page.text = rep(
  page.text,
`  const filteredTemplates =
    useMemo(() => {`,
`  const filteredCustomers =
    useMemo(() => {
      const active = customers.filter(
        (customer) => customer.status === 'Aktivan',
      )

      const query = customerSearch
        .trim()
        .toLocaleLowerCase('hr-HR')

      if (!query) return active.slice(0, 12)

      return active
        .filter((customer) =>
          [
            customer.name,
            customer.contactPerson,
            customer.phone,
            customer.email,
            customer.oib,
            customer.street,
            customer.city,
            customer.postalCode,
            customer.notes,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('hr-HR')
            .includes(query),
        )
        .slice(0, 20)
    }, [customers, customerSearch])

  const filteredTemplates =
    useMemo(() => {`,
  'filtered customers',
)

page.text = rep(
  page.text,
`    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'work-order',
            'new',
          )`,
`    void (async () => {
      try {
        const finalizedOrderId =
          localStorage.getItem(FINALIZED_DRAFT_KEY)

        if (finalizedOrderId) {
          await deleteUserDraft('work-order', 'new')
          localStorage.removeItem(FINALIZED_DRAFT_KEY)

          if (!cancelled) setDraftReady(true)
          return
        }

        const draft =
          await loadUserDraft<any>(
            'work-order',
            'new',
          )`,
  'skip finalized draft',
)

page.text = rep(
  page.text,
`        setCustomerName(
          value.customerName ?? '',
        )
        setCustomerContactPerson(`,
`        setCustomerName(
          value.customerName ?? '',
        )
        setCustomerSearch(
          value.customerName ?? '',
        )
        setCustomerContactPerson(`,
  'restore search',
)

page.text = rep(
  page.text,
`    if (!customer) {
      setCustomerName('')
      setCustomerContactPerson('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerOib('')
      setAddress('')
      setInvestorName('')
      return
    }

    setCustomerName(
      customer.name,
    )`,
`    if (!customer) {
      setCustomerName('')
      setCustomerSearch('')
      setCustomerContactPerson('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerOib('')
      setAddress('')
      setInvestorName('')
      return
    }

    setCustomerName(
      customer.name,
    )
    setCustomerSearch(customer.name)
    setShowCustomerResults(false)`,
  'select customer search',
)

page.text = rep(
  page.text,
`    if (!title.trim()) {
      alert(
        'Unesite naziv radnog naloga.',
      )
      return
    }`,
`    if (!investorName.trim()) {
      alert(
        'Unesite ime i prezime osobe / investitora.',
      )
      return
    }

    if (!title.trim()) {
      alert(
        'Unesite naziv radnog naloga.',
      )
      return
    }`,
  'investor required',
)

page.text = rep(
  page.text,
`      navigate(
        \`/work-orders/\${createdOrder.id}\`,
      )`,
`      localStorage.setItem(
        FINALIZED_DRAFT_KEY,
        createdOrder.id,
      )

      navigate(
        \`/work-orders/\${createdOrder.id}\`,
      )`,
  'mark finalized',
)

const oldCustomerUi = `          <Field
            label="Investitor"
            className="sm:col-span-2"
          >
            <select
              required
              value={customerId}
              onChange={(event) =>
                handleCustomerChange(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Odaberi investitora
              </option>

              {customers
                .filter(
                  (customer) =>
                    customer.status ===
                    'Aktivan',
                )
                .map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name} · OIB{' '}
                      {customer.oib}
                    </option>
                  ),
                )}
            </select>
          </Field>

          <Field label="Kontakt osoba">
            <input
              value={
                customerContactPerson
              }
              onChange={(event) =>
                setCustomerContactPerson(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>`

const newCustomerUi = `          <Field
            label="Pronađi investitora"
            className="sm:col-span-2"
          >
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                autoComplete="off"
                value={customerSearch}
                onFocus={() => setShowCustomerResults(true)}
                onChange={(event) => {
                  setCustomerSearch(event.target.value)
                  setShowCustomerResults(true)

                  if (customerId) {
                    setCustomerId('')
                    setCustomerName('')
                  }
                }}
                placeholder="Ime, tvrtka, telefon, OIB, adresa, grad..."
                className={\`\${inputClass} pl-11\`}
              />

              {showCustomerResults && (
                <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/40">
                  {filteredCustomers.length === 0 ? (
                    <div className="rounded-xl p-4 text-center text-sm text-slate-500">
                      Nema investitora za ovu pretragu.
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const customerAddress = [
                        customer.street,
                        customer.postalCode,
                        customer.city,
                      ]
                        .filter(Boolean)
                        .join(', ')

                      return (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleCustomerChange(customer.id)}
                          className="w-full rounded-xl p-3 text-left hover:bg-slate-800 active:bg-slate-800"
                        >
                          <p className="truncate text-sm font-black text-white">
                            {customer.name}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                            {[
                              customer.contactPerson,
                              customer.phone,
                              customerAddress,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {customerId && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Odabrani investitor
                  </p>
                  <p className="truncate text-sm font-black text-white">
                    {customerName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleCustomerChange('')
                    setShowCustomerResults(true)
                  }}
                  className="ml-3 shrink-0 text-xs font-black text-slate-400"
                >
                  Promijeni
                </button>
              </div>
            )}
          </Field>

          <Field label="Ime i prezime osobe / investitora *">
            <input
              required
              value={investorName}
              onChange={(event) =>
                setInvestorName(event.target.value)
              }
              placeholder="Npr. Marko Marić"
              className={inputClass}
            />
          </Field>`

page.text = rep(page.text, oldCustomerUi, newCustomerUi, 'searchable investor UI')
save(page)

const details = load('src/pages/WorkOrderDetailsPage.tsx')

details.text = rep(
  details.text,
`import FersysLoader from '../components/FersysLoader'`,
`import FersysLoader from '../components/FersysLoader'

import {
  deleteUserDraft,
} from '../services/drafts.service'`,
  'details draft import',
)

details.text = rep(
  details.text,
`import {
  downloadWorkOrderPdf,
} from '../utils/workOrderPdf'`,
`import {
  downloadWorkOrderPdf,
} from '../utils/workOrderPdf'

const FINALIZED_DRAFT_KEY =
  'fersys_finalized_work_order_draft_id'`,
  'details key',
)

details.text = rep(
  details.text,
`      downloadWorkOrderPdf(
        canViewPrices
          ? order
          : redactWorkOrderPrices(
              order,
            ),
        branding,
      )`,
`      await Promise.resolve(
        downloadWorkOrderPdf(
          canViewPrices
            ? order
            : redactWorkOrderPrices(
                order,
              ),
          branding,
        ),
      )

      const finalizedOrderId =
        localStorage.getItem(FINALIZED_DRAFT_KEY)

      if (finalizedOrderId === order.id) {
        await deleteUserDraft('work-order', 'new')
        localStorage.removeItem(FINALIZED_DRAFT_KEY)
      }`,
  'clear after PDF',
)

save(details)

console.log('✓ Search investitora dodan.')
console.log('✓ Ime i prezime investitora obavezno.')
console.log('✓ Novi radni nalog više ne vraća stare podatke/slike.')
console.log('✓ Draft se briše nakon PDF-a ili pri pokretanju novog naloga.')
console.log('Sada pokreni: npm run build')

