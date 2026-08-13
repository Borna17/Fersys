import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  MapPin,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import {
  getInventoryItems,
  getInventoryLocations,
  type InventoryItem,
  type InventoryLocation,
} from '../services/inventory.service'

type StockFilter =
  | 'all'
  | 'available'
  | 'low'
  | 'empty'

function normalizeText(
  value: string,
) {
  return value
    .toLocaleLowerCase('hr-HR')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      maximumFractionDigits: 3,
    },
  ).format(value)
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

function getQuantityLabel(
  item: InventoryItem,
) {
  return `${formatNumber(
    item.quantity,
  )} ${item.unit}`
}

function getStockStatus(
  item: InventoryItem,
) {
  if (item.quantity <= 0) {
    return {
      label: 'Nema na stanju',
      className:
        'border-red-500/30 bg-red-500/10 text-red-300',
    }
  }

  if (
    item.minimumQuantity > 0 &&
    item.quantity <=
      item.minimumQuantity
  ) {
    return {
      label: 'Nisko stanje',
      className:
        'border-amber-500/30 bg-amber-500/10 text-amber-300',
    }
  }

  return {
    label: 'Na stanju',
    className:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  }
}

function getItemLocationText(
  item: InventoryItem,
) {
  const locations =
    item.locationStocks.filter(
      (stock) =>
        stock.quantity > 0,
    )

  if (
    locations.length === 0
  ) {
    return 'Lokacija nije određena'
  }

  if (
    locations.length === 1
  ) {
    return locations[0]
      .locationName
  }

  return `${locations[0].locationName} +${locations.length - 1}`
}

export function InventoryPage() {
  const navigate =
    useNavigate()

  const { can } =
    useAuth()

  const canViewCosts =
    can(
      'inventory.viewCosts',
    )

  const canManageInventory =
    can(
      'inventory.manage',
    )

  const [
    items,
    setItems,
  ] =
    useState<
      InventoryItem[]
    >([])

  const [
    locations,
    setLocations,
  ] =
    useState<
      InventoryLocation[]
    >([])

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)

  const [
    loadError,
    setLoadError,
  ] =
    useState('')

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState('')

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('all')

  const [
    locationFilter,
    setLocationFilter,
  ] =
    useState('all')

  const [
    stockFilter,
    setStockFilter,
  ] =
    useState<StockFilter>(
      'all',
    )

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(false)

  const loadInventoryData =
    useCallback(
      async () => {
        try {
          setLoadError('')

          const [
            savedItems,
            savedLocations,
          ] =
            await Promise.all([
              getInventoryItems(),
              getInventoryLocations(),
            ])

          setItems(savedItems)
          setLocations(
            savedLocations,
          )
        } catch (error) {
          setLoadError(
            error instanceof
              Error
              ? error.message
              : 'Skladište nije moguće učitati.',
          )
        } finally {
          setIsLoading(
            false,
          )
        }
      },
      [],
    )

  useEffect(() => {
    void loadInventoryData()

    function handleFocus() {
      void loadInventoryData()
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void loadInventoryData()
      }
    }

    window.addEventListener(
      'focus',
      handleFocus,
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [loadInventoryData])

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            items
              .map(
                (item) =>
                  item.category.trim(),
              )
              .filter(Boolean),
          ),
        ).sort(
          (a, b) =>
            a.localeCompare(
              b,
              'hr',
            ),
        ),
      [items],
    )

  const filteredItems =
    useMemo(() => {
      const search =
        normalizeText(
          searchTerm,
        )

      return items.filter(
        (item) => {
          const text =
            normalizeText(
              [
                item.name,
                item.shortName,
                item.code,
                item.barcode,
                item.category,
                item.subcategory,
                item.manufacturer,
                item.supplier,
                item.description,
                item.usageDescription,
                item.warningNote,
                item.diameter,
                item.dimension,
                ...item.alternativeNames,
              ].join(' '),
            )

          const isLow =
            item.minimumQuantity >
              0 &&
            item.quantity > 0 &&
            item.quantity <=
              item.minimumQuantity

          return (
            (!search ||
              text.includes(
                search,
              )) &&
            (categoryFilter ===
              'all' ||
              item.category ===
                categoryFilter) &&
            (locationFilter ===
              'all' ||
              item.locationStocks.some(
                (stock) =>
                  stock.locationId ===
                    locationFilter &&
                  stock.quantity > 0,
              )) &&
            (stockFilter ===
              'all' ||
              (stockFilter ===
                'available' &&
                item.quantity > 0 &&
                !isLow) ||
              (stockFilter ===
                'low' &&
                isLow) ||
              (stockFilter ===
                'empty' &&
                item.quantity <= 0))
          )
        },
      )
    }, [
      items,
      searchTerm,
      categoryFilter,
      locationFilter,
      stockFilter,
    ])

  const lowStockCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.minimumQuantity >
              0 &&
            item.quantity > 0 &&
            item.quantity <=
              item.minimumQuantity,
        ).length,
      [items],
    )

  const emptyStockCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.quantity <= 0,
        ).length,
      [items],
    )

  const totalValue =
    useMemo(
      () =>
        items.reduce(
          (sum, item) =>
            sum +
            item.quantity *
              item.purchasePrice,
          0,
        ),
      [items],
    )

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    locationFilter !== 'all' ||
    stockFilter !== 'all' ||
    searchTerm.trim() !== ''

  function clearFilters() {
    setSearchTerm('')
    setCategoryFilter('all')
    setLocationFilter('all')
    setStockFilter('all')
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje zajedničkog skladišta..."
      />
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-sky-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">
              SKLADIŠTE
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Zalihe
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Zajedničko stanje artikala za cijelu tvrtku.
            </p>
          </div>

          {canManageInventory && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/inventory/items/new',
                )
              }
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"
              aria-label="Novi artikl"
            >
              <Plus size={21} />
              <span className="hidden text-sm font-black sm:inline">
                Novi artikl
              </span>
            </button>
          )}
        </div>

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          <MetricButton
            label="Artikli"
            value={
              items.length
            }
            active={
              stockFilter ===
              'all'
            }
            onClick={() =>
              setStockFilter(
                'all',
              )
            }
          />

          <MetricButton
            label="Na stanju"
            value={
              items.filter(
                (item) =>
                  item.quantity >
                    0 &&
                  !(
                    item.minimumQuantity >
                      0 &&
                    item.quantity <=
                      item.minimumQuantity
                  ),
              ).length
            }
            active={
              stockFilter ===
              'available'
            }
            onClick={() =>
              setStockFilter(
                'available',
              )
            }
          />

          <MetricButton
            label="Nisko"
            value={
              lowStockCount
            }
            active={
              stockFilter ===
              'low'
            }
            onClick={() =>
              setStockFilter(
                'low',
              )
            }
          />

          <MetricButton
            label="Prazno"
            value={
              emptyStockCount
            }
            active={
              stockFilter ===
              'empty'
            }
            onClick={() =>
              setStockFilter(
                'empty',
              )
            }
          />
        </div>
      </section>

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-black">
              Skladište nije moguće učitati.
            </p>
            <p className="mt-1 text-sm">
              {loadError}
            </p>
          </div>
        </div>
      )}

      <section className={`grid gap-3 ${canViewCosts ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
        <SummaryCard
          label="Ukupno artikala"
          value={formatNumber(
            items.length,
          )}
          icon={
            <Boxes size={18} />
          }
        />

        <SummaryCard
          label="Nisko stanje"
          value={formatNumber(
            lowStockCount,
          )}
          icon={
            <AlertTriangle
              size={18}
            />
          }
        />

        <SummaryCard
          label="Nema na stanju"
          value={formatNumber(
            emptyStockCount,
          )}
          icon={
            <ArrowUpFromLine
              size={18}
            />
          }
        />

        {canViewCosts && (
          <SummaryCard
            label="Vrijednost zalihe"
            value={formatCurrency(
              totalValue,
            )}
            icon={
              <Warehouse
                size={18}
              />
            }
          />
        )}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <QuickAction
          label="QR skener"
          icon={
            <QrCode size={19} />
          }
          onClick={() =>
            navigate(
              '/inventory/scan',
            )
          }
        />

        <QuickAction
          label="Prometi robe"
          icon={
            <ArrowDownToLine
              size={19}
            />
          }
          onClick={() =>
            navigate(
              '/inventory/movements',
            )
          }
        />

        <QuickAction
          label="Osvježi"
          icon={
            <RefreshCw
              size={19}
            />
          }
          onClick={() =>
            void loadInventoryData()
          }
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
        <div className="relative">
          <Search
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-400"
          />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            placeholder="Naziv, šifra, barkod, dimenzija..."
            className="h-12 w-full rounded-2xl bg-slate-800 pl-11 pr-11 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm('')
              }
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (current) =>
                  !current,
              )
            }
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black ${
              showFilters ||
              hasActiveFilters
                ? 'bg-sky-500/10 text-sky-300'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            <SlidersHorizontal
              size={16}
            />
            Filtri
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="min-h-11 rounded-xl bg-slate-800 px-4 text-xs font-black text-slate-300"
            >
              Očisti
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-3">
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value,
                )
              }
              className="h-11 rounded-xl bg-slate-800 px-3 text-sm text-white"
            >
              <option value="all">
                Sve kategorije
              </option>
              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>

            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value,
                )
              }
              className="h-11 rounded-xl bg-slate-800 px-3 text-sm text-white"
            >
              <option value="all">
                Sve lokacije
              </option>
              {locations.map(
                (location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name}
                  </option>
                ),
              )}
            </select>

            <select
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(
                  event.target
                    .value as StockFilter,
                )
              }
              className="h-11 rounded-xl bg-slate-800 px-3 text-sm text-white"
            >
              <option value="all">
                Sva stanja
              </option>
              <option value="available">
                Na stanju
              </option>
              <option value="low">
                Nisko stanje
              </option>
              <option value="empty">
                Nema na stanju
              </option>
            </select>
          </div>
        )}
      </section>

      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          ARTIKLI
        </p>

        <h2 className="mt-1 text-lg font-black text-white">
          {filteredItems.length}{' '}
          prikazano
        </h2>
      </div>

      {filteredItems.length ===
      0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center">
          <Package
            size={34}
            className="mx-auto text-slate-600"
          />

          <p className="mt-4 font-black text-white">
            Nema pronađenih artikala
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Promijeni pretragu ili filtre.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map(
            (item) => {
              const status =
                getStockStatus(
                  item,
                )

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/inventory/items/${item.id}`,
                    )
                  }
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-left active:scale-[0.99]"
                >
                  <div className="flex gap-3 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-800">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-600">
                          <Package
                            size={26}
                          />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">
                            {item.name}
                          </p>

                          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wider text-sky-400">
                            {item.code ||
                              'Bez šifre'}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${status.className}`}
                        >
                          {
                            status.label
                          }
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <SmallInfo
                          label="Stanje"
                          value={getQuantityLabel(
                            item,
                          )}
                        />

                        <SmallInfo
                          label="Minimum"
                          value={`${formatNumber(
                            item.minimumQuantity,
                          )} ${item.unit}`}
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin
                          size={13}
                        />
                        <span className="truncate">
                          {getItemLocationText(
                            item,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            },
          )}
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
      className={`min-w-0 rounded-2xl border px-2 py-3 text-center active:scale-[0.98] ${
        active
          ? 'border-sky-500/40 bg-sky-500/10'
          : 'border-white/5 bg-white/[0.035]'
      }`}
    >
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </button>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-lg font-black text-white">
            {value}
          </p>
        </div>

        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-300">
          {icon}
        </span>
      </div>
    </div>
  )
}

function QuickAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 text-xs font-black text-slate-200 active:scale-[0.98]"
    >
      <span className="text-sky-300">
        {icon}
      </span>
      {label}
    </button>
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
    <div className="min-w-0 rounded-xl bg-slate-950/50 p-2.5">
      <p className="truncate text-[8px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] font-black text-white">
        {value}
      </p>
    </div>
  )
}
