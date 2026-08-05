import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'

export default function AdminGuard({
  children,
}: {
  children: ReactNode
}) {
  const {
    isSuperAdmin,
    isLoading,
    isAccessLoading,
  } = useAuth()

  if (isLoading || isAccessLoading) {
    return (
      <FersysLoader
        fullScreen
        text="Provjera FERSYS administratora..."
      />
    )
  }

  return isSuperAdmin
    ? children
    : (
      <Navigate
        to="/dashboard"
        replace
      />
    )
}