import { supabase } from '../lib/supabase'

export type OnboardingStatus = {
  completed: boolean
  skipped: boolean
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    return {
      completed: true,
      skipped: false,
    }
  }

  const { data, error } = await supabase
    .from('user_onboarding')
    .select('completed, skipped')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from('user_onboarding')
      .insert({
        user_id: user.id,
        completed: false,
        skipped: false,
      })

    if (insertError) {
      throw insertError
    }

    return {
      completed: false,
      skipped: false,
    }
  }

  return {
    completed: Boolean(data.completed),
    skipped: Boolean(data.skipped),
  }
}

export async function completeOnboarding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Korisnik nije prijavljen.')
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: user.id,
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

export async function skipOnboarding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Korisnik nije prijavljen.')
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: user.id,
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

export async function resetOnboarding() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Korisnik nije prijavljen.')
  }

  const { error } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: user.id,
        completed: false,
        skipped: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    )

  if (error) {
    throw error
  }
}

