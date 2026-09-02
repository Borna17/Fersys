import {
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  useLocation,
} from 'react-router'

import {
  syncPendingUserDrafts,
} from '../services/drafts.service'

type NoticeState =
  | 'offline'
  | 'online'
  | null

const publicPrefixes = [
  '/login',
  '/register',
  '/reset-password',
  '/auth',
  '/join',
]

function isPublicPath(
  pathname: string,
) {
  return publicPrefixes.some(
    (prefix) =>
      pathname.startsWith(
        prefix,
      ),
  )
}

export default function ConnectionStatusNotice() {
  const location =
    useLocation()

  const [
    notice,
    setNotice,
  ] =
    useState<NoticeState>(
      navigator.onLine
        ? null
        : 'offline',
    )

  const [
    dismissedOffline,
    setDismissedOffline,
  ] = useState(false)

  const onlineTimer =
    useRef<number | null>(
      null,
    )

  useEffect(() => {
    function clearOnlineTimer() {
      if (
        onlineTimer.current !==
        null
      ) {
        window.clearTimeout(
          onlineTimer.current,
        )
        onlineTimer.current =
          null
      }
    }

    function handleOffline() {
      clearOnlineTimer()
      setDismissedOffline(false)
      setNotice('offline')
    }

    function handleOnline() {
      clearOnlineTimer()
      setDismissedOffline(false)
      setNotice('online')

      void syncPendingUserDrafts()
        .catch((error) => {
          console.warn(
            'Automatska sinkronizacija nacrta nakon povratka veze nije uspjela:',
            error,
          )
        })

      onlineTimer.current =
        window.setTimeout(
          () => {
            setNotice(null)
            onlineTimer.current =
              null
          },
          4_000,
        )
    }

    window.addEventListener(
      'offline',
      handleOffline,
    )
    window.addEventListener(
      'online',
      handleOnline,
    )

    if (!navigator.onLine) {
      handleOffline()
    }

    return () => {
      clearOnlineTimer()
      window.removeEventListener(
        'offline',
        handleOffline,
      )
      window.removeEventListener(
        'online',
        handleOnline,
      )
    }
  }, [])

  if (
    isPublicPath(
      location.pathname,
    ) ||
    !notice ||
    (
      notice === 'offline' &&
      dismissedOffline
    )
  ) {
    return null
  }

  const offline =
    notice === 'offline'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-[72] flex justify-center px-3 md:bottom-6 md:px-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur-xl ${
          offline
            ? 'border-amber-500/25 bg-slate-950/95 text-slate-100'
            : 'border-emerald-500/25 bg-slate-950/95 text-slate-100'
        }`}
      >
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            offline
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {offline ? (
            <WifiOff size={18} />
          ) : (
            <Wifi size={18} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">
            {offline
              ? 'Nema internetske veze'
              : 'Veza je ponovno uspostavljena'}
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-400 sm:text-xs">
            {offline
              ? 'Možete nastaviti unositi podatke. Lokalni nacrti ostaju spremljeni na uređaju i sinkronizirat će se kada se veza vrati. Online funkcije mogu privremeno biti nedostupne.'
              : 'FERSYS ponovno može sinkronizirati lokalno spremljene nacrte i koristiti online funkcije.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (offline) {
              setDismissedOffline(true)
            } else {
              setNotice(null)
            }
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-white"
          aria-label="Zatvori obavijest o vezi"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  )
}
