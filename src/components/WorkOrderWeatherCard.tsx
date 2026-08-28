import { CloudSun, Droplets, MapPin, Wind } from 'lucide-react'

import type { CloudWorkOrder } from '../services/workOrders.service'

type Props = {
  order: CloudWorkOrder
}

function formatRecordedAt(value?: string) {
  if (!value) return ''

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('hr-HR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

export default function WorkOrderWeatherCard({ order }: Props) {
  if (order.weatherTemperatureC == null) {
    return null
  }

  return (
    <section className="rounded-3xl border border-sky-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-400">
            UVJETI NA TERENU
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Vrijeme pri izradi naloga
          </h2>
        </div>

        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-300">
          <CloudSun size={22} />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-800/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Temperatura
          </p>
          <p className="mt-1 text-xl font-black text-white">
            {Math.round(order.weatherTemperatureC)}°C
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {order.weatherCondition || '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-800/60 p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Droplets size={14} />
            <span className="text-[10px] font-black uppercase tracking-wide">
              Vlaga
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-white">
            {order.weatherHumidityPct != null
              ? `${Math.round(order.weatherHumidityPct)}%`
              : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-800/60 p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <Wind size={14} />
            <span className="text-[10px] font-black uppercase tracking-wide">
              Vjetar
            </span>
          </div>
          <p className="mt-2 text-lg font-black text-white">
            {order.weatherWindKmh != null
              ? `${Math.round(order.weatherWindKmh)} km/h`
              : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-800/60 p-3">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin size={14} />
            <span className="text-[10px] font-black uppercase tracking-wide">
              Zabilježeno
            </span>
          </div>
          <p className="mt-2 text-xs font-black leading-5 text-white">
            {formatRecordedAt(order.weatherRecordedAt) || '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-600">
        Vrijednosti su spremljene uz nalog i kasnije se ne mijenjaju s aktualnom prognozom.
      </p>
    </section>
  )
}
