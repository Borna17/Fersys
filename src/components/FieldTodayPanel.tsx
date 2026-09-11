import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Navigation, Phone, Play, RefreshCw, Wrench } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { getWorkOrders, updateWorkOrder, type CloudWorkOrder } from '../services/workOrders.service'

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

async function notifyInvestor(workOrderId: string, eventType: 'on_my_way' | 'arrived') {
  const { error } = await supabase.functions.invoke('field-service-customer-notify', {
    body: { workOrderId, eventType },
  })
  if (error) console.warn('[FERSYS] Obavijest investitoru nije poslana:', error)
}

export default function FieldTodayPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<CloudWorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')

  async function load() {
    try {
      setLoading(true)
      setOrders(await getWorkOrders())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (location.pathname === '/dashboard') void load()
  }, [location.pathname])

  const todayOrders = useMemo(() => orders
    .filter((order) => order.date === todayKey() && order.status !== 'Završen' && order.status !== 'Otkazan')
    .sort((a, b) => (a.arrivalTime || '23:59').localeCompare(b.arrivalTime || '23:59')),
  [orders])

  if (location.pathname !== '/dashboard') return null
  const next = todayOrders[0]

  async function markStarted(order: CloudWorkOrder) {
    try {
      setBusyId(order.id)
      const updated = await updateWorkOrder(order.id, { status: 'U tijeku' })
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item))
      void notifyInvestor(order.id, 'on_my_way')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Status nije moguće promijeniti.')
    } finally {
      setBusyId('')
    }
  }

  async function markArrived(order: CloudWorkOrder) {
    try {
      setBusyId(order.id)
      const updated = await updateWorkOrder(order.id, {
        status: 'U tijeku',
        arrivalTime: order.arrivalTime || currentTime(),
      })
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item))
      void notifyInvestor(order.id, 'arrived')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Dolazak nije moguće spremiti.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="mx-auto mt-4 w-full max-w-[1700px]">
      <div className="rounded-[1.75rem] border border-blue-500/20 bg-slate-900 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Današnji posao</p>
            <h2 className="mt-1 text-xl font-black text-white">{next ? 'Sljedeći posao' : 'Raspored je čist'}</h2>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-300 disabled:opacity-50" aria-label="Osvježi">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {!next ? (
          <p className="mt-4 text-sm text-slate-400">Nema više zakazanih poslova za danas.</p>
        ) : (
          <div className="mt-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
              <p className="font-black text-white">{next.title || next.orderNumber}</p>
              <p className="mt-1 text-sm text-slate-400">{next.customerName}{next.arrivalTime ? ` · ${next.arrivalTime}` : ''}</p>
              {next.address && <p className="mt-2 text-xs text-slate-500">{next.address}</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
              <button
                type="button"
                disabled={!next.address}
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.address)}`, '_blank', 'noopener,noreferrer')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 text-sm font-black text-white disabled:opacity-40"
              >
                <Navigation size={17} />
                Navigacija
              </button>
              <a
                href={next.customerPhone ? `tel:${next.customerPhone}` : undefined}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-3 text-sm font-black text-slate-200 ${!next.customerPhone ? 'pointer-events-none opacity-40' : ''}`}
              >
                <Phone size={17} />
                Nazovi
              </a>
              <button
                type="button"
                disabled={busyId === next.id || next.status === 'U tijeku'}
                onClick={() => void markStarted(next)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-sm font-black text-emerald-300 disabled:opacity-50"
              >
                <Play size={17} />
                {next.status === 'U tijeku' ? 'U tijeku' : 'Krenuo sam'}
              </button>
              <button
                type="button"
                disabled={busyId === next.id}
                onClick={() => void markArrived(next)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 text-sm font-black text-cyan-300 disabled:opacity-50"
              >
                <CheckCircle2 size={17} />
                Stigao sam
              </button>
              <button type="button" onClick={() => navigate(`/work-orders/${next.id}`)} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-3 text-sm font-black text-violet-300 lg:col-span-1">
                <Wrench size={17} />
                Otvori nalog
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
