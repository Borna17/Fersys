import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  getCompanySettings,
  type CompanySettings,
} from './companySettings.service'

export const COMPANY_BRANDING_UPDATED_EVENT =
  'fersys:company-branding-updated'

export type CompanyBranding = Pick<
  CompanySettings,
  'id' | 'name' | 'logoUrl' | 'primaryColor'
>

function toBranding(
  settings: CompanySettings,
): CompanyBranding {
  return {
    id: settings.id,
    name: settings.name,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
  }
}

export function notifyCompanyBrandingUpdated(
  settings: CompanySettings,
) {
  window.dispatchEvent(
    new CustomEvent<CompanyBranding>(
      COMPANY_BRANDING_UPDATED_EVENT,
      { detail: toBranding(settings) },
    ),
  )
}

export function useCompanyBranding() {
  const [branding, setBranding] =
    useState<CompanyBranding | null>(null)
  const [isLoading, setIsLoading] =
    useState(true)

  const load = useCallback(async () => {
    try {
      const settings =
        await getCompanySettings()
      setBranding(toBranding(settings))
    } catch (error) {
      console.error(
        'Branding tvrtke nije moguće učitati:',
        error,
      )
      setBranding(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()

    function handleBrandingUpdated(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<CompanyBranding>

      if (customEvent.detail) {
        setBranding(customEvent.detail)
      } else {
        void load()
      }
    }

    window.addEventListener(
      COMPANY_BRANDING_UPDATED_EVENT,
      handleBrandingUpdated,
    )

    return () => {
      window.removeEventListener(
        COMPANY_BRANDING_UPDATED_EVENT,
        handleBrandingUpdated,
      )
    }
  }, [load])

  return {
    branding,
    isLoading,
    reloadBranding: load,
  }
}
