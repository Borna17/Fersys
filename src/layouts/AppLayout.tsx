import {
  CalendarDays,
  FileText,
  Gauge,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  UserPlus,
  Users,
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
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import OnboardingTutorial from '../components/OnboardingTutorial'
import Sidebar from '../components/Sidebar'
import TrialBanner from '../components/subscription/TrialBanner'
import Topbar from '../components/Topbar'
import { supabase } from '../lib/supabase'
import {
  getOnboardingProgress,
  resetOnboarding,
  type OnboardingProgress,
} from '../services/onboarding.service'
import { useSubscription } from '../subscription/SubscriptionProvider'
import type { SubscriptionFeature } from '../subscription/plans'

const pageTitles = [
  { path: '/dashboard', title: 'Početna' },
  { path: '/customers', title: 'Kupci' },
  { path: '/work-orders', title: 'Radni nalozi' },
  { path: '/offers', title: 'Ponude' },
  { path: '/incoming-invoices', title: 'Ulazni računi' },
  { path: '/invoices', title: 'Izlazni računi' },
  { path: '/calendar', title: 'Kalendar' },
  { path: '/inventory', title: 'Skladište' },
  { path: '/settings/employees', title: 'Zaposlenici' },
  { path: '/settings/work-orders', title: 'Postavke radnih naloga' },
  { path: '/settings', title: 'Postavke' },
  { path: '/ai', title: 'AI pomoćnik' },
  { path: '/pricing', title: 'Paketi i pretplata' },
]

const mobileNavigation: Array<{
  name: string
  path: string
  icon: typeof Gauge
  feature?: SubscriptionFeature
}> = [
  {
    name: 'Početna',
    path: '/dashboard',
    icon: Gauge,
  },
  {
    name: 'Kupci',
    path: '/customers',
    icon: Users,
    feature: 'customers',
  },
  {
    name: 'Nalozi',
    path: '/work-orders',
    icon: Wrench,
    feature: 'work_orders',
  },
  {
    name: 'Kalendar',
    path: '/calendar',
    icon: CalendarDays,
    feature: 'calendar',
  },
]

const quickActions: Array<{
  title: string
  description: string
  path: string
  icon: typeof Plus
  feature?: SubscriptionFeature
}> = [
  {
    title: 'Novi radni nalog',
    description: 'Dodaj novi posao ili intervenciju',
    path: '/work-orders/new',
    icon: Wrench,
    feature: 'work_orders',
  },
  {
    title: 'Novi kupac',
    description: 'Dodaj osobu ili tvrtku',
    path: '/customers',
    icon: UserPlus,
    feature: 'customers',
  },
  {
    title: 'Nova ponuda',
    description: 'Izradi ponudu za kupca',
    path: '/offers/new',
    icon: FileText,
    feature: 'offers',
  },
  {
    title: 'Novi termin',
    description: 'Otvori kalendar i dodaj termin',
    path: '/calendar',
    icon: CalendarDays,
    feature: 'calendar',
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
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hasFeature } = useSubscription()

  const profileMenuRef =
    useRef<HTMLDivElement | null>(null)

  const [onboardingProgress, setOnboardingProgress] =
    useState<OnboardingProgress | null>(null)
  const [isOnboardingOpen, setIsOnboardingOpen] =
    useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] =
    useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] =
    useState(false)
  const [isSigningOut, setIsSigningOut] =
    useState(false)
  const [isResettingTutorial, setIsResettingTutorial] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadOnboarding() {
      if (!user?.id) {
        setOnboardingProgress(null)
        setIsOnboardingOpen(false)
        return
      }

      try {
        const progress =
          await getOnboardingProgress()

        if (cancelled) {
          return
        }

        setOnboardingProgress(progress)
        setIsOnboardingOpen(!progress.completed)
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
    setIsQuickActionsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent | TouchEvent,
    ) {
      const target = event.target

      if (
        target instanceof Node &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false)
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

  useEffect(() => {
    document.body.style.overflow =
      isQuickActionsOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isQuickActionsOpen])

  const pageTitle = useMemo(() => {
    const matchingPage = [...pageTitles]
      .sort(
        (first, second) =>
          second.path.length - first.path.length,
      )
      .find((page) =>
        location.pathname.startsWith(page.path),
      )

    return matchingPage?.title ?? 'FERSYS'
  }, [location.pathname])

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

    return metadataName || emailName || 'Korisnik'
  }, [
    user?.email,
    user?.user_metadata?.full_name,
  ])

  const displayEmail = user?.email ?? ''
  const initials = getInitials(displayName)

  async function handleSignOut() {
    try {
      setIsSigningOut(true)

      const { error } =
        await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setIsProfileMenuOpen(false)
      navigate('/login', { replace: true })
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
      setIsResettingTutorial(true)

      const progress =
        await resetOnboarding()

      setOnboardingProgress(progress)
      setIsProfileMenuOpen(false)
      setIsOnboardingOpen(true)
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
      setIsResettingTutorial(false)
    }
  }

  function openQuickAction(
    path: string,
    feature?: SubscriptionFeature,
  ) {
    setIsQuickActionsOpen(false)

    if (feature && !hasFeature(feature)) {
      navigate('/pricing')
      return
    }

    navigate(path)
  }

  return (
    <div className="flex min-h-dvh bg-slate-950 text-white">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden md:block">
          <Topbar />
        </div>

        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-4 py-2 backdrop-blur-xl md:hidden">
          <div className="w-11" />

          <div className="min-w-0 flex-1 px-3 text-center">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">
              FERSYS
            </p>

            <h1 className="mt-0.5 truncate text-base font-black text-white">
              {pageTitle}
            </h1>
          </div>

          <div
            ref={profileMenuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setIsProfileMenuOpen(
                  (current) => !current,
                )
              }
              className={`grid h-11 w-11 place-items-center rounded-2xl text-xs font-black text-white transition active:scale-95 ${
                isProfileMenuOpen
                  ? 'bg-blue-500 ring-4 ring-blue-500/15'
                  : 'bg-gradient-to-br from-blue-600 to-violet-600'
              }`}
              title={displayName}
              aria-label="Otvori korisnički izbornik"
              aria-expanded={isProfileMenuOpen}
            >
              {initials}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
                <div className="border-b border-slate-800 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white">
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
                      setIsProfileMenuOpen(false)
                      navigate('/settings')
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
                    disabled={isResettingTutorial}
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
                    disabled={isSigningOut}
                    onClick={() => {
                      void handleSignOut()
                    }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    <LogOut size={18} />

                    {isSigningOut
                      ? 'Odjava...'
                      : 'Odjava'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <TrialBanner />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-28 pt-3 sm:px-4 sm:pt-4 md:p-6 md:pb-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/90 bg-slate-950/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(2,6,23,0.55)] backdrop-blur-xl md:hidden">
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {mobileNavigation
            .slice(0, 2)
            .map((item) => (
              <MobileNavigationItem
                key={item.path}
                item={item}
                hasFeature={hasFeature}
              />
            ))}

          <div className="flex min-h-14 items-end justify-center">
            <button
              type="button"
              onClick={() =>
                setIsQuickActionsOpen(true)
              }
              className="-mt-7 grid h-16 w-16 place-items-center rounded-[1.35rem] border-[5px] border-slate-950 bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 text-white shadow-xl shadow-blue-950/60 transition active:scale-95"
              aria-label="Otvori brze akcije"
            >
              <Plus size={30} strokeWidth={2.8} />
            </button>
          </div>

          {mobileNavigation
            .slice(2)
            .map((item) => (
              <MobileNavigationItem
                key={item.path}
                item={item}
                hasFeature={hasFeature}
              />
            ))}
        </div>
      </nav>

      {isQuickActionsOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setIsQuickActionsOpen(false)
            }
            aria-label="Zatvori brze akcije"
          />

          <section className="relative z-10 w-full rounded-t-[2rem] border-t border-slate-700 bg-slate-900 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                  Brze akcije
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Što želiš dodati?
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsQuickActionsOpen(false)
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-300 active:scale-95"
                aria-label="Zatvori"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                const isLocked =
                  action.feature
                    ? !hasFeature(action.feature)
                    : false

                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() =>
                      openQuickAction(
                        action.path,
                        action.feature,
                      )
                    }
                    className="min-h-32 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left transition active:scale-[0.98] active:border-blue-500/50 active:bg-slate-800"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-400">
                      <Icon size={22} />
                    </div>

                    <p className="mt-4 font-black text-white">
                      {action.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {isLocked
                        ? 'Potrebna je nadogradnja paketa'
                        : action.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {isOnboardingOpen &&
        onboardingProgress && (
          <OnboardingTutorial
            displayName={displayName}
            initialStep={
              onboardingProgress.currentStep
            }
            onClose={() => {
              setIsOnboardingOpen(false)
            }}
          />
        )}
    </div>
  )
}

function MobileNavigationItem({
  item,
  hasFeature,
}: {
  item: (typeof mobileNavigation)[number]
  hasFeature: (
    feature: SubscriptionFeature,
  ) => boolean
}) {
  const Icon = item.icon
  const isLocked = item.feature
    ? !hasFeature(item.feature)
    : false

  return (
    <NavLink
      to={
        isLocked
          ? '/pricing'
          : item.path
      }
      className={({ isActive }) =>
        `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${
          isActive
            ? 'bg-blue-600/15 text-blue-400'
            : 'text-slate-500 active:bg-slate-900'
        }`
      }
    >
      <Icon size={20} />
      <span>{item.name}</span>
    </NavLink>
  )
}