import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type StatusPayload = {
  success?: boolean
  status?: string
  companyName?: string
  adminReason?: string
  deadline?: string | null
  message?: string
  error?: string
}

export function CompanyDeletionResponsePage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const initialChoice = params.get('choice') === 'keep' ? 'keep' : params.get('choice') === 'delete' ? 'delete' : ''
  const [data, setData] = useState<StatusPayload | null>(null)
  const [choice, setChoice] = useState<'delete' | 'keep' | ''>(initialChoice)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const loadStatus = useCallback(async () => {
    if (!token) {
      setError('Poveznica nije valjana. Otvorite cijelu poveznicu iz FERSYS e-maila.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const { data: response, error: invokeError } = await supabase.functions.invoke('company-deletion-response', {
        body: { token, action: 'status' },
      })
      if (invokeError) throw invokeError
      if (response?.error) throw new Error(String(response.error))
      setData(response ?? {})
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Zahtjev nije moguće učitati.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function submitKeep() {
    if (reason.trim().length < 5) {
      setError('Napišite kratko obrazloženje od najmanje 5 znakova.')
      return
    }
    await submit('request_keep', reason.trim())
  }

  async function submitDelete() {
    const confirmed = window.confirm('Potvrđujete trajno brisanje tvrtke i svih povezanih podataka? Ova radnja se ne može poništiti.')
    if (!confirmed) return
    await submit('confirm_delete')
  }

  async function submit(action: 'request_keep' | 'confirm_delete', keepReason = '') {
    try {
      setSubmitting(true)
      setError('')
      const { data: response, error: invokeError } = await supabase.functions.invoke('company-deletion-response', {
        body: { token, action, reason: keepReason },
      })
      if (invokeError) throw invokeError
      if (response?.error) throw new Error(String(response.error))
      setDone(String(response?.message ?? (action === 'request_keep' ? 'Zahtjev je uspješno poslan administraciji.' : 'Tvrtka je trajno obrisana.')))
      setData((current) => ({ ...current, status: action === 'request_keep' ? 'owner_requested_keep' : 'deleted' }))
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Odgovor nije moguće poslati.')
    } finally {
      setSubmitting(false)
    }
  }

  const deadline = data?.deadline
    ? new Intl.DateTimeFormat('hr-HR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.deadline))
    : '—'

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-white sm:py-14">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 to-violet-600" />
        <div className="p-6 sm:p-9">
          <img src="/fersys-auth-logo.svg" alt="FERSYS" className="h-12 w-auto" />

          {loading ? (
            <div className="py-16 text-center text-slate-400">Učitavanje zahtjeva...</div>
          ) : error && !data ? (
            <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">
              <div className="flex items-center gap-3 font-black"><AlertTriangle size={20} /> Poveznica nije dostupna</div>
              <p className="mt-2 text-sm leading-6 text-red-200/80">{error}</p>
            </div>
          ) : done ? (
            <div className="mt-8 text-center">
              <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
              <h1 className="mt-5 text-2xl font-black">Odgovor je zaprimljen</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">{done}</p>
            </div>
          ) : data?.status === 'owner_requested_keep' ? (
            <div className="mt-8 text-center">
              <ShieldCheck className="mx-auto text-violet-400" size={48} />
              <h1 className="mt-5 text-2xl font-black">Zahtjev za zadržavanje je zaprimljen</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">Rok za brisanje je zaustavljen dok FERSYS administracija pregleda vaše obrazloženje. O odluci ćete biti obaviješteni e-mailom.</p>
            </div>
          ) : data?.status === 'deleted' ? (
            <div className="mt-8 text-center">
              <CheckCircle2 className="mx-auto text-slate-400" size={48} />
              <h1 className="mt-5 text-2xl font-black">Tvrtka je obrisana</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">Ovaj postupak je završen.</p>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-3xl font-black">Odgovor na postupak brisanja</h1>
              <p className="mt-2 text-slate-400">Tvrtka: <strong className="text-white">{data?.companyName || '—'}</strong></p>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Razlog administracije</p>
                <p className="mt-2 leading-6 text-slate-200">{data?.adminReason || 'Nije naveden.'}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Rok za odgovor</p>
                <p className="mt-2 font-black text-amber-300">{deadline}</p>
              </div>

              <p className="mt-6 text-sm leading-6 text-slate-400">Odaberite što želite napraviti. Ako želite zadržati tvrtku, rok se odmah zaustavlja dok administracija razmatra vaš zahtjev.</p>

              {error && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setChoice('delete'); setError('') }} className="min-h-12 rounded-xl bg-red-600 px-5 font-black transition hover:bg-red-500">Potvrdi brisanje</button>
                <button type="button" onClick={() => { setChoice('keep'); setError('') }} className="min-h-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 font-black">Želim zadržati tvrtku</button>
              </div>

              {choice === 'delete' && (
                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <div className="flex items-center gap-3 font-black text-red-200"><Trash2 size={20} /> Potvrdite trajno brisanje</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Ova radnja će odmah trajno ukloniti tvrtku i povezane podatke.</p>
                  <button type="button" disabled={submitting} onClick={() => void submitDelete()} className="mt-5 min-h-12 w-full rounded-xl bg-red-600 px-5 font-black disabled:opacity-50">{submitting ? 'Brisanje...' : 'Da, trajno obriši tvrtku'}</button>
                </div>
              )}

              {choice === 'keep' && (
                <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                  <h2 className="font-black">Zahtjev za zadržavanje</h2>
                  <label className="mt-4 block text-sm font-bold text-slate-300">Zašto tvrtka treba ostati u FERSYS-u?</label>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} placeholder="Napišite kratko obrazloženje..." className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:border-violet-500" />
                  <button type="button" disabled={submitting} onClick={() => void submitKeep()} className="mt-4 min-h-12 w-full rounded-xl bg-violet-600 px-5 font-black disabled:opacity-50">{submitting ? 'Slanje...' : 'Pošalji zahtjev administraciji'}</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
