import { supabase } from '../../lib/supabase'

export type CompanyRegistrationRequest = {
  companyId: string
  companyName: string
  companyOib: string
  companyCode: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  submittedAt: string
  verificationStatus: 'pending' | 'rejected'
  rejectionReason: string
}

export async function getCompanyRegistrationRequests(): Promise<CompanyRegistrationRequest[]> {
  const { data, error } = await supabase.rpc('admin_get_pending_company_registrations_v1')
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    companyId: String(row.company_id ?? ''),
    companyName: String(row.company_name ?? ''),
    companyOib: String(row.company_oib ?? ''),
    companyCode: String(row.company_code ?? ''),
    ownerId: String(row.owner_id ?? ''),
    ownerName: String(row.owner_name ?? ''),
    ownerEmail: String(row.owner_email ?? ''),
    submittedAt: String(row.submitted_at ?? ''),
    verificationStatus: String(row.verification_status ?? 'pending') as 'pending' | 'rejected',
    rejectionReason: String(row.rejection_reason ?? ''),
  }))
}

export async function approveCompanyRegistration(companyId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_company_registration_v1', { requested_company_id: companyId })
  if (error) throw error
}

export async function rejectCompanyRegistration(companyId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reject_company_registration_v1', {
    requested_company_id: companyId,
    requested_reason: reason.trim() || null,
  })
  if (error) throw error
}
