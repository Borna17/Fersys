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
  createDefaultCompanyComplianceSettings,
  normalizeCompanyCountryCode,
} from '../services/companyCompliance.service'
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

const AUTH_REQUEST_TIMEOUT_MS = 10_000

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timer = 0
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(`${label} traje predugo. Provjeri internet vezu i pokušaj ponovno.`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    window.clearTimeout(timer)
  }
}

async function ensureCompanyForCurrentUser(): Promise<void> {
  const { error } = await supabase.rpc(
    'bootstrap_company_for_current_user',
  )

  if (error) {
    throw error
  }

  const { data: userData } = await supabase.auth.getUser()
  const metadata = userData.user?.user_metadata ?? {}
  const rawCountryCode = metadata.company_country_code

  // Legacy accounts do not carry registration-country metadata. Leave their
  // existing company settings untouched; current legacy companies are HR.
  if (!rawCountryCode) {
    return
  }

  const countryCode = normalizeCompanyCountryCode(rawCountryCode)
  const countryName =
    typeof metadata.company_country === 'string' && metadata.company_country.trim()
      ? metadata.company_country.trim()
      : countryCode
  const taxId =
    typeof metadata.company_tax_id === 'string'
      ? metadata.company_tax_id.trim()
      : ''

  const { data: companyId, error: companyIdError } = await supabase.rpc(
    'current_company_id',
  )

  if (companyIdError || !companyId) {
    if (companyIdError) throw companyIdError
    return
  }

  const { data: company, error: readError } = await supabase
    .from('companies')
    .select('country, currency, oib, profile_settings')
    .eq('id', String(companyId))
    .single()

  if (readError) {
    throw readError
  }

  const currentProfile =
    company?.profile_settings &&
    typeof company.profile_settings === 'object' &&
    !Array.isArray(company.profile_settings)
      ? company.profile_settings as Record<string, unknown>
      : {}

  // Registration country is applied only when compliance has not yet been
  // initialized, so later owner changes in Settings are never overwritten.
  if (currentProfile.compliance) {
    return
  }

  const defaults = createDefaultCompanyComplianceSettings(countryCode)
  const compliance = {
    ...defaults,
    operatingMode: 'BUSINESS' as const,
  }

  const { error: updateError } = await supabase
    .from('companies')
    .update({
      country: countryName,
      currency: compliance.currency,
      oib: countryCode === 'HR' ? taxId : company?.oib,
      profile_settings: {
        ...currentProfile,
        compliance,
        registration: {
          countryCode,
          countryName,
          taxId,
          taxIdLabel:
            typeof metadata.company_tax_id_label === 'string'
              ? metadata.company_tax_id_label
              : compliance.taxIdLabel,
          configuredAt: new Date().toISOString(),
        },
      },
    })
    .eq('id', String(companyId))

  if (updateError) {
    throw updateError
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

  const accessRow = row as CurrentAccessRow

  return {
    membershipId: accessRow.membership_id,
    companyId: accessRow.company_id,
    role: accessRow.role,
    status: accessRow.status,
    permissions: parseEmployeePermissions(
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

  const [isAccessLoading, setIsAccessLoading] =
    useState(false)

  const [companySetupError, setCompanySetupError] =
    useState('')

  const preparedUserIdRef =
    useRef<string | null>(null)

  const accessInitializedRef =
    useRef(false)

  const refreshAccess =
    useCallback(async (): Promise<void> => {
      if (!session?.user.id) {
        setMembership(null)
        accessInitializedRef.current = false
        return
      }

      const shouldBlock =
        !accessInitializedRef.current

      try {
        if (shouldBlock) {
          setIsAccessLoading(true)
        }

        const nextMembership =
          await withTimeout(
            getCurrentMembership(),
            'Provjera pristupa korisnika',
          )

        if (nextMembership?.companyId) {
          sessionStorage.setItem('fersys_active_company_id', nextMembership.companyId)
        } else {
          sessionStorage.removeItem('fersys_active_company_id')
        }
        setMembership(nextMembership)
        accessInitializedRef.current = true
      } finally {
        if (shouldBlock) {
          setIsAccessLoading(false)
        }
      }
    }, [session?.user.id])

  useEffect(() => {
    let isMounted = true

    async function loadInitialSession(): Promise<void> {
      try {
        const { data, error } =
          await withTimeout(
            supabase.auth.getSession(),
            'Učitavanje korisničke sesije',
          )

        if (!isMounted) return
        if (error) throw error

        setSession(data.session)
      } catch (error) {
        if (!isMounted) return

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
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return

        const previousUserId =
          session?.user.id ?? null
        const nextUserId =
          nextSession?.user.id ?? null

        if (
          previousUserId &&
          nextUserId &&
          previousUserId !== nextUserId
        ) {
          accessInitializedRef.current = false
          preparedUserIdRef.current = null
          setMembership(null)
        }

        setSession(nextSession)
        setIsLoading(false)

        if (!nextSession) {
          preparedUserIdRef.current = null
          accessInitializedRef.current = false
          sessionStorage.removeItem('fersys_active_company_id')
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
      const shouldBlock =
        !accessInitializedRef.current

      try {
        setCompanySetupError('')

        if (shouldBlock) {
          setIsAccessLoading(true)
        }

        // Postojeći korisnik prvo dobiva pristup iz jedne kratke RPC provjere.
        // Teži bootstrap tvrtke više ne blokira svaki ulazak u aplikaciju.
        let nextMembership = await withTimeout(
          getCurrentMembership(),
          'Provjera pristupa korisnika',
        )

        if (!nextMembership) {
          await withTimeout(
            ensureCompanyForCurrentUser(),
            'Priprema tvrtke',
            12_000,
          )
          nextMembership = await withTimeout(
            getCurrentMembership(),
            'Provjera pristupa nakon pripreme tvrtke',
          )
        } else {
          // Jednokratne postavke tvrtke dovrši u pozadini. Ako servis trenutačno
          // nije dostupan, korisniku s valjanim članstvom ne blokiramo aplikaciju.
          void ensureCompanyForCurrentUser().catch((error) => {
            console.warn('Pozadinska priprema tvrtke nije uspjela:', error)
          })
        }

        void supabase.functions
          .invoke('company-registration-notify')
          .catch(() => undefined)

        if (!isCancelled) {
          preparedUserIdRef.current = userId
          accessInitializedRef.current = true
          if (nextMembership?.companyId) {
            sessionStorage.setItem('fersys_active_company_id', nextMembership.companyId)
          } else {
            sessionStorage.removeItem('fersys_active_company_id')
          }
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
        if (!isCancelled && shouldBlock) {
          setIsAccessLoading(false)
        }
      }
    }

    void prepareCompany(currentUserId)

    return () => {
      isCancelled = true
    }
  }, [session?.user.id, refreshAccess])

  useEffect(() => {
    const userId = session?.user.id

    if (!userId) return

    let timer = 0

    const channel = supabase
      .channel(`current-access:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          window.clearTimeout(timer)
          timer = window.setTimeout(() => {
            void refreshAccess()
          }, 150)
        },
      )
      .subscribe()

    let lastFocusRefreshAt = 0

    function refreshOnFocus() {
      if (document.visibilityState !== 'visible') return

      const now = Date.now()
      if (now - lastFocusRefreshAt < 30_000) return
      lastFocusRefreshAt = now
      void refreshAccess()
    }

    document.addEventListener(
      'visibilitychange',
      refreshOnFocus,
    )

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener(
        'visibilitychange',
        refreshOnFocus,
      )
      void supabase.removeChannel(channel)
    }
  }, [refreshAccess, session?.user.id])

  async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    preparedUserIdRef.current = null
    accessInitializedRef.current = false
    sessionStorage.removeItem('fersys_active_company_id')
    setSession(null)
    setMembership(null)
    setCompanySetupError('')
  }

  async function retryCompanySetup(): Promise<void> {
    const currentUserId = session?.user.id

    if (!currentUserId) {
      throw new Error('Korisnik nije prijavljen.')
    }

    try {
      setCompanySetupError('')
      setIsAccessLoading(true)

      await ensureCompanyForCurrentUser()
      void supabase.functions
        .invoke('company-registration-notify')
        .catch(() => undefined)
      const nextMembership =
        await getCurrentMembership()

      preparedUserIdRef.current = currentUserId
      accessInitializedRef.current = true
      if (nextMembership?.companyId) {
        sessionStorage.setItem('fersys_active_company_id', nextMembership.companyId)
      } else {
        sessionStorage.removeItem('fersys_active_company_id')
      }
      setMembership(nextMembership)
    } finally {
      setIsAccessLoading(false)
    }
  }

  const resolvedPermissions = useMemo(() => {
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

  const can = useCallback(
    (permission: PermissionKey) =>
      resolvedPermissions?.[permission] ?? false,
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
