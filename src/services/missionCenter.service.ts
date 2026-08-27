import { supabase } from '../lib/supabase'

import {
  getInventoryItems,
} from './inventory.service'

const AI_MESSAGES_KEY =
  'fersys_ai_messages_v4'

type StoredAiMessage = {
  role?: string
  content?: string
}

async function currentUserId() {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  return data.user.id
}

function hasUsedAiLocally() {
  if (
    typeof window ===
      'undefined' ||
    !window.localStorage
  ) {
    return false
  }

  try {
    const raw =
      window.localStorage.getItem(
        AI_MESSAGES_KEY,
      )

    if (!raw) {
      return false
    }

    const messages =
      JSON.parse(
        raw,
      ) as StoredAiMessage[]

    if (
      !Array.isArray(
        messages,
      )
    ) {
      return false
    }

    return messages.some(
      (message) =>
        message?.role ===
          'user' &&
        typeof message.content ===
          'string' &&
        message.content.trim()
          .length > 0,
    )
  } catch {
    return false
  }
}

export async function getMissionFlags() {
  const userId =
    await currentUserId()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'user_mission_progress',
      )
      .select(
        'ai_opened,celebration_seen',
      )
      .eq(
        'user_id',
        userId,
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  const localAiUsed =
    hasUsedAiLocally()

  if (!data) {
    const {
      data: created,
      error:
        createError,
    } =
      await supabase
        .from(
          'user_mission_progress',
        )
        .insert({
          user_id:
            userId,
          ai_opened:
            localAiUsed,
        })
        .select(
          'ai_opened,celebration_seen',
        )
        .single()

    if (createError) {
      throw createError
    }

    return {
      aiOpened:
        Boolean(
          created.ai_opened,
        ) ||
        localAiUsed,

      celebrationSeen:
        Boolean(
          created
            .celebration_seen,
        ),
    }
  }

  const storedAiOpened =
    Boolean(
      data.ai_opened,
    )

  const aiOpened =
    storedAiOpened ||
    localAiUsed

  if (
    localAiUsed &&
    !storedAiOpened
  ) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          'user_mission_progress',
        )
        .upsert(
          {
            user_id:
              userId,
            ai_opened: true,
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              'user_id',
          },
        )

    if (updateError) {
      console.error(
        'Mission Center AI flag:',
        updateError,
      )
    }
  }

  return {
    aiOpened,

    celebrationSeen:
      Boolean(
        data.celebration_seen,
      ),
  }
}

export async function markAiMissionOpened() {
  const userId =
    await currentUserId()

  const { error } =
    await supabase
      .from(
        'user_mission_progress',
      )
      .upsert(
        {
          user_id:
            userId,
          ai_opened: true,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'user_id',
        },
      )

  if (error) {
    throw error
  }

  window.dispatchEvent(
    new Event(
      'fersys:mission-refresh',
    ),
  )
}

export async function markMissionCelebrationSeen() {
  const userId =
    await currentUserId()

  const { error } =
    await supabase
      .from(
        'user_mission_progress',
      )
      .upsert(
        {
          user_id:
            userId,
          celebration_seen:
            true,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'user_id',
        },
      )

  if (error) {
    throw error
  }
}

export async function getCalendarEventCount() {
  const {
    count,
    error,
  } =
    await supabase
      .from(
        'calendar_events',
      )
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        },
      )

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function getInventoryItemCount() {
  try {
    const items =
      await getInventoryItems()

    return Array.isArray(
      items,
    )
      ? items.length
      : 0
  } catch (error) {
    console.error(
      'Mission Center inventory:',
      error,
    )

    return 0
  }
}
