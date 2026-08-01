import type {
  ReactNode,
} from 'react'
import {
  createContext,
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

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  companySetupError: string
  signOut: () => Promise<void>
  retryCompanySetup: () => Promise<void>
}

type AuthProviderProps = {
  children: ReactNode
}

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

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [session, setSession] =
    useState<Session | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [
    companySetupError,
    setCompanySetupError,
  ] = useState('')

  const preparedUserIdRef =
    useRef<string | null>(null)

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
      return
    }

    if (
      preparedUserIdRef.current === currentUserId
    ) {
      return
    }

    let isCancelled = false

    async function prepareCompany(
      userId: string,
    ): Promise<void> {
      try {
        setCompanySetupError('')

        await ensureCompanyForCurrentUser()

        if (!isCancelled) {
          preparedUserIdRef.current = userId
        }
      } catch (error) {
        if (!isCancelled) {
          setCompanySetupError(
            error instanceof Error
              ? error.message
              : 'Tvrtka se nije mogla pripremiti.',
          )
        }
      }
    }

    void prepareCompany(currentUserId)

    return () => {
      isCancelled = true
    }
  }, [session?.user.id])

  async function signOut(): Promise<void> {
    const { error } =
      await supabase.auth.signOut()

    if (error) {
      throw error
    }

    preparedUserIdRef.current = null
    setSession(null)
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

    setCompanySetupError('')

    await ensureCompanyForCurrentUser()

    preparedUserIdRef.current =
      currentUserId
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      companySetupError,
      signOut,
      retryCompanySetup,
    }),
    [
      session,
      isLoading,
      companySetupError,
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