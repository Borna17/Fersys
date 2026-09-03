import type {
  FormEvent,
  ReactNode,
} from 'react'
import {
  Building2,
  CheckCircle2,
  Globe2,
  Eye,
  KeyRound,
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
import {
  LegalConsentBlock,
} from '../legal/LegalConsentBlock'
import {
  LEGAL_VERSION,
} from '../legal/legalConfig'

const MIN_PASSWORD_LENGTH = 14

type RegistrationCountryCode = 'HR' | 'BA' | 'RS' | 'SI' | 'ME' | 'MK' | 'XK' | 'OTHER'

const REGISTRATION_COUNTRIES: Array<{
  code: RegistrationCountryCode
  label: string
  currency: string
  taxIdLabel: string
}> = [
  { code: 'HR', label: 'Hrvatska', currency: 'EUR', taxIdLabel: 'Porezni broj (OIB)' },
  { code: 'BA', label: 'Bosna i Hercegovina', currency: 'BAM', taxIdLabel: 'Porezni broj (JIB)' },
  { code: 'RS', label: 'Srbija', currency: 'RSD', taxIdLabel: 'Porezni broj (PIB)' },
  { code: 'SI', label: 'Slovenija', currency: 'EUR', taxIdLabel: 'Porezni broj (davčna številka)' },
  { code: 'ME', label: 'Crna Gora', currency: 'EUR', taxIdLabel: 'Porezni broj (PIB)' },
  { code: 'MK', label: 'Sjeverna Makedonija', currency: 'MKD', taxIdLabel: 'Porezni broj (EDB)' },
  { code: 'XK', label: 'Kosovo', currency: 'EUR', taxIdLabel: 'Porezni broj (fiskalni broj)' },
  { code: 'OTHER', label: 'Druga država', currency: 'EUR', taxIdLabel: 'Porezni broj' },
]


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


type PasswordStrength = {
  score: number
  label: string
  hint: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Nije unesena',
      hint: 'Upiši lozinku ili generiraj sigurnu lozinku.',
    }
  }

  let score = 0
  if (password.length >= 14) score += 1
  if (password.length >= 18) score += 1
  if (/[A-ZČĆŽŠĐ]/.test(password) && /[a-zčćžšđ]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9ČĆŽŠĐčćžšđ\s]/.test(password)) score += 1

  if (/(1234|4321|qwerty|asdf|password|lozinka|admin|firma)/i.test(password)) {
    score = Math.min(score, 2)
  }

  if (score <= 1) {
    return {
      score,
      label: 'Vrlo slaba',
      hint: 'Dodaj više znakova, velika i mala slova, broj i poseban znak.',
    }
  }

  if (score === 2) {
    return {
      score,
      label: 'Slaba',
      hint: 'Lozinka još nije dovoljno sigurna za FERSYS.',
    }
  }

  if (score === 3) {
    return {
      score,
      label: 'Dobra',
      hint: 'Još malo pojačaj lozinku za bolju zaštitu.',
    }
  }

  if (score === 4) {
    return {
      score,
      label: 'Jaka',
      hint: 'Lozinka je jaka.',
    }
  }

  return {
    score: 5,
    label: 'Vrlo jaka',
    hint: 'Odlična lozinka za FERSYS račun.',
  }
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*+-_=?.'
  const all = upper + lower + digits + symbols

  const pick = (chars: string) => {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return chars[values[0] % chars.length]
  }

  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
  ]

  while (chars.length < 20) {
    chars.push(pick(all))
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    const j = values[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
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

  const [
    companyOib,
    setCompanyOib,
  ] = useState('')

  const [
    companyCountryCode,
    setCompanyCountryCode,
  ] = useState<RegistrationCountryCode>('HR')

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


  const [
    legalAccepted,
    setLegalAccepted,
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

  const selectedCountry = useMemo(
    () =>
      REGISTRATION_COUNTRIES.find(
        (country) => country.code === companyCountryCode,
      ) ?? REGISTRATION_COUNTRIES[0],
    [companyCountryCode],
  )

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

  const passwordStrength =
    useMemo(
      () => getPasswordStrength(password),
      [password],
    )

  function handleGeneratePassword() {
    const generated = generateStrongPassword()
    setPassword(generated)
    setPasswordConfirm(generated)
    setShowPassword(true)
    setError('')
  }

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
      !companyOib.trim() ||
      !normalizedEmail ||
      !password
    ) {
      setError(
        'Popuni sva obavezna polja.',
      )
      return
    }

    const normalizedCompanyTaxId =
      companyOib.trim().toUpperCase().replace(/\s+/g, '')

    if (
      companyCountryCode === 'HR' &&
      !/^\d{11}$/.test(normalizedCompanyTaxId)
    ) {
      setError(
        'OIB tvrtke ili obrta mora sadržavati točno 11 znamenki.',
      )
      return
    }

    if (
      companyCountryCode !== 'HR' &&
      normalizedCompanyTaxId.length < 5
    ) {
      setError(
        `Unesi ispravan ${selectedCountry.taxIdLabel} za odabranu državu.`,
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

    if (!legalAccepted) {
      setError(
        'Prihvati Uvjete korištenja i potvrdi Politiku privatnosti prije registracije.',
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
                company_oib:
                  companyCountryCode === 'HR' ? normalizedCompanyTaxId : '',
                company_tax_id:
                  normalizedCompanyTaxId,
                company_country_code:
                  companyCountryCode,
                company_country:
                  selectedCountry.label,
                company_currency:
                  selectedCountry.currency,
                company_tax_id_label:
                  selectedCountry.taxIdLabel,
                account_type:
                  'owner',
                legal_version:
                  LEGAL_VERSION,
                legal_terms_accepted:
                  true,
                legal_privacy_acknowledged:
                  true,
                legal_refund_policy_acknowledged:
                  true,
                legal_accepted_at:
                  new Date().toISOString(),
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
        'Registracija je zaprimljena. Provjeri e-mail i potvrdi račun. Nakon potvrde FERSYS administrator će pregledati prijavu i aktivirati tvrtku.',
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
            <img
    src="/fersys-auth-logo.svg"
    alt="FERSYS"
    className="mx-auto h-auto w-44 object-contain sm:w-48"
  />

            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Registracija FERSYS tvrtke
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Nova tvrtka postaje aktivna nakon provjere FERSYS administratora.
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
                  label="Država sjedišta tvrtke"
                  icon={<Globe2 size={19} />}
                >
                  <select
                    value={companyCountryCode}
                    onChange={(event) => {
                      setCompanyCountryCode(
                        event.target.value as RegistrationCountryCode,
                      )
                      setCompanyOib('')
                    }}
                    className="auth-input"
                  >
                    {REGISTRATION_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <p className="-mt-2 text-xs leading-5 text-slate-500">
                  FERSYS prema državi sjedišta automatski postavlja valutu i osnovna porezna/fiskalna pravila. Hrvatska je zadano odabrana.
                </p>

                <Field
                  label={`${selectedCountry.taxIdLabel} tvrtke ili obrta`}
                  icon={<Building2 size={19} />}
                >
                  <input
                    type="text"
                    inputMode={companyCountryCode === 'HR' ? 'numeric' : 'text'}
                    autoComplete="off"
                    value={companyOib}
                    onChange={(event) =>
                      setCompanyOib(
                        companyCountryCode === 'HR'
                          ? event.target.value.replace(/\D/g, '').slice(0, 11)
                          : event.target.value.slice(0, 32),
                      )
                    }
                    placeholder={
                      companyCountryCode === 'HR'
                        ? '11 znamenki OIB-a'
                        : `Unesi ${selectedCountry.taxIdLabel}`
                    }
                    maxLength={companyCountryCode === 'HR' ? 11 : 32}
                    className="auth-input"
                  />
                </Field>

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
                      id="fersys-new-password"
                      name="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
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
                      id="fersys-confirm-password"
                      name="password-confirmation"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
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

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-200">
                        Sigurnost lozinke
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {passwordStrength.hint}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 text-xs font-black text-violet-300 transition hover:bg-violet-500/15"
                    >
                      <KeyRound size={16} />
                      Generiraj snažnu lozinku
                    </button>
                  </div>

                  <div
                    className="mt-4 grid grid-cols-5 gap-1.5"
                    aria-label={`Jačina lozinke: ${passwordStrength.label}`}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 rounded-full transition-all ${
                          level <= passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score === 3
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      Najmanje 14 znakova, velika/mala slova, broj i poseban znak.
                    </span>
                    <strong
                      className={
                        passwordStrength.score <= 2
                          ? 'text-red-300'
                          : passwordStrength.score === 3
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                      }
                    >
                      {passwordStrength.label}
                    </strong>
                  </div>

                  {password && passwordError && (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
                      {passwordError}
                    </div>
                  )}

                  {password && !passwordError && (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200">
                      Lozinka zadovoljava FERSYS sigurnosna pravila.
                    </div>
                  )}
                </div>

                <LegalConsentBlock
                  checked={
                    legalAccepted
                  }
                  onChange={
                    setLegalAccepted
                  }
                />

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
                    !captchaToken ||
                    !legalAccepted
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