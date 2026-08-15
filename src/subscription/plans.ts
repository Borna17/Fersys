export type PlanId =
  | 'starter'
  | 'business'
  | 'pro'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'blocked'

export type BillingPeriod =
  | 'monthly'
  | 'yearly'

export type SubscriptionFeature =
  | 'customers'
  | 'work_orders'
  | 'offers'
  | 'calendar'
  | 'basic_pdf'
  | 'employees'
  | 'permissions'
  | 'invoices'
  | 'incoming_invoices'
  | 'inventory'
  | 'ai'
  | 'advanced_pdf'
  | 'email_sending'
  | 'inventory_costs'
  | 'advanced_finance'
  | 'advanced_ai'
  | 'automations'
  | 'multi_location'
  | 'excel_export'

export type SubscriptionResource =
  | 'users'
  | 'customers'
  | 'work_orders_monthly'
  | 'offers_monthly'

export type PlanDefinition = {
  id: PlanId
  name: string

  price: number
  monthlyPrice: number
  yearlyPrice: number

  description: string
  recommended?: boolean

  limits: Record<
    SubscriptionResource,
    number
  >

  features: Record<
    SubscriptionFeature,
    boolean
  >

  vehicles: boolean

  highlights: string[]
}

const starterFeatures: Record<
  SubscriptionFeature,
  boolean
> = {
  customers: true,
  work_orders: true,
  offers: true,
  calendar: true,
  basic_pdf: true,

  employees: false,
  permissions: false,
  invoices: false,
  incoming_invoices: false,
  inventory: false,
  ai: false,
  advanced_pdf: false,
  email_sending: false,

  inventory_costs: false,
  advanced_finance: false,
  advanced_ai: false,
  automations: false,
  multi_location: false,
  excel_export: false,
}

const businessFeatures: Record<
  SubscriptionFeature,
  boolean
> = {
  customers: true,
  work_orders: true,
  offers: true,
  calendar: true,
  basic_pdf: true,

  employees: true,
  permissions: true,
  invoices: true,
  incoming_invoices: true,
  inventory: true,
  ai: true,
  advanced_pdf: true,
  email_sending: true,

  inventory_costs: false,
  advanced_finance: false,
  advanced_ai: false,
  automations: false,
  multi_location: false,
  excel_export: false,
}

const proFeatures: Record<
  SubscriptionFeature,
  boolean
> = Object.fromEntries(
  Object.keys(
    businessFeatures,
  ).map((key) => [
    key,
    true,
  ]),
) as Record<
  SubscriptionFeature,
  boolean
>

export const TRIAL_DAYS = 7

export const TRIAL_PLAN_ID: PlanId =
  'business'

export const plans: Record<
  PlanId,
  PlanDefinition
> = {
  starter: {
    id: 'starter',
    name: 'Starter',

    price: 15,
    monthlyPrice: 15,
    yearlyPrice: 150,

    description:
      'Za obrtnike i samostalne korisnike koji trebaju osnovne poslovne alate uz jasne mjesečne limite.',

    recommended: false,

    limits: {
      users: 1,
      customers: 10,
      work_orders_monthly: 30,
      offers_monthly: 30,
    },

    features: starterFeatures,

    vehicles: false,

    highlights: [
      '1 korisnik',
      'Do 10 investitora',
      '30 radnih naloga mjesečno',
      '30 ponuda mjesečno',
      'Kalendar',
      'Osnovni PDF dokumenti',
      'Idealno za samostalni rad',
    ],
  },

  business: {
    id: 'business',
    name: 'Business',

    price: 30,
    monthlyPrice: 30,
    yearlyPrice: 300,

    description:
      'Za male i srednje tvrtke kojima trebaju tim, računi, skladište, AI i veći mjesečni kapacitet.',

    recommended: false,

    limits: {
      users: 5,
      customers: 30,
      work_orders_monthly: 60,
      offers_monthly: 60,
    },

    features: businessFeatures,

    vehicles: true,

    highlights: [
      'Do 5 korisnika',
      'Do 30 investitora',
      '60 radnih naloga mjesečno',
      '60 ponuda mjesečno',
      'Računi i ulazni računi',
      'Skladište i vozni park',
      'Zaposlenici i prava pristupa',
      'AI pomoćnik',
      'Napredni PDF dokumenti',
    ],
  },

  pro: {
    id: 'pro',
    name: 'FERSYS Pro',

    price: 50,
    monthlyPrice: 50,
    yearlyPrice: 500,

    description:
      'Za tvrtke koje žele puni FERSYS bez mjesečnih ograničenja i bez razmišljanja o limitima.',

    recommended: true,

    limits: {
      users: -1,
      customers: -1,
      work_orders_monthly: -1,
      offers_monthly: -1,
    },

    features: proFeatures,

    vehicles: true,

    highlights: [
      'Neograničeno korisnika',
      'Neograničeno investitora',
      'Neograničeni radni nalozi',
      'Neograničene ponude',
      'Skladište i vozni park',
      'Sve FERSYS funkcije',
      'Napredna analiza i AI',
      'Automatizacije i Excel',
      'Više lokacija',
      'Prioritetna podrška',
    ],
  },
}

export const planOrder: PlanId[] = [
  'starter',
  'business',
  'pro',
]

export const featureRequiredPlan: Record<
  SubscriptionFeature,
  PlanId
> = {
  customers: 'starter',
  work_orders: 'starter',
  offers: 'starter',
  calendar: 'starter',
  basic_pdf: 'starter',

  employees: 'business',
  permissions: 'business',
  invoices: 'business',
  incoming_invoices: 'business',
  inventory: 'business',
  ai: 'business',
  advanced_pdf: 'business',
  email_sending: 'business',

  inventory_costs: 'pro',
  advanced_finance: 'pro',
  advanced_ai: 'pro',
  automations: 'pro',
  multi_location: 'pro',
  excel_export: 'pro',
}

export const featureLabels: Record<
  SubscriptionFeature,
  string
> = {
  customers: 'Investitori',
  work_orders: 'Radni nalozi',
  offers: 'Ponude',
  calendar: 'Kalendar',
  basic_pdf: 'Osnovni PDF',

  employees: 'Zaposlenici',
  permissions: 'Uloge i prava',
  invoices: 'Izlazni računi',
  incoming_invoices:
    'Ulazni računi',
  inventory: 'Skladište',
  ai: 'AI pomoćnik',
  advanced_pdf: 'Napredni PDF',
  email_sending: 'Slanje e-mailom',

  inventory_costs:
    'Nabavne cijene i vrijednost zalihe',
  advanced_finance:
    'Napredne financije',
  advanced_ai: 'Napredni AI',
  automations: 'Automatizacije',
  multi_location: 'Više lokacija',
  excel_export: 'Excel izvoz',
}

export const resourceLabels: Record<
  SubscriptionResource,
  string
> = {
  users: 'korisnika',
  customers: 'investitora',
  work_orders_monthly:
    'radnih naloga ovaj mjesec',
  offers_monthly:
    'ponuda ovaj mjesec',
}

export function getPlanLabel(
  planId: PlanId,
) {
  return plans[planId].name
}

export function formatPlanLimit(
  limit: number,
) {
  return limit === -1
    ? 'Neograničeno'
    : String(limit)
}

export function getPlanPrice(
  planId: PlanId,
  billingPeriod: BillingPeriod,
) {
  const plan =
    plans[planId]

  return billingPeriod ===
    'yearly'
    ? plan.yearlyPrice
    : plan.monthlyPrice
}

export function getYearlyMonthlyEquivalent(
  planId: PlanId,
) {
  return (
    plans[planId].yearlyPrice /
    12
  )
}

export function getYearlySavings(
  planId: PlanId,
) {
  const plan =
    plans[planId]

  return (
    plan.monthlyPrice * 12 -
    plan.yearlyPrice
  )
}

export function planIncludesVehicles(
  planId: PlanId,
) {
  return plans[planId]
    .vehicles
}

export function getNextPlan(
  planId: PlanId,
): PlanId | null {
  if (planId === 'starter') {
    return 'business'
  }

  if (planId === 'business') {
    return 'pro'
  }

  return null
}

export function getRecommendedUpgradePlan(
  planId: PlanId,
): PlanId | null {
  return planId === 'pro'
    ? null
    : 'pro'
}