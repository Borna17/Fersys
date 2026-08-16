import {
  supabase,
} from '../lib/supabase'

export type DeliveryNotePdfPreset =
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'custom'

export type DeliveryNotePdfSettings = {
  preset:
    DeliveryNotePdfPreset
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  borderColor: string
  backgroundColor: string

  showLogo: boolean
  showStamp: boolean
  showFooter: boolean
  showSignatures: boolean
  showRelatedDocuments:
    boolean
  compactTable: boolean

  title: string
  footerText: string
}

const PROFILE_KEY =
  'deliveryNoteAppearanceV1'

export const defaultDeliveryNotePdfSettings:
DeliveryNotePdfSettings = {
  preset: 'modern',
  primaryColor:
    '#2563EB',
  secondaryColor:
    '#0F172A',
  accentColor:
    '#38BDF8',
  textColor:
    '#0F172A',
  borderColor:
    '#CBD5E1',
  backgroundColor:
    '#FFFFFF',

  showLogo: true,
  showStamp: true,
  showFooter: true,
  showSignatures: true,
  showRelatedDocuments:
    true,
  compactTable: false,

  title: 'OTPREMNICA',
  footerText:
    'Otpremnica je izrađena u sustavu FERSYS.',
}

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  )
}

function color(
  value: unknown,
  fallback: string,
) {
  return (
    typeof value ===
      'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(
      value,
    )
  )
    ? value.toUpperCase()
    : fallback
}

function parse(
  value: unknown,
):
DeliveryNotePdfSettings {
  const fallback =
    defaultDeliveryNotePdfSettings

  if (!isObject(value)) {
    return fallback
  }

  const preset:
    DeliveryNotePdfPreset =
    value.preset ===
        'classic' ||
      value.preset ===
        'minimal' ||
      value.preset ===
        'custom' ||
      value.preset ===
        'modern'
      ? value.preset
      : fallback.preset

  const presetBase =
    preset === 'classic'
      ? {
          ...fallback,
          preset,
          primaryColor:
            '#1E3A5F',
          secondaryColor:
            '#111827',
          accentColor:
            '#64748B',
          borderColor:
            '#94A3B8',
        }
      : preset ===
          'minimal'
        ? {
            ...fallback,
            preset,
            primaryColor:
              '#111827',
            secondaryColor:
              '#FFFFFF',
            accentColor:
              '#64748B',
            borderColor:
              '#E5E7EB',
            compactTable:
              true,
          }
        : preset ===
            'custom'
          ? {
              ...fallback,
              preset,
              primaryColor:
                '#6217EE',
              secondaryColor:
                '#0F172A',
              accentColor:
                '#7C3AED',
            }
          : {
              ...fallback,
              preset,
            }

  return {
    ...presetBase,

    primaryColor:
      color(
        value.primaryColor,
        presetBase
          .primaryColor,
      ),

    secondaryColor:
      color(
        value.secondaryColor,
        presetBase
          .secondaryColor,
      ),

    accentColor:
      color(
        value.accentColor,
        presetBase
          .accentColor,
      ),

    textColor:
      color(
        value.textColor,
        presetBase
          .textColor,
      ),

    borderColor:
      color(
        value.borderColor,
        presetBase
          .borderColor,
      ),

    backgroundColor:
      color(
        value.backgroundColor,
        presetBase
          .backgroundColor,
      ),

    showLogo:
      typeof value.showLogo ===
      'boolean'
        ? value.showLogo
        : presetBase
            .showLogo,

    showStamp:
      typeof value.showStamp ===
      'boolean'
        ? value.showStamp
        : presetBase
            .showStamp,

    showFooter:
      typeof value.showFooter ===
      'boolean'
        ? value.showFooter
        : presetBase
            .showFooter,

    showSignatures:
      typeof value
        .showSignatures ===
      'boolean'
        ? value
            .showSignatures
        : presetBase
            .showSignatures,

    showRelatedDocuments:
      typeof value
        .showRelatedDocuments ===
      'boolean'
        ? value
            .showRelatedDocuments
        : presetBase
            .showRelatedDocuments,

    compactTable:
      typeof value
        .compactTable ===
      'boolean'
        ? value
            .compactTable
        : presetBase
            .compactTable,

    title:
      typeof value.title ===
      'string'
        ? value.title
        : presetBase.title,

    footerText:
      typeof value
        .footerText ===
      'string'
        ? value.footerText
        : presetBase
            .footerText,
  }
}

async function currentCompanyId() {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Tvrtka nije pronađena.',
    )
  }

  return String(data)
}

async function rawProfile(
  companyId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'companies',
      )
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

  return isObject(
    data
      ?.profile_settings,
  )
    ? {
        ...data
          .profile_settings,
      }
    : {}
}

export async function
getDeliveryNotePdfSettings():
Promise<
  DeliveryNotePdfSettings
> {
  const companyId =
    await currentCompanyId()

  const profile =
    await rawProfile(
      companyId,
    )

  return parse(
    profile[
      PROFILE_KEY
    ],
  )
}

export async function
saveDeliveryNotePdfSettings(
  settings:
    DeliveryNotePdfSettings,
) {
  const companyId =
    await currentCompanyId()

  const profile =
    await rawProfile(
      companyId,
    )

  const normalized =
    parse(settings)

  const {
    error,
  } =
    await supabase
      .from(
        'companies',
      )
      .update({
        profile_settings: {
          ...profile,
          [PROFILE_KEY]:
            normalized,
        },
      })
      .eq(
        'id',
        companyId,
      )

  if (error) {
    throw error
  }

  return normalized
}
