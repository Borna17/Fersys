import {
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useAuth } from '../auth/AuthProvider'
import { roleLabels } from '../auth/permissions'
import CompanyLogo from '../components/CompanyLogo'
import { supabase } from '../lib/supabase'
import { useCompanyBranding } from '../services/companyBranding.service'

export function ProfilePage() {
  const { user, role } = useAuth()
  const { branding } = useCompanyBranding()

  const [fullName, setFullName] =
    useState('')
  const [phone, setPhone] =
    useState('')
  const [isSaving, setIsSaving] =
    useState(false)
  const [isSendingReset, setIsSendingReset] =
    useState(false)
  const [message, setMessage] =
    useState('')
  const [error, setError] =
    useState('')

  useEffect(() => {
    const metadata = user?.user_metadata ?? {}

    setFullName(
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : '',
    )

    setPhone(
      typeof metadata.phone === 'string'
        ? metadata.phone
        : '',
    )
  }, [user?.user_metadata])

  const displayRole = useMemo(
    () =>
      role
        ? roleLabels[role]
        : 'Korisnik',
    [role],
  )

  async function saveProfile() {
    if (isSaving) {
      return
    }

    try {
      setIsSaving(true)
      setMessage('')
      setError('')

      const cleanName = fullName.trim()
      const cleanPhone = phone.trim()

      if (!cleanName) {
        throw new Error(
          'Unesi ime i prezime.',
        )
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          data: {
            ...user?.user_metadata,
            full_name: cleanName,
            phone: cleanPhone,
          },
        })

      if (updateError) {
        throw updateError
      }

      setMessage(
        'Osobni podaci su spremljeni.',
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Profil nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function sendPasswordReset() {
    const email = user?.email?.trim()

    if (!email || isSendingReset) {
      return
    }

    try {
      setIsSendingReset(true)
      setMessage('')
      setError('')

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          },
        )

      if (resetError) {
        throw resetError
      }

      setMessage(
        'Poveznica za promjenu lozinke poslana je na tvoj e-mail.',
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Poveznicu nije moguće poslati.',
      )
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="h-28 bg-gradient-to-r from-blue-600/40 via-violet-600/30 to-fuchsia-600/20" />

        <div className="-mt-12 flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:px-7">
          <CompanyLogo
            logoUrl={branding?.logoUrl}
            companyName={
              branding?.name || 'FERSYS tvrtka'
            }
            className="h-24 w-24 rounded-3xl"
          />

          <div className="min-w-0 pb-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
              Moj profil
            </p>

            <h1 className="mt-1 truncate text-2xl font-black text-white sm:text-3xl">
              {fullName || 'Korisnik'}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {branding?.name || 'Tvrtka'} · {displayRole}
            </p>
          </div>
        </div>
      </header>

      {(message || error) && (
        <div
          className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            error
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
          />
          <span>{error || message}</span>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-400">
              <UserRound size={21} />
            </div>

            <div>
              <h2 className="font-black text-white">
                Osobni podaci
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Podaci prijavljenog korisnika
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                Ime i prezime
              </span>

              <div className="relative">
                <UserRound
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="Ime i prezime"
                  className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                Telefon
              </span>

              <div className="relative">
                <Phone
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="+385..."
                  className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                E-mail
              </span>

              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={user?.email ?? ''}
                  readOnly
                  className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950/60 pl-11 pr-4 text-sm text-slate-500 outline-none"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
            >
              <Save size={18} />
              {isSaving
                ? 'Spremanje...'
                : 'Spremi promjene'}
            </button>
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
                <ShieldCheck size={21} />
              </div>

              <div>
                <h2 className="font-black text-white">
                  Pristup
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Uloga unutar tvrtke
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Trenutna uloga
              </p>

              <p className="mt-2 text-lg font-black text-white">
                {displayRole}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Ovlasti određuje vlasnik ili administrator tvrtke.
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-300">
                <KeyRound size={21} />
              </div>

              <div>
                <h2 className="font-black text-white">
                  Lozinka
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Sigurnost korisničkog računa
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void sendPasswordReset()
              }
              disabled={
                isSendingReset ||
                !user?.email
              }
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={17} />
              {isSendingReset
                ? 'Slanje...'
                : 'Promijeni lozinku'}
            </button>
          </article>
        </aside>
      </div>
    </section>
  )
}
