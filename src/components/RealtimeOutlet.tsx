import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Outlet,
  useLocation,
} from 'react-router'

import {
  useAuth,
} from '../auth/AuthProvider'
import {
  supabase,
} from '../lib/supabase'
import BusinessAlerts from './BusinessAlerts'
import BusinessFlowActions from './BusinessFlowActions'
import DailyBriefPanel from './DailyBriefPanel'
import FloatingUiGuard from './FloatingUiGuard'
import GlobalSearch from './GlobalSearch'
import MobileUxPolish from './MobileUxPolish'
import OfflineSyncStatus from './OfflineSyncStatus'
import RuntimeHealthGuard from './RuntimeHealthGuard'
import SafeRenderBoundary from './SafeRenderBoundary'
import WorkOrderFieldMode from './WorkOrderFieldMode'

const BLOCKED_REFRESH_PATHS =
  /\/new(?:\/|$)|\/edit(?:\/|$)/

function tablesForPath(
  pathname: string,
): string[] {
  if (
    pathname ===
      '/dashboard' ||
    pathname === '/'
  ) {
    return [
      'customers',
      'work_orders',
      'offers',
      'company_members',
    ]
  }

  if (
    pathname.startsWith(
      '/customers',
    )
  ) {
    return [
      'customers',
    ]
  }

  if (
    pathname.startsWith(
      '/work-orders',
    )
  ) {
    return [
      'work_orders',
    ]
  }

  if (
    pathname.startsWith(
      '/offers',
    )
  ) {
    return [
      'offers',
    ]
  }

  if (
    pathname.startsWith(
      '/invoices',
    )
  ) {
    return [
      'invoices',
    ]
  }

  if (
    pathname.startsWith(
      '/inventory',
    )
  ) {
    return [
      'inventory_items',
      'inventory_movements',
      'delivery_notes',
    ]
  }

  if (
    pathname.startsWith(
      '/calendar',
    )
  ) {
    return [
      'calendar_events',
      'work_orders',
    ]
  }

  return []
}

export default function RealtimeOutlet() {
  const {
    membership,
  } =
    useAuth()

  const location =
    useLocation()

  const [
    version,
    setVersion,
  ] =
    useState(0)

  const timerRef =
    useRef<number | null>(
      null,
    )

  const companyId =
    membership?.companyId ??
    ''

  const canRefresh =
    useMemo(
      () =>
        !BLOCKED_REFRESH_PATHS.test(
          location.pathname,
        ),
      [location.pathname],
    )

  const relevantTables =
    useMemo(
      () =>
        tablesForPath(
          location.pathname,
        ),
      [location.pathname],
    )

  useEffect(() => {
    if (
      !companyId ||
      !canRefresh ||
      relevantTables.length ===
        0
    ) {
      return
    }

    const channel =
      supabase.channel(
        `route-realtime:${companyId}:${location.pathname}`,
      )

    function scheduleRefresh() {
      if (
        document.visibilityState !==
        'visible'
      ) {
        return
      }

      if (
        timerRef.current
      ) {
        window.clearTimeout(
          timerRef.current,
        )
      }

      timerRef.current =
        window.setTimeout(
          () => {
            setVersion(
              (current) =>
                current + 1,
            )
          },
          800,
        )
    }

    relevantTables.forEach(
      (table) => {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          (payload) => {
            const next =
              payload.new as
                | Record<
                    string,
                    unknown
                  >
                | null

            const old =
              payload.old as
                | Record<
                    string,
                    unknown
                  >
                | null

            const eventCompanyId =
              String(
                next
                  ?.company_id ??
                  old
                    ?.company_id ??
                  '',
              )

            if (
              eventCompanyId &&
              eventCompanyId !==
                companyId
            ) {
              return
            }

            scheduleRefresh()
          },
        )
      },
    )

    channel.subscribe()

    return () => {
      if (
        timerRef.current
      ) {
        window.clearTimeout(
          timerRef.current,
        )
      }

      void supabase.removeChannel(
        channel,
      )
    }
  }, [
    canRefresh,
    companyId,
    location.pathname,
    relevantTables,
  ])

  return (
    <>
      <SafeRenderBoundary name="Mobile UX">
        <MobileUxPolish />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Floating UI guard">
        <FloatingUiGuard />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Runtime health">
        <RuntimeHealthGuard />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Global search">
        <GlobalSearch />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Offline sync">
        <OfflineSyncStatus />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Business alerts">
        <BusinessAlerts />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Business flow">
        <BusinessFlowActions />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Field mode">
        <WorkOrderFieldMode />
      </SafeRenderBoundary>

      <SafeRenderBoundary name="Daily brief">
        <DailyBriefPanel />
      </SafeRenderBoundary>

      <SafeRenderBoundary
        name="Main route"
        critical
      >
        <Outlet
          key={`${location.pathname}:${version}`}
        />
      </SafeRenderBoundary>
    </>
  )
}
