import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Grid2X2,
  List,
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

type InventoryViewMode = 'cards' | 'table'
type StockFilter = 'all' | 'available' | 'low' | 'empty'

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('hr-HR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function getTrackingTypeLabel(item: InventoryItem): string {
  if (item.trackingType === 'metres') {
    return 'Praćenje u metrima'
  }

  if (item.trackingType === 'piece-length') {
    return 'Komadi s dužinom'
  }

  return 'Praćenje u komadima'
}

function getQuantityLabel(item: InventoryItem): string {
  return `${formatNumber(item.quantity)} ${item.unit}`
}

function getStockStatus(item: InventoryItem): {
  label: string
  className: string
} {
  if (item.quantity <= 0) {
    return {
      label: 'Nema na stanju',
      className:
        'border-red-500/30 bg-red-500/10 text-red-300',
    }
  }

  if (
    item.minimumQuantity > 0 &&
    item.quantity <= item.minimumQuantity
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

function getItemLocationText(item: InventoryItem): string {
  const locationsWithStock = item.locationStocks.filter(
    (stock) => stock.quantity > 0,
  )

  if (locationsWithStock.length === 0) {
    return 'Lokacija nije određena'
  }

  if (locationsWithStock.length === 1) {
    return locationsWithStock[0].locationName
  }

  return `${locationsWithStock[0].locationName} +${
    locationsWithStock.length - 1
  }`
}

function InventoryStatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sky-400">
          {icon}
        </div>
      </div>
    </div>
  )
}

function InventoryItemImage({
  item,
}: {
  item: InventoryItem
}) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.name}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-500">
      <Package size={34} />
    </div>
  )
}

export function InventoryPage() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewCosts = can('inventory.viewCosts')
  const canManageInventory = can('inventory.manage')

  const [items, setItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [stockFilter, setStockFilter] =
    useState<StockFilter>('all')
  const [viewMode, setViewMode] =
    useState<InventoryViewMode>('cards')
  const [showFilters, setShowFilters] = useState(false)

  const loadInventoryData = useCallback(async () => {
    try {
      setLoadError('')

      const [savedItems, savedLocations] =
        await Promise.all([
          getInventoryItems(),
          getInventoryLocations(),
        ])

      setItems(savedItems)
      setLocations(savedLocations)
    } catch (error) {
      console.error(
        'Skladište nije moguće učitati:',
        error,
      )

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Skladište nije moguće učitati.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInventoryData()

    function handleFocus() {
      void loadInventoryData()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadInventoryData()
      }
    }

    window.addEventListener('focus', handleFocus)

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener('focus', handleFocus)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [loadInventoryData])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.category.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, 'hr')),
    [items],
  )

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    return items.filter((item) => {
      const searchableText = normalizeText(
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

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch)

      const matchesCategory =
        categoryFilter === 'all' ||
        item.category === categoryFilter

      const matchesLocation =
        locationFilter === 'all' ||
        item.locationStocks.some(
          (stock) =>
            stock.locationId === locationFilter &&
            stock.quantity > 0,
        )

      const isLowStock =
        item.minimumQuantity > 0 &&
        item.quantity > 0 &&
        item.quantity <= item.minimumQuantity

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'available' &&
          item.quantity > 0 &&
          !isLowStock) ||
        (stockFilter === 'low' && isLowStock) ||
        (stockFilter === 'empty' &&
          item.quantity <= 0)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesStock
      )
    })
  }, [
    items,
    searchTerm,
    categoryFilter,
    locationFilter,
    stockFilter,
  ])

  const lowStockCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.minimumQuantity > 0 &&
          item.quantity > 0 &&
          item.quantity <= item.minimumQuantity,
      ).length,
    [items],
  )

  const emptyStockCount = useMemo(
    () => items.filter((item) => item.quantity <= 0).length,
    [items],
  )

  const totalValue = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.quantity * item.purchasePrice,
        0,
      ),
    [items],
  )

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    categoryFilter !== 'all' ||
    locationFilter !== 'all' ||
    stockFilter !== 'all'

  function clearFilters() {
    setSearchTerm('')
    setCategoryFilter('all')
    setLocationFilter('all')
    setStockFilter('all')
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje zajedničkog skladišta..." />
    )
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
              <Warehouse size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Skladište
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Zajedničko stanje artikala za cijelu tvrtku
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadInventoryData()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <RefreshCw size={18} />
              Osvježi
            </button>

            <button
              type="button"
              onClick={() => navigate('/inventory/scan')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <QrCode size={18} />
              Skeniraj QR
            </button>

            <button
              type="button"
              onClick={() => navigate('/inventory/movements')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              <ArrowDownToLine size={18} />
              Prometi robe
            </button>

            {canManageInventory && (
              <button
                type="button"
                onClick={() =>
                  navigate('/inventory/items/new')
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                <Plus size={18} />
                Novi artikl
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Skladište nije moguće učitati.
              </p>

              <p className="mt-1 break-words text-sm">
                {loadError}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-sky-500/20 bg-slate-900/90 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">
                Brza pretraga materijala
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Upiši naziv, šifru, barkod, dimenziju ili proizvođača i odmah vidi stanje.
              </p>
            </div>

            <div className="relative w-full lg:max-w-2xl">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-400"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Npr. spojnica 22, bakrena cijev, ART-00001..."
                className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 pl-12 pr-12 text-base font-semibold text-white outline-none transition placeholder:font-normal placeholder:text-slate-600 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Očisti pretragu"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {searchTerm.trim() && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Rezultati
                </p>

                <p className="text-xs text-slate-500">
                  Pronađeno: <span className="font-bold text-white">{filteredItems.length}</span>
                </p>
              </div>

              {filteredItems.length === 0 ? (
                <div className="rounded-xl bg-slate-950/70 p-4 text-sm text-slate-500">
                  Nema materijala koji odgovara pretrazi.
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.slice(0, 6).map((item) => {
                    const status = getStockStatus(item)

                    return (
                      <button
                        key={`quick-${item.id}`}
                        type="button"
                        onClick={() =>
                          navigate(`/inventory/items/${item.id}`)
                        }
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-sky-500/40 hover:bg-slate-800/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {item.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {item.code || 'Bez šifre'}
                            {item.dimension ? ` · ${item.dimension}` : ''}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-lg font-black text-white">
                            {getQuantityLabel(item)}
                          </p>

                          <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {filteredItems.length > 6 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Prikazano prvih 6 rezultata. Svi rezultati su prikazani niže na stranici.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InventoryStatCard
            title="Ukupno artikala"
            value={formatNumber(items.length)}
            description="Različitih artikala u sustavu"
            icon={<Boxes size={22} />}
          />

          <InventoryStatCard
            title="Nisko stanje"
            value={formatNumber(lowStockCount)}
            description="Artikli na minimumu ili ispod njega"
            icon={<AlertTriangle size={22} />}
          />

          <InventoryStatCard
            title="Nema na stanju"
            value={formatNumber(emptyStockCount)}
            description="Artikli s trenutnim stanjem nula"
            icon={<ArrowUpFromLine size={22} />}
          />

          {canViewCosts && (
            <InventoryStatCard
              title="Vrijednost zalihe"
              value={formatCurrency(totalValue)}
              description="Prema nabavnim cijenama"
              icon={<Warehouse size={22} />}
            />
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Filtriraj prikaz artikala..."
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-11 text-sm text-white outline-none focus:border-sky-500"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowFilters((current) => !current)
                }
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
                  showFilters || hasActiveFilters
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300'
                }`}
              >
                <SlidersHorizontal size={18} />
                Filtri
              </button>

              <div className="flex h-12 items-center rounded-xl border border-slate-700 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex h-9 w-10 items-center justify-center rounded-lg ${
                    viewMode === 'cards'
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-500'
                  }`}
                >
                  <Grid2X2 size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex h-9 w-10 items-center justify-center rounded-lg ${
                    viewMode === 'table'
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-500'
                  }`}
                >
                  <List size={19} />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2 xl:grid-cols-4">
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
              >
                <option value="all">
                  Sve kategorije
                </option>

                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
              >
                <option value="all">
                  Sve lokacije
                </option>

                {locations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name}
                  </option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(
                    event.target.value as StockFilter,
                  )
                }
                className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
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

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                Očisti filtre
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 text-sm text-slate-400">
          Prikazano{' '}
          <span className="font-semibold text-white">
            {filteredItems.length}
          </span>{' '}
          od{' '}
          <span className="font-semibold text-white">
            {items.length}
          </span>{' '}
          artikala
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-4 flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 text-center">
            <Package
              size={42}
              className="text-slate-600"
            />

            <h2 className="mt-4 text-xl font-semibold text-white">
              {hasActiveFilters
                ? 'Nema pronađenih artikala'
                : 'Skladište je prazno'}
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-400">
              {hasActiveFilters
                ? 'Promijeni filtre ili pretragu.'
                : 'Dodaj prvi artikl u zajedničko skladište firme.'}
            </p>

            {canManageInventory && !hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  navigate('/inventory/items/new')
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-white"
              >
                <Plus size={17} />
                Dodaj artikl
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredItems.map((item) => {
              const status = getStockStatus(item)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    navigate(`/inventory/items/${item.id}`)
                  }
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left transition hover:border-slate-700"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                    <InventoryItemImage item={item} />

                    <span
                      className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>

                    {item.code && (
                      <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2.5 py-1 text-xs text-slate-200">
                        {item.code}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-white">
                      {item.name}
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-800/80 p-3">
                        <p className="text-xs text-slate-500">
                          Stanje
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {getQuantityLabel(item)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-800/80 p-3">
                        <p className="text-xs text-slate-500">
                          Minimum
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {formatNumber(item.minimumQuantity)}{' '}
                          {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                      <MapPin size={15} />
                      <span className="truncate">
                        {getItemLocationText(item)}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="px-5 py-4">Artikl</th>
                  <th className="px-5 py-4">Šifra</th>
                  <th className="px-5 py-4">Lokacija</th>
                  <th className="px-5 py-4">Stanje</th>
                  <th className="px-5 py-4">Praćenje</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() =>
                      navigate(`/inventory/items/${item.id}`)
                    }
                    className="cursor-pointer hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4 font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {item.code || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {getItemLocationText(item)}
                    </td>
                    <td className="px-5 py-4 font-bold text-white">
                      {getQuantityLabel(item)}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {getTrackingTypeLabel(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryPage