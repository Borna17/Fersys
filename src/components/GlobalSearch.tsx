import {
  Building2,
  FileText,
  Loader2,
  ReceiptText,
  Search,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import { getCustomers } from '../services/customers.service'
import {
  getInvoices,
  type InvoiceCloudShape,
} from '../services/invoices.service'
import { getOffers } from '../services/offers.service'
import {
  getWorkOrders,
  type CloudWorkOrder,
} from '../services/workOrders.service'
import type { Customer } from '../types/customer'
import type { Offer } from '../types/offers'

type SearchKind =
  | 'customer'
  | 'work-order'
  | 'offer'
  | 'invoice'

type SearchInvoice = InvoiceCloudShape & {
  customerName?: string
  customerType?: string
  oib?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  description?: string
  total?: number
  totalAmount?: number
}

type SearchEntry = {
  id: string
  kind: SearchKind
  title: string
  subtitle: string
  meta: string
  route: string
  searchText: string
  priorityText: string
  date?: string
}

const DESKTOP_SEARCH_SELECTOR =
  'input[placeholder="Pretraži FERSYS..."]'

function normalize(
  value: string,
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLocaleLowerCase(
      'hr-HR',
    )
    .replace(
      /[^a-z0-9]+/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function searchScore(
  query: string,
  entry: SearchEntry,
) {
  const q =
    normalize(query)
  const text =
    normalize(
      entry.searchText,
    )
  const priority =
    normalize(
      entry.priorityText,
    )

  if (!q) {
    return 1
  }

  if (
    priority === q
  ) {
    return 1000
  }

  if (
    priority.startsWith(q)
  ) {
    return 900
  }

  if (
    priority.includes(q)
  ) {
    return 820
  }

  if (
    text.startsWith(q)
  ) {
    return 760
  }

  if (
    text.includes(q)
  ) {
    return 650
  }

  const tokens =
    q
      .split(' ')
      .filter(Boolean)

  const matched =
    tokens.filter(
      (token) =>
        text.includes(
          token,
        ),
    ).length

  if (
    matched ===
      tokens.length &&
    matched > 0
  ) {
    return (
      500 +
      matched * 20
    )
  }

  return 0
}

function customerEntry(
  customer: Customer,
): SearchEntry {
  const address =
    [
      customer.street,
      customer.postalCode,
      customer.city,
    ]
      .filter(Boolean)
      .join(', ')

  return {
    id: customer.id,
    kind: 'customer',
    title: customer.name,
    subtitle:
      address ||
      customer.contactPerson ||
      'Investitor',
    meta:
      [
        customer.phone,
        customer.email,
        customer.oib
          ? `OIB ${customer.oib}`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
    route:
      `/customers/${customer.id}`,
    priorityText:
      [
        customer.name,
        customer.oib,
        customer.phone,
      ]
        .filter(Boolean)
        .join(' '),
    searchText:
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
        .join(' '),
  }
}

function workOrderEntry(
  order: CloudWorkOrder,
): SearchEntry {
  return {
    id: order.id,
    kind: 'work-order',
    title:
      order.orderNumber,
    subtitle:
      [
        order.customerName,
        order.title,
      ]
        .filter(Boolean)
        .join(' · '),
    meta:
      [
        order.status,
        order.priority,
        order.address,
      ]
        .filter(Boolean)
        .join(' · '),
    route:
      `/work-orders/${order.id}`,
    priorityText:
      [
        order.orderNumber,
        order.customerName,
      ]
        .filter(Boolean)
        .join(' '),
    searchText:
      [
        order.orderNumber,
        order.customerName,
        order.customerOib,
        order.customerPhone,
        order.customerEmail,
        order.title,
        order.description,
        order.address,
        order.status,
        order.priority,
        order.date,
        ...order.materials.map(
          (material) =>
            material.name,
        ),
      ]
        .filter(Boolean)
        .join(' '),
    date: order.date,
  }
}

function offerEntry(
  offer: Offer,
): SearchEntry {
  return {
    id: offer.id,
    kind: 'offer',
    title:
      offer.offerNumber,
    subtitle:
      [
        offer.customerName,
        offer.description,
      ]
        .filter(Boolean)
        .join(' · '),
    meta:
      [
        offer.status,
        offer.oib
          ? `OIB ${offer.oib}`
          : '',
        offer.city,
      ]
        .filter(Boolean)
        .join(' · '),
    route:
      `/offers/${offer.id}`,
    priorityText:
      [
        offer.offerNumber,
        offer.customerName,
      ]
        .filter(Boolean)
        .join(' '),
    searchText:
      [
        offer.offerNumber,
        offer.customerName,
        offer.contactPerson,
        offer.oib,
        offer.email,
        offer.phone,
        offer.address,
        offer.city,
        offer.postalCode,
        offer.description,
        offer.internalNote,
        offer.customerNote,
        offer.status,
        ...offer.items.map(
          (item) =>
            [
              item.name,
              item.description,
            ].join(' '),
        ),
      ]
        .filter(Boolean)
        .join(' '),
    date: offer.date,
  }
}

function invoiceEntry(
  invoice: SearchInvoice,
): SearchEntry {
  return {
    id: invoice.id,
    kind: 'invoice',
    title:
      invoice.invoiceNumber,
    subtitle:
      invoice.customerName ||
      'Račun',
    meta:
      [
        invoice.status,
        invoice.city,
        invoice.oib
          ? `OIB ${invoice.oib}`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
    route:
      `/invoices/${invoice.id}/edit`,
    priorityText:
      [
        invoice.invoiceNumber,
        invoice.customerName,
      ]
        .filter(Boolean)
        .join(' '),
    searchText:
      [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.customerType,
        invoice.oib,
        invoice.email,
        invoice.phone,
        invoice.address,
        invoice.city,
        invoice.description,
        invoice.status,
        invoice.issueDate,
      ]
        .filter(Boolean)
        .join(' '),
    date:
      invoice.issueDate,
  }
}

function kindLabel(
  kind: SearchKind,
) {
  if (
    kind === 'customer'
  ) {
    return 'Investitor'
  }

  if (
    kind === 'work-order'
  ) {
    return 'Radni nalog'
  }

  if (
    kind === 'offer'
  ) {
    return 'Ponuda'
  }

  return 'Račun'
}

function kindIcon(
  kind: SearchKind,
) {
  if (
    kind === 'customer'
  ) {
    return (
      <UserRound
        size={18}
      />
    )
  }

  if (
    kind ===
    'work-order'
  ) {
    return (
      <Wrench
        size={18}
      />
    )
  }

  if (
    kind === 'offer'
  ) {
    return (
      <FileText
        size={18}
      />
    )
  }

  return (
    <ReceiptText
      size={18}
    />
  )
}

function kindClasses(
  kind: SearchKind,
) {
  if (
    kind === 'customer'
  ) {
    return 'bg-blue-500/10 text-blue-300'
  }

  if (
    kind ===
    'work-order'
  ) {
    return 'bg-amber-500/10 text-amber-300'
  }

  if (
    kind === 'offer'
  ) {
    return 'bg-violet-500/10 text-violet-300'
  }

  return 'bg-emerald-500/10 text-emerald-300'
}

export default function GlobalSearch() {
  const navigate =
    useNavigate()
  const { can } =
    useAuth()

  const [open, setOpen] =
    useState(false)
  const [query, setQuery] =
    useState('')
  const [loading, setLoading] =
    useState(false)
  const [error, setError] =
    useState('')
  const [entries, setEntries] =
    useState<SearchEntry[]>(
      [],
    )
  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0)

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const hasCustomerAccess =
    can('customers.view')
  const hasWorkOrderAccess =
    can('workOrders.view')
  const hasOfferAccess =
    can('offers.view')
  const hasInvoiceAccess =
    can('invoices.view')

  useEffect(() => {
    function openSearch() {
      setOpen(true)
    }

    function handleKeyboard(
      event: KeyboardEvent,
    ) {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          'k'
      ) {
        event.preventDefault()
        openSearch()
        return
      }

      if (
        event.key ===
          'Escape'
      ) {
        setOpen(false)
      }
    }

    function handlePointer(
      event: Event,
    ) {
      const target =
        event.target

      if (
        !(target instanceof
          HTMLInputElement)
      ) {
        return
      }

      if (
        !target.matches(
          DESKTOP_SEARCH_SELECTOR,
        )
      ) {
        return
      }

      event.preventDefault()
      target.blur()
      openSearch()
    }

    document.addEventListener(
      'keydown',
      handleKeyboard,
    )

    document.addEventListener(
      'pointerdown',
      handlePointer,
      true,
    )

    document.addEventListener(
      'focusin',
      handlePointer,
      true,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyboard,
      )

      document.removeEventListener(
        'pointerdown',
        handlePointer,
        true,
      )

      document.removeEventListener(
        'focusin',
        handlePointer,
        true,
      )
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          inputRef.current?.focus()
        },
      )

    return () => {
      window.cancelAnimationFrame(
        frame,
      )
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      document.body.style.overflow =
        ''
      return
    }

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [open])

  useEffect(() => {
    if (
      !open ||
      entries.length > 0 ||
      loading
    ) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        setLoading(true)
        setError('')

        const [
          customers,
          orders,
          offers,
          invoices,
        ] =
          await Promise.all([
            hasCustomerAccess
              ? getCustomers()
              : Promise.resolve(
                  [] as Customer[],
                ),
            hasWorkOrderAccess
              ? getWorkOrders()
              : Promise.resolve(
                  [] as CloudWorkOrder[],
                ),
            hasOfferAccess
              ? getOffers()
              : Promise.resolve(
                  [] as Offer[],
                ),
            hasInvoiceAccess
              ? getInvoices<SearchInvoice>()
              : Promise.resolve(
                  [] as SearchInvoice[],
                ),
          ])

        if (cancelled) {
          return
        }

        setEntries([
          ...customers
            .filter(
              (customer) =>
                customer.status ===
                'Aktivan',
            )
            .map(
              customerEntry,
            ),
          ...orders.map(
            workOrderEntry,
          ),
          ...offers.map(
            offerEntry,
          ),
          ...invoices.map(
            invoiceEntry,
          ),
        ])
      } catch (value) {
        if (!cancelled) {
          setError(
            value instanceof Error
              ? value.message
              : 'Pretragu trenutno nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    open,
    entries.length,
    loading,
    hasCustomerAccess,
    hasWorkOrderAccess,
    hasOfferAccess,
    hasInvoiceAccess,
  ])

  const results =
    useMemo(() => {
      const cleanQuery =
        query.trim()

      if (!cleanQuery) {
        return entries
          .slice()
          .sort(
            (a, b) =>
              String(
                b.date ?? '',
              ).localeCompare(
                String(
                  a.date ?? '',
                ),
              ),
          )
          .slice(0, 8)
      }

      return entries
        .map((entry) => ({
          entry,
          score:
            searchScore(
              cleanQuery,
              entry,
            ),
        }))
        .filter(
          (result) =>
            result.score > 0,
        )
        .sort(
          (a, b) =>
            b.score -
            a.score,
        )
        .slice(0, 20)
        .map(
          (result) =>
            result.entry,
        )
    }, [
      entries,
      query,
    ])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function openEntry(
    entry: SearchEntry,
  ) {
    close()
    navigate(entry.route)
  }

  function handleInputKeyDown(
    event:
      ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key ===
      'ArrowDown'
    ) {
      event.preventDefault()
      setActiveIndex(
        (current) =>
          Math.min(
            current + 1,
            Math.max(
              0,
              results.length -
                1,
            ),
          ),
      )
      return
    }

    if (
      event.key ===
      'ArrowUp'
    ) {
      event.preventDefault()
      setActiveIndex(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      )
      return
    }

    if (
      event.key ===
        'Enter' &&
      results[
        activeIndex
      ]
    ) {
      event.preventDefault()
      openEntry(
        results[
          activeIndex
        ],
      )
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="fixed left-4 top-[calc(0.65rem+env(safe-area-inset-top))] z-[38] grid h-11 w-11 place-items-center rounded-2xl text-slate-400 transition active:bg-slate-800 active:text-white md:hidden"
        aria-label="Pretraži FERSYS"
      >
        <Search size={21} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[150] bg-slate-950/75 p-0 backdrop-blur-md sm:p-5">
          <button
            type="button"
            className="absolute inset-0 hidden sm:block"
            onClick={close}
            aria-label="Zatvori pretragu"
          />

          <section className="relative mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden bg-slate-950 sm:mt-[8vh] sm:h-auto sm:max-h-[76vh] sm:rounded-[2rem] sm:border sm:border-slate-700 sm:bg-slate-900 sm:shadow-2xl sm:shadow-black/60">
            <div className="border-b border-slate-800 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"
                  />

                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) =>
                      setQuery(
                        event.target.value,
                      )
                    }
                    onKeyDown={
                      handleInputKeyDown
                    }
                    autoComplete="off"
                    placeholder="Investitor, broj naloga, ponuda, račun, adresa, telefon..."
                    className="h-13 w-full rounded-2xl border border-slate-700 bg-slate-900 pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:bg-slate-950"
                  />
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400 active:scale-95"
                  aria-label="Zatvori"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 px-1">
                <p className="text-[11px] font-bold text-slate-500">
                  Pretražuje sve dostupne FERSYS module
                </p>

                <span className="hidden rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-500 sm:inline">
                  Ctrl / ⌘ + K
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <SearchState
                  icon={
                    <Loader2
                      size={24}
                      className="animate-spin"
                    />
                  }
                  title="Učitavanje pretrage..."
                  description="Dohvaćam investitore, naloge, ponude i račune."
                />
              ) : error ? (
                <SearchState
                  icon={
                    <Search
                      size={24}
                    />
                  }
                  title="Pretraga nije dostupna"
                  description={error}
                />
              ) : results.length ===
                0 ? (
                <SearchState
                  icon={
                    <Search
                      size={24}
                    />
                  }
                  title="Nema rezultata"
                  description={`Nisam pronašao ništa za „${query.trim()}”.`}
                />
              ) : (
                <div className="space-y-1.5">
                  {!query.trim() && (
                    <div className="mb-3 flex items-center gap-2 px-2">
                      <Building2
                        size={15}
                        className="text-slate-600"
                      />
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                        Nedavno / brzo dostupno
                      </p>
                    </div>
                  )}

                  {results.map(
                    (
                      entry,
                      index,
                    ) => {
                      const active =
                        index ===
                        activeIndex

                      return (
                        <button
                          key={`${entry.kind}:${entry.id}`}
                          type="button"
                          onMouseEnter={() =>
                            setActiveIndex(
                              index,
                            )
                          }
                          onClick={() =>
                            openEntry(
                              entry,
                            )
                          }
                          className={`flex min-h-[76px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                            active
                              ? 'border-blue-500/35 bg-blue-500/10'
                              : 'border-transparent bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/80'
                          }`}
                        >
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${kindClasses(
                              entry.kind,
                            )}`}
                          >
                            {kindIcon(
                              entry.kind,
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-black text-white">
                                {
                                  entry.title
                                }
                              </span>

                              <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                {kindLabel(
                                  entry.kind,
                                )}
                              </span>
                            </span>

                            <span className="mt-1 block truncate text-xs font-semibold text-slate-400">
                              {
                                entry.subtitle
                              }
                            </span>

                            {entry.meta && (
                              <span className="mt-1 block truncate text-[10px] text-slate-600">
                                {
                                  entry.meta
                                }
                              </span>
                            )}
                          </span>

                          <span className={`shrink-0 text-lg ${active ? 'text-blue-400' : 'text-slate-700'}`}>
                            →
                          </span>
                        </button>
                      )
                    },
                  )}
                </div>
              )}
            </div>

            <div className="hidden border-t border-slate-800 px-4 py-3 sm:flex sm:items-center sm:gap-4">
              <KeyboardHint
                keyText="↑ ↓"
                text="odabir"
              />
              <KeyboardHint
                keyText="Enter"
                text="otvori"
              />
              <KeyboardHint
                keyText="Esc"
                text="zatvori"
              />
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function SearchState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="grid min-h-72 place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
          {icon}
        </span>

        <p className="mt-4 font-black text-white">
          {title}
        </p>

        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function KeyboardHint({
  keyText,
  text,
}: {
  keyText: string
  text: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
      <kbd className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-black text-slate-400">
        {keyText}
      </kbd>
      {text}
    </span>
  )
}
