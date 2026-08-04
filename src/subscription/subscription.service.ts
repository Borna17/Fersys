import { supabase } from '../lib/supabase'
import type {
  PlanId,
  SubscriptionFeature,
  SubscriptionResource,
  SubscriptionStatus,
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

function parseBooleanRecord<
  Key extends string,
>(
  value: Record<string, unknown>,
): Record<Key, boolean> {
  return Object.fromEntries(
    Object.entries(value).map(
      ([key, entry]) => [
        key,
        entry === true,
      ],
    ),
  ) as Record<Key, boolean>
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

  return {
    subscriptionId:
      typedRow.subscription_id,
    companyId:
      typedRow.company_id,
    planId:
      typedRow.plan_id,
    planName:
      typedRow.plan_name,
    monthlyPriceEur:
      Number(
        typedRow.monthly_price_eur,
      ) || 0,
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
      parseNumberRecord<
        SubscriptionResource
      >(typedRow.limits ?? {}),
    features:
      parseBooleanRecord<
        SubscriptionFeature
      >(typedRow.features ?? {}),
    usage:
      parseNumberRecord<
        SubscriptionResource
      >(typedRow.usage ?? {}),
  }
}

export async function assertCanCreate(
  resource: SubscriptionResource,
): Promise<void> {
  const { error } = await supabase.rpc(
    'assert_subscription_can_create',
    {
      requested_resource:
        resource,
    },
  )

  if (error) {
    throw new Error(
      error.message,
    )
  }
}
