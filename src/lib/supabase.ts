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

export const supabase = createClient(
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
