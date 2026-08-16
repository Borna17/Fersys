import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  CircleDollarSign,
  Gift,
  Headphones,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import AIChatPanel from '../ai/AIChatPanel'
import { useAuth } from '../auth/AuthProvider'
import type { PermissionKey } from '../auth/permissions'
import { supabase } from '../lib/supabase'
import { useCompanyBranding } from '../services/companyBranding.service'
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
  type AppNotificationKind,
} from '../services/notifications.service'
import CompanyLogo from './CompanyLogo'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Investitori',
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
  '/support': 'Podrška',
  '/settings': 'Postavke',
  '/settings/work-orders':
    'Postavke radnih naloga',
  '/account': 'Moj FERSYS',
}

const quickActions: Array<{
  label: string
  route: string
  permission: PermissionKey
}> = [
  {
    label: 'Novi radni nalog',
    route: '/work-orders/new',
    permission: 'workOrders.manage',
  },
  {
    label: 'Novi investitor',
    route: '/customers',
    permission: 'customers.manage',
  },
  {
    label: 'Nova ponuda',
    route: '/offers/new',
    permission: 'offers.manage',
  },
  {
    label: 'Novi račun',
    route: '/invoices/new',
    permission: 'invoices.view',
  },
  {
    label: 'Novo vozilo',
    route: '/vehicles?new=1',
    permission: 'vehicles.manage',
  },
]

function formatNotificationDate(
  value: string,
) {
  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Vrijeme nije dostupno'
  }

  return date.toLocaleString(
    'hr-HR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function getNotificationIcon(
  kind: AppNotificationKind,
) {
  if (kind === 'support') {
    return Headphones
  }

  if (
    kind === 'subscription'
  ) {
    return CircleDollarSign
  }

  if (kind === 'employee') {
    return UsersRound
  }

  if (kind === 'calendar') {
    return CalendarDays
  }

  return BriefcaseBusiness
}

function getNotificationIconClasses(
  kind: AppNotificationKind,
) {
  if (kind === 'support') {
    return 'bg-violet-500/10 text-violet-300'
  }

  if (
    kind === 'subscription'
  ) {
    return 'bg-emerald-500/10 text-emerald-300'
  }

  if (kind === 'employee') {
    return 'bg-amber-500/10 text-amber-300'
  }

  if (kind === 'calendar') {
    return 'bg-blue-500/10 text-blue-300'
  }

  return 'bg-slate-700 text-slate-300'
}

export default function Topbar() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const {
    user,
    can,
    role,
  } = useAuth()

  const { branding } =
    useCompanyBranding()

  const [
    isQuickMenuOpen,
    setIsQuickMenuOpen,
  ] = useState(false)

  const [
    isProfileOpen,
    setIsProfileOpen,
  ] = useState(false)

  const [
    isAiOpen,
    setIsAiOpen,
  ] = useState(false)

  const [
    isNotificationsOpen,
    setIsNotificationsOpen,
  ] = useState(false)

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false)

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] = useState(false)

  const [
    notifications,
    setNotifications,
  ] = useState<
    AppNotification[]
  >([])

  const [
    isNotificationsLoading,
    setIsNotificationsLoading,
  ] = useState(true)

  const [
    notificationsError,
    setNotificationsError,
  ] = useState('')

  const [
    currentEmployee,
    setCurrentEmployee,
  ] =
    useState<CompanyEmployee | null>(
      null,
    )

  const visibleQuickActions =
    useMemo(
      () =>
        quickActions.filter(
          (action) =>
            can(
              action.permission,
            ),
        ),
      [can],
    )

  const canUseAi =
    can('ai.use')

  const canManageSettings =
    can('settings.manage')

  useEffect(() => {
    if (!canUseAi) {
      setIsAiOpen(false)
    }
  }, [canUseAi])

  useEffect(() => {
    let cancelled = false

    async function loadCurrentEmployee() {
      if (!user?.id) {
        setCurrentEmployee(
          null,
        )
        return
      }

      try {
        const employees =
          await getEmployees()

        const employee =
          employees.find(
            (item) =>
              item.userId ===
              user.id,
          ) ?? null

        if (!cancelled) {
          setCurrentEmployee(
            employee,
          )
        }
      } catch (error) {
        console.error(
          'Korisnički podaci nisu učitani:',
          error,
        )

        if (!cancelled) {
          setCurrentEmployee(
            null,
          )
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
        setIsNotificationsLoading(
          false,
        )
        return
      }

      try {
        setNotificationsError(
          '',
        )

        const data =
          await getNotifications()

        if (!cancelled) {
          setNotifications(
            data,
          )
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
          setIsNotificationsLoading(
            false,
          )
        }
      }
    }

    void loadNotifications()

    const intervalId =
      window.setInterval(
        () => {
          void loadNotifications()
        },
        30_000,
      )

    function handleWindowFocus() {
      void loadNotifications()
    }

    window.addEventListener(
      'focus',
      handleWindowFocus,
    )

    return () => {
      cancelled = true

      window.clearInterval(
        intervalId,
      )

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

  const displayName =
    useMemo(() => {
      const metadataName =
        typeof user
          ?.user_metadata
          ?.full_name ===
        'string'
          ? user.user_metadata.full_name.trim()
          : ''

      const emailName =
        user?.email
          ?.split('@')[0]
          ?.replace(
            /[._-]+/g,
            ' ',
          )
          ?.trim() ?? ''

      return (
        currentEmployee
          ?.fullName
          ?.trim() ||
        metadataName ||
        emailName ||
        'Korisnik'
      )
    }, [
      currentEmployee?.fullName,
      user?.email,
      user?.user_metadata
        ?.full_name,
    ])

  const displayEmail =
    user?.email ?? ''

  const displayRole =
    currentEmployee
      ? roleLabels[
          currentEmployee.role
        ]
      : 'Korisnik'

  const currentTitle =
    pageTitles[
      location.pathname
    ] ??
    (location.pathname.startsWith(
      '/customers/',
    )
      ? 'Profil investitora'
      : location.pathname.startsWith(
            '/work-orders/',
          )
        ? 'Radni nalog'
        : location.pathname.startsWith(
              '/vehicles/',
            )
          ? 'Vozilo'
          : 'FERSYS')

  function closeMenus() {
    setIsQuickMenuOpen(
      false,
    )
    setIsNotificationsOpen(
      false,
    )
    setIsProfileOpen(
      false,
    )
    setIsAiOpen(false)
  }

  function handleQuickAction(
    route: string,
  ) {
    closeMenus()
    navigate(route)
  }

  async function handleNotificationClick(
    notification: AppNotification,
  ) {
    try {
      if (
        !notification.isRead
      ) {
        await markNotificationRead(
          notification.id,
        )

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      isRead:
                        true,
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
      setIsNotificationsOpen(
        false,
      )
      navigate(
        notification.route,
      )
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
      setIsMarkingAllRead(
        true,
      )

      setNotificationsError(
        '',
      )

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
      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setIsMarkingAllRead(
        false,
      )
    }
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    try {
      setIsLoggingOut(
        true,
      )

      setIsProfileOpen(
        false,
      )

      const { error } =
        await supabase.auth.signOut()

      if (error) {
        throw error
      }

      localStorage.removeItem(
        'fersys_auth',
      )

      localStorage.removeItem(
        'fersys_user_email',
      )

      localStorage.removeItem(
        'fersys_remember_me',
      )

      navigate('/login', {
        replace: true,
      })
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Odjava nije uspjela.',
      )
    } finally {
      setIsLoggingOut(
        false,
      )
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
            placeholder="Pretraži FERSYS..."
            className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/90 pl-12 pr-24 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10"
          />

          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-400 2xl:block">
            Ctrl + K
          </span>
        </div>
      </div>

      <div className="ml-7 flex shrink-0 items-center gap-3">
        {visibleQuickActions.length >
          0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsQuickMenuOpen(
                  (value) =>
                    !value,
                )
                setIsProfileOpen(
                  false,
                )
                setIsNotificationsOpen(
                  false,
                )
                setIsAiOpen(
                  false,
                )
              }}
              className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
            >
              <Plus
                size={20}
              />
              Novo
              <ChevronDown
                size={17}
                className={`transition-transform ${
                  isQuickMenuOpen
                    ? 'rotate-180'
                    : ''
                }`}
              />
            </button>

            {isQuickMenuOpen && (
              <div className="absolute right-0 top-14 w-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
                {visibleQuickActions.map(
                  (action) => (
                    <button
                      key={
                        action.label
                      }
                      type="button"
                      onClick={() =>
                        handleQuickAction(
                          action.route,
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                        <Plus
                          size={
                            17
                          }
                        />
                      </span>
                      {
                        action.label
                      }
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {canUseAi && (
          <button
            type="button"
            onClick={() => {
              setIsAiOpen(
                (value) =>
                  !value,
              )
              setIsQuickMenuOpen(
                false,
              )
              setIsNotificationsOpen(
                false,
              )
              setIsProfileOpen(
                false,
              )
            }}
            className={`relative flex h-12 w-12 items-center justify-center rounded-xl border transition ${
              isAiOpen
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-300 ring-4 ring-violet-500/10'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300'
            }`}
            aria-label="FERSYS AI"
            title="FERSYS AI"
          >
            <Sparkles
              size={20}
            />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen(
                (value) =>
                  !value,
              )
              setIsQuickMenuOpen(
                false,
              )
              setIsProfileOpen(
                false,
              )
              setIsAiOpen(
                false,
              )
            }}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            aria-label="Obavijesti"
          >
            <Bell
              size={20}
            />

            {unreadNotificationsCount >
              0 && (
              <span className="absolute right-1.5 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {unreadNotificationsCount >
                99
                  ? '99+'
                  : unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-14 w-[430px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
                <div>
                  <p className="font-bold text-white">
                    Obavijesti
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {unreadNotificationsCount >
                    0
                      ? `${unreadNotificationsCount} nepročitanih`
                      : 'Sve je pročitano'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    unreadNotificationsCount ===
                      0 ||
                    isMarkingAllRead
                  }
                  onClick={() =>
                    void handleMarkAllRead()
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-40"
                >
                  <CheckCheck
                    size={15}
                  />
                  {isMarkingAllRead
                    ? 'Spremanje...'
                    : 'Pročitaj sve'}
                </button>
              </div>

              <div className="max-h-[540px] overflow-y-auto p-2">
                {isNotificationsLoading ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    Učitavanje obavijesti...
                  </div>
                ) : notificationsError ? (
                  <div className="rounded-xl bg-red-500/10 px-4 py-4 text-sm text-red-300">
                    {notificationsError}
                  </div>
                ) : notifications.length ===
                  0 ? (
                  <div className="px-5 py-10 text-center">
                    <Bell
                      size={30}
                      className="mx-auto text-slate-600"
                    />
                    <p className="mt-3 font-semibold text-slate-300">
                      Nema obavijesti
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map(
                      (
                        notification,
                      ) => {
                        const Icon =
                          getNotificationIcon(
                            notification.kind,
                          )

                        return (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              void handleNotificationClick(
                                notification,
                              )
                            }
                            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition hover:bg-slate-800 ${
                              notification.isRead
                                ? 'border-transparent opacity-60'
                                : 'border-blue-500/10 bg-blue-500/5'
                            }`}
                          >
                            <span
                              className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${getNotificationIconClasses(
                                notification.kind,
                              )}`}
                            >
                              <Icon
                                size={
                                  18
                                }
                              />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2">
                                    <span className="truncate text-sm font-bold text-white">
                                      {
                                        notification.title
                                      }
                                    </span>
                                    {!notification.isRead && (
                                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                    )}
                                  </span>

                                  {(notification.companyName ||
                                    notification.senderName) && (
                                    <span className="mt-1 block truncate text-xs font-semibold text-blue-300">
                                      {notification.companyName ||
                                        'Korisnik'}
                                      {notification.senderName
                                        ? ` · ${notification.senderName}`
                                        : ''}
                                    </span>
                                  )}
                                </span>

                                <span className="shrink-0 text-[10px] text-slate-500">
                                  {formatNotificationDate(
                                    notification.createdAt,
                                  )}
                                </span>
                              </span>

                              <span className="mt-2 block text-xs leading-5 text-slate-400">
                                {
                                  notification.description
                                }
                              </span>

                              {notification.fersysCode && (
                                <span className="mt-2 inline-flex rounded-md bg-slate-800 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-slate-400">
                                  {
                                    notification.fersysCode
                                  }
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      },
                    )}
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
              setIsProfileOpen(
                (value) =>
                  !value,
              )
              setIsQuickMenuOpen(
                false,
              )
              setIsNotificationsOpen(
                false,
              )
              setIsAiOpen(
                false,
              )
            }}
            className={`flex min-w-[235px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
              isProfileOpen
                ? 'border-violet-500/30 bg-violet-500/[0.07]'
                : 'border-transparent hover:border-slate-800 hover:bg-slate-900'
            }`}
          >
            <CompanyLogo
              logoUrl={
                branding?.logoUrl
              }
              companyName={
                branding?.name ||
                'FERSYS tvrtka'
              }
              className="h-11 w-11"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {branding?.name ||
                  displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {displayName} ·{' '}
                {displayRole}
              </p>
            </div>

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-400">
              <ChevronDown
                size={18}
                className={`transition-transform ${
                  isProfileOpen
                    ? 'rotate-180'
                    : ''
                }`}
              />
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-[60px] w-[310px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/50">
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <CompanyLogo
                  logoUrl={
                    branding?.logoUrl
                  }
                  companyName={
                    branding?.name ||
                    'FERSYS tvrtka'
                  }
                  className="h-11 w-11"
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {branding?.name ||
                      'Tvrtka'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {displayName} ·{' '}
                    {displayRole}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-600">
                    {displayEmail ||
                      'E-mail nije dostupan'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(
                    false,
                  )
                  navigate(
                    '/profile',
                  )
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <UserRound
                  size={18}
                />
                Moj profil
              </button>

              {role === 'owner' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(
                      false,
                    )
                    navigate(
                      '/account',
                    )
                  }}
                  className="group my-1 flex w-full items-center gap-3 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-blue-500/10 px-4 py-3 text-left transition hover:border-violet-400/40 hover:from-violet-500/15 hover:to-blue-500/15"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Gift
                      size={
                        18
                      }
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-white">
                      FERSYS Rewards
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      Bodovi, preporuke i nagrade
                    </span>
                  </span>

                  <ChevronDown
                    size={16}
                    className="-rotate-90 text-violet-300"
                  />
                </button>
              )}

              {canManageSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(
                      false,
                    )
                    navigate(
                      '/settings',
                    )
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <Settings
                    size={18}
                  />
                  Postavke tvrtke
                </button>
              )}

              <div className="my-2 h-px bg-slate-800" />

              <button
                type="button"
                disabled={
                  isLoggingOut
                }
                onClick={() =>
                  void handleLogout()
                }
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                <LogOut
                  size={18}
                />
                {isLoggingOut
                  ? 'Odjava...'
                  : 'Odjavi se'}
              </button>
            </div>
          )}
        </div>
      </div>

      {canUseAi && (
        <AIChatPanel
          open={isAiOpen}
          onClose={() =>
            setIsAiOpen(false)
          }
        />
      )}
    </header>
  )
}