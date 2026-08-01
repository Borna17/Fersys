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
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import {
  getInventoryItems,
  getInventoryLocations,
  type InventoryItem,
  type InventoryLocation,
} from '../utils/inventoryStorage'

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

function getTotalInventoryValue(items: InventoryItem[]): number {
  return items.reduce((total, item) => {
    return total + item.quantity * item.purchasePrice
  }, 0)
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

function InventoryEmptyState({
  hasFilters,
  onClearFilters,
  onCreateItem,
}: {
  hasFilters: boolean
  onClearFilters: () => void
  onCreateItem: () => void
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
        <Package size={30} />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-white">
        {hasFilters
          ? 'Nema pronađenih artikala'
          : 'Skladište je trenutno prazno'}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {hasFilters
          ? 'Pokušaj promijeniti pojam pretrage ili ukloniti odabrane filtre.'
          : 'Dodaj prvi artikl, fotografiju, stanje, lokaciju i podatke potrebne za praćenje skladišta.'}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            <X size={17} />
            Očisti filtre
          </button>
        )}

        <button
          type="button"
          onClick={onCreateItem}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          <Plus size={17} />
          Dodaj artikl
        </button>
      </div>
    </div>
  )
}

function InventoryItemImage({
  item,
  className = '',
}: {
  item: InventoryItem
  className?: string
}) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.name}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-slate-800 text-slate-500 ${className}`}
    >
      <Package size={34} />
    </div>
  )
}

function InventoryCard({
  item,
  onOpen,
}: {
  item: InventoryItem
  onOpen: () => void
}) {
  const stockStatus = getStockStatus(item)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl hover:shadow-black/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
        <InventoryItemImage
          item={item}
          className="transition duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur ${stockStatus.className}`}
          >
            {stockStatus.label}
          </span>
        </div>

        {item.code && (
          <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur">
            {item.code}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="min-h-[52px]">
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-white">
            {item.name}
          </h3>

          {(item.dimension || item.diameter) && (
            <p className="mt-1 line-clamp-1 text-sm text-slate-400">
              {[item.diameter, item.dimension]
                .filter(Boolean)
                .join(' • ')}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-800/80 p-3">
            <p className="text-xs text-slate-500">
              Trenutno stanje
            </p>

            <p className="mt-1 text-base font-bold text-white">
              {getQuantityLabel(item)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-800/80 p-3">
            <p className="text-xs text-slate-500">
              Minimalno
            </p>

            <p className="mt-1 text-base font-bold text-white">
              {formatNumber(item.minimumQuantity)} {item.unit}
            </p>
          </div>
        </div>

        {item.trackingType === 'piece-length' && (
          <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
            <p className="text-xs text-sky-300">
              Ukupna metraža
            </p>

            <p className="mt-0.5 font-semibold text-sky-100">
              {formatNumber(item.totalMetres)} m
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <MapPin size={15} className="shrink-0" />

          <span className="truncate">
            {getItemLocationText(item)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-500">
            {item.category || 'Bez kategorije'}
          </span>

          <span className="text-sm font-semibold text-sky-400 transition group-hover:text-sky-300">
            Otvori artikl
          </span>
        </div>
      </div>
    </button>
  )
}

export function InventoryPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<
    InventoryLocation[]
  >([])

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] =
    useState('all')
  const [locationFilter, setLocationFilter] =
    useState('all')
  const [stockFilter, setStockFilter] =
    useState<StockFilter>('all')
  const [viewMode, setViewMode] =
    useState<InventoryViewMode>('cards')
  const [showFilters, setShowFilters] =
    useState(false)

  function loadInventoryData() {
    setItems(getInventoryItems())
    setLocations(getInventoryLocations())
  }

  useEffect(() => {
    loadInventoryData()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadInventoryData()
      }
    }

    function handleStorageChange() {
      loadInventoryData()
    }

    window.addEventListener('focus', loadInventoryData)
    window.addEventListener(
      'storage',
      handleStorageChange,
    )
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener(
        'focus',
        loadInventoryData,
      )
      window.removeEventListener(
        'storage',
        handleStorageChange,
      )
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [])

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.category.trim())
          .filter(Boolean),
      ),
    ).sort((first, second) =>
      first.localeCompare(second, 'hr'),
    )
  }, [items])

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

  const lowStockCount = useMemo(() => {
    return items.filter(
      (item) =>
        item.minimumQuantity > 0 &&
        item.quantity <= item.minimumQuantity,
    ).length
  }, [items])

  const emptyStockCount = useMemo(() => {
    return items.filter((item) => item.quantity <= 0)
      .length
  }, [items])

  const totalValue = useMemo(() => {
    return getTotalInventoryValue(items)
  }, [items])

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

  function openItem(itemId: string) {
    navigate(`/inventory/items/${itemId}`)
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
                <Warehouse size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  Skladište
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Artikli, fotografije, QR kodovi i
                  praćenje stanja materijala
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate('/inventory/scan')
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <QrCode size={18} />
              Skeniraj QR
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/inventory/movements')
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <ArrowDownToLine size={18} />
              Prometi robe
            </button>

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
          </div>
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

          <InventoryStatCard
            title="Vrijednost zalihe"
            value={formatCurrency(totalValue)}
            description="Prema unesenim nabavnim cijenama"
            icon={<Warehouse size={22} />}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm sm:p-5">
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
                placeholder="Pretraži naziv, šifru, dimenziju, kategoriju, proizvođača..."
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Očisti pretragu"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
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
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                  showFilters || hasActiveFilters
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal size={18} />
                Filtri

                {hasActiveFilters && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
                    {
                      [
                        searchTerm.trim() !== '',
                        categoryFilter !== 'all',
                        locationFilter !== 'all',
                        stockFilter !== 'all',
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>

              <div className="flex h-12 items-center rounded-xl border border-slate-700 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  aria-label="Prikaz kartica"
                  className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
                    viewMode === 'cards'
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Grid2X2 size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Tablični prikaz"
                  className={`flex h-9 w-10 items-center justify-center rounded-lg transition ${
                    viewMode === 'table'
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <List size={19} />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kategorija
                </span>

                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
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
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lokacija
                </span>

                <select
                  value={locationFilter}
                  onChange={(event) =>
                    setLocationFilter(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
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
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Stanje
                </span>

                <select
                  value={stockFilter}
                  onChange={(event) =>
                    setStockFilter(
                      event.target
                        .value as StockFilter,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
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
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={17} />
                  Očisti filtre
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Prikazano{' '}
            <span className="font-semibold text-white">
              {filteredItems.length}
            </span>{' '}
            od{' '}
            <span className="font-semibold text-white">
              {items.length}
            </span>{' '}
            artikala
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 self-start text-sm font-semibold text-sky-400 transition hover:text-sky-300 sm:self-auto"
            >
              <X size={15} />
              Ukloni sve filtre
            </button>
          )}
        </div>

        <div className="mt-4">
          {filteredItems.length === 0 ? (
            <InventoryEmptyState
              hasFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              onCreateItem={() =>
                navigate('/inventory/items/new')
              }
            />
          ) : viewMode === 'cards' ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onOpen={() => openItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Artikl
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Šifra
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kategorija
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Lokacija
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Stanje
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {filteredItems.map((item) => {
                      const status =
                        getStockStatus(item)

                      return (
                        <tr
                          key={item.id}
                          onClick={() =>
                            openItem(item.id)
                          }
                          className="cursor-pointer transition hover:bg-slate-800/60"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[260px] items-center gap-4">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                                <InventoryItemImage
                                  item={item}
                                />
                              </div>

                              <div>
                                <p className="font-semibold text-white">
                                  {item.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {getTrackingTypeLabel(
                                    item,
                                  )}
                                </p>

                                {item.trackingType ===
                                  'piece-length' && (
                                  <p className="mt-1 text-xs font-medium text-sky-400">
                                    Ukupno{' '}
                                    {formatNumber(
                                      item.totalMetres,
                                    )}{' '}
                                    m
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                            {item.code || '—'}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                            {item.category ||
                              'Bez kategorije'}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-300">
                            <div className="flex min-w-[180px] items-center gap-2">
                              <MapPin
                                size={15}
                                className="shrink-0 text-slate-500"
                              />

                              <span className="truncate">
                                {getItemLocationText(
                                  item,
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <p className="font-bold text-white">
                              {getQuantityLabel(item)}
                            </p>

                            {item.minimumQuantity >
                              0 && (
                              <p className="mt-1 text-xs text-slate-500">
                                Minimum{' '}
                                {formatNumber(
                                  item.minimumQuantity,
                                )}{' '}
                                {item.unit}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InventoryPage
