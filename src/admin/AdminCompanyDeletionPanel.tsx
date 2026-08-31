import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

type DeletionRequest = {
  id: string
  company_id: string | null
  company_name_snapshot: string
  company_oib_snapshot: string
  owner_email: string
  admin_reason: string
  status: string
  scheduled_delete_at: string | null
  paused_at: string | null
  owner_response_at: string | null
  owner_reason: string | null
  admin_decision_at: string | null
  created_at: string
}

type Props = {
  companyId: string
  companyName: string
}

const activeStatuses = new Set([
  'pending_owner_response',
  'owner_requested_keep',
])

export function AdminCompanyDeletionPanel({
  companyId,
  companyName,
}: Props) {
  const [request, setRequest] =
    useState<DeletionRequest | null>(null)
  const [loading, setLoading] =
    useState(true)
  const [working, setWorking] =
    useState(false)
  const [error, setError] =
    useState('')
  const [success, setSuccess] =
    useState('')
  const [confirmation, setConfirmation] =
    useState('')
  const [reason, setReason] =
    useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await invoke({
        action: 'status',
        companyId,
      })
      setRequest(
        (data.request as DeletionRequest | null) ?? null,
      )
    } catch (value) {
      setError(messageOf(value))
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void load()
  }, [load])

  const isActive = Boolean(
    request && activeStatuses.has(request.status),
  )

  const countdown = useMemo(
    () => describeDeadline(request),
    [request],
  )

  async function scheduleDeletion() {
    if (confirmation.trim() !== companyName.trim()) {
      setError('Za potvrdu upiši točan naziv tvrtke.')
      return
    }
    if (reason.trim().length < 3) {
      setError('Upiši razlog pokretanja postupka brisanja.')
      return
    }

    if (!window.confirm(
      `Pokrenuti 15-dnevni postupak brisanja za "${companyName}"? Vlasnik će odmah dobiti e-mail s mogućnošću potvrde brisanja ili zahtjeva za zadržavanje.`,
    )) return

    await run(async () => {
      await invoke({
        action: 'schedule',
        companyId,
        confirmation: confirmation.trim(),
        reason: reason.trim(),
      })
      setConfirmation('')
      setReason('')
      setSuccess(
        'Postupak je pokrenut. Vlasniku je poslan e-mail, a rok od 15 dana je aktivan.',
      )
      await load()
    })
  }

  async function cancelDeletion() {
    if (!window.confirm(
      `Otkazati postupak brisanja za "${companyName}"?`,
    )) return

    await run(async () => {
      await invoke({ action: 'cancel', companyId })
      setSuccess(
        'Postupak brisanja je otkazan. Vlasnik je obaviješten e-mailom.',
      )
      await load()
    })
  }

  async function decideKeep(decision: 'keep' | 'resume_delete') {
    const text = decision === 'keep'
      ? 'Prihvatiti zahtjev vlasnika i trajno zaustaviti ovaj postupak brisanja?'
      : 'Odbiti zahtjev vlasnika i nastaviti preostali dio roka za brisanje?'

    if (!window.confirm(text)) return

    await run(async () => {
      const data = await invoke({
        action: 'keep_decision',
        companyId,
        decision,
      })
      setSuccess(
        decision === 'keep'
          ? 'Zahtjev je prihvaćen. Tvrtka ostaje aktivna, a vlasnik je obaviješten.'
          : `Zahtjev je odbijen i rok je nastavljen${data.scheduledDeleteAt ? ` do ${formatDate(String(data.scheduledDeleteAt))}` : ''}.`,
      )
      await load()
    })
  }

  async function run(task: () => Promise<void>) {
    try {
      setWorking(true)
      setError('')
      setSuccess('')
      await task()
    } catch (value) {
      setError(messageOf(value))
    } finally {
      setWorking(false)
    }
  }

  return (
    <article className="rounded-3xl border border-red-500/25 bg-red-500/5 p-6">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-300">
          <Trash2 size={21} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-red-200">
                Postupak brisanja tvrtke
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Tvrtka se više ne briše odmah. Vlasnik dobiva 15 dana za odgovor i može potvrditi brisanje ili zatražiti zadržavanje uz obrazloženje.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || working}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-black text-slate-300 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Osvježi
            </button>
          </div>

          {error && (
            <div className="mt-4 flex gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 flex gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
              Učitavanje statusa postupka...
            </div>
          ) : isActive && request ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-amber-500/20 bg-slate-950/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Trenutni status
                    </p>
                    <p className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${request.status === 'owner_requested_keep' ? 'bg-violet-500/15 text-violet-200' : 'bg-amber-500/15 text-amber-200'}`}>
                      {request.status === 'owner_requested_keep'
                        ? <><PauseCircle size={14} /> Čeka odluku administratora</>
                        : <><Clock3 size={14} /> Čeka odgovor vlasnika</>}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">
                      Rok
                    </p>
                    <p className="mt-1 font-black text-amber-200">
                      {request.status === 'owner_requested_keep'
                        ? 'ZAUSTAVLJEN'
                        : countdown.label}
                    </p>
                    {request.scheduled_delete_at && (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(request.scheduled_delete_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Razlog pokretanja
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {request.admin_reason || '—'}
                  </p>
                  <p className="mt-3 text-xs text-slate-600">
                    Obavijest poslana: {formatDate(request.created_at)} · {request.owner_email}
                  </p>
                </div>
              </div>

              {request.status === 'owner_requested_keep' && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5">
                  <div className="flex items-center gap-2 text-violet-200">
                    <ShieldCheck size={19} />
                    <h3 className="font-black">
                      Vlasnik traži zadržavanje tvrtke
                    </h3>
                  </div>
                  <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">
                    Obrazloženje vlasnika
                  </p>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-200">
                    {request.owner_reason || 'Obrazloženje nije dostupno.'}
                  </p>
                  {request.owner_response_at && (
                    <p className="mt-2 text-xs text-slate-600">
                      Zaprimljeno {formatDate(request.owner_response_at)}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void decideKeep('keep')}
                      disabled={working}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-50"
                    >
                      <CheckCircle2 size={17} />
                      Odobri zadržavanje
                    </button>
                    <button
                      type="button"
                      onClick={() => void decideKeep('resume_delete')}
                      disabled={working}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white disabled:opacity-50"
                    >
                      <XCircle size={17} />
                      Odbij i nastavi rok
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void cancelDeletion()}
                disabled={working}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 text-sm font-black text-amber-200 transition hover:bg-amber-500/10 disabled:opacity-50"
              >
                <XCircle size={17} />
                Otkaži postupak brisanja
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-red-500/15 bg-slate-950/50 p-4">
              {request && (
                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500">
                  Zadnji postupak: <strong className="text-slate-300">{statusLabel(request.status)}</strong>
                  {request.admin_decision_at ? ` · ${formatDate(request.admin_decision_at)}` : ''}
                </div>
              )}

              <label className="text-xs font-black uppercase tracking-wider text-red-300">
                Razlog pokretanja postupka
              </label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Npr. zloupotreba računa, duplikat tvrtke, zahtjev za zatvaranje..."
                className="mt-3 min-h-24 w-full resize-y rounded-xl border border-red-500/20 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500"
              />

              <p className="mt-4 text-xs font-black uppercase tracking-wider text-red-300">
                Za potvrdu upiši naziv tvrtke
              </p>
              <p className="mt-2 break-words text-sm font-black text-white">
                {companyName}
              </p>
              <input
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                placeholder="Upiši točan naziv tvrtke"
                className="mt-3 h-12 w-full rounded-xl border border-red-500/20 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500"
              />

              <button
                type="button"
                onClick={() => void scheduleDeletion()}
                disabled={
                  working ||
                  confirmation.trim() !== companyName.trim() ||
                  reason.trim().length < 3
                }
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Clock3 size={18} />
                {working
                  ? 'Pokretanje...'
                  : 'Pokreni 15-dnevni postupak brisanja'}
              </button>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Vlasniku se odmah šalje e-mail s razlogom, rokom i sigurnim izborom. Ako potvrdi brisanje, brisanje se izvršava. Ako traži zadržavanje, rok se automatski zaustavlja dok ne doneseš odluku. Bez odgovora, sustav briše tvrtku nakon 15 dana.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(
    'admin-delete-company',
    { body },
  )

  if (error) {
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const payload = await context.clone().json()
        if (payload?.error) throw new Error(String(payload.error))
      } catch (value) {
        if (value instanceof Error && value.message !== 'Unexpected end of JSON input') {
          throw value
        }
      }
    }
    throw error
  }

  if (data?.error) throw new Error(String(data.error))
  if (!data?.success) throw new Error('Radnju nije moguće izvršiti.')
  return data as Record<string, unknown>
}

function messageOf(value: unknown) {
  return value instanceof Error
    ? value.message
    : 'Došlo je do pogreške.'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function describeDeadline(request: DeletionRequest | null) {
  if (!request?.scheduled_delete_at) return { label: '—' }
  const diff = new Date(request.scheduled_delete_at).getTime() - Date.now()
  if (diff <= 0) return { label: 'Rok je istekao' }
  const days = Math.ceil(diff / 86_400_000)
  return {
    label: days === 1 ? 'Preostao 1 dan' : `Preostalo ${days} dana`,
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'kept': return 'Tvrtka je zadržana'
    case 'cancelled': return 'Postupak je otkazan'
    case 'deleted': return 'Tvrtka je obrisana'
    case 'failed': return 'Potrebna ručna provjera'
    case 'owner_requested_keep': return 'Zahtjev vlasnika čeka odluku'
    case 'pending_owner_response': return 'Čeka odgovor vlasnika'
    default: return status
  }
}
