import { supabase } from '../lib/supabase'
import {
  parseEmployeePermissions,
  resolvePermissions,
  type CompanyRole,
  type MemberStatus,
  type PermissionKey,
} from '../auth/permissions'

type AccessRow = {
  role: CompanyRole
  status: MemberStatus
  permissions: unknown
}

export async function assertPermission(
  permission: PermissionKey,
  message = 'Nemaš dopuštenje za ovu radnju. Vlasnik tvrtke može uključiti ovu ovlast u postavkama zaposlenika.',
): Promise<void> {
  const { data, error } = await supabase.rpc('get_current_user_access')
  if (error) throw error

  const row = (Array.isArray(data) ? data[0] : data) as AccessRow | null
  if (!row || row.status !== 'active') {
    throw new Error('Račun nema aktivan pristup tvrtki.')
  }

  const resolved = resolvePermissions(
    row.role,
    parseEmployeePermissions(row.permissions),
  )

  if (!resolved[permission]) {
    throw new Error(message)
  }
}

export async function assertDeletePermission(
  permission: PermissionKey,
): Promise<void> {
  return assertPermission(
    permission,
    'Nemaš dopuštenje za brisanje ovog zapisa. Vlasnik tvrtke može uključiti ovu ovlast u postavkama zaposlenika.',
  )
}
