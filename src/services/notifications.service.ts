import { supabase } from '../lib/supabase'

export type AppNotificationKind =
  | 'calendar'
  | 'support'
  | 'subscription'
  | 'employee'
  | 'system'

export type AppNotification = {
  id: string
  title: string
  description: string
  route: string
  createdAt: string
  isRead: boolean
  kind: AppNotificationKind
  senderName: string
  companyName: string
  fersysCode: string
}

type CalendarNotificationRow = {
  id: string
  title: string
  customer_name: string | null
  event_date: string
  start_time: string
  status: string
  updated_at: string
}

type StoredNotificationRow = {
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

function getLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatEventTitle(
  eventDate: string,
  startTime: string,
) {
  const today = getLocalDateString(new Date())
  const tomorrow = getLocalDateString(
    addDays(new Date(), 1),
  )
  const time = startTime.slice(0, 5)

  if (eventDate === today) {
    return `Današnji termin u ${time}`
  }

  if (eventDate === tomorrow) {
    return `Termin sutra u ${time}`
  }

  const formattedDate =
    new Intl.DateTimeFormat('hr-HR', {
      day: 'numeric',
      month: 'long',
    }).format(
      new Date(`${eventDate}T12:00:00`),
    )

  return `Termin ${formattedDate} u ${time}`
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  return user.id
}

export async function getNotifications(): Promise<
  AppNotification[]
> {
  const userId = await getCurrentUserId()
  const today = new Date()
  const from = getLocalDateString(today)
  const to = getLocalDateString(
    addDays(today, 7),
  )

  const [
    eventsResult,
    readsResult,
    storedResult,
  ] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(
        'id,title,customer_name,event_date,start_time,status,updated_at',
      )
      .gte('event_date', from)
      .lte('event_date', to)
      .neq('status', 'Otkazano')
      .order('event_date', {
        ascending: true,
      })
      .order('start_time', {
        ascending: true,
      })
      .limit(20),

    supabase
      .from('notification_reads')
      .select('notification_key')
      .eq('user_id', userId),

    supabase.rpc(
      'get_my_app_notifications',
    ),
  ])

  if (eventsResult.error) {
    throw eventsResult.error
  }

  if (readsResult.error) {
    throw readsResult.error
  }

  if (storedResult.error) {
    throw storedResult.error
  }

  const readKeys = new Set(
    (readsResult.data ?? []).map(
      (item) =>
        String(item.notification_key),
    ),
  )

  const calendarNotifications = (
    (eventsResult.data ??
      []) as CalendarNotificationRow[]
  ).map((event) => {
    const notificationKey =
      `calendar:${event.id}:${event.updated_at}`

    const customerText =
      event.customer_name
        ? ` · ${event.customer_name}`
        : ''

    return {
      id: notificationKey,
      title: formatEventTitle(
        event.event_date,
        event.start_time,
      ),
      description:
        `${event.title}${customerText}`,
      route: '/calendar',
      createdAt: event.updated_at,
      isRead:
        readKeys.has(notificationKey),
      kind: 'calendar' as const,
      senderName: '',
      companyName: '',
      fersysCode: '',
    }
  })

  const storedNotifications = (
    (storedResult.data ??
      []) as StoredNotificationRow[]
  ).map((item) => ({
    id: `stored:${item.id}`,
    title: item.title,
    description: item.description,
    route:
      item.route || '/dashboard',
    createdAt: item.created_at,
    isRead:
      Boolean(item.read_at),
    kind: item.kind,
    senderName:
      item.sender_name ?? '',
    companyName:
      item.company_name ?? '',
    fersysCode:
      item.fersys_code ?? '',
  }))

  return [
    ...storedNotifications,
    ...calendarNotifications,
  ]
    .sort(
      (first, second) =>
        new Date(
          second.createdAt,
        ).getTime() -
        new Date(
          first.createdAt,
        ).getTime(),
    )
    .slice(0, 50)
}

export async function markNotificationRead(
  notificationKey: string,
): Promise<void> {
  if (
    notificationKey.startsWith(
      'stored:',
    )
  ) {
    const notificationId =
      notificationKey.replace(
        'stored:',
        '',
      )

    const { error } =
      await supabase.rpc(
        'mark_app_notification_read',
        {
          requested_notification_id:
            notificationId,
        },
      )

    if (error) {
      throw error
    }

    return
  }

  const userId =
    await getCurrentUserId()

  const { error } =
    await supabase
      .from('notification_reads')
      .upsert(
        {
          user_id: userId,
          notification_key:
            notificationKey,
          read_at:
            new Date().toISOString(),
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
  notificationKeys: string[],
): Promise<void> {
  if (
    notificationKeys.length === 0
  ) {
    return
  }

  const storedIds =
    notificationKeys
      .filter((key) =>
        key.startsWith('stored:'),
      )
      .map((key) =>
        key.replace('stored:', ''),
      )

  const calendarKeys =
    notificationKeys.filter(
      (key) =>
        !key.startsWith('stored:'),
    )

  const tasks: Promise<unknown>[] = []

  if (storedIds.length > 0) {
    tasks.push(
      (async () => {
        const { error } =
          await supabase.rpc(
            'mark_all_app_notifications_read',
            {
              requested_notification_ids:
                storedIds,
            },
          )

        if (error) {
          throw error
        }
      })(),
    )
  }

  if (calendarKeys.length > 0) {
    tasks.push(
      (async () => {
        const userId =
          await getCurrentUserId()
        const now =
          new Date().toISOString()

        const rows =
          calendarKeys.map(
            (notificationKey) => ({
              user_id: userId,
              notification_key:
                notificationKey,
              read_at: now,
            }),
          )

        const { error } =
          await supabase
            .from(
              'notification_reads',
            )
            .upsert(rows, {
              onConflict:
                'user_id,notification_key',
            })

        if (error) {
          throw error
        }
      })(),
    )
  }

  await Promise.all(tasks)
}