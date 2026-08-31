import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  approveCompanyRegistration,
  getCompanyRegistrationRequests,
  rejectCompanyRegistration,
  type CompanyRegistrationRequest,
} from './services/companyVerification.service'

export default function AdminCompanyVerificationPanel() {
  const [items, setItems] = useState<CompanyRegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setItems(await getCompanyRegistrationRequests())
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Zahtjeve nije moguće učitati.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const pending = useMemo(() => items.filter((item) => item.verificationStatus === 'pending'), [items])

  async function approve(item: CompanyRegistrationRequest) {
    if (!window.confirm(`Potvrditi tvrtku ${item.companyName} (OIB ${item.companyOib})?`)) return
    try {
      setWorkingId(item.companyId)
      setError('')
      await approveCompanyRegistration(item.companyId)
      await load()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Tvrtku nije moguće potvrditi.')
    } finally {
      setWorkingId('')
    }
  }

  async function reject(item: CompanyRegistrationRequest) {
    const reason = window.prompt('Razlog odbijanja (opcionalno):', '')
    if (reason === null) return
    if (!window.confirm(`Odbiti prijavu za ${item.companyName}?`)) return
    try {
      setWorkingId(item.companyId)
      setError('')
      await rejectCompanyRegistration(item.companyId, reason)
      await load()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Prijavu nije moguće odbiti.')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <section className="mt-7 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-slate-900 to-violet-500/[0.06]">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-300"><ShieldCheck size={22} /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white">Zahtjevi za registraciju</h2>
              {pending.length > 0 && <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-slate-950">{pending.length} čeka</span>}
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">Nova tvrtka ne može koristiti FERSYS dok je ovdje ne potvrdiš. Provjeri naziv, OIB, vlasnika i e-mail prije odobravanja.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-300 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />Osvježi</button>
      </div>

      {error && <div className="m-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Učitavanje zahtjeva...</div>
      ) : pending.length === 0 ? (
        <div className="flex items-center gap-3 p-5 text-sm text-slate-400"><CheckCircle2 size={20} className="text-emerald-400" />Trenutno nema novih prijava koje čekaju potvrdu.</div>
      ) : (
        <div className="divide-y divide-slate-800">
          {pending.map((item) => (
            <article key={item.companyId} className="grid gap-4 p-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-center">
              <div className="min-w-0">
                <p className="font-black text-white">{item.companyName}</p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400"><span>OIB <strong className="text-slate-200">{item.companyOib || '—'}</strong></span><span>Kod <strong className="text-slate-200">{item.companyCode || '—'}</strong></span></div>
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-200">{item.ownerName || 'Vlasnik nije naveden'}</p>
                <p className="mt-1 text-xs text-slate-500">{item.ownerEmail || 'Nema e-maila'}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={14} />{item.submittedAt ? new Date(item.submittedAt).toLocaleString('hr-HR') : '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 xl:w-[230px]">
                <button type="button" disabled={workingId === item.companyId} onClick={() => void approve(item)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"><CheckCircle2 size={17} />Potvrdi</button>
                <button type="button" disabled={workingId === item.companyId} onClick={() => void reject(item)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 text-sm font-black text-red-300 hover:bg-red-500/15 disabled:opacity-50"><XCircle size={17} />Odbij</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
