import { RefreshCw, Search, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getAdminCompanies, updateCompanySubscription, type AdminCompany } from './services/admin.service'

export function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminCompany | null>(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      setLoading(true)
      setError('')
      setCompanies(await getAdminCompanies())
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Tvrtke nije moguće učitati.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return companies
    return companies.filter((company) => [company.companyName, company.companyOib, company.ownerEmail, company.planName].some((value) => value.toLowerCase().includes(query)))
  }, [companies, search])

  return (
    <section className="mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-black">Tvrtke</h1><p className="mt-2 text-slate-400">Upravljanje paketima, trialom i statusom pristupa.</p></div>
        <button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold"><RefreshCw size={17} />Osvježi</button>
      </div>

      <div className="relative mt-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pretraži naziv, OIB, vlasnika ili paket..." className="h-13 w-full rounded-2xl border border-slate-800 bg-slate-900 pl-12 pr-4 text-white outline-none focus:border-violet-500" /></div>
      {error && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead><tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-4">Tvrtka</th><th className="px-5 py-4">Paket</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Korištenje</th><th className="px-5 py-4">Registrirana</th><th className="px-5 py-4 text-right">Akcije</th></tr></thead>
            <tbody>
              {filtered.map((company) => (
                <tr key={company.companyId} className="border-b border-slate-800/70 last:border-0">
                  <td className="px-5 py-4"><p className="font-black">{company.companyName}</p><p className="mt-1 text-xs text-slate-500">{company.ownerEmail || 'Nema e-maila'} · OIB {company.companyOib || '—'}</p></td>
                  <td className="px-5 py-4"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">{company.planName}</span></td>
                  <td className="px-5 py-4"><span className="text-sm font-bold text-slate-300">{company.subscriptionStatus}</span></td>
                  <td className="px-5 py-4 text-xs leading-5 text-slate-400">{company.usersCount} korisnika · {company.customersCount} kupaca<br />{company.workOrdersCount} naloga · {company.offersCount} ponuda</td>
                  <td className="px-5 py-4 text-sm text-slate-400">{new Date(company.createdAt).toLocaleDateString('hr-HR')}</td>
                  <td className="px-5 py-4 text-right"><button onClick={() => setEditing(company)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-sm font-bold hover:bg-slate-700"><Settings2 size={16} />Uredi</button></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-500">Nema pronađenih tvrtki.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <EditSubscriptionModal company={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} />}
    </section>
  )
}

function EditSubscriptionModal({ company, onClose, onSaved }: { company: AdminCompany; onClose: () => void; onSaved: () => Promise<void> }) {
  const [planId, setPlanId] = useState(company.planId)
  const [status, setStatus] = useState(company.subscriptionStatus)
  const [trialDays, setTrialDays] = useState(7)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    try {
      setSaving(true)
      setError('')
      await updateCompanySubscription({ companyId: company.companyId, planId, status, trialDays: status === 'trialing' ? trialDays : undefined, note })
      await onSaved()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Promjenu nije moguće spremiti.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-2xl font-black">Uredi pretplatu</h2><p className="mt-1 text-sm text-slate-400">{company.companyName}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Paket<select value={planId} onChange={(event) => setPlanId(event.target.value as AdminCompany['planId'])} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3"><option value="starter">Starter</option><option value="business">Business</option><option value="pro">FERSYS Pro</option></select></label>
          <label className="text-sm font-bold">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3"><option value="trialing">Trial</option><option value="active">Aktivno</option><option value="past_due">Neuspjela naplata</option><option value="cancelled">Otkazano</option><option value="expired">Isteklo</option><option value="blocked">Blokirano</option></select></label>
        </div>
        {status === 'trialing' && <label className="mt-4 block text-sm font-bold">Broj trial dana<input type="number" min={1} max={365} value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3" /></label>}
        <label className="mt-4 block text-sm font-bold">Interna napomena<textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
        {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="h-11 rounded-xl bg-slate-800 px-4 font-bold">Odustani</button><button disabled={saving} onClick={() => void save()} className="h-11 rounded-xl bg-violet-600 px-5 font-black disabled:opacity-50">{saving ? 'Spremanje...' : 'Spremi'}</button></div>
      </div>
    </div>
  )
}
