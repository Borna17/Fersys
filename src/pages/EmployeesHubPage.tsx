import { GraduationCap, UsersRound } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { EmployeesPage } from './EmployeesPage'
import { InternsPage } from './InternsPage'

export function EmployeesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const active = searchParams.get('view') === 'interns' ? 'interns' : 'employees'

  function setView(view: 'employees' | 'interns') {
    const next = new URLSearchParams(searchParams)
    if (view === 'interns') next.set('view', 'interns')
    else next.delete('view')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="mx-auto w-full max-w-[1550px] overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
        <div className="flex min-w-max gap-1">
          <button
            type="button"
            onClick={() => setView('employees')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
              active === 'employees'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UsersRound size={17} />
            Zaposlenici i korisnici
          </button>
          <button
            type="button"
            onClick={() => setView('interns')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
              active === 'interns'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <GraduationCap size={18} />
            Praktikanti i sati
          </button>
        </div>
      </div>

      {active === 'interns' ? <InternsPage /> : <EmployeesPage />}
    </div>
  )
}
