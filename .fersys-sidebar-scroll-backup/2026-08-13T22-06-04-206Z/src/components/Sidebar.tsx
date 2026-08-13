import {
  Bot,
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  FileInput,
  FileText,
  Gauge,
  Headphones,
  LockKeyhole,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
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

import fersysIcon from '../assets/fersys-icon.svg'

import CompanyLogo from './CompanyLogo'

import {
  useCompanyBranding,
} from '../services/companyBranding.service'

import {
  useCompanyModules,
} from '../services/companyModules.service'

import {
  useAuth,
} from '../auth/AuthProvider'

import {
  roleLabels,
  type PermissionKey,
} from '../auth/permissions'

import {
  useSubscription,
} from '../subscription/SubscriptionProvider'

import {
  featureRequiredPlan,
  plans,
  type SubscriptionFeature,
} from '../subscription/plans'

const navigationItems: Array<{
  name: string
  path: string
  icon: typeof Gauge
  permission: PermissionKey
  feature?: SubscriptionFeature
}> = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: Gauge,
    permission:
      'dashboard.view',
  },

  {
    name: 'Investitori',
    path: '/customers',
    icon: Users,
    permission:
      'customers.view',
    feature: 'customers',
  },

  {
    name: 'Radni nalozi',
    path: '/work-orders',
    icon: Wrench,
    permission:
      'workOrders.view',
    feature:
      'work_orders',
  },

  {
    name: 'Ponude',
    path: '/offers',
    icon: FileText,
    permission:
      'offers.view',
    feature: 'offers',
  },

  {
    name: 'Izlazni računi',
    path: '/invoices',
    icon: ReceiptText,
    permission:
      'invoices.view',
    feature: 'invoices',
  },

  {
    name: 'Ulazni računi',
    path:
      '/incoming-invoices',
    icon: FileInput,
    permission:
      'incomingInvoices.view',
    feature:
      'incoming_invoices',
  },

  {
    name: 'Kalendar',
    path: '/calendar',
    icon: CalendarDays,
    permission:
      'calendar.view',
    feature: 'calendar',
  },

  {
    name: 'Vozila',
    path: '/vehicles',
    icon: CarFront,
    permission:
      'vehicles.view',
  },

  {
    name: 'Skladište',
    path: '/inventory',
    icon: Package,
    permission:
      'inventory.view',
    feature: 'inventory',
  },

  {
    name: 'Zaposlenici',
    path:
      '/settings/employees',
    icon: UsersRound,
    permission:
      'employees.view',
    feature: 'employees',
  },

  {
    name: 'Podrška',
    path: '/support',
    icon: Headphones,
    permission:
      'dashboard.view',
  },

  {
    name: 'AI pomoćnik',
    path: '/ai',
    icon: Bot,
    permission: 'ai.use',
    feature: 'ai',
  },
]

export default function Sidebar() {
  const location =
    useLocation()

  const {
    branding,
  } = useCompanyBranding()

  const {
    user,
    role,
    can,
    isSuperAdmin,
  } = useAuth()

  const {
    hasFeature,
  } = useSubscription()

  const {
    isPathEnabled,
  } = useCompanyModules()

  const [
    isExpanded,
    setIsExpanded,
  ] = useState(true)

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] = useState(false)

  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow =
      isMobileOpen
        ? 'hidden'
        : ''

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [isMobileOpen])

  const visibleItems =
    useMemo(
      () =>
        navigationItems.filter(
          (item) =>
            can(
              item.permission,
            ) &&
            isPathEnabled(
              item.path,
            ),
        ),
      [
        can,
        isPathEnabled,
      ],
    )

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

  const displayRole =
    role
      ? roleLabels[role]
      : 'Korisnik'

  return (
    <>
      <aside
        className={`relative hidden min-h-dvh shrink-0 self-stretch border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 md:block ${
          isExpanded
            ? 'w-72'
            : 'w-[88px]'
        }`}
      >
        <div className="sticky top-0 flex h-dvh min-h-0 flex-col overflow-hidden">
        <SidebarHeader
          expanded={
            isExpanded
          }
          onCollapse={() =>
            setIsExpanded(
              false,
            )
          }
          onExpand={() =>
            setIsExpanded(
              true,
            )
          }
        />

        <Navigation
          expanded={
            isExpanded
          }
          items={
            visibleItems
          }
          hasFeature={
            hasFeature
          }
        />

        <SidebarFooter
          expanded={
            isExpanded
          }
          showSettings={can(
            'settings.manage',
          )}
          showSuperAdmin={
            isSuperAdmin
          }
          displayName={
            displayName
          }
          displayRole={
            displayRole
          }
          companyName={
            branding?.name ||
            'FERSYS tvrtka'
          }
          companyLogoUrl={
            branding?.logoUrl
          }
        />
        </div>
      </aside>

      {!isMobileOpen && (
        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(
              true,
            )
          }
          className="fixed left-0 top-1/2 z-[70] flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-slate-700 bg-slate-900 text-slate-300 shadow-xl md:hidden"
          aria-label="Otvori izbornik"
        >
          <ChevronRight
            size={18}
          />
        </button>
      )}

      {isMobileOpen && (
        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(
              false,
            )
          }
          className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-[2px] md:hidden"
          aria-label="Zatvori izbornik"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex h-dvh min-h-0 w-[86vw] max-w-[330px] flex-col overflow-hidden border-r border-slate-800 bg-slate-900 text-white shadow-2xl transition-transform duration-200 md:hidden ${
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <Brand expanded />

          <button
            type="button"
            onClick={() =>
              setIsMobileOpen(
                false,
              )
            }
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300"
            aria-label="Zatvori izbornik"
          >
            <X size={20} />
          </button>
        </div>

        <p className="shrink-0 px-5 pb-3 pt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Glavni izbornik
        </p>

        <Navigation
          expanded
          items={
            visibleItems
          }
          hasFeature={
            hasFeature
          }
        />

        <SidebarFooter
          expanded
          showSettings={can(
            'settings.manage',
          )}
          showSuperAdmin={
            isSuperAdmin
          }
          displayName={
            displayName
          }
          displayRole={
            displayRole
          }
          companyName={
            branding?.name ||
            'FERSYS tvrtka'
          }
          companyLogoUrl={
            branding?.logoUrl
          }
        />
      </aside>
    </>
  )
}

function SidebarHeader({
  expanded,
  onCollapse,
  onExpand,
}: {
  expanded: boolean
  onCollapse: () => void
  onExpand: () => void
}) {
  return (
    <>
      <div
        className={`flex h-24 items-center ${
          expanded
            ? 'justify-between px-6'
            : 'justify-center'
        }`}
      >
        <Brand
          expanded={
            expanded
          }
        />

        {expanded && (
          <button
            type="button"
            onClick={
              onCollapse
            }
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Smanji izbornik"
          >
            <ChevronLeft
              size={20}
            />
          </button>
        )}
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={onExpand}
          className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Proširi izbornik"
        >
          <ChevronRight
            size={20}
          />
        </button>
      )}

      {expanded && (
        <p className="px-6 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Glavni izbornik
        </p>
      )}
    </>
  )
}

function Navigation({
  expanded,
  items,
  hasFeature,
}: {
  expanded: boolean
  items:
    typeof navigationItems
  hasFeature: (
    feature:
      SubscriptionFeature,
  ) => boolean
}) {
  return (
    <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-5">
      {items.map(
        (item) => {
          const Icon =
            item.icon

          const isLocked =
            item.feature
              ? !hasFeature(
                  item.feature,
                )
              : false

          const requiredPlan =
            item.feature
              ? plans[
                  featureRequiredPlan[
                    item
                      .feature
                  ]
                ].name
              : ''

          return (
            <NavLink
              key={
                item.path
              }
              to={
                isLocked
                  ? '/pricing'
                  : item.path
              }
              title={
                !expanded
                  ? item.name
                  : undefined
              }
              className={({
                isActive,
              }) =>
                `relative flex h-12 items-center rounded-xl transition ${
                  expanded
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

              {expanded && (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {
                      item.name
                    }
                  </span>

                  {isLocked && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-300"
                      title={`Dostupno u ${requiredPlan}`}
                    >
                      <LockKeyhole
                        size={
                          10
                        }
                      />

                      {
                        requiredPlan
                      }
                    </span>
                  )}
                </>
              )}

              {!expanded &&
                isLocked && (
                  <span className="absolute ml-7 mt-[-24px] grid h-4 w-4 place-items-center rounded-full bg-violet-600 text-white">
                    <LockKeyhole
                      size={9}
                    />
                  </span>
                )}
            </NavLink>
          )
        },
      )}
    </nav>
  )
}

function SidebarFooter({
  expanded,
  showSettings,
  showSuperAdmin,
  displayName,
  displayRole,
  companyName,
  companyLogoUrl,
}: {
  expanded: boolean
  showSettings: boolean
  showSuperAdmin: boolean
  displayName: string
  displayRole: string
  companyName: string
  companyLogoUrl?: string
}) {
  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-3">
      {showSuperAdmin && (
        <NavLink
          to="/admin"
          title={
            !expanded
              ? 'Super Admin'
              : undefined
          }
          className={({
            isActive,
          }) =>
            `mb-3 flex h-12 items-center rounded-xl border transition ${
              expanded
                ? 'gap-3 px-4'
                : 'justify-center'
            } ${
              isActive
                ? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                : 'border-violet-500/20 bg-violet-500/5 text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/10'
            }`
          }
        >
          <ShieldCheck
            size={21}
            className="shrink-0"
          />

          {expanded && (
            <span className="text-sm font-semibold">
              Super Admin
            </span>
          )}
        </NavLink>
      )}

      {showSettings && (
        <NavLink
          to="/settings"
          title={
            !expanded
              ? 'Postavke'
              : undefined
          }
          className={({
            isActive,
          }) =>
            `mb-3 flex h-12 items-center rounded-xl transition ${
              expanded
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

          {expanded && (
            <span className="text-sm font-semibold">
              Postavke
            </span>
          )}
        </NavLink>
      )}

      <UserCard
        expanded={
          expanded
        }
        displayName={
          displayName
        }
        displayRole={
          displayRole
        }
        companyName={
          companyName
        }
        companyLogoUrl={
          companyLogoUrl
        }
      />
    </div>
  )
}

function Brand({
  expanded,
}: {
  expanded: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={fersysIcon}
        alt="FERSYS"
        className="h-11 w-11 shrink-0 object-contain"
      />

      {expanded && (
        <span className="text-2xl font-black tracking-[0.08em] text-slate-50">
          FERSYS
        </span>
      )}
    </div>
  )
}

function UserCard({
  expanded,
  displayName,
  displayRole,
  companyName,
  companyLogoUrl,
}: {
  expanded: boolean
  displayName: string
  displayRole: string
  companyName: string
  companyLogoUrl?: string
}) {
  return (
    <div
      className={`flex items-center rounded-2xl bg-slate-800/70 ${
        expanded
          ? 'gap-3 p-3'
          : 'justify-center p-2'
      }`}
      title={
        !expanded
          ? `${displayName} · ${displayRole}`
          : undefined
      }
    >
      <CompanyLogo
        logoUrl={
          companyLogoUrl
        }
        companyName={
          companyName
        }
        className="h-10 w-10"
      />

      {expanded && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {displayName}
          </p>

          <p className="truncate text-xs text-slate-400">
            {displayRole}
          </p>
        </div>
      )}
    </div>
  )
}