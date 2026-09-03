import { Building2, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  getMyCompanies,
  setActiveCompany,
  type UserCompany,
} from '../services/companySwitch.service'

export default function CompanySwitcher() {
  const [companies, setCompanies] = useState<UserCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        const next = await getMyCompanies()
        if (!cancelled) setCompanies(next)
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Tvrtke nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const active = useMemo(
    () => companies.find((company) => company.isActive) ?? companies[0],
    [companies],
  )

  if (isLoading || !active) return null

  if (companies.length <= 1) {
    return (
      <div
        className="hidden max-w-56 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 lg:flex"
        title={error || active.companyName}
      >
        <Building2 size={15} className="shrink-0 text-blue-400" />
        <span className="truncate text-xs font-bold text-slate-200">
          {active.companyName}
        </span>
        <span className="text-[9px] font-black text-slate-500">
          {active.countryCode}
        </span>
      </div>
    )
  }

  return (
    <label className="relative hidden lg:block" title={error || 'Promijeni aktivnu tvrtku'}>
      {isSwitching ? (
        <Loader2
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 animate-spin text-blue-400"
        />
      ) : (
        <Building2
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-blue-400"
        />
      )}

      <select
        aria-label="Aktivna tvrtka"
        disabled={isSwitching}
        value={active.companyId}
        onChange={async (event) => {
          const companyId = event.target.value
          if (!companyId || companyId === active.companyId) return

          try {
            setIsSwitching(true)
            setError('')
            await setActiveCompany(companyId)
            window.location.reload()
          } catch (nextError) {
            setError(
              nextError instanceof Error
                ? nextError.message
                : 'Tvrtku nije moguće promijeniti.',
            )
            setIsSwitching(false)
          }
        }}
        className="h-10 max-w-60 appearance-none rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-8 text-xs font-bold text-slate-200 outline-none transition focus:border-blue-500 disabled:opacity-60"
      >
        {companies.map((company) => (
          <option key={company.companyId} value={company.companyId}>
            {company.companyName} · {company.countryCode}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </label>
  )
}
