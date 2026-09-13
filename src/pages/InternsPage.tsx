import {
  ArrowLeft,
  CalendarDays,
  Download,
  GraduationCap,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  UserRoundPlus,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import { useAuth } from '../auth/AuthProvider'
import {
  createIntern,
  deleteIntern,
  deleteInternTimeEntry,
  exportInternEntriesToExcel,
  getInterns,
  getInternTimeEntries,
  setInternActive,
  sumInternHours,
  upsertInternTimeEntry,
  type Intern,
  type InternTimeEntry,
} from '../services/interns.service'

function todayIso() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHours(value: number) {
  return `${value.toLocaleString('hr-HR', { maximumFractionDigits: 2 })} h`
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date)
}

export function InternsPage() {
  const { can } = useAuth()
  const canManage = can('employees.manage')
  const canDelete = can('employees.delete')

  const [interns, setInterns] = useState<Intern[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [entries, setEntries] = useState<InternTimeEntry[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)

  const now = new Date()
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()))
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1))

  const [workDate, setWorkDate] = useState(todayIso())
  const [workHours, setWorkHours] = useState('')
  const [workNote, setWorkNote] = useState('')

  const selected = useMemo(
    () => interns.find((intern) => intern.id === selectedId) ?? null,
    [interns, selectedId],
  )

  const loadInterns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const next = await getInterns()
      setInterns(next)
      setSelectedId((current) =>
        current && next.some((item) => item.id === current)
          ? current
          : next[0]?.id ?? '',
      )
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Praktikante nije moguće učitati.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadEntries = useCallback(async (internId: string) => {
    if (!internId) {
      setEntries([])
      return
    }
    try {
      setEntriesLoading(true)
      setError('')
      setEntries(await getInternTimeEntries(internId))
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Evidenciju sati nije moguće učitati.')
    } finally {
      setEntriesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInterns()
  }, [loadInterns])

  useEffect(() => {
    void loadEntries(selectedId)
  }, [selectedId, loadEntries])

  const filteredInterns = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('hr-HR')
    if (!needle) return interns
    return interns.filter((intern) =>
      [intern.fullName, intern.schoolName, intern.programName]
        .join(' ')
        .toLocaleLowerCase('hr-HR')
        .includes(needle),
    )
  }, [interns, search])

  const years = useMemo(() => {
    const values = new Set<number>([now.getFullYear()])
    entries.forEach((entry) => values.add(Number(entry.workDate.slice(0, 4))))
    if (selected?.startDate) values.add(Number(selected.startDate.slice(0, 4)))
    return [...values].filter(Number.isFinite).sort((a, b) => b - a)
  }, [entries, selected?.startDate])

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      const [year, month] = entry.workDate.split('-').map(Number)
      const yearOk = filterYear === 'all' || year === Number(filterYear)
      const monthOk = filterMonth === 'all' || month === Number(filterMonth)
      return yearOk && monthOk
    })
  }, [entries, filterYear, filterMonth])

  const monthEntries = useMemo(() => {
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    return entries.filter((entry) => {
      const [year, month] = entry.workDate.split('-').map(Number)
      return year === y && month === m
    })
  }, [entries])

  const yearEntries = useMemo(() => {
    const y = now.getFullYear()
    return entries.filter((entry) => Number(entry.workDate.slice(0, 4)) === y)
  }, [entries])

  const filteredTotal = sumInternHours(visibleEntries)
  const overallTotal = sumInternHours(entries)
  const targetProgress = selected?.targetHours && selected.targetHours > 0
    ? Math.min(100, Math.round((overallTotal / selected.targetHours) * 100))
    : null

  async function saveWorkEntry(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    try {
      setBusy(true)
      setError('')
      setSuccess('')
      await upsertInternTimeEntry({
        internId: selected.id,
        workDate,
        hours: Number(workHours.replace(',', '.')),
        note: workNote,
      })
      setWorkHours('')
      setWorkNote('')
      setSuccess(`Sati za ${selected.fullName} su spremljeni.`)
      await loadEntries(selected.id)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Sate nije moguće spremiti.')
    } finally {
      setBusy(false)
    }
  }

  async function removeEntry(entry: InternTimeEntry) {
    if (!window.confirm(`Obrisati evidenciju za ${formatDate(entry.workDate)}?`)) return
    try {
      setBusy(true)
      setError('')
      await deleteInternTimeEntry(entry.id)
      if (selected) await loadEntries(selected.id)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Zapis nije moguće obrisati.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(intern: Intern) {
    try {
      setBusy(true)
      setError('')
      await setInternActive(intern.id, !intern.isActive)
      await loadInterns()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Status nije moguće promijeniti.')
    } finally {
      setBusy(false)
    }
  }

  async function removeIntern(intern: Intern) {
    if (!window.confirm(`Trajno obrisati praktikanta ${intern.fullName} i svu njegovu evidenciju sati?`)) return
    try {
      setBusy(true)
      setError('')
      await deleteIntern(intern.id)
      setSuccess(`${intern.fullName} je obrisan.`)
      await loadInterns()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Praktikanta nije moguće obrisati.')
    } finally {
      setBusy(false)
    }
  }

  function exportExcel() {
    if (!selected) return
    const label = [
      filterYear === 'all' ? 'sve-godine' : filterYear,
      filterMonth === 'all' ? 'svi-mjeseci' : `mjesec-${filterMonth}`,
    ].join('-')
    exportInternEntriesToExcel(selected, visibleEntries, label)
  }

  if (isLoading) return <FersysLoader text="Učitavanje praktikanta..." />

  return (
    <section className="mx-auto w-full max-w-[1550px] space-y-4 pb-10 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/35 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to="/settings/employees" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={15} /> Zaposlenici
            </Link>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Praktikanti i evidencija sati</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Vodi praksu bez korisničkog računa. Praktikant ne zauzima FERSYS korisničko mjesto, a sati se zbrajaju po danu, mjesecu, godini i ukupno.
            </p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-300">
            <GraduationCap size={23} />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Metric label="Praktikanti" value={interns.length.toString()} />
          <Metric label="Aktivni" value={interns.filter((item) => item.isActive).length.toString()} />
          <Metric label="Ukupno sati" value={formatHours(interns.length ? overallTotal : 0)} />
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadInterns()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white hover:bg-slate-700">
            <RefreshCw size={17} /> Osvježi
          </button>
          {canManage && (
            <button type="button" onClick={() => setIsAddOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-black text-white hover:bg-cyan-500">
              <UserRoundPlus size={18} /> Novi praktikant
            </button>
          )}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">{success}</div>}

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr] xl:gap-6">
        <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4 sm:p-5">
            <h2 className="text-lg font-black text-white">Praktikanti</h2>
            <div className="relative mt-3">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pretraži ime, školu ili program..." className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-11 pr-3 text-sm text-white outline-none focus:border-cyan-500" />
            </div>
          </div>

          <div className="max-h-[660px] overflow-y-auto">
            {filteredInterns.map((intern) => (
              <button
                key={intern.id}
                type="button"
                onClick={() => setSelectedId(intern.id)}
                className={`w-full border-b border-slate-800 p-4 text-left transition ${selectedId === intern.id ? 'bg-cyan-500/10' : 'hover:bg-slate-800/55'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{intern.fullName}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{intern.schoolName || intern.programName || 'Praktikant bez pristupa aplikaciji'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${intern.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                    {intern.isActive ? 'Aktivan' : 'Završen'}
                  </span>
                </div>
              </button>
            ))}
            {filteredInterns.length === 0 && <p className="px-5 py-14 text-center text-sm text-slate-500">Nema praktikanta.</p>}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          {!selected ? (
            <div className="grid min-h-[320px] place-items-center text-center text-slate-500">
              <div><GraduationCap size={38} className="mx-auto mb-3 opacity-60" />Odaberi praktikanta ili dodaj novog.</div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">EVIDENCIJA PRAKSE</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{selected.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {[selected.schoolName, selected.programName].filter(Boolean).join(' • ') || 'Bez dodatnih podataka'}
                  </p>
                  {(selected.startDate || selected.endDate) && (
                    <p className="mt-1 text-xs text-slate-600">{formatDate(selected.startDate)} – {formatDate(selected.endDate)}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage && (
                    <button type="button" onClick={() => void toggleActive(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700">
                      <Power size={15} /> {selected.isActive ? 'Završi praksu' : 'Ponovno aktiviraj'}
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" onClick={() => void removeIntern(selected)} className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20" aria-label="Obriši praktikanta">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Ovaj mjesec" value={formatHours(sumInternHours(monthEntries))} />
                <Metric label="Ova godina" value={formatHours(sumInternHours(yearEntries))} />
                <Metric label="Ukupno" value={formatHours(overallTotal)} />
                <Metric label="Cilj" value={selected.targetHours == null ? '—' : formatHours(selected.targetHours)} />
              </div>

              {targetProgress != null && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>Napredak prema ciljanim satima</span><span>{targetProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${targetProgress}%` }} />
                  </div>
                </div>
              )}

              {canManage && selected.isActive && (
                <form onSubmit={saveWorkEntry} className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.045] p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays size={17} className="text-cyan-300" /> Upiši sate</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.65fr_1.8fr_auto]">
                    <input type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} required className={inputClass} />
                    <input inputMode="decimal" value={workHours} onChange={(event) => setWorkHours(event.target.value)} placeholder="Sati npr. 7.5" required className={inputClass} />
                    <input value={workNote} onChange={(event) => setWorkNote(event.target.value)} placeholder="Napomena / što je radio — opcionalno" className={inputClass} />
                    <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-black text-white disabled:opacity-50"><Plus size={17} /> Spremi</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Ako za isti datum ponovno spremiš sate, prethodni zapis tog dana će se ažurirati.</p>
                </form>
              )}

              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-black text-white">Pregled i izvoz</p>
                    <p className="mt-1 text-xs text-slate-500">Filtriraj mjesec ili godinu i izvezi istu evidenciju u Excel.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)} className={selectClass}>
                      <option value="all">Sve godine</option>
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)} className={selectClass}>
                      <option value="all">Svi mjeseci</option>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>{new Intl.DateTimeFormat('hr-HR', { month: 'long' }).format(new Date(2026, month - 1, 1))}</option>
                      ))}
                    </select>
                    <button type="button" onClick={exportExcel} disabled={visibleEntries.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-40"><Download size={15} /> Excel</button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3">
                  <span className="text-sm text-slate-400">Ukupno u odabranom razdoblju</span>
                  <strong className="text-lg text-white">{formatHours(filteredTotal)}</strong>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-slate-950 text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <tr><th className="px-4 py-3">Datum</th><th className="px-4 py-3">Dan</th><th className="px-4 py-3">Sati</th><th className="px-4 py-3">Napomena</th><th className="px-4 py-3 text-right">Akcija</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {visibleEntries.map((entry) => (
                        <tr key={entry.id} className="bg-slate-900/60">
                          <td className="px-4 py-3 font-bold text-white">{formatDate(entry.workDate)}</td>
                          <td className="px-4 py-3 text-slate-400">{new Intl.DateTimeFormat('hr-HR', { weekday: 'long' }).format(new Date(`${entry.workDate}T12:00:00`))}</td>
                          <td className="px-4 py-3 font-black text-cyan-300">{formatHours(entry.hours)}</td>
                          <td className="max-w-[340px] px-4 py-3 text-slate-400">{entry.note || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {canDelete && <button type="button" onClick={() => void removeEntry(entry)} className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20" aria-label="Obriši zapis"><Trash2 size={15} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {entriesLoading && <p className="py-10 text-center text-sm text-slate-500">Učitavanje evidencije...</p>}
                {!entriesLoading && visibleEntries.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nema upisanih sati za odabrano razdoblje.</p>}
              </div>

              <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.045] p-4 text-sm leading-6 text-slate-400">
                <strong className="text-violet-300">FERSYS AI:</strong> možeš reći npr. „Upiši da je praktikant Ivan Horvat danas odradio 7 sati” ili „Evidentiraj da je praktikantica Ana Marić jučer radila 6,5 sati”.
              </div>
            </div>
          )}
        </article>
      </div>

      {isAddOpen && (
        <AddInternModal
          onClose={() => setIsAddOpen(false)}
          onCreated={async (intern) => {
            setIsAddOpen(false)
            setSuccess(`${intern.fullName} je dodan kao praktikant bez pristupa aplikaciji.`)
            await loadInterns()
            setSelectedId(intern.id)
          }}
        />
      )}

      {busy && <FersysLoader fullScreen text="Spremanje evidencije..." />}
    </section>
  )
}

function AddInternModal({ onClose, onCreated }: { onClose: () => void; onCreated: (intern: Intern) => Promise<void> | void }) {
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [programName, setProgramName] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState('')
  const [targetHours, setTargetHours] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      setBusy(true)
      setError('')
      const intern = await createIntern({
        fullName,
        schoolName,
        programName,
        startDate,
        endDate,
        targetHours: targetHours.trim() ? Number(targetHours.replace(',', '.')) : null,
        notes,
      })
      await onCreated(intern)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Praktikanta nije moguće dodati.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">PRAKTIKANT BEZ RAČUNA</p><h2 className="mt-1 text-2xl font-black text-white">Novi praktikant</h2></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"><X size={17} /></button>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Ime i prezime *"><input value={fullName} onChange={(event) => setFullName(event.target.value)} required className={inputClass} placeholder="Ivan Horvat" /></Field>
          <Field label="Škola — opcionalno"><input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} className={inputClass} placeholder="Naziv škole" /></Field>
          <Field label="Program / zanimanje — opcionalno"><input value={programName} onChange={(event) => setProgramName(event.target.value)} className={inputClass} placeholder="npr. Elektrotehničar" /></Field>
          <Field label="Ciljani broj sati — opcionalno"><input inputMode="decimal" value={targetHours} onChange={(event) => setTargetHours(event.target.value)} className={inputClass} placeholder="npr. 320" /></Field>
          <Field label="Početak prakse"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></Field>
          <Field label="Kraj prakse — opcionalno"><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Napomena — opcionalno"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} mt-2 min-h-24 py-3`} placeholder="Mentor, razred, posebna napomena..." /></Field>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-slate-800 px-4 text-sm font-bold text-slate-300">Odustani</button>
          <button disabled={busy} className="min-h-11 rounded-xl bg-cyan-600 px-5 text-sm font-black text-white disabled:opacity-50">{busy ? 'Spremanje...' : 'Dodaj praktikanta'}</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-300">{label}{children}</label>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3 text-center">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-white sm:text-xl">{value}</p>
    </div>
  )
}

const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500'
const selectClass = 'min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 outline-none focus:border-cyan-500'
