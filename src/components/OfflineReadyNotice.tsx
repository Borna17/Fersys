import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineReadyNotice() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed bottom-[max(1rem,var(--fersys-safe-bottom))] left-1/2 z-[190] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex gap-3">
        <WifiOff size={20} className="mt-0.5 shrink-0 text-amber-300" />
        <div>
          <p className="font-black text-white">Aplikacija je offline</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Prikazuju se zadnje spremljeni investitori i radni nalozi. Nedovršeni radni nalog ostaje spremljen kao nacrt dok se internet ne vrati.</p>
        </div>
      </div>
    </div>
  )
}
