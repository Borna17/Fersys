import { supabase } from '../lib/supabase'
import { enablePushNotifications } from './pushNotifications.service'

export type WeatherPreferences = {
  city: string
  latitude: number | null
  longitude: number | null
  timezone: string
  enabled: boolean
  hour: number
}

type GeoResult = {
  name: string
  latitude: number
  longitude: number
  timezone?: string
  admin1?: string
  country?: string
}

type WeatherTestResponse = {
  ok?: boolean
  mode?: string
  registered?: number
  sent?: number
  failed?: number
  deactivated?: number
  message?: string
  error?: string
}

const DEFAULT_PREFERENCES: WeatherPreferences = {
  city: '',
  latitude: null,
  longitude: null,
  timezone: 'Europe/Zagreb',
  enabled: true,
  hour: 6,
}

export async function getWeatherPreferences(): Promise<WeatherPreferences> {
  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) {
    throw new Error('Korisnik nije prijavljen.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'weather_city,weather_latitude,weather_longitude,weather_timezone,weather_morning_enabled,weather_morning_hour',
    )
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return DEFAULT_PREFERENCES
  }

  return {
    city: data.weather_city ?? '',
    latitude: data.weather_latitude ?? null,
    longitude: data.weather_longitude ?? null,
    timezone: data.weather_timezone ?? 'Europe/Zagreb',
    enabled: data.weather_morning_enabled ?? true,
    hour: data.weather_morning_hour ?? 6,
  }
}

export async function searchWeatherCity(query: string): Promise<GeoResult[]> {
  const q = query.trim()

  if (q.length < 2) return []

  const url = new URL(
    'https://geocoding-api.open-meteo.com/v1/search',
  )

  url.searchParams.set('name', q)
  url.searchParams.set('count', '6')
  url.searchParams.set('language', 'hr')
  url.searchParams.set('format', 'json')

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Grad trenutno nije moguće pronaći.')
  }

  const body = (await response.json()) as {
    results?: GeoResult[]
  }

  return body.results ?? []
}

export async function saveWeatherPreferences(
  value: WeatherPreferences,
): Promise<WeatherPreferences> {
  const { data: auth } = await supabase.auth.getUser()

  if (!auth.user) {
    throw new Error('Korisnik nije prijavljen.')
  }

  const payload = {
    id: auth.user.id,
    weather_city: value.city.trim() || null,
    weather_latitude: value.latitude,
    weather_longitude: value.longitude,
    weather_timezone: value.timezone || 'Europe/Zagreb',
    weather_morning_enabled: value.enabled,
    weather_morning_hour: Math.min(23, Math.max(0, Number(value.hour) || 6)),
    weather_last_sent_date: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, {
      onConflict: 'id',
    })
    .select(
      'weather_city,weather_latitude,weather_longitude,weather_timezone,weather_morning_enabled,weather_morning_hour',
    )
    .single()

  if (error) throw error

  const saved: WeatherPreferences = {
    city: data.weather_city ?? '',
    latitude: data.weather_latitude ?? null,
    longitude: data.weather_longitude ?? null,
    timezone: data.weather_timezone ?? 'Europe/Zagreb',
    enabled: data.weather_morning_enabled ?? true,
    hour: data.weather_morning_hour ?? 6,
  }

  if (
    value.enabled &&
    (!saved.city || saved.latitude == null || saved.longitude == null)
  ) {
    throw new Error(
      'Grad za jutarnju prognozu nije stvarno spremljen. Odaberi grad iz rezultata pretrage i pokušaj ponovno.',
    )
  }

  return saved
}

export async function sendWeatherTestNotification(
  value: WeatherPreferences,
): Promise<string> {
  if (!value.city || value.latitude == null || value.longitude == null) {
    throw new Error('Prvo odaberi i spremi grad za vremensku prognozu.')
  }

  // Test mora prvo osvježiti FCM token baš uređaja na kojem je gumb pritisnut.
  // Bez ovoga backend može pronaći samo stare tokene s prethodnih instalacija/uređaja.
  const pushState = await enablePushNotifications()
  if (pushState !== 'subscribed') {
    throw new Error(
      pushState === 'denied'
        ? 'Obavijesti su blokirane na ovom uređaju. Uključi ih u postavkama telefona ili preglednika.'
        : 'Ovaj uređaj nije moguće registrirati za FERSYS obavijesti.',
    )
  }

  const saved = await saveWeatherPreferences(value)
  if (!saved.city || saved.latitude == null || saved.longitude == null) {
    throw new Error('Lokacija prognoze nije spremljena.')
  }

  const { data, error } = await supabase.functions.invoke<WeatherTestResponse>(
    'weather-morning',
    { body: { mode: 'test' } },
  )

  if (error) {
    throw new Error(`Testnu prognozu nije moguće poslati: ${error.message}`)
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Firebase nije potvrdio slanje testne prognoze.')
  }

  const sent = Number(data.sent ?? 0)
  if (sent < 1) {
    throw new Error('Firebase nije potvrdio slanje ni na jedan uređaj.')
  }

  return `Testna prognoza je poslana. Firebase je prihvatio slanje na ${sent} uređaj${sent === 1 ? '' : 'a'}.`
}
