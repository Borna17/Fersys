import { supabase } from '../lib/supabase'

export type ActivityEventType =
  | 'session_start'
  | 'page_view'
  | 'heartbeat'
  | 'session_end'

export async function recordActivity(input: {
  sessionKey: string
  eventType: ActivityEventType
  route: string
  label?: string
  platform?: string
  userAgent?: string
  endSession?: boolean
}): Promise<void> {
  const { error } = await supabase.rpc(
    'record_my_activity_v1',
    {
      requested_session_key: input.sessionKey,
      requested_event_type: input.eventType,
      requested_route: input.route,
      requested_label: input.label ?? null,
      requested_platform: input.platform ?? 'web',
      requested_user_agent: input.userAgent ?? null,
      requested_end_session: input.endSession ?? false,
    },
  )

  if (error) {
    // Activity tracking must never block normal FERSYS usage.
    console.warn('FERSYS activity tracking:', error.message)
  }
}
