import { Clock3, Download, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getEmployees } from '../services/employees.service'
import {
  createExternalWorker,
  deleteEmployeeTimeEntry,
  exportEmployeeTimeExcel,
  getEmployeeTimeEntries,
  getWorkforcePeople,
  saveEmployeeTimeEntry,
  summarizeWorker,
  syncAppEmployees,
  type EmployeeTimeEntry,
  type WorkforcePerson,
} from '../services/employeeTime.service'

const field = 'h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500'
const now = new Date()

export function EmployeeTimePage() {
  const [workers, setWorkers] = useState<WorkforcePerson[]>([])
  const [entries, setEntries] = useState<EmployeeTimeEntry[]>([])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [workerId, setWorkerId] = useState('')
  const [workDate, setWorkDate] = useState(now.toISOString().slice(0, 10))
  const [regularHours, setRegularHours] = useState('8')
  const [overtimeHours, setOvertimeHours] = useState('0')
  const [nightHours, setNightHours] = useState('0')
  const [leaveType, setLeaveType] = useState('work')
  const [note, setNote] = useState('')
  const [newWorkerName, setNewWorkerName] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')

  async function load(sync = false) {
    try {
      setLoading(true)
      setError('')
      let people = await getWorkforcePeople()
      if (sync) {
        people = await syncAppEmployees(await getEmployees())
        setMessage('Korisnici iz modula Zaposlenici povezani su s evidencijom sati.')
      }
      setWorkers(people)
      setEntries(await getEmployeeTimeEntries(year, month))
      if (!workerId && people[0]) setWorkerId(people[0].id)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Evidenciju nije moguće učitati.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await syncAppEmployees(await getEmployees())
      } catch (syncError) {
        console.warn('[FERSYS] Zaposlenike nije moguće automatski povezati s evidencijom sati:', syncError)
      }
      await load()
    })()
  }, [year, month])

  const summaries = useMemo(() => workers.map((worker) => ({ worker, summary: summarizeWorker(worker, entries) })), [workers, entries])

  async function addEntry() {
    if (!workerId) return setError('Odaberi radnika.')
    const hours = Math.max(0, Number(regularHours.replace(',', '.')) || 0)
    const overtime = Math.max(0, Number(overtimeHours.replace(',', '.')) || 0)
    try {
      setWorking(true); setError(''); setMessage('')
      await saveEmployeeTimeEntry({
        workerId, workOrderId: '', workDate, startTime: '', endTime: '', breakMinutes: 0,
        regularHours: leaveType === 'work' ? hours : 0,
        overtimeHours: leaveType === 'work' ? overtime : 0,
        nightHours: leaveType === 'work' ? Math.max(0, Number(nightHours.replace(',', '.')) || 0) : 0,
        sundayHours: 0, holidayHours: 0,
        vacationHours: leaveType === 'vacation' ? hours : 0,
        sickLeaveHours: leaveType === 'sick' ? hours : 0,
        paidLeaveHours: leaveType === 'paid' ? hours : 0,
        travelHours: 0, note, source: 'manual', sourceRef: '',
      })
      setNote(''); setOvertimeHours('0'); setNightHours('0')
      setMessage('Sati su spremljeni.')
      await load()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Sate nije moguće spremiti.')
    } finally { setWorking(false) }
  }

  async function addExternalWorker() {
    try {
      setWorking(true); setError(''); setMessage('')
      const worker = await createExternalWorker({ fullName: newWorkerName, hourlyRate: hourlyRate ? Number(hourlyRate.replace(',', '.')) : null })
      setNewWorkerName(''); setHourlyRate(''); setWorkerId(worker.id)
      setMessage('Radnik bez FERSYS korisničkog računa je dodan.')
      await load()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Radnika nije moguće dodati.')
    } finally { setWorking(false) }
  }

  async function removeEntry(id: string) {
    if (!window.confirm('Obrisati ovu evidenciju sati?')) return
    try { await deleteEmployeeTimeEntry(id); await load() } catch (value) { setError(value instanceof Error ? value.message : 'Stavku nije moguće obrisati.') }
  }

  return (
    <section className="mx-auto w-full max-w-[1550px] space-y-5 pb-28 text-white">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-300"><Clock3 size={15}/>Radno vrijeme</div><h1 className="mt-3 text-3xl font-black">Sati i priprema obračuna plaće</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Jedna evidencija za radnike s FERSYS računom i bez njega. Redovni, prekovremeni, noćni sati, dopusti i odsutnosti ostaju povezani za mjesečni obračun i AI.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => void load(true)} disabled={working} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-black"><RefreshCw size={16}/>Poveži korisnike</button><button onClick={() => exportEmployeeTimeExcel(workers, entries, year, month)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black"><Download size={16}/>Excel obračun</button></div>
      </header>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Mjesečni pregled</h2><div className="flex gap-2"><select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={field}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}. mjesec</option>)}</select><input type="number" value={year} onChange={(e)=>setYear(Number(e.target.value))} className={`${field} w-28`}/></div></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Radnik</th><th>Redovni</th><th>Prekovremeni</th><th>Noćni</th><th>Godišnji</th><th>Bolovanje</th><th>Ukupno</th><th>Procjena osnovice</th></tr></thead><tbody>{summaries.map(({worker,summary})=><tr key={worker.id} className="border-t border-slate-800"><td className="py-3 font-bold">{worker.fullName}<div className="text-xs font-normal text-slate-500">{worker.membershipId ? 'FERSYS korisnik' : 'Evidencijski radnik'}</div></td><td>{summary.regular.toFixed(2)}</td><td>{summary.overtime.toFixed(2)}</td><td>{summary.night.toFixed(2)}</td><td>{summary.vacation.toFixed(2)}</td><td>{summary.sick.toFixed(2)}</td><td className="font-black">{summary.recorded.toFixed(2)} h</td><td>{summary.baseEstimate == null ? '—' : `${summary.baseEstimate.toFixed(2)} €`}</td></tr>)}</tbody></table>{!loading && !workers.length && <p className="py-8 text-center text-sm text-slate-500">Još nema radnika u evidenciji.</p>}</div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Brzi unos sati</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select value={workerId} onChange={(e)=>setWorkerId(e.target.value)} className={`${field} sm:col-span-2`}><option value="">Odaberi radnika</option>{workers.filter(w=>w.isActive).map(w=><option key={w.id} value={w.id}>{w.fullName}</option>)}</select><input type="date" value={workDate} onChange={(e)=>setWorkDate(e.target.value)} className={field}/><select value={leaveType} onChange={(e)=>setLeaveType(e.target.value)} className={field}><option value="work">Rad</option><option value="vacation">Godišnji odmor</option><option value="sick">Bolovanje</option><option value="paid">Plaćeni dopust</option></select><label className="text-xs font-bold text-slate-400">Sati<input value={regularHours} onChange={(e)=>setRegularHours(e.target.value)} inputMode="decimal" className={`mt-1 ${field}`}/></label><label className="text-xs font-bold text-slate-400">Prekovremeni<input value={overtimeHours} onChange={(e)=>setOvertimeHours(e.target.value)} inputMode="decimal" disabled={leaveType!=='work'} className={`mt-1 ${field}`}/></label><label className="text-xs font-bold text-slate-400">Noćni sati<input value={nightHours} onChange={(e)=>setNightHours(e.target.value)} inputMode="decimal" disabled={leaveType!=='work'} className={`mt-1 ${field}`}/></label><input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Napomena" className={field}/></div><button onClick={() => void addEntry()} disabled={working} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black"><Plus size={17}/>Spremi evidenciju</button></div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h2 className="flex items-center gap-2 font-black"><UserPlus size={18}/>Radnik bez aplikacije</h2><p className="mt-1 text-xs leading-5 text-slate-500">Dodaj osobu kojoj ne treba prijava u FERSYS, ali želiš voditi sate i obračun.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={newWorkerName} onChange={(e)=>setNewWorkerName(e.target.value)} placeholder="Ime i prezime" className={field}/><input value={hourlyRate} onChange={(e)=>setHourlyRate(e.target.value)} inputMode="decimal" placeholder="Satnica € (opcionalno)" className={field}/></div><button onClick={() => void addExternalWorker()} disabled={working || !newWorkerName.trim()} className="mt-3 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 text-sm font-black disabled:opacity-50">Dodaj radnika</button></div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Evidencije za odabrani mjesec</h2><div className="mt-3 space-y-2">{entries.map(entry => { const worker=workers.find(w=>w.id===entry.workerId); return <div key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{worker?.fullName ?? 'Radnik'} · {entry.workDate}</div><div className="mt-1 text-xs text-slate-500">Redovno {entry.regularHours} h · prekovremeno {entry.overtimeHours} h · godišnji {entry.vacationHours} h · bolovanje {entry.sickLeaveHours} h{entry.note ? ` · ${entry.note}` : ''}</div></div><button onClick={() => void removeEntry(entry.id)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16}/></button></div>})}{!entries.length && <p className="py-5 text-sm text-slate-500">Nema evidentiranih sati za ovaj mjesec.</p>}</div></div>
      <p className="text-xs leading-5 text-slate-500">Procjena osnovice služi kao interna pomoć prema unesenoj satnici; konačni obračun plaće, doprinosa i dodataka potvrđuje računovodstvo.</p>
    </section>
  )
}
