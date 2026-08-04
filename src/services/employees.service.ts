import { supabase } from '../lib/supabase'

export type CompanyRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'worker'
  | 'assistant'
  | 'intern'
  | 'accounting'
  | 'viewer'

export type MemberStatus =
  | 'active'
  | 'inactive'
  | 'blocked'

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'cancelled'
  | 'expired'

export type EmployeePermissions = Record<
  string,
  boolean
>

export type CompanyEmployee = {
  membershipId: string
  userId: string
  fullName: string
  email: string
  phone: string
  avatarUrl: string
  role: CompanyRole
  status: MemberStatus
  permissions: EmployeePermissions
  joinedAt: string
  lastSignInAt: string
  createdAt: string
}

export type CompanyInvitation = {
  id: string
  companyId: string
  email: string
  inviteeName: string
  role: CompanyRole
  token: string
  inviteCode: string
  status: InvitationStatus
  invitedBy: string
  acceptedBy: string
  message: string
  expiresAt: string
  acceptedAt: string
  lastSentAt: string
  createdAt: string
  updatedAt: string
}

export type InvitationPreview = {
  companyName: string
  email: string
  inviteeName: string
  role: CompanyRole
  message: string
  status: InvitationStatus
  expiresAt: string
}

export type CreateInvitationInput = {
  email: string
  name: string
  role: Exclude<CompanyRole, 'owner'>
  message?: string
}

type EmployeeRow = {
  membership_id: string
  user_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: CompanyRole
  status: MemberStatus
  permissions: unknown
  joined_at: string
  last_sign_in_at: string | null
  created_at: string
}

type InvitationRow = {
  id: string
  company_id: string
  email: string
  invitee_name: string | null
  role: CompanyRole
  token: string
  invite_code: string
  status: InvitationStatus
  invited_by: string
  accepted_by: string | null
  message: string | null
  expires_at: string
  accepted_at: string | null
  last_sent_at: string
  created_at: string
  updated_at: string
}

type InvitationPreviewRow = {
  company_name: string
  email: string
  invitee_name: string | null
  role: CompanyRole
  message: string | null
  status: InvitationStatus
  expires_at: string
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function parsePermissions(
  value: unknown,
): EmployeePermissions {
  if (!isObject(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (
        entry,
      ): entry is [string, boolean] =>
        typeof entry[1] === 'boolean',
    ),
  )
}

function formatSupabaseError(
  error: {
    message?: string
    details?: string | null
    hint?: string | null
    code?: string | null
  },
) {
  return [
    error.message
      ? `Greška: ${error.message}`
      : 'Dogodila se nepoznata greška.',
    error.details
      ? `Detalji: ${error.details}`
      : '',
    error.hint
      ? `Savjet: ${error.hint}`
      : '',
    error.code
      ? `Kod: ${error.code}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function mapEmployee(
  row: EmployeeRow,
): CompanyEmployee {
  return {
    membershipId: row.membership_id,
    userId: row.user_id,
    fullName:
      row.full_name?.trim() ||
      'Korisnik bez imena',
    email: row.email ?? '',
    phone: row.phone ?? '',
    avatarUrl: row.avatar_url ?? '',
    role: row.role,
    status: row.status,
    permissions: parsePermissions(
      row.permissions,
    ),
    joinedAt: row.joined_at,
    lastSignInAt:
      row.last_sign_in_at ?? '',
    createdAt: row.created_at,
  }
}

function mapInvitation(
  row: InvitationRow,
): CompanyInvitation {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    inviteeName: row.invitee_name ?? '',
    role: row.role,
    token: row.token,
    inviteCode: row.invite_code,
    status: row.status,
    invitedBy: row.invited_by,
    acceptedBy: row.accepted_by ?? '',
    message: row.message ?? '',
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? '',
    lastSentAt: row.last_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc(
    'current_company_id',
  )

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

export async function getEmployees(): Promise<
  CompanyEmployee[]
> {
  const { data, error } = await supabase.rpc(
    'get_company_employees',
  )

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }

  return ((data ?? []) as EmployeeRow[]).map(
    mapEmployee,
  )
}

export async function getInvitations(): Promise<
  CompanyInvitation[]
> {
  const { data, error } = await supabase.rpc(
    'get_company_invitations',
  )

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }

  return ((data ?? []) as InvitationRow[]).map(
    mapInvitation,
  )
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CompanyInvitation> {
  const normalizedEmail = input.email
    .trim()
    .toLowerCase()

  if (!normalizedEmail) {
    throw new Error(
      'E-mail adresa je obavezna.',
    )
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail,
    )
  ) {
    throw new Error(
      'E-mail adresa nije ispravna.',
    )
  }

  const { data, error } = await supabase.rpc(
    'create_company_invitation',
    {
      requested_email: normalizedEmail,
      requested_name: input.name.trim(),
      requested_role: input.role,
      requested_message:
        input.message?.trim() || null,
    },
  )

  if (error) {
    console.error(
      'create_company_invitation RPC:',
      error,
    )

    throw new Error(
      formatSupabaseError(error),
    )
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  if (!row) {
    throw new Error(
      'Pozivnicu nije moguće izraditi.',
    )
  }

  const invitation = mapInvitation(
    row as InvitationRow,
  )

  const {
    data: emailResult,
    error: emailError,
  } = await supabase.functions.invoke(
    'send-company-invitation',
    {
      body: {
        invitationCode:
          invitation.inviteCode,
      },
    },
  )

  if (emailError) {
    console.error(
      'Slanje pozivnice e-mailom nije uspjelo:',
      emailError,
    )

    throw new Error(
      `Pozivnica je izrađena, ali e-mail nije poslan. ${emailError.message}`,
    )
  }

  if (
    !emailResult ||
    emailResult.success !== true ||
    emailResult.emailSent !== true
  ) {
    console.error(
      'Edge Function nije potvrdila slanje:',
      emailResult,
    )

    throw new Error(
      `Pozivnica je izrađena, ali e-mail nije poslan.${
        emailResult?.error
          ? ` ${emailResult.error}`
          : ''
      }`,
    )
  }

  return invitation
}

export async function getInvitationPreview(
  code: string,
): Promise<InvitationPreview> {
  const cleanCode = code
    .trim()
    .toUpperCase()

  const { data, error } = await supabase.rpc(
    'get_company_invitation_preview',
    {
      requested_code: cleanCode,
    },
  )

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  if (!row) {
    throw new Error(
      'Pozivnica nije pronađena.',
    )
  }

  const preview =
    row as InvitationPreviewRow

  return {
    companyName:
      preview.company_name,
    email: preview.email,
    inviteeName:
      preview.invitee_name ?? '',
    role: preview.role,
    message: preview.message ?? '',
    status: preview.status,
    expiresAt: preview.expires_at,
  }
}

export async function acceptInvitation(
  code: string,
): Promise<string> {
  const cleanCode = code
    .trim()
    .toUpperCase()

  if (!cleanCode) {
    throw new Error(
      'Unesite pozivni kod.',
    )
  }

  const { data, error } = await supabase.rpc(
    'accept_company_invitation',
    {
      requested_code: cleanCode,
    },
  )

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }

  if (!data) {
    throw new Error(
      'Pozivnicu nije moguće prihvatiti.',
    )
  }

  return String(data)
}

export async function updateEmployeeRole(
  membershipId: string,
  role: Exclude<CompanyRole, 'owner'>,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('company_members')
    .update({ role })
    .eq('id', membershipId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }
}

export async function updateEmployeeStatus(
  membershipId: string,
  status: MemberStatus,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('company_members')
    .update({ status })
    .eq('id', membershipId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }
}

export async function updateEmployeePermissions(
  membershipId: string,
  permissions: EmployeePermissions,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('company_members')
    .update({ permissions })
    .eq('id', membershipId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }
}

export async function removeEmployee(
  membershipId: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', membershipId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }
}

export async function cancelInvitation(
  invitationId: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('invitations')
    .update({
      status: 'cancelled',
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }
}

export async function deleteInvitation(
  invitationId: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(
      formatSupabaseError(error),
    )
  }
}

export async function renewInvitation(
  invitation: CompanyInvitation,
): Promise<CompanyInvitation> {
  if (invitation.role === 'owner') {
    throw new Error(
      'Pozivnica vlasnika nije podržana.',
    )
  }

  await cancelInvitation(
    invitation.id,
  )

  return createInvitation({
    email: invitation.email,
    name: invitation.inviteeName,
    role: invitation.role,
    message: invitation.message,
  })
}

export function createInvitationLink(
  invitationCode: string,
): string {
  return `${window.location.origin}/join?code=${encodeURIComponent(
    invitationCode,
  )}`
}

export async function copyInvitationLink(
  invitationCode: string,
): Promise<string> {
  const link = createInvitationLink(
    invitationCode,
  )

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        link,
      )
      return link
    }

    const temporaryInput =
      document.createElement(
        'textarea',
      )

    temporaryInput.value = link
    temporaryInput.setAttribute(
      'readonly',
      '',
    )
    temporaryInput.style.position =
      'fixed'
    temporaryInput.style.left =
      '-9999px'

    document.body.appendChild(
      temporaryInput,
    )

    temporaryInput.select()

    const copied =
      document.execCommand('copy')

    document.body.removeChild(
      temporaryInput,
    )

    if (!copied) {
      throw new Error(
        'Automatsko kopiranje nije podržano.',
      )
    }

    return link
  } catch {
    window.prompt(
      'Kopirajte poveznicu za zaposlenika:',
      link,
    )

    return link
  }
}

export const roleLabels: Record<
  CompanyRole,
  string
> = {
  owner: 'Vlasnik',
  admin: 'Administrator',
  manager: 'Voditelj',
  worker: 'Radnik',
  assistant: 'Pomoćni radnik',
  intern: 'Praktikant',
  accounting: 'Računovodstvo',
  viewer: 'Samo pregled',
}

export const statusLabels: Record<
  MemberStatus,
  string
> = {
  active: 'Aktivan',
  inactive: 'Neaktivan',
  blocked: 'Blokiran',
}
