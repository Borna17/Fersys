import { supabase } from '../lib/supabase'
import type { CompanyCountryCode } from './companyCompliance.service'

export type UserCompany = {
  companyId: string
  companyName: string
  role: string
  status: string
  countryCode: CompanyCountryCode
  country: string
  currency: string
  taxId: string
  isActive: boolean
}

type CompanyRow = {
  company_id: string
  company_name: string
  role: string
  status: string
  country_code: CompanyCountryCode
  country: string | null
  currency: string | null
  tax_id: string | null
  is_active: boolean
}

export async function getMyCompanies(): Promise<UserCompany[]> {
  const { data, error } = await supabase.rpc('get_my_companies')

  if (error) throw error

  return ((data ?? []) as CompanyRow[]).map((row) => ({
    companyId: row.company_id,
    companyName: row.company_name,
    role: row.role,
    status: row.status,
    countryCode: row.country_code ?? 'HR',
    country: row.country ?? '',
    currency: row.currency ?? 'EUR',
    taxId: row.tax_id ?? '',
    isActive: Boolean(row.is_active),
  }))
}

export async function setActiveCompany(companyId: string): Promise<void> {
  const { error } = await supabase.rpc('set_active_company', {
    p_company_id: companyId,
  })

  if (error) throw error

  sessionStorage.setItem('fersys_active_company_id', companyId)
}
