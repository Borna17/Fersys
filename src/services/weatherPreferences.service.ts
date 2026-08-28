import { supabase } from '../lib/supabase'

export type WeatherPreferences = {
  city: string
  latitude: number | null
  longitude: number | null
  timezone: string
  enabled: boolean
  hour: number
}

type GeoResult = { name:string; latitude:number; longitude:number; timezone?:string; admin1?:string; country?:string }

export async function getWeatherPreferences(): Promise<WeatherPreferences> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Korisnik nije prijavljen.')
  const { data, error } = await supabase.from('profiles').select('weather_city,weather_latitude,weather_longitude,weather_timezone,weather_morning_enabled,weather_morning_hour').eq('id', auth.user.id).single()
  if (error) throw error
  return { city:data.weather_city ?? '', latitude:data.weather_latitude ?? null, longitude:data.weather_longitude ?? null, timezone:data.weather_timezone ?? 'Europe/Zagreb', enabled:data.weather_morning_enabled ?? true, hour:data.weather_morning_hour ?? 6 }
}

export async function searchWeatherCity(query:string): Promise<GeoResult[]> {
  const q=query.trim(); if(q.length<2)return []
  const url=new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name',q); url.searchParams.set('count','6'); url.searchParams.set('language','hr'); url.searchParams.set('format','json')
  const response=await fetch(url); if(!response.ok)throw new Error('Grad trenutno nije moguće pronaći.')
  const body=await response.json() as {results?:GeoResult[]}; return body.results ?? []
}

export async function saveWeatherPreferences(value:WeatherPreferences) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Korisnik nije prijavljen.')
  const { error }=await supabase.from('profiles').update({weather_city:value.city,weather_latitude:value.latitude,weather_longitude:value.longitude,weather_timezone:value.timezone||'Europe/Zagreb',weather_morning_enabled:value.enabled,weather_morning_hour:value.hour,weather_last_sent_date:null}).eq('id',auth.user.id)
  if(error)throw error
}
