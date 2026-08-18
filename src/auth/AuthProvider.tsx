import type {
  ReactNode,
} from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  Session,
  User,
} from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import {
  parseEmployeePermissions,
  resolvePermissions,
  type CompanyRole,
  type CurrentMembership,
  type MemberStatus,
  type PermissionKey,
} from './permissions'

type CurrentAccessRow = {
  membership_id: string
  company_id: string
  role: CompanyRole
  status: MemberStatus
  permissions: unknown
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  membership: CurrentMembership | null
  role: CompanyRole | null
  isSuperAdmin: boolean
  isLoading: boolean
  isAccessLoading: boolean
  companySetupError: string
  can: (permission: PermissionKey) => boolean
  signOut: () => Promise<void>
  retryCompanySetup: () => Promise<void>
  refreshAccess: () => Promise<void>
}

type AuthProviderProps = {
  children: ReactNode
}

const SUPER_ADMIN_EMAILS = new Set([
  'fersysapp@gmail.com',
  'bornaferfolja7@gmail.com',
])

const AuthContext =
  createContext<AuthContextValue | null>(null)

async function ensureCompanyForCurrentUser(): Promise<void> {
  const { error } = await supabase.rpc(
    'bootstrap_company_for_current_user',
  )

  if (error) {
    throw error
  }
}

async function getCurrentMembership(): Promise<
  CurrentMembership | null
> {
  const { data, error } = await supabase.rpc(
    'get_current_user_access',
  )

  if (error) {
    throw error
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  if (!row) {
    return null
  }

  const accessRow =
    row as CurrentAccessRow

  return {
    membershipId:
      accessRow.membership_id,
    companyId:
      accessRow.company_id,
    role: accessRow.role,
    status: accessRow.status,
    permissions:
      parseEmployeePermissions(
        accessRow.permissions,
      ),
  }
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null)

  const [membership, setMembership] =
    useState<CurrentMembership | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [
    isAccessLoading,
    setIsAccessLoading,
  ] = useState(false)

  const [
    companySetupError,
    setCompanySetupError,
  ] = useState('')

  const preparedUserIdRef =
    useRef<string | null>(null)

  const refreshAccess =
    useCallback(async (): Promise<void> => {
      if (!session?.user.id) {
        setMembership(null)
        return
      }

      try {
        setIsAccessLoading(true)

        const nextMembership =
          await getCurrentMembership()

        setMembership(nextMembership)
      } finally {
        setIsAccessLoading(false)
      }
    }, [session?.user.id])

  useEffect(() => {
    let isMounted = true

    async function loadInitialSession(): Promise<void> {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        if (error) {
          throw error
        }

        setSession(data.session)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setSession(null)

        setCompanySetupError(
          error instanceof Error
            ? error.message
            : 'Korisnička sesija nije se mogla učitati.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialSession()

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) {
          return
        }

        setSession(nextSession)
        setIsLoading(false)

        if (!nextSession) {
          preparedUserIdRef.current = null
          setMembership(null)
          setCompanySetupError('')
        }
      },
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const currentUserId =
      session?.user.id ?? null

    if (!currentUserId) {
      setMembership(null)
      return
    }

    if (
      preparedUserIdRef.current === currentUserId
    ) {
      void refreshAccess()
      return
    }

    let isCancelled = false

    async function prepareCompany(
      userId: string,
    ): Promise<void> {
      try {
        setCompanySetupError('')
        setIsAccessLoading(true)

        await ensureCompanyForCurrentUser()

        const nextMembership =
          await getCurrentMembership()

        if (!isCancelled) {
          preparedUserIdRef.current = userId
          setMembership(nextMembership)
        }
      } catch (error) {
        if (!isCancelled) {
          setMembership(null)

          setCompanySetupError(
            error instanceof Error
              ? error.message
              : 'Tvrtka se nije mogla pripremiti.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsAccessLoading(false)
        }
      }
    }

    void prepareCompany(currentUserId)

    return () => {
      isCancelled = true
    }
  }, [
    session?.user.id,
    refreshAccess,
  ])

  useEffect(() => {
    const userId =
      session?.user.id

    if (!userId) {
      return
    }

    let timer = 0

    const channel =
      supabase
        .channel(
          `current-access:${userId}`,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'company_members',
            filter:
              `user_id=eq.${userId}`,
          },
          () => {
            window.clearTimeout(
              timer,
            )

            timer =
              window.setTimeout(
                () => {
                  void refreshAccess()
                },
                150,
              )
          },
        )
        .subscribe()

    function refreshOnFocus() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void refreshAccess()
      }
    }

    document.addEventListener(
      'visibilitychange',
      refreshOnFocus,
    )

    return () => {
      window.clearTimeout(
        timer,
      )

      document.removeEventListener(
        'visibilitychange',
        refreshOnFocus,
      )

      void supabase
        .removeChannel(
          channel,
        )
    }
  }, [
    refreshAccess,
    session?.user.id,
  ])

  async function signOut(): Promise<void> {
    const { error } =
      await supabase.auth.signOut()

    if (error) {
      throw error
    }

    preparedUserIdRef.current = null
    setSession(null)
    setMembership(null)
    setCompanySetupError('')
  }

  async function retryCompanySetup(): Promise<void> {
    const currentUserId =
      session?.user.id

    if (!currentUserId) {
      throw new Error(
        'Korisnik nije prijavljen.',
      )
    }

    try {
      setCompanySetupError('')
      setIsAccessLoading(true)

      await ensureCompanyForCurrentUser()

      const nextMembership =
        await getCurrentMembership()

      preparedUserIdRef.current =
        currentUserId

      setMembership(nextMembership)
    } finally {
      setIsAccessLoading(false)
    }
  }

  const resolvedPermissions =
    useMemo(() => {
      if (
        !membership ||
        membership.status !== 'active'
      ) {
        return null
      }

      return resolvePermissions(
        membership.role,
        membership.permissions,
      )
    }, [membership])

  const can =
    useCallback(
      (permission: PermissionKey) =>
        resolvedPermissions?.[permission] ??
        false,
      [resolvedPermissions],
    )

  const isSuperAdmin = useMemo(() => {
    const email =
      session?.user.email
        ?.trim()
        .toLowerCase() ?? ''

    return SUPER_ADMIN_EMAILS.has(email)
  }, [session?.user.email])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      membership,
      role: membership?.role ?? null,
      isSuperAdmin,
      isLoading,
      isAccessLoading,
      companySetupError,
      can,
      signOut,
      retryCompanySetup,
      refreshAccess,
    }),
    [
      session,
      membership,
      isSuperAdmin,
      isLoading,
      isAccessLoading,
      companySetupError,
      can,
      refreshAccess,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth se mora koristiti unutar AuthProvidera.',
    )
  }

  return context
}
