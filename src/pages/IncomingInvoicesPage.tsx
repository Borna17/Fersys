import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Fuel,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import * as XLSX from 'xlsx'

import {
  deleteDocument,
  downloadDocument,
} from '../utils/documentStorage'
import { scopedStorageKey } from '../utils/scopedLocalStorage'

type Status =
  | 'Nije knjiženo'
  | 'Za knjiženje'
  | 'Knjiženo'
  | 'Plaćeno'
  | 'Stornirano'

type Category =
  | 'Gorivo'
  | 'Materijal'
  | 'Alat'
  | 'Servis i održavanje'
  | 'Najam'
  | 'Telekomunikacije'
  | 'Komunalije'
  | 'Reprezentacija'
  | 'Uredski troškovi'
  | 'Ostalo'

type DocumentMeta = {
  id: string
  fileName: string
  mimeType: string
  createdAt: string
}

type IncomingInvoice = {
  id: string
  supplierName: string
  supplierOib: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  bookingDate: string
  category: Category
  status: Status
  paymentMethod: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  note: string
  documents: DocumentMeta[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY =
  scopedStorageKey('fersys_incoming_invoices')

const statuses: Array<
  Status | 'Svi'
> = [
  'Svi',
  'Nije knjiženo',
  'Za knjiženje',
  'Knjiženo',
  'Plaćeno',
  'Stornirano',
]

const categories:
  Array<Category | 'Sve'> = [
    'Sve',
    'Gorivo',
    'Materijal',
    'Alat',
    'Servis i održavanje',
    'Najam',
    'Telekomunikacije',
    'Komunalije',
    'Reprezentacija',
    'Uredski troškovi',
    'Ostalo',
  ]

const statusStyles: Record<
  Status,
  string
> = {
  'Nije knjiženo':
    'border-slate-500/20 bg-slate-500/15 text-slate-300',
  'Za knjiženje':
    'border-amber-500/20 bg-amber-500/15 text-amber-300',
  Knjiženo:
    'border-blue-500/20 bg-blue-500/15 text-blue-300',
  Plaćeno:
    'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  Stornirano:
    'border-red-500/20 bg-red-500/15 text-red-300',
}

function readInvoices(): IncomingInvoice[] {
  try {
    const value =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY,
        ) ?? '[]',
      ) as IncomingInvoice[]

    return Array.isArray(value)
      ? value
      : []
  } catch {
    return []
  }
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

function date(value: string) {
  return value
    ? new Date(
        `${value}T12:00:00`,
      ).toLocaleDateString(
        'hr-HR',
      )
    : '—'
}

function icon(
  category: Category,
) {
  if (
    category === 'Gorivo'
  ) {
    return Fuel
  }

  if (
    category ===
    'Materijal'
  ) {
    return Package
  }

  if (
    category === 'Alat' ||
    category ===
      'Servis i održavanje'
  ) {
    return Wrench
  }

  return FileText
}

export function IncomingInvoicesPage() {
  const navigate =
    useNavigate()

  const [
    invoices,
    setInvoices,
  ] =
    useState<
      IncomingInvoice[]
    >(readInvoices)

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
      Status | 'Svi'
    >('Svi')

  const [
    category,
    setCategory,
  ] =
    useState<
      Category | 'Sve'
    >('Sve')

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string | null
    >(null)

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      return invoices
        .filter(
          (item) => {
            const text = [
              item.supplierName,
              item.supplierOib,
              item.invoiceNumber,
              item.category,
              item.note,
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
                item.status ===
                  status) &&
              (category ===
                'Sve' ||
                item.category ===
                  category)
            )
          },
        )
        .sort(
          (a, b) =>
            new Date(
              b.invoiceDate,
            ).getTime() -
            new Date(
              a.invoiceDate,
            ).getTime(),
        )
    }, [
      invoices,
      search,
      status,
      category,
    ])

  const stats =
    useMemo(() => {
      const now =
        new Date()

      return {
        count:
          invoices.length,
        total:
          invoices.reduce(
            (
              sum,
              item,
            ) =>
              sum +
              item.totalAmount,
            0,
          ),
        vat:
          invoices.reduce(
            (
              sum,
              item,
            ) =>
              sum +
              item.vatAmount,
            0,
          ),
        waiting:
          invoices.filter(
            (item) =>
              item.status ===
                'Za knjiženje' ||
              item.status ===
                'Nije knjiženo',
          ).length,
        month:
          invoices
            .filter(
              (item) => {
                const value =
                  new Date(
                    `${item.invoiceDate}T12:00:00`,
                  )

                return (
                  value.getMonth() ===
                    now.getMonth() &&
                  value.getFullYear() ===
                    now.getFullYear()
                )
              },
            )
            .reduce(
              (
                sum,
                item,
              ) =>
                sum +
                item.totalAmount,
              0,
            ),
      }
    }, [invoices])

  const selected =
    invoices.find(
      (item) =>
        item.id ===
        selectedId,
    ) ?? null

  function save(
    updated:
      IncomingInvoice[],
  ) {
    setInvoices(updated)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        updated,
      ),
    )
  }

  async function removeInvoice(
    invoice:
      IncomingInvoice,
  ) {
    if (
      !window.confirm(
        `Želiš li obrisati račun ${invoice.invoiceNumber}?`,
      )
    ) {
      return
    }

    for (
      const document
      of invoice.documents
    ) {
      await deleteDocument(
        document.id,
      )
    }

    save(
      invoices.filter(
        (item) =>
          item.id !==
          invoice.id,
      ),
    )

    setSelectedId(null)
  }

  function exportExcel() {
    const rows =
      filtered.map(
        (item) => ({
          Datum:
            date(
              item.invoiceDate,
            ),
          Dobavljač:
            item.supplierName,
          'OIB dobavljača':
            item.supplierOib,
          'Broj računa':
            item.invoiceNumber,
          Kategorija:
            item.category,
          Status:
            item.status,
          Osnovica:
            item.netAmount,
          PDV:
            item.vatAmount,
          Ukupno:
            item.totalAmount,
          'Način plaćanja':
            item.paymentMethod,
          'Broj dokumenata':
            item.documents
              .length,
          Napomena:
            item.note,
        }),
      )

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        rows,
      ),
      'Ulazni računi',
    )

    XLSX.writeFile(
      workbook,
      `ulazni-racuni-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`,
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                DIGITALNI REGISTRATOR
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Ulazni računi
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                R1 računi, gorivo, materijal, alat i ostali troškovi firme.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/incoming-invoices/new',
                )
              }
              className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 px-5 text-white shadow-lg shadow-violet-950/30 active:scale-95 sm:flex sm:gap-2"
              aria-label="Novi ulazni račun"
            >
              <Plus size={21} />
              <span className="hidden text-sm font-black sm:inline">
                Novi račun
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/incoming-invoices/new')}
            className="relative mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/30 active:scale-[0.99] sm:hidden"
          >
            <Plus size={20} />
            Novi ulazni račun
          </button>

          <div className="relative mt-5 grid grid-cols-4 gap-2">
            <MetricButton
              label="Ukupno"
              value={
                stats.count
              }
              active={
                status === 'Svi'
              }
              onClick={() =>
                setStatus('Svi')
              }
            />

            <MetricButton
              label="Čeka"
              value={
                stats.waiting
              }
              active={
                status ===
                  'Za knjiženje' ||
                status ===
                  'Nije knjiženo'
              }
              onClick={() =>
                setStatus(
                  'Za knjiženje',
                )
              }
            />

            <MetricButton
              label="Knjiženo"
              value={
                invoices.filter(
                  (item) =>
                    item.status ===
                    'Knjiženo',
                ).length
              }
              active={
                status ===
                'Knjiženo'
              }
              onClick={() =>
                setStatus(
                  'Knjiženo',
                )
              }
            />

            <MetricButton
              label="Plaćeno"
              value={
                invoices.filter(
                  (item) =>
                    item.status ===
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
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Troškovi ukupno"
            value={money(
              stats.total,
            )}
          />

          <SummaryCard
            label="PDV ukupno"
            value={money(
              stats.vat,
            )}
          />

          <SummaryCard
            label="Ovaj mjesec"
            value={money(
              stats.month,
            )}
          />

          <SummaryCard
            label="Za knjiženje"
            value={String(
              stats.waiting,
            )}
            warning
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
              placeholder="Dobavljač, broj računa, OIB..."
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
            {statuses.map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStatus(
                      value,
                    )
                  }
                  className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-black ${
                    status ===
                    value
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {value}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target
                    .value as
                    | Category
                    | 'Sve',
                )
              }
              className="h-11 min-w-0 flex-1 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
            >
              {categories.map(
                (item) => (
                  <option
                    key={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-4 text-xs font-black text-slate-200"
            >
              <FileSpreadsheet
                size={16}
              />
              Excel
            </button>
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as
                  | Status
                  | 'Svi',
              )
            }
            className="mt-3 hidden h-11 min-w-52 rounded-xl bg-slate-800 px-3 text-sm font-black text-white sm:block"
          >
            {statuses.map(
              (value) => (
                <option
                  key={value}
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

          {filtered.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
              <FileText
                size={34}
                className="mx-auto text-slate-600"
              />

              <p className="mt-4 font-black text-white">
                Nema ulaznih računa
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Dodaj prvi račun i skeniraj dokument kamerom.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {filtered.map(
                  (item) => {
                    const Icon =
                      icon(
                        item.category,
                      )

                    return (
                      <article
                        key={item.id}
                        className="rounded-3xl border border-slate-800 bg-slate-900 p-4"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedId(
                              item.id,
                            )
                          }
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-violet-400">
                                {
                                  item.invoiceNumber
                                }
                              </p>

                              <h3 className="mt-1 truncate font-black text-white">
                                {
                                  item.supplierName
                                }
                              </h3>

                              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                <Icon
                                  size={14}
                                />
                                {
                                  item.category
                                }
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[item.status]}`}
                            >
                              {
                                item.status
                              }
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <SmallInfo
                              label="Datum"
                              value={date(
                                item.invoiceDate,
                              )}
                            />

                            <SmallInfo
                              label="PDV"
                              value={money(
                                item.vatAmount,
                              )}
                            />

                            <SmallInfo
                              label="Ukupno"
                              value={money(
                                item.totalAmount,
                              )}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-950/50 p-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                              Dokumenti
                            </span>

                            <span className="text-sm font-black text-white">
                              {
                                item.documents
                                  .length
                              }
                            </span>
                          </div>
                        </button>

                        <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedId(
                                item.id,
                              )
                            }
                            className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-slate-300"
                          >
                            <Eye
                              size={17}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/incoming-invoices/${item.id}/edit`,
                              )
                            }
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500/15 px-3 text-xs font-black text-violet-200"
                          >
                            <Pencil size={16} />
                            Uredi
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedId(
                                item.id,
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
                  <table className="w-full min-w-[1100px] text-left">
                    <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Datum</th>
                        <th className="px-5 py-4">Dobavljač</th>
                        <th className="px-5 py-4">Broj računa</th>
                        <th className="px-5 py-4">Kategorija</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">PDV</th>
                        <th className="px-5 py-4 text-right">Ukupno</th>
                        <th className="px-5 py-4 text-center">Dokumenti</th>
                        <th className="px-5 py-4 text-right">Akcije</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                      {filtered.map(
                        (item) => {
                          const Icon =
                            icon(
                              item.category,
                            )

                          return (
                            <tr
                              key={
                                item.id
                              }
                              className="hover:bg-slate-800/40"
                            >
                              <td className="px-5 py-4 text-sm text-slate-300">
                                {date(
                                  item.invoiceDate,
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-black text-white">
                                  {
                                    item.supplierName
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  {item.supplierOib ||
                                    'Bez OIB-a'}
                                </div>
                              </td>

                              <td className="px-5 py-4 font-bold text-violet-300">
                                {
                                  item.invoiceNumber
                                }
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                                  <Icon
                                    size={16}
                                    className="text-slate-500"
                                  />
                                  {
                                    item.category
                                  }
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[item.status]}`}
                                >
                                  {
                                    item.status
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right font-bold text-slate-300">
                                {money(
                                  item.vatAmount,
                                )}
                              </td>

                              <td className="px-5 py-4 text-right font-black text-white">
                                {money(
                                  item.totalAmount,
                                )}
                              </td>

                              <td className="px-5 py-4 text-center">
                                {
                                  item.documents
                                    .length
                                }
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedId(
                                        item.id,
                                      )
                                    }
                                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400"
                                  >
                                    <Eye
                                      size={16}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/incoming-invoices/${item.id}/edit`,
                                      )
                                    }
                                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400"
                                  >
                                    <Pencil
                                      size={16}
                                    />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <button
            type="button"
            onClick={() =>
              setSelectedId(
                null,
              )
            }
            className="absolute inset-0"
            aria-label="Zatvori"
          />

          <aside className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-950 p-4 pb-8 sm:max-w-xl sm:rounded-3xl sm:border sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  {
                    selected.invoiceNumber
                  }
                </p>

                <h2 className="mt-1 truncate text-2xl font-black text-white">
                  {
                    selected.supplierName
                  }
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {date(
                    selected.invoiceDate,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedId(
                    null,
                  )
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat
                label="Osnovica"
                value={money(
                  selected.netAmount,
                )}
              />

              <Stat
                label="PDV"
                value={money(
                  selected.vatAmount,
                )}
              />

              <Stat
                label="Ukupno"
                value={money(
                  selected.totalAmount,
                )}
                accent
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
              <Row
                label="Kategorija"
                value={
                  selected.category
                }
              />

              <Row
                label="Status"
                value={
                  selected.status
                }
              />

              <Row
                label="Plaćanje"
                value={
                  selected.paymentMethod
                }
              />

              <Row
                label="Dospijeće"
                value={date(
                  selected.dueDate,
                )}
              />
            </div>

            <h3 className="mb-3 mt-6 font-black text-white">
              Dokumenti
            </h3>

            <div className="space-y-2">
              {selected.documents
                .length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                  Nema dokumenata.
                </div>
              ) : (
                selected.documents.map(
                  (document) => (
                    <button
                      key={
                        document.id
                      }
                      type="button"
                      onClick={() =>
                        void downloadDocument(
                          document.id,
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left"
                    >
                      <FileText
                        size={18}
                        className="text-violet-300"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-white">
                          {
                            document.fileName
                          }
                        </div>

                        <div className="text-xs text-slate-500">
                          Klikni za otvaranje
                        </div>
                      </div>

                      <Download
                        size={17}
                        className="text-slate-500"
                      />
                    </button>
                  ),
                )
              )}
            </div>

            {selected.note && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-xs font-black uppercase text-slate-500">
                  Napomena
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {
                    selected.note
                  }
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/incoming-invoices/${selected.id}/edit`,
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white"
              >
                <Pencil
                  size={17}
                />
                Uredi
              </button>

              <button
                type="button"
                onClick={() =>
                  void removeInvoice(
                    selected,
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
    </>
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
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warning
          ? 'border-amber-500/20 bg-amber-500/10'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-wide ${
          warning
            ? 'text-amber-300'
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

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        accent
          ? 'border-violet-400/20 bg-violet-500/10'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <div className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 truncate text-xs font-black text-white sm:text-sm">
        {value}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-slate-500">
        {label}
      </span>

      <strong className="text-right text-white">
        {value}
      </strong>
    </div>
  )
}
