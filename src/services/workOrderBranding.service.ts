import { supabase } from '../lib/supabase'

import {
  getCompanySettings,
  type CompanySettings,
} from './companySettings.service'

import {
  defaultWorkOrderBranding,
  type WorkOrderBranding,
} from '../types/workOrder'

const BRANDING_STORAGE_KEY =
  'workOrderBranding'

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isString(
  value: unknown,
): value is string {
  return typeof value === 'string'
}

function isBoolean(
  value: unknown,
): value is boolean {
  return typeof value === 'boolean'
}

function parseStoredBranding(
  value: unknown,
): Partial<WorkOrderBranding> {
  if (!isObject(value)) {
    return {}
  }

  const result:
    Partial<WorkOrderBranding> = {}

  const stringFields = [
    'companyName',
    'companyOib',
    'companyAddress',
    'companyPhone',
    'companyEmail',
    'companyIban',
    'companyWebsite',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'textColor',
    'borderColor',
    'backgroundColor',
    'logo',
    'stamp',
    'backgroundImage',
    'watermarkText',
    'footerText',
  ] as const

  for (const field of stringFields) {
    if (isString(value[field])) {
      result[field] = value[field]
    }
  }

  const booleanFields = [
    'showBackgroundImage',
    'showLogo',
    'showStamp',
    'showCompanyPhone',
    'showCompanyEmail',
    'showCompanyIban',
    'showCompanyOib',
    'showCompanyWebsite',
  ] as const

  for (const field of booleanFields) {
    if (isBoolean(value[field])) {
      result[field] = value[field]
    }
  }

  if (
    value.headerAlignment === 'left' ||
    value.headerAlignment === 'center' ||
    value.headerAlignment === 'right'
  ) {
    result.headerAlignment =
      value.headerAlignment
  }

  if (
    value.layout === 'classic' ||
    value.layout === 'modern' ||
    value.layout === 'custom' ||
    value.layout === 'minimal'
  ) {
    result.layout =
      value.layout === 'minimal'
        ? 'custom'
        : value.layout
  }

  return result
}

export function mapCompanySettingsToWorkOrderBranding(
  settings: CompanySettings,
): WorkOrderBranding {
  const address = [
    settings.address,
    [
      settings.postalCode,
      settings.city,
    ]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  return {
    ...defaultWorkOrderBranding,

    companyName:
      settings.name ||
      defaultWorkOrderBranding.companyName,

    companyOib:
      settings.oib,

    companyAddress:
      address,

    companyPhone:
      settings.phone,

    companyEmail:
      settings.email,

    companyIban:
      settings.iban,

    companyWebsite:
      settings.website,

    primaryColor:
      settings.primaryColor ||
      defaultWorkOrderBranding.primaryColor,

    secondaryColor:
      defaultWorkOrderBranding.secondaryColor,

    accentColor:
      defaultWorkOrderBranding.accentColor,

    textColor:
      defaultWorkOrderBranding.textColor,

    borderColor:
      defaultWorkOrderBranding.borderColor,

    backgroundColor:
      defaultWorkOrderBranding.backgroundColor,

    logo:
      settings.logoUrl,

    stamp:
      settings.stampUrl,

    backgroundImage: '',

    showBackgroundImage: false,
    showLogo:
      Boolean(settings.logoUrl),
    showStamp:
      Boolean(settings.stampUrl),
    showCompanyPhone:
      Boolean(settings.phone),
    showCompanyEmail:
      Boolean(settings.email),
    showCompanyIban:
      Boolean(settings.iban),
    showCompanyOib:
      Boolean(settings.oib),
    showCompanyWebsite:
      Boolean(settings.website),

    headerAlignment: 'left',
    layout: 'modern',
    watermarkText:
      settings.documentWatermark,
    footerText:
      settings.documentFooter,
  }
}

async function getCurrentCompanyId():
Promise<string> {
  const {
    data,
    error,
  } = await supabase.rpc(
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

async function getRawProfileSettings(
  companyId: string,
): Promise<Record<string, unknown>> {
  const {
    data,
    error,
  } = await supabase
    .from('companies')
    .select('profile_settings')
    .eq('id', companyId)
    .single()

  if (error) {
    throw error
  }

  if (
    !data ||
    !isObject(
      data.profile_settings,
    )
  ) {
    return {}
  }

  return {
    ...data.profile_settings,
  }
}

export async function getWorkOrderBrandingFromCompanySettings():
Promise<WorkOrderBranding> {
  const settings =
    await getCompanySettings()

  const baseBranding =
    mapCompanySettingsToWorkOrderBranding(
      settings,
    )

  try {
    const profileSettings =
      await getRawProfileSettings(
        settings.id,
      )

    const savedBranding =
      parseStoredBranding(
        profileSettings[
          BRANDING_STORAGE_KEY
        ],
      )

    return {
      ...baseBranding,
      ...savedBranding,
    }
  } catch (error) {
    console.error(
      'Posebne postavke radnog naloga nije moguće učitati:',
      error,
    )

    return baseBranding
  }
}

export async function saveWorkOrderBranding(
  branding: WorkOrderBranding,
): Promise<WorkOrderBranding> {
  const companyId =
    await getCurrentCompanyId()

  const currentProfileSettings =
    await getRawProfileSettings(
      companyId,
    )

  const nextProfileSettings = {
    ...currentProfileSettings,
    [BRANDING_STORAGE_KEY]:
      branding,
  }

  const {
    error,
  } = await supabase
    .from('companies')
    .update({
      profile_settings:
        nextProfileSettings,
    })
    .eq('id', companyId)

  if (error) {
    throw error
  }

  return branding
}

export async function resetWorkOrderBranding():
Promise<WorkOrderBranding> {
  const companyId =
    await getCurrentCompanyId()

  const settings =
    await getCompanySettings()

  const baseBranding =
    mapCompanySettingsToWorkOrderBranding(
      settings,
    )

  const currentProfileSettings =
    await getRawProfileSettings(
      companyId,
    )

  const nextProfileSettings = {
    ...currentProfileSettings,
  }

  delete nextProfileSettings[
    BRANDING_STORAGE_KEY
  ]

  const {
    error,
  } = await supabase
    .from('companies')
    .update({
      profile_settings:
        nextProfileSettings,
    })
    .eq('id', companyId)

  if (error) {
    throw error
  }

  return baseBranding
}