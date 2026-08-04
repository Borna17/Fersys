import { ArrowLeft, Camera, FileText, Paperclip, Save, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { DocumentScannerModal } from '../components/DocumentScannerModal'
import { deleteDocument, downloadDocument, saveDocument } from '../utils/documentStorage'

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
const categories: Category[] = ['Gorivo','Materijal','Alat','Servis i održavanje','Najam','Telekomunikacije','Komunalije','Reprezentacija','Uredski troškovi','Ostalo']
const statuses: Status[] = ['Nije knjiženo','Za knjiženje','Knjiženo','Plaćeno','Stornirano']

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function todayString() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

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

export function NewIncomingInvoicePage() {
  const navigate = useNavigate()
  const { incomingInvoiceId } = useParams<{ incomingInvoiceId: string }>()
  const stored = useMemo(() => readInvoices(), [])
  const editing = useMemo(
    () => incomingInvoiceId ? stored.find((item) => item.id === incomingInvoiceId) ?? null : null,
    [incomingInvoiceId, stored],
  )

  const today = todayString()
  const [supplierName, setSupplierName] = useState(editing?.supplierName ?? '')
  const [supplierOib, setSupplierOib] = useState(editing?.supplierOib ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState(editing?.invoiceNumber ?? '')
  const [invoiceDate, setInvoiceDate] = useState(editing?.invoiceDate ?? today)
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? today)
  const [bookingDate, setBookingDate] = useState(editing?.bookingDate ?? '')
  const [category, setCategory] = useState<Category>(editing?.category ?? 'Materijal')
  const [status, setStatus] = useState<Status>(editing?.status ?? 'Za knjiženje')
  const [paymentMethod, setPaymentMethod] = useState(editing?.paymentMethod ?? 'Kartica')
  const [netAmount, setNetAmount] = useState(editing?.netAmount ?? 0)
  const [vatAmount, setVatAmount] = useState(editing?.vatAmount ?? 0)
  const [totalAmount, setTotalAmount] = useState(editing?.totalAmount ?? 0)
  const [note, setNote] = useState(editing?.note ?? '')
  const [documents, setDocuments] = useState<DocumentMeta[]>(editing?.documents ?? [])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savingDocument, setSavingDocument] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function addDocument(file: File) {
    setSavingDocument(true)
    try {
      const meta: DocumentMeta = {
        id: createId('document'),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
      }
      await saveDocument({ ...meta, blob: file })
      setDocuments((current) => [...current, meta])
    } catch {
      window.alert('Dokument se nije mogao spremiti.')
    } finally {
      setSavingDocument(false)
    }
  }

  async function removeDocument(id: string) {
    await deleteDocument(id)
    setDocuments((current) => current.filter((item) => item.id !== id))
  }

  function saveInvoice() {
    const nextErrors: Record<string, string> = {}
    if (!supplierName.trim()) nextErrors.supplierName = 'Unesi dobavljača.'
    if (!invoiceNumber.trim()) nextErrors.invoiceNumber = 'Unesi broj računa.'
    if (!invoiceDate) nextErrors.invoiceDate = 'Odaberi datum računa.'
    if ([netAmount, vatAmount, totalAmount].some((value) => value < 0)) nextErrors.amounts = 'Iznosi ne mogu biti negativni.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const now = new Date().toISOString()
    const saved: IncomingInvoice = {
      id: editing?.id ?? createId('incoming-invoice'),
      supplierName: supplierName.trim(),
      supplierOib: supplierOib.trim(),
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      bookingDate,
      category,
      status,
      paymentMethod,
      netAmount: Number(netAmount) || 0,
      vatAmount: Number(vatAmount) || 0,
      totalAmount: Number(totalAmount) || 0,
      note: note.trim(),
      documents,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    }

    const current = readInvoices()
    const updated = editing
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    navigate('/incoming-invoices')
  }

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1450px]">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate('/incoming-invoices')} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-black text-violet-300"><FileText size={16} /> Digitalni registrator</div>
              <h1 className="text-2xl font-black sm:text-3xl">{editing ? 'Uredi ulazni račun' : 'Novi ulazni račun'}</h1>
            </div>
          </div>
          <button type="button" onClick={saveInvoice} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white">
            <Save size={18} /> Spremi račun
          </button>
        </header>

        {Object.keys(errors).length > 0 && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            Provjeri označena polja prije spremanja.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-5 text-lg font-black">Podaci dobavljača i računa</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Dobavljač" error={errors.supplierName}>
                  <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="INA, Pevex, Kaufland..." className="input" />
                </Field>
                <Field label="OIB dobavljača"><input value={supplierOib} onChange={(e) => setSupplierOib(e.target.value)} className="input" /></Field>
                <Field label="Broj računa" error={errors.invoiceNumber}><input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="input" /></Field>
                <Field label="Datum računa"><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input" /></Field>
                <Field label="Datum dospijeća"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" /></Field>
                <Field label="Datum knjiženja"><input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="input" /></Field>
                <Field label="Kategorija"><select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="input">{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input">{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
                <Field label="Način plaćanja"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input"><option>Kartica</option><option>Gotovina</option><option>Transakcijski račun</option><option>Internet bankarstvo</option><option>Ostalo</option></select></Field>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-5 text-lg font-black">Iznosi za knjiženje</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Osnovica"><input type="number" min="0" step="0.01" value={netAmount} onChange={(e) => { const value = Number(e.target.value); setNetAmount(value); setVatAmount(Math.max(0, totalAmount - value)) }} className="input text-lg font-black" /></Field>
                <Field label="PDV"><input type="number" min="0" step="0.01" value={vatAmount} onChange={(e) => setVatAmount(Number(e.target.value))} className="input text-lg font-black" /></Field>
                <Field label="Ukupno"><input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => { const value = Number(e.target.value); setTotalAmount(value); setVatAmount(Math.max(0, value - netAmount)) }} className="input border-violet-400/30 bg-violet-500/10 text-lg font-black" /></Field>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                Kontrolna razlika ukupno − osnovica: <strong className="ml-2 text-slate-200">{money(Math.max(0, totalAmount - netAmount))}</strong>
              </div>
              {errors.amounts && <div className="mt-3 text-sm font-bold text-red-300">{errors.amounts}</div>}
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="mb-4 text-lg font-black">Napomena</h2>
              <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opis kupnje, vozilo, radni nalog ili zaposlenik..." className="input resize-none" />
            </section>
          </main>

          <aside className="xl:sticky xl:top-5 xl:self-start">
            <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-5">
              <div className="mb-4 flex items-center gap-2"><Paperclip size={18} className="text-violet-300" /><h2 className="font-black">Dokumenti računa</h2></div>
              <div className="grid gap-3">
                <button type="button" onClick={() => setScannerOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-black text-white"><Camera size={18} /> Skeniraj kamerom</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-slate-200"><Upload size={18} /> Dodaj PDF ili sliku</button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void addDocument(file); e.currentTarget.value = '' }} />

              {savingDocument && <div className="mt-4 rounded-2xl bg-cyan-500/10 p-3 text-sm font-bold text-cyan-200">Spremanje dokumenta...</div>}

              <div className="mt-5 space-y-3">
                {documents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-500">Još nema dokumenata.</div>
                ) : documents.map((document) => (
                  <article key={document.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="truncate text-sm font-black">{document.fileName}</div>
                    <div className="mt-1 text-xs text-slate-500">{document.mimeType}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void downloadDocument(document.id)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Otvori</button>
                      <button type="button" onClick={() => void removeDocument(document.id)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"><Trash2 size={14} /> Obriši</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <DocumentScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onConfirm={(file) => void addDocument(file)} />

      <style>{`.input{width:100%;border-radius:1rem;border:1px solid rgb(255 255 255 / .1);background:rgb(2 6 23 / .8);padding:.75rem 1rem;outline:none}.input:focus{border-color:rgb(167 139 250 / .5)}`}</style>
    </section>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {error && <span className="text-xs font-bold text-red-300">{error}</span>}
    </label>
  )
}
