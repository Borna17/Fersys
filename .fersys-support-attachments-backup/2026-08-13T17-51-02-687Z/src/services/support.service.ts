import { supabase } from '../lib/supabase'

export type SupportTicketPriority =
  | 'normal'
  | 'high'
  | 'urgent'

export type SupportTicketStatus =
  | 'new'
  | 'open'
  | 'waiting'
  | 'resolved'
  | 'closed'

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

export type MySupportTicket = {
  id: string
  ticketNumber: string
  category: string
  subject: string
  description: string
  priority: SupportTicketPriority
  status: SupportTicketStatus
  module: string
  contactPhone: string
  attachmentUrl: string
  createdAt: string
  updatedAt: string
}

export type CreateSupportTicketInput = {
  category: string
  subject: string
  description: string
  priority: SupportTicketPriority
  module?: string
  contactPhone?: string
  attachmentUrl?: string
}

export async function createSupportTicket(
  input: CreateSupportTicketInput,
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'create_support_ticket',
    {
      requested_category: input.category,
      requested_subject: input.subject,
      requested_description:
        input.description,
      requested_priority: input.priority,
      requested_module:
        input.module || null,
      requested_contact_phone:
        input.contactPhone || null,
      requested_attachment_url:
        input.attachmentUrl || null,
    },
  )

  if (error) {
    throw error
  }

  return String(data ?? '')
}

export async function getMySupportTickets():
Promise<MySupportTicket[]> {
  const { data, error } = await supabase.rpc(
    'get_my_support_tickets',
  )

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      ticketNumber: String(
        row.ticket_number ?? '',
      ),
      category: String(
        row.category ?? '',
      ),
      subject: String(
        row.subject ?? '',
      ),
      description: String(
        row.description ?? '',
      ),
      priority: String(
        row.priority ?? 'normal',
      ) as SupportTicketPriority,
      status: String(
        row.status ?? 'new',
      ) as SupportTicketStatus,
      module: String(row.module ?? ''),
      contactPhone: String(
        row.contact_phone ?? '',
      ),
      attachmentUrl: String(
        row.attachment_url ?? '',
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

export async function getMySupportMessages(
  ticketId: string,
): Promise<SupportMessage[]> {
  const { data, error } = await supabase.rpc(
    'get_my_support_messages',
    {
      requested_ticket_id: ticketId,
    },
  )

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      ticketId: String(
        row.ticket_id ?? '',
      ),
      senderType: String(
        row.sender_type ?? 'user',
      ) as 'user' | 'admin',
      senderName: String(
        row.sender_name ?? '',
      ),
      message: String(
        row.message ?? '',
      ),
      attachmentUrl: String(
        row.attachment_url ?? '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      readByUserAt: row.read_by_user_at
        ? String(row.read_by_user_at)
        : null,
      readByAdminAt: row.read_by_admin_at
        ? String(row.read_by_admin_at)
        : null,
    }),
  )
}

export async function sendMySupportMessage(
  ticketId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase.rpc(
    'send_support_message',
    {
      requested_ticket_id: ticketId,
      requested_message: message,
      requested_attachment_url: null,
    },
  )

  if (error) {
    throw error
  }
}