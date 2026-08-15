import { supabase } from '../lib/supabase'
import {
  getNextPlan,
  getRecommendedUpgradePlan,
  plans,
  resourceLabels,
  type PlanId,
  type SubscriptionFeature,
  type SubscriptionResource,
  type SubscriptionStatus,
} from './plans'

export type SubscriptionUsage = Record<
  SubscriptionResource,
  number
>

export type SubscriptionContext = {
  subscriptionId: string
  companyId: string
  planId: PlanId
  planName: string
  monthlyPriceEur: number
  status: SubscriptionStatus
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  isUsable: boolean
  limits: Record<
    SubscriptionResource,
    number
  >
  features: Record<
    SubscriptionFeature,
    boolean
  >
  usage: SubscriptionUsage
}

type SubscriptionRow = {
  subscription_id: string
  company_id: string
  plan_id: PlanId
  plan_name: string
  monthly_price_eur:
    | number
    | string
  status: SubscriptionStatus
  trial_started_at: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  is_usable: boolean
  limits: Record<string, unknown>
  features: Record<string, unknown>
  usage: Record<string, unknown>
}

export type SubscriptionLimitEventDetail = {
  resource: SubscriptionResource
  current: number
  limit: number
  currentPlan: PlanId
  requiredPlan: PlanId
  recommendedPlan: PlanId
  title: string
  description: string
}

export const SUBSCRIPTION_LIMIT_EVENT =
  'fersys:subscription-limit'

function parseNumberRecord<
  Key extends string,
>(
  value: Record<string, unknown>,
): Record<Key, number> {
  return Object.fromEntries(
    Object.entries(value).map(
      ([key, entry]) => [
        key,
        Number(entry) || 0,
      ],
    ),
  ) as Record<Key, number>
}

function emitLimitReached(
  detail: SubscriptionLimitEventDetail,
) {
  if (
    typeof window === 'undefined'
  ) {
    return
  }

  window.dispatchEvent(
    new CustomEvent<
      SubscriptionLimitEventDetail
    >(
      SUBSCRIPTION_LIMIT_EVENT,
      {
        detail,
      },
    ),
  )
}

function buildLimitDetail(
  context: SubscriptionContext,
  resource: SubscriptionResource,
): SubscriptionLimitEventDetail {
  const limit =
    context.limits[resource]

  const current =
    context.usage[resource] ?? 0

  const nextPlan =
    getNextPlan(
      context.planId,
    )

  const recommendedPlan =
    getRecommendedUpgradePlan(
      context.planId,
    ) ?? 'pro'

  return {
    resource,
    current,
    limit,
    currentPlan:
      context.planId,
    requiredPlan:
      nextPlan ??
      recommendedPlan,
    recommendedPlan,
    title:
      'Dosegnut je limit paketa',
    description:
      `Iskoristili ste ${current} od ${limit} ${resourceLabels[resource]}. Za nastavak rada nadogradite paket. FERSYS Pro uklanja ova ograničenja.`,
  }
}

export async function getSubscriptionContext():
Promise<SubscriptionContext> {
  const { data, error } = await supabase.rpc(
    'get_current_subscription_context',
  )

  if (error) {
    throw error
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  if (!row) {
    throw new Error(
      'Pretplata tvrtke nije pronađena.',
    )
  }

  const typedRow =
    row as SubscriptionRow

  const planId =
    typedRow.plan_id

  const localPlan =
    plans[planId] ??
    plans.business

  /*
   * Cijene, funkcije i limiti imaju jedan izvor istine
   * u src/subscription/plans.ts.
   *
   * Supabase i dalje daje status pretplate i stvarnu
   * potrošnju, dok aplikacija koristi aktualnu FERSYS
   * definiciju paketa. Tako promjena paketa odmah vrijedi
   * u cijeloj aplikaciji i ne ostaje stara vrijednost u UI-ju.
   */
  return {
    subscriptionId:
      typedRow.subscription_id,
    companyId:
      typedRow.company_id,
    planId,
    planName:
      localPlan.name,
    monthlyPriceEur:
      localPlan.monthlyPrice,
    status:
      typedRow.status,
    trialStartedAt:
      typedRow.trial_started_at,
    trialEndsAt:
      typedRow.trial_ends_at,
    currentPeriodStart:
      typedRow.current_period_start,
    currentPeriodEnd:
      typedRow.current_period_end,
    cancelAtPeriodEnd:
      typedRow.cancel_at_period_end,
    isUsable:
      typedRow.is_usable,
    limits:
      localPlan.limits,
    features:
      localPlan.features,
    usage:
      parseNumberRecord<
        SubscriptionResource
      >(typedRow.usage ?? {}),
  }
}

export async function assertCanCreate(
  resource: SubscriptionResource,
): Promise<void> {
  /*
   * Prvo provjeravamo aktualne FERSYS limite iz plans.ts.
   * Time Starter/Business limit vrijedi odmah čak i ako je
   * u staroj Supabase konfiguraciji ostala veća vrijednost.
   */
  const context =
    await getSubscriptionContext()

  if (!context.isUsable) {
    throw new Error(
      'Probno razdoblje ili pretplata nisu aktivni.',
    )
  }

  const current =
    context.usage[resource] ?? 0

  const limit =
    context.limits[resource]

  if (
    limit !== -1 &&
    current >= limit
  ) {
    const detail =
      buildLimitDetail(
        context,
        resource,
      )

    emitLimitReached(detail)

    throw new Error(
      detail.description,
    )
  }

  /*
   * Zadržavamo i postojeću serversku provjeru kao dodatnu
   * zaštitu. Kada Supabase katalog bude usklađen s novim
   * paketima, obje provjere će davati isti rezultat.
   */
  const { error } = await supabase.rpc(
    'assert_subscription_can_create',
    {
      requested_resource:
        resource,
    },
  )

  if (error) {
    /*
     * Ako backend zbog vlastitog limita odbije kreiranje,
     * korisniku svejedno prikazujemo profesionalan upgrade
     * modal umjesto samo sirove baze greške.
     */
    const detail =
      buildLimitDetail(
        context,
        resource,
      )

    emitLimitReached(detail)

    throw new Error(
      error.message,
    )
  }
}