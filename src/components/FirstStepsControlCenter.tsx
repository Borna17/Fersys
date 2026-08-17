import {
  Eye,
  EyeOff,
  GraduationCap,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useLocation,
} from 'react-router'

import {
  getAdminFirstStepsPreferences,
  getFirstStepsPreferences,
  setAdminFirstStepsPreferences,
  setFirstStepsPreferences,
  type FirstStepsPreferences,
} from '../services/firstSteps.service'

const empty:
FirstStepsPreferences = {
  enabled: false,
  forceToken: '',
  explicit: false,
}

export default function FirstStepsControlCenter() {
  const location =
    useLocation()

  const adminCompanyId =
    useMemo(
      () => {
        const match =
          location.pathname.match(
            /^\/admin\/companies\/([^/]+)$/,
          )

        return match?.[1] ??
          ''
      },
      [location.pathname],
    )

  const isUserSettings =
    location.pathname ===
      '/settings'

  const isAdminCompany =
    Boolean(
      adminCompanyId,
    )

  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    preferences,
    setPreferences,
  ] =
    useState<FirstStepsPreferences>(
      empty,
    )

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    setOpen(false)
    setMessage('')
    setError('')
  }, [location.pathname])

  useEffect(() => {
    if (
      !open ||
      (
        !isUserSettings &&
        !isAdminCompany
      )
    ) {
      return
    }

    let cancelled =
      false

    async function load() {
      try {
        setLoading(true)
        setError('')

        const next =
          isAdminCompany
            ? await getAdminFirstStepsPreferences(
                adminCompanyId,
              )
            : await getFirstStepsPreferences()

        if (!cancelled) {
          setPreferences(
            next,
          )
        }
      } catch (value) {
        if (!cancelled) {
          setError(
            value instanceof Error
              ? value.message
              : 'Postavke vodiča nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [
    open,
    isAdminCompany,
    isUserSettings,
    adminCompanyId,
  ])

  if (
    !isUserSettings &&
    !isAdminCompany
  ) {
    return null
  }

  async function save(
    enabled: boolean,
    forceOpen = false,
  ) {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      const next =
        isAdminCompany
          ? await setAdminFirstStepsPreferences(
              adminCompanyId,
              enabled,
              forceOpen,
            )
          : await setFirstStepsPreferences(
              enabled,
              forceOpen,
            )

      setPreferences(
        next,
      )

      setMessage(
        forceOpen
          ? 'Vodič je uključen i bit će ponovno otvoren na Dashboardu.'
          : enabled
            ? 'Vodič "Prvih 10 minuta" je uključen.'
            : 'Vodič "Prvih 10 minuta" je isključen.',
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className={`fixed z-[84] inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3.5 text-xs font-black shadow-2xl backdrop-blur-xl transition active:scale-[0.98] ${
          isAdminCompany
            ? 'bottom-5 right-5 border-violet-500/25 bg-slate-950/95 text-violet-200'
            : 'bottom-[5.8rem] right-3 border-blue-500/25 bg-slate-900/95 text-blue-100 md:bottom-6 md:right-[15rem]'
        }`}
      >
        {isAdminCompany ? (
          <ShieldCheck
            size={17}
          />
        ) : (
          <GraduationCap
            size={17}
          />
        )}

        {isAdminCompany
          ? 'Onboarding'
          : 'Početni vodič'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[260] grid place-items-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-xl"
          onMouseDown={() =>
            setOpen(false)
          }
        >
          <section
            className="w-full max-w-xl rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  {isAdminCompany
                    ? 'FERSYS ADMIN'
                    : 'POSTAVKE'}
                </p>

                <h2 className="mt-1 text-xl font-black text-white">
                  FERSYS · Prvih 10 minuta
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isAdminCompany
                    ? 'Uključi ili ponovno otvori početni vodič za ovu tvrtku.'
                    : 'Odluči želiš li na Dashboardu koristiti početni vodič.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-5">
              {loading ? (
                <div className="py-8 text-center text-sm font-bold text-slate-500">
                  Učitavanje...
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div>
                      <p className="font-black text-white">
                        Početni vodič
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Kada je uključen, na Dashboardu se prikazuje checklist s prvim koracima.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void save(
                          !preferences.enabled,
                          false,
                        )
                      }
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black ${
                        preferences.enabled
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {preferences.enabled ? (
                        <Eye size={16} />
                      ) : (
                        <EyeOff size={16} />
                      )}

                      {preferences.enabled
                        ? 'Uključen'
                        : 'Isključen'}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void save(
                        true,
                        true,
                      )
                    }
                    className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-50"
                  >
                    <RefreshCw
                      size={17}
                    />
                    {isAdminCompany
                      ? 'Uključi i ponovno otvori korisniku'
                      : 'Uključi i ponovno otvori na Dashboardu'}
                  </button>

                  {message && (
                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
                      {message}
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                    <Settings2
                      size={18}
                      className="mt-0.5 shrink-0 text-slate-500"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      {isAdminCompany
                        ? 'Promjena vrijedi za cijelu tvrtku. Ako klikneš ponovno otvori, korisnik će vodič vidjeti pri sljedećem otvaranju Dashboarda čak i ako ga je prije sakrio.'
                        : 'Ova postavka vrijedi za tvoju tvrtku. Vodič se uvijek može ponovno uključiti iz Postavki.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
