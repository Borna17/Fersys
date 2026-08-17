import { supabase } from '../lib/supabase'

export type FirstStepsPreferences = {
  enabled: boolean
  forceToken: string
  explicit: boolean
}

function normalize(
  value: unknown,
): FirstStepsPreferences {
  const row =
    value &&
    typeof value === 'object'
      ? value as Record<string, unknown>
      : {}

  return {
    enabled:
      typeof row.enabled === 'boolean'
        ? row.enabled
        : false,
    forceToken:
      typeof row.force_token === 'string'
        ? row.force_token
        : '',
    explicit:
      Boolean(
        row.explicit,
      ),
  }
}

export async function getFirstStepsPreferences():
Promise<FirstStepsPreferences> {
  const { data, error } =
    await supabase.rpc(
      'get_first_steps_preferences',
    )

  if (error) {
    throw error
  }

  return normalize(data)
}

export async function setFirstStepsPreferences(
  enabled: boolean,
  forceOpen = false,
): Promise<FirstStepsPreferences> {
  const { data, error } =
    await supabase.rpc(
      'set_first_steps_preferences',
      {
        requested_enabled:
          enabled,
        requested_force_open:
          forceOpen,
      },
    )

  if (error) {
    throw error
  }

  return normalize(data)
}

export async function getAdminFirstStepsPreferences(
  companyId: string,
): Promise<FirstStepsPreferences> {
  const { data, error } =
    await supabase.rpc(
      'admin_get_first_steps_preferences',
      {
        requested_company_id:
          companyId,
      },
    )

  if (error) {
    throw error
  }

  return normalize(data)
}

export async function setAdminFirstStepsPreferences(
  companyId: string,
  enabled: boolean,
  forceOpen = false,
): Promise<FirstStepsPreferences> {
  const { data, error } =
    await supabase.rpc(
      'admin_set_first_steps_preferences',
      {
        requested_company_id:
          companyId,
        requested_enabled:
          enabled,
        requested_force_open:
          forceOpen,
      },
    )

  if (error) {
    throw error
  }

  return normalize(data)
}
