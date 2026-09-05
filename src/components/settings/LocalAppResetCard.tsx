import { useState } from 'react'
import { RefreshCcw, Trash2 } from 'lucide-react'

import { resetLocalFersysApp } from '../../services/localAppReset.service'

export default function LocalAppResetCard() {
  const [isResetting, setIsResetting] = useState(false)

  async function handleReset() {
    if (isResetting) return

    const confirmed = window.confirm(
      'Potpuni lokalni reset briše cache, lokalne privremene podatke i lokalne nedovršene nacrte na ovom uređaju te će te odjaviti. Podaci spremljeni u FERSYS bazi (radni nalozi, kupci, ponude, računi i ostalo) neće se brisati. Nastaviti?',
    )

    if (!confirmed) return

    try {
      setIsResetting(true)
      await resetLocalFersysApp()
    } catch (error) {
      console.error('Lokalni reset FERSYS-a nije uspio:', error)
      alert('Lokalni reset nije uspio. Pokušaj ponovno nakon zatvaranja drugih FERSYS kartica.')
      setIsResetting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.06] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-500/10 text-rose-300">
          <RefreshCcw size={20} />
        </div>

        <div className="min-w-0">
          <h3 className="font-black text-white">Reset lokalne aplikacije</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Koristi ako FERSYS nakon nadogradnje zapne na učitavanju, prikazuje staru verziju ili lokalni cache napravi problem.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-xs leading-5 text-slate-400">
        Ne briše podatke spremljene na serveru. Briše lokalni cache, lokalne nacrte i lokalnu prijavu na ovom uređaju, pa je nakon reseta potrebna nova prijava.
      </div>

      <button
        type="button"
        disabled={isResetting}
        onClick={() => void handleReset()}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 font-bold text-rose-200 disabled:opacity-50"
      >
        <Trash2 size={18} />
        {isResetting ? 'Resetiranje...' : 'Potpuni lokalni reset'}
      </button>
    </div>
  )
}
