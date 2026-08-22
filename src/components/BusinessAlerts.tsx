import {
  AlertTriangle,
  Bell,
  CheckCheck,
  FileText,
  Loader2,
  ReceiptText,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import {
  getBusinessReminders,
} from '../services/businessReminders.service'
import {
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notifications.service'

const REFRESH_MS =
  60_000

const INITIAL_DELAY_MS =
  4_000

function iconFor(
  kind:
    AppNotification['kind'],
) {
  if (
    kind ===
    'work_orders'
  ) {
    return Wrench
  }

  if (
    kind === 'offers'
  ) {
    return FileText
  }

  return ReceiptText
}

export default function BusinessAlerts() {
  const navigate =
    useNavigate()

  const [
    items,
    setItems,
  ] =
    useState<
      AppNotification[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    open,
    setOpen,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false)

  const inFlightRef =
    useRef<
      Promise<void> |
        null
    >(null)

  function refresh() {
    if (
      inFlightRef.current
    ) {
      return inFlightRef.current
    }

    const request =
      (async () => {
        try {
          setLoading(
            true,
          )
          setError('')

          setItems(
            await getBusinessReminders(),
          )
        } catch (value) {
          setError(
            value instanceof Error
              ? value.message
              : 'Poslovne obavijesti nije moguće učitati.',
          )
        } finally {
          setLoading(
            false,
          )
          inFlightRef.current =
            null
        }
      })()

    inFlightRef.current =
      request

    return request
  }

  useEffect(() => {
    const initialTimer =
      window.setTimeout(
        () => {
          void refresh()
        },
        INITIAL_DELAY_MS,
      )

    const id =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void refresh()
          }
        },
        REFRESH_MS,
      )

    function onRefresh() {
      void refresh()
    }

    window.addEventListener(
      'fersys:notifications-refresh',
      onRefresh,
    )

    return () => {
      window.clearTimeout(
        initialTimer,
      )
      window.clearInterval(
        id,
      )
      window.removeEventListener(
        'fersys:notifications-refresh',
        onRefresh,
      )
    }
  }, [])

  const unread =
    useMemo(
      () =>
        items.filter(
          (item) =>
            !item.isRead,
        ),
      [items],
    )

  const urgentCount =
    unread.filter(
      (item) =>
        /kasni|hitno|istekla/i.test(
          item.title,
        ),
    ).length

  async function openPanel() {
    setOpen(true)

    if (
      items.length === 0 &&
      !loading
    ) {
      await refresh()
    }
  }

  async function openItem(
    item:
      AppNotification,
  ) {
    try {
      if (!item.isRead) {
        await markNotificationRead(
          item.id,
        )
      }
    } finally {
      setOpen(false)
      navigate(
        item.route,
      )
    }
  }

  async function markAll() {
    if (
      !unread.length
    ) {
      return
    }

    try {
      setMarkingAll(
        true,
      )

      await markAllNotificationsRead(
        unread.map(
          (item) =>
            item.id,
        ),
      )

      setItems(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              isRead: true,
            }),
          ),
      )
    } finally {
      setMarkingAll(
        false,
      )
    }
  }

  if (
    !loading &&
    !error &&
    items.length === 0
  ) {
    return (
      <button
        type="button"
        onClick={() =>
          void openPanel()
        }
        className="fixed right-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[54] grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-slate-900/95 text-slate-400 shadow-xl backdrop-blur-xl md:right-6 md:top-[6.5rem]"
        aria-label="Poslovne obavijesti"
      >
        <Bell size={16} />
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void openPanel()
        }
        className={`fixed right-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[54] inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black shadow-xl backdrop-blur-xl ${
          urgentCount
            ? 'border-red-500/25 bg-red-950/90 text-red-200'
            : 'border-slate-700 bg-slate-900/95 text-slate-300'
        }`}
        aria-label="Poslovne obavijesti"
      >
        {loading ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : urgentCount ? (
          <AlertTriangle
            size={16}
          />
        ) : (
          <Bell size={16} />
        )}

        {unread.length >
          0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] text-white">
            {unread.length >
            99
              ? '99+'
              : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[160] flex items-end md:items-start md:justify-end md:p-5 md:pt-24">
          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Zatvori"
          />

          <section className="relative z-10 flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl md:w-[27rem] md:rounded-3xl md:border">
            <div className="border-b border-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                    FERSYS PULS
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Što traži pažnju
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
                >
                  <X size={19} />
                </button>
              </div>

              {unread.length >
                0 && (
                <button
                  type="button"
                  disabled={
                    markingAll
                  }
                  onClick={() =>
                    void markAll()
                  }
                  className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl bg-slate-800 px-3 text-[11px] font-black text-slate-300"
                >
                  {markingAll ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCheck
                      size={14}
                    />
                  )}
                  Pročitaj sve
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading &&
                items.length ===
                  0 && (
                <div className="grid min-h-40 place-items-center text-slate-500">
                  <Loader2
                    size={22}
                    className="animate-spin"
                  />
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {items.map(
                  (item) => {
                    const Icon =
                      iconFor(
                        item.kind,
                      )

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          void openItem(
                            item,
                          )
                        }
                        className="flex w-full items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-left"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                          <Icon
                            size={18}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black text-white">
                            {
                              item.title
                            }
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {
                              item.description
                            }
                          </span>
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
