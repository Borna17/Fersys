import { supabase } from '../../lib/supabase'

export type AdminActivityEvent = {
  type: string
  route: string
  label: string
  createdAt: string
}

export type AdminActivityUser = {
  userId: string
  companyId: string
  userName: string
  email: string
  companyName: string
  firstSeenAt: string
  lastSeenAt: string
  durationSeconds: number
  lastRoute: string
  isOnline: boolean
  sessionsCount: number
  pageViews: number
  businessActions: number
  recentEvents: AdminActivityEvent[]
}

export type AdminTodayActivity = {
  uniqueUsers: number
  onlineNow: number
  totalSeconds: number
  pageViews: number
  businessActions: number
  sessions: number
  users: AdminActivityUser[]
  generatedAt: string
  rangeStart: string
  rangeEnd: string
}

export type AdminActivityRange = {
  start: Date
  end: Date
}

function mapActivityResponse(
  data: Record<string, unknown>,
): AdminTodayActivity {
  return {
    uniqueUsers: Number(data.uniqueUsers ?? 0),
    onlineNow: Number(data.onlineNow ?? 0),
    totalSeconds: Number(data.totalSeconds ?? 0),
    pageViews: Number(data.pageViews ?? 0),
    businessActions: Number(data.businessActions ?? 0),
    sessions: Number(data.sessions ?? 0),
    generatedAt: String(data.generatedAt ?? ''),
    rangeStart: String(data.rangeStart ?? ''),
    rangeEnd: String(data.rangeEnd ?? ''),
    users: Array.isArray(data.users)
      ? data.users.map((row: Record<string, unknown>) => ({
          userId: String(row.userId ?? ''),
          companyId: String(row.companyId ?? ''),
          userName: String(row.userName ?? 'Korisnik'),
          email: String(row.email ?? ''),
          companyName: String(row.companyName ?? 'Tvrtka'),
          firstSeenAt: String(row.firstSeenAt ?? ''),
          lastSeenAt: String(row.lastSeenAt ?? ''),
          durationSeconds: Number(row.durationSeconds ?? 0),
          lastRoute: String(row.lastRoute ?? '/dashboard'),
          isOnline: Boolean(row.isOnline),
          sessionsCount: Number(row.sessionsCount ?? 0),
          pageViews: Number(row.pageViews ?? 0),
          businessActions: Number(row.businessActions ?? 0),
          recentEvents: Array.isArray(row.recentEvents)
            ? row.recentEvents.map((event: Record<string, unknown>) => ({
                type: String(event.type ?? ''),
                route: String(event.route ?? ''),
                label: String(event.label ?? ''),
                createdAt: String(event.createdAt ?? ''),
              }))
            : [],
        }))
      : [],
  }
}

export async function getAdminActivityRange(
  range: AdminActivityRange,
): Promise<AdminTodayActivity> {
  const { data, error } = await supabase.rpc(
    'admin_get_user_activity_range_v1',
    {
      requested_start: range.start.toISOString(),
      requested_end: range.end.toISOString(),
    },
  )

  if (error) throw error

  if (!data?.allowed) {
    throw new Error('Nemate pristup aktivnosti korisnika.')
  }

  return mapActivityResponse(data as Record<string, unknown>)
}

export async function getAdminTodayActivity(): Promise<AdminTodayActivity> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return getAdminActivityRange({ start, end })
}
