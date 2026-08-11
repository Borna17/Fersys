import { supabase } from '../../lib/supabase'

export type SupportTicketStatus =
  | 'new'
  | 'open'
  | 'waiting'
  | 'resolved'
  | 'closed'

export type SupportTicketPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'

export type SupportMessage = {
  id: string
  ticketId: string
  senderType: 'user' | 'admin'
  senderName: string
  message: string
  attachmentUrl: string
  createdAt: string
  readByUserAt: string | null
  readByAdminAt: string | null
}

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
  internalNote: string
  createdAt: string
  updatedAt: string
}

function mapDbStatus(
  value: unknown,
): SupportTicketStatus {
  const status = String(
    value ?? 'new',
  )

  if (status === 'in_progress') {
    return 'open'
  }

  if (
    status ===
    'waiting_customer'
  ) {
    return 'waiting'
  }

  if (
    status === 'new' ||
    status === 'open' ||
    status === 'waiting' ||
    status === 'resolved' ||
    status === 'closed'
  ) {
    return status
  }

  return 'new'
}

function mapDbPriority(
  value: unknown,
): SupportTicketPriority {
  const priority = String(
    value ?? 'normal',
  )

  if (
    priority === 'low' ||
    priority === 'normal' ||
    priority === 'high' ||
    priority === 'urgent'
  ) {
    return priority
  }

  return 'normal'
}

export async function getAdminSupportTickets():
Promise<AdminSupportTicket[]> {
  const { data, error } =
    await supabase.rpc(
      'get_admin_support_tickets',
    )

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (
      row:
        Record<string, unknown>,
    ) => ({
      id: String(
        row.id ?? '',
      ),
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
      status:
        mapDbStatus(
          row.status,
        ),
      priority:
        mapDbPriority(
          row.priority,
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

export async function
getAdminSupportMessages(
  ticketId: string,
): Promise<SupportMessage[]> {
  const { data, error } =
    await supabase.rpc(
      'get_admin_support_messages',
      {
        requested_ticket_id:
          ticketId,
      },
    )

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (
      row:
        Record<string, unknown>,
    ) => ({
      id: String(
        row.id ?? '',
      ),
      ticketId: String(
        row.ticket_id ?? '',
      ),
      senderType: String(
        row.sender_type ??
        'user',
      ) as
        | 'user'
        | 'admin',
      senderName: String(
        row.sender_name ?? '',
      ),
      message: String(
        row.message ?? '',
      ),
      attachmentUrl: String(
        row.attachment_url ??
        '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      readByUserAt:
        row.read_by_user_at
          ? String(
              row.read_by_user_at,
            )
          : null,
      readByAdminAt:
        row.read_by_admin_at
          ? String(
              row.read_by_admin_at,
            )
          : null,
    }),
  )
}

export async function
sendAdminSupportMessage(
  ticketId: string,
  message: string,
): Promise<void> {
  const { error } =
    await supabase.rpc(
      'admin_send_support_message',
      {
        requested_ticket_id:
          ticketId,
        requested_message:
          message,
        requested_attachment_url:
          null,
      },
    )

  if (error) {
    throw error
  }
}

export async function
updateAdminSupportTicket(
  input: {
    ticketId: string
    status:
      SupportTicketStatus
    priority:
      SupportTicketPriority
    internalNote?: string
  },
): Promise<void> {
  const { error } =
    await supabase.rpc(
      'admin_update_support_ticket',
      {
        requested_ticket_id:
          input.ticketId,
        requested_status:
          input.status,
        requested_priority:
          input.priority,
        requested_admin_reply:
          null,
        requested_internal_note:
          input.internalNote ??
          null,
      },
    )

  if (error) {
    throw error
  }
}
