import {
  createPresetAppearance,
  defaultDocumentAppearanceSettings,
  type DocumentAppearance,
  type DocumentAppearanceSettings,
  type DocumentKind,
  type DocumentPreset,
} from '../types/documentAppearance'

let supabase: any

const STORAGE_KEY =
  'documentAppearanceV1'

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function cleanColor(
  value: unknown,
  fallback: string,
) {
  return (
    typeof value === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(value)
  )
    ? value.toUpperCase()
    : fallback
}

function parseAppearance(
  kind: DocumentKind,
  value: unknown,
): DocumentAppearance {
  const fallback =
    defaultDocumentAppearanceSettings[
      kind
    ]

  if (!isObject(value)) {
    return fallback
  }

  const preset: DocumentPreset =
    value.preset === 'classic' ||
    value.preset === 'minimal' ||
    value.preset === 'custom' ||
    value.preset === 'modern'
      ? value.preset
      : fallback.preset

  const presetFallback =
    createPresetAppearance(
      kind,
      preset,
    )

  return {
    ...presetFallback,

    preset,

    primaryColor:
      cleanColor(
        value.primaryColor,
        presetFallback.primaryColor,
      ),
    secondaryColor:
      cleanColor(
        value.secondaryColor,
        presetFallback.secondaryColor,
      ),
    accentColor:
      cleanColor(
        value.accentColor,
        presetFallback.accentColor,
      ),
    textColor:
      cleanColor(
        value.textColor,
        presetFallback.textColor,
      ),
    borderColor:
      cleanColor(
        value.borderColor,
        presetFallback.borderColor,
      ),
    backgroundColor:
      cleanColor(
        value.backgroundColor,
        presetFallback.backgroundColor,
      ),

    headerAlignment:
      value.headerAlignment === 'center' ||
      value.headerAlignment === 'right' ||
      value.headerAlignment === 'left'
        ? value.headerAlignment
        : presetFallback.headerAlignment,

    density:
      value.density === 'compact' ||
      value.density === 'comfortable'
        ? value.density
        : presetFallback.density,

    infoStyle:
      value.infoStyle === 'lines' ||
      value.infoStyle === 'cards'
        ? value.infoStyle
        : presetFallback.infoStyle,

    tableStyle:
      value.tableStyle === 'soft' ||
      value.tableStyle === 'minimal' ||
      value.tableStyle === 'solid'
        ? value.tableStyle
        : presetFallback.tableStyle,

    sectionStyle:
      value.sectionStyle === 'line' ||
      value.sectionStyle === 'plain' ||
      value.sectionStyle === 'bar'
        ? value.sectionStyle
        : presetFallback.sectionStyle,

    showLogo:
      typeof value.showLogo === 'boolean'
        ? value.showLogo
        : presetFallback.showLogo,
    showStamp:
      typeof value.showStamp === 'boolean'
        ? value.showStamp
        : presetFallback.showStamp,
    showSignature:
      typeof value.showSignature === 'boolean'
        ? value.showSignature
        : presetFallback.showSignature,
    showFooter:
      typeof value.showFooter === 'boolean'
        ? value.showFooter
        : presetFallback.showFooter,
    showWatermark:
      typeof value.showWatermark === 'boolean'
        ? value.showWatermark
        : presetFallback.showWatermark,
    showItemImages:
      typeof value.showItemImages === 'boolean'
        ? value.showItemImages
        : presetFallback.showItemImages,

    documentTitle:
      typeof value.documentTitle === 'string'
        ? value.documentTitle
        : presetFallback.documentTitle,
    footerText:
      typeof value.footerText === 'string'
        ? value.footerText
        : presetFallback.footerText,
    watermarkText:
      typeof value.watermarkText === 'string'
        ? value.watermarkText
        : presetFallback.watermarkText,
  }
}

async function currentCompanyId() {
  const { data, error } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) throw error

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

async function rawProfileSettings(
  companyId: string,
) {
  const { data, error } =
    await supabase
      .from('companies')
      .select('profile_settings')
      .eq('id', companyId)
      .single()

  if (error) throw error

  return isObject(
    data?.profile_settings,
  )
    ? {
        ...data.profile_settings,
      }
    : {}
}

export async function getDocumentAppearanceSettings():
Promise<{
  settings: DocumentAppearanceSettings
  hasStoredSettings: boolean
}> {
  const companyId =
    await currentCompanyId()

  const profile =
    await rawProfileSettings(
      companyId,
    )

  const stored =
    profile[STORAGE_KEY]

  if (!isObject(stored)) {
    return {
      settings:
        defaultDocumentAppearanceSettings,
      hasStoredSettings: false,
    }
  }

  return {
    hasStoredSettings: true,
    settings: {
      workOrder:
        parseAppearance(
          'workOrder',
          stored.workOrder,
        ),
      offer:
        parseAppearance(
          'offer',
          stored.offer,
        ),
      invoice:
        parseAppearance(
          'invoice',
          stored.invoice,
        ),
    },
  }
}

export async function saveDocumentAppearanceSettings(
  settings: DocumentAppearanceSettings,
): Promise<DocumentAppearanceSettings> {
  const companyId =
    await currentCompanyId()

  const profile =
    await rawProfileSettings(
      companyId,
    )

  const normalized:
    DocumentAppearanceSettings = {
      workOrder:
        parseAppearance(
          'workOrder',
          settings.workOrder,
        ),
      offer:
        parseAppearance(
          'offer',
          settings.offer,
        ),
      invoice:
        parseAppearance(
          'invoice',
          settings.invoice,
        ),
    }

  const { error } =
    await supabase
      .from('companies')
      .update({
        profile_settings: {
          ...profile,
          [STORAGE_KEY]:
            normalized,
        },
      })
      .eq('id', companyId)

  if (error) throw error

  return normalized
}

export async function saveDocumentAppearance(
  kind: DocumentKind,
  appearance: DocumentAppearance,
) {
  const current =
    await getDocumentAppearanceSettings()

  const next = {
    ...current.settings,
    [kind]: appearance,
  }

  return saveDocumentAppearanceSettings(
    next,
  )
}

export function mapLegacyWorkOrderAppearance(
  value: {
    layout: 'classic' | 'modern' | 'custom' | 'minimal'
    primaryColor: string
    secondaryColor: string
    accentColor: string
    textColor: string
    borderColor: string
    backgroundColor: string
    headerAlignment: 'left' | 'center' | 'right'
    showLogo: boolean
    showStamp: boolean
    footerText: string
    watermarkText: string
    customInfoStyle: 'cards' | 'compact'
    customMaterialStyle: 'table' | 'list'
  },
): DocumentAppearance {
  return {
    ...createPresetAppearance(
      'workOrder',
      value.layout,
    ),
    preset: value.layout,
    primaryColor: value.primaryColor,
    secondaryColor: value.secondaryColor,
    accentColor: value.accentColor,
    textColor: value.textColor,
    borderColor: value.borderColor,
    backgroundColor: value.backgroundColor,
    headerAlignment:
      value.headerAlignment,
    showLogo: value.showLogo,
    showStamp: value.showStamp,
    footerText: value.footerText,
    watermarkText:
      value.watermarkText,
    infoStyle:
      value.customInfoStyle === 'cards'
        ? 'cards'
        : 'lines',
    tableStyle:
      value.customMaterialStyle === 'table'
        ? 'solid'
        : 'soft',
  }
}
