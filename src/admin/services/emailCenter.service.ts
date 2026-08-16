import {
  supabase,
} from '../../lib/supabase'

export type EmailCenterStats = {
  sentTotal: number
  failedTotal: number
  sentThisMonth: number
  campaignsTotal: number
  recentDeliveries:
    EmailDelivery[]
  recentCampaigns:
    EmailCampaign[]
}

export type EmailDelivery = {
  id: string
  companyId: string
  recipientEmail: string
  recipientName: string
  emailType: string
  subject: string
  status: string
  errorMessage: string
  createdAt: string
  sentAt: string
}

export type EmailCampaign = {
  id: string
  audienceType: string
  subject: string
  campaignType: string
  status: string
  recipientsCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  sentAt: string
}

export type SendCampaignInput = {
  audienceType:
    | 'all'
    | 'starter'
    | 'business'
    | 'pro'
    | 'trialing'
    | 'selected'
  selectedCompanyIds?: string[]
  subject: string
  htmlBody: string
  ctaLabel?: string
  ctaUrl?: string
  campaignType:
    | 'product_update'
    | 'newsletter'
    | 'system'
}

export type CampaignResult = {
  success: boolean
  campaignId: string
  recipients: number
  sent: number
  failed: number
  failures?: Array<{
    email: string
    error: string
  }>
}

export type TestEmailResult = {
  success: boolean
  sent: number
  failed: number
  recipient: string
  providerMessageId:
    string | null
}

export type AutomationResult = {
  success?: boolean
  checked: number
  sent: number
  failed?: number
  skipped?: number
}

function requireNumber(
  value: unknown,
  field: string,
) {
  const number =
    Number(value)

  if (
    !Number.isFinite(
      number,
    )
  ) {
    throw new Error(
      `Email centar nije vratio ispravno polje "${field}".`,
    )
  }

  return number
}

async function invokeEmailCenter<
  T,
>(
  body: Record<
    string,
    unknown
  >,
): Promise<T> {
  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'email-center',
        {
          body,
        },
      )

  if (error) {
    throw error
  }

  if (
    data?.error
  ) {
    throw new Error(
      String(
        data.error,
      ),
    )
  }

  if (!data) {
    throw new Error(
      'Email centar nije vratio odgovor.',
    )
  }

  return data as T
}

export async function getEmailCenterStats():
Promise<EmailCenterStats> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'admin_get_email_center_stats_v1',
    )

  if (error) {
    throw error
  }

  const deliveries =
    Array.isArray(
      data?.recent_deliveries,
    )
      ? data.recent_deliveries
      : []

  const campaigns =
    Array.isArray(
      data?.recent_campaigns,
    )
      ? data.recent_campaigns
      : []

  return {
    sentTotal:
      Number(
        data?.sent_total ??
        0,
      ),
    failedTotal:
      Number(
        data?.failed_total ??
        0,
      ),
    sentThisMonth:
      Number(
        data?.sent_this_month ??
        0,
      ),
    campaignsTotal:
      Number(
        data?.campaigns_total ??
        0,
      ),
    recentDeliveries:
      deliveries.map(
        (
          row:
            Record<
              string,
              unknown
            >,
        ) => ({
          id:
            String(
              row.id ?? '',
            ),
          companyId:
            String(
              row.company_id ??
              '',
            ),
          recipientEmail:
            String(
              row.recipient_email ??
              '',
            ),
          recipientName:
            String(
              row.recipient_name ??
              '',
            ),
          emailType:
            String(
              row.email_type ??
              '',
            ),
          subject:
            String(
              row.subject ??
              '',
            ),
          status:
            String(
              row.status ??
              '',
            ),
          errorMessage:
            String(
              row.error_message ??
              '',
            ),
          createdAt:
            String(
              row.created_at ??
              '',
            ),
          sentAt:
            String(
              row.sent_at ??
              '',
            ),
        }),
      ),
    recentCampaigns:
      campaigns.map(
        (
          row:
            Record<
              string,
              unknown
            >,
        ) => ({
          id:
            String(
              row.id ?? '',
            ),
          audienceType:
            String(
              row.audience_type ??
              '',
            ),
          subject:
            String(
              row.subject ??
              '',
            ),
          campaignType:
            String(
              row.campaign_type ??
              '',
            ),
          status:
            String(
              row.status ??
              '',
            ),
          recipientsCount:
            Number(
              row.recipients_count ??
              0,
            ),
          sentCount:
            Number(
              row.sent_count ??
              0,
            ),
          failedCount:
            Number(
              row.failed_count ??
              0,
            ),
          createdAt:
            String(
              row.created_at ??
              '',
            ),
          sentAt:
            String(
              row.sent_at ??
              '',
            ),
        }),
      ),
  }
}

export async function sendEmailCampaign(
  input:
    SendCampaignInput,
): Promise<CampaignResult> {
  const data =
    await invokeEmailCenter<
      Record<
        string,
        unknown
      >
    >({
      action:
        'send_campaign',
      ...input,
    })

  return {
    success:
      Boolean(
        data.success,
      ),
    campaignId:
      String(
        data.campaignId ??
          '',
      ),
    recipients:
      requireNumber(
        data.recipients,
        'recipients',
      ),
    sent:
      requireNumber(
        data.sent,
        'sent',
      ),
    failed:
      requireNumber(
        data.failed,
        'failed',
      ),
    failures:
      Array.isArray(
        data.failures,
      )
        ? data.failures as Array<{
            email: string
            error: string
          }>
        : [],
  }
}

export async function sendTestEmail(
  testEmail: string,
) {
  const data =
    await invokeEmailCenter<
      Record<
        string,
        unknown
      >
    >({
      action:
        'test_email',
      testEmail,
      subject:
        'FERSYS test e-mail',
      htmlBody:
        '<h2>FERSYS E-mail centar radi ✅</h2><p>Ako vidiš ovu poruku, veza FERSYS → Supabase → Resend → e-mail radi ispravno.</p>',
      ctaLabel:
        'Otvori FERSYS',
      ctaUrl:
        'https://app.fersys.app/dashboard',
    })

  return {
    success:
      Boolean(
        data.success,
      ),
    sent:
      requireNumber(
        data.sent,
        'sent',
      ),
    failed:
      requireNumber(
        data.failed,
        'failed',
      ),
    recipient:
      String(
        data.recipient ??
          testEmail,
      ),
    providerMessageId:
      data.providerMessageId
        ? String(
            data.providerMessageId,
          )
        : null,
  } satisfies TestEmailResult
}

export async function runEmailAutomationsNow():
Promise<AutomationResult> {
  const data =
    await invokeEmailCenter<
      Record<
        string,
        unknown
      >
    >({
      action:
        'process_automations',
    })

  return {
    success:
      Boolean(
        data.success,
      ),
    checked:
      requireNumber(
        data.checked,
        'checked',
      ),
    sent:
      requireNumber(
        data.sent,
        'sent',
      ),
    failed:
      Number(
        data.failed ??
          0,
      ),
    skipped:
      Number(
        data.skipped ??
          0,
      ),
  }
}
