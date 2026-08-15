import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  Navigate,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import FersysLoader from '../components/FersysLoader'
import {
  isPlatformAdmin,
} from './services/admin.service'

export default function AdminGuard({
  children,
}: {
  children: ReactNode
}) {
  const {
    session,
    isLoading,
    isAccessLoading,
  } = useAuth()

  const [
    isCheckingAdmin,
    setIsCheckingAdmin,
  ] = useState(true)

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      if (!session?.user.id) {
        if (!cancelled) {
          setIsAdmin(false)
          setIsCheckingAdmin(false)
        }

        return
      }

      try {
        setIsCheckingAdmin(true)

        const allowed =
          await isPlatformAdmin()

        if (!cancelled) {
          setIsAdmin(allowed)
        }
      } catch (error) {
        console.error(
          'FERSYS admin provjera nije uspjela:',
          error,
        )

        if (!cancelled) {
          setIsAdmin(false)
        }
      } finally {
        if (!cancelled) {
          setIsCheckingAdmin(false)
        }
      }
    }

    void checkAdmin()

    return () => {
      cancelled = true
    }
  }, [session?.user.id])

  if (
    isLoading ||
    isAccessLoading ||
    isCheckingAdmin
  ) {
    return (
      <FersysLoader
        fullScreen
        text="Provjera FERSYS administratora..."
      />
    )
  }

  return isAdmin
    ? children
    : (
      <Navigate
        to="/dashboard"
        replace
      />
    )
}