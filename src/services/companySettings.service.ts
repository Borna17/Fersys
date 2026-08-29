import { supabase } from '../lib/supabase'

export type WorkingDay = {
  enabled: boolean
  from: string
  to: string
}

export type WorkingHours = {
  monday: WorkingDay
  tuesday: WorkingDay
  wednesday: WorkingDay
  thursday: WorkingDay
  friday: WorkingDay
  saturday: WorkingDay
  sunday: WorkingDay
}

export type CompanyProfileSettings = {
  timezone?: string
  language?: string
  dateFormat?: string
  timeFormat?: '12h' | '24h'
}

export type CompanySettings = {
  id: string
  ownerId: string

  name: string
  oib: string
  address: string
  city: string
  postalCode: string
  country: string

  phone: string
  email: string
  website: string

  iban: string
  bankName: string

  logoUrl: string
  stampUrl: string
  signatureUrl: string

  defaultVatRate: number
  currency: string

  primaryColor: string
  secondaryColor: string

  workingHours: WorkingHours

  workOrderPrefix: string
  offerPrefix: string
  invoicePrefix: string
  incomingInvoicePrefix: string

  defaultPaymentDays: number
  defaultOfferValidityDays: number

  documentFooter: string
  documentWatermark: string

  notificationsEnabled: boolean
  emailNotificationsEnabled: boolean

  profileSettings: CompanyProfileSettings

  createdAt: string
  updatedAt: string
}

export type UpdateCompanySettingsInput = {
  name: string
  oib: string
  address: string
  city: string
  postalCode: string
  country: string

  phone: string
  email: string
  website: string

  iban: string
  bankName: string

  logoUrl: string
  stampUrl: string
  signatureUrl: string

  defaultVatRate: number
  currency: string

  primaryColor: string
  secondaryColor: string

  workingHours: WorkingHours

  workOrderPrefix: string
  offerPrefix: string
  invoicePrefix: string
  incomingInvoicePrefix: string

  defaultPaymentDays: number
  defaultOfferValidityDays: number

  documentFooter: string
  documentWatermark: string

  notificationsEnabled: boolean
  emailNotificationsEnabled: boolean

  profileSettings: CompanyProfileSettings
}

type CompanyRow = {
  id: string
  owner_id: string

  name: string
  oib: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null

  phone: string | null
  email: string | null
  website: string | null

  iban: string | null
  bank_name: string | null

  logo_url: string | null
  stamp_url: string | null
  signature_url: string | null

  default_vat_rate: number | string | null
  currency: string | null

  primary_color: string | null
  secondary_color: string | null

  working_hours: unknown

  work_order_prefix: string | null
  offer_prefix: string | null
  invoice_prefix: string | null
  incoming_invoice_prefix: string | null

  default_payment_days: number | null
  default_offer_validity_days: number | null

  document_footer: string | null
  document_watermark: string | null

  notifications_enabled: boolean | null
  email_notifications_enabled: boolean | null

  profile_settings: unknown

  created_at: string
  updated_at: string
}

const defaultWorkingHours: WorkingHours = {
  monday: {
    enabled: true,
    from: '07:00',
    to: '15:00',
  },
  tuesday: {
    enabled: true,
    from: '07:00',
    to: '15:00',
  },
  wednesday: {
    enabled: true,
    from: '07:00',
    to: '15:00',
  },
  thursday: {
    enabled: true,
    from: '07:00',
    to: '15:00',
  },
  friday: {
    enabled: true,
    from: '07:00',
    to: '15:00',
  },
  saturday: {
    enabled: false,
    from: '08:00',
    to: '12:00',
  },
  sunday: {
    enabled: false,
    from: '08:00',
    to: '12:00',
  },
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

function parseWorkingDay(
  value: unknown,
  fallback: WorkingDay,
): WorkingDay {
  if (!isObject(value)) {
    return fallback
  }

  return {
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : fallback.enabled,

    from:
      typeof value.from === 'string'
        ? value.from
        : fallback.from,

    to:
      typeof value.to === 'string'
        ? value.to
        : fallback.to,
  }
}

function parseWorkingHours(
  value: unknown,
): WorkingHours {
  if (!isObject(value)) {
    return defaultWorkingHours
  }

  return {
    monday: parseWorkingDay(
      value.monday,
      defaultWorkingHours.monday,
    ),

    tuesday: parseWorkingDay(
      value.tuesday,
      defaultWorkingHours.tuesday,
    ),

    wednesday: parseWorkingDay(
      value.wednesday,
      defaultWorkingHours.wednesday,
    ),

    thursday: parseWorkingDay(
      value.thursday,
      defaultWorkingHours.thursday,
    ),

    friday: parseWorkingDay(
      value.friday,
      defaultWorkingHours.friday,
    ),

    saturday: parseWorkingDay(
      value.saturday,
      defaultWorkingHours.saturday,
    ),

    sunday: parseWorkingDay(
      value.sunday,
      defaultWorkingHours.sunday,
    ),
  }
}

function parseProfileSettings(
  value: unknown,
): CompanyProfileSettings {
  if (!isObject(value)) {
    return {}
  }

  return {
    timezone:
      typeof value.timezone === 'string'
        ? value.timezone
        : undefined,

    language:
      typeof value.language === 'string'
        ? value.language
        : undefined,

    dateFormat:
      typeof value.dateFormat === 'string'
        ? value.dateFormat
        : undefined,

    timeFormat:
      value.timeFormat === '12h' ||
      value.timeFormat === '24h'
        ? value.timeFormat
        : undefined,
  }
}

function mapCompany(
  row: CompanyRow,
): CompanySettings {
  return {
    id: row.id,
    ownerId: row.owner_id,

    name: row.name,
    oib: row.oib ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    postalCode: row.postal_code ?? '',
    country: row.country ?? 'Hrvatska',

    phone: row.phone ?? '',
    email: row.email ?? '',
    website: row.website ?? '',

    iban: row.iban ?? '',
    bankName: row.bank_name ?? '',

    logoUrl: row.logo_url ?? '',
    stampUrl: row.stamp_url ?? '',
    signatureUrl: row.signature_url ?? '',

    defaultVatRate:
      Number(row.default_vat_rate) || 0,

    currency: row.currency ?? 'EUR',

    primaryColor:
      row.primary_color ?? '#2563EB',

    secondaryColor:
      row.secondary_color ?? '#0F172A',

    workingHours: parseWorkingHours(
      row.working_hours,
    ),

    workOrderPrefix:
      row.work_order_prefix ?? 'RN',

    offerPrefix:
      row.offer_prefix ?? 'P',

    invoicePrefix:
      row.invoice_prefix ?? 'R',

    incomingInvoicePrefix:
      row.incoming_invoice_prefix ?? 'UR',

    defaultPaymentDays:
      Number(row.default_payment_days) || 0,

    defaultOfferValidityDays:
      Number(
        row.default_offer_validity_days,
      ) || 15,

    documentFooter:
      row.document_footer ??
      'Hvala na povjerenju.',

    documentWatermark:
      row.document_watermark ?? '',

    notificationsEnabled:
      row.notifications_enabled ?? true,

    emailNotificationsEnabled:
      row.email_notifications_enabled ??
      true,

    profileSettings:
      parseProfileSettings(
        row.profile_settings,
      ),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCurrentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc(
    'current_company_id',
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

function cleanPrefix(
  value: string,
  fallback: string,
) {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[^A-ZČĆŽŠĐ0-9-]/g, '')
    .slice(0, 10)

  return cleaned || fallback
}

function cleanColor(
  value: string,
  fallback: string,
) {
  const cleaned = value.trim()

  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return cleaned.toUpperCase()
  }

  return fallback
}

function createDatabasePayload(
  input: UpdateCompanySettingsInput,
  currentProfileSettings: Record<string, unknown> = {},
) {
  return {
    name: input.name.trim(),

    oib:
      input.oib
        .replace(/\D/g, '')
        .slice(0, 11) || null,

    address:
      input.address.trim() || null,

    city:
      input.city.trim() || null,

    postal_code:
      input.postalCode.trim() || null,

    country:
      input.country.trim() ||
      'Hrvatska',

    phone:
      input.phone.trim() || null,

    email:
      input.email
        .trim()
        .toLowerCase() || null,

    website:
      input.website.trim() || null,

    iban:
      input.iban
        .replace(/\s/g, '')
        .toUpperCase() || null,

    bank_name:
      input.bankName.trim() || null,

    logo_url:
      input.logoUrl || null,

    stamp_url:
      input.stampUrl || null,

    signature_url:
      input.signatureUrl || null,

    default_vat_rate:
      Math.min(
        100,
        Math.max(
          0,
          Number(input.defaultVatRate) || 0,
        ),
      ),

    currency:
      input.currency
        .trim()
        .toUpperCase() || 'EUR',

    primary_color:
      cleanColor(
        input.primaryColor,
        '#2563EB',
      ),

    secondary_color:
      cleanColor(
        input.secondaryColor,
        '#0F172A',
      ),

    working_hours:
      input.workingHours,

    work_order_prefix:
      cleanPrefix(
        input.workOrderPrefix,
        'RN',
      ),

    offer_prefix:
      cleanPrefix(
        input.offerPrefix,
        'P',
      ),

    invoice_prefix:
      cleanPrefix(
        input.invoicePrefix,
        'R',
      ),

    incoming_invoice_prefix:
      cleanPrefix(
        input.incomingInvoicePrefix,
        'UR',
      ),

    default_payment_days:
      Math.min(
        365,
        Math.max(
          0,
          Number(
            input.defaultPaymentDays,
          ) || 0,
        ),
      ),

    default_offer_validity_days:
      Math.min(
        365,
        Math.max(
          1,
          Number(
            input.defaultOfferValidityDays,
          ) || 1,
        ),
      ),

    document_footer:
      input.documentFooter.trim(),

    document_watermark:
      input.documentWatermark.trim(),

    notifications_enabled:
      input.notificationsEnabled,

    email_notifications_enabled:
      input.emailNotificationsEnabled,

    profile_settings: {
      ...currentProfileSettings,
      ...input.profileSettings,
    },
  }
}

export async function getCompanySettings(): Promise<
  CompanySettings
> {
  const { data, error } = await supabase.rpc(
    'get_current_company',
  )

  if (error) {
    throw error
  }

  const rows = Array.isArray(data)
    ? data
    : data
      ? [data]
      : []

  const company = rows[0] as
    | CompanyRow
    | undefined

  if (!company) {
    throw new Error(
      'Postavke tvrtke nisu pronađene.',
    )
  }

  return mapCompany(company)
}

export async function updateCompanySettings(
  input: UpdateCompanySettingsInput,
): Promise<CompanySettings> {
  if (!input.name.trim()) {
    throw new Error(
      'Naziv tvrtke je obavezan.',
    )
  }

  const cleanOib = input.oib.replace(
    /\D/g,
    '',
  )

  if (
    cleanOib.length > 0 &&
    cleanOib.length !== 11
  ) {
    throw new Error(
      'OIB tvrtke mora imati točno 11 znamenki.',
    )
  }

  const companyId =
    await getCurrentCompanyId()

  // profile_settings contains document appearance, work-order branding
  // and other module preferences. General company settings must merge
  // regional settings into that JSON instead of replacing the whole object.
  const {
    data: currentCompany,
    error: currentCompanyError,
  } = await supabase
    .from('companies')
    .select('profile_settings')
    .eq('id', companyId)
    .single()

  if (currentCompanyError) {
    throw currentCompanyError
  }

  const currentProfileSettings =
    isObject(currentCompany?.profile_settings)
      ? currentCompany.profile_settings
      : {}

  const { data, error } = await supabase
    .from('companies')
    .update(
      createDatabasePayload(
        input,
        currentProfileSettings,
      ),
    )
    .eq('id', companyId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapCompany(
    data as CompanyRow,
  )
}

export async function updateCompanyLogo(
  logoUrl: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('companies')
    .update({
      logo_url: logoUrl || null,
    })
    .eq('id', companyId)

  if (error) {
    throw error
  }
}

export async function updateCompanyStamp(
  stampUrl: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('companies')
    .update({
      stamp_url: stampUrl || null,
    })
    .eq('id', companyId)

  if (error) {
    throw error
  }
}

export async function updateCompanySignature(
  signatureUrl: string,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const { error } = await supabase
    .from('companies')
    .update({
      signature_url:
        signatureUrl || null,
    })
    .eq('id', companyId)

  if (error) {
    throw error
  }
}

export {
  defaultWorkingHours,
}
