import type { FormEvent } from 'react'
import {
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

const MIN_PASSWORD_LENGTH = 14

type PasswordCheck = {
  label: string
  valid: boolean
}

function escapeForCharacterClass(value: string) {
  return value.replace(/[\\\]\-\^]/g, '\\$&')
}

function generateStrongPassword(length = 20) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*()_+-=[]{}?'
  const allCharacters =
    uppercase + lowercase + numbers + symbols

  const required = [
    uppercase,
    lowercase,
    numbers,
    symbols,
  ].map((characters) => {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)

    return characters[
      values[0] % characters.length
    ]
  })

  const remaining = Array.from(
    {
      length: Math.max(
        0,
        length - required.length,
      ),
    },
    () => {
      const values = new Uint32Array(1)
      crypto.getRandomValues(values)

      return allCharacters[
        values[0] % allCharacters.length
      ]
    },
  )

  const result = [
    ...required,
    ...remaining,
  ]

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)

    const targetIndex =
      values[0] % (index + 1)

    ;[
      result[index],
      result[targetIndex],
    ] = [
      result[targetIndex],
      result[index],
    ]
  }

  return result.join('')
}

function containsPersonalInformation(
  password: string,
  values: string[],
) {
  const normalizedPassword =
    password.toLocaleLowerCase('hr-HR')

  return values
    .map((value) =>
      value
        .trim()
        .toLocaleLowerCase('hr-HR')
        .replace(/[^a-z0-9čćžšđ]/g, ''),
    )
    .filter((value) => value.length >= 4)
    .some((value) =>
      normalizedPassword
        .replace(/[^a-z0-9čćžšđ]/g, '')
        .includes(value),
    )
}

function getPasswordChecks({
  password,
  fullName,
  companyName,
  email,
}: {
  password: string
  fullName: string
  companyName: string
  email: string
}): PasswordCheck[] {
  const symbolCharacters =
    '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

  const symbolPattern = new RegExp(
    `[${escapeForCharacterClass(
      symbolCharacters,
    )}]`,
  )

  const emailName =
    email.split('@')[0] ?? ''

  const personalParts = [
    fullName,
    companyName,
    emailName,
    ...fullName.split(/\s+/),
    ...companyName.split(/\s+/),
  ]

  return [
    {
      label: `Najmanje ${MIN_PASSWORD_LENGTH} znakova`,
      valid:
        password.length >=
        MIN_PASSWORD_LENGTH,
    },
    {
      label: 'Najmanje jedno veliko slovo',
      valid: /[A-ZČĆŽŠĐ]/.test(password),
    },
    {
      label: 'Najmanje jedno malo slovo',
      valid: /[a-zčćžšđ]/.test(password),
    },
    {
      label: 'Najmanje jedan broj',
      valid: /\d/.test(password),
    },
    {
      label: 'Najmanje jedan poseban znak',
      valid: symbolPattern.test(password),
    },
    {
      label:
        'Ne sadrži ime, tvrtku ni dio e-maila',
      valid:
        password.length > 0 &&
        !containsPersonalInformation(
          password,
          personalParts,
        ),
    },
    {
      label:
        'Nema jednostavan uzorak poput 1234 ili qwerty',
      valid:
        password.length > 0 &&
        !/(1234|4321|qwerty|asdf|password|lozinka|admin|firma)/i.test(
          password,
        ),
    },
    {
      label: 'Nema razmaka',
      valid:
        password.length > 0 &&
        !/\s/.test(password),
    },
  ]
}

function getPasswordStrength(
  checks: PasswordCheck[],
) {
  const validCount =
    checks.filter(
      (check) => check.valid,
    ).length

  if (validCount <= 3) {
    return {
      label: 'Preslaba',
      width: 25,
      className: 'bg-red-500',
      textClassName: 'text-red-400',
    }
  }

  if (validCount <= 5) {
    return {
      label: 'Srednja',
      width: 55,
      className: 'bg-amber-500',
      textClassName: 'text-amber-400',
    }
  }

  if (validCount < checks.length) {
    return {
      label: 'Jaka',
      width: 80,
      className: 'bg-blue-500',
      textClassName: 'text-blue-400',
    }
  }

  return {
    label: 'Vrlo jaka',
    width: 100,
    className: 'bg-emerald-500',
    textClassName:
      'text-emerald-400',
  }
}

function translateAuthError(
  message: string,
) {
  const normalized =
    message.toLowerCase()

  if (
    normalized.includes(
      'user already registered',
    )
  ) {
    return 'Račun s ovom e-mail adresom već postoji.'
  }

  if (
    normalized.includes('weak password')
  ) {
    return 'Lozinka ne zadovoljava sigurnosna pravila.'
  }

  if (
    normalized.includes(
      'email rate limit exceeded',
    )
  ) {
    return 'Poslano je previše e-mailova. Pričekaj nekoliko minuta i pokušaj ponovno.'
  }

  return message
}

export function RegisterPage() {
  const navigate = useNavigate()
  const {
    session,
    isLoading,
  } = useAuth()

  const [
    fullName,
    setFullName,
  ] = useState('')

  const [
    companyName,
    setCompanyName,
  ] = useState('')

  const [
    email,
    setEmail,
  ] = useState('')

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
    generatedPassword,
    setGeneratedPassword,
  ] = useState(false)

  const [
    copied,
    setCopied,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

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
      navigate('/dashboard', {
        replace: true,
      })
    }
  }, [
    isLoading,
    session,
    navigate,
  ])

  const normalizedEmail =
    email.trim().toLowerCase()

  const passwordChecks =
    useMemo(
      () =>
        getPasswordChecks({
          password,
          fullName,
          companyName,
          email: normalizedEmail,
        }),
      [
        password,
        fullName,
        companyName,
        normalizedEmail,
      ],
    )

  const passwordStrength =
    useMemo(
      () =>
        getPasswordStrength(
          passwordChecks,
        ),
      [passwordChecks],
    )

  const passwordIsStrong =
    passwordChecks.every(
      (check) => check.valid,
    )

  const passwordsMatch =
    password.length > 0 &&
    password === passwordConfirm

  function handleGeneratePassword() {
    const generated =
      generateStrongPassword(20)

    setPassword(generated)
    setPasswordConfirm(generated)
    setGeneratedPassword(true)
    setShowPassword(true)
    setCopied(false)
    setError('')
  }

  async function handleCopyPassword() {
    if (!password) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        password,
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch {
      setError(
        'Lozinku nije moguće kopirati. Označi je i kopiraj ručno.',
      )
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (
      !fullName.trim() ||
      !companyName.trim() ||
      !normalizedEmail ||
      !password ||
      !passwordConfirm
    ) {
      setError(
        'Popuni sva obavezna polja.',
      )
      return
    }

    if (!passwordIsStrong) {
      setError(
        'Lozinka mora zadovoljiti sva sigurnosna pravila.',
      )
      return
    }

    if (!passwordsMatch) {
      setError(
        'Lozinke se ne podudaraju.',
      )
      return
    }

    try {
      setIsSubmitting(true)

      const {
        data,
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email:
            normalizedEmail,
          password,
          options: {
            data: {
              full_name:
                fullName.trim(),
              company_name:
                companyName.trim(),
              account_type:
                'owner',
            },

            emailRedirectTo:
              `${window.location.origin}/auth/callback`,
          },
        })

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        const {
          error: companyError,
        } = await supabase.rpc(
          'bootstrap_company_for_current_user',
        )

        if (companyError) {
          throw companyError
        }

        navigate('/dashboard', {
          replace: true,
        })
        return
      }

      setSuccess(
        'Registracija je uspješna. Poslali smo poveznicu za potvrdu e-maila. Klikom na nju FERSYS će potvrditi račun, automatski te prijaviti i otvoriti početni tutorijal.',
      )

      setPassword('')
      setPasswordConfirm('')
      setGeneratedPassword(false)
      setCopied(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? translateAuthError(
              submitError.message,
            )
          : 'Registraciju nije moguće dovršiti.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-5 sm:py-10">
      <div className="absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/20">
            <ShieldCheck size={27} />
          </div>

          <h1 className="mt-4 text-3xl font-black">
            Registracija FERSYS tvrtke
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Prvi korisnik automatski postaje vlasnik tvrtke.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
          {success ? (
            <div className="py-6 text-center">
              <CheckCircle2
                size={54}
                className="mx-auto text-emerald-400"
              />

              <h2 className="mt-5 text-2xl font-black">
                Provjeri e-mail
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">
                {success}
              </p>

              <p className="mx-auto mt-4 max-w-lg rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs leading-5 text-blue-200">
                Poveznicu otvori na istom uređaju i u istom pregledniku u kojem si napravio registraciju. Nakon potvrde otvorit će se Dashboard i početni tutorijal.
              </p>

              <Link
                to="/login"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 font-bold text-white sm:w-auto sm:min-w-56"
              >
                Ručna prijava
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Ime i prezime"
                  icon={
                    <UserRound size={19} />
                  }
                >
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value,
                      )
                    }
                    placeholder="Borna Ferfolja"
                    className="auth-input"
                  />
                </Field>

                <Field
                  label="Naziv tvrtke"
                  icon={
                    <Building2 size={19} />
                  }
                >
                  <input
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(event) =>
                      setCompanyName(
                        event.target.value,
                      )
                    }
                    placeholder="Instalacije Ferfolja"
                    className="auth-input"
                  />
                </Field>
              </div>

              <Field
                label="E-mail adresa"
                icon={<Mail size={19} />}
              >
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="ime@tvrtka.hr"
                  className="auth-input"
                />
              </Field>

              <section className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 font-black text-white">
                      <KeyRound
                        size={19}
                        className="text-blue-400"
                      />
                      Sigurna lozinka
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      FERSYS ne sprema niti može vidjeti tvoju izvornu lozinku.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleGeneratePassword
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 text-sm font-bold text-blue-300 transition hover:bg-blue-500/20"
                  >
                    <RefreshCw size={17} />
                    Generiraj jaku lozinku
                  </button>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        )
                        setGeneratedPassword(
                          false,
                        )
                        setCopied(false)
                      }}
                      placeholder="Najmanje 14 znakova"
                      className="auth-input pr-24"
                    />

                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                      {password && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyPassword()
                          }}
                          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
                          title="Kopiraj lozinku"
                        >
                          {copied ? (
                            <Check
                              size={18}
                              className="text-emerald-400"
                            />
                          ) : (
                            <Clipboard size={18} />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current,
                          )
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
                        title={
                          showPassword
                            ? 'Sakrij lozinku'
                            : 'Prikaži lozinku'
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
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
                      value={passwordConfirm}
                      onChange={(event) =>
                        setPasswordConfirm(
                          event.target.value,
                        )
                      }
                      placeholder="Ponovi lozinku"
                      className="auth-input"
                    />
                  </Field>
                </div>

                {password && (
                  <>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400">
                          Jačina lozinke
                        </span>

                        <span
                          className={`font-black ${passwordStrength.textClassName}`}
                        >
                          {
                            passwordStrength.label
                          }
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${passwordStrength.className}`}
                          style={{
                            width: `${passwordStrength.width}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {passwordChecks.map(
                        (check) => (
                          <div
                            key={check.label}
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

                    {generatedPassword && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-200">
                        Generirana lozinka unesena je u oba polja. Spremi je u ugrađeni upravitelj lozinki preglednika, iClouda, Googlea, Microsofta ili drugog pouzdanog password managera. Nemoj je spremati u bilješke ili slati porukom.
                      </div>
                    )}

                    {passwordConfirm && (
                      <div
                        className={`mt-3 flex items-center gap-2 text-xs font-semibold ${
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
                  </>
                )}
              </section>

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
                className="flex min-h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-600/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting
                  ? 'Izrada računa...'
                  : 'Registriraj tvrtku'}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                Preporuka: koristi zasebnu lozinku koju ne koristiš ni na jednoj drugoj stranici i spremi je u upravitelj lozinki.
              </p>

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

      <style>{`
        .auth-input {
          height: 3.25rem;
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
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">
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
