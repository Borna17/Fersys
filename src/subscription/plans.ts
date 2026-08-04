
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

export const plans: Record<
  PlanId,
  PlanDefinition
> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 15,
    description:
      'Za obrtnike koji rade sami.',
    limits: {
      users: 1,
      customers: 10,
      work_orders_monthly: 50,
      offers_monthly: 50,
    },
    features: starterFeatures,
    highlights: [
      '1 korisnik',
      '10 kupaca',
      '50 radnih naloga mjesečno',
      '50 ponuda mjesečno',
      'Kalendar',
      'Osnovni PDF',
    ],
  },

  business: {
    id: 'business',
    name: 'Business',
    price: 25,
    description:
      'Najbolji izbor za male i srednje tvrtke.',
    recommended: true,
    limits: {
      users: 5,
      customers: 250,
      work_orders_monthly: 500,
      offers_monthly: 250,
    },
    features: businessFeatures,
    highlights: [
      'Do 5 korisnika',
      '250 kupaca',
      '500 radnih naloga mjesečno',
      '250 ponuda mjesečno',
      'Računi i skladište',
      'Zaposlenici i AI',
      'Napredni PDF',
    ],
  },

  pro: {
    id: 'pro',
    name: 'FERSYS Pro',
    price: 45,
    description:
      'Sve mogućnosti bez ograničenja.',
    limits: {
      users: -1,
      customers: -1,
      work_orders_monthly: -1,
      offers_monthly: -1,
    },
    features: proFeatures,
    highlights: [
      'Neograničeno korisnika',
      'Neograničeno kupaca',
      'Neograničeni nalozi i ponude',
      'Sve FERSYS funkcije',
      'Napredna analiza i AI',
      'Automatizacije i Excel',
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
  customers: 'Kupci',
  work_orders: 'Radni nalozi',
  offers: 'Ponude',
  calendar: 'Kalendar',
  basic_pdf: 'Osnovni PDF',
  employees: 'Zaposlenici',
  permissions: 'Uloge i prava',
  invoices: 'Izlazni računi',
  incoming_invoices: 'Ulazni računi',
  inventory: 'Skladište',
  ai: 'AI pomoćnik',
  advanced_pdf: 'Napredni PDF',
  email_sending: 'Slanje e-mailom',
  inventory_costs: 'Nabavne cijene i vrijednost zalihe',
  advanced_finance: 'Napredne financije',
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
  customers: 'kupaca',
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
