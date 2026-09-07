export type WeatherSnapshot = {
  temperatureC: number
  condition: string
  humidityPct: number | null
  windKmh: number | null
  recordedAt: string
  latitude: number
  longitude: number
  source: 'open-meteo'
}

export type DailyWeather = {
  temperatureC: number
  minC: number | null
  maxC: number | null
  condition: string
  precipitationProbabilityPct: number | null
  windKmh: number | null
  latitude: number
  longitude: number
}

export type HourlyWeatherPoint = {
  time: string
  temperatureC: number
  condition: string
  precipitationProbabilityPct: number
  windKmh: number
}

export type TodayHourlyWeather = DailyWeather & {
  hours: HourlyWeatherPoint[]
  rainWindows: Array<{
    from: string
    to: string
    maxProbabilityPct: number
  }>
}

type Coordinates = {
  latitude: number
  longitude: number
}

function weatherLabel(code: number) {
  if (code === 0) return 'Vedro'
  if ([1, 2].includes(code)) return 'Djelomično oblačno'
  if (code === 3) return 'Oblačno'
  if ([45, 48].includes(code)) return 'Magla'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Rosulja'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Kiša'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snijeg'
  if ([95, 96, 99].includes(code)) return 'Grmljavina'
  return 'Promjenjivo'
}

export async function getCurrentDeviceCoordinates(): Promise<Coordinates> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Lokacija nije podržana na ovom uređaju.')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => reject(new Error('Lokacija nije dopuštena ili je trenutno nedostupna.')),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      },
    )
  })
}

function apiConfig() {
  const key = String(import.meta.env.VITE_OPEN_METEO_API_KEY ?? '').trim()

  if (key) {
    return {
      baseUrl: 'https://customer-api.open-meteo.com/v1/forecast',
      apiKey: key,
    }
  }

  return {
    baseUrl: 'https://api.open-meteo.com/v1/forecast',
    apiKey: '',
  }
}

async function fetchWeather(coords: Coordinates) {
  const config = apiConfig()
  const url = new URL(config.baseUrl)

  url.searchParams.set('latitude', String(coords.latitude))
  url.searchParams.set('longitude', String(coords.longitude))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m')
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max')
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m')
  url.searchParams.set('forecast_days', '1')

  if (config.apiKey) {
    url.searchParams.set('apikey', config.apiKey)
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Vrijeme nije moguće dohvatiti (${response.status}).`)
  }

  return response.json() as Promise<any>
}

function dailyWeather(data: any, coords: Coordinates): DailyWeather {
  const current = data.current ?? {}
  const daily = data.daily ?? {}

  return {
    temperatureC: Number(current.temperature_2m ?? 0),
    minC: Number.isFinite(Number(daily.temperature_2m_min?.[0]))
      ? Number(daily.temperature_2m_min[0])
      : null,
    maxC: Number.isFinite(Number(daily.temperature_2m_max?.[0]))
      ? Number(daily.temperature_2m_max[0])
      : null,
    condition: weatherLabel(Number(current.weather_code ?? -1)),
    precipitationProbabilityPct: Number.isFinite(Number(daily.precipitation_probability_max?.[0]))
      ? Number(daily.precipitation_probability_max[0])
      : null,
    windKmh: Number.isFinite(Number(current.wind_speed_10m))
      ? Number(current.wind_speed_10m)
      : null,
    latitude: coords.latitude,
    longitude: coords.longitude,
  }
}

function buildRainWindows(hours: HourlyWeatherPoint[]) {
  const result: TodayHourlyWeather['rainWindows'] = []
  let start = -1

  for (let index = 0; index <= hours.length; index += 1) {
    const rainy = index < hours.length && hours[index].precipitationProbabilityPct >= 40

    if (rainy && start < 0) start = index

    if (!rainy && start >= 0) {
      const slice = hours.slice(start, index)
      result.push({
        from: slice[0].time,
        to: slice[slice.length - 1].time,
        maxProbabilityPct: Math.max(...slice.map((point) => point.precipitationProbabilityPct)),
      })
      start = -1
    }
  }

  return result
}

export async function captureCurrentWeatherSnapshot(): Promise<WeatherSnapshot> {
  const coords = await getCurrentDeviceCoordinates()
  const data = await fetchWeather(coords)
  const current = data.current ?? {}

  return {
    temperatureC: Number(current.temperature_2m ?? 0),
    condition: weatherLabel(Number(current.weather_code ?? -1)),
    humidityPct: Number.isFinite(Number(current.relative_humidity_2m))
      ? Number(current.relative_humidity_2m)
      : null,
    windKmh: Number.isFinite(Number(current.wind_speed_10m))
      ? Number(current.wind_speed_10m)
      : null,
    recordedAt: new Date().toISOString(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    source: 'open-meteo',
  }
}

export async function getTodayWeatherForCurrentLocation(): Promise<DailyWeather> {
  const coords = await getCurrentDeviceCoordinates()
  const data = await fetchWeather(coords)
  return dailyWeather(data, coords)
}

export async function getTodayHourlyWeatherForCurrentLocation(): Promise<TodayHourlyWeather> {
  const coords = await getCurrentDeviceCoordinates()
  const data = await fetchWeather(coords)
  const hourly = data.hourly ?? {}
  const times: string[] = Array.isArray(hourly.time) ? hourly.time : []
  const now = new Date()

  const points = times.map((time, index) => ({
    time,
    temperatureC: Number(hourly.temperature_2m?.[index] ?? 0),
    condition: weatherLabel(Number(hourly.weather_code?.[index] ?? -1)),
    precipitationProbabilityPct: Number(hourly.precipitation_probability?.[index] ?? 0),
    windKmh: Number(hourly.wind_speed_10m?.[index] ?? 0),
  }))

  const future = points.filter((point) => {
    const value = new Date(point.time)
    return Number.isNaN(value.getTime()) || value.getTime() >= now.getTime() - 60 * 60 * 1000
  })

  return {
    ...dailyWeather(data, coords),
    hours: future,
    rainWindows: buildRainWindows(future),
  }
}
