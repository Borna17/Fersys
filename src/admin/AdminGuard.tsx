import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'

const SUPER_ADMIN_EMAILS = new Set([
  'fersysapp@gmail.com',
  'bornaferfolja7@gmail.com',
])

export default function AdminGuard({
  children,
}: {
  children: ReactNode
}) {
  const {
    user,
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

  const email =
    user?.email?.trim().toLowerCase() ?? ''

  const isSuperAdmin =
    SUPER_ADMIN_EMAILS.has(email)

  return isSuperAdmin
    ? children
    : (
      <Navigate
        to="/dashboard"
        replace
      />
    )
}