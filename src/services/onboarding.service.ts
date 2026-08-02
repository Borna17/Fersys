import { supabase } from '../lib/supabase'

export const ONBOARDING_VERSION = 1

export type OnboardingProgress = {
  userId: string
  tutorialVersion: number
  currentStep: number
  completed: boolean
  skipped: boolean
  startedAt: string
  completedAt: string | null
  updatedAt: string
}

type OnboardingRow = {
  user_id: string
  tutorial_version: number
  current_step: number
  completed: boolean
  skipped: boolean
  started_at: string
  completed_at: string | null
  updated_at: string
}

function mapOnboardingRow(
  row: OnboardingRow,
): OnboardingProgress {
  return {
    userId: row.user_id,
    tutorialVersion:
      row.tutorial_version,
    currentStep: row.current_step,
    completed: row.completed,
    skipped: row.skipped,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
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

async function createMissingOnboarding(
  userId: string,
) {
  const now =
    new Date().toISOString()

  const {
    data,
    error,
  } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        tutorial_version:
          ONBOARDING_VERSION,
        current_step: 0,
        completed: false,
        skipped: false,
        started_at: now,
        completed_at: null,
        updated_at: now,
      },
      {
        onConflict: 'user_id',
        ignoreDuplicates: true,
      },
    )
    .select(
      'user_id,tutorial_version,current_step,completed,skipped,started_at,completed_at,updated_at',
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    return mapOnboardingRow(
      data as OnboardingRow,
    )
  }

  const {
    data: existingData,
    error: existingError,
  } = await supabase
    .from('user_onboarding')
    .select(
      'user_id,tutorial_version,current_step,completed,skipped,started_at,completed_at,updated_at',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (!existingData) {
    throw new Error(
      'Onboarding zapis nije moguće napraviti.',
    )
  }

  return mapOnboardingRow(
    existingData as OnboardingRow,
  )
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const userId =
    await getCurrentUserId()

  const {
    data,
    error,
  } = await supabase
    .from('user_onboarding')
    .select(
      'user_id,tutorial_version,current_step,completed,skipped,started_at,completed_at,updated_at',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return createMissingOnboarding(
      userId,
    )
  }

  const progress =
    mapOnboardingRow(
      data as OnboardingRow,
    )

  if (
    progress.tutorialVersion <
    ONBOARDING_VERSION
  ) {
    return resetOnboarding()
  }

  return progress
}

export async function saveOnboardingStep(
  currentStep: number,
): Promise<void> {
  const userId =
    await getCurrentUserId()

  const safeStep = Math.max(
    0,
    Math.floor(currentStep),
  )

  const {
    error,
  } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        tutorial_version:
          ONBOARDING_VERSION,
        current_step: safeStep,
        completed: false,
        skipped: false,
        completed_at: null,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    )

  if (error) {
    throw error
  }
}

export async function completeOnboarding(): Promise<void> {
  const userId =
    await getCurrentUserId()

  const now =
    new Date().toISOString()

  const {
    error,
  } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        tutorial_version:
          ONBOARDING_VERSION,
        current_step: 0,
        completed: true,
        skipped: false,
        completed_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id',
      },
    )

  if (error) {
    throw error
  }
}

export async function skipOnboarding(): Promise<void> {
  const userId =
    await getCurrentUserId()

  const now =
    new Date().toISOString()

  const {
    error,
  } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        tutorial_version:
          ONBOARDING_VERSION,
        completed: true,
        skipped: true,
        completed_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id',
      },
    )

  if (error) {
    throw error
  }
}

export async function resetOnboarding(): Promise<OnboardingProgress> {
  const userId =
    await getCurrentUserId()

  const now =
    new Date().toISOString()

  const {
    data,
    error,
  } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        tutorial_version:
          ONBOARDING_VERSION,
        current_step: 0,
        completed: false,
        skipped: false,
        started_at: now,
        completed_at: null,
        updated_at: now,
      },
      {
        onConflict: 'user_id',
      },
    )
    .select(
      'user_id,tutorial_version,current_step,completed,skipped,started_at,completed_at,updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  return mapOnboardingRow(
    data as OnboardingRow,
  )
}
