import {
  useEffect,
  useMemo,
  useState,
} from 'react'
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

import { downloadInvoicePdf } from '../utils/invoicePdf'
import {
  deleteInvoice as deleteCloudInvoice,
  getInvoices as getCloudInvoices,
  importLocalInvoices,
  updateInvoice as updateCloudInvoice,
} from '../services/invoices.service'

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
  customerType:
    | 'Fizička osoba'
    | 'Tvrtka'
    | 'Zgrada'
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

const STORAGE_KEY =
  'fersys_invoices'

const statuses:
Array<
  InvoiceStatus | 'Svi'
> = [
  'Svi',
  'Nacrt',
  'Izdano',
  'Poslano',
  'Djelomično plaćeno',
  'Plaćeno',
  'Dospjelo',
  'Stornirano',
]

const statusStyles:
Record<InvoiceStatus, string> = {
  Nacrt:
    'border-slate-500/20 bg-slate-500/15 text-slate-300',
  Izdano:
    'border-blue-500/20 bg-blue-500/15 text-blue-300',
  Poslano:
    'border-cyan-500/20 bg-cyan-500/15 text-cyan-300',
  'Djelomično plaćeno':
    'border-amber-500/20 bg-amber-500/15 text-amber-300',
  Plaćeno:
    'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  Dospjelo:
    'border-red-500/20 bg-red-500/15 text-red-300',
  Stornirano:
    'border-rose-500/20 bg-rose-500/15 text-rose-300',
}

function readInvoices(): Invoice[] {
  try {
    const parsed =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY,
        ) ?? '[]',
      ) as Invoice[]

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch {
    return []
  }
}

function itemTotal(
  item: InvoiceItem,
) {
  const base =
    Number(item.quantity) *
    Number(item.price)
  const discount =
    base *
    ((Number(item.discount) || 0) /
      100)
  const net = base - discount

  return (
    net +
    net *
      ((Number(item.vat) || 0) /
        100)
  )
}

function invoiceTotal(
  invoice: Invoice,
) {
  return invoice.items.reduce(
    (sum, item) =>
      sum + itemTotal(item),
    0,
  )
}

function money(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function dateText(value: string) {
  if (!value) return '—'

  const parsed =
    new Date(`${value}T12:00:00`)

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(
        'hr-HR',
      )
}

function history(
  title: string,
  description: string,
): InvoiceHistoryItem {
  return {
    id:
      `invoice-history-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    date:
      new Date().toISOString(),
    title,
    description,
  }
}

export function InvoicesPage() {
  const navigate = useNavigate()

  const [invoices, setInvoices] =
    useState<Invoice[]>(
      readInvoices,
    )
  const [
    isCloudLoading,
    setIsCloudLoading,
  ] = useState(true)
  const [
    cloudError,
    setCloudError,
  ] = useState('')
  const [search, setSearch] =
    useState('')
  const [status, setStatus] =
    useState<
      InvoiceStatus | 'Svi'
    >('Svi')
  const [
    selectedInvoiceId,
    setSelectedInvoiceId,
  ] = useState<string | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsCloudLoading(true)
        setCloudError('')

        const local =
          readInvoices()

        await importLocalInvoices(
          local,
        )

        const cloud =
          await getCloudInvoices<Invoice>()

        if (cancelled) return

        setInvoices(cloud)
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(cloud),
        )
      } catch (error) {
        if (!cancelled) {
          setCloudError(
            error instanceof Error
              ? error.message
              : 'Račune nije moguće učitati iz clouda.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsCloudLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const normalized =
    useMemo(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      return invoices.map(
        (invoice) => {
          if (
            ![
              'Plaćeno',
              'Stornirano',
              'Nacrt',
            ].includes(
              invoice.status,
            ) &&
            invoice.dueDate &&
            new Date(
              `${invoice.dueDate}T00:00:00`,
            ) < now
          ) {
            return {
              ...invoice,
              status:
                'Dospjelo' as InvoiceStatus,
            }
          }

          return invoice
        },
      )
    }, [invoices])

  useEffect(() => {
    const changed =
      normalized.some(
        (invoice, index) =>
          invoice.status !==
          invoices[index]?.status,
      )

    if (!changed) return

    setInvoices(normalized)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalized),
    )

    normalized.forEach(
      (invoice) => {
        if (
          invoice.status ===
          'Dospjelo'
        ) {
          void updateCloudInvoice(
            invoice,
          ).catch(console.error)
        }
      },
    )
  }, [normalized])

  const filtered = useMemo(() => {
    const query =
      search
        .trim()
        .toLocaleLowerCase(
          'hr-HR',
        )

    return normalized
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
          ...invoice.items.map(
            (item) => item.name,
          ),
        ]
          .join(' ')
          .toLocaleLowerCase(
            'hr-HR',
          )

        return (
          (!query ||
            text.includes(query)) &&
          (status === 'Svi' ||
            invoice.status ===
              status)
        )
      })
      .sort(
        (a, b) =>
          new Date(
            b.issueDate,
          ).getTime() -
          new Date(
            a.issueDate,
          ).getTime(),
      )
  }, [
    normalized,
    search,
    status,
  ])

  const stats = useMemo(() => {
    const totalIssued =
      normalized
        .filter(
          (invoice) =>
            invoice.status !==
            'Nacrt',
        )
        .reduce(
          (sum, invoice) =>
            sum +
            invoiceTotal(invoice),
          0,
        )

    const paid =
      normalized
        .filter(
          (invoice) =>
            invoice.status ===
            'Plaćeno',
        )
        .reduce(
          (sum, invoice) =>
            sum +
            invoiceTotal(invoice),
          0,
        )

    const outstanding =
      normalized
        .filter((invoice) =>
          [
            'Izdano',
            'Poslano',
            'Djelomično plaćeno',
            'Dospjelo',
          ].includes(
            invoice.status,
          ),
        )
        .reduce(
          (sum, invoice) =>
            sum +
            Math.max(
              0,
              invoiceTotal(
                invoice,
              ) -
                (Number(
                  invoice.paidAmount,
                ) || 0),
            ),
          0,
        )

    const overdue =
      normalized
        .filter(
          (invoice) =>
            invoice.status ===
            'Dospjelo',
        )
        .reduce(
          (sum, invoice) =>
            sum +
            Math.max(
              0,
              invoiceTotal(
                invoice,
              ) -
                (Number(
                  invoice.paidAmount,
                ) || 0),
            ),
          0,
        )

    return {
      count: normalized.length,
      totalIssued,
      paid,
      outstanding,
      overdue,
    }
  }, [normalized])

  const selected =
    normalized.find(
      (invoice) =>
        invoice.id ===
        selectedInvoiceId,
    ) ?? null

  function persist(
    next: Invoice[],
  ) {
    setInvoices(next)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next),
    )
  }

  async function markPaid(
    invoice: Invoice,
  ) {
    const now =
      new Date().toISOString()

    const next =
      invoices.map((item) =>
        item.id === invoice.id
          ? {
              ...item,
              status:
                'Plaćeno' as InvoiceStatus,
              paidAmount:
                invoiceTotal(item),
              paidAt: now,
              updatedAt: now,
              history: [
                ...item.history,
                history(
                  'Račun plaćen',
                  'Račun je označen kao u potpunosti plaćen.',
                ),
              ],
            }
          : item,
      )

    persist(next)

    const paid =
      next.find(
        (item) =>
          item.id === invoice.id,
      )

    if (paid) {
      try {
        await updateCloudInvoice(
          paid,
        )
      } catch (error) {
        console.error(error)
      }
    }

    setSelectedInvoiceId(null)
  }

  async function removeInvoice(
    invoice: Invoice,
  ) {
    if (
      !window.confirm(
        `Trajno obrisati račun ${invoice.invoiceNumber}?`,
      )
    ) {
      return
    }

    persist(
      invoices.filter(
        (item) =>
          item.id !== invoice.id,
      ),
    )

    try {
      await deleteCloudInvoice(
        invoice.id,
      )
    } catch (error) {
      console.error(error)
    }

    setSelectedInvoiceId(null)
  }

  async function duplicateInvoice(
    invoice: Invoice,
  ) {
    navigate(
      `/invoices/new?duplicate=${invoice.id}`,
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-6 sm:space-y-6">
        {cloudError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            Cloud sinkronizacija:
            {' '}
            {cloudError}
          </div>
        )}

        {isCloudLoading && (
          <div className="rounded-2xl border border-violet-500/15 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-200">
            Sinkronizacija računa...
          </div>
        )}

        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                FINANCIJE
              </p>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                Izlazni računi
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Brzo prati izdano,
                naplaćeno i dospjelo.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/invoices/new',
                )
              }
              className="hidden h-12 items-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white sm:flex"
            >
              <Plus size={20} />
              Novi račun
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/invoices/new',
              )
            }
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-black text-white sm:hidden"
          >
            <Plus size={20} />
            Novi račun
          </button>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <Metric
              label="Računi"
              value={String(
                stats.count,
              )}
            />
            <Metric
              label="Izdano"
              value={money(
                stats.totalIssued,
              )}
              compact
            />
            <Metric
              label="Otvoreno"
              value={money(
                stats.outstanding,
              )}
              compact
            />
            <Metric
              label="Dospjelo"
              value={money(
                stats.overdue,
              )}
              compact
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Broj računa, investitor, OIB, stavka..."
              className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-4 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div className="fersys-scrollbar-hidden mt-3 flex gap-2 overflow-x-auto pb-1">
            {statuses.map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStatus(value)
                  }
                  className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-black ${
                    status === value
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {value}
                </button>
              ),
            )}
          </div>
        </section>

        <div className="space-y-3 lg:hidden">
          {filtered.map(
            (invoice) => (
              <article
                key={invoice.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedInvoiceId(
                        invoice.id,
                      )
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-violet-400">
                      {
                        invoice.invoiceNumber
                      }
                    </p>
                    <h3 className="mt-1 truncate font-black text-white">
                      {
                        invoice.customerName
                      }
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {invoice.description ||
                        'Izdani račun'}
                    </p>
                  </button>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[invoice.status]}`}
                  >
                    {invoice.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Info
                    label="Datum"
                    value={dateText(
                      invoice.issueDate,
                    )}
                  />
                  <Info
                    label="Dospijeće"
                    value={dateText(
                      invoice.dueDate,
                    )}
                  />
                  <Info
                    label="Ukupno"
                    value={money(
                      invoiceTotal(
                        invoice,
                      ),
                    )}
                  />
                  <Info
                    label="Otvoreno"
                    value={money(
                      Math.max(
                        0,
                        invoiceTotal(
                          invoice,
                        ) -
                          (Number(
                            invoice.paidAmount,
                          ) || 0),
                      ),
                    )}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedInvoiceId(
                        invoice.id,
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-800 text-xs font-black text-white"
                  >
                    <Eye size={15} />
                    Pregled
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/invoices/${invoice.id}/edit`,
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-800 text-xs font-black text-white"
                  >
                    <Pencil size={15} />
                    Uredi
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void downloadInvoicePdf(
                        invoice,
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-violet-600 text-xs font-black text-white"
                  >
                    <FileText
                      size={15}
                    />
                    PDF
                  </button>
                </div>
              </article>
            ),
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Račun</th>
                  <th className="px-5 py-4">Investitor</th>
                  <th className="px-5 py-4">Datum</th>
                  <th className="px-5 py-4">Dospijeće</th>
                  <th className="px-5 py-4">Ukupno</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(
                  (invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-black text-violet-300">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {invoice.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {invoice.oib || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {dateText(
                          invoice.issueDate,
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {dateText(
                          invoice.dueDate,
                        )}
                      </td>
                      <td className="px-5 py-4 font-black text-white">
                        {money(
                          invoiceTotal(
                            invoice,
                          ),
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[invoice.status]}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedInvoiceId(
                                invoice.id,
                              )
                            }
                            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-white"
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
                            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-white"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void downloadInvoicePdf(
                                invoice,
                              )
                            }
                            className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
            <FileText
              size={30}
              className="mx-auto text-slate-600"
            />
            <p className="mt-3 font-black text-white">
              Nema pronađenih računa
            </p>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[140] flex items-end bg-black/75 pt-[var(--fersys-safe-top)] backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Pregled računa"
        >
          <div className="flex max-h-[calc(100dvh-var(--fersys-safe-top))] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 sm:max-w-xl sm:rounded-3xl sm:border">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-violet-400">
                  {selected.invoiceNumber}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  {selected.customerName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedInvoiceId(
                    null,
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <Info
                  label="Datum"
                  value={dateText(
                    selected.issueDate,
                  )}
                />
                <Info
                  label="Dospijeće"
                  value={dateText(
                    selected.dueDate,
                  )}
                />
                <Info
                  label="Status"
                  value={selected.status}
                />
                <Info
                  label="Ukupno"
                  value={money(
                    invoiceTotal(
                      selected,
                    ),
                  )}
                />
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-800/55 p-4 text-sm leading-6 text-slate-300">
                {selected.description ||
                  'Bez dodatnog opisa.'}
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-800 bg-slate-900 p-3 pb-[max(0.75rem,var(--fersys-safe-bottom))]">
              {selected.status !==
                'Plaćeno' &&
                selected.status !==
                  'Stornirano' && (
                  <button
                    type="button"
                    onClick={() =>
                      void markPaid(
                        selected,
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white"
                  >
                    <CheckCircle2
                      size={16}
                    />
                    Plaćeno
                  </button>
                )}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/invoices/${selected.id}/edit`,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
              >
                <Pencil size={16} />
                Uredi
              </button>

              <button
                type="button"
                onClick={() =>
                  void duplicateInvoice(
                    selected,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
              >
                <Copy size={16} />
                Dupliraj
              </button>

              <button
                type="button"
                onClick={() =>
                  void removeInvoice(
                    selected,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500/10 px-3 text-xs font-black text-red-300"
              >
                <Trash2 size={16} />
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-2 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-black text-white ${
          compact
            ? 'text-[10px] sm:text-sm'
            : 'text-xl'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-800/55 p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

export default InvoicesPage
