import { supabase } from '../lib/supabase'

export type NotificationMode =
  | 'enabled'
  | 'silent'
  | 'off'

export type AppNotificationKind =
  | 'calendar'
  | 'support'
  | 'subscription'
  | 'employee'
  | 'system'
  | 'work_orders'
  | 'offers'
  | 'invoices'
  | 'incoming_invoices'
  | 'inventory'
  | 'vehicles'

export type NotificationCategory =
  | 'work_orders'
  | 'offers'
  | 'invoices'
  | 'incoming_invoices'
  | 'inventory'
  | 'vehicles'
  | 'calendar'
  | 'employee'
  | 'support'
  | 'subscription'
  | 'system'

export type AppNotification = {
  id: string
  title: string
  description: string
  route: string
  createdAt: string
  isRead: boolean
  isSilent: boolean
  kind: AppNotificationKind
  senderName: string
  companyName: string
  fersysCode: string
}

export type NotificationPreference = {
  category: NotificationCategory
  mode: NotificationMode
  reminderDays: number[]
}

export const notificationCategoryLabels:
Record<NotificationCategory, string> = {
  work_orders: 'Radni nalozi',
  offers: 'Ponude',
  invoices: 'Izlazni računi',
  incoming_invoices: 'Ulazni računi',
  inventory: 'Skladište',
  vehicles: 'Vozila',
  calendar: 'Kalendar',
  employee: 'Zaposlenici',
  support: 'Podrška',
  subscription: 'Pretplata',
  system: 'Sustav',
}

const defaultPreferences:
NotificationPreference[] = [
  { category: 'work_orders', mode: 'enabled', reminderDays: [] },
  { category: 'offers', mode: 'enabled', reminderDays: [] },
  { category: 'invoices', mode: 'enabled', reminderDays: [5, 1, 0] },
  { category: 'incoming_invoices', mode: 'enabled', reminderDays: [5, 1, 0] },
  { category: 'inventory', mode: 'silent', reminderDays: [] },
  { category: 'vehicles', mode: 'enabled', reminderDays: [30, 14, 5, 1, 0] },
  { category: 'calendar', mode: 'enabled', reminderDays: [1, 0] },
  { category: 'employee', mode: 'silent', reminderDays: [] },
  { category: 'support', mode: 'enabled', reminderDays: [] },
  { category: 'subscription', mode: 'enabled', reminderDays: [] },
  { category: 'system', mode: 'enabled', reminderDays: [] },
]

type PreferenceRow = {
  category: NotificationCategory
  mode: NotificationMode
  reminder_days: number[] | null
}

type EventRow = {
  id: string
  category: NotificationCategory
  title: string
  description: string
  route: string
  actor_name: string | null
  created_at: string
}

type LegacyRow = {
  id: string
  title: string
  description: string
  route: string
  kind: AppNotificationKind
  created_at: string
  read_at: string | null
  sender_name: string | null
  company_name: string | null
  fersys_code: string | null
}

async function getContext() {
  const [
    userResult,
    companyResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('current_company_id'),
  ])

  if (userResult.error) {
    throw userResult.error
  }

  if (companyResult.error) {
    throw companyResult.error
  }

  if (!userResult.data.user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  if (!companyResult.data) {
    throw new Error(
      'Aktivna tvrtka nije pronađena.',
    )
  }

  return {
    userId:
      userResult.data.user.id,
    companyId:
      String(companyResult.data),
  }
}

function localDate(
  date: Date,
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0')

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function daysBetween(
  targetDate: string,
) {
  if (!targetDate) {
    return null
  }

  const target =
    new Date(
      `${targetDate}T12:00:00`,
    )

  if (
    Number.isNaN(
      target.getTime(),
    )
  ) {
    return null
  }

  const today =
    new Date()

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

function dateLabel(
  days: number,
) {
  if (days === 0) {
    return 'danas'
  }

  if (days === 1) {
    return 'sutra'
  }

  if (days > 1) {
    return `za ${days} dana`
  }

  if (days === -1) {
    return 'kasni 1 dan'
  }

  return `kasni ${Math.abs(
    days,
  )} dana`
}

function asNumber(
  value: unknown,
) {
  const parsed =
    Number(value ?? 0)

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0
}

function money(
  value: unknown,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(
    asNumber(value),
  )
}

function getPreferenceMap(
  preferences:
    NotificationPreference[],
) {
  return new Map(
    preferences.map(
      (item) => [
        item.category,
        item,
      ],
    ),
  )
}

export async function getNotificationPreferences():
Promise<NotificationPreference[]> {
  const {
    userId,
    companyId,
  } =
    await getContext()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'notification_preferences_v2',
      )
      .select(
        'category,mode,reminder_days',
      )
      .eq(
        'user_id',
        userId,
      )
      .eq(
        'company_id',
        companyId,
      )

  if (error) {
    throw error
  }

  const rows =
    (data ?? []) as
      PreferenceRow[]

  const existing =
    new Map(
      rows.map(
        (row) => [
          row.category,
          {
            category:
              row.category,
            mode: row.mode,
            reminderDays:
              row.reminder_days ??
              [],
          } satisfies
            NotificationPreference,
        ],
      ),
    )

  return defaultPreferences.map(
    (fallback) =>
      existing.get(
        fallback.category,
      ) ??
      fallback,
  )
}

export async function saveNotificationPreference(
  preference:
    NotificationPreference,
) {
  const {
    userId,
    companyId,
  } =
    await getContext()

  const {
    error,
  } =
    await supabase
      .from(
        'notification_preferences_v2',
      )
      .upsert(
        {
          user_id:
            userId,
          company_id:
            companyId,
          category:
            preference.category,
          mode:
            preference.mode,
          reminder_days:
            preference.reminderDays,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'user_id,company_id,category',
        },
      )

  if (error) {
    throw error
  }

  window.dispatchEvent(
    new Event(
      'fersys:notifications-refresh',
    ),
  )
}

async function getReadKeys(
  userId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'notification_reads',
      )
      .select(
        'notification_key',
      )
      .eq(
        'user_id',
        userId,
      )

  if (error) {
    throw error
  }

  return new Set(
    (data ?? []).map(
      (item) =>
        String(
          item.notification_key,
        ),
    ),
  )
}

async function getActivityNotifications(
  companyId: string,
  readKeys:
    Set<string>,
  prefMap:
    Map<
      NotificationCategory,
      NotificationPreference
    >,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'notification_events_v2',
      )
      .select(
        'id,category,title,description,route,actor_name,created_at',
      )
      .eq(
        'company_id',
        companyId,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )
      .limit(50)

  if (error) {
    throw error
  }

  return (
    (data ?? []) as
      EventRow[]
  )
    .filter((row) => {
      const pref =
        prefMap.get(
          row.category,
        )

      return (
        pref?.mode ??
        'enabled'
      ) !== 'off'
    })
    .map((row) => {
      const pref =
        prefMap.get(
          row.category,
        )

      const id =
        `event-v2:${row.id}`

      return {
        id,
        title:
          row.title,
        description:
          row.description,
        route:
          row.route ||
          '/dashboard',
        createdAt:
          row.created_at,
        isRead:
          readKeys.has(id),
        isSilent:
          pref?.mode ===
          'silent',
        kind:
          row.category,
        senderName:
          row.actor_name ??
          '',
        companyName: '',
        fersysCode: '',
      } satisfies AppNotification
    })
}

async function getVehicleReminders(
  companyId: string,
  readKeys:
    Set<string>,
  preference:
    NotificationPreference,
) {
  if (
    preference.mode ===
    'off'
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('vehicles')
      .select(
        'id,registration,make,model,registration_expires_on,insurance_expires_on,next_service_date,next_service_mileage,mileage,status',
      )
      .eq(
        'company_id',
        companyId,
      )
      .neq(
        'status',
        'Neaktivno',
      )

  if (error) {
    console.error(
      'Vehicle reminder:',
      error,
    )
    return []
  }

  const result:
    AppNotification[] = []

  for (
    const vehicle of
      data ?? []
  ) {
    const name =
      `${vehicle.registration ?? ''} · ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim()

    const checks = [
      {
        type:
          'registration',
        date:
          String(
            vehicle.registration_expires_on ??
            '',
          ),
        title:
          'Registracija vozila',
        description:
          name,
      },
      {
        type:
          'insurance',
        date:
          String(
            vehicle.insurance_expires_on ??
            '',
          ),
        title:
          'Osiguranje vozila',
        description:
          name,
      },
      {
        type:
          'service-date',
        date:
          String(
            vehicle.next_service_date ??
            '',
          ),
        title:
          'Servis vozila',
        description:
          name,
      },
    ]

    for (
      const check of checks
    ) {
      const days =
        daysBetween(
          check.date,
        )

      if (
        days === null
      ) {
        continue
      }

      if (
        !preference
          .reminderDays
          .includes(days)
        &&
        days >= 0
      ) {
        continue
      }

      if (days < -30) {
        continue
      }

      const id =
        `vehicle:${vehicle.id}:${check.type}:${check.date}:${days}`

      result.push({
        id,
        title:
          `${check.title} ${dateLabel(
            days,
          )}`,
        description:
          check.description,
        route:
          `/vehicles/${vehicle.id}`,
        createdAt:
          new Date()
            .toISOString(),
        isRead:
          readKeys.has(id),
        isSilent:
          preference.mode ===
          'silent',
        kind:
          'vehicles',
        senderName: '',
        companyName: '',
        fersysCode: '',
      })
    }

    const nextKm =
      asNumber(
        vehicle.next_service_mileage,
      )

    const currentKm =
      asNumber(
        vehicle.mileage,
      )

    if (
      nextKm > 0
    ) {
      const remaining =
        nextKm -
        currentKm

      if (
        remaining <= 1000
      ) {
        const id =
          `vehicle:${vehicle.id}:service-km:${nextKm}`

        result.push({
          id,
          title:
            remaining <= 0
              ? 'Servis po kilometraži je dospio'
              : `Servis za ${new Intl.NumberFormat(
                  'hr-HR',
                ).format(
                  remaining,
                )} km`,
          description:
            name,
          route:
            `/vehicles/${vehicle.id}`,
          createdAt:
            new Date()
              .toISOString(),
          isRead:
            readKeys.has(id),
          isSilent:
            preference.mode ===
            'silent',
          kind:
            'vehicles',
          senderName: '',
          companyName: '',
          fersysCode: '',
        })
      }
    }
  }

  return result
}

async function getInvoiceReminders(
  companyId: string,
  readKeys:
    Set<string>,
  preference:
    NotificationPreference,
) {
  if (
    preference.mode ===
    'off'
  ) {
    return []
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('invoices')
      .select('*')
      .eq(
        'company_id',
        companyId,
      )
      .limit(200)

  if (error) {
    console.error(
      'Invoice reminders:',
      error,
    )
    return []
  }

  const result:
    AppNotification[] = []

  for (
    const invoice of
      data ?? []
  ) {
    const status =
      String(
        invoice.status ??
        '',
      ).toLowerCase()

    if (
      status.includes(
        'plać',
      ) ||
      status.includes(
        'plac',
      ) ||
      status === 'paid'
    ) {
      continue
    }

    const dueDate =
      String(
        invoice.due_date ??
        invoice.dueDate ??
        '',
      )

    const days =
      daysBetween(
        dueDate,
      )

    if (
      days === null
    ) {
      continue
    }

    if (
      days >= 0 &&
      !preference
        .reminderDays
        .includes(days)
    ) {
      continue
    }

    if (days < -60) {
      continue
    }

    const invoiceId =
      String(
        invoice.id ??
        '',
      )

    const number =
      String(
        invoice.invoice_number ??
        invoice.invoiceNumber ??
        'Račun',
      )

    const customer =
      String(
        invoice.customer_name ??
        invoice.customerName ??
        '',
      )

    const total =
      invoice.total ??
      invoice.total_amount ??
      invoice.totalPrice ??
      invoice.amount ??
      0

    const id =
      `invoice:${invoiceId}:due:${dueDate}:${days}`

    result.push({
      id,
      title:
        days < 0
          ? `Račun ${number} je dospio`
          : `Račun ${number} dospijeva ${dateLabel(
              days,
            )}`,
      description:
        [
          customer,
          money(total),
        ]
          .filter(Boolean)
          .join(' · '),
      route:
        '/invoices',
      createdAt:
        new Date()
          .toISOString(),
      isRead:
        readKeys.has(id),
      isSilent:
        preference.mode ===
        'silent',
      kind:
        'invoices',
      senderName: '',
      companyName: '',
      fersysCode: '',
    })
  }

  return result
}

async function getCalendarNotifications(
  readKeys:
    Set<string>,
  preference:
    NotificationPreference,
) {
  if (
    preference.mode ===
    'off'
  ) {
    return []
  }

  const today =
    new Date()

  const from =
    localDate(today)

  const future =
    new Date(today)

  future.setDate(
    future.getDate() + 7,
  )

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'calendar_events',
      )
      .select(
        'id,title,customer_name,event_date,start_time,status,updated_at',
      )
      .gte(
        'event_date',
        from,
      )
      .lte(
        'event_date',
        localDate(future),
      )
      .neq(
        'status',
        'Otkazano',
      )
      .order(
        'event_date',
        {
          ascending: true,
        },
      )
      .limit(20)

  if (error) {
    console.error(
      'Calendar notifications:',
      error,
    )
    return []
  }

  return (
    data ?? []
  )
    .map((event) => {
      const days =
        daysBetween(
          event.event_date,
        )

      if (
        days === null ||
        (
          days >= 0 &&
          !preference
            .reminderDays
            .includes(days)
        )
      ) {
        return null
      }

      const id =
        `calendar:${event.id}:${event.event_date}:${event.start_time}`

      return {
        id,
        title:
          days === 0
            ? `Današnji termin u ${String(
                event.start_time,
              ).slice(
                0,
                5,
              )}`
            : `Termin ${dateLabel(
                days,
              )} u ${String(
                event.start_time,
              ).slice(
                0,
                5,
              )}`,
        description:
          [
            event.title,
            event.customer_name,
          ]
            .filter(Boolean)
            .join(' · '),
        route:
          '/calendar',
        createdAt:
          event.updated_at,
        isRead:
          readKeys.has(id),
        isSilent:
          preference.mode ===
          'silent',
        kind:
          'calendar' as const,
        senderName: '',
        companyName: '',
        fersysCode: '',
      } satisfies AppNotification
    })
    .filter(
      (
        value: any,
      ): value is AppNotification =>
        value !== null,
    )
}

async function getLegacyNotifications(
  prefMap:
    Map<
      NotificationCategory,
      NotificationPreference
    >,
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_my_app_notifications',
    )

  if (error) {
    console.error(
      'Legacy notifications:',
      error,
    )
    return []
  }

  return (
    (data ?? []) as
      LegacyRow[]
  )
    .filter((item) => {
      const pref =
        prefMap.get(
          item.kind as
            NotificationCategory,
        )

      return (
        pref?.mode ??
        'enabled'
      ) !== 'off'
    })
    .map((item) => {
      const pref =
        prefMap.get(
          item.kind as
            NotificationCategory,
        )

      return {
        id:
          `legacy:${item.id}`,
        title:
          item.title,
        description:
          item.description,
        route:
          item.route ||
          '/dashboard',
        createdAt:
          item.created_at,
        isRead:
          Boolean(
            item.read_at,
          ),
        isSilent:
          pref?.mode ===
          'silent',
        kind:
          item.kind,
        senderName:
          item.sender_name ??
          '',
        companyName:
          item.company_name ??
          '',
        fersysCode:
          item.fersys_code ??
          '',
      } satisfies AppNotification
    })
}

export async function getNotifications():
Promise<AppNotification[]> {
  const {
    userId,
    companyId,
  } =
    await getContext()

  const [
    preferences,
    readKeys,
  ] =
    await Promise.all([
      getNotificationPreferences(),
      getReadKeys(userId),
    ])

  const prefMap =
    getPreferenceMap(
      preferences,
    )

  const [
    activities,
    vehicles,
    invoices,
    calendar,
    legacy,
  ] =
    await Promise.all([
      getActivityNotifications(
        companyId,
        readKeys,
        prefMap,
      ),
      getVehicleReminders(
        companyId,
        readKeys,
        prefMap.get(
          'vehicles',
        )!,
      ),
      getInvoiceReminders(
        companyId,
        readKeys,
        prefMap.get(
          'invoices',
        )!,
      ),
      getCalendarNotifications(
        readKeys,
        prefMap.get(
          'calendar',
        )!,
      ),
      getLegacyNotifications(
        prefMap,
      ),
    ])

  const deduped =
    new Map<
      string,
      AppNotification
    >()

  ;[
    ...activities,
    ...vehicles,
    ...invoices,
    ...calendar,
    ...legacy,
  ]
    .filter((i): i is AppNotification => Boolean(i))
    .forEach((item) => {
      deduped.set(item.id, item)
    })

  return Array.from(
    deduped.values(),
  )
    .sort(
      (first, second) =>
        new Date(
          second.createdAt,
        ).getTime() -
        new Date(
          first.createdAt,
        ).getTime(),
    )
    .slice(0, 100)
}

export async function markNotificationRead(
  notificationKey: string,
) {
  if (
    notificationKey.startsWith(
      'legacy:',
    )
  ) {
    const id =
      notificationKey.replace(
        'legacy:',
        '',
      )

    const {
      error,
    } =
      await supabase.rpc(
        'mark_app_notification_read',
        {
          requested_notification_id:
            id,
        },
      )

    if (error) {
      throw error
    }

    return
  }

  const {
    userId,
  } =
    await getContext()

  const {
    error,
  } =
    await supabase
      .from(
        'notification_reads',
      )
      .upsert(
        {
          user_id:
            userId,
          notification_key:
            notificationKey,
          read_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'user_id,notification_key',
        },
      )

  if (error) {
    throw error
  }
}

export async function markAllNotificationsRead(
  keys: string[],
) {
  if (
    keys.length === 0
  ) {
    return
  }

  const legacyIds =
    keys
      .filter(
        (key) =>
          key.startsWith(
            'legacy:',
          ),
      )
      .map(
        (key) =>
          key.replace(
            'legacy:',
            '',
          ),
      )

  const regular =
    keys.filter(
      (key) =>
        !key.startsWith(
          'legacy:',
        ),
    )

  const tasks:
    Promise<unknown>[] = []

  if (
    legacyIds.length > 0
  ) {
    tasks.push(
      (async () => {
        const {
          error,
        } =
          await supabase.rpc(
            'mark_all_app_notifications_read',
            {
              requested_notification_ids:
                legacyIds,
            },
          )

        if (error) {
          throw error
        }
      })(),
    )
  }

  if (
    regular.length > 0
  ) {
    tasks.push(
      (async () => {
        const {
          userId,
        } =
          await getContext()

        const now =
          new Date()
            .toISOString()

        const {
          error,
        } =
          await supabase
            .from(
              'notification_reads',
            )
            .upsert(
              regular.map(
                (key) => ({
                  user_id:
                    userId,
                  notification_key:
                    key,
                  read_at:
                    now,
                }),
              ),
              {
                onConflict:
                  'user_id,notification_key',
              },
            )

        if (error) {
          throw error
        }
      })(),
    )
  }

  await Promise.all(
    tasks,
  )
}