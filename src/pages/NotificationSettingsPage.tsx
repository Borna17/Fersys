import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushRegistrationState,
  type PushRegistrationState,
} from '../services/pushNotifications.service'
import { isNativeApp } from '../lib/platform'

function stateLabel(
  state: PushRegistrationState,
) {
  if (state === 'subscribed') {
    return 'Obavijesti su uključene'
  }
  if (state === 'denied') {
    return 'Obavijesti su blokirane'
  }
  if (state === 'missing-key') {
    return 'Push nije konfiguriran'
  }
  if (state === 'unsupported') {
    return 'Push nije dostupan na ovom uređaju'
  }
  return 'Obavijesti nisu uključene'
}

export function NotificationSettingsPage() {
  const [state, setState] =
    useState<PushRegistrationState>(
      'available',
    )
  const [loading, setLoading] =
    useState(true)
  const [working, setWorking] =
    useState(false)
  const [error, setError] =
    useState('')

  async function refresh() {
    try {
      setLoading(true)
      setError('')
      setState(
        await getPushRegistrationState(),
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Status obavijesti nije moguće provjeriti.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function enable() {
    try {
      setWorking(true)
      setError('')

      const next =
        await enablePushNotifications()

      setState(next)

      if (next === 'denied') {
        setError(
          isNativeApp()
            ? 'Dopuštenje za obavijesti je odbijeno. Otvori Postavke telefona → Aplikacije → FERSYS → Obavijesti i uključi ih, zatim se vrati ovdje i stisni Provjeri ponovno.'
            : 'Dopuštenje za obavijesti je blokirano u pregledniku. Uključi ga u postavkama stranice i pokušaj ponovno.',
        )
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Obavijesti trenutno nije moguće uključiti.',
      )
    } finally {
      setWorking(false)
    }
  }

  async function disable() {
    try {
      setWorking(true)
      setError('')
      await disablePushNotifications()
      setState('available')
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Obavijesti trenutno nije moguće isključiti.',
      )
    } finally {
      setWorking(false)
    }
  }

  const enabled =
    state === 'subscribed'

  return (
    <section className="mx-auto max-w-4xl pb-28">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-300">
          <Bell size={15} />
          Obavijesti
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Postavke obavijesti
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Upravljaj push obavijestima za ovaj uređaj. FERSYS može poslati važne poslovne obavijesti i kada aplikacija nije otvorena.
        </p>
      </header>

      <div className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${
              enabled
                ? 'bg-emerald-500/15 text-emerald-300'
                : state === 'denied'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-blue-500/15 text-blue-300'
            }`}>
              {enabled ? (
                <BellRing size={25} />
              ) : state === 'denied' ? (
                <BellOff size={25} />
              ) : (
                <Bell size={25} />
              )}
            </div>

            <div>
              <p className="text-lg font-black text-white">
                {loading
                  ? 'Provjera statusa...'
                  : stateLabel(state)}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                {isNativeApp()
                  ? 'Android/iOS koristi izvorni sustav dopuštenja uređaja.'
                  : 'Web verzija koristi Firebase Web Push i dopuštenje preglednika.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || working}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-300 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
            Provjeri ponovno
          </button>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {!enabled ? (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={working || state === 'unsupported' || state === 'missing-key'}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
            >
              <BellRing size={18} />
              {working
                ? 'Uključivanje...'
                : 'Uključi obavijesti'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void disable()}
              disabled={working}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 text-sm font-black text-red-300 disabled:opacity-50"
            >
              <BellOff size={18} />
              {working
                ? 'Isključivanje...'
                : 'Isključi na ovom uređaju'}
            </button>
          )}

          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 text-sm text-slate-400">
            <Smartphone
              size={18}
              className="shrink-0 text-slate-500"
            />
            Postavka vrijedi samo za ovaj telefon ili preglednik.
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0 text-emerald-400"
          />
          <div>
            <h2 className="font-black text-white">
              Što će FERSYS slati?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Važne obavijesti vezane uz radne naloge, ponude, račune, kalendar, podršku i druge poslovne događaje koje FERSYS označi relevantnima za tvoj račun.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
