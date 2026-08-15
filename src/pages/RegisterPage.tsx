import type {
  FormEvent,
  ReactNode,
} from 'react'
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
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

const MIN_PASSWORD_LENGTH = 14

function getPasswordError(
  password: string,
) {
  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    return `Lozinka mora imati najmanje ${MIN_PASSWORD_LENGTH} znakova.`
  }

  if (
    !/[A-ZČĆŽŠĐ]/.test(
      password,
    )
  ) {
    return 'Lozinka mora sadržavati najmanje jedno veliko slovo.'
  }

  if (
    !/[a-zčćžšđ]/.test(
      password,
    )
  ) {
    return 'Lozinka mora sadržavati najmanje jedno malo slovo.'
  }

  if (!/\d/.test(password)) {
    return 'Lozinka mora sadržavati najmanje jedan broj.'
  }

  if (
    !/[^A-Za-z0-9ČĆŽŠĐčćžšđ\s]/.test(
      password,
    )
  ) {
    return 'Lozinka mora sadržavati najmanje jedan poseban znak.'
  }

  if (
    /\s/.test(password)
  ) {
    return 'Lozinka ne smije sadržavati razmake.'
  }

  if (
    /(1234|4321|qwerty|asdf|password|lozinka|admin|firma)/i.test(
      password,
    )
  ) {
    return 'Odaberi sigurniju lozinku bez jednostavnih uzoraka.'
  }

  return ''
}

export function RegisterPage() {
  const navigate =
    useNavigate()

  const {
    session,
    isLoading,
  } = useAuth()

  const turnstileRef =
    useRef<FersysTurnstileRef | null>(
      null,
    )

  const [
    fullName,
    setFullName,
  ] = useState('')

  const [
    companyName,
    setCompanyName,
  ] = useState('')

  const [email, setEmail] =
    useState('')

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
    captchaToken,
    setCaptchaToken,
  ] = useState('')

  const [error, setError] =
    useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const [
    isSubmitting,
    setIsSubmitting,
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

  const passwordError =
    useMemo(
      () =>
        password
          ? getPasswordError(
              password,
            )
          : '',
      [password],
    )

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedEmail =
      email
        .trim()
        .toLowerCase()

    if (
      !fullName.trim() ||
      !companyName.trim() ||
      !normalizedEmail ||
      !password
    ) {
      setError(
        'Popuni sva obavezna polja.',
      )
      return
    }

    const currentPasswordError =
      getPasswordError(
        password,
      )

    if (
      currentPasswordError
    ) {
      setError(
        currentPasswordError,
      )
      return
    }

    if (
      password !==
      passwordConfirm
    ) {
      setError(
        'Lozinke se ne podudaraju.',
      )
      return
    }

    if (!captchaToken) {
      setError(
        'Potvrdi sigurnosnu provjeru prije registracije.',
      )
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data,
        error:
          signUpError,
      } =
        await supabase.auth.signUp(
          {
            email:
              normalizedEmail,
            password,
            options: {
              captchaToken,
              data: {
                full_name:
                  fullName.trim(),
                company_name:
                  companyName.trim(),
                account_type:
                  'owner',
              },
              emailRedirectTo:
                `${window.location.origin}/dashboard`,
            },
          },
        )

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        const {
          error:
            companyError,
        } =
          await supabase.rpc(
            'bootstrap_company_for_current_user',
          )

        if (companyError) {
          throw companyError
        }

        navigate(
          '/dashboard',
          {
            replace: true,
          },
        )

        return
      }

      setSuccess(
        'Registracija je uspješna. Provjeri e-mail i potvrdi račun, a zatim se prijavi.',
      )

      setPassword('')
      setPasswordConfirm('')
    } catch (
      signUpError
    ) {
      setError(
        signUpError instanceof Error
          ? signUpError.message
          : 'Registraciju nije moguće dovršiti.',
      )

      turnstileRef.current?.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 px-4 py-5 text-white sm:px-5 sm:py-8">
      <div className="absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-2xl items-center">
        <div className="w-full">
          <div className="mb-5 text-center sm:mb-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
              <span className="text-xl font-black">
                F
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Registracija FERSYS tvrtke
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Prvi korisnik automatski postaje vlasnik tvrtke.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-8">
            {success ? (
              <div className="py-6 text-center">
                <CheckCircle2
                  size={54}
                  className="mx-auto text-emerald-400"
                />

                <h2 className="mt-5 text-2xl font-black">
                  Provjeri e-mail
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
                  {success}
                </p>

                <Link
                  to="/login"
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 font-bold text-white sm:w-auto sm:min-w-56"
                >
                  Idi na prijavu
                </Link>
              </div>
            ) : (
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-4 sm:space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field
                    label="Ime i prezime"
                    icon={
                      <UserRound
                        size={19}
                      />
                    }
                  >
                    <input
                      type="text"
                      autoComplete="name"
                      value={
                        fullName
                      }
                      onChange={(
                        event,
                      ) =>
                        setFullName(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Ime i Prezime"
                      className="auth-input"
                    />
                  </Field>

                  <Field
                    label="Naziv tvrtke"
                    icon={
                      <Building2
                        size={19}
                      />
                    }
                  >
                    <input
                      type="text"
                      autoComplete="organization"
                      value={
                        companyName
                      }
                      onChange={(
                        event,
                      ) =>
                        setCompanyName(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Naziv tvrtke d.o.o."
                      className="auth-input"
                    />
                  </Field>
                </div>

                <Field
                  label="E-mail adresa"
                  icon={
                    <Mail
                      size={19}
                    />
                  }
                >
                  <input
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
                    className="auth-input"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field
                    label="Lozinka"
                    icon={
                      <LockKeyhole
                        size={19}
                      />
                    }
                  >
                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
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
                      placeholder="Najmanje 14 znakova"
                      className="auth-input pr-12"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
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
                  </Field>

                  <Field
                    label="Ponovi lozinku"
                    icon={
                      <LockKeyhole
                        size={19}
                      />
                    }
                  >
                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      value={
                        passwordConfirm
                      }
                      onChange={(
                        event,
                      ) =>
                        setPasswordConfirm(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Ponovi lozinku"
                      className="auth-input"
                    />
                  </Field>
                </div>

                {password && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
                      passwordError
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                    }`}
                  >
                    {passwordError ||
                      'Lozinka zadovoljava FERSYS sigurnosna pravila.'}
                  </div>
                )}

                <FersysTurnstile
                  ref={
                    turnstileRef
                  }
                  onTokenChange={
                    setCaptchaToken
                  }
                />

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !captchaToken
                  }
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 font-black text-white shadow-lg shadow-violet-600/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Izrada računa...'
                    : 'Registriraj tvrtku'}
                </button>

                <p className="text-center text-sm text-slate-400">
                  Već imaš račun?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-violet-400 hover:text-violet-300"
                  >
                    Prijavi se
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .auth-input {
          height: 3.5rem;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(255 255 255 / 0.1);
          background: rgb(2 6 23 / 0.7);
          padding: 0.75rem 1rem 0.75rem 3rem;
          color: white;
          outline: none;
          transition: 150ms ease;
        }

        .auth-input::placeholder {
          color: rgb(71 85 105);
        }

        .auth-input:focus {
          border-color: rgb(139 92 246);
          box-shadow: 0 0 0 4px rgb(139 92 246 / 0.1);
        }
      `}</style>
    </main>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-200">
        {label}
      </span>

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>

        {children}
      </div>
    </label>
  )
}