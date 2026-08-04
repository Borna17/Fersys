import type { FormEvent } from 'react'
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router'

import { supabase } from '../lib/supabase'
import {
  acceptInvitation,
  getInvitationPreview,
  roleLabels,
  type InvitationPreview,
} from '../services/employees.service'

type Mode =
  | 'login'
  | 'register'

export function JoinInvitationPage() {
  const navigate = useNavigate()
  const [searchParams] =
    useSearchParams()

  const code =
    searchParams.get('code')?.trim() ?? ''

  const [
    preview,
    setPreview,
  ] =
    useState<InvitationPreview | null>(null)

  const [
    mode,
    setMode,
  ] = useState<Mode>('register')

  const [
    fullName,
    setFullName,
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
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const passwordStrong =
    useMemo(
      () =>
        password.length >= 14 &&
        /[A-ZČĆŽŠĐ]/.test(password) &&
        /[a-zčćžšđ]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9ČĆŽŠĐčćžšđ\s]/.test(
          password,
        ),
      [password],
    )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!code) {
        setError(
          'Poveznica ne sadrži pozivni kod.',
        )
        setIsLoading(false)
        return
      }

      try {
        const invitation =
          await getInvitationPreview(code)

        if (cancelled) {
          return
        }

        setPreview(invitation)
        setEmail(invitation.email)
        setFullName(
          invitation.inviteeName,
        )

        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession()

        if (
          session?.user?.email
            ?.toLowerCase() ===
          invitation.email.toLowerCase()
        ) {
          await acceptInvitation(code)

          setSuccess(
            'Pozivnica je prihvaćena. Preusmjeravamo te u FERSYS...',
          )

          window.setTimeout(
            () =>
              navigate(
                '/dashboard',
                {
                  replace: true,
                },
              ),
            900,
          )
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Pozivnicu nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [code, navigate])

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !preview ||
      isSubmitting
    ) {
      return
    }

    setError('')
    setSuccess('')

    try {
      setIsSubmitting(true)

      if (mode === 'login') {
        const {
          error: loginError,
        } =
          await supabase.auth.signInWithPassword({
            email:
              preview.email,
            password,
          })

        if (loginError) {
          throw loginError
        }

        await acceptInvitation(
          code,
        )

        setSuccess(
          'Pozivnica je prihvaćena.',
        )

        navigate(
          '/dashboard',
          {
            replace: true,
          },
        )

        return
      }

      if (!fullName.trim()) {
        throw new Error(
          'Ime i prezime su obavezni.',
        )
      }

      if (!passwordStrong) {
        throw new Error(
          'Lozinka mora imati najmanje 14 znakova, veliko i malo slovo, broj i poseban znak.',
        )
      }

      const redirectTo =
        `${window.location.origin}/join?code=${encodeURIComponent(
          code,
        )}`

      const {
        data,
        error:
          registerError,
      } =
        await supabase.auth.signUp({
          email:
            preview.email,
          password,
          options: {
            emailRedirectTo:
              redirectTo,
            data: {
              full_name:
                fullName.trim(),
            },
          },
        })

      if (registerError) {
        throw registerError
      }

      if (data.session) {
        await acceptInvitation(
          code,
        )

        navigate(
          '/dashboard',
          {
            replace: true,
          },
        )

        return
      }

      setSuccess(
        'Račun je izrađen. Otvori potvrdu koja je poslana na e-mail, a zatim će se pozivnica automatski prihvatiti.',
      )
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Pozivnicu nije moguće prihvatiti.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 text-white">
        <div className="text-center">
          <LoaderCircle
            size={48}
            className="mx-auto animate-spin text-blue-400"
          />
          <p className="mt-4 font-bold">
            Provjera pozivnice...
          </p>
        </div>
      </main>
    )
  }

  if (
    error &&
    !preview
  ) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-slate-900 p-7 text-center">
          <ShieldCheck
            size={48}
            className="mx-auto text-red-400"
          />
          <h1 className="mt-5 text-2xl font-black">
            Pozivnica nije valjana
          </h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-300">
            {error}
          </p>
          <Link
            to="/login"
            className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold"
          >
            Idi na prijavu
          </Link>
        </div>
      </main>
    )
  }

  if (!preview) {
    return null
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-slate-950 px-4 py-8 text-white">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border-b border-slate-800 bg-slate-950/55 p-7 lg:border-b-0 lg:border-r lg:p-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-400">
            <Building2 size={28} />
          </div>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-blue-400">
            POZIVNICA ZA TVRTKU
          </p>

          <h1 className="mt-3 text-3xl font-black">
            {preview.companyName}
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-400">
            Pozvan/a si pridružiti se poslovnom prostoru tvrtke u aplikaciji FERSYS.
          </p>

          <div className="mt-7 space-y-3">
            <InfoRow
              icon={<Mail size={18} />}
              label="E-mail"
              value={preview.email}
            />

            <InfoRow
              icon={<UserPlus size={18} />}
              label="Uloga"
              value={
                roleLabels[
                  preview.role
                ]
              }
            />

            {preview.message && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Poruka
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {preview.message}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="p-7 lg:p-10">
          {success ? (
            <div className="grid min-h-[420px] place-items-center text-center">
              <div>
                <CheckCircle2
                  size={58}
                  className="mx-auto text-emerald-400"
                />
                <h2 className="mt-5 text-2xl font-black">
                  Gotovo
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                  {success}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex rounded-2xl border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setMode('register')
                  }
                  className={`min-h-11 flex-1 rounded-xl text-sm font-bold transition ${
                    mode === 'register'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Novi korisnik
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMode('login')
                  }
                  className={`min-h-11 flex-1 rounded-xl text-sm font-bold transition ${
                    mode === 'login'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Imam račun
                </button>
              </div>

              <form
                onSubmit={submit}
                className="mt-7 space-y-5"
              >
                {mode === 'register' && (
                  <label className="block">
                    <span className="text-sm font-bold text-slate-300">
                      Ime i prezime
                    </span>
                    <input
                      value={fullName}
                      onChange={(event) =>
                        setFullName(
                          event.target.value,
                        )
                      }
                      className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="text-sm font-bold text-slate-300">
                    E-mail
                  </span>
                  <input
                    value={email}
                    readOnly
                    className="mt-2 h-12 w-full cursor-not-allowed rounded-xl bg-slate-800/60 px-4 text-slate-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-300">
                    Lozinka
                  </span>

                  <div className="relative mt-2">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      className="h-12 w-full rounded-xl bg-slate-800 pl-12 pr-12 outline-none focus:ring-2 focus:ring-blue-600"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current,
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>

                {mode === 'register' && (
                  <p className="text-xs leading-5 text-slate-500">
                    Najmanje 14 znakova, veliko i malo slovo, broj i poseban znak.
                  </p>
                )}

                {error && (
                  <div className="whitespace-pre-wrap rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 font-black disabled:opacity-50"
                >
                  <ShieldCheck size={18} />
                  {isSubmitting
                    ? 'Spremanje...'
                    : mode === 'register'
                      ? 'Izradi račun i prihvati'
                      : 'Prijavi se i prihvati'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-blue-400">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-all text-sm font-bold text-white">
          {value}
        </p>
      </div>
    </div>
  )
}

