import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL as string

const supabasePublishableKey =
  import.meta.env
    .VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl) {
  throw new Error(
    'Nedostaje VITE_SUPABASE_URL u .env datoteci.',
  )
}

if (!supabasePublishableKey) {
  throw new Error(
    'Nedostaje VITE_SUPABASE_PUBLISHABLE_KEY u .env datoteci.',
  )
}

const client = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

/*
 * Supabase JS koristi GLOBALNI sign-out ako scope nije zadan.
 * U FERSYS-u korisnik mora moći biti prijavljen na mobitelu,
 * računalu i drugim uređajima istovremeno, zato svaki postojeći
 * poziv supabase.auth.signOut() bez opcija tretiramo kao lokalnu
 * odjavu samo s trenutačnog uređaja.
 */
const originalSignOut =
  client.auth.signOut.bind(client.auth)

type SignOutOptions =
  Parameters<
    typeof client.auth.signOut
  >[0]

client.auth.signOut = (async (
  options?: SignOutOptions,
) =>
  originalSignOut(
    options ?? {
      scope: 'local',
    },
  )) as typeof client.auth.signOut

export const supabase = client
