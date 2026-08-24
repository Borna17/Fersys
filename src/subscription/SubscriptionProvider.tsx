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

import { useAuth } from '../auth/AuthProvider'
import LimitReachedModal from '../components/subscription/LimitReachedModal'
import {
  getSubscriptionContext,
  SUBSCRIPTION_LIMIT_EVENT,
  type SubscriptionContext,
  type SubscriptionLimitEventDetail,
} from './subscription.service'
import {
  featureRequiredPlan,
  getNextPlan,
  resourceLabels,
  type PlanId,
  type SubscriptionFeature,
  type SubscriptionResource,
} from './plans'

type LimitCheck = {
  allowed: boolean
  current: number
  limit: number
  reason: string
  requiredPlan: PlanId | null
}

type SubscriptionContextValue = {
  subscription: SubscriptionContext | null
  isLoading: boolean
  error: string
  isTrialing: boolean
  trialDaysRemaining: number
  hasFeature: (
    feature: SubscriptionFeature,
  ) => boolean
  getLimit: (
    resource: SubscriptionResource,
  ) => number
  getUsage: (
    resource: SubscriptionResource,
  ) => number
  canCreate: (
    resource: SubscriptionResource,
  ) => LimitCheck
  refreshSubscription: () => Promise<void>
}

const Context =
  createContext<SubscriptionContextValue | null>(null)

function getDaysRemaining(
  dateValue: string | null,
) {
  if (!dateValue) return 0

  const remaining =
    new Date(dateValue).getTime() - Date.now()

  return Math.max(
    0,
    Math.ceil(
      remaining /
        (1000 * 60 * 60 * 24),
    ),
  )
}

function getResourceRequiredPlan(
  resource: SubscriptionResource,
): PlanId {
  if (resource === 'users') {
    return 'business'
  }

  return 'starter'
}

export function SubscriptionProvider({
  children,
}: {
  children: ReactNode
}) {
  const {
    session,
    membership,
    isAccessLoading,
  } = useAuth()

  const [subscription, setSubscription] =
    useState<SubscriptionContext | null>(null)

  /*
   * Početno je true da između auth/access i pretplate nema
   * kratkog prikaza Dashboarda pa ponovnog full-screen loadera.
   * Za neprijavljenog korisnika odmah ga gasimo.
   */
  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [limitModal, setLimitModal] =
    useState<SubscriptionLimitEventDetail | null>(null)

  const initializedCompanyRef =
    useRef<string | null>(null)

  const refreshSubscription =
    useCallback(async () => {
      const companyId =
        membership?.companyId ?? null

      if (!session?.user.id) {
        setSubscription(null)
        initializedCompanyRef.current = null
        setIsLoading(false)
        return
      }

      /*
       * Korisnik je prijavljen, ali access još nije spreman.
       * Zadržavamo isti startup loader umjesto prikaza aplikacije.
       */
      if (!companyId) {
        setSubscription(null)
        return
      }

      const shouldBlock =
        initializedCompanyRef.current !== companyId

      try {
        if (shouldBlock) {
          setIsLoading(true)
        }

        setError('')

        const context =
          await getSubscriptionContext()

        setSubscription(context)
        initializedCompanyRef.current = companyId
      } catch (loadError) {
        if (shouldBlock) {
          setSubscription(null)
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Pretplatu nije moguće učitati.',
        )
      } finally {
        if (shouldBlock) {
          setIsLoading(false)
        }
      }
    }, [
      membership?.companyId,
      session?.user.id,
    ])

  useEffect(() => {
    if (isAccessLoading) return

    void refreshSubscription()
  }, [
    isAccessLoading,
    refreshSubscription,
  ])

  useEffect(() => {
    function handleLimitReached(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<
          SubscriptionLimitEventDetail
        >

      if (!customEvent.detail) return

      setLimitModal(customEvent.detail)
      void refreshSubscription()
    }

    window.addEventListener(
      SUBSCRIPTION_LIMIT_EVENT,
      handleLimitReached,
    )

    return () => {
      window.removeEventListener(
        SUBSCRIPTION_LIMIT_EVENT,
        handleLimitReached,
      )
    }
  }, [refreshSubscription])

  const isTrialing =
    subscription?.status === 'trialing' &&
    subscription.isUsable &&
    Boolean(subscription.trialEndsAt)

  const trialDaysRemaining =
    getDaysRemaining(
      subscription?.trialEndsAt ?? null,
    )

  const hasFeature = useCallback(
    (
      feature: SubscriptionFeature,
    ) =>
      Boolean(
        subscription?.features[feature],
      ),
    [subscription],
  )

  const getLimit = useCallback(
    (
      resource: SubscriptionResource,
    ) =>
      subscription?.limits[resource] ?? 0,
    [subscription],
  )

  const getUsage = useCallback(
    (
      resource: SubscriptionResource,
    ) =>
      subscription?.usage[resource] ?? 0,
    [subscription],
  )

  const canCreate = useCallback(
    (
      resource: SubscriptionResource,
    ): LimitCheck => {
      const current = getUsage(resource)
      const limit = getLimit(resource)

      if (
        !subscription ||
        !subscription.isUsable
      ) {
        return {
          allowed: false,
          current,
          limit,
          reason:
            'Probno razdoblje ili pretplata nisu aktivni.',
          requiredPlan:
            subscription?.planId ?? 'starter',
        }
      }

      const requiredPlan =
        getResourceRequiredPlan(resource)

      if (
        resource === 'users' &&
        !hasFeature('employees')
      ) {
        return {
          allowed: false,
          current,
          limit,
          reason:
            'Zaposlenici su dostupni od Business paketa.',
          requiredPlan: 'business',
        }
      }

      if (
        limit !== -1 &&
        current >= limit
      ) {
        const nextPlan =
          getNextPlan(subscription.planId)

        return {
          allowed: false,
          current,
          limit,
          reason:
            `Dosegnut je limit od ${limit} ${resourceLabels[resource]}.`,
          requiredPlan:
            nextPlan ?? requiredPlan,
        }
      }

      return {
        allowed: true,
        current,
        limit,
        reason: '',
        requiredPlan: null,
      }
    },
    [
      getLimit,
      getUsage,
      hasFeature,
      subscription,
    ],
  )

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      isLoading,
      error,
      isTrialing,
      trialDaysRemaining,
      hasFeature,
      getLimit,
      getUsage,
      canCreate,
      refreshSubscription,
    }),
    [
      subscription,
      isLoading,
      error,
      isTrialing,
      trialDaysRemaining,
      hasFeature,
      getLimit,
      getUsage,
      canCreate,
      refreshSubscription,
    ],
  )

  return (
    <Context.Provider value={value}>
      {children}

      <LimitReachedModal
        isOpen={Boolean(limitModal)}
        onClose={() => setLimitModal(null)}
        title={
          limitModal?.title ??
          'Dosegnut je limit paketa'
        }
        description={
          limitModal?.description ?? ''
        }
        requiredPlan={
          limitModal?.requiredPlan ?? 'business'
        }
        recommendedPlan={
          limitModal?.recommendedPlan ?? 'pro'
        }
        currentPlan={
          limitModal?.currentPlan ??
          subscription?.planId ??
          'starter'
        }
      />
    </Context.Provider>
  )
}

export function useSubscription() {
  const context = useContext(Context)

  if (!context) {
    throw new Error(
      'useSubscription se mora koristiti unutar SubscriptionProvidera.',
    )
  }

  return context
}

export function getRequiredPlanForFeature(
  feature: SubscriptionFeature,
) {
  return featureRequiredPlan[feature]
}
