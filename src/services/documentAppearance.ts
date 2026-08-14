export type DocumentKind =
  | 'workOrder'
  | 'offer'
  | 'invoice'

export type DocumentPreset =
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'custom'

export type DocumentHeaderAlignment =
  | 'left'
  | 'center'
  | 'right'

export type DocumentDensity =
  | 'comfortable'
  | 'compact'

export type DocumentInfoStyle =
  | 'cards'
  | 'lines'

export type DocumentTableStyle =
  | 'solid'
  | 'soft'
  | 'minimal'

export type DocumentSectionStyle =
  | 'bar'
  | 'line'
  | 'plain'

export type DocumentAppearance = {
  preset: DocumentPreset

  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  borderColor: string
  backgroundColor: string

  headerAlignment: DocumentHeaderAlignment
  density: DocumentDensity
  infoStyle: DocumentInfoStyle
  tableStyle: DocumentTableStyle
  sectionStyle: DocumentSectionStyle

  showLogo: boolean
  showStamp: boolean
  showSignature: boolean
  showFooter: boolean
  showWatermark: boolean
  showItemImages: boolean

  documentTitle: string
  footerText: string
  watermarkText: string
}

export type DocumentAppearanceSettings = {
  workOrder: DocumentAppearance
  offer: DocumentAppearance
  invoice: DocumentAppearance
}

export const documentKindLabels: Record<
  DocumentKind,
  string
> = {
  workOrder: 'Radni nalog',
  offer: 'Ponuda',
  invoice: 'Račun',
}

export const documentKindDescriptions: Record<
  DocumentKind,
  string
> = {
  workOrder:
    'Servisni dokument, opis radova, materijal, fotografije i potpis.',
  offer:
    'Komercijalna ponuda s uvjetima, stavkama, cijenama i prihvatom.',
  invoice:
    'Financijski dokument spreman za buduće povezivanje s eRačunom.',
}

export const presetDescriptions: Record<
  DocumentPreset,
  {
    label: string
    description: string
    badge?: string
  }
> = {
  modern: {
    label: 'Modern',
    description:
      'Preporučeni FERSYS izgled: čist, premium i vizualno jasan.',
    badge: 'Preporučeno',
  },
  classic: {
    label: 'Classic',
    description:
      'Standardni poslovni dokument s tradicionalnijim rasporedom.',
  },
  minimal: {
    label: 'Minimal',
    description:
      'Vrlo jednostavan izgled, malo boje i maksimalna čitljivost.',
  },
  custom: {
    label: 'Custom',
    description:
      'Potpuna kontrola nad bojama, rasporedom i prikazom sekcija.',
  },
}

export function createPresetAppearance(
  kind: DocumentKind,
  preset: DocumentPreset,
): DocumentAppearance {
  const title =
    kind === 'workOrder'
      ? 'RADNI NALOG'
      : kind === 'offer'
        ? 'PONUDA'
        : 'RAČUN'

  const footer =
    kind === 'workOrder'
      ? 'Hvala na povjerenju.'
      : kind === 'offer'
        ? 'Ponuda je izrađena u sustavu FERSYS.'
        : 'Račun je izrađen u sustavu FERSYS.'

  const base: DocumentAppearance = {
    preset,
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    accentColor: '#38BDF8',
    textColor: '#0F172A',
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    headerAlignment: 'left',
    density: 'comfortable',
    infoStyle: 'cards',
    tableStyle: 'solid',
    sectionStyle: 'bar',
    showLogo: true,
    showStamp: true,
    showSignature: true,
    showFooter: true,
    showWatermark: false,
    showItemImages: kind === 'offer',
    documentTitle: title,
    footerText: footer,
    watermarkText: title,
  }

  if (preset === 'classic') {
    return {
      ...base,
      preset,
      primaryColor: '#1E3A5F',
      secondaryColor: '#111827',
      accentColor: '#64748B',
      borderColor: '#94A3B8',
      density: 'comfortable',
      infoStyle: 'lines',
      tableStyle: 'solid',
      sectionStyle: 'line',
    }
  }

  if (preset === 'minimal') {
    return {
      ...base,
      preset,
      primaryColor: '#111827',
      secondaryColor: '#FFFFFF',
      accentColor: '#64748B',
      textColor: '#111827',
      borderColor: '#E5E7EB',
      density: 'compact',
      infoStyle: 'lines',
      tableStyle: 'minimal',
      sectionStyle: 'plain',
      showWatermark: false,
    }
  }

  if (preset === 'custom') {
    return {
      ...base,
      preset,
      primaryColor: '#6217EE',
      secondaryColor: '#0F172A',
      accentColor: '#7C3AED',
    }
  }

  return base
}

export const defaultDocumentAppearanceSettings:
DocumentAppearanceSettings = {
  workOrder:
    createPresetAppearance(
      'workOrder',
      'modern',
    ),
  offer:
    createPresetAppearance(
      'offer',
      'modern',
    ),
  invoice:
    createPresetAppearance(
      'invoice',
      'modern',
    ),
}
