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
) {
  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'email-center',
        {
          body: {
            action:
              'send_campaign',
            ...input,
          },
        },
      )

  if (error) {
    throw error
  }

  if (data?.error) {
    throw new Error(
      String(
        data.error,
      ),
    )
  }

  return data as {
    campaignId: string
    recipients: number
    sent: number
    failed: number
  }
}

export async function runEmailAutomationsNow() {
  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'email-center',
        {
          body: {
            action:
              'process_automations',
          },
        },
      )

  if (error) {
    throw error
  }

  if (data?.error) {
    throw new Error(
      String(
        data.error,
      ),
    )
  }

  return data as {
    checked: number
    sent: number
  }
}
