import { Download, Eye, FileSpreadsheet, FileText, Fuel, Package, Pencil, Plus, Search, Trash2, Wrench, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import * as XLSX from 'xlsx'
import { deleteDocument, downloadDocument } from '../utils/documentStorage'

type Status = 'Nije knjiženo' | 'Za knjiženje' | 'Knjiženo' | 'Plaćeno' | 'Stornirano'
type Category = 'Gorivo' | 'Materijal' | 'Alat' | 'Servis i održavanje' | 'Najam' | 'Telekomunikacije' | 'Komunalije' | 'Reprezentacija' | 'Uredski troškovi' | 'Ostalo'
type DocumentMeta = { id: string; fileName: string; mimeType: string; createdAt: string }
type IncomingInvoice = {
  id: string
  supplierName: string
  supplierOib: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  bookingDate: string
  category: Category
  status: Status
  paymentMethod: string
  netAmount: number
  vatAmount: number
  totalAmount: number
  note: string
  documents: DocumentMeta[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'fersys_incoming_invoices'
const statusStyles: Record<Status, string> = {
  'Nije knjiženo': 'border-slate-500/20 bg-slate-500/15 text-slate-300',
  'Za knjiženje': 'border-amber-500/20 bg-amber-500/15 text-amber-300',
  Knjiženo: 'border-blue-500/20 bg-blue-500/15 text-blue-300',
  Plaćeno: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  Stornirano: 'border-red-500/20 bg-red-500/15 text-red-300',
}
const categories: Array<Category | 'Sve'> = ['Sve','Gorivo','Materijal','Alat','Servis i održavanje','Najam','Telekomunikacije','Komunalije','Reprezentacija','Uredski troškovi','Ostalo']

function readInvoices(): IncomingInvoice[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as IncomingInvoice[]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function money(value: number) {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(value)
}

function date(value: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('hr-HR') : '—'
}

function icon(category: Category) {
  if (category === 'Gorivo') return Fuel
  if (category === 'Materijal') return Package
  if (category === 'Alat' || category === 'Servis i održavanje') return Wrench
  return FileText
}

export function IncomingInvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<IncomingInvoice[]>(readInvoices)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status | 'Svi'>('Svi')
  const [category, setCategory] = useState<Category | 'Sve'>('Sve')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('hr-HR')
    return invoices
      .filter((item) => {
        const text = [item.supplierName,item.supplierOib,item.invoiceNumber,item.category,item.note].join(' ').toLocaleLowerCase('hr-HR')
        return (!query || text.includes(query)) && (status === 'Svi' || item.status === status) && (category === 'Sve' || item.category === category)
      })
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
  }, [invoices, search, status, category])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      count: invoices.length,
      total: invoices.reduce((sum, item) => sum + item.totalAmount, 0),
      vat: invoices.reduce((sum, item) => sum + item.vatAmount, 0),
      waiting: invoices.filter((item) => item.status === 'Za knjiženje' || item.status === 'Nije knjiženo').length,
      month: invoices.filter((item) => {
        const value = new Date(`${item.invoiceDate}T12:00:00`)
        return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear()
      }).reduce((sum, item) => sum + item.totalAmount, 0),
    }
  }, [invoices])

  const selected = invoices.find((item) => item.id === selectedId) ?? null

  function save(updated: IncomingInvoice[]) {
    setInvoices(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  async function removeInvoice(invoice: IncomingInvoice) {
    if (!window.confirm(`Želiš li obrisati račun ${invoice.invoiceNumber}?`)) return
    for (const document of invoice.documents) await deleteDocument(document.id)
    save(invoices.filter((item) => item.id !== invoice.id))
    setSelectedId(null)
  }

  function exportExcel() {
    const rows = filtered.map((item) => ({
      Datum: date(item.invoiceDate),
      Dobavljač: item.supplierName,
      'OIB dobavljača': item.supplierOib,
      'Broj računa': item.invoiceNumber,
      Kategorija: item.category,
      Status: item.status,
      Osnovica: item.netAmount,
      PDV: item.vatAmount,
      Ukupno: item.totalAmount,
      'Način plaćanja': item.paymentMethod,
      'Broj dokumenata': item.documents.length,
      Napomena: item.note,
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Ulazni računi')
    XLSX.writeFile(workbook, `ulazni-racuni-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-white/10 bg-slate-900/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-violet-300"><FileText size={17} /> Digitalni registrator</div>
            <h1 className="text-3xl font-black">Ulazni računi</h1>
            <p className="mt-1 text-sm text-slate-400">R1 računi, gorivo, materijal, alat i ostali troškovi firme.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black"><FileSpreadsheet size={18} /> Izvoz za knjigovođu</button>
            <button type="button" onClick={() => navigate('/incoming-invoices/new')} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white"><Plus size={18} /> Novi ulazni račun</button>
          </div>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Ukupno računa', String(stats.count)],
            ['Troškovi ukupno', money(stats.total)],
            ['PDV ukupno', money(stats.vat)],
            ['Ovaj mjesec', money(stats.month)],
            ['Za knjiženje', String(stats.waiting)],
          ].map(([label, value], index) => (
            <article key={label} className={`rounded-3xl border p-5 ${index === 4 ? 'border-amber-400/20 bg-amber-500/10' : 'border-white/10 bg-slate-900/70'}`}>
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</div>
              <div className="mt-2 text-xl font-black">{value}</div>
            </article>
          ))}
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pretraži dobavljača, broj računa, OIB..." className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3 pl-11 pr-11 outline-none" />
              {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-slate-500"><X size={16} /></button>}
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status | 'Svi')} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold"><option>Svi</option><option>Nije knjiženo</option><option>Za knjiženje</option><option>Knjiženo</option><option>Plaćeno</option><option>Stornirano</option></select>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'Sve')} className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold">{categories.map((item) => <option key={item}>{item}</option>)}</select>
          </div>

          {filtered.length === 0 ? (
            <div className="grid min-h-80 place-items-center p-8 text-center">
              <div><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-500/15 text-violet-300"><FileText size={30} /></div><h2 className="mt-4 text-xl font-black">Nema ulaznih računa</h2><p className="mt-2 text-sm text-slate-400">Dodaj prvi račun i skeniraj dokument kamerom.</p></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="border-b border-white/10 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-5 py-4">Datum</th><th className="px-5 py-4">Dobavljač</th><th className="px-5 py-4">Broj računa</th><th className="px-5 py-4">Kategorija</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">PDV</th><th className="px-5 py-4 text-right">Ukupno</th><th className="px-5 py-4 text-center">Dokumenti</th><th className="px-5 py-4 text-right">Akcije</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((item) => {
                    const Icon = icon(item.category)
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.03]">
                        <td className="px-5 py-4 text-sm text-slate-300">{date(item.invoiceDate)}</td>
                        <td className="px-5 py-4"><div className="font-black">{item.supplierName}</div><div className="mt-1 text-xs text-slate-500">{item.supplierOib || 'Bez OIB-a'}</div></td>
                        <td className="px-5 py-4 font-bold text-violet-300">{item.invoiceNumber}</td>
                        <td className="px-5 py-4"><div className="flex items-center gap-2 text-sm font-bold"><Icon size={16} className="text-slate-500" />{item.category}</div></td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[item.status]}`}>{item.status}</span></td>
                        <td className="px-5 py-4 text-right font-bold text-slate-300">{money(item.vatAmount)}</td>
                        <td className="px-5 py-4 text-right font-black">{money(item.totalAmount)}</td>
                        <td className="px-5 py-4 text-center">{item.documents.length}</td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelectedId(item.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400"><Eye size={16} /></button><button type="button" onClick={() => navigate(`/incoming-invoices/${item.id}/edit`)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400"><Pencil size={16} /></button></div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button type="button" onClick={() => setSelectedId(null)} className="absolute inset-0" aria-label="Zatvori" />
          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5">
            <div className="mb-6 flex items-start justify-between"><div><div className="text-sm font-black text-violet-300">{selected.invoiceNumber}</div><h2 className="mt-1 text-2xl font-black">{selected.supplierName}</h2><div className="mt-2 text-sm text-slate-400">{date(selected.invoiceDate)}</div></div><button type="button" onClick={() => setSelectedId(null)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 text-slate-400"><X size={18} /></button></div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Osnovica" value={money(selected.netAmount)} />
              <Stat label="PDV" value={money(selected.vatAmount)} />
              <Stat label="Ukupno" value={money(selected.totalAmount)} accent />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <Row label="Kategorija" value={selected.category} />
              <Row label="Status" value={selected.status} />
              <Row label="Plaćanje" value={selected.paymentMethod} />
              <Row label="Dospijeće" value={date(selected.dueDate)} />
            </div>

            <h3 className="mb-3 mt-6 font-black">Dokumenti</h3>
            <div className="space-y-2">
              {selected.documents.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Nema dokumenata.</div> : selected.documents.map((document) => (
                <button key={document.id} type="button" onClick={() => void downloadDocument(document.id)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                  <FileText size={18} className="text-violet-300" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{document.fileName}</div><div className="text-xs text-slate-500">Klikni za otvaranje</div></div><Download size={17} className="text-slate-500" />
                </button>
              ))}
            </div>

            {selected.note && <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs font-black uppercase text-slate-500">Napomena</div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{selected.note}</p></div>}

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => navigate(`/incoming-invoices/${selected.id}/edit`)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"><Pencil size={17} /> Uredi račun</button>
              <button type="button" onClick={() => void removeInvoice(selected)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"><Trash2 size={17} /> Obriši račun</button>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-violet-400/20 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}><div className="text-xs font-black uppercase text-slate-500">{label}</div><div className="mt-2 font-black">{value}</div></div>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 py-1.5"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>
}

