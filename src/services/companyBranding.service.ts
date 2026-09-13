import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'
import type {
  CompanySettings,
} from './companySettings.service'

export const COMPANY_BRANDING_UPDATED_EVENT =
  'fersys:company-branding-updated'

export type CompanyBranding = Pick<
  CompanySettings,
  'id' | 'name' | 'logoUrl' | 'primaryColor'
>

type CompanyBrandingRow = {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
}

const BRANDING_CACHE_TTL_MS = 30_000

let cachedBranding: CompanyBranding | null = null
let cachedAt = 0
let brandingRequest: Promise<CompanyBranding> | null = null

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

function mapBrandingRow(
  row: CompanyBrandingRow,
): CompanyBranding {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? '',
    primaryColor: row.primary_color ?? '#2563EB',
  }
}

async function fetchCompanyBranding(
  force = false,
): Promise<CompanyBranding> {
  const now = Date.now()

  if (
    !force &&
    cachedBranding &&
    now - cachedAt < BRANDING_CACHE_TTL_MS
  ) {
    return cachedBranding
  }

  if (!force && brandingRequest) {
    return brandingRequest
  }

  const request = (async () => {
    const { data, error } = await supabase.rpc(
      'get_current_company_branding',
    )

    if (error) {
      throw error
    }

    const row = Array.isArray(data)
      ? data[0]
      : data

    if (!row) {
      throw new Error(
        'Branding aktivne tvrtke nije pronađen.',
      )
    }

    const branding = mapBrandingRow(
      row as CompanyBrandingRow,
    )

    cachedBranding = branding
    cachedAt = Date.now()

    return branding
  })()

  brandingRequest = request

  try {
    return await request
  } finally {
    if (brandingRequest === request) {
      brandingRequest = null
    }
  }
}

export function notifyCompanyBrandingUpdated(
  settings: CompanySettings,
) {
  const branding = toBranding(settings)

  cachedBranding = branding
  cachedAt = Date.now()

  window.dispatchEvent(
    new CustomEvent<CompanyBranding>(
      COMPANY_BRANDING_UPDATED_EVENT,
      { detail: branding },
    ),
  )
}

export function useCompanyBranding() {
  const [branding, setBranding] =
    useState<CompanyBranding | null>(cachedBranding)
  const [isLoading, setIsLoading] =
    useState(!cachedBranding)

  const load = useCallback(async (
    force = false,
  ) => {
    try {
      const nextBranding =
        await fetchCompanyBranding(force)
      setBranding(nextBranding)
    } catch (error) {
      console.error(
        'Branding tvrtke nije moguće učitati:',
        error,
      )

      // Ako već imamo zadnji ispravan branding, ne brišemo ga zbog
      // prolazne mrežne/DB greške.
      if (!cachedBranding) {
        setBranding(null)
      }
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
        cachedBranding = customEvent.detail
        cachedAt = Date.now()
        setBranding(customEvent.detail)
      } else {
        void load(true)
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
    reloadBranding: () => load(true),
  }
}
