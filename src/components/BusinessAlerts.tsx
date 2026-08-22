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
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import {
  getBusinessReminders,
} from '../services/businessReminders.service'
import {
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notifications.service'

const REFRESH_MS = 60_000

function iconFor(
  kind: AppNotification['kind'],
) {
  if (kind === 'work_orders') return Wrench
  if (kind === 'offers') return FileText
  return ReceiptText
}

export default function BusinessAlerts() {
  const navigate = useNavigate()

  const [items, setItems] =
    useState<AppNotification[]>([])
  const [loading, setLoading] =
    useState(false)
  const [open, setOpen] =
    useState(false)
  const [error, setError] =
    useState('')
  const [markingAll, setMarkingAll] =
    useState(false)

  async function refresh() {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()

    const id = window.setInterval(
      () => void refresh(),
      REFRESH_MS,
    )

    const onRefresh = () =>
      void refresh()

    window.addEventListener(
      'focus',
      onRefresh,
    )
    window.addEventListener(
      'fersys:notifications-refresh',
      onRefresh,
    )

    return () => {
      window.clearInterval(id)
      window.removeEventListener(
        'focus',
        onRefresh,
      )
      window.removeEventListener(
        'fersys:notifications-refresh',
        onRefresh,
      )
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow =
      open ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const unread = useMemo(
    () =>
      items.filter(
        (item) => !item.isRead,
      ),
    [items],
  )

  const urgentCount = unread.filter(
    (item) =>
      /kasni|hitno|istekla/i.test(
        item.title,
      ),
  ).length

  async function openItem(
    item: AppNotification,
  ) {
    try {
      if (!item.isRead) {
        await markNotificationRead(
          item.id,
        )
      }
    } finally {
      setOpen(false)
      navigate(item.route)
      void refresh()
    }
  }

  async function markAll() {
    if (!unread.length) return

    try {
      setMarkingAll(true)
      await markAllNotificationsRead(
        unread.map(
          (item) => item.id,
        ),
      )
      setItems((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        })),
      )
    } finally {
      setMarkingAll(false)
    }
  }

  if (
    !loading &&
    !error &&
    items.length === 0
  ) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed right-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[54] inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black shadow-xl shadow-black/30 backdrop-blur-xl transition active:scale-95 md:right-6 md:top-[6.5rem] ${
          urgentCount
            ? 'border-red-500/25 bg-red-950/90 text-red-200'
            : 'border-slate-700 bg-slate-900/95 text-slate-300'
        }`}
      >
        {loading ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : urgentCount ? (
          <AlertTriangle size={16} />
        ) : (
          <Bell size={16} />
        )}

        <span>
          {urgentCount
            ? 'Važno'
            : 'Podsjetnici'}
        </span>

        {unread.length > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] text-white">
            {unread.length > 99
              ? '99+'
              : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[160] flex items-end md:items-start md:justify-end md:p-5 md:pt-24">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Zatvori"
          />

          <section className="relative z-10 flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl md:max-h-[calc(100dvh-7rem)] md:w-[27rem] md:rounded-3xl md:border">
            <div className="border-b border-slate-800 p-4">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700 md:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                    FERSYS PULS
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Što traži pažnju
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Nalozi, ponude i računi koje nije dobro propustiti.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
                >
                  <X size={19} />
                </button>
              </div>

              {unread.length > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={() =>
                    void markAll()
                  }
                  className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl bg-slate-800 px-3 text-[11px] font-black text-slate-300 disabled:opacity-50"
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
                  Označi sve pročitano
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {error && (
                <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {items.map((item) => {
                  const Icon =
                    iconFor(item.kind)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        void openItem(item)
                      }
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                        item.isRead
                          ? 'border-transparent bg-slate-950/30 opacity-60'
                          : 'border-slate-800 bg-slate-950/70'
                      }`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        /kasni|hitno|istekla/i.test(
                          item.title,
                        )
                          ? 'bg-red-500/10 text-red-300'
                          : item.kind === 'offers'
                            ? 'bg-violet-500/10 text-violet-300'
                            : item.kind === 'invoices'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-blue-500/10 text-blue-300'
                      }`}>
                        <Icon size={18} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black leading-5 text-white">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {item.description}
                        </span>
                      </span>

                      {!item.isRead && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
