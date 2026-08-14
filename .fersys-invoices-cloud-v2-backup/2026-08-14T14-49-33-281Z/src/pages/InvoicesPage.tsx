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

import { downloadInvoicePdf } from '../utils/invoicePdf'

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

const invoiceStatuses:
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

const statusStyles: Record<
  InvoiceStatus,
  string
> = {
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

    return Array.isArray(
      parsed,
    )
      ? parsed
      : []
  } catch {
    return []
  }
}

function itemNet(
  item: InvoiceItem,
) {
  const base =
    item.quantity * item.price

  return (
    base -
    base *
      (item.discount / 100)
  )
}

function itemTotal(
  item: InvoiceItem,
) {
  const net =
    itemNet(item)

  return (
    net +
    net * (item.vat / 100)
  )
}

function invoiceTotal(
  invoice: Invoice,
) {
  return invoice.items.reduce(
    (sum, item) =>
      sum +
      itemTotal(item),
    0,
  )
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(value)
}

function formatDate(
  value: string,
) {
  if (!value) return '—'

  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString(
    'hr-HR',
  )
}

function createHistory(
  title: string,
  description: string,
): InvoiceHistoryItem {
  return {
    id: `invoice-history-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    date:
      new Date().toISOString(),
    title,
    description,
  }
}

export function InvoicesPage() {
  const navigate =
    useNavigate()

  const [
    invoices,
    setInvoices,
  ] =
    useState<Invoice[]>(
      readInvoices,
    )

  const [
    search,
    setSearch,
  ] =
    useState('')

  const [
    status,
    setStatus,
  ] =
    useState<
      InvoiceStatus | 'Svi'
    >('Svi')

  const [
    selectedInvoiceId,
    setSelectedInvoiceId,
  ] =
    useState<
      string | null
    >(null)

  const normalizedInvoices =
    useMemo(() => {
      const today =
        new Date()

      today.setHours(
        0,
        0,
        0,
        0,
      )

      let changed = false

      const updated =
        invoices.map(
          (invoice) => {
            if (
              invoice.status !==
                'Plaćeno' &&
              invoice.status !==
                'Stornirano' &&
              invoice.status !==
                'Nacrt' &&
              invoice.dueDate &&
              new Date(
                `${invoice.dueDate}T00:00:00`,
              ) < today
            ) {
              changed = true

              return {
                ...invoice,
                status:
                  'Dospjelo' as InvoiceStatus,
              }
            }

            return invoice
          },
        )

      if (changed) {
        window.setTimeout(
          () => {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(
                updated,
              ),
            )
            setInvoices(
              updated,
            )
          },
          0,
        )
      }

      return updated
    }, [invoices])

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      return normalizedInvoices
        .filter(
          (invoice) => {
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
                (item) =>
                  item.name,
              ),
            ]
              .join(' ')
              .toLocaleLowerCase(
                'hr-HR',
              )

            return (
              (!query ||
                text.includes(
                  query,
                )) &&
              (status ===
                'Svi' ||
                invoice.status ===
                  status)
            )
          },
        )
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
      normalizedInvoices,
      search,
      status,
    ])

  const statistics =
    useMemo(() => {
      const totalIssued =
        normalizedInvoices
          .filter(
            (invoice) =>
              invoice.status !==
              'Nacrt',
          )
          .reduce(
            (
              sum,
              invoice,
            ) =>
              sum +
              invoiceTotal(
                invoice,
              ),
            0,
          )

      const paid =
        normalizedInvoices
          .filter(
            (invoice) =>
              invoice.status ===
              'Plaćeno',
          )
          .reduce(
            (
              sum,
              invoice,
            ) =>
              sum +
              invoiceTotal(
                invoice,
              ),
            0,
          )

      const outstanding =
        normalizedInvoices
          .filter(
            (invoice) =>
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
            (
              sum,
              invoice,
            ) =>
              sum +
              Math.max(
                0,
                invoiceTotal(
                  invoice,
                ) -
                  (invoice.paidAmount ||
                    0),
              ),
            0,
          )

      const overdue =
        normalizedInvoices
          .filter(
            (invoice) =>
              invoice.status ===
              'Dospjelo',
          )
          .reduce(
            (
              sum,
              invoice,
            ) =>
              sum +
              Math.max(
                0,
                invoiceTotal(
                  invoice,
                ) -
                  (invoice.paidAmount ||
                    0),
              ),
            0,
          )

      return {
        count:
          normalizedInvoices.length,
        totalIssued,
        paid,
        outstanding,
        overdue,
      }
    }, [normalizedInvoices])

  const selectedInvoice =
    normalizedInvoices.find(
      (invoice) =>
        invoice.id ===
        selectedInvoiceId,
    ) ?? null

  function save(
    updated: Invoice[],
  ) {
    setInvoices(updated)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        updated,
      ),
    )
  }

  function markPaid(
    invoice: Invoice,
  ) {
    const now =
      new Date().toISOString()

    const updated =
      invoices.map(
        (current) =>
          current.id ===
          invoice.id
            ? {
                ...current,
                status:
                  'Plaćeno' as InvoiceStatus,
                paidAmount:
                  invoiceTotal(
                    current,
                  ),
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
    setSelectedInvoiceId(
      null,
    )
  }

  function removeInvoice(
    invoice: Invoice,
  ) {
    if (
      !window.confirm(
        `Želiš li trajno obrisati račun ${invoice.invoiceNumber}?`,
      )
    ) {
      return
    }

    save(
      invoices.filter(
        (current) =>
          current.id !==
          invoice.id,
      ),
    )

    setSelectedInvoiceId(
      null,
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              FINANCIJE
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Računi
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Izdavanje, praćenje naplate i pregled svih računa.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/invoices/new',
              )
            }
            className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:gap-2"
            aria-label="Novi račun"
          >
            <Plus size={21} />
            <span className="hidden text-sm font-black sm:inline">
              Novi račun
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/invoices/new')}
          className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
        >
          <Plus size={20} />
          Novi račun
        </button>

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          <MetricButton
            label="Ukupno"
            value={
              statistics.count
            }
            active={
              status === 'Svi'
            }
            onClick={() =>
              setStatus('Svi')
            }
          />

          <MetricButton
            label="Izdano"
            value={
              normalizedInvoices.filter(
                (invoice) =>
                  invoice.status ===
                  'Izdano',
              ).length
            }
            active={
              status ===
              'Izdano'
            }
            onClick={() =>
              setStatus(
                'Izdano',
              )
            }
          />

          <MetricButton
            label="Plaćeno"
            value={
              normalizedInvoices.filter(
                (invoice) =>
                  invoice.status ===
                  'Plaćeno',
              ).length
            }
            active={
              status ===
              'Plaćeno'
            }
            onClick={() =>
              setStatus(
                'Plaćeno',
              )
            }
          />

          <MetricButton
            label="Dospjelo"
            value={
              normalizedInvoices.filter(
                (invoice) =>
                  invoice.status ===
                  'Dospjelo',
              ).length
            }
            active={
              status ===
              'Dospjelo'
            }
            onClick={() =>
              setStatus(
                'Dospjelo',
              )
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Izdano ukupno"
          value={formatCurrency(
            statistics.totalIssued,
          )}
        />

        <SummaryCard
          label="Naplaćeno"
          value={formatCurrency(
            statistics.paid,
          )}
        />

        <SummaryCard
          label="Za naplatu"
          value={formatCurrency(
            statistics.outstanding,
          )}
        />

        <SummaryCard
          label="Dospjelo"
          value={formatCurrency(
            statistics.overdue,
          )}
          danger
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
        <div className="relative">
          <Search
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Broj računa, investitor, OIB, stavka..."
            className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-11 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-violet-600"
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch('')
              }
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
          {invoiceStatuses.map(
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

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as
                | InvoiceStatus
                | 'Svi',
            )
          }
          className="mt-3 hidden h-12 min-w-52 rounded-xl bg-slate-800 px-4 font-bold text-white outline-none sm:block"
        >
          {invoiceStatuses.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ),
          )}
        </select>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            POPIS
          </p>

          <h2 className="mt-1 text-lg font-black text-white">
            {filtered.length}{' '}
            prikazano
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
            <FileText
              size={34}
              className="mx-auto text-slate-600"
            />

            <p className="mt-4 font-black text-white">
              Nema pronađenih računa
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Izradi prvi račun ili promijeni kriterije pretrage.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filtered.map(
                (invoice) => {
                  const total =
                    invoiceTotal(
                      invoice,
                    )

                  const remaining =
                    Math.max(
                      0,
                      total -
                        (invoice.paidAmount ||
                          0),
                    )

                  return (
                    <article
                      key={
                        invoice.id
                      }
                      className="rounded-3xl border border-slate-800 bg-slate-900 p-4"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedInvoiceId(
                            invoice.id,
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
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
                              {[
                                invoice.oib,
                                invoice.city,
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  ' · ',
                                ) ||
                                'Bez dodatnih podataka'}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[invoice.status]}`}
                          >
                            {
                              invoice.status
                            }
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <SmallInfo
                            label="Izdano"
                            value={formatDate(
                              invoice.issueDate,
                            )}
                          />

                          <SmallInfo
                            label="Dospijeće"
                            value={formatDate(
                              invoice.dueDate,
                            )}
                          />

                          <SmallInfo
                            label="Ukupno"
                            value={formatCurrency(
                              total,
                            )}
                          />
                        </div>

                        {remaining > 0 &&
                          invoice.status !==
                            'Nacrt' &&
                          invoice.status !==
                            'Stornirano' && (
                            <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-950/50 p-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                Preostalo za naplatu
                              </span>

                              <span className="text-sm font-black text-white">
                                {formatCurrency(
                                  remaining,
                                )}
                              </span>
                            </div>
                          )}
                      </button>

                      <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            downloadInvoicePdf(
                              invoice,
                            )
                          }
                          className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"
                          aria-label="PDF pregled"
                        >
                          <Eye
                            size={17}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/invoices/${invoice.id}/edit`,
                            )
                          }
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-3 text-xs font-black text-violet-200"
                          aria-label="Uredi račun"
                        >
                          <Pencil size={16} />
                          Uredi
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/invoices/new?duplicate=${invoice.id}`,
                            )
                          }
                          className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"
                          aria-label="Dupliciraj račun"
                        >
                          <Copy
                            size={17}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedInvoiceId(
                              invoice.id,
                            )
                          }
                          className="min-h-11 flex-1 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                        >
                          Otvori
                        </button>
                      </div>
                    </article>
                  )
                },
              )}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">
                        Broj računa
                      </th>
                      <th className="px-5 py-4">
                        Investitor
                      </th>
                      <th className="px-5 py-4">
                        Datum
                      </th>
                      <th className="px-5 py-4">
                        Dospijeće
                      </th>
                      <th className="px-5 py-4">
                        Status
                      </th>
                      <th className="px-5 py-4 text-right">
                        Ukupno
                      </th>
                      <th className="px-5 py-4 text-right">
                        Akcije
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {filtered.map(
                      (invoice) => (
                        <tr
                          key={
                            invoice.id
                          }
                          className="transition hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedInvoiceId(
                                  invoice.id,
                                )
                              }
                              className="font-black text-violet-300"
                            >
                              {
                                invoice.invoiceNumber
                              }
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-black text-slate-200">
                              {
                                invoice.customerName
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {[
                                invoice.oib,
                                invoice.city,
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  ' · ',
                                )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-300">
                            {formatDate(
                              invoice.issueDate,
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-300">
                            {formatDate(
                              invoice.dueDate,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[invoice.status]}`}
                            >
                              {
                                invoice.status
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-black text-white">
                            {formatCurrency(
                              invoiceTotal(
                                invoice,
                              ),
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadInvoicePdf(
                                    invoice,
                                  )
                                }
                                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                                title="Pregled PDF-a"
                              >
                                <Eye
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/invoices/${invoice.id}/edit`,
                                  )
                                }
                                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                                title="Uredi račun"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/invoices/new?duplicate=${invoice.id}`,
                                  )
                                }
                                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                                title="Dupliciraj račun"
                              >
                                <Copy
                                  size={16}
                                />
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
          </>
        )}
      </section>

      {selectedInvoice && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() =>
              setSelectedInvoiceId(
                null,
              )
            }
            aria-label="Zatvori"
          />

          <aside className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-950 p-4 pb-8 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:border sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  {
                    selectedInvoice.invoiceNumber
                  }
                </p>

                <h2 className="mt-1 truncate text-2xl font-black text-white">
                  {
                    selectedInvoice.customerName
                  }
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Izdano{' '}
                  {formatDate(
                    selectedInvoice.issueDate,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedInvoiceId(
                    null,
                  )
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Status
                </p>

                <span
                  className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[selectedInvoice.status]}`}
                >
                  {
                    selectedInvoice.status
                  }
                </span>
              </div>

              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">
                  Ukupno
                </p>

                <p className="mt-2 text-lg font-black text-white">
                  {formatCurrency(
                    invoiceTotal(
                      selectedInvoice,
                    ),
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <DetailRow
                label="Dospijeće"
                value={formatDate(
                  selectedInvoice.dueDate,
                )}
              />

              <DetailRow
                label="OIB investitora"
                value={
                  selectedInvoice.oib ||
                  '—'
                }
              />

              <DetailRow
                label="E-mail"
                value={
                  selectedInvoice.email ||
                  '—'
                }
              />

              <DetailRow
                label="Način plaćanja"
                value={
                  selectedInvoice.paymentMethod
                }
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadInvoicePdf(
                    selectedInvoice,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white"
              >
                <Eye size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/invoices/${selectedInvoice.id}/edit`,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white"
              >
                <Pencil
                  size={17}
                />
                Uredi
              </button>

              {selectedInvoice.status !==
                'Plaćeno' &&
                selectedInvoice.status !==
                  'Stornirano' && (
                  <button
                    type="button"
                    onClick={() =>
                      markPaid(
                        selectedInvoice,
                      )
                    }
                    className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white"
                  >
                    <CheckCircle2
                      size={17}
                    />
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-300"
              >
                <Copy size={17} />
                Dupliciraj
              </button>

              <button
                type="button"
                onClick={() =>
                  removeInvoice(
                    selectedInvoice,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-black text-red-300"
              >
                <Trash2
                  size={17}
                />
                Obriši
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

function MetricButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-2 py-3 text-center transition active:scale-[0.98] ${
        active
          ? 'border-violet-500/40 bg-violet-500/10'
          : 'border-white/5 bg-white/[0.035]'
      }`}
    >
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white sm:text-2xl">
        {value}
      </p>
    </button>
  )
}

function SummaryCard({
  label,
  value,
  danger = false,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger
          ? 'border-red-500/20 bg-red-500/10'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-wide ${
          danger
            ? 'text-red-300'
            : 'text-slate-500'
        }`}
      >
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-black text-white sm:text-xl">
        {value}
      </p>
    </div>
  )
}

function SmallInfo({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-950/50 p-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-black text-white">
        {value}
      </p>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <strong className="max-w-[62%] break-words text-right text-white">
        {value}
      </strong>
    </div>
  )
}
