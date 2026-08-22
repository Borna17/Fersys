import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import BusinessFlowActions from './BusinessFlowActions'

const BLOCKED_REFRESH_PATHS =
  /\/new(?:\/|$)|\/edit(?:\/|$)/

export default function RealtimeOutlet() {
  const { membership } = useAuth()
  const location = useLocation()
  const [version, setVersion] = useState(0)
  const timerRef = useRef<number | null>(null)

  const companyId = membership?.companyId ?? ''

  const canRefresh = useMemo(
    () => !BLOCKED_REFRESH_PATHS.test(location.pathname),
    [location.pathname],
  )

  useEffect(() => {
    if (!companyId) {
      return
    }

    const channel = supabase
      .channel(`company-realtime:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        (payload) => {
          if (!canRefresh) {
            return
          }

          const next = payload.new as
            | Record<string, unknown>
            | null
          const old = payload.old as
            | Record<string, unknown>
            | null

          const eventCompanyId = String(
            next?.company_id ??
              old?.company_id ??
              '',
          )

          if (
            !eventCompanyId ||
            eventCompanyId !== companyId
          ) {
            return
          }

          if (timerRef.current) {
            window.clearTimeout(timerRef.current)
          }

          timerRef.current = window.setTimeout(
            () => {
              setVersion((current) => current + 1)
            },
            500,
          )
        },
      )
      .subscribe()

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      void supabase.removeChannel(channel)
    }
  }, [canRefresh, companyId])

  return (
    <>
      <BusinessFlowActions />

      <Outlet
        key={`${location.pathname}:${version}`}
      />
    </>
  )
}
