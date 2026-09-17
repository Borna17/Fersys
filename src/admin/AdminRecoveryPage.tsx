import { useEffect, useMemo, useState } from 'react'
import { Copy, RefreshCw, RotateCcw, Search, ShieldCheck } from 'lucide-react'

import { supabase } from '../lib/supabase'

type RecoverySnapshot = {
  id: string
  company_id: string
  user_id: string
  user_email: string
  draft_type: string
  draft_key: string
  payload: unknown
  reason: string
  source_updated_at: string
  created_at: string
  expires_at: string
}

export default function AdminRecoveryPage() {
  const [rows, setRows] = useState<RecoverySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<RecoverySnapshot | null>(null)
  const [restoringId, setRestoringId] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('admin_get_recovery_snapshots_v1', {
      requested_company_id: null,
      requested_limit: 250,
    })
    if (rpcError) {
      setError(rpcError.message)
      setRows([])
    } else {
      setRows((data ?? []) as RecoverySnapshot[])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('hr-HR')
    if (!needle) return rows
    return rows.filter((row) =>
      [row.user_email, row.company_id, row.draft_type, row.draft_key, row.reason]
        .some((value) => value.toLocaleLowerCase('hr-HR').includes(needle)),
    )
  }, [query, rows])

  async function copyPayload(row: RecoverySnapshot) {
    await navigator.clipboard.writeText(JSON.stringify(row.payload, null, 2))
  }

  async function restoreSnapshot(row: RecoverySnapshot) {
    const target = row.user_email || row.user_id
    const confirmed = window.confirm(
      `Vratiti ovu recovery verziju kao nacrt za ${target}?\n\nAktivni poslovni zapis neće biti prepisan. Korisnik će dobiti obnovljeni nacrt koji može pregledati prije konačnog spremanja.`,
    )
    if (!confirmed) return

    setRestoringId(row.id)
    setError('')
    setNotice('')
    try {
      const { error: restoreError } = await supabase.rpc('admin_restore_recovery_snapshot_v1', {
        requested_snapshot_id: row.id,
      })
      if (restoreError) throw restoreError
      setNotice(`Recovery verzija je sigurno vraćena kao nacrt za ${target}.`)
      await load()
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : 'Recovery verziju nije moguće vratiti.',
      )
    } finally {
      setRestoringId('')
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-300"><ShieldCheck size={18} /><span className="text-xs font-black uppercase tracking-[0.2em]">P0 Recovery</span></div>
          <h1 className="mt-2 text-3xl font-black">Admin Recovery</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Pregled server-side verzija nespremljenog rada. Sigurni restore vraća odabranu verziju samo kao korisnikov nacrt; aktivni poslovni zapis se ne prepisuje automatski.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold"><RefreshCw size={17} />Osvježi</button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Korisnik, tvrtka, tip ili ključ nacrta..." className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 pl-11 pr-4 text-sm outline-none focus:border-violet-500" />
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{notice}</div>}
      {loading ? <p className="text-sm text-slate-400">Učitavanje recovery povijesti...</p> : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-500"><tr><th className="p-4">Vrijeme</th><th className="p-4">Korisnik</th><th className="p-4">Tip</th><th className="p-4">Ključ</th><th className="p-4">Razlog</th><th className="p-4">Akcije</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-800"><td className="p-4 whitespace-nowrap">{new Date(row.created_at).toLocaleString('hr-HR')}</td><td className="p-4"><div className="font-bold">{row.user_email || row.user_id}</div><div className="mt-1 text-xs text-slate-500">{row.company_id}</div></td><td className="p-4">{row.draft_type}</td><td className="p-4 font-mono text-xs">{row.draft_key}</td><td className="p-4">{row.reason}</td><td className="p-4"><div className="flex gap-2"><button type="button" onClick={() => setSelected(row)} className="rounded-lg bg-slate-800 px-3 py-2 font-bold">Pregled</button><button type="button" onClick={() => void copyPayload(row)} className="rounded-lg bg-violet-600/20 px-3 py-2 font-bold text-violet-300" title="Kopiraj sadržaj"><Copy size={15} /></button><button type="button" disabled={restoringId === row.id} onClick={() => void restoreSnapshot(row)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-2 font-bold text-emerald-300 disabled:opacity-50"><RotateCcw size={15} />{restoringId === row.id ? 'Vraćam...' : 'Vrati nacrt'}</button></div></td></tr>)}</tbody>
            </table>
          </div>
          {!filtered.length && <p className="p-6 text-center text-sm text-slate-500">Nema recovery zapisa za odabrani filter.</p>}
        </div>
      )}

      {selected && <div className="rounded-2xl border border-violet-500/20 bg-slate-900 p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-black">Recovery sadržaj</h2><p className="mt-1 text-xs text-slate-500">{selected.user_email} · {selected.draft_type} · {selected.draft_key}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold">Zatvori</button></div><pre className="mt-4 max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">{JSON.stringify(selected.payload, null, 2)}</pre></div>}
    </section>
  )
}
