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

  if (isString(value.companyName)) {
    result.companyName =
      value.companyName
  }

  if (isString(value.companyOib)) {
    result.companyOib =
      value.companyOib
  }

  if (
    isString(
      value.companyAddress,
    )
  ) {
    result.companyAddress =
      value.companyAddress
  }

  if (
    isString(
      value.companyPhone,
    )
  ) {
    result.companyPhone =
      value.companyPhone
  }

  if (
    isString(
      value.companyEmail,
    )
  ) {
    result.companyEmail =
      value.companyEmail
  }

  if (
    isString(
      value.companyIban,
    )
  ) {
    result.companyIban =
      value.companyIban
  }

  if (
    isString(
      value.companyWebsite,
    )
  ) {
    result.companyWebsite =
      value.companyWebsite
  }

  if (
    isString(
      value.primaryColor,
    )
  ) {
    result.primaryColor =
      value.primaryColor
  }

  if (
    isString(
      value.secondaryColor,
    )
  ) {
    result.secondaryColor =
      value.secondaryColor
  }

  if (
    isString(
      value.accentColor,
    )
  ) {
    result.accentColor =
      value.accentColor
  }

  if (
    isString(
      value.textColor,
    )
  ) {
    result.textColor =
      value.textColor
  }

  if (
    isString(
      value.borderColor,
    )
  ) {
    result.borderColor =
      value.borderColor
  }

  if (
    isString(
      value.backgroundColor,
    )
  ) {
    result.backgroundColor =
      value.backgroundColor
  }

  if (isString(value.logo)) {
    result.logo = value.logo
  }

  if (isString(value.stamp)) {
    result.stamp = value.stamp
  }

  if (
    isString(
      value.backgroundImage,
    )
  ) {
    result.backgroundImage =
      value.backgroundImage
  }

  if (
    isBoolean(
      value.showBackgroundImage,
    )
  ) {
    result.showBackgroundImage =
      value.showBackgroundImage
  }

  if (
    isBoolean(value.showLogo)
  ) {
    result.showLogo =
      value.showLogo
  }

  if (
    isBoolean(value.showStamp)
  ) {
    result.showStamp =
      value.showStamp
  }

  if (
    isBoolean(
      value.showCompanyPhone,
    )
  ) {
    result.showCompanyPhone =
      value.showCompanyPhone
  }

  if (
    isBoolean(
      value.showCompanyEmail,
    )
  ) {
    result.showCompanyEmail =
      value.showCompanyEmail
  }

  if (
    isBoolean(
      value.showCompanyIban,
    )
  ) {
    result.showCompanyIban =
      value.showCompanyIban
  }

  if (
    isBoolean(
      value.showCompanyOib,
    )
  ) {
    result.showCompanyOib =
      value.showCompanyOib
  }

  if (
    isBoolean(
      value.showCompanyWebsite,
    )
  ) {
    result.showCompanyWebsite =
      value.showCompanyWebsite
  }

  if (
    value.headerAlignment ===
      'left' ||
    value.headerAlignment ===
      'center' ||
    value.headerAlignment ===
      'right'
  ) {
    result.headerAlignment =
      value.headerAlignment
  }

  if (
    value.layout ===
      'classic' ||
    value.layout ===
      'modern' ||
    value.layout ===
      'minimal'
  ) {
    result.layout =
      value.layout
  }

  if (
    isString(
      value.watermarkText,
    )
  ) {
    result.watermarkText =
      value.watermarkText
  }

  if (
    isString(
      value.footerText,
    )
  ) {
    result.footerText =
      value.footerText
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
      settings.secondaryColor ||
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

    showBackgroundImage:
      false,

    showLogo:
      Boolean(
        settings.logoUrl,
      ),

    showStamp:
      Boolean(
        settings.stampUrl,
      ),

    showCompanyPhone:
      Boolean(
        settings.phone,
      ),

    showCompanyEmail:
      Boolean(
        settings.email,
      ),

    showCompanyIban:
      Boolean(
        settings.iban,
      ),

    showCompanyOib:
      Boolean(
        settings.oib,
      ),

    showCompanyWebsite:
      Boolean(
        settings.website,
      ),

    headerAlignment:
      'left',

    layout:
      'modern',

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
): Promise<Record<
  string,
  unknown
>> {
  const {
    data,
    error,
  } = await supabase
    .from('companies')
    .select(
      'profile_settings',
    )
    .eq(
      'id',
      companyId,
    )
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
    .eq(
      'id',
      companyId,
    )

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
    .eq(
      'id',
      companyId,
    )

  if (error) {
    throw error
  }

  return baseBranding
}