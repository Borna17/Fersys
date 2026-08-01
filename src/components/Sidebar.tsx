import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileInput,
  FileText,
  Gauge,
  Package,
  ReceiptText,
  Settings,
  Users,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  NavLink,
  useLocation,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import {
  getEmployees,
  roleLabels,
  type CompanyEmployee,
} from '../services/employees.service'

const navigationItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: Gauge,
  },
  {
    name: 'Kupci',
    path: '/customers',
    icon: Users,
  },
  {
    name: 'Radni nalozi',
    path: '/work-orders',
    icon: Wrench,
  },
  {
    name: 'Ponude',
    path: '/offers',
    icon: FileText,
  },
  {
    name: 'Izlazni računi',
    path: '/invoices',
    icon: ReceiptText,
  },
  {
    name: 'Ulazni računi',
    path: '/incoming-invoices',
    icon: FileInput,
  },
  {
    name: 'Kalendar',
    path: '/calendar',
    icon: CalendarDays,
  },
  {
    name: 'Skladište',
    path: '/inventory',
    icon: Package,
  },
  {
    name: 'Zaposlenici',
    path: '/settings/employees',
    icon: UsersRound,
  },
  {
    name: 'AI pomoćnik',
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
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  const [isExpanded, setIsExpanded] =
    useState(true)

  const [isMobileOpen, setIsMobileOpen] =
    useState(false)

  const [currentEmployee, setCurrentEmployee] =
    useState<CompanyEmployee | null>(null)

  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

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

  const displayRole = currentEmployee
    ? roleLabels[currentEmployee.role]
    : 'Korisnik'

  const initials = getInitials(displayName)

  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 md:flex ${
          isExpanded ? 'w-72' : 'w-[88px]'
        }`}
      >
        <SidebarContent
          isExpanded={isExpanded}
          onCollapse={() =>
            setIsExpanded(false)
          }
          onExpand={() =>
            setIsExpanded(true)
          }
          displayName={displayName}
          displayRole={displayRole}
          initials={initials}
        />
      </aside>

      {!isMobileOpen && (
        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(true)
          }
          className="fixed left-0 top-1/2 z-[70] flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-slate-700 bg-slate-900 text-slate-300 shadow-xl md:hidden"
          aria-label="Otvori izbornik"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {isMobileOpen && (
        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(false)
          }
          className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-[2px] md:hidden"
          aria-label="Zatvori izbornik"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex w-[86vw] max-w-[330px] flex-col border-r border-slate-800 bg-slate-900 text-white shadow-2xl transition-transform duration-200 md:hidden ${
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <FersysLogo />

            <span className="text-xl font-extrabold tracking-tight">
              FERSYS
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsMobileOpen(false)
            }
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300"
            aria-label="Zatvori izbornik"
          >
            <X size={20} />
          </button>
        </div>

        <p className="px-5 pb-3 pt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Glavni izbornik
        </p>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-5">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex h-12 items-center gap-3 rounded-xl px-4 transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon
                  size={21}
                  className="shrink-0"
                />

                <span className="text-sm font-semibold">
                  {item.name}
                </span>
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `mb-3 flex h-12 items-center gap-3 rounded-xl px-4 transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Settings size={21} />

            <span className="text-sm font-semibold">
              Postavke
            </span>
          </NavLink>

          <UserCard
            expanded
            displayName={displayName}
            displayRole={displayRole}
            initials={initials}
          />
        </div>
      </aside>
    </>
  )
}

function SidebarContent({
  isExpanded,
  onCollapse,
  onExpand,
  displayName,
  displayRole,
  initials,
}: {
  isExpanded: boolean
  onCollapse: () => void
  onExpand: () => void
  displayName: string
  displayRole: string
  initials: string
}) {
  return (
    <>
      <div
        className={`flex h-24 items-center ${
          isExpanded
            ? 'justify-between px-6'
            : 'justify-center'
        }`}
      >
        <div className="flex items-center gap-3">
          <FersysLogo />

          {isExpanded && (
            <span className="text-2xl font-extrabold tracking-tight">
              FERSYS
            </span>
          )}
        </div>

        {isExpanded && (
          <button
            type="button"
            onClick={onCollapse}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Smanji izbornik"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {!isExpanded && (
        <button
          type="button"
          onClick={onExpand}
          className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Proširi izbornik"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {isExpanded && (
        <p className="px-6 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Glavni izbornik
        </p>
      )}

      <nav className="flex-1 space-y-2 overflow-y-auto px-3">
        {navigationItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={
                !isExpanded
                  ? item.name
                  : undefined
              }
              className={({ isActive }) =>
                `flex h-12 items-center rounded-xl transition ${
                  isExpanded
                    ? 'gap-3 px-4'
                    : 'justify-center'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon
                size={21}
                className="shrink-0"
              />

              {isExpanded && (
                <span className="text-sm font-semibold">
                  {item.name}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <NavLink
          to="/settings"
          title={
            !isExpanded
              ? 'Postavke'
              : undefined
          }
          className={({ isActive }) =>
            `mb-3 flex h-12 items-center rounded-xl transition ${
              isExpanded
                ? 'gap-3 px-4'
                : 'justify-center'
            } ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings
            size={21}
            className="shrink-0"
          />

          {isExpanded && (
            <span className="text-sm font-semibold">
              Postavke
            </span>
          )}
        </NavLink>

        <UserCard
          expanded={isExpanded}
          displayName={displayName}
          displayRole={displayRole}
          initials={initials}
        />
      </div>
    </>
  )
}

function FersysLogo() {
  return (
    <div className="relative h-11 w-11 shrink-0">
      <span className="absolute left-0 top-0 h-8 w-8 rounded-lg bg-blue-600" />
      <span className="absolute bottom-0 right-0 h-8 w-8 rounded-lg bg-blue-400" />
    </div>
  )
}

function UserCard({
  expanded,
  displayName,
  displayRole,
  initials,
}: {
  expanded: boolean
  displayName: string
  displayRole: string
  initials: string
}) {
  return (
    <div
      className={`flex items-center rounded-2xl bg-slate-800/70 ${
        expanded
          ? 'gap-3 p-3'
          : 'justify-center p-2'
      }`}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold">
        {initials}
      </div>

      {expanded && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {displayName}
          </p>

          <p className="text-xs text-slate-400">
            {displayRole}
          </p>
        </div>
      )}
    </div>
  )
}