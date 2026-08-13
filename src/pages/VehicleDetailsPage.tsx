import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  Coins,
  Gauge,
  Plus,
  Save,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  addVehicleExpense,
  addVehicleService,
  deleteVehicle,
  getVehicleById,
  getVehicleExpenses,
  getVehicleServices,
  updateVehicle,
  type CreateExpenseInput,
  type CreateServiceInput,
} from '../services/vehicles.service'
import type {
  Vehicle,
  VehicleExpense,
  VehicleExpenseCategory,
  VehicleServiceRecord,
  VehicleStatus,
} from '../types/vehicle'

type Tab =
  | 'overview'
  | 'service'
  | 'expenses'

const expenseCategories:
VehicleExpenseCategory[] = [
  'Gorivo',
  'Servis',
  'Registracija',
  'Osiguranje',
  'Gume',
  'Cestarina',
  'Ostalo',
]

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

function money(
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

function mileage(
  value:
    | number
    | null,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—'
  }

  return `${new Intl.NumberFormat(
    'hr-HR',
  ).format(value)} km`
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

export function VehicleDetailsPage() {
  const { id = '' } =
    useParams()

  const navigate =
    useNavigate()

  const [
    vehicle,
    setVehicle,
  ] =
    useState<Vehicle | null>(
      null,
    )

  const [
    services,
    setServices,
  ] =
    useState<
      VehicleServiceRecord[]
    >([])

  const [
    expenses,
    setExpenses,
  ] =
    useState<VehicleExpense[]>(
      [],
    )

  const [tab, setTab] =
    useState<Tab>(
      'overview',
    )

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [error, setError] =
    useState('')

  const [
    serviceModal,
    setServiceModal,
  ] = useState(false)

  const [
    expenseModal,
    setExpenseModal,
  ] = useState(false)

  const [
    serviceForm,
    setServiceForm,
  ] =
    useState<CreateServiceInput>(
      {
        serviceDate:
          today(),
        mileage: null,
        title: '',
        description: '',
        provider: '',
        cost: 0,
        nextServiceDate: '',
        nextServiceMileage:
          null,
      },
    )

  const [
    expenseForm,
    setExpenseForm,
  ] =
    useState<CreateExpenseInput>(
      {
        expenseDate:
          today(),
        category:
          'Gorivo',
        description: '',
        amount: 0,
        mileage: null,
      },
    )

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  async function load() {
    if (!id) return

    try {
      setIsLoading(true)
      setError('')

      const [
        nextVehicle,
        nextServices,
        nextExpenses,
      ] =
        await Promise.all([
          getVehicleById(id),
          getVehicleServices(
            id,
          ),
          getVehicleExpenses(
            id,
          ),
        ])

      setVehicle(nextVehicle)
      setServices(
        nextServices,
      )
      setExpenses(
        nextExpenses,
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Podaci vozila nisu dostupni.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const totalExpenses =
    useMemo(
      () =>
        expenses.reduce(
          (sum, item) =>
            sum + item.amount,
          0,
        ) +
        services.reduce(
          (sum, item) =>
            sum + item.cost,
          0,
        ),
      [expenses, services],
    )

  async function saveOverview(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!vehicle) return

    try {
      setIsSaving(true)

      const updated =
        await updateVehicle(
          vehicle.id,
          {
            registration:
              vehicle.registration,
            make:
              vehicle.make,
            model:
              vehicle.model,
            year:
              vehicle.year,
            vin:
              vehicle.vin,
            mileage:
              vehicle.mileage,
            fuel:
              vehicle.fuel,
            color:
              vehicle.color,
            status:
              vehicle.status,
            assignedEmployeeName:
              vehicle.assignedEmployeeName,
            registrationExpiresOn:
              vehicle.registrationExpiresOn,
            insuranceExpiresOn:
              vehicle.insuranceExpiresOn,
            nextServiceDate:
              vehicle.nextServiceDate,
            nextServiceMileage:
              vehicle.nextServiceMileage,
            imageUrl:
              vehicle.imageUrl,
            notes:
              vehicle.notes,
          },
        )

      setVehicle(updated)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjene nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function submitService(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!vehicle) return

    try {
      setIsSaving(true)

      const created =
        await addVehicleService(
          vehicle.id,
          serviceForm,
        )

      setServices(
        (current) => [
          created,
          ...current,
        ],
      )

      setVehicle(
        await getVehicleById(
          vehicle.id,
        ),
      )

      setServiceModal(false)

      setServiceForm({
        serviceDate:
          today(),
        mileage: null,
        title: '',
        description: '',
        provider: '',
        cost: 0,
        nextServiceDate: '',
        nextServiceMileage:
          null,
      })
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Servis nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function submitExpense(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!vehicle) return

    try {
      setIsSaving(true)

      const created =
        await addVehicleExpense(
          vehicle.id,
          expenseForm,
        )

      setExpenses(
        (current) => [
          created,
          ...current,
        ],
      )

      setExpenseModal(false)

      setExpenseForm({
        expenseDate:
          today(),
        category:
          'Gorivo',
        description: '',
        amount: 0,
        mileage: null,
      })
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Trošak nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!vehicle) return

    if (
      !window.confirm(
        `Obrisati vozilo ${vehicle.registration}?`,
      )
    ) {
      return
    }

    try {
      await deleteVehicle(
        vehicle.id,
      )

      navigate('/vehicles')
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Vozilo nije moguće obrisati.',
      )
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje vozila..." />
    )
  }

  if (!vehicle) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center text-red-300">
        Vozilo nije pronađeno.
      </div>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/vehicles',
                )
              }
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            >
              <ArrowLeft
                size={19}
              />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-white">
                  {vehicle.make}{' '}
                  {vehicle.model}
                </h1>

                <span className="rounded-lg bg-blue-500/10 px-3 py-1 font-mono text-sm font-black tracking-wider text-blue-300">
                  {
                    vehicle.registration
                  }
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {vehicle.year
                  ? `${vehicle.year}. · `
                  : ''}
                {mileage(
                  vehicle.mileage,
                )}
                {' · '}
                {vehicle.fuel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void remove()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-bold text-red-300"
          >
            <Trash2 size={17} />
            Obriši vozilo
          </button>
        </div>

        {error && (
          <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <CircleAlert
              size={18}
              className="shrink-0"
            />
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoStat
            icon={Gauge}
            label="Kilometraža"
            value={mileage(
              vehicle.mileage,
            )}
          />

          <InfoStat
            icon={CalendarClock}
            label="Registracija do"
            value={formatDate(
              vehicle.registrationExpiresOn,
            )}
          />

          <InfoStat
            icon={Wrench}
            label="Sljedeći servis"
            value={
              vehicle.nextServiceMileage
                ? mileage(
                    vehicle.nextServiceMileage,
                  )
                : formatDate(
                    vehicle.nextServiceDate,
                  )
            }
          />

          <InfoStat
            icon={Coins}
            label="Evidentirani troškovi"
            value={money(
              totalExpenses,
            )}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
          <TabButton
            active={
              tab === 'overview'
            }
            onClick={() =>
              setTab(
                'overview',
              )
            }
          >
            Pregled
          </TabButton>

          <TabButton
            active={
              tab === 'service'
            }
            onClick={() =>
              setTab(
                'service',
              )
            }
          >
            Servisi
          </TabButton>

          <TabButton
            active={
              tab === 'expenses'
            }
            onClick={() =>
              setTab(
                'expenses',
              )
            }
          >
            Troškovi
          </TabButton>
        </div>

        {tab ===
          'overview' && (
          <form
            onSubmit={
              saveOverview
            }
            className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Registracija"
                value={
                  vehicle.registration
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    registration:
                      value.toUpperCase(),
                  })
                }
              />

              <TextField
                label="Marka"
                value={
                  vehicle.make
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    make: value,
                  })
                }
              />

              <TextField
                label="Model"
                value={
                  vehicle.model
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    model: value,
                  })
                }
              />

              <NumberField
                label="Godina"
                value={
                  vehicle.year
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    year: value,
                  })
                }
              />

              <NumberField
                label="Kilometraža"
                value={
                  vehicle.mileage
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    mileage:
                      value ?? 0,
                  })
                }
              />

              <TextField
                label="VIN"
                value={
                  vehicle.vin
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    vin:
                      value.toUpperCase(),
                  })
                }
              />

              <TextField
                label="Boja"
                value={
                  vehicle.color
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    color: value,
                  })
                }
              />

              <TextField
                label="Dodijeljeni zaposlenik"
                value={
                  vehicle.assignedEmployeeName
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    assignedEmployeeName:
                      value,
                  })
                }
              />

              <label>
                <FieldLabel>
                  Status
                </FieldLabel>

                <select
                  value={
                    vehicle.status
                  }
                  onChange={(event) =>
                    setVehicle({
                      ...vehicle,
                      status:
                        event.target
                          .value as VehicleStatus,
                    })
                  }
                  className="min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option>
                    Aktivno
                  </option>
                  <option>
                    Na servisu
                  </option>
                  <option>
                    Neaktivno
                  </option>
                </select>
              </label>

              <DateField
                label="Registracija vrijedi do"
                value={
                  vehicle.registrationExpiresOn
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    registrationExpiresOn:
                      value,
                  })
                }
              />

              <DateField
                label="Osiguranje vrijedi do"
                value={
                  vehicle.insuranceExpiresOn
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    insuranceExpiresOn:
                      value,
                  })
                }
              />

              <DateField
                label="Sljedeći servis – datum"
                value={
                  vehicle.nextServiceDate
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    nextServiceDate:
                      value,
                  })
                }
              />

              <NumberField
                label="Sljedeći servis – km"
                value={
                  vehicle.nextServiceMileage
                }
                onChange={(value) =>
                  setVehicle({
                    ...vehicle,
                    nextServiceMileage:
                      value,
                  })
                }
              />

              <div className="md:col-span-2 xl:col-span-3">
                <TextField
                  label="URL fotografije"
                  value={
                    vehicle.imageUrl
                  }
                  onChange={(value) =>
                    setVehicle({
                      ...vehicle,
                      imageUrl:
                        value,
                    })
                  }
                />
              </div>

              <label className="md:col-span-2 xl:col-span-3">
                <FieldLabel>
                  Napomena
                </FieldLabel>

                <textarea
                  value={
                    vehicle.notes
                  }
                  onChange={(event) =>
                    setVehicle({
                      ...vehicle,
                      notes:
                        event.target
                          .value,
                    })
                  }
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
              >
                <Save size={17} />
                Spremi promjene
              </button>
            </div>
          </form>
        )}

        {tab ===
          'service' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">
                  Servisna povijest
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Evidencija održavanja i sljedećih servisa.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setServiceModal(
                    true,
                  )
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white"
              >
                <Plus size={17} />
                Dodaj servis
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {services.length ===
              0 ? (
                <EmptyText>
                  Nema evidentiranih servisa.
                </EmptyText>
              ) : (
                services.map(
                  (service) => (
                    <div
                      key={
                        service.id
                      }
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-white">
                            {
                              service.title
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              service.serviceDate,
                            )}
                            {' · '}
                            {mileage(
                              service.mileage,
                            )}
                          </p>
                        </div>

                        <strong className="text-sm text-emerald-300">
                          {money(
                            service.cost,
                          )}
                        </strong>
                      </div>

                      {service.description && (
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {
                            service.description
                          }
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        {service.provider && (
                          <span>
                            Servis:{' '}
                            {
                              service.provider
                            }
                          </span>
                        )}

                        {service.nextServiceDate && (
                          <span>
                            Sljedeći:{' '}
                            {formatDate(
                              service.nextServiceDate,
                            )}
                          </span>
                        )}

                        {service.nextServiceMileage && (
                          <span>
                            /
                            {' '}
                            {mileage(
                              service.nextServiceMileage,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </section>
        )}

        {tab ===
          'expenses' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">
                  Troškovi vozila
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Gorivo, osiguranje, registracija, gume i ostalo.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpenseModal(
                    true,
                  )
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white"
              >
                <Plus size={17} />
                Dodaj trošak
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
              {expenses.length ===
              0 ? (
                <EmptyText>
                  Nema evidentiranih troškova.
                </EmptyText>
              ) : (
                expenses.map(
                  (expense) => (
                    <div
                      key={
                        expense.id
                      }
                      className="grid gap-2 border-b border-slate-800 bg-slate-950/50 px-4 py-3 last:border-b-0 sm:grid-cols-[130px_150px_1fr_130px] sm:items-center"
                    >
                      <span className="text-xs text-slate-500">
                        {formatDate(
                          expense.expenseDate,
                        )}
                      </span>

                      <span className="text-xs font-bold text-blue-300">
                        {
                          expense.category
                        }
                      </span>

                      <span className="text-sm text-slate-300">
                        {expense.description ||
                          '—'}
                      </span>

                      <strong className="text-right text-sm text-white">
                        {money(
                          expense.amount,
                        )}
                      </strong>
                    </div>
                  ),
                )
              )}
            </div>
          </section>
        )}
      </section>

      {serviceModal && (
        <Modal
          title="Novi servis"
          onClose={() =>
            setServiceModal(
              false,
            )
          }
        >
          <form
            onSubmit={
              submitService
            }
            className="space-y-4"
          >
            <DateField
              label="Datum servisa"
              value={
                serviceForm.serviceDate
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    serviceDate:
                      value,
                  }),
                )
              }
            />

            <TextField
              label="Naziv servisa"
              value={
                serviceForm.title
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    title: value,
                  }),
                )
              }
            />

            <NumberField
              label="Kilometraža"
              value={
                serviceForm.mileage ??
                null
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    mileage:
                      value,
                  }),
                )
              }
            />

            <TextField
              label="Servis / izvođač"
              value={
                serviceForm.provider ??
                ''
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    provider:
                      value,
                  }),
                )
              }
            />

            <NumberField
              label="Trošak €"
              value={
                serviceForm.cost ??
                0
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    cost:
                      value ?? 0,
                  }),
                )
              }
            />

            <DateField
              label="Sljedeći servis – datum"
              value={
                serviceForm.nextServiceDate ??
                ''
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    nextServiceDate:
                      value,
                  }),
                )
              }
            />

            <NumberField
              label="Sljedeći servis – km"
              value={
                serviceForm.nextServiceMileage ??
                null
              }
              onChange={(value) =>
                setServiceForm(
                  (current) => ({
                    ...current,
                    nextServiceMileage:
                      value,
                  }),
                )
              }
            />

            <label>
              <FieldLabel>
                Opis radova
              </FieldLabel>

              <textarea
                value={
                  serviceForm.description ??
                  ''
                }
                onChange={(event) =>
                  setServiceForm(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    }),
                  )
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />
            </label>

            <SaveButton
              loading={isSaving}
            />
          </form>
        </Modal>
      )}

      {expenseModal && (
        <Modal
          title="Novi trošak"
          onClose={() =>
            setExpenseModal(
              false,
            )
          }
        >
          <form
            onSubmit={
              submitExpense
            }
            className="space-y-4"
          >
            <DateField
              label="Datum"
              value={
                expenseForm.expenseDate
              }
              onChange={(value) =>
                setExpenseForm(
                  (current) => ({
                    ...current,
                    expenseDate:
                      value,
                  }),
                )
              }
            />

            <label>
              <FieldLabel>
                Kategorija
              </FieldLabel>

              <select
                value={
                  expenseForm.category
                }
                onChange={(event) =>
                  setExpenseForm(
                    (current) => ({
                      ...current,
                      category:
                        event.target
                          .value as VehicleExpenseCategory,
                    }),
                  )
                }
                className="min-h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-blue-500"
              >
                {expenseCategories.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>
            </label>

            <NumberField
              label="Iznos €"
              value={
                expenseForm.amount
              }
              onChange={(value) =>
                setExpenseForm(
                  (current) => ({
                    ...current,
                    amount:
                      value ?? 0,
                  }),
                )
              }
            />

            <NumberField
              label="Kilometraža"
              value={
                expenseForm.mileage ??
                null
              }
              onChange={(value) =>
                setExpenseForm(
                  (current) => ({
                    ...current,
                    mileage:
                      value,
                  }),
                )
              }
            />

            <TextField
              label="Opis"
              value={
                expenseForm.description ??
                ''
              }
              onChange={(value) =>
                setExpenseForm(
                  (current) => ({
                    ...current,
                    description:
                      value,
                  }),
                )
              }
            />

            <SaveButton
              loading={isSaving}
            />
          </form>
        </Modal>
      )}
    </>
  )
}

function InfoStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <Icon
        size={20}
        className="text-blue-400"
      />

      <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-xl px-5 text-sm font-bold ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function FieldLabel({
  children,
}: {
  children: string
}) {
  return (
    <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </span>
  )
}

function TextField({
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
      <FieldLabel>
        {label}
      </FieldLabel>

      <input
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

function NumberField({
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
      <FieldLabel>
        {label}
      </FieldLabel>

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

function DateField({
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
      <FieldLabel>
        {label}
      </FieldLabel>

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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-black text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

function SaveButton({
  loading,
}: {
  loading: boolean
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
    >
      <Save size={17} />
      {loading
        ? 'Spremanje...'
        : 'Spremi'}
    </button>
  )
}

function EmptyText({
  children,
}: {
  children: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}