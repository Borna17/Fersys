import {
  useEffect,
  useRef,
} from 'react'

const LAST_RELOAD_KEY =
  'fersys-runtime-last-auto-reload'

function canAutoReload() {
  try {
    const value =
      Number(
        sessionStorage.getItem(
          LAST_RELOAD_KEY,
        ) ?? 0,
      )

    return (
      !value ||
      Date.now() - value >
        30_000
    )
  } catch {
    return false
  }
}

function rememberReload() {
  try {
    sessionStorage.setItem(
      LAST_RELOAD_KEY,
      String(Date.now()),
    )
  } catch {
    // Nije kritično.
  }
}

function isChunkLoadError(
  value: unknown,
) {
  const message =
    value instanceof Error
      ? value.message
      : String(value ?? '')

  return (
    /Loading chunk/i.test(
      message,
    ) ||
    /Failed to fetch dynamically imported module/i.test(
      message,
    ) ||
    /Importing a module script failed/i.test(
      message,
    )
  )
}

export default function RuntimeHealthGuard() {
  const onlineRef =
    useRef(
      navigator.onLine,
    )

  useEffect(() => {
    function online() {
      const wasOffline =
        !onlineRef.current

      onlineRef.current = true

      if (wasOffline) {
        window.dispatchEvent(
          new Event(
            'fersys:runtime-reconnected',
          ),
        )

        window.dispatchEvent(
          new Event(
            'fersys:notifications-refresh',
          ),
        )
      }
    }

    function offline() {
      onlineRef.current = false
    }

    function unhandledRejection(
      event:
        PromiseRejectionEvent,
    ) {
      if (
        !isChunkLoadError(
          event.reason,
        ) ||
        !navigator.onLine ||
        !canAutoReload()
      ) {
        return
      }

      rememberReload()
      window.location.reload()
    }

    function globalError(
      event: ErrorEvent,
    ) {
      if (
        !isChunkLoadError(
          event.error ??
            event.message,
        ) ||
        !navigator.onLine ||
        !canAutoReload()
      ) {
        return
      }

      rememberReload()
      window.location.reload()
    }

    window.addEventListener(
      'online',
      online,
    )
    window.addEventListener(
      'offline',
      offline,
    )
    window.addEventListener(
      'unhandledrejection',
      unhandledRejection,
    )
    window.addEventListener(
      'error',
      globalError,
    )

    return () => {
      window.removeEventListener(
        'online',
        online,
      )
      window.removeEventListener(
        'offline',
        offline,
      )
      window.removeEventListener(
        'unhandledrejection',
        unhandledRejection,
      )
      window.removeEventListener(
        'error',
        globalError,
      )
    }
  }, [])

  return null
}
