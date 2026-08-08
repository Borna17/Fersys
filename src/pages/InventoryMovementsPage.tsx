import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUp,
  CalendarDays,
  Filter,
  History,
  MapPin,
  Package,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  getInventoryItems,
  getInventoryMovements,
  type InventoryItem,
  type InventoryMovement,
} from '../services/inventory.service'

type MovementTypeFilter =
  | 'all'
  | 'entry'
  | 'exit'
  | 'transfer'
  | 'correction'

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
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

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

function StatCard({
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

          <p className="mt-2 text-2xl font-black text-white">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-sky-400">
          {icon}
        </div>
      </div>
    </div>
  )
}

export function InventoryMovementsPage() {
  const navigate = useNavigate()

  const [items, setItems] =
    useState<InventoryItem[]>([])

  const [movements, setMovements] =
    useState<MovementWithItem[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [loadError, setLoadError] =
    useState('')

  const [searchTerm, setSearchTerm] =
    useState('')

  const [movementType, setMovementType] =
    useState<MovementTypeFilter>('all')

  const [itemFilter, setItemFilter] =
    useState('all')

  const [employeeFilter, setEmployeeFilter] =
    useState('all')

  const [locationFilter, setLocationFilter] =
    useState('all')

  const [dateFrom, setDateFrom] =
    useState('')

  const [dateTo, setDateTo] =
    useState('')

  const [showFilters, setShowFilters] =
    useState(false)

  const loadMovements = useCallback(async () => {
    try {
      setLoadError('')

      const [
        savedItems,
        savedMovements,
      ] = await Promise.all([
        getInventoryItems(),
        getInventoryMovements(),
      ])

      const itemMap = new Map(
        savedItems.map((item) => [
          item.id,
          item,
        ]),
      )

      const joined = savedMovements
        .map((movement) => {
          const item =
            itemMap.get(
              movement.itemId,
            )

          if (!item) {
            return null
          }

          return {
            movement,
            item,
          }
        })
        .filter(
          (
            value,
          ): value is MovementWithItem =>
            value !== null,
        )
        .sort(
          (first, second) =>
            new Date(
              second.movement.createdAt,
            ).getTime() -
            new Date(
              first.movement.createdAt,
            ).getTime(),
        )

      setItems(savedItems)
      setMovements(joined)
    } catch (error) {
      console.error(
        'Prometi robe nisu učitani:',
        error,
      )

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Promete robe nije moguće učitati.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMovements()

    function handleFocus() {
      void loadMovements()
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void loadMovements()
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
  }, [loadMovements])

  const employees = useMemo(
    () =>
      Array.from(
        new Set(
          movements
            .map(
              ({ movement }) =>
                movement.employeeName?.trim(),
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, 'hr'),
      ),
    [movements],
  )

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          movements
            .map(
              ({ movement }) =>
                movement.locationName?.trim(),
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, 'hr'),
      ),
    [movements],
  )

  const filteredMovements = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchTerm)

    const startDate = dateFrom
      ? new Date(
          `${dateFrom}T00:00:00`,
        )
      : null

    const endDate = dateTo
      ? new Date(
          `${dateTo}T23:59:59`,
        )
      : null

    return movements.filter(
      ({ movement, item }) => {
        const searchableText =
          normalizeText(
            [
              item.name,
              item.shortName,
              item.code,
              item.barcode,
              item.category,
              item.dimension,
              movement.employeeName,
              movement.locationName,
              movement.destinationLocationName,
              movement.workOrderNumber,
              movement.incomingInvoiceNumber,
              movement.note,
              getMovementLabel(
                movement,
              ),
            ]
              .filter(Boolean)
              .join(' '),
          )

        const matchesSearch =
          !normalizedSearch ||
          searchableText.includes(
            normalizedSearch,
          )

        const matchesType =
          movementType === 'all' ||
          movement.type ===
            movementType

        const matchesItem =
          itemFilter === 'all' ||
          item.id === itemFilter

        const matchesEmployee =
          employeeFilter === 'all' ||
          movement.employeeName ===
            employeeFilter

        const matchesLocation =
          locationFilter === 'all' ||
          movement.locationName ===
            locationFilter ||
          movement.destinationLocationName ===
            locationFilter

        const movementDate =
          new Date(
            movement.createdAt,
          )

        const matchesDateFrom =
          !startDate ||
          movementDate >= startDate

        const matchesDateTo =
          !endDate ||
          movementDate <= endDate

        return (
          matchesSearch &&
          matchesType &&
          matchesItem &&
          matchesEmployee &&
          matchesLocation &&
          matchesDateFrom &&
          matchesDateTo
        )
      },
    )
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

  const entryCount =
    useMemo(
      () =>
        movements.filter(
          ({ movement }) =>
            movement.type ===
            'entry',
        ).length,
      [movements],
    )

  const exitCount =
    useMemo(
      () =>
        movements.filter(
          ({ movement }) =>
            movement.type ===
            'exit',
        ).length,
      [movements],
    )

  const transferCount =
    useMemo(
      () =>
        movements.filter(
          ({ movement }) =>
            movement.type ===
            'transfer',
        ).length,
      [movements],
    )

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
    const today =
      formatDateInputValue(
        new Date(),
      )

    setDateFrom(today)
    setDateTo(today)
  }

  function setLastSevenDaysFilter() {
    const today =
      new Date()

    const sevenDaysAgo =
      new Date()

    sevenDaysAgo.setDate(
      today.getDate() - 6,
    )

    setDateFrom(
      formatDateInputValue(
        sevenDaysAgo,
      ),
    )

    setDateTo(
      formatDateInputValue(
        today,
      ),
    )
  }

  function setCurrentMonthFilter() {
    const today =
      new Date()

    const firstDay =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      )

    setDateFrom(
      formatDateInputValue(
        firstDay,
      ),
    )

    setDateTo(
      formatDateInputValue(
        today,
      ),
    )
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje prometa robe..." />
    )
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() =>
                navigate('/inventory')
              }
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              aria-label="Povratak u skladište"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Prometi robe
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Zajednička evidencija svih ulaza, izlaza,
                premještaja i korekcija skladišta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadMovements()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <RefreshCw size={18} />
            Osvježi podatke
          </button>
        </div>

        {loadError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Promete robe nije moguće učitati.
              </p>

              <p className="mt-1 break-words text-sm">
                {loadError}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Ukupno prometa"
            value={formatNumber(
              movements.length,
            )}
            description="Sve evidentirane promjene stanja"
            icon={
              <History size={22} />
            }
          />

          <StatCard
            title="Ulazi robe"
            value={formatNumber(
              entryCount,
            )}
            description="Dodavanja materijala na stanje"
            icon={
              <ArrowUp size={22} />
            }
          />

          <StatCard
            title="Izlazi robe"
            value={formatNumber(
              exitCount,
            )}
            description="Materijal uzet iz skladišta"
            icon={
              <ArrowDown size={22} />
            }
          />

          <StatCard
            title="Premještaji"
            value={formatNumber(
              transferCount,
            )}
            description="Promjene lokacije materijala"
            icon={
              <ArrowRightLeft
                size={22}
              />
            }
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
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
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="Pretraži artikl, radnika, lokaciju, radni nalog..."
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-11 text-sm text-white outline-none focus:border-sky-500"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm('')
                  }
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (current) =>
                    !current,
                )
              }
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
                showFilters ||
                hasActiveFilters
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                  : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}
            >
              <Filter size={18} />
              Filtri
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <select
                  value={
                    movementType
                  }
                  onChange={(event) =>
                    setMovementType(
                      event.target
                        .value as MovementTypeFilter,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
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
                  <option value="correction">
                    Ispravak stanja
                  </option>
                </select>

                <select
                  value={
                    itemFilter
                  }
                  onChange={(event) =>
                    setItemFilter(
                      event.target.value,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                >
                  <option value="all">
                    Svi artikli
                  </option>

                  {items.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.name
                        }
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={
                    employeeFilter
                  }
                  onChange={(event) =>
                    setEmployeeFilter(
                      event.target.value,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                >
                  <option value="all">
                    Svi zaposlenici
                  </option>

                  {employees.map(
                    (employee) => (
                      <option
                        key={
                          employee
                        }
                        value={
                          employee
                        }
                      >
                        {
                          employee
                        }
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={
                    locationFilter
                  }
                  onChange={(event) =>
                    setLocationFilter(
                      event.target.value,
                    )
                  }
                  className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                >
                  <option value="all">
                    Sve lokacije
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={
                          location
                        }
                        value={
                          location
                        }
                      >
                        {
                          location
                        }
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="button"
                  disabled={
                    !hasActiveFilters
                  }
                  onClick={
                    clearFilters
                  }
                  className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Očisti filtre
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Datum od
                  </span>

                  <input
                    type="date"
                    value={
                      dateFrom
                    }
                    onChange={(event) =>
                      setDateFrom(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white [color-scheme:dark]"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Datum do
                  </span>

                  <input
                    type="date"
                    value={
                      dateTo
                    }
                    onChange={(event) =>
                      setDateTo(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white [color-scheme:dark]"
                  />
                </label>

                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    onClick={
                      setTodayFilter
                    }
                    className="h-11 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-300"
                  >
                    Danas
                  </button>

                  <button
                    type="button"
                    onClick={
                      setLastSevenDaysFilter
                    }
                    className="h-11 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-300"
                  >
                    7 dana
                  </button>

                  <button
                    type="button"
                    onClick={
                      setCurrentMonthFilter
                    }
                    className="h-11 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-300"
                  >
                    Ovaj mjesec
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            Prikazano{' '}
            <span className="font-bold text-white">
              {
                filteredMovements.length
              }
            </span>{' '}
            od{' '}
            <span className="font-bold text-white">
              {
                movements.length
              }
            </span>{' '}
            zapisa
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays
              size={15}
            />
            Podaci iz zajedničkog Supabase skladišta
          </div>
        </div>

        {filteredMovements.length ===
        0 ? (
          <div className="mt-4 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 text-center">
            <History
              size={42}
              className="text-slate-600"
            />

            <h2 className="mt-4 text-xl font-bold text-white">
              Nema prometa robe
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Kada radnik doda ili uzme materijal, zapis će se pojaviti ovdje.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredMovements.map(
              ({
                movement,
                item,
              }) => (
                <article
                  key={
                    movement.id
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${getMovementStyle(
                          movement,
                        )}`}
                      >
                        {getMovementIcon(
                          movement,
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/inventory/items/${item.id}`,
                              )
                            }
                            className="truncate text-left font-black text-white hover:text-sky-300"
                          >
                            {
                              item.name
                            }
                          </button>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getMovementStyle(
                              movement,
                            )}`}
                          >
                            {getMovementLabel(
                              movement,
                            )}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Package
                              size={
                                14
                              }
                            />
                            {item.code ||
                              'Bez šifre'}
                          </span>

                          {movement.employeeName && (
                            <span className="inline-flex items-center gap-1.5">
                              <User
                                size={
                                  14
                                }
                              />
                              {
                                movement.employeeName
                              }
                            </span>
                          )}

                          {movement.locationName && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin
                                size={
                                  14
                                }
                              />
                              {
                                movement.locationName
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                      <div className="rounded-xl bg-slate-800/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Količina
                        </p>

                        <p
                          className={`mt-1 text-lg font-black ${getQuantityTextClass(
                            movement,
                          )}`}
                        >
                          {getMovementPrefix(
                            movement,
                          )}
                          {formatNumber(
                            movement.quantity,
                          )}{' '}
                          {
                            item.unit
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-800/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Stanje
                        </p>

                        <p className="mt-1 text-sm font-bold text-white">
                          {formatNumber(
                            movement.previousQuantity,
                          )}{' '}
                          →{' '}
                          {formatNumber(
                            movement.newQuantity,
                          )}{' '}
                          {
                            item.unit
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-800/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Vrijeme
                        </p>

                        <p className="mt-1 text-sm font-bold text-white">
                          {formatDateTime(
                            movement.createdAt,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(movement.destinationLocationName ||
                    movement.workOrderNumber ||
                    movement.incomingInvoiceNumber ||
                    movement.note) && (
                    <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400 md:grid-cols-2 xl:grid-cols-4">
                      {movement.destinationLocationName && (
                        <div>
                          <span className="text-slate-600">
                            Odredišna lokacija:
                          </span>{' '}
                          {
                            movement.destinationLocationName
                          }
                        </div>
                      )}

                      {movement.workOrderNumber && (
                        <div>
                          <span className="text-slate-600">
                            Radni nalog:
                          </span>{' '}
                          {
                            movement.workOrderNumber
                          }
                        </div>
                      )}

                      {movement.incomingInvoiceNumber && (
                        <div>
                          <span className="text-slate-600">
                            Ulazni račun:
                          </span>{' '}
                          {
                            movement.incomingInvoiceNumber
                          }
                        </div>
                      )}

                      {movement.note && (
                        <div>
                          <span className="text-slate-600">
                            Napomena:
                          </span>{' '}
                          {
                            movement.note
                          }
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryMovementsPage