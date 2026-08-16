import { supabase } from '../../lib/supabase'

export type AdminRewardAccount = {
  account_id: string
  company_id: string
  company_name: string
  referral_code: string
  points_balance: number
  lifetime_points: number
  referrals_total: number
  referrals_converted: number
}

export type AdminRewardRedemption = {
  id: string
  company_id: string
  company_name: string
  reward_code: string
  reward_name: string
  target_plan_id: string
  reward_months: number
  points_cost: number
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'cancelled'
  admin_note: string | null
  created_at: string
  resolved_at: string | null
}

export type AdminRewardsDashboard = {
  accounts: AdminRewardAccount[]
  redemptions: AdminRewardRedemption[]
  totals: {
    accounts: number
    referrals: number
    converted: number
    points_awarded: number
    pending_redemptions: number
  }
}

export async function getAdminRewardsDashboard():
Promise<AdminRewardsDashboard> {
  const { data, error } =
    await supabase.rpc(
      'get_admin_rewards_dashboard',
    )

  if (error) throw error

  return data as AdminRewardsDashboard
}

export async function resolveRewardRedemption(
  redemptionId: string,
  status: 'approved' | 'rejected',
  note = '',
) {
  const { data, error } =
    await supabase.rpc(
      'admin_resolve_reward_redemption',
      {
        p_redemption_id:
          redemptionId,
        p_status: status,
        p_note: note,
      },
    )

  if (error) throw error

  return data as {
    ok: boolean
    status: 'approved' | 'rejected'
    redemption_id: string
  }
}
