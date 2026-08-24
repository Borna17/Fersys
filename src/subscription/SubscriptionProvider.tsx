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
import {
  useLocation,
  useNavigate,
} from 'react-router'

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

const allowedWithoutUsableSubscription = [
  '/pricing',
  '/account',
  '/support',
]

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
  const location = useLocation()
  const navigate = useNavigate()

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

  const isAdminRoute =
    location.pathname.startsWith('/admin')

  const isAllowedRecoveryRoute =
    allowedWithoutUsableSubscription.some(
      (path) =>
        location.pathname.startsWith(path),
    )

  const shouldShowAccessBlock =
    Boolean(
      session &&
      membership &&
      subscription &&
      !subscription.isUsable &&
      !isAdminRoute &&
      !isAllowedRecoveryRoute,
    )

  return (
    <Context.Provider value={value}>
      {shouldShowAccessBlock ? (
        <div className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
          <section className="w-full max-w-xl rounded-[2rem] border border-amber-500/20 bg-slate-900 p-6 shadow-2xl shadow-black/40 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
              FERSYS PRISTUP
            </p>

            <h1 className="mt-3 text-2xl font-black sm:text-3xl">
              Pristup poslovnim podacima trenutačno nije aktivan
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Status računa je{' '}
              <strong className="text-white">
                {subscription?.status ?? 'neaktivan'}
              </strong>.
              Podaci nisu obrisani. Vlasnik računa može provjeriti paket ili kontaktirati FERSYS podršku.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="min-h-12 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-white"
              >
                Moj FERSYS
              </button>

              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white"
              >
                Paketi
              </button>

              <button
                type="button"
                onClick={() => navigate('/support')}
                className="min-h-12 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 text-sm font-black text-violet-200"
              >
                Podrška
              </button>
            </div>
          </section>
        </div>
      ) : (
        children
      )}

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
