import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUp,
  CalendarDays,
  ClipboardList,
  FileText,
  Filter,
  History,
  MapPin,
  Package,
  RefreshCw,
  Search,
  User,
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
  getInventoryMovementsByItemId,
  type InventoryItem,
  type InventoryMovement,
} from '../utils/inventoryStorage'

type MovementTypeFilter =
  | 'all'
  | 'entry'
  | 'exit'
  | 'transfer'
  | 'adjustment'

interface MovementWithItem {
  movement: InventoryMovement
  item: InventoryItem
}

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

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('hr-HR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(
    2,
    '0',
  )
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getMovementLabel(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return 'Ulaz robe'
  }

  if (movement.type === 'exit') {
    return 'Izlaz robe'
  }

  if (movement.type === 'transfer') {
    return 'Premještaj'
  }

  return 'Ispravak stanja'
}

function getMovementPrefix(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return '+'
  }

  if (movement.type === 'exit') {
    return '−'
  }

  return ''
}

function getMovementIcon(
  movement: InventoryMovement,
) {
  if (movement.type === 'entry') {
    return <ArrowUp size={19} />
  }

  if (movement.type === 'exit') {
    return <ArrowDown size={19} />
  }

  if (movement.type === 'transfer') {
    return <ArrowRightLeft size={19} />
  }

  return <RefreshCw size={19} />
}

function getMovementStyle(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  }

  if (movement.type === 'exit') {
    return 'border-red-500/30 bg-red-500/10 text-red-300'
  }

  if (movement.type === 'transfer') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
}

function getQuantityTextClass(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') {
    return 'text-emerald-300'
  }

  if (movement.type === 'exit') {
    return 'text-red-300'
  }

  if (movement.type === 'transfer') {
    return 'text-sky-300'
  }

  return 'text-amber-300'
}

function MovementStatCard({
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
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

export function InventoryMovementsPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<InventoryItem[]>(
    [],
  )

  const [movements, setMovements] = useState<
    MovementWithItem[]
  >([])

  const [searchTerm, setSearchTerm] = useState('')
  const [movementType, setMovementType] =
    useState<MovementTypeFilter>('all')
  const [itemFilter, setItemFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] =
    useState('all')
  const [locationFilter, setLocationFilter] =
    useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] =
    useState(false)

  function loadMovements() {
    const savedItems = getInventoryItems()

    const allMovements = savedItems.flatMap((item) =>
      getInventoryMovementsByItemId(item.id).map(
        (movement) => ({
          movement,
          item,
        }),
      ),
    )

    allMovements.sort((first, second) => {
      return (
        new Date(second.movement.createdAt).getTime() -
        new Date(first.movement.createdAt).getTime()
      )
    })

    setItems(savedItems)
    setMovements(allMovements)
  }

  useEffect(() => {
    loadMovements()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadMovements()
      }
    }

    window.addEventListener('focus', loadMovements)
    window.addEventListener('storage', loadMovements)
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener(
        'focus',
        loadMovements,
      )
      window.removeEventListener(
        'storage',
        loadMovements,
      )
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [])

  const employees = useMemo(() => {
    return Array.from(
      new Set(
        movements
          .map(({ movement }) =>
            movement.employeeName?.trim(),
          )
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    ).sort((first, second) =>
      first.localeCompare(second, 'hr'),
    )
  }, [movements])

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        movements
          .map(({ movement }) =>
            movement.locationName?.trim(),
          )
          .filter(
            (value): value is string => Boolean(value),
          ),
      ),
    ).sort((first, second) =>
      first.localeCompare(second, 'hr'),
    )
  }, [movements])

  const filteredMovements = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    const startDate = dateFrom
      ? new Date(`${dateFrom}T00:00:00`)
      : null

    const endDate = dateTo
      ? new Date(`${dateTo}T23:59:59`)
      : null

    return movements.filter(({ movement, item }) => {
      const searchableText = normalizeText(
        [
          item.name,
          item.shortName,
          item.code,
          item.barcode,
          item.category,
          movement.employeeName,
          movement.locationName,
          movement.workOrderNumber,
          movement.incomingInvoiceNumber,
          movement.note,
          getMovementLabel(movement),
        ]
          .filter(Boolean)
          .join(' '),
      )

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch)

      const matchesType =
        movementType === 'all' ||
        movement.type === movementType

      const matchesItem =
        itemFilter === 'all' ||
        item.id === itemFilter

      const matchesEmployee =
        employeeFilter === 'all' ||
        movement.employeeName === employeeFilter

      const matchesLocation =
        locationFilter === 'all' ||
        movement.locationName === locationFilter

      const movementDate = new Date(
        movement.createdAt,
      )

      const matchesDateFrom =
        !startDate || movementDate >= startDate

      const matchesDateTo =
        !endDate || movementDate <= endDate

      return (
        matchesSearch &&
        matchesType &&
        matchesItem &&
        matchesEmployee &&
        matchesLocation &&
        matchesDateFrom &&
        matchesDateTo
      )
    })
  }, [
    movements,
    searchTerm,
    movementType,
    itemFilter,
    employeeFilter,
    locationFilter,
    dateFrom,
    dateTo,
  ])

  const entryCount = useMemo(() => {
    return movements.filter(
      ({ movement }) => movement.type === 'entry',
    ).length
  }, [movements])

  const exitCount = useMemo(() => {
    return movements.filter(
      ({ movement }) => movement.type === 'exit',
    ).length
  }, [movements])

  const transferCount = useMemo(() => {
    return movements.filter(
      ({ movement }) => movement.type === 'transfer',
    ).length
  }, [movements])

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    movementType !== 'all' ||
    itemFilter !== 'all' ||
    employeeFilter !== 'all' ||
    locationFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  function clearFilters() {
    setSearchTerm('')
    setMovementType('all')
    setItemFilter('all')
    setEmployeeFilter('all')
    setLocationFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  function setTodayFilter() {
    const today = formatDateInputValue(new Date())

    setDateFrom(today)
    setDateTo(today)
  }

  function setLastSevenDaysFilter() {
    const today = new Date()
    const sevenDaysAgo = new Date()

    sevenDaysAgo.setDate(today.getDate() - 6)

    setDateFrom(formatDateInputValue(sevenDaysAgo))
    setDateTo(formatDateInputValue(today))
  }

  function setCurrentMonthFilter() {
    const today = new Date()
    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    )

    setDateFrom(formatDateInputValue(firstDay))
    setDateTo(formatDateInputValue(today))
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              aria-label="Povratak u skladište"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Prometi robe
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Pregled svih ulaza, izlaza, premještaja i
                promjena stanja skladišta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadMovements}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <RefreshCw size={18} />
            Osvježi podatke
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MovementStatCard
            title="Ukupno prometa"
            value={formatNumber(movements.length)}
            description="Sve evidentirane promjene stanja"
            icon={<History size={22} />}
          />

          <MovementStatCard
            title="Ulazi robe"
            value={formatNumber(entryCount)}
            description="Dodavanja materijala na stanje"
            icon={<ArrowUp size={22} />}
          />

          <MovementStatCard
            title="Izlazi robe"
            value={formatNumber(exitCount)}
            description="Materijal uzet iz skladišta"
            icon={<ArrowDown size={22} />}
          />

          <MovementStatCard
            title="Premještaji"
            value={formatNumber(transferCount)}
            description="Premještanja između lokacija"
            icon={<ArrowRightLeft size={22} />}
          />
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
                placeholder="Pretraži artikl, šifru, radnika, nalog, račun ili napomenu..."
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Očisti pretragu"
                >
                  <X size={17} />
                </button>
              )}
            </div>

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
              <Filter size={18} />
              Filtri

              {hasActiveFilters && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
                  {
                    [
                      searchTerm.trim() !== '',
                      movementType !== 'all',
                      itemFilter !== 'all',
                      employeeFilter !== 'all',
                      locationFilter !== 'all',
                      dateFrom !== '',
                      dateTo !== '',
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vrsta prometa
                  </span>

                  <select
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(
                        event.target
                          .value as MovementTypeFilter,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="all">
                      Sve vrste
                    </option>
                    <option value="entry">
                      Ulaz robe
                    </option>
                    <option value="exit">
                      Izlaz robe
                    </option>
                    <option value="transfer">
                      Premještaj
                    </option>
                    <option value="adjustment">
                      Ispravak stanja
                    </option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Artikl
                  </span>

                  <select
                    value={itemFilter}
                    onChange={(event) =>
                      setItemFilter(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="all">
                      Svi artikli
                    </option>

                    {items.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Radnik
                  </span>

                  <select
                    value={employeeFilter}
                    onChange={(event) =>
                      setEmployeeFilter(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="all">
                      Svi radnici
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={employee}
                        value={employee}
                      >
                        {employee}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
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
                        key={location}
                        value={location}
                      >
                        {location}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Datum od
                  </span>

                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) =>
                      setDateFrom(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Datum do
                  </span>

                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) =>
                      setDateTo(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-500"
                  />
                </label>

                <div className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Brzi odabir datuma
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={setTodayFilter}
                      className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Danas
                    </button>

                    <button
                      type="button"
                      onClick={setLastSevenDaysFilter}
                      className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Zadnjih 7 dana
                    </button>

                    <button
                      type="button"
                      onClick={setCurrentMonthFilter}
                      className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                    >
                      Ovaj mjesec
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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
              {filteredMovements.length}
            </span>{' '}
            od{' '}
            <span className="font-semibold text-white">
              {movements.length}
            </span>{' '}
            prometa
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
          {filteredMovements.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                <ClipboardList size={30} />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-white">
                {hasActiveFilters
                  ? 'Nema prometa prema odabranim filtrima'
                  : 'Još nema evidentiranih prometa'}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                {hasActiveFilters
                  ? 'Promijeni pojam pretrage, datum ili ukloni filtre.'
                  : 'Prometi će se pojaviti kada na detaljima artikla dodaš ili skineš materijal sa stanja.'}
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  <X size={17} />
                  Očisti filtre
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMovements.map(
                ({ movement, item }) => (
                  <button
                    key={`${item.id}-${movement.id}`}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/inventory/items/${item.id}`,
                      )
                    }
                    className="block w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${getMovementStyle(
                            movement,
                          )}`}
                        >
                          {getMovementIcon(movement)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {item.name}
                            </h3>

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getMovementStyle(
                                movement,
                              )}`}
                            >
                              {getMovementLabel(movement)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              {formatDateTime(
                                movement.createdAt,
                              )}
                            </span>

                            {item.code && (
                              <span className="flex items-center gap-1.5">
                                <Package size={14} />
                                {item.code}
                              </span>
                            )}

                            {movement.locationName && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={14} />
                                {movement.locationName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
                        <p
                          className={`text-2xl font-bold ${getQuantityTextClass(
                            movement,
                          )}`}
                        >
                          {getMovementPrefix(movement)}
                          {formatNumber(
                            movement.quantity,
                          )}{' '}
                          {item.unit}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Novo stanje:{' '}
                          {formatNumber(
                            movement.newQuantity,
                          )}{' '}
                          {item.unit}
                        </p>
                      </div>
                    </div>

                    {(movement.employeeName ||
                      movement.workOrderNumber ||
                      movement.incomingInvoiceNumber ||
                      movement.note) && (
                      <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-sm text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
                        {movement.employeeName && (
                          <div className="flex items-center gap-2">
                            <User
                              size={16}
                              className="shrink-0 text-slate-600"
                            />

                            <span className="truncate">
                              {movement.employeeName}
                            </span>
                          </div>
                        )}

                        {movement.workOrderNumber && (
                          <div className="flex items-center gap-2">
                            <ClipboardList
                              size={16}
                              className="shrink-0 text-slate-600"
                            />

                            <span className="truncate">
                              Radni nalog:{' '}
                              {movement.workOrderNumber}
                            </span>
                          </div>
                        )}

                        {movement.incomingInvoiceNumber && (
                          <div className="flex items-center gap-2">
                            <FileText
                              size={16}
                              className="shrink-0 text-slate-600"
                            />

                            <span className="truncate">
                              Ulazni račun:{' '}
                              {
                                movement.incomingInvoiceNumber
                              }
                            </span>
                          </div>
                        )}

                        {movement.note && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              size={16}
                              className="shrink-0 text-slate-600"
                            />

                            <span className="truncate">
                              {movement.note}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {item.trackingType ===
                      'piece-length' && (
                      <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
                        <p className="text-xs text-sky-300">
                          Promjena metraže:{' '}
                          <span className="font-semibold">
                            {getMovementPrefix(movement)}
                            {formatNumber(
                              movement.quantity *
                                item.pieceLengthMetres,
                            )}{' '}
                            m
                          </span>
                        </p>
                      </div>
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex items-start gap-3">
            <Warehouse
              size={20}
              className="mt-0.5 shrink-0 text-sky-400"
            />

            <p className="text-sm leading-6 text-slate-300">
              Svaka promjena spremljena na detaljima artikla
              automatski se prikazuje na ovoj stranici.
              Klikom na pojedini promet otvara se pripadajući
              artikl i njegova cjelokupna povijest.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryMovementsPage
