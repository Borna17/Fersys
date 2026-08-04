import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import {
  getEmployees,
  roleLabels,
  type CompanyEmployee,
} from '../services/employees.service'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notifications.service'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Kupci',
  '/work-orders': 'Radni nalozi',
  '/work-orders/new': 'Novi radni nalog',
  '/calendar': 'Kalendar',
  '/offers': 'Ponude',
  '/invoices': 'Računi',
  '/inventory': 'Skladište',
  '/vehicles': 'Vozila',
  '/reports': 'Izvještaji',
  '/ai': 'AI pomoćnik',
  '/documents': 'Dokumenti',
  '/settings': 'Postavke',
  '/settings/work-orders': 'Postavke radnih naloga',
}

const quickActions = [
  {
    label: 'Novi radni nalog',
    route: '/work-orders/new',
  },
  {
    label: 'Novi kupac',
    route: '/customers',
  },
  {
    label: 'Nova ponuda',
    route: '/offers',
  },
  {
    label: 'Novi račun',
    route: '/invoices',
  },
  {
    label: 'Novo vozilo',
    route: '/vehicles',
  },
]

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'K'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notifications, setNotifications] =
    useState<AppNotification[]>([])
  const [isNotificationsLoading, setIsNotificationsLoading] =
    useState(true)
  const [notificationsError, setNotificationsError] =
    useState('')
  const [currentEmployee, setCurrentEmployee] =
    useState<CompanyEmployee | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCurrentEmployee() {
      if (!user?.id) {
        setCurrentEmployee(null)
        return
      }

      try {
        const employees = await getEmployees()

        const employee =
          employees.find(
            (item) => item.userId === user.id,
          ) ?? null

        if (!cancelled) {
          setCurrentEmployee(employee)
        }
      } catch (error) {
        console.error(
          'Korisnički podaci nisu učitani:',
          error,
        )

        if (!cancelled) {
          setCurrentEmployee(null)
        }
      }
    }

    void loadCurrentEmployee()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      if (!user?.id) {
        setNotifications([])
        setIsNotificationsLoading(false)
        return
      }

      try {
        setNotificationsError('')

        const data =
          await getNotifications()

        if (!cancelled) {
          setNotifications(data)
        }
      } catch (error) {
        console.error(
          'Obavijesti nisu učitane:',
          error,
        )

        if (!cancelled) {
          setNotificationsError(
            error instanceof Error
              ? error.message
              : 'Obavijesti nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsNotificationsLoading(false)
        }
      }
    }

    void loadNotifications()

    const intervalId =
      window.setInterval(() => {
        void loadNotifications()
      }, 60_000)

    function handleWindowFocus() {
      void loadNotifications()
    }

    window.addEventListener(
      'focus',
      handleWindowFocus,
    )

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener(
        'focus',
        handleWindowFocus,
      )
    }
  }, [user?.id])

  const unreadNotificationsCount =
    notifications.filter(
      (notification) =>
        !notification.isRead,
    ).length

  const displayName = useMemo(() => {
    const metadataName =
      typeof user?.user_metadata?.full_name ===
      'string'
        ? user.user_metadata.full_name.trim()
        : ''

    const emailName =
      user?.email
        ?.split('@')[0]
        ?.replace(/[._-]+/g, ' ')
        ?.trim() ?? ''

    return (
      currentEmployee?.fullName?.trim() ||
      metadataName ||
      emailName ||
      'Korisnik'
    )
  }, [
    currentEmployee?.fullName,
    user?.email,
    user?.user_metadata?.full_name,
  ])

  const displayEmail = user?.email ?? ''

  const displayRole = currentEmployee
    ? roleLabels[currentEmployee.role]
    : 'Korisnik'

  const initials = getInitials(displayName)

  const currentTitle =
    pageTitles[location.pathname] ??
    (location.pathname.startsWith('/customers/')
      ? 'Profil kupca'
      : location.pathname.startsWith('/work-orders/')
        ? 'Radni nalog'
        : 'FERSYS')

  function handleQuickAction(route: string) {
    setIsQuickMenuOpen(false)
    navigate(route)
  }

  async function handleNotificationClick(
    notification: AppNotification,
  ) {
    try {
      if (!notification.isRead) {
        await markNotificationRead(
          notification.id,
        )

        setNotifications(
          (current) =>
            current.map((item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    isRead: true,
                  }
                : item,
            ),
        )
      }
    } catch (error) {
      console.error(
        'Obavijest nije označena pročitanom:',
        error,
      )
    } finally {
      setIsNotificationsOpen(false)
      navigate(notification.route)
    }
  }

  async function handleMarkAllRead() {
    const unreadKeys =
      notifications
        .filter(
          (notification) =>
            !notification.isRead,
        )
        .map(
          (notification) =>
            notification.id,
        )

    if (
      unreadKeys.length === 0
    ) {
      return
    }

    try {
      await markAllNotificationsRead(
        unreadKeys,
      )

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              isRead: true,
            }),
          ),
      )
    } catch (error) {
      console.error(
        'Obavijesti nisu označene pročitanima:',
        error,
      )

      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Promjenu nije moguće spremiti.',
      )
    }
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    try {
      setIsLoggingOut(true)
      setIsProfileOpen(false)

      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      localStorage.removeItem('fersys_auth')
      localStorage.removeItem('fersys_user_email')
      localStorage.removeItem('fersys_remember_me')

      navigate('/login', {
        replace: true,
      })
    } catch (error) {
      console.error('Greška pri odjavi:', error)

      window.alert(
        error instanceof Error
          ? error.message
          : 'Odjava nije uspjela. Pokušajte ponovno.',
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="relative z-40 flex h-[86px] shrink-0 items-center border-b border-slate-800/80 bg-slate-950/95 px-8 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-7">
        <div className="w-44 shrink-0">
          <h1 className="truncate text-2xl font-black tracking-tight text-white">
            {currentTitle}
          </h1>
        </div>

        <div className="relative max-w-[590px] flex-1">
          <Search
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            placeholder="Pretraži kupce, naloge, vozila, ponude..."
            className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/90 pl-12 pr-24 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10"
          />

          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-400 2xl:block">
            Ctrl + K
          </span>
        </div>
      </div>

      <div className="ml-7 flex shrink-0 items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsQuickMenuOpen((value) => !value)
              setIsProfileOpen(false)
              setIsNotificationsOpen(false)
            }}
            className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            <Plus size={20} />
            Novo

            <ChevronDown
              size={17}
              className={`transition-transform ${
                isQuickMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isQuickMenuOpen && (
            <div className="absolute right-0 top-14 w-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleQuickAction(action.route)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Plus size={17} />
                  </span>

                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          aria-label="Promijeni temu"
        >
          <Moon size={20} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen((value) => !value)
              setIsQuickMenuOpen(false)
              setIsProfileOpen(false)
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            aria-label="Obavijesti"
          >
            <Bell size={20} />

            {unreadNotificationsCount > 0 && (
              <span className="absolute right-1.5 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {unreadNotificationsCount > 99
                  ? '99+'
                  : unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-14 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="font-bold text-white">
                    Obavijesti
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {unreadNotificationsCount > 0
                      ? `${unreadNotificationsCount} nepročitanih`
                      : 'Nema novih obavijesti'}
                  </p>
                </div>

                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleMarkAllRead()
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                  >
                    <CheckCheck size={15} />
                    Pročitaj sve
                  </button>
                )}
              </div>

              <div className="max-h-[430px] overflow-y-auto p-2">
                {isNotificationsLoading ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    Učitavanje obavijesti...
                  </div>
                ) : notificationsError ? (
                  <div className="rounded-xl bg-red-500/10 px-4 py-4 text-sm text-red-300">
                    {notificationsError}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Bell
                      size={30}
                      className="mx-auto text-slate-600"
                    />

                    <p className="mt-3 font-semibold text-slate-300">
                      Nema obavijesti
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Ovdje će se pojaviti nadolazeći termini i druge važne promjene.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          void handleNotificationClick(
                            notification,
                          )
                        }}
                        className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-800 ${
                          notification.isRead
                            ? 'opacity-65'
                            : 'bg-blue-500/5'
                        }`}
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
                          <CalendarDays size={18} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-white">
                              {notification.title}
                            </span>

                            {!notification.isRead && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-slate-400">
                            {notification.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 h-9 w-px bg-slate-800" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((value) => !value)
              setIsQuickMenuOpen(false)
              setIsNotificationsOpen(false)
            }}
            className="flex min-w-[235px] items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-900"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-950/40">
              {initials}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {displayName}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {displayRole}
              </p>
            </div>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-400">
              <ChevronDown
                size={18}
                className={`transition-transform ${
                  isProfileOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-[60px] w-72 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-950/60 p-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                  {initials}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {displayName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {displayEmail || 'E-mail nije dostupan'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <UserRound size={18} />
                Moj profil
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false)
                  navigate('/settings')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Settings size={18} />
                Postavke računa
              </button>

              <div className="my-2 h-px bg-slate-800" />

              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => {
                  void handleLogout()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut size={18} />
                {isLoggingOut
                  ? 'Odjava...'
                  : 'Odjavi se'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}