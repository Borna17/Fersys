import { supabase } from '../lib/supabase'

export const REFERRAL_STORAGE_KEY =
  'fersys_referral_code'

export type PortalMonthlyActivity = {
  month_start: string
  month_key: string
  work_orders: number
  offers: number
  invoices: number
}

export type FersysPortal = {
  company: {
    id: string
    name: string
    logo_url: string | null
  }
  subscription: {
    plan_id: 'starter' | 'business' | 'pro'
    status: string
    trial_ends_at: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
  }
  stats: {
    customers: number
    work_orders: number
    offers: number
    invoices: number
  }
  referral: {
    code: string
    points_balance: number
    lifetime_points: number
    total_referrals: number
    converted_referrals: number
  }
  monthly_activity: PortalMonthlyActivity[]
}

export type ReferralRow = {
  referral_id: string
  company_name: string
  status: 'registered' | 'converted' | 'cancelled'
  converted_plan_id: string | null
  points_awarded: number
  registered_at: string
  converted_at: string | null
}

export type RewardTransaction = {
  transaction_id: string
  transaction_type:
    | 'referral_reward'
    | 'redemption'
    | 'refund'
    | 'admin_adjustment'
  points: number
  description: string
  created_at: string
}

export type RewardDefinition = {
  code: string
  name: string
  points: number
  plan: 'starter' | 'business' | 'pro'
  months: number
  highlight?: boolean
}

export const rewards: RewardDefinition[] = [
  {
    code: 'starter_1m',
    name: '1 mjesec Starter',
    points: 150,
    plan: 'starter',
    months: 1,
  },
  {
    code: 'business_1m',
    name: '1 mjesec Business',
    points: 250,
    plan: 'business',
    months: 1,
  },
  {
    code: 'pro_1m',
    name: '1 mjesec FERSYS Pro',
    points: 400,
    plan: 'pro',
    months: 1,
    highlight: true,
  },
  {
    code: 'pro_3m',
    name: '3 mjeseca FERSYS Pro',
    points: 1000,
    plan: 'pro',
    months: 3,
    highlight: true,
  },
]

export const referralPointsByPlan = {
  starter: 30,
  business: 60,
  pro: 100,
} as const

export function saveReferralCode(code: string) {
  const normalized =
    code.trim().toUpperCase()

  if (!normalized) return

  localStorage.setItem(
    REFERRAL_STORAGE_KEY,
    normalized,
  )
}

export function getStoredReferralCode() {
  return (
    localStorage.getItem(
      REFERRAL_STORAGE_KEY,
    ) ?? ''
  )
}

export function clearStoredReferralCode() {
  localStorage.removeItem(
    REFERRAL_STORAGE_KEY,
  )
}

export function getReferralUrl(code: string) {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.fersys.app'

  return `${origin}/r/${encodeURIComponent(
    code,
  )}`
}

export async function claimReferralCode(
  code: string,
) {
  const { data, error } =
    await supabase.rpc(
      'claim_referral_code',
      {
        p_code: code,
      },
    )

  if (error) throw error

  return data as {
    ok: boolean
    reason: string
  }
}

export async function claimStoredReferral() {
  const code =
    getStoredReferralCode()

  if (!code) {
    return null
  }

  const result =
    await claimReferralCode(code)

  clearStoredReferralCode()

  return result
}

export async function getFersysPortal():
Promise<FersysPortal> {
  const { data, error } =
    await supabase.rpc(
      'get_my_fersys_portal',
    )

  if (error) throw error

  return data as FersysPortal
}

export async function getMyReferrals():
Promise<ReferralRow[]> {
  const { data, error } =
    await supabase.rpc(
      'get_my_referrals',
    )

  if (error) throw error

  return (
    data ?? []
  ) as ReferralRow[]
}

export async function getMyRewardTransactions():
Promise<RewardTransaction[]> {
  const { data, error } =
    await supabase.rpc(
      'get_my_reward_transactions',
    )

  if (error) throw error

  return (
    data ?? []
  ) as RewardTransaction[]
}

export async function redeemReward(
  rewardCode: string,
) {
  const { data, error } =
    await supabase.rpc(
      'redeem_referral_reward',
      {
        p_reward_code:
          rewardCode,
      },
    )

  if (error) throw error

  return data as {
    ok: boolean
    redemption_id: string
    reward_name: string
    points_cost: number
    status: 'pending'
  }
}
