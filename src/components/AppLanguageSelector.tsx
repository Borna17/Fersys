import { useState } from 'react'
import { appLanguages, getAppLanguage, getAppLanguageLabel, setAppLanguage, type AppLanguage } from '../services/appLanguage.service'

export default function AppLanguageSelector() {
  const [language, setLanguageState] = useState<AppLanguage>(() => getAppLanguage())

  function choose(next: AppLanguage) {
    setLanguageState(next)
    setAppLanguage(next)
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <h2 className="text-lg font-black text-white">Jezik aplikacije</h2>
      <p className="mt-2 text-sm text-slate-400">HR, EN, BOS i SRB.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {appLanguages.map((item) => (
          <button key={item} type="button" onClick={() => choose(item)} className={`min-h-11 rounded-2xl border px-3 text-sm font-black ${language === item ? 'border-blue-500 bg-blue-500/15 text-blue-200' : 'border-slate-700 bg-slate-950/50 text-slate-400'}`}>
            {getAppLanguageLabel(item)}
          </button>
        ))}
      </div>
    </section>
  )
}
