import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
} from 'react-router'

import { supabase } from '../lib/supabase'

type CallbackState =
  | 'loading'
  | 'success'
  | 'error'

function getHashParameters() {
  return new URLSearchParams(
    window.location.hash.replace(
      /^#/,
      '',
    ),
  )
}

export function AuthCallbackPage() {
  const navigate = useNavigate()

  const hasStarted =
    useRef(false)

  const [
    state,
    setState,
  ] =
    useState<CallbackState>(
      'loading',
    )

  const [
    message,
    setMessage,
  ] = useState(
    'Potvrđujemo e-mail i pripremamo tvoju FERSYS tvrtku...',
  )

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true

    async function finishAuthentication() {
      try {
        const queryParameters =
          new URLSearchParams(
            window.location.search,
          )

        const code =
          queryParameters.get('code')

        const tokenHash =
          queryParameters.get(
            'token_hash',
          )

        const otpType =
          queryParameters.get('type')

        const queryError =
          queryParameters.get(
            'error_description',
          ) ??
          queryParameters.get('error')

        if (queryError) {
          throw new Error(
            decodeURIComponent(
              queryError,
            ),
          )
        }

        if (
          code
        ) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code,
            )

          if (error) {
            throw error
          }
        } else if (
          tokenHash &&
          otpType
        ) {
          const { error } =
            await supabase.auth.verifyOtp({
              token_hash:
                tokenHash,
              type:
                otpType as
                  | 'signup'
                  | 'email'
                  | 'invite'
                  | 'magiclink'
                  | 'recovery'
                  | 'email_change',
            })

          if (error) {
            throw error
          }
        } else {
          const hashParameters =
            getHashParameters()

          const accessToken =
            hashParameters.get(
              'access_token',
            )

          const refreshToken =
            hashParameters.get(
              'refresh_token',
            )

          if (
            accessToken &&
            refreshToken
          ) {
            const { error } =
              await supabase.auth.setSession({
                access_token:
                  accessToken,
                refresh_token:
                  refreshToken,
              })

            if (error) {
              throw error
            }
          }
        }

        const {
          data: {
            session,
          },
          error: sessionError,
        } =
          await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          throw new Error(
            'E-mail je možda potvrđen, ali automatska prijava nije dovršena. Pokušaj se prijaviti ručno.',
          )
        }

        setMessage(
          'E-mail je potvrđen. Pripremamo tvoju tvrtku i početni tutorijal...',
        )

        const {
          error: companyError,
        } = await supabase.rpc(
          'bootstrap_company_for_current_user',
        )

        if (companyError) {
          throw companyError
        }

        setState('success')
        setMessage(
          'Račun je potvrđen. Otvaramo FERSYS...',
        )

        window.setTimeout(() => {
          navigate('/dashboard', {
            replace: true,
          })
        }, 900)
      } catch (callbackError) {
        console.error(
          'Auth callback error:',
          callbackError,
        )

        setState('error')
        setMessage(
          callbackError instanceof Error
            ? callbackError.message
            : 'Potvrdu e-maila nije moguće dovršiti.',
        )
      }
    }

    void finishAuthentication()
  }, [navigate])

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center shadow-2xl shadow-black/50 sm:p-9">
        {state === 'loading' && (
          <>
            <LoaderCircle
              size={52}
              className="mx-auto animate-spin text-blue-400"
            />

            <h1 className="mt-6 text-2xl font-black">
              Potvrda računa
            </h1>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2
              size={54}
              className="mx-auto text-emerald-400"
            />

            <h1 className="mt-6 text-2xl font-black">
              Račun je potvrđen
            </h1>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertTriangle
              size={54}
              className="mx-auto text-red-400"
            />

            <h1 className="mt-6 text-2xl font-black">
              Potvrda nije dovršena
            </h1>
          </>
        )}

        <p className="mt-4 break-words text-sm leading-6 text-slate-400">
          {message}
        </p>

        {state === 'error' && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              to="/login"
              className="flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white"
            >
              Ručna prijava
            </Link>

            <Link
              to="/register"
              className="flex min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 font-bold text-slate-300"
            >
              Nova registracija
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

