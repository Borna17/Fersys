import {
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

export function SupabaseTestPage() {
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error'
  >('loading')

  const [message, setMessage] = useState(
    'Provjera veze sa Supabaseom...',
  )

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } =
          await supabase.auth.getSession()

        if (error) {
          throw error
        }

        setStatus('success')
        setMessage(
          'FERSYS je uspješno povezan sa Supabaseom.',
        )
      } catch (error) {
        setStatus('error')
        setMessage(
          error instanceof Error
            ? error.message
            : 'Povezivanje nije uspjelo.',
        )
      }
    }

    void testConnection()
  }, [])

  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center">
        {status === 'loading' && (
          <Loader2
            size={45}
            className="mx-auto animate-spin text-blue-400"
          />
        )}

        {status === 'success' && (
          <CheckCircle2
            size={48}
            className="mx-auto text-emerald-400"
          />
        )}

        {status === 'error' && (
          <XCircle
            size={48}
            className="mx-auto text-red-400"
          />
        )}

        <h1 className="mt-5 text-2xl font-black text-white">
          Supabase test
        </h1>

        <p className="mt-3 break-words text-sm leading-6 text-slate-400">
          {message}
        </p>
      </div>
    </div>
  )
}
