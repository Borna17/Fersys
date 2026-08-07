import { supabase } from '../../lib/supabase'

export type AdminStats = {
  companiesTotal: number
  companiesCreatedThisMonth: number
  subscriptionsActive: number
  subscriptionsTrialing: number
  subscriptionsPastDue: number
  starterCount: number
  businessCount: number
  proCount: number
  estimatedMrrEur: number
  openTickets: number
  urgentTickets: number
}

export type AdminCompany = {
  companyId: string
  companyName: string
  companyOib: string
  companyLogoUrl: string
  ownerEmail: string
  planId:
    | 'starter'
    | 'business'
    | 'pro'
  planName: string
  subscriptionStatus: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  createdAt: string
  usersCount: number
  customersCount: number
  workOrdersCount: number
  offersCount: number
}

export type AdminCompanyUser = {
  id: string
  userId: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  lastActiveAt: string
}

export type AdminCompanyActivity = {
  id: string
  category: string
  title: string
  description: string
  route: string
  actorName: string
  createdAt: string
}

export type AdminCompanyInsights = {
  usersCount: number
  customersCount: number
  workOrdersCount: number
  offersCount: number
  invoicesCount: number
  incomingInvoicesCount: number
  vehiclesCount: number
  vehicleServicesCount: number
  users:
    AdminCompanyUser[]
  activity:
    AdminCompanyActivity[]
  generatedAt: string
}

export async function isPlatformAdmin():
Promise<boolean> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'is_platform_admin',
    )

  if (error) throw error

  return Boolean(data)
}

export async function getAdminStats():
Promise<AdminStats> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_admin_dashboard_stats',
    )

  if (error) throw error

  if (!data?.allowed) {
    throw new Error(
      'Nemate pristup FERSYS administraciji.',
    )
  }

  return {
    companiesTotal:
      Number(
        data.companies_total ??
        0,
      ),
    companiesCreatedThisMonth:
      Number(
        data.companies_created_this_month ??
        0,
      ),
    subscriptionsActive:
      Number(
        data.subscriptions_active ??
        0,
      ),
    subscriptionsTrialing:
      Number(
        data.subscriptions_trialing ??
        0,
      ),
    subscriptionsPastDue:
      Number(
        data.subscriptions_past_due ??
        0,
      ),
    starterCount:
      Number(
        data.starter_count ??
        0,
      ),
    businessCount:
      Number(
        data.business_count ??
        0,
      ),
    proCount:
      Number(
        data.pro_count ??
        0,
      ),
    estimatedMrrEur:
      Number(
        data.estimated_mrr_eur ??
        0,
      ),
    openTickets:
      Number(
        data.open_tickets ??
        0,
      ),
    urgentTickets:
      Number(
        data.urgent_tickets ??
        0,
      ),
  }
}

export async function getAdminCompanies():
Promise<AdminCompany[]> {
  const [
    companiesResult,
    logosResult,
  ] =
    await Promise.all([
      supabase.rpc(
        'get_admin_companies',
      ),
      supabase
        .from('companies')
        .select(
          'id, logo_url',
        ),
    ])

  if (
    companiesResult.error
  ) {
    throw companiesResult.error
  }

  if (logosResult.error) {
    throw logosResult.error
  }

  const logosByCompanyId =
    new Map(
      (
        logosResult.data ??
        []
      ).map((row) => [
        String(row.id),
        String(
          row.logo_url ??
          '',
        ),
      ]),
    )

  return (
    companiesResult.data ??
    []
  ).map(
    (
      row:
        Record<
          string,
          unknown
        >,
    ) => {
      const companyId =
        String(
          row.company_id,
        )

      return {
        companyId,
        companyName:
          String(
            row.company_name ??
            '',
          ),
        companyOib:
          String(
            row.company_oib ??
            '',
          ),
        companyLogoUrl:
          logosByCompanyId.get(
            companyId,
          ) ?? '',
        ownerEmail:
          String(
            row.owner_email ??
            '',
          ),
        planId:
          String(
            row.plan_id ??
            'business',
          ) as AdminCompany['planId'],
        planName:
          String(
            row.plan_name ??
            'Business',
          ),
        subscriptionStatus:
          String(
            row.subscription_status ??
            'trialing',
          ),
        trialEndsAt:
          row.trial_ends_at
            ? String(
                row.trial_ends_at,
              )
            : null,
        currentPeriodEnd:
          row.current_period_end
            ? String(
                row.current_period_end,
              )
            : null,
        createdAt:
          String(
            row.created_at,
          ),
        usersCount:
          Number(
            row.users_count ??
            0,
          ),
        customersCount:
          Number(
            row.customers_count ??
            0,
          ),
        workOrdersCount:
          Number(
            row.work_orders_count ??
            0,
          ),
        offersCount:
          Number(
            row.offers_count ??
            0,
          ),
      }
    },
  )
}

export async function getAdminCompany(
  companyId: string,
) {
  const companies =
    await getAdminCompanies()

  return (
    companies.find(
      (company) =>
        company.companyId ===
        companyId,
    ) ?? null
  )
}

export async function getAdminCompanyInsights(
  companyId: string,
): Promise<AdminCompanyInsights> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'admin_get_company_insights_v2',
      {
        requested_company_id:
          companyId,
      },
    )

  if (error) throw error

  if (!data?.allowed) {
    throw new Error(
      'Nemate pristup detaljima tvrtke.',
    )
  }

  const counts =
    (data.counts ??
      {}) as
      Record<
        string,
        unknown
      >

  return {
    usersCount:
      Number(
        counts.users ?? 0,
      ),
    customersCount:
      Number(
        counts.customers ??
        0,
      ),
    workOrdersCount:
      Number(
        counts.work_orders ??
        0,
      ),
    offersCount:
      Number(
        counts.offers ?? 0,
      ),
    invoicesCount:
      Number(
        counts.invoices ??
        0,
      ),
    incomingInvoicesCount:
      Number(
        counts.incoming_invoices ??
        0,
      ),
    vehiclesCount:
      Number(
        counts.vehicles ??
        0,
      ),
    vehicleServicesCount:
      Number(
        counts.vehicle_services ??
        0,
      ),
    users:
      Array.isArray(
        data.users,
      )
        ? (
            data.users as
              Record<
                string,
                unknown
              >[]
          ).map(
            (user) => ({
              id:
                String(
                  user.id ??
                  '',
                ),
              userId:
                String(
                  user.userId ??
                  '',
                ),
              name:
                String(
                  user.name ??
                  'Korisnik',
                ),
              email:
                String(
                  user.email ??
                  '',
                ),
              role:
                String(
                  user.role ??
                  'Korisnik',
                ),
              status:
                String(
                  user.status ??
                  'Aktivan',
                ),
              createdAt:
                String(
                  user.createdAt ??
                  '',
                ),
              lastActiveAt:
                String(
                  user.lastActiveAt ??
                  '',
                ),
            }),
          )
        : [],
    activity:
      Array.isArray(
        data.activity,
      )
        ? (
            data.activity as
              Record<
                string,
                unknown
              >[]
          ).map(
            (item) => ({
              id:
                String(
                  item.id ??
                  '',
                ),
              category:
                String(
                  item.category ??
                  'system',
                ),
              title:
                String(
                  item.title ??
                  '',
                ),
              description:
                String(
                  item.description ??
                  '',
                ),
              route:
                String(
                  item.route ??
                  '/dashboard',
                ),
              actorName:
                String(
                  item.actorName ??
                  '',
                ),
              createdAt:
                String(
                  item.createdAt ??
                  '',
                ),
            }),
          )
        : [],
    generatedAt:
      String(
        data.generatedAt ??
        '',
      ),
  }
}

export async function updateCompanySubscription(
  input: {
    companyId: string
    planId:
      | 'starter'
      | 'business'
      | 'pro'
    status: string
    trialDays?: number
    note?: string
  },
): Promise<void> {
  const {
    error,
  } =
    await supabase.rpc(
      'admin_update_company_subscription',
      {
        requested_company_id:
          input.companyId,
        requested_plan_id:
          input.planId,
        requested_status:
          input.status,
        requested_trial_days:
          input.trialDays ??
          null,
        requested_note:
          input.note ??
          null,
      },
    )

  if (error) throw error
}
