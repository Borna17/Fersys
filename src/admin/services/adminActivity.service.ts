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
  recentEvents: AdminActivityEvent[]
}

export type AdminTodayActivity = {
  uniqueUsers: number
  onlineNow: number
  totalSeconds: number
  pageViews: number
  users: AdminActivityUser[]
  generatedAt: string
}

export async function getAdminTodayActivity(): Promise<AdminTodayActivity> {
  const { data, error } = await supabase.rpc(
    'admin_get_today_user_activity_v1',
  )

  if (error) throw error

  if (!data?.allowed) {
    throw new Error('Nemate pristup aktivnosti korisnika.')
  }

  return {
    uniqueUsers: Number(data.uniqueUsers ?? 0),
    onlineNow: Number(data.onlineNow ?? 0),
    totalSeconds: Number(data.totalSeconds ?? 0),
    pageViews: Number(data.pageViews ?? 0),
    generatedAt: String(data.generatedAt ?? ''),
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
