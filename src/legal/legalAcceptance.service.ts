import { supabase } from '../lib/supabase'
import { LEGAL_VERSION } from './legalConfig'

export async function recordLegalAcceptance() {
  const { error } = await supabase.rpc(
    'record_current_user_legal_acceptance',
    {
      p_legal_version: LEGAL_VERSION,
      p_terms_accepted: true,
      p_privacy_acknowledged: true,
      p_refund_policy_acknowledged: true,
      p_source: 'registration',
      p_user_agent: navigator.userAgent,
    },
  )

  if (error) {
    throw error
  }
}
