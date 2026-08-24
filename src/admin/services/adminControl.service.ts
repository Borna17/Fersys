import { supabase } from '../../lib/supabase'

export type AdminMemberRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'worker'
  | 'assistant'
  | 'intern'
  | 'accounting'
  | 'viewer'

export type AdminMemberStatus =
  | 'active'
  | 'inactive'
  | 'blocked'

export type AdminControlMember = {
  id: string
  userId: string
  name: string
  email: string
  role: AdminMemberRole
  status: AdminMemberStatus
  createdAt: string
  lastActiveAt: string
}

export type AdminControlInsights = {
  users: AdminControlMember[]
  enabledModules: string[]
  moduleSetupCompleted: boolean
}

export async function getAdminControlInsights(
  companyId: string,
): Promise<AdminControlInsights> {
  const { data, error } = await supabase.rpc(
    'admin_get_company_insights_v2',
    {
      requested_company_id: companyId,
    },
  )

  if (error) throw error

  if (!data?.allowed) {
    throw new Error(
      'Nemate pristup administraciji ove tvrtke.',
    )
  }

  const users = Array.isArray(data.users)
    ? data.users.map(
        (row: Record<string, unknown>) => ({
          id: String(row.id ?? ''),
          userId: String(row.userId ?? ''),
          name: String(row.name ?? 'Korisnik'),
          email: String(row.email ?? ''),
          role: String(
            row.role ?? 'worker',
          ) as AdminMemberRole,
          status: String(
            row.status ?? 'active',
          ) as AdminMemberStatus,
          createdAt: String(row.createdAt ?? ''),
          lastActiveAt: String(
            row.lastActiveAt ?? '',
          ),
        }),
      )
    : []

  return {
    users,
    enabledModules: Array.isArray(
      data.enabledModules,
    )
      ? data.enabledModules.map(String)
      : [],
    moduleSetupCompleted:
      data.moduleSetupCompleted === true,
  }
}

export async function updateAdminCompanyMember(
  input: {
    companyId: string
    membershipId: string
    role: AdminMemberRole
    status: AdminMemberStatus
  },
): Promise<void> {
  const { error } = await supabase.rpc(
    'admin_update_company_member',
    {
      requested_company_id: input.companyId,
      requested_membership_id:
        input.membershipId,
      requested_role: input.role,
      requested_status: input.status,
    },
  )

  if (error) throw error
}

export async function updateAdminCompanyModules(
  companyId: string,
  modules: string[],
): Promise<string[]> {
  const { data, error } = await supabase.rpc(
    'admin_update_company_modules',
    {
      requested_company_id: companyId,
      requested_modules: modules,
    },
  )

  if (error) throw error

  return Array.isArray(data)
    ? data.map(String)
    : modules
}
