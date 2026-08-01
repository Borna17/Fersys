import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { openInvoicePdf } from '../utils/invoicePdf'

type InvoiceStatus =
  | 'Nacrt'
  | 'Izdano'
  | 'Poslano'
  | 'Djelomično plaćeno'
  | 'Plaćeno'
  | 'Dospjelo'
  | 'Stornirano'

type InvoiceItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
}

type InvoiceHistoryItem = {
  id: string
  date: string
  title: string
  description: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  customerName: string
  customerType: 'Fizička osoba' | 'Tvrtka' | 'Zgrada'
  oib: string
  email: string
  phone: string
  address: string
  city: string
  issueDate: string
  dueDate: string
  serviceDate: string
  status: InvoiceStatus
  responsiblePerson: string
  description: string
  internalNote: string
  paymentMethod: string
  paymentModel: string
  paymentReference: string
  iban: string
  items: InvoiceItem[]
  createdAt: string
  updatedAt: string
  paidAt?: string
  paidAmount: number
  version: number
  sourceOfferId?: string
  history: InvoiceHistoryItem[]
}

const STORAGE_KEY = 'fersys_invoices'

const statusStyles: Record<InvoiceStatus, string> = {
  Nacrt: 'border-slate-500/20 bg-slate-500/15 text-slate-300',
  Izdano: 'border-blue-500/20 bg-blue-500/15 text-blue-300',
  Poslano: 'border-cyan-500/20 bg-cyan-500/15 text-cyan-300',
  'Djelomično plaćeno':
    'border-amber-500/20 bg-amber-500/15 text-amber-300',
  Plaćeno:
    'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  Dospjelo: 'border-red-500/20 bg-red-500/15 text-red-300',
  Stornirano: 'border-rose-500/20 bg-rose-500/15 text-rose-300',
}

function readInvoices(): Invoice[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as Invoice[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function itemNet(item: InvoiceItem) {
  const base = item.quantity * item.price
  return base - base * (item.discount / 100)
}

function itemTotal(item: InvoiceItem) {
  const net = itemNet(item)
  return net + net * (item.vat / 100)
}

function invoiceTotal(invoice: Invoice) {
  return invoice.items.reduce(
    (sum, item) => sum + itemTotal(item),
    0,
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('hr-HR')
}

function createHistory(
  title: string,
  description: string,
): InvoiceHistoryItem {
  return {
    id: `invoice-history-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    date: new Date().toISOString(),
    title,
    description,
  }
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] =
    useState<Invoice[]>(readInvoices)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | 'Svi'>(
    'Svi',
  )
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<
    string | null
  >(null)

  const normalizedInvoices = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let changed = false
    const updated = invoices.map((invoice) => {
      if (
        invoice.status !== 'Plaćeno' &&
        invoice.status !== 'Stornirano' &&
        invoice.status !== 'Nacrt' &&
        invoice.dueDate &&
        new Date(`${invoice.dueDate}T00:00:00`) < today
      ) {
        changed = true
        return { ...invoice, status: 'Dospjelo' as InvoiceStatus }
      }
      return invoice
    })

    if (changed) {
      window.setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        setInvoices(updated)
      }, 0)
    }

    return updated
  }, [invoices])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('hr-HR')

    return normalizedInvoices
      .filter((invoice) => {
        const text = [
          invoice.invoiceNumber,
          invoice.customerName,
          invoice.oib,
          invoice.email,
          invoice.phone,
          invoice.address,
          invoice.city,
          invoice.description,
          ...invoice.items.map((item) => item.name),
        ]
          .join(' ')
          .toLocaleLowerCase('hr-HR')

        return (
          (!query || text.includes(query)) &&
          (status === 'Svi' || invoice.status === status)
        )
      })
      .sort(
        (a, b) =>
          new Date(b.issueDate).getTime() -
          new Date(a.issueDate).getTime(),
      )
  }, [normalizedInvoices, search, status])

  const statistics = useMemo(() => {
    const totalIssued = normalizedInvoices
      .filter((invoice) => invoice.status !== 'Nacrt')
      .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0)

    const paid = normalizedInvoices
      .filter((invoice) => invoice.status === 'Plaćeno')
      .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0)

    const outstanding = normalizedInvoices
      .filter((invoice) =>
        ['Izdano', 'Poslano', 'Djelomično plaćeno', 'Dospjelo'].includes(
          invoice.status,
        ),
      )
      .reduce(
        (sum, invoice) =>
          sum +
          Math.max(
            0,
            invoiceTotal(invoice) - (invoice.paidAmount || 0),
          ),
        0,
      )

    const overdue = normalizedInvoices
      .filter((invoice) => invoice.status === 'Dospjelo')
      .reduce(
        (sum, invoice) =>
          sum +
          Math.max(
            0,
            invoiceTotal(invoice) - (invoice.paidAmount || 0),
          ),
        0,
      )

    return {
      count: normalizedInvoices.length,
      totalIssued,
      paid,
      outstanding,
      overdue,
    }
  }, [normalizedInvoices])

  const selectedInvoice =
    normalizedInvoices.find(
      (invoice) => invoice.id === selectedInvoiceId,
    ) ?? null

  function save(updated: Invoice[]) {
    setInvoices(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function markPaid(invoice: Invoice) {
    const now = new Date().toISOString()
    const updated = invoices.map((current) =>
      current.id === invoice.id
        ? {
            ...current,
            status: 'Plaćeno' as InvoiceStatus,
            paidAmount: invoiceTotal(current),
            paidAt: now,
            updatedAt: now,
            history: [
              ...current.history,
              createHistory(
                'Račun plaćen',
                'Račun je označen kao u potpunosti plaćen.',
              ),
            ],
          }
        : current,
    )
    save(updated)
    setSelectedInvoiceId(null)
  }

  function removeInvoice(invoice: Invoice) {
    if (
      !window.confirm(
        `Želiš li trajno obrisati račun ${invoice.invoiceNumber}?`,
      )
    ) {
      return
    }

    save(invoices.filter((current) => current.id !== invoice.id))
    setSelectedInvoiceId(null)
  }

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-violet-300">
              <FileText size={17} />
              Financije
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              Računi
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Izdavanje, praćenje naplate i pregled svih računa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/invoices/new')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:brightness-110"
          >
            <Plus size={18} />
            Novi račun
          </button>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Ukupno računa', String(statistics.count)],
            ['Izdano ukupno', formatCurrency(statistics.totalIssued)],
            ['Naplaćeno', formatCurrency(statistics.paid)],
            ['Za naplatu', formatCurrency(statistics.outstanding)],
            ['Dospjelo', formatCurrency(statistics.overdue)],
          ].map(([label, value], index) => (
            <article
              key={label}
              className={`rounded-3xl border p-5 ${
                index === 4
                  ? 'border-red-400/20 bg-red-500/10'
                  : 'border-white/10 bg-slate-900/70'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                {label}
              </div>
              <div className="mt-2 text-xl font-black text-white">
                {value}
              </div>
            </article>
          ))}
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/75 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pretraži broj računa, kupca, OIB, stavku..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3 pl-11 pr-11 outline-none focus:border-violet-400/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-white/5"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as InvoiceStatus | 'Svi',
                )
              }
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold outline-none"
            >
              <option>Svi</option>
              <option>Nacrt</option>
              <option>Izdano</option>
              <option>Poslano</option>
              <option>Djelomično plaćeno</option>
              <option>Plaćeno</option>
              <option>Dospjelo</option>
              <option>Stornirano</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="grid min-h-80 place-items-center p-8 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-500/15 text-violet-300">
                  <FileText size={30} />
                </div>
                <h2 className="mt-4 text-xl font-black">
                  Nema pronađenih računa
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Izradi prvi račun ili promijeni kriterije pretrage.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-white/10 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Broj računa</th>
                    <th className="px-5 py-4">Kupac</th>
                    <th className="px-5 py-4">Datum</th>
                    <th className="px-5 py-4">Dospijeće</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Ukupno</th>
                    <th className="px-5 py-4 text-right">Akcije</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {filtered.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedInvoiceId(invoice.id)
                          }
                          className="font-black text-violet-300 hover:text-violet-200"
                        >
                          {invoice.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-200">
                          {invoice.customerName}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[invoice.oib, invoice.city]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[invoice.status]}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-white">
                        {formatCurrency(invoiceTotal(invoice))}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openInvoicePdf(invoice)}
                            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                            title="Pregled PDF-a"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/invoices/${invoice.id}/edit`,
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                            title="Uredi račun"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/invoices/new?duplicate=${invoice.id}`,
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                            title="Dupliciraj račun"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedInvoiceId(null)}
            aria-label="Zatvori"
          />

          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black text-violet-300">
                  {selectedInvoice.invoiceNumber}
                </div>
                <h2 className="mt-1 text-2xl font-black">
                  {selectedInvoice.customerName}
                </h2>
                <div className="mt-2 text-sm text-slate-400">
                  Izdano {formatDate(selectedInvoice.issueDate)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoiceId(null)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 text-slate-400 hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-black uppercase text-slate-500">
                  Status
                </div>
                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[selectedInvoice.status]}`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <div className="text-xs font-black uppercase text-violet-300">
                  Ukupno
                </div>
                <div className="mt-2 text-xl font-black">
                  {formatCurrency(invoiceTotal(selectedInvoice))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="grid gap-3">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Dospijeće</span>
                  <strong>
                    {formatDate(selectedInvoice.dueDate)}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">OIB kupca</span>
                  <strong>{selectedInvoice.oib || '—'}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">E-mail</span>
                  <strong className="break-all">
                    {selectedInvoice.email || '—'}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Način plaćanja</span>
                  <strong>{selectedInvoice.paymentMethod}</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openInvoicePdf(selectedInvoice)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black"
              >
                <Eye size={17} />
                Pregled PDF-a
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/invoices/${selectedInvoice.id}/edit`,
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black"
              >
                <Pencil size={17} />
                Uredi račun
              </button>
              {selectedInvoice.status !== 'Plaćeno' &&
                selectedInvoice.status !== 'Stornirano' && (
                  <button
                    type="button"
                    onClick={() => markPaid(selectedInvoice)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white sm:col-span-2"
                  >
                    <CheckCircle2 size={17} />
                    Označi kao plaćeno
                  </button>
                )}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/invoices/new?duplicate=${selectedInvoice.id}`,
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300"
              >
                <Copy size={17} />
                Dupliciraj
              </button>
              <button
                type="button"
                onClick={() => removeInvoice(selectedInvoice)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"
              >
                <Trash2 size={17} />
                Obriši
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
