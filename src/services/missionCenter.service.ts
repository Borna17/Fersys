import { supabase } from '../lib/supabase'

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Korisnik nije prijavljen.')
  return data.user.id
}

export async function getMissionFlags() {
  const userId = await currentUserId()
  const { data, error } = await supabase
    .from('user_mission_progress')
    .select('ai_opened,celebration_seen')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('user_mission_progress')
      .insert({ user_id: userId })
      .select('ai_opened,celebration_seen')
      .single()

    if (createError) throw createError

    return {
      aiOpened: Boolean(created.ai_opened),
      celebrationSeen: Boolean(created.celebration_seen),
    }
  }

  return {
    aiOpened: Boolean(data.ai_opened),
    celebrationSeen: Boolean(data.celebration_seen),
  }
}

export async function markAiMissionOpened() {
  const userId = await currentUserId()
  const { error } = await supabase
    .from('user_mission_progress')
    .upsert({
      user_id: userId,
      ai_opened: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) throw error
}

export async function markMissionCelebrationSeen() {
  const userId = await currentUserId()
  const { error } = await supabase
    .from('user_mission_progress')
    .upsert({
      user_id: userId,
      celebration_seen: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) throw error
}

export async function getCalendarEventCount() {
  const { count, error } = await supabase
    .from('calendar_events')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function getInventoryItemCount() {
  const { count, error } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

