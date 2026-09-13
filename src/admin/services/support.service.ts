import { supabase } from '../../lib/supabase'

const SUPPORT_ATTACHMENTS_BUCKET =
  'support-attachments'

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

async function resolveSupportAttachment(
  storedValue: string,
): Promise<string> {
  const value = storedValue.trim()

  if (!value) return ''
  if (isAbsoluteUrl(value)) {
    return value
  }

  const { data, error } =
    await supabase.storage
      .from(
        SUPPORT_ATTACHMENTS_BUCKET,
      )
      .createSignedUrl(
        value,
        60 * 60,
      )

  if (error) {
    console.error(
      'Admin support attachment URL:',
      error,
    )
    return ''
  }

  return data.signedUrl
}

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
  attachmentUrl: string
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

  return Promise.all(
    (data ?? []).map(
      async (
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
        attachmentUrl:
          await resolveSupportAttachment(
            String(
              row.attachment_url ??
                '',
            ),
          ),
        createdAt: String(
          row.created_at ?? '',
        ),
        updatedAt: String(
          row.updated_at ?? '',
        ),
      }),
    ),
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

  return Promise.all(
    (data ?? []).map(
      async (
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
        attachmentUrl:
          await resolveSupportAttachment(
            String(
              row.attachment_url ??
                '',
            ),
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
    ),
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

async function getAdminSupportAttachmentPaths(
  ticketId: string,
): Promise<string[]> {
  const { data, error } =
    await supabase.rpc(
      'admin_get_support_attachment_paths',
      {
        requested_ticket_id:
          ticketId,
      },
    )

  if (error) {
    console.warn(
      'Support attachment paths nisu učitani:',
      error,
    )
    return []
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row: Record<string, unknown>) =>
          String(row.path ?? '').trim(),
        )
        .filter(
          (path: string) =>
            Boolean(path) &&
            !isAbsoluteUrl(path),
        ),
    ),
  )
}

export async function
deleteAdminSupportTicket(
  ticketId: string,
): Promise<void> {
  const attachmentPaths =
    await getAdminSupportAttachmentPaths(
      ticketId,
    )

  const { error } =
    await supabase.rpc(
      'admin_delete_support_ticket',
      {
        requested_ticket_id:
          ticketId,
      },
    )

  if (error) {
    throw error
  }

  if (attachmentPaths.length > 0) {
    const { error: storageError } =
      await supabase.storage
        .from(
          SUPPORT_ATTACHMENTS_BUCKET,
        )
        .remove(attachmentPaths)

    if (storageError) {
      console.warn(
        'Ticket je obrisan, ali stare support slike nisu potpuno očišćene:',
        storageError,
      )
    }
  }
}
