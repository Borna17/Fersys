import { supabase } from '../lib/supabase'

export type AppNotificationKind =
  | 'calendar'
  | 'system'

export type AppNotification = {
  id: string
  title: string
  description: string
  route: string
  createdAt: string
  isRead: boolean
  kind: AppNotificationKind
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

function getLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(
  date: Date,
  days: number,
) {
  const result = new Date(date)
  result.setDate(
    result.getDate() + days,
  )

  return result
}

function formatEventTitle(
  eventDate: string,
  startTime: string,
) {
  const today =
    getLocalDateString(new Date())

  const tomorrow =
    getLocalDateString(
      addDays(new Date(), 1),
    )

  const time =
    startTime.slice(0, 5)

  if (eventDate === today) {
    return `Današnji termin u ${time}`
  }

  if (eventDate === tomorrow) {
    return `Termin sutra u ${time}`
  }

  const formattedDate =
    new Intl.DateTimeFormat(
      'hr-HR',
      {
        day: 'numeric',
        month: 'long',
      },
    ).format(
      new Date(
        `${eventDate}T12:00:00`,
      ),
    )

  return `Termin ${formattedDate} u ${time}`
}

async function getCurrentUserId() {
  const {
    data: {
      user,
    },
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
  const userId =
    await getCurrentUserId()

  const today = new Date()

  const from =
    getLocalDateString(today)

  const to =
    getLocalDateString(
      addDays(today, 7),
    )

  const [
    eventsResult,
    readsResult,
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
  ])

  if (eventsResult.error) {
    throw eventsResult.error
  }

  if (readsResult.error) {
    throw readsResult.error
  }

  const readKeys =
    new Set(
      (readsResult.data ?? []).map(
        (item) =>
          String(
            item.notification_key,
          ),
      ),
    )

  return (
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
      createdAt:
        event.updated_at,
      isRead:
        readKeys.has(
          notificationKey,
        ),
      kind: 'calendar',
    }
  })
}

export async function markNotificationRead(
  notificationKey: string,
): Promise<void> {
  const userId =
    await getCurrentUserId()

  const { error } = await supabase
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

  const userId =
    await getCurrentUserId()

  const now =
    new Date().toISOString()

  const rows =
    notificationKeys.map(
      (notificationKey) => ({
        user_id: userId,
        notification_key:
          notificationKey,
        read_at: now,
      }),
    )

  const { error } = await supabase
    .from('notification_reads')
    .upsert(rows, {
      onConflict:
        'user_id,notification_key',
    })

  if (error) {
    throw error
  }
}
