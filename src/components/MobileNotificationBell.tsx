import { AlertTriangle, Bell, BellRing, CheckCheck, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notifications.service'
import { supabase } from '../lib/supabase'
import { isNativeApp } from '../lib/platform'
import {
  enablePushNotifications,
  getPushRegistrationState,
  type PushRegistrationState,
} from '../services/pushNotifications.service'

const publicPaths = ['/login', '/register', '/reset-password', '/auth', '/join', '/admin']
type MobileTab = 'attention' | 'notifications'

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname.startsWith(path))
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MobileNotificationBell() {
  const location = useLocation()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<MobileTab>('attention')
  const [attentionCount, setAttentionCount] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [pushState, setPushState] = useState<PushRegistrationState>('available')

  const visible = isAuthenticated && !isPublicPath(location.pathname)
  const unread = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications])
  const totalBadge = unread + attentionCount

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      setError('')
      setNotifications(await getNotifications())
    } catch (nextError) {
      console.error('Mobilne obavijesti nisu učitane:', nextError)
      setError(nextError instanceof Error ? nextError.message : 'Obavijesti trenutno nisu dostupne.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthenticated(Boolean(data.session?.user))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user))
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function updateAttention(event: Event) {
      const detail = (event as CustomEvent<{ count?: number }>).detail
      setAttentionCount(Math.max(0, Number(detail?.count ?? 0)))
    }
    window.addEventListener('fersys:attention-updated', updateAttention)
    return () => window.removeEventListener('fersys:attention-updated', updateAttention)
  }, [])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    void getPushRegistrationState().then((state) => {
      if (cancelled) return
      setPushState(state)
      if (typeof Notification !== 'undefined') setPermission(Notification.permission)
    }).catch((nextError) => console.error('Push status nije moguće učitati:', nextError))
    return () => { cancelled = true }
  }, [visible])

  useEffect(() => {
    if (!visible) {
      setOpen(false)
      return
    }
    void load()
    const intervalId = window.setInterval(() => void load(), 30_000)
    const refresh = () => void load()
    window.addEventListener('focus', refresh)
    window.addEventListener('fersys:notifications-refresh', refresh)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('fersys:notifications-refresh', refresh)
    }
  }, [visible, load])

  useEffect(() => {
    if (!open) return
    function closeOutside(event: MouseEvent | TouchEvent) {
      if (event.target instanceof Node && panelRef.current && !panelRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('touchstart', closeOutside)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('touchstart', closeOutside)
    }
  }, [open])

  async function enableSystemNotifications() {
    try {
      setError('')
      const state = await enablePushNotifications()
      setPushState(state)
      if (typeof Notification !== 'undefined') setPermission(Notification.permission)

      if (state === 'subscribed' && !isNativeApp() && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('FERSYS push je uključen', {
          body: 'Ovaj uređaj je registriran za obavijesti i kada FERSYS nije otvoren.',
          icon: '/pwa-192x192.png',
          badge: '/favicon-64x64.png',
          tag: 'fersys-push-enabled',
          data: { route: '/dashboard' },
        })
      } else if (state === 'missing-key') {
        setError('Nedostaje VITE_FIREBASE_VAPID_KEY u web konfiguraciji.')
      } else if (state === 'unsupported') {
        setError('Ovaj uređaj trenutno ne podržava FERSYS push obavijesti.')
      } else if (state === 'denied') {
        setError(isNativeApp()
          ? 'Dopuštenje je blokirano. Otvori Postavke telefona → Aplikacije → FERSYS → Obavijesti, uključi ih i zatim pokušaj ponovno.'
          : 'Obavijesti su blokirane u postavkama preglednika.')
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Push obavijesti trenutno nije moguće uključiti.')
    }
  }

  async function openItem(item: AppNotification) {
    try {
      if (!item.isRead) await markNotificationRead(item.id)
    } catch (nextError) {
      console.error('Obavijest nije označena pročitanom:', nextError)
    }
    setNotifications((current) => current.map((notification) =>
      notification.id === item.id ? { ...notification, isRead: true } : notification,
    ))
    setOpen(false)
    navigate(item.route || '/dashboard')
  }

  async function markAll() {
    const keys = notifications.filter((item) => !item.isRead).map((item) => item.id)
    if (!keys.length) return
    try {
      await markAllNotificationsRead(keys)
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    } catch (nextError) {
      console.error('Obavijesti nisu označene pročitanima:', nextError)
    }
  }

  function openAttention() {
    setOpen(false)
    window.dispatchEvent(new Event('fersys:open-attention'))
  }

  if (!visible) return null

  return (
    <div ref={panelRef} className="fersys-mobile-fixed-top fixed z-[85] md:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative grid h-11 w-11 place-items-center rounded-2xl border bg-slate-900/95 text-slate-300 shadow-lg shadow-black/20 backdrop-blur-xl transition active:scale-95 ${open ? 'border-blue-500/50 text-blue-300 ring-4 ring-blue-500/10' : 'border-slate-800'}`}
        aria-label="Obavijesti"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {totalBadge > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {totalBadge > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-slate-950 bg-red-500 px-1 text-[9px] font-black text-white">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Centar obavijesti" className="absolute left-0 top-[calc(100%+0.65rem)] w-[min(22rem,calc(100vw-1.5rem-var(--fersys-safe-left)-var(--fersys-safe-right)))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/70">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div>
              <p className="font-black text-white">Centar obavijesti</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Sve važno na jednom mjestu</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Zatvori">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-slate-800 bg-slate-950/50 p-1.5">
            <button type="button" onClick={() => setTab('attention')} className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-black ${tab === 'attention' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
              <AlertTriangle size={15} />
              Traži pažnju
              {attentionCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[9px] text-slate-950">{attentionCount > 99 ? '99+' : attentionCount}</span>}
            </button>
            <button type="button" onClick={() => setTab('notifications')} className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-black ${tab === 'notifications' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
              <Bell size={15} />
              Obavijesti
              {unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-500 px-1 text-[9px] text-white">{unread > 99 ? '99+' : unread}</span>}
            </button>
          </div>

          {tab === 'attention' ? (
            <div className="p-3">
              <button type="button" onClick={openAttention} className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4 text-left active:scale-[0.99]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300"><AlertTriangle size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-white">Što traži pažnju</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{attentionCount > 0 ? `${attentionCount} stavki zahtijeva pregled ili akciju.` : 'Trenutno nema stavki koje zahtijevaju tvoju pažnju.'}</span>
                </span>
              </button>
            </div>
          ) : (
            <>
              {pushState !== 'subscribed' && pushState !== 'unsupported' && (
                <div className="border-b border-slate-800 bg-blue-500/5 p-3">
                  <button type="button" onClick={() => void enableSystemNotifications()} className="flex w-full items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-left">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500 text-white"><BellRing size={19} /></div>
                    <div>
                      <p className="text-xs font-black text-blue-100">Uključi obavijesti na telefonu</p>
                      <p className="mt-1 text-[11px] leading-4 text-blue-200/60">Registriraj ovaj telefon za push obavijesti i kada FERSYS nije otvoren.</p>
                    </div>
                  </button>
                </div>
              )}

              {pushState === 'subscribed' && <div className="border-b border-slate-800 bg-emerald-500/5 px-4 py-3 text-[11px] font-semibold leading-4 text-emerald-200/80">✓ Push obavijesti su uključene na ovom uređaju.</div>}
              {(permission === 'denied' || pushState === 'denied') && (
                <div className="border-b border-slate-800 bg-amber-500/5 px-4 py-3 text-[11px] leading-4 text-amber-200/70">
                  {isNativeApp() ? 'Obavijesti su blokirane u postavkama telefona. Otvori Postavke → Aplikacije → FERSYS → Obavijesti.' : 'Obavijesti su blokirane u postavkama preglednika.'}
                </div>
              )}

              <div className="max-h-[min(52vh,390px)] overflow-y-auto">
                {loading && notifications.length === 0 && <p className="p-6 text-center text-xs text-slate-500">Učitavanje obavijesti...</p>}
                {error && notifications.length === 0 && <p className="p-4 text-xs leading-5 text-red-300">{error}</p>}
                {!loading && !error && notifications.length === 0 && (
                  <div className="p-7 text-center">
                    <Bell size={26} className="mx-auto text-slate-700" />
                    <p className="mt-3 text-sm font-black text-white">Nema novih obavijesti</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Ovdje će se pojaviti važne FERSYS obavijesti.</p>
                  </div>
                )}
                {notifications.map((item) => (
                  <button key={item.id} type="button" onClick={() => void openItem(item)} className={`block w-full border-b border-slate-800/80 px-4 py-3 text-left transition last:border-b-0 ${item.isRead ? 'bg-transparent' : 'bg-blue-500/[0.06]'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-slate-700' : 'bg-blue-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 text-sm font-black leading-5 text-white">{item.title}</p>
                          <span className="shrink-0 text-[10px] text-slate-600">{formatDate(item.createdAt)}</span>
                        </div>
                        {item.description && <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{item.description}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t border-slate-800 p-2">
                {unread > 0 && (
                  <button type="button" onClick={() => void markAll()} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black text-slate-400 hover:bg-slate-800 hover:text-white">
                    <CheckCheck size={16} /> Pročitaj sve
                  </button>
                )}
                <button type="button" onClick={() => { setOpen(false); navigate('/settings/notifications') }} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black text-slate-400 hover:bg-slate-800 hover:text-white">
                  <Settings size={16} /> Postavke
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
