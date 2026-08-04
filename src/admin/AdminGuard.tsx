import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import { isPlatformAdmin } from './services/admin.service'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true
    void isPlatformAdmin()
      .then((value) => {
        if (active) setAllowed(value)
      })
      .catch(() => {
        if (active) setAllowed(false)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <FersysLoader fullScreen text="Provjera FERSYS administratora..." />
  }

  return allowed ? children : <Navigate to="/dashboard" replace />
}
