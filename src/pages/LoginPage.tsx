import type {
  FormEvent,
} from 'react'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
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

import {
  FersysTurnstile,
  type FersysTurnstileRef,
} from '../components/security/FersysTurnstile'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { isNativeApp } from '../lib/platform'

export function LoginPage() {
  const navigate =
    useNavigate()

  const nativeApp =
    isNativeApp()

  const {
    session,
    isLoading,
  } = useAuth()

  const turnstileRef =
    useRef<FersysTurnstileRef | null>(
      null,
    )

  const [email, setEmail] =
    useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    captchaToken,
    setCaptchaToken,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    isSendingReset,
    setIsSendingReset,
  ] = useState(false)

  useEffect(() => {
    if (
      !isLoading &&
      session
    ) {
      navigate(
        '/dashboard',
        {
          replace: true,
        },
      )
    }
  }, [
    isLoading,
    session,
    navigate,
  ])

  function resetCaptcha() {
    turnstileRef.current?.reset()
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setMessage('')

    const normalizedEmail =
      email
        .trim()
        .toLowerCase()

    if (
      !normalizedEmail ||
      !password
    ) {
      setError(
        'Upiši e-mail adresu i lozinku.',
      )
      return
    }

    if (
      !nativeApp &&
      !captchaToken
    ) {
      setError(
        'Potvrdi sigurnosnu provjeru prije prijave.',
      )
      return
    }

    setIsSubmitting(true)

    try {
      const {
        error:
          signInError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              normalizedEmail,
            password,
            ...(nativeApp
              ? {}
              : {
                  options: {
                    captchaToken,
                  },
                }),
          },
        )

      if (signInError) {
        throw signInError
      }

      navigate(
        '/dashboard',
        {
          replace: true,
        },
      )
    } catch (
      signInError
    ) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : 'Prijava nije uspjela.'

      setError(
        message ===
          'Invalid login credentials'
          ? 'E-mail adresa ili lozinka nisu ispravni.'
          : message,
      )

      resetCaptcha()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordReset() {
    const normalizedEmail =
      email
        .trim()
        .toLowerCase()

    setError('')
    setMessage('')

    if (!normalizedEmail) {
      setError(
        'Prvo upiši e-mail adresu za obnovu lozinke.',
      )
      return
    }

    if (
      !nativeApp &&
      !captchaToken
    ) {
      setError(
        'Potvrdi sigurnosnu provjeru prije slanja poveznice.',
      )
      return
    }

    setIsSendingReset(true)

    try {
      const {
        error:
          resetError,
      } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
            ...(nativeApp
              ? {}
              : {
                  captchaToken,
                }),
          },
        )

      if (resetError) {
        throw resetError
      }

      setMessage(
        'Ako račun s tom e-mail adresom postoji, poslana je poruka za obnovu lozinke.',
      )
    } catch (
      resetError
    ) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Zahtjev za obnovu lozinke nije moguće poslati.',
      )
    } finally {
      setIsSendingReset(false)
      resetCaptcha()
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-dvh">
        <section className="hidden w-1/2 flex-col justify-between border-r border-white/10 p-12 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
              <span className="text-xl font-black">
                F
              </span>
            </div>

            <div>
              <p className="text-xl font-black tracking-wide">
                FERSYS
              </p>
              <p className="text-sm text-slate-400">
                Business Management System
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">
              <ShieldCheck size={17} />
              Sigurno upravljanje poslovanjem
            </div>

            <h1 className="text-5xl font-black leading-tight">
              Sve što trebaš za vođenje poslovanja na jednom mjestu.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
              Upravljaj kupcima, radnim nalozima, ponudama, računima, skladištem i radnicima kroz jedan sustav.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} FERSYS
          </p>
        </section>

        <section className="flex w-full items-center justify-center px-4 py-8 sm:px-5 sm:py-10 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600">
                <span className="text-lg font-black">
                  F
                </span>
              </div>

              <div>
                <p className="font-black">
                  FERSYS
                </p>
                <p className="text-xs text-slate-400">
                  Business Management System
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-7">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
                  Dobrodošli
                </p>

                <h2 className="text-3xl font-black">
                  Prijava u FERSYS
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Prijavi se svojim poslovnim računom.
                </p>
              </div>

              <form
                className="space-y-5"
                onSubmit={
                  handleSubmit
                }
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    E-mail adresa
                  </label>

                  <div className="relative">
                    <Mail
                      size={19}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(
                        event,
                      ) =>
                        setEmail(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="ime@tvrtka.hr"
                      className="h-13 w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-slate-200"
                    >
                      Lozinka
                    </label>

                    <button
                      type="button"
                      disabled={
                        isSendingReset
                      }
                      onClick={
                        handlePasswordReset
                      }
                      className="text-xs font-semibold text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
                    >
                      {isSendingReset
                        ? 'Slanje...'
                        : 'Zaboravljena lozinka?'}
                    </button>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={19}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      id="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="current-password"
                      value={
                        password
                      }
                      onChange={(
                        event,
                      ) =>
                        setPassword(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Upiši lozinku"
                      className="h-13 w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      aria-label={
                        showPassword
                          ? 'Sakrij lozinku'
                          : 'Prikaži lozinku'
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff
                          size={19}
                        />
                      ) : (
                        <Eye
                          size={19}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {!nativeApp && (
                  <FersysTurnstile
                    ref={
                      turnstileRef
                    }
                    onTokenChange={
                      setCaptchaToken
                    }
                  />
                )}

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (
                      !nativeApp &&
                      !captchaToken
                    )
                  }
                  className="flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-600/20 transition hover:shadow-violet-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Prijava...'
                    : 'Prijavi se'}
                </button>
              </form>

              <div className="mt-6 border-t border-white/10 pt-6 text-center">
                <p className="text-sm text-slate-400">
                  Još nemaš FERSYS račun?
                </p>

                <Link
                  to="/register"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/15"
                >
                  Registriraj svoju tvrtku
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-600">
              Zaštićeni pristup poslovnim podacima
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}