
import { supabase } from '../../lib/supabase'

export type SupportTicketStatus =
  | 'new'
  | 'open'
  | 'waiting'
  | 'resolved'
  | 'closed'

export type SupportTicketPriority =
  | 'normal'
  | 'high'
  | 'urgent'

export type AdminSupportTicket = {
  id: string
  companyId: string
  companyName: string
  requesterName: string
  requesterEmail: string
  subject: string
  message: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  adminReply: string
  internalNote: string
  createdAt: string
  updatedAt: string
}

export async function getAdminSupportTickets():
Promise<AdminSupportTicket[]> {
  const { data, error } = await supabase.rpc(
    'get_admin_support_tickets',
  )

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      companyId: String(
        row.company_id ?? '',
      ),
      companyName: String(
        row.company_name ?? '',
      ),
      requesterName: String(
        row.requester_name ?? '',
      ),
      requesterEmail: String(
        row.requester_email ?? '',
      ),
      subject: String(
        row.subject ?? '',
      ),
      message: String(
        row.message ?? '',
      ),
      status: String(
        row.status ?? 'new',
      ) as SupportTicketStatus,
      priority: String(
        row.priority ?? 'normal',
      ) as SupportTicketPriority,
      adminReply: String(
        row.admin_reply ?? '',
      ),
      internalNote: String(
        row.internal_note ?? '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      updatedAt: String(
        row.updated_at ?? '',
      ),
    }),
  )
}

export async function updateAdminSupportTicket(
  input: {
    ticketId: string
    status: SupportTicketStatus
    priority: SupportTicketPriority
    adminReply?: string
    internalNote?: string
  },
): Promise<void> {
  const { error } = await supabase.rpc(
    'admin_update_support_ticket',
    {
      requested_ticket_id:
        input.ticketId,
      requested_status:
        input.status,
      requested_priority:
        input.priority,
      requested_admin_reply:
        input.adminReply ?? null,
      requested_internal_note:
        input.internalNote ?? null,
    },
  )

  if (error) {
    throw error
  }
}