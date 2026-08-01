import {
  Bot,
  CalendarDays,
  Gauge,
  Wrench,
} from 'lucide-react'
import {
  useMemo,
} from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

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
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? '',
    )
    .join('')
}

export default function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()

  const pageTitle = useMemo(() => {
    const matchingPage = [
      ...pageTitles,
    ]
      .sort(
        (first, second) =>
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
  }, [location.pathname])

  const displayName = useMemo(() => {
    const metadataName =
      typeof user?.user_metadata
        ?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : ''

    const emailName =
      user?.email
        ?.split('@')[0]
        ?.replace(/[._-]+/g, ' ')
        ?.trim() ?? ''

    return (
      metadataName ||
      emailName ||
      'Korisnik'
    )
  }, [
    user?.email,
    user?.user_metadata?.full_name,
  ])

  const initials =
    getInitials(displayName)

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
            className="grid h-11 w-11 place-items-center rounded-full bg-blue-600 text-xs font-black text-white"
            title={displayName}
          >
            {initials}
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
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
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
                  <Icon size={20} />

                  <span>
                    {item.name}
                  </span>
                </NavLink>
              )
            },
          )}
        </div>
      </nav>
    </div>
  )
}