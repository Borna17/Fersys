import { CloudRain, CloudSun, MapPin, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  getTodayWeatherForCurrentLocation,
  type DailyWeather,
} from '../services/weather.service'

export default function WeatherDashboardCard() {
  const [weather, setWeather] = useState<DailyWeather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setLoading(true)
        setError('')

        const next = await getTodayWeatherForCurrentLocation()

        if (!cancelled) {
          setWeather(next)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Vrijeme trenutno nije dostupno.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const Icon =
    weather?.condition === 'Kiša' ||
    weather?.condition === 'Rosulja' ||
    weather?.condition === 'Grmljavina'
      ? CloudRain
      : CloudSun

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-sky-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/35 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-400">
            FERSYS WEATHER
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Današnje vrijeme
          </h2>
        </div>

        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-300">
          <Icon size={22} />
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">
          Dohvaćam vrijeme za trenutnu lokaciju...
        </p>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
          <p className="text-sm font-semibold text-slate-300">
            {error}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Dopusti lokaciju uređaja kako bi FERSYS mogao prikazati lokalnu prognozu.
          </p>
        </div>
      ) : weather ? (
        <>
          <div className="mt-4 flex items-end gap-3">
            <p className="text-4xl font-black tracking-tight text-white">
              {Math.round(weather.temperatureC)}°C
            </p>
            <div className="pb-1">
              <p className="text-sm font-black text-sky-200">
                {weather.condition}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {weather.minC !== null && weather.maxC !== null
                  ? `${Math.round(weather.minC)}° / ${Math.round(weather.maxC)}°`
                  : 'Danas'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-800/60 p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <CloudRain size={15} />
                <span className="text-[10px] font-black uppercase tracking-wide">
                  Oborine
                </span>
              </div>
              <p className="mt-1 text-sm font-black text-white">
                {weather.precipitationProbabilityPct !== null
                  ? `${Math.round(weather.precipitationProbabilityPct)}%`
                  : '—'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-800/60 p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Wind size={15} />
                <span className="text-[10px] font-black uppercase tracking-wide">
                  Vjetar
                </span>
              </div>
              <p className="mt-1 text-sm font-black text-white">
                {weather.windKmh !== null
                  ? `${Math.round(weather.windKmh)} km/h`
                  : '—'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              Trenutna lokacija uređaja
            </span>
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 hover:text-slate-400"
            >
              Open-Meteo
            </a>
          </div>
        </>
      ) : null}
    </section>
  )
}
