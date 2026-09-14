import { Clock3, GraduationCap, UsersRound } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { EmployeeTimePage } from './EmployeeTimePage'
import { EmployeesPage } from './EmployeesPage'
import { InternsPage } from './InternsPage'

type EmployeeView = 'employees' | 'hours' | 'interns'

export function EmployeesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('view')
  const active: EmployeeView = requested === 'interns' ? 'interns' : requested === 'hours' ? 'hours' : 'employees'

  function setView(view: EmployeeView) {
    const next = new URLSearchParams(searchParams)
    if (view === 'employees') next.delete('view')
    else next.set('view', view)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="mx-auto w-full max-w-[1550px] overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
        <div className="flex min-w-max gap-1">
          <button type="button" onClick={() => setView('employees')} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${active === 'employees' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <UsersRound size={17} /> Zaposlenici i korisnici
          </button>
          <button type="button" onClick={() => setView('hours')} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${active === 'hours' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Clock3 size={17} /> Sati i obracun
          </button>
          <button type="button" onClick={() => setView('interns')} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${active === 'interns' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <GraduationCap size={18} /> Praktikanti i sati
          </button>
        </div>
      </div>

      {active === 'interns' ? <InternsPage /> : active === 'hours' ? <EmployeeTimePage /> : <EmployeesPage />}
    </div>
  )
}
