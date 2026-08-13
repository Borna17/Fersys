import {
  CalendarClock,
  CarFront,
  CircleAlert,
  Fuel,
  Gauge,
  Plus,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  useNavigate,
  useSearchParams,
} from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  createVehicle,
  getVehicles,
  type CreateVehicleInput,
} from '../services/vehicles.service'
import type {
  Vehicle,
  VehicleFuel,
  VehicleStatus,
} from '../types/vehicle'

const fuels: VehicleFuel[] = [
  'Dizel',
  'Benzin',
  'Hibrid',
  'Električno',
  'LPG',
  'Ostalo',
]

const statuses: VehicleStatus[] = [
  'Aktivno',
  'Na servisu',
  'Neaktivno',
]

function formatMileage(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
  ).format(value)
}

function formatDate(
  value: string,
) {
  if (!value) return '—'

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(
    new Date(
      `${value}T12:00:00`,
    ),
  )
}

function daysUntil(
  value: string,
) {
  if (!value) return null

  const target =
    new Date(
      `${value}T12:00:00`,
    )

  const today = new Date()
  today.setHours(
    12,
    0,
    0,
    0,
  )

  return Math.ceil(
    (
      target.getTime() -
      today.getTime()
    ) /
      86_400_000,
  )
}

function statusClass(
  status: VehicleStatus,
) {
  if (
    status === 'Aktivno'
  ) {
    return 'bg-emerald-500/10 text-emerald-300'
  }

  if (
    status ===
    'Na servisu'
  ) {
    return 'bg-amber-500/10 text-amber-300'
  }

  return 'bg-slate-700 text-slate-300'
}

const emptyForm:
CreateVehicleInput = {
  registration: '',
  make: '',
  model: '',
  year: null,
  vin: '',
  mileage: 0,
  fuel: 'Dizel',
  color: '',
  status: 'Aktivno',
  assignedEmployeeName: '',
  registrationExpiresOn: '',
  insuranceExpiresOn: '',
  nextServiceDate: '',
  nextServiceMileage: null,
  imageUrl: '',
  notes: '',
}

export function VehiclesPage() {
  const navigate =
    useNavigate()

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const [
    vehicles,
    setVehicles,
  ] =
    useState<Vehicle[]>([])

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      VehicleStatus | 'Sve'
    >('Sve')

  const [
    isModalOpen,
    setIsModalOpen,
  ] = useState(false)

  const [form, setForm] =
    useState<CreateVehicleInput>(
      emptyForm,
    )

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  async function load() {
    try {
      setIsLoading(true)
      setError('')

      setVehicles(
        await getVehicles(),
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Vozila nije moguće učitati.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (
      searchParams.get('new') ===
      '1'
    ) {
      setIsModalOpen(true)
    }
  }, [searchParams])


  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return vehicles.filter(
        (vehicle) => {
          const matchesStatus =
            statusFilter ===
              'Sve' ||
            vehicle.status ===
              statusFilter

          const matchesSearch =
            !query ||
            [
              vehicle.registration,
              vehicle.make,
              vehicle.model,
              vehicle.vin,
              vehicle.assignedEmployeeName,
            ]
              .join(' ')
              .toLowerCase()
              .includes(query)

          return (
            matchesStatus &&
            matchesSearch
          )
        },
      )
    }, [
      search,
      statusFilter,
      vehicles,
    ])

  const stats =
    useMemo(() => {
      const soon =
        vehicles.filter(
          (vehicle) => {
            const days =
              daysUntil(
                vehicle.registrationExpiresOn,
              )

            return (
              days !== null &&
              days >= 0 &&
              days <= 30
            )
          },
        ).length

      return {
        total:
          vehicles.length,
        active:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
              'Aktivno',
          ).length,
        service:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
              'Na servisu',
          ).length,
        registrationSoon:
          soon,
      }
    }, [vehicles])

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault()

    try {
      setIsSaving(true)
      setError('')

      const created =
        await createVehicle(
          form,
        )

      setVehicles(
        (current) => [
          created,
          ...current,
        ],
      )

      setForm(emptyForm)
      setIsModalOpen(false)

      navigate(
        `/vehicles/${created.id}`,
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Vozilo nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje vozila..." />
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
              Vozni park
            </p>

            <h1 className="mt-2 text-3xl font-black text-white">
              Vozila
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Evidencija vozila, kilometraže, registracija, servisa i troškova.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsModalOpen(
                true,
              )
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            <Plus size={18} />
            Dodaj vozilo
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CarFront}
            label="Ukupno vozila"
            value={stats.total}
          />

          <StatCard
            icon={ShieldCheck}
            label="Aktivna"
            value={stats.active}
          />

          <StatCard
            icon={Wrench}
            label="Na servisu"
            value={stats.service}
          />

          <StatCard
            icon={CalendarClock}
            label="Registracija ≤ 30 dana"
            value={
              stats.registrationSoon
            }
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:flex-row">
          <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4">
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Pretraži registraciju, marku, model, VIN..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | VehicleStatus
                  | 'Sve',
              )
            }
            className="min-h-12 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-slate-300 outline-none"
          >
            <option value="Sve">
              Svi statusi
            </option>

            {statuses.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ),
            )}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
            <CarFront
              size={42}
              className="mx-auto text-slate-600"
            />

            <h2 className="mt-4 text-xl font-black text-white">
              Nema vozila
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Dodaj prvo vozilo u vozni park.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map(
              (vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/vehicles/${vehicle.id}`,
                    )
                  }
                  className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-left transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-950/10"
                >
                  <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
                    {vehicle.imageUrl ? (
                      <img
                        src={
                          vehicle.imageUrl
                        }
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center">
                        <CarFront
                          size={52}
                          className="text-slate-600 transition group-hover:text-blue-400"
                        />
                      </div>
                    )}

                    <span
                      className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(
                        vehicle.status,
                      )}`}
                    >
                      {vehicle.status}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-black text-white">
                          {
                            vehicle.make
                          }{' '}
                          {
                            vehicle.model
                          }
                        </h2>

                        <p className="mt-1 inline-flex rounded-lg bg-blue-500/10 px-2.5 py-1 font-mono text-sm font-black tracking-wider text-blue-300">
                          {
                            vehicle.registration
                          }
                        </p>
                      </div>

                      {vehicle.year && (
                        <span className="text-xs font-bold text-slate-500">
                          {
                            vehicle.year
                          }
                        </span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <MiniInfo
                        icon={Gauge}
                        label="Kilometraža"
                        value={`${formatMileage(
                          vehicle.mileage,
                        )} km`}
                      />

                      <MiniInfo
                        icon={Fuel}
                        label="Gorivo"
                        value={
                          vehicle.fuel
                        }
                      />

                      <MiniInfo
                        icon={
                          CalendarClock
                        }
                        label="Registracija"
                        value={formatDate(
                          vehicle.registrationExpiresOn,
                        )}
                      />

                      <MiniInfo
                        icon={Wrench}
                        label="Sljedeći servis"
                        value={
                          vehicle.nextServiceMileage
                            ? `${formatMileage(
                                vehicle.nextServiceMileage,
                              )} km`
                            : formatDate(
                                vehicle.nextServiceDate,
                              )
                        }
                      />
                    </div>

                    {vehicle.assignedEmployeeName && (
                      <p className="mt-4 truncate border-t border-slate-800 pt-4 text-xs text-slate-500">
                        Dodijeljeno:{' '}
                        <strong className="text-slate-300">
                          {
                            vehicle.assignedEmployeeName
                          }
                        </strong>
                      </p>
                    )}
                  </div>
                </button>
              ),
            )}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-400">
                  Vozni park
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Novo vozilo
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(
                    false,
                  )
                  setSearchParams({})
                }}
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Input
                label="Registracija *"
                value={
                  form.registration
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      registration:
                        value.toUpperCase(),
                    }),
                  )
                }
                placeholder="SB-123-AB"
              />

              <Input
                label="VIN"
                value={
                  form.vin ?? ''
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      vin: value.toUpperCase(),
                    }),
                  )
                }
              />

              <Input
                label="Marka *"
                value={form.make}
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      make: value,
                    }),
                  )
                }
                placeholder="Renault"
              />

              <Input
                label="Model *"
                value={form.model}
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      model: value,
                    }),
                  )
                }
                placeholder="Trafic"
              />

              <NumberInput
                label="Godina"
                value={
                  form.year ?? null
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      year: value,
                    }),
                  )
                }
              />

              <NumberInput
                label="Kilometraža"
                value={
                  form.mileage ?? 0
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      mileage:
                        value ?? 0,
                    }),
                  )
                }
              />

              <Select
                label="Gorivo"
                value={
                  form.fuel ??
                  'Dizel'
                }
                options={fuels}
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      fuel:
                        value as VehicleFuel,
                    }),
                  )
                }
              />

              <Select
                label="Status"
                value={
                  form.status ??
                  'Aktivno'
                }
                options={statuses}
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      status:
                        value as VehicleStatus,
                    }),
                  )
                }
              />

              <Input
                label="Boja"
                value={
                  form.color ?? ''
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      color: value,
                    }),
                  )
                }
              />

              <Input
                label="Dodijeljeni zaposlenik"
                value={
                  form.assignedEmployeeName ??
                  ''
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      assignedEmployeeName:
                        value,
                    }),
                  )
                }
                placeholder="Borna Ferfolja"
              />

              <DateInput
                label="Registracija vrijedi do"
                value={
                  form.registrationExpiresOn ??
                  ''
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      registrationExpiresOn:
                        value,
                    }),
                  )
                }
              />

              <DateInput
                label="Osiguranje vrijedi do"
                value={
                  form.insuranceExpiresOn ??
                  ''
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      insuranceExpiresOn:
                        value,
                    }),
                  )
                }
              />

              <DateInput
                label="Sljedeći servis – datum"
                value={
                  form.nextServiceDate ??
                  ''
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      nextServiceDate:
                        value,
                    }),
                  )
                }
              />

              <NumberInput
                label="Sljedeći servis – km"
                value={
                  form.nextServiceMileage ??
                  null
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      nextServiceMileage:
                        value,
                    }),
                  )
                }
              />

              <div className="sm:col-span-2">
                <Input
                  label="URL fotografije"
                  value={
                    form.imageUrl ?? ''
                  }
                  onChange={(value) =>
                    setForm(
                      (current) => ({
                        ...current,
                        imageUrl:
                          value,
                      }),
                    )
                  }
                  placeholder="https://..."
                />
              </div>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Napomena
                </span>

                <textarea
                  value={
                    form.notes ?? ''
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-800 bg-slate-900 p-5">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(
                    false,
                  )
                  setSearchParams({})
                }}
                className="min-h-11 rounded-xl bg-slate-800 px-5 text-sm font-bold text-slate-300"
              >
                Odustani
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
              >
                {isSaving
                  ? 'Spremanje...'
                  : 'Spremi vozilo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CarFront
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
          <Icon size={19} />
        </span>

        <strong className="text-2xl font-black text-white">
          {value}
        </strong>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  )
}

function MiniInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-950/70 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-xs font-bold text-slate-300">
        {value}
      </p>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder = '',
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
  placeholder?: string
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        className="min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-blue-500"
      />
    </label>
  )
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (
    value: number | null,
  ) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(event) =>
          onChange(
            event.target.value
              ? Number(
                  event.target.value,
                )
              : null,
          )
        }
        className="min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-blue-500"
      />
    </label>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-blue-500"
      />
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (
    value: string,
  ) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-blue-500"
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ),
        )}
      </select>
    </label>
  )
}