import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  CarFront,
  FileInput,
  FileText,
  Package,
  ReceiptText,
  UsersRound,
  Wrench,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import {
  getNotificationPreferences,
  notificationCategoryLabels,
  saveNotificationPreference,
  type NotificationCategory,
  type NotificationMode,
  type NotificationPreference,
} from '../../services/notifications.service'

const visibleCategories:
Array<{
  category:
    NotificationCategory
  icon:
    typeof Bell
  description:
    string
  supportsReminders?:
    boolean
}> = [
  {
    category:
      'work_orders',
    icon: Wrench,
    description:
      'Novi radni nalozi koje izrade korisnici tvrtke.',
  },
  {
    category:
      'offers',
    icon: FileText,
    description:
      'Nove ponude i aktivnosti vezane uz ponude.',
  },
  {
    category:
      'invoices',
    icon: ReceiptText,
    description:
      'Novi računi i upozorenja prije/poslije dospijeća.',
    supportsReminders:
      true,
  },
  {
    category:
      'incoming_invoices',
    icon: FileInput,
    description:
      'Novi i skenirani ulazni računi.',
    supportsReminders:
      true,
  },
  {
    category:
      'inventory',
    icon: Package,
    description:
      'Promjene skladišta i upozorenja na malu zalihu.',
  },
  {
    category:
      'vehicles',
    icon: CarFront,
    description:
      'Registracija, osiguranje, servis i aktivnosti vozila.',
    supportsReminders:
      true,
  },
  {
    category:
      'calendar',
    icon: CalendarDays,
    description:
      'Nadolazeći termini i kalendar.',
    supportsReminders:
      true,
  },
  {
    category:
      'employee',
    icon: UsersRound,
    description:
      'Promjene zaposlenika i njihovih uloga.',
  },
]

const reminderOptions = [
  30,
  14,
  5,
  1,
  0,
]

function modeLabel(
  mode: NotificationMode,
) {
  if (
    mode === 'enabled'
  ) {
    return 'Uključeno'
  }

  if (
    mode === 'silent'
  ) {
    return 'Tiho'
  }

  return 'Isključeno'
}

function modeClass(
  mode: NotificationMode,
) {
  if (
    mode === 'enabled'
  ) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  }

  if (
    mode === 'silent'
  ) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  }

  return 'border-slate-700 bg-slate-800 text-slate-400'
}

export default function NotificationPreferencesPanel() {
  const [
    preferences,
    setPreferences,
  ] =
    useState<
      NotificationPreference[]
    >([])

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    savingCategory,
    setSavingCategory,
  ] =
    useState<
      NotificationCategory | null
    >(null)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data =
          await getNotificationPreferences()

        if (!cancelled) {
          setPreferences(
            data,
          )
        }
      } catch (value) {
        if (!cancelled) {
          setError(
            value instanceof Error
              ? value.message
              : 'Postavke obavijesti nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function update(
    next:
      NotificationPreference,
  ) {
    const previous =
      preferences

    setPreferences(
      (current) =>
        current.map(
          (item) =>
            item.category ===
            next.category
              ? next
              : item,
        ),
    )

    try {
      setSavingCategory(
        next.category,
      )
      setError('')

      await saveNotificationPreference(
        next,
      )
    } catch (value) {
      setPreferences(
        previous,
      )

      setError(
        value instanceof Error
          ? value.message
          : 'Postavku nije moguće spremiti.',
      )
    } finally {
      setSavingCategory(
        null,
      )
    }
  }

  function preferenceFor(
    category:
      NotificationCategory,
  ) {
    return preferences.find(
      (item) =>
        item.category ===
        category,
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
        Učitavanje postavki obavijesti...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex gap-3">
          <BellRing
            size={21}
            className="mt-0.5 shrink-0 text-blue-400"
          />

          <div>
            <h3 className="font-black text-white">
              Notification Center
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Uključeno prikazuje normalnu obavijest i broji je na zvoncu. Tiho je vidljivo u centru, ali ne povećava broj upozorenja. Isključeno potpuno skriva kategoriju.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleCategories.map(
          ({
            category,
            icon: Icon,
            description,
            supportsReminders,
          }) => {
            const pref =
              preferenceFor(
                category,
              )

            if (!pref) {
              return null
            }

            return (
              <article
                key={
                  category
                }
                className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
                    <Icon
                      size={20}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-white">
                          {
                            notificationCategoryLabels[
                              category
                            ]
                          }
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {
                            description
                          }
                        </p>
                      </div>

                      {savingCategory ===
                        category && (
                        <span className="text-xs font-bold text-blue-400">
                          Spremanje...
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(
                        [
                          'enabled',
                          'silent',
                          'off',
                        ] as NotificationMode[]
                      ).map(
                        (mode) => {
                          const ModeIcon =
                            mode ===
                            'enabled'
                              ? BellRing
                              : mode ===
                                  'silent'
                                ? Bell
                                : BellOff

                          return (
                            <button
                              key={
                                mode
                              }
                              type="button"
                              onClick={() =>
                                void update({
                                  ...pref,
                                  mode,
                                })
                              }
                              className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-black transition ${
                                pref.mode ===
                                mode
                                  ? modeClass(
                                      mode,
                                    )
                                  : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-white'
                              }`}
                            >
                              <ModeIcon
                                size={14}
                              />
                              {modeLabel(
                                mode,
                              )}
                            </button>
                          )
                        },
                      )}
                    </div>

                    {supportsReminders &&
                      pref.mode !==
                        'off' && (
                        <div className="mt-4 border-t border-slate-800 pt-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Podsjeti me
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {reminderOptions.map(
                              (
                                days,
                              ) => {
                                const checked =
                                  pref.reminderDays.includes(
                                    days,
                                  )

                                return (
                                  <button
                                    key={
                                      days
                                    }
                                    type="button"
                                    onClick={() => {
                                      const nextDays =
                                        checked
                                          ? pref.reminderDays.filter(
                                              (
                                                item,
                                              ) =>
                                                item !==
                                                days,
                                            )
                                          : [
                                              ...pref.reminderDays,
                                              days,
                                            ].sort(
                                              (
                                                a,
                                                b,
                                              ) =>
                                                b -
                                                a,
                                            )

                                      void update({
                                        ...pref,
                                        reminderDays:
                                          nextDays,
                                      })
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                                      checked
                                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                        : 'border-slate-800 bg-slate-950 text-slate-500'
                                    }`}
                                  >
                                    {days ===
                                    0
                                      ? 'Na dan'
                                      : `${days} d prije`}
                                  </button>
                                )
                              },
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </article>
            )
          },
        )}
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200">
        Skladište je pripremljeno kao kategorija, ali potpune obavijesti između različitih uređaja uključit ćemo kada se skladišni podaci prebace iz localStoragea u Supabase.
      </div>
    </div>
  )
}
