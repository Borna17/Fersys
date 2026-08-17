import { supabase } from '../lib/supabase'

export type OfferPricingSettings = {
  globalDiscount: number
  defaultVat: number
}

const DEFAULTS:
OfferPricingSettings = {
  globalDiscount: 0,
  defaultVat: 25,
}

function clampPercent(
  value: unknown,
  fallback: number,
) {
  const number =
    Number(value)

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return fallback
  }

  return Math.min(
    100,
    Math.max(
      0,
      number,
    ),
  )
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
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

export async function
getOfferPricingSettings(
  offerId: string,
): Promise<
  OfferPricingSettings
> {
  if (
    !offerId ||
    offerId === 'preview'
  ) {
    return {
      ...DEFAULTS,
    }
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'offer_pricing_settings',
      )
      .select(
        'global_discount, default_vat',
      )
      .eq(
        'offer_id',
        offerId,
      )
      .maybeSingle()

  if (error) {
    /*
     * Backward compatibility:
     * ako SQL još nije pokrenut ili stara ponuda nema pricing red,
     * stara logika ponude i dalje radi s 0% globalnog popusta i 25% default PDV-a.
     */
    console.warn(
      'Offer pricing settings nisu dostupne:',
      error,
    )

    return {
      ...DEFAULTS,
    }
  }

  if (!data) {
    return {
      ...DEFAULTS,
    }
  }

  return {
    globalDiscount:
      clampPercent(
        data.global_discount,
        0,
      ),
    defaultVat:
      clampPercent(
        data.default_vat,
        25,
      ),
  }
}

export async function
saveOfferPricingSettings(
  offerId: string,
  settings:
    OfferPricingSettings,
): Promise<
  OfferPricingSettings
> {
  if (!offerId) {
    throw new Error(
      'Ponuda nije spremljena.',
    )
  }

  const companyId =
    await currentCompanyId()

  const normalized:
    OfferPricingSettings = {
    globalDiscount:
      clampPercent(
        settings.globalDiscount,
        0,
      ),
    defaultVat:
      clampPercent(
        settings.defaultVat,
        25,
      ),
  }

  const {
    error,
  } =
    await supabase
      .from(
        'offer_pricing_settings',
      )
      .upsert(
        {
          company_id:
            companyId,
          offer_id:
            offerId,
          global_discount:
            normalized.globalDiscount,
          default_vat:
            normalized.defaultVat,
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'offer_id',
        },
      )

  if (error) {
    throw error
  }

  return normalized
}
