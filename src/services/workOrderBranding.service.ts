import {
  getCompanySettings,
} from './companySettings.service'

import {
  defaultWorkOrderBranding,
  type WorkOrderBranding,
} from '../types/workOrder'

export async function getWorkOrderBrandingFromCompanySettings():
Promise<WorkOrderBranding> {
  const settings =
    await getCompanySettings()

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
      settings.primaryColor ||
      defaultWorkOrderBranding.accentColor,

    textColor:
      '#0F172A',

    borderColor:
      '#CBD5E1',

    backgroundColor:
      '#FFFFFF',

    logo:
      settings.logoUrl,

    stamp:
      settings.stampUrl,

    backgroundImage: '',

    showBackgroundImage:
      false,

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

    headerAlignment:
      'left',

    layout:
      'minimal',

    watermarkText:
      settings.documentWatermark,

    footerText:
      settings.documentFooter,
  }
}
