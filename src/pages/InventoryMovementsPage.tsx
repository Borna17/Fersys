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
  RefreshCw,
  Search,
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
  if (movement.type === 'entry') return 'Ulaz robe'
  if (movement.type === 'exit') return 'Izlaz robe'
  if (movement.type === 'transfer') return 'Premještaj'
  return 'Ispravak stanja'
}

function getMovementPrefix(
  movement: InventoryMovement,
): string {
  if (movement.type === 'entry') return '+'
  if (movement.type === 'exit') return '−'
  return ''
}

function getMovementIcon(
  movement: InventoryMovement,
) {
  if (movement.type === 'entry') return <ArrowUp size={18} />
  if (movement.type === 'exit') return <ArrowDown size={18} />
  if (movement.type === 'transfer') {
    return <ArrowRightLeft size={18} />
  }

  return <RefreshCw size={18} />
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
  if (movement.type === 'entry') return 'text-emerald-300'
  if (movement.type === 'exit') return 'text-red-300'
  if (movement.type === 'transfer') return 'text-sky-300'
  return 'text-amber-300'
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

  const loadMovements =
    useCallback(async () => {
      try {
        setLoadError('')

        const [savedItems, savedMovements] =
          await Promise.all([
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
            const item = itemMap.get(
              movement.itemId,
            )

            if (!item) return null

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
            .flatMap(
              ({ movement }) => [
                movement.locationName?.trim(),
                movement.destinationLocationName?.trim(),
              ],
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

  const filteredMovements =
    useMemo(() => {
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

  const counts = useMemo(
    () => ({
      total: movements.length,
      entry: movements.filter(
        ({ movement }) =>
          movement.type === 'entry',
      ).length,
      exit: movements.filter(
        ({ movement }) =>
          movement.type === 'exit',
      ).length,
      transfer: movements.filter(
        ({ movement }) =>
          movement.type === 'transfer',
      ).length,
      correction: movements.filter(
        ({ movement }) =>
          movement.type === 'correction',
      ).length,
    }),
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
    const today = new Date()
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
    const today = new Date()

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
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">
      <button
        type="button"
        onClick={() =>
          navigate('/inventory')
        }
        className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
      >
        <ArrowLeft size={18} />
        Skladište
      </button>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-sky-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">
              SKLADIŠTE
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Prometi robe
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Ulazi, izlazi, premještaji i korekcije zajedničkog skladišta.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadMovements()
            }
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-800 text-sky-300 active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"
            aria-label="Osvježi"
          >
            <RefreshCw size={19} />
            <span className="hidden text-sm font-black sm:inline">
              Osvježi
            </span>
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          <MetricButton
            label="Ukupno"
            value={counts.total}
            active={
              movementType === 'all'
            }
            onClick={() =>
              setMovementType('all')
            }
          />

          <MetricButton
            label="Ulazi"
            value={counts.entry}
            active={
              movementType === 'entry'
            }
            onClick={() =>
              setMovementType('entry')
            }
          />

          <MetricButton
            label="Izlazi"
            value={counts.exit}
            active={
              movementType === 'exit'
            }
            onClick={() =>
              setMovementType('exit')
            }
          />

          <MetricButton
            label="Premještaj"
            value={counts.transfer}
            active={
              movementType === 'transfer'
            }
            onClick={() =>
              setMovementType(
                'transfer',
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

          <div className="min-w-0 flex-1">
            <p className="font-black">
              Promete robe nije moguće učitati.
            </p>

            <p className="mt-1 break-words text-sm">
              {loadError}
            </p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Ulazi robe"
          value={formatNumber(
            counts.entry,
          )}
          icon={<ArrowUp size={18} />}
        />

        <SummaryCard
          label="Izlazi robe"
          value={formatNumber(
            counts.exit,
          )}
          icon={<ArrowDown size={18} />}
        />

        <SummaryCard
          label="Premještaji"
          value={formatNumber(
            counts.transfer,
          )}
          icon={
            <ArrowRightLeft
              size={18}
            />
          }
        />

        <SummaryCard
          label="Korekcije"
          value={formatNumber(
            counts.correction,
          )}
          icon={
            <RefreshCw size={18} />
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
            placeholder="Artikl, radnik, lokacija, radni nalog..."
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

        <div className="mt-3 flex gap-2">
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
            <Filter size={16} />
            Filtri
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-xl bg-slate-800 px-4 text-xs font-black text-slate-300"
            >
              Očisti
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select
                value={movementType}
                onChange={(event) =>
                  setMovementType(
                    event.target
                      .value as MovementTypeFilter,
                  )
                }
                className="h-11 min-w-0 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
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
                  Ispravak
                </option>
              </select>

              <select
                value={itemFilter}
                onChange={(event) =>
                  setItemFilter(
                    event.target.value,
                  )
                }
                className="h-11 min-w-0 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
              >
                <option value="all">
                  Svi artikli
                </option>
                {items.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
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
                className="h-11 min-w-0 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
              >
                <option value="all">
                  Svi radnici
                </option>
                {employees.map(
                  (employee) => (
                    <option
                      key={employee}
                      value={employee}
                    >
                      {employee}
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
                className="h-11 min-w-0 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
              >
                <option value="all">
                  Sve lokacije
                </option>
                {locations.map(
                  (location) => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-600">
                  Datum od
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl bg-slate-800 px-3 text-xs text-white [color-scheme:dark]"
                />
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-600">
                  Datum do
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl bg-slate-800 px-3 text-xs text-white [color-scheme:dark]"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <DateShortcut
                label="Danas"
                onClick={setTodayFilter}
              />
              <DateShortcut
                label="7 dana"
                onClick={
                  setLastSevenDaysFilter
                }
              />
              <DateShortcut
                label="Ovaj mjesec"
                onClick={
                  setCurrentMonthFilter
                }
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            PROMETI
          </p>

          <h2 className="mt-1 text-lg font-black text-white">
            {filteredMovements.length}{' '}
            prikazano
          </h2>
        </div>

        <div className="hidden items-center gap-1.5 text-xs text-slate-600 sm:flex">
          <CalendarDays size={14} />
          Zajedničko skladište
        </div>
      </div>

      {filteredMovements.length ===
      0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
          <History
            size={38}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-4 text-xl font-black text-white">
            Nema prometa robe
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Kada se promijeni stanje artikla, zapis će se pojaviti ovdje.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMovements.map(
            ({
              movement,
              item,
            }) => (
              <article
                key={movement.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${getMovementStyle(
                      movement,
                    )}`}
                  >
                    {getMovementIcon(
                      movement,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/inventory/items/${item.id}`,
                            )
                          }
                          className="block max-w-full truncate text-left font-black text-white"
                        >
                          {item.name}
                        </button>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-black ${getMovementStyle(
                              movement,
                            )}`}
                          >
                            {getMovementLabel(
                              movement,
                            )}
                          </span>

                          <span className="text-[10px] text-slate-600">
                            {item.code ||
                              'Bez šifre'}
                          </span>
                        </div>
                      </div>

                      <p
                        className={`shrink-0 text-lg font-black ${getQuantityTextClass(
                          movement,
                        )}`}
                      >
                        {getMovementPrefix(
                          movement,
                        )}
                        {formatNumber(
                          movement.quantity,
                        )}{' '}
                        {item.unit}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <SmallInfo
                        label="Stanje"
                        value={`${formatNumber(
                          movement.previousQuantity,
                        )} → ${formatNumber(
                          movement.newQuantity,
                        )} ${item.unit}`}
                      />

                      <SmallInfo
                        label="Vrijeme"
                        value={formatDateTime(
                          movement.createdAt,
                        )}
                      />

                      <SmallInfo
                        label="Radnik"
                        value={
                          movement.employeeName ||
                          '—'
                        }
                        className="col-span-2 sm:col-span-1"
                      />
                    </div>

                    {(movement.locationName ||
                      movement.destinationLocationName ||
                      movement.workOrderNumber ||
                      movement.incomingInvoiceNumber ||
                      movement.note) && (
                      <div className="mt-3 space-y-1 rounded-2xl bg-slate-950/45 p-3 text-xs leading-5 text-slate-500">
                        {movement.locationName && (
                          <p className="flex items-center gap-1.5">
                            <MapPin
                              size={13}
                            />
                            <span>
                              {movement.locationName}
                            </span>
                          </p>
                        )}

                        {movement.destinationLocationName && (
                          <p>
                            Odredište:{' '}
                            <span className="font-bold text-slate-300">
                              {movement.destinationLocationName}
                            </span>
                          </p>
                        )}

                        {movement.workOrderNumber && (
                          <p>
                            Radni nalog:{' '}
                            <span className="font-bold text-slate-300">
                              {movement.workOrderNumber}
                            </span>
                          </p>
                        )}

                        {movement.incomingInvoiceNumber && (
                          <p>
                            Ulazni račun:{' '}
                            <span className="font-bold text-slate-300">
                              {movement.incomingInvoiceNumber}
                            </span>
                          </p>
                        )}

                        {movement.note && (
                          <p>
                            Napomena:{' '}
                            <span className="text-slate-300">
                              {movement.note}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ),
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

function SmallInfo({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-slate-950/50 p-2.5 ${className}`}
    >
      <p className="truncate text-[8px] font-black uppercase tracking-wide text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-[10px] font-black text-white">
        {value}
      </p>
    </div>
  )
}

function DateShortcut({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-xl bg-slate-800 px-2 text-[10px] font-black text-slate-300"
    >
      {label}
    </button>
  )
}
