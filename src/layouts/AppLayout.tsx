import {
  Bot,
  CalendarDays,
  Gauge,
  LogOut,
  RotateCcw,
  Settings,
  Wrench,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import OnboardingTutorial from '../components/OnboardingTutorial'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { supabase } from '../lib/supabase'
import {
  getOnboardingProgress,
  resetOnboarding,
  type OnboardingProgress,
} from '../services/onboarding.service'

const pageTitles = [
  {
    path: '/dashboard',
    title: 'Dashboard',
  },
  {
    path: '/customers',
    title: 'Kupci',
  },
  {
    path: '/work-orders',
    title: 'Radni nalozi',
  },
  {
    path: '/offers',
    title: 'Ponude',
  },
  {
    path: '/incoming-invoices',
    title: 'Ulazni računi',
  },
  {
    path: '/invoices',
    title: 'Izlazni računi',
  },
  {
    path: '/calendar',
    title: 'Kalendar',
  },
  {
    path: '/inventory',
    title: 'Skladište',
  },
  {
    path: '/settings/employees',
    title: 'Zaposlenici',
  },
  {
    path: '/settings/work-orders',
    title: 'Postavke radnih naloga',
  },
  {
    path: '/settings',
    title: 'Postavke',
  },
  {
    path: '/ai',
    title: 'AI pomoćnik',
  },
]

const mobileNavigation = [
  {
    name: 'Početna',
    path: '/dashboard',
    icon: Gauge,
  },
  {
    name: 'Nalozi',
    path: '/work-orders',
    icon: Wrench,
  },
  {
    name: 'Kalendar',
    path: '/calendar',
    icon: CalendarDays,
  },
  {
    name: 'AI',
    path: '/ai',
    icon: Bot,
  },
]

function getInitials(
  value: string,
) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (
    parts.length === 0
  ) {
    return 'K'
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
          ?.toUpperCase() ??
        '',
    )
    .join('')
}

export default function AppLayout() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const {
    user,
  } = useAuth()

  const profileMenuRef =
    useRef<HTMLDivElement | null>(
      null,
    )

  const [
    onboardingProgress,
    setOnboardingProgress,
  ] =
    useState<OnboardingProgress | null>(
      null,
    )

  const [
    isOnboardingOpen,
    setIsOnboardingOpen,
  ] = useState(false)

  const [
    isProfileMenuOpen,
    setIsProfileMenuOpen,
  ] = useState(false)

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false)

  const [
    isResettingTutorial,
    setIsResettingTutorial,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadOnboarding() {
      if (!user?.id) {
        setOnboardingProgress(
          null,
        )
        setIsOnboardingOpen(
          false,
        )
        return
      }

      try {
        const progress =
          await getOnboardingProgress()

        if (cancelled) {
          return
        }

        setOnboardingProgress(
          progress,
        )

        setIsOnboardingOpen(
          !progress.completed,
        )
      } catch (error) {
        console.error(
          'Onboarding nije moguće učitati:',
          error,
        )
      }
    }

    void loadOnboarding()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    setIsProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent | TouchEvent,
    ) {
      const target =
        event.target

      if (
        target instanceof Node &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          target,
        )
      ) {
        setIsProfileMenuOpen(
          false,
        )
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    )

    document.addEventListener(
      'touchstart',
      handlePointerDown,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      )

      document.removeEventListener(
        'touchstart',
        handlePointerDown,
      )
    }
  }, [])

  const pageTitle =
    useMemo(() => {
      const matchingPage = [
        ...pageTitles,
      ]
        .sort(
          (
            first,
            second,
          ) =>
            second.path.length -
            first.path.length,
        )
        .find((page) =>
          location.pathname.startsWith(
            page.path,
          ),
        )

      return (
        matchingPage?.title ??
        'FERSYS'
      )
    }, [
      location.pathname,
    ])

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
        metadataName ||
        emailName ||
        'Korisnik'
      )
    }, [
      user?.email,
      user?.user_metadata
        ?.full_name,
    ])

  const displayEmail =
    user?.email ?? ''

  const initials =
    getInitials(
      displayName,
    )

  async function handleSignOut() {
    try {
      setIsSigningOut(true)

      const {
        error,
      } =
        await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setIsProfileMenuOpen(
        false,
      )

      navigate('/login', {
        replace: true,
      })
    } catch (error) {
      console.error(
        'Odjava nije uspjela:',
        error,
      )

      window.alert(
        error instanceof Error
          ? error.message
          : 'Odjava trenutno nije moguća.',
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleRestartTutorial() {
    try {
      setIsResettingTutorial(
        true,
      )

      const progress =
        await resetOnboarding()

      setOnboardingProgress(
        progress,
      )

      setIsProfileMenuOpen(
        false,
      )

      setIsOnboardingOpen(
        true,
      )
    } catch (error) {
      console.error(
        'Tutorijal nije moguće ponovno pokrenuti:',
        error,
      )

      window.alert(
        error instanceof Error
          ? error.message
          : 'Tutorijal trenutno nije moguće ponovno pokrenuti.',
      )
    } finally {
      setIsResettingTutorial(
        false,
      )
    }
  }

  return (
    <div className="flex min-h-dvh bg-slate-950 text-white">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden md:block">
          <Topbar />
        </div>

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur md:hidden">
          <div className="w-11" />

          <div className="min-w-0 flex-1 px-3 text-center">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-blue-400">
              FERSYS
            </p>

            <h1 className="truncate text-sm font-extrabold text-white">
              {pageTitle}
            </h1>
          </div>

          <div
            ref={
              profileMenuRef
            }
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setIsProfileMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={`grid h-11 w-11 place-items-center rounded-full text-xs font-black text-white transition ${
                isProfileMenuOpen
                  ? 'bg-blue-500 ring-4 ring-blue-500/15'
                  : 'bg-blue-600 active:scale-95'
              }`}
              title={
                displayName
              }
              aria-label="Otvori korisnički izbornik"
              aria-expanded={
                isProfileMenuOpen
              }
            >
              {initials}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
                <div className="border-b border-slate-800 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {displayName}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {displayEmail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(
                        false,
                      )

                      navigate(
                        '/settings',
                      )
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Settings
                      size={18}
                      className="text-slate-500"
                    />

                    Postavke
                  </button>

                  <button
                    type="button"
                    disabled={
                      isResettingTutorial
                    }
                    onClick={() => {
                      void handleRestartTutorial()
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-50"
                  >
                    <RotateCcw
                      size={18}
                      className="text-blue-400"
                    />

                    {isResettingTutorial
                      ? 'Pokretanje...'
                      : 'Ponovno pokreni tutorijal'}
                  </button>

                  <div className="my-2 border-t border-slate-800" />

                  <button
                    type="button"
                    disabled={
                      isSigningOut
                    }
                    onClick={() => {
                      void handleSignOut()
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    <LogOut
                      size={18}
                    />

                    {isSigningOut
                      ? 'Odjava...'
                      : 'Odjava'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-24 pt-3 sm:px-4 sm:pt-4 md:p-6 md:pb-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobileNavigation.map(
            (item) => {
              const Icon =
                item.icon

              return (
                <NavLink
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className={({
                    isActive,
                  }) =>
                    `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400'
                        : 'text-slate-500 active:bg-slate-900'
                    }`
                  }
                >
                  <Icon
                    size={20}
                  />

                  <span>
                    {
                      item.name
                    }
                  </span>
                </NavLink>
              )
            },
          )}
        </div>
      </nav>

      {isOnboardingOpen &&
        onboardingProgress && (
          <OnboardingTutorial
            displayName={
              displayName
            }
            initialStep={
              onboardingProgress.currentStep
            }
            onClose={() => {
              setIsOnboardingOpen(
                false,
              )
            }}
          />
        )}
    </div>
  )
}