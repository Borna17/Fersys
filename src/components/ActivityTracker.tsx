import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import { isNativeApp } from '../lib/platform'
import { supabase } from '../lib/supabase'
import { recordActivity } from '../services/activityTracking.service'

function routeLabel(pathname: string) {
  if (pathname.startsWith('/work-orders')) return 'Radni nalozi'
  if (pathname.startsWith('/offers')) return 'Ponude'
  if (pathname.startsWith('/customers')) return 'Investitori'
  if (pathname.startsWith('/invoices')) return 'Izlazni računi'
  if (pathname.startsWith('/incoming-invoices')) return 'Ulazni računi'
  if (pathname.startsWith('/calendar')) return 'Kalendar'
  if (pathname.startsWith('/inventory')) return 'Skladište'
  if (pathname.startsWith('/vehicles')) return 'Vozila'
  if (pathname.startsWith('/settings')) return 'Postavke'
  if (pathname.startsWith('/ai')) return 'AI pomoćnik'
  if (pathname.startsWith('/admin')) return 'Admin'
  if (pathname.startsWith('/dashboard')) return 'Početna'
  return pathname
}

function getSessionKey() {
  const storageKey = 'fersys_activity_session_key'
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing

  const created = crypto.randomUUID()
  sessionStorage.setItem(storageKey, created)
  return created
}

export default function ActivityTracker() {
  const location = useLocation()
  const sessionKeyRef = useRef(getSessionKey())
  const startedRef = useRef(false)
  const routeRef = useRef(location.pathname)

  useEffect(() => {
    let cancelled = false

    async function start() {
      const { data } = await supabase.auth.getSession()
      if (cancelled || !data.session) return

      startedRef.current = true

      await recordActivity({
        sessionKey: sessionKeyRef.current,
        eventType: 'session_start',
        route: routeRef.current,
        label: routeLabel(routeRef.current),
        platform: isNativeApp() ? 'android' : 'web',
        userAgent: navigator.userAgent,
      })
    }

    void start()

    const interval = window.setInterval(() => {
      if (!startedRef.current || document.visibilityState !== 'visible') {
        return
      }

      void recordActivity({
        sessionKey: sessionKeyRef.current,
        eventType: 'heartbeat',
        route: routeRef.current,
        platform: isNativeApp() ? 'android' : 'web',
      })
    }, 60_000)

    function visibilityChanged() {
      if (!startedRef.current) return

      if (document.visibilityState === 'hidden') {
        void recordActivity({
          sessionKey: sessionKeyRef.current,
          eventType: 'session_end',
          route: routeRef.current,
          label: routeLabel(routeRef.current),
          platform: isNativeApp() ? 'android' : 'web',
          endSession: true,
        })
      } else {
        sessionKeyRef.current = crypto.randomUUID()
        sessionStorage.setItem(
          'fersys_activity_session_key',
          sessionKeyRef.current,
        )

        void recordActivity({
          sessionKey: sessionKeyRef.current,
          eventType: 'session_start',
          route: routeRef.current,
          label: routeLabel(routeRef.current),
          platform: isNativeApp() ? 'android' : 'web',
          userAgent: navigator.userAgent,
        })
      }
    }

    document.addEventListener('visibilitychange', visibilityChanged)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', visibilityChanged)
    }
  }, [])

  useEffect(() => {
    routeRef.current = location.pathname

    if (!startedRef.current) return

    void recordActivity({
      sessionKey: sessionKeyRef.current,
      eventType: 'page_view',
      route: location.pathname,
      label: routeLabel(location.pathname),
      platform: isNativeApp() ? 'android' : 'web',
    })
  }, [location.pathname])

  return null
}
