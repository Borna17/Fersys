import type { FormEvent } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router'

import { supabase } from '../lib/supabase'

const MIN_PASSWORD_LENGTH = 14

type PageState =
  | 'checking'
  | 'ready'
  | 'success'
  | 'error'

type PasswordCheck = {
  label: string
  valid: boolean
}

function generateStrongPassword(length = 20) {
  const uppercase =
    'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase =
    'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols =
    '!@#$%^&*()_+-=[]{}?'

  const groups = [
    uppercase,
    lowercase,
    numbers,
    symbols,
  ]

  const all =
    groups.join('')

  const randomCharacter = (
    source: string,
  ) => {
    const values =
      new Uint32Array(1)

    crypto.getRandomValues(values)

    return source[
      values[0] %
        source.length
    ]
  }

  const characters = [
    ...groups.map(
      randomCharacter,
    ),
  ]

  while (
    characters.length <
    length
  ) {
    characters.push(
      randomCharacter(all),
    )
  }

  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const values =
      new Uint32Array(1)

    crypto.getRandomValues(values)

    const target =
      values[0] %
      (index + 1)

    ;[
      characters[index],
      characters[target],
    ] = [
      characters[target],
      characters[index],
    ]
  }

  return characters.join('')
}

function getPasswordChecks(
  password: string,
): PasswordCheck[] {
  return [
    {
      label:
        `Najmanje ${MIN_PASSWORD_LENGTH} znakova`,
      valid:
        password.length >=
        MIN_PASSWORD_LENGTH,
    },
    {
      label:
        'Najmanje jedno veliko slovo',
      valid:
        /[A-ZČĆŽŠĐ]/.test(
          password,
        ),
    },
    {
      label:
        'Najmanje jedno malo slovo',
      valid:
        /[a-zčćžšđ]/.test(
          password,
        ),
    },
    {
      label:
        'Najmanje jedan broj',
      valid:
        /\d/.test(password),
    },
    {
      label:
        'Najmanje jedan poseban znak',
      valid:
        /[^A-Za-z0-9ČĆŽŠĐčćžšđ\s]/.test(
          password,
        ),
    },
    {
      label: 'Nema razmaka',
      valid:
        password.length > 0 &&
        !/\s/.test(password),
    },
    {
      label:
        'Nema jednostavan uzorak',
      valid:
        password.length > 0 &&
        !/(1234|4321|qwerty|asdf|password|lozinka|admin|firma)/i.test(
          password,
        ),
    },
  ]
}

function getErrorMessage(
  message: string,
) {
  const normalized =
    message.toLowerCase()

  if (
    normalized.includes(
      'otp_expired',
    ) ||
    normalized.includes(
      'expired',
    )
  ) {
    return 'Poveznica za obnovu lozinke je istekla. Zatraži novu poveznicu na stranici za prijavu.'
  }

  if (
    normalized.includes(
      'same password',
    )
  ) {
    return 'Nova lozinka mora biti drugačija od prethodne.'
  }

  if (
    normalized.includes(
      'weak password',
    )
  ) {
    return 'Lozinka ne zadovoljava sigurnosna pravila.'
  }

  return message
}

export function ResetPasswordPage() {
  const started =
    useRef(false)

  const [
    pageState,
    setPageState,
  ] =
    useState<PageState>(
      'checking',
    )

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    passwordConfirm,
    setPasswordConfirm,
  ] = useState('')

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    let cancelled = false

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session,
        ) => {
          if (
            cancelled
          ) {
            return
          }

          if (
            event ===
              'PASSWORD_RECOVERY' &&
            session
          ) {
            setPageState(
              'ready',
            )
            setError('')
          }
        },
      )

    async function prepareRecovery() {
      try {
        const parameters =
          new URLSearchParams(
            window.location.search,
          )

        const authCode =
          parameters.get('code')

        const urlError =
          parameters.get(
            'error_description',
          ) ??
          parameters.get('error')

        if (urlError) {
          throw new Error(
            decodeURIComponent(
              urlError,
            ),
          )
        }

        if (authCode) {
          const {
            error:
              exchangeError,
          } =
            await supabase.auth.exchangeCodeForSession(
              authCode,
            )

          if (exchangeError) {
            throw exchangeError
          }

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          )
        }

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (
          session &&
          !cancelled
        ) {
          setPageState(
            'ready',
          )
          return
        }

        window.setTimeout(
          async () => {
            if (cancelled) {
              return
            }

            const {
              data: {
                session:
                  delayedSession,
              },
            } =
              await supabase.auth.getSession()

            if (
              delayedSession
            ) {
              setPageState(
                'ready',
              )
            } else {
              setError(
                'Poveznica nije valjana ili je istekla. Zatraži novu poveznicu za obnovu lozinke.',
              )
              setPageState(
                'error',
              )
            }
          },
          1200,
        )
      } catch (
        recoveryError
      ) {
        if (cancelled) {
          return
        }

        setError(
          recoveryError instanceof Error
            ? getErrorMessage(
                recoveryError.message,
              )
            : 'Poveznicu za obnovu nije moguće obraditi.',
        )

        setPageState(
          'error',
        )
      }
    }

    void prepareRecovery()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const passwordChecks =
    useMemo(
      () =>
        getPasswordChecks(
          password,
        ),
      [password],
    )

  const passwordIsStrong =
    passwordChecks.every(
      (check) =>
        check.valid,
    )

  const passwordsMatch =
    password.length > 0 &&
    password ===
      passwordConfirm

  function generatePassword() {
    const generated =
      generateStrongPassword()

    setPassword(generated)
    setPasswordConfirm(
      generated,
    )
    setShowPassword(true)
    setError('')
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')

    if (
      !passwordIsStrong
    ) {
      setError(
        'Lozinka mora zadovoljiti sva sigurnosna pravila.',
      )
      return
    }

    if (
      !passwordsMatch
    ) {
      setError(
        'Lozinke se ne podudaraju.',
      )
      return
    }

    try {
      setIsSubmitting(true)

      const {
        error:
          updateError,
      } =
        await supabase.auth.updateUser({
          password,
        })

      if (updateError) {
        throw updateError
      }

      await supabase.auth.signOut()

      setPassword('')
      setPasswordConfirm('')
      setPageState(
        'success',
      )
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof Error
          ? getErrorMessage(
              submitError.message,
            )
          : 'Lozinku nije moguće promijeniti.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (
    pageState ===
    'checking'
  ) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="text-center">
          <LoaderCircle
            size={48}
            className="mx-auto animate-spin text-blue-400"
          />

          <h1 className="mt-5 text-xl font-black">
            Provjera poveznice
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Pripremamo sigurno postavljanje nove lozinke...
          </p>
        </div>
      </main>
    )
  }

  if (
    pageState ===
    'error'
  ) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-slate-900 p-7 text-center">
          <AlertTriangle
            size={50}
            className="mx-auto text-red-400"
          />

          <h1 className="mt-5 text-2xl font-black">
            Poveznica nije valjana
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {error}
          </p>

          <Link
            to="/login"
            className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white"
          >
            Zatraži novu poveznicu
          </Link>
        </div>
      </main>
    )
  }

  if (
    pageState ===
    'success'
  ) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-slate-900 p-7 text-center">
          <CheckCircle2
            size={54}
            className="mx-auto text-emerald-400"
          />

          <h1 className="mt-5 text-2xl font-black">
            Lozinka je promijenjena
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Nova lozinka je spremljena. Sada se možeš prijaviti svojim e-mailom i novom lozinkom.
          </p>

          <Link
            to="/login"
            className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 font-bold text-white"
          >
            Idi na prijavu
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-950 px-4 py-8 text-white">
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
          <ShieldCheck size={27} />
        </div>

        <h1 className="mt-5 text-center text-2xl font-black">
          Postavi novu lozinku
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-slate-400">
          Odaberi novu, jedinstvenu lozinku koju ne koristiš na drugim stranicama.
        </p>

        <button
          type="button"
          onClick={
            generatePassword
          }
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 text-sm font-bold text-blue-300"
        >
          <RefreshCw size={17} />
          Generiraj jaku lozinku
        </button>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6 space-y-5"
        >
          <PasswordField
            label="Nova lozinka"
            value={password}
            show={showPassword}
            onChange={
              setPassword
            }
          />

          <PasswordField
            label="Ponovi lozinku"
            value={
              passwordConfirm
            }
            show={showPassword}
            onChange={
              setPasswordConfirm
            }
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) =>
                  !current,
              )
            }
            className="flex items-center gap-2 text-sm font-semibold text-slate-400"
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}

            {showPassword
              ? 'Sakrij lozinke'
              : 'Prikaži lozinke'}
          </button>

          {password && (
            <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-2">
              {passwordChecks.map(
                (check) => (
                  <div
                    key={
                      check.label
                    }
                    className={`flex items-start gap-2 text-xs ${
                      check.valid
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {check.valid ? (
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0"
                      />
                    ) : (
                      <X
                        size={15}
                        className="mt-0.5 shrink-0"
                      />
                    )}

                    <span>
                      {check.label}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {passwordConfirm && (
            <div
              className={`flex items-center gap-2 text-xs font-bold ${
                passwordsMatch
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {passwordsMatch ? (
                <Check size={15} />
              ) : (
                <X size={15} />
              )}

              {passwordsMatch
                ? 'Lozinke se podudaraju.'
                : 'Lozinke se ne podudaraju.'}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !passwordIsStrong ||
              !passwordsMatch
            }
            className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting
              ? 'Spremanje...'
              : 'Spremi novu lozinku'}
          </button>
        </form>
      </div>
    </main>
  )
}

function PasswordField({
  label,
  value,
  show,
  onChange,
}: {
  label: string
  value: string
  show: boolean
  onChange: (
    value: string,
  ) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>

      <div className="relative">
        <LockKeyhole
          size={19}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <input
          type={
            show
              ? 'text'
              : 'password'
          }
          autoComplete="new-password"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="h-13 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 pl-12 text-white outline-none focus:border-violet-500"
        />
      </div>
    </label>
  )
}
