import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Wrench } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { getWorkOrders, type CloudWorkOrder } from '../services/workOrders.service'

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function FieldTodayPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<CloudWorkOrder[]>([])
  const [loading, setLoading] = useState(false)

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
            <button type="button" onClick={() => navigate(`/work-orders/${next.id}`)} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-3 text-sm font-black text-violet-300"><Wrench size={17} />Otvori nalog</button>
          </div>
        )}
      </div>
    </section>
  )
}
