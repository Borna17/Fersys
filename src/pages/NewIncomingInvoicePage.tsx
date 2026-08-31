import {
  ArrowLeft,
  Camera,
  FileText,
  LoaderCircle,
  Paperclip,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  DocumentScannerModal,
} from '../components/DocumentScannerModal'
import {
  analyzeIncomingInvoice,
  type IncomingInvoiceAiResult,
} from '../services/incomingInvoiceAi.service'
import {
  listIncomingInvoices,
  upsertIncomingInvoice,
  type IncomingInvoiceRecord,
} from '../services/incomingInvoices.service'
import {
  deleteDocument,
  downloadDocument,
  saveDocument,
} from '../utils/documentStorage'
import { scopedStorageKey } from '../utils/scopedLocalStorage'

type Status =
  | 'Nije knjiženo'
  | 'Za knjiženje'
  | 'Knjiženo'
  | 'Plaćeno'
  | 'Stornirano'

type Category =
  | 'Gorivo'
  | 'Materijal'
  | 'Alat'
  | 'Servis i održavanje'
  | 'Najam'
  | 'Telekomunikacije'
  | 'Komunalije'
  | 'Reprezentacija'
  | 'Uredski troškovi'
  | 'Ostalo'

type DocumentMeta = {
  id: string
  fileName: string
  mimeType: string
  createdAt: string
}

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

const STORAGE_KEY = scopedStorageKey('fersys_incoming_invoices')

const categories: Category[] = [
  'Gorivo',
  'Materijal',
  'Alat',
  'Servis i održavanje',
  'Najam',
  'Telekomunikacije',
  'Komunalije',
  'Reprezentacija',
  'Uredski troškovi',
  'Ostalo',
]

const statuses: Status[] = [
  'Nije knjiženo',
  'Za knjiženje',
  'Knjiženo',
  'Plaćeno',
  'Stornirano',
]

const paymentMethods = [
  'Kartica',
  'Gotovina',
  'Transakcijski račun',
  'Internet bankarstvo',
  'Ostalo',
]

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function todayString() {
  const date = new Date()
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function readInvoices(): IncomingInvoice[] {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as IncomingInvoice[]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function money(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function numberValue(value: string) {
  if (value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function NewIncomingInvoicePage() {
  const navigate = useNavigate()
  const { incomingInvoiceId } =
    useParams<{ incomingInvoiceId: string }>()

  const stored = useMemo(() => readInvoices(), [])

  const editing = useMemo(
    () =>
      incomingInvoiceId
        ? stored.find(
            (item) => item.id === incomingInvoiceId,
          ) ?? null
        : null,
    [incomingInvoiceId, stored],
  )

  const today = todayString()

  const [supplierName, setSupplierName] = useState(
    editing?.supplierName ?? '',
  )
  const [supplierOib, setSupplierOib] = useState(
    editing?.supplierOib ?? '',
  )
  const [invoiceNumber, setInvoiceNumber] = useState(
    editing?.invoiceNumber ?? '',
  )
  const [invoiceDate, setInvoiceDate] = useState(
    editing?.invoiceDate ?? today,
  )
  const [dueDate, setDueDate] = useState(
    editing?.dueDate ?? today,
  )
  const [bookingDate, setBookingDate] = useState(
    editing?.bookingDate ?? '',
  )
  const [category, setCategory] = useState<Category>(
    editing?.category ?? 'Materijal',
  )
  const [status, setStatus] = useState<Status>(
    editing?.status ?? 'Za knjiženje',
  )
  const [paymentMethod, setPaymentMethod] = useState(
    editing?.paymentMethod ?? 'Kartica',
  )

  const [netAmount, setNetAmount] = useState(
    editing?.netAmount ?? 0,
  )
  const [vatAmount, setVatAmount] = useState(
    editing?.vatAmount ?? 0,
  )
  const [totalAmount, setTotalAmount] = useState(
    editing?.totalAmount ?? 0,
  )

  const [note, setNote] = useState(editing?.note ?? '')
  const [documents, setDocuments] = useState<
    DocumentMeta[]
  >(editing?.documents ?? [])

  const [scannerOpen, setScannerOpen] = useState(false)
  const [errors, setErrors] = useState<
    Record<string, string>
  >({})
  const [savingDocument, setSavingDocument] =
    useState(false)
  const [aiReading, setAiReading] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const [aiWarnings, setAiWarnings] = useState<
    string[]
  >([])
  const [aiConfidence, setAiConfidence] = useState<
    number | null
  >(null)

  useEffect(() => {
    if (!incomingInvoiceId) return
    let cancelled = false
    void listIncomingInvoices()
      .then((rows) => {
        if (cancelled) return
        const invoice = rows.find((item) => item.id === incomingInvoiceId)
        if (!invoice) return
        setSupplierName(invoice.supplierName)
        setSupplierOib(invoice.supplierOib)
        setInvoiceNumber(invoice.invoiceNumber)
        setInvoiceDate(invoice.invoiceDate)
        setDueDate(invoice.dueDate)
        setBookingDate(invoice.bookingDate)
        setCategory(invoice.category as Category)
        setStatus(invoice.status as Status)
        setPaymentMethod(invoice.paymentMethod)
        setNetAmount(invoice.netAmount)
        setVatAmount(invoice.vatAmount)
        setTotalAmount(invoice.totalAmount)
        setNote(invoice.note)
        setDocuments(invoice.documents)
      })
      .catch((error) => console.error('Račun se nije mogao učitati iz baze:', error))
    return () => { cancelled = true }
  }, [incomingInvoiceId])

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const calculatedVat = Math.max(
    0,
    totalAmount - netAmount,
  )

  async function addDocument(file: File) {
    setSavingDocument(true)

    try {
      const meta: DocumentMeta = {
        id: createId('document'),
        fileName: file.name,
        mimeType:
          file.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
      }

      await saveDocument({
        ...meta,
        blob: file,
      })

      setDocuments((current) => [
        ...current,
        meta,
      ])
    } catch {
      window.alert(
        'Dokument se nije mogao spremiti.',
      )
    } finally {
      setSavingDocument(false)
    }
  }

  function applyAiResult(
    result: IncomingInvoiceAiResult,
  ) {
    if (result.supplierName) {
      setSupplierName(result.supplierName)
    }

    if (result.supplierOib) {
      setSupplierOib(
        result.supplierOib
          .replace(/\D/g, '')
          .slice(0, 11),
      )
    }

    if (result.invoiceNumber) {
      setInvoiceNumber(result.invoiceNumber)
    }

    if (result.invoiceDate) {
      setInvoiceDate(result.invoiceDate)
    }

    if (result.dueDate) {
      setDueDate(result.dueDate)
    }

    if (
      categories.includes(
        result.category as Category,
      )
    ) {
      setCategory(result.category as Category)
    }

    if (
      paymentMethods.includes(
        result.paymentMethod,
      )
    ) {
      setPaymentMethod(result.paymentMethod)
    }

    if (result.netAmount > 0) {
      setNetAmount(result.netAmount)
    }

    if (result.vatAmount >= 0) {
      setVatAmount(result.vatAmount)
    }

    if (result.totalAmount > 0) {
      setTotalAmount(result.totalAmount)
    }

    if (result.note) {
      setNote((current) =>
        current.trim() ? current : result.note,
      )
    }

    setAiWarnings(result.warnings ?? [])
    setAiConfidence(
      Number.isFinite(result.confidence)
        ? Math.max(
            0,
            Math.min(1, result.confidence),
          )
        : null,
    )
    setAiMessage(
      'AI je pročitao račun i popunio prepoznata polja. Provjeri podatke prije spremanja.',
    )
    setErrors({})
  }

  async function readInvoiceWithAi(file: File) {
    setAiReading(true)
    setAiMessage(
      'FERSYS AI čita račun i prepoznaje dobavljača, broj računa, datume, iznose i kategoriju...',
    )
    setAiWarnings([])
    setAiConfidence(null)

    try {
      const result =
        await analyzeIncomingInvoice(file)
      applyAiResult(result)
    } catch (error) {
      setAiMessage(
        error instanceof Error
          ? error.message
          : 'AI nije mogao pročitati račun. Dokument je ipak spremljen.',
      )
    } finally {
      setAiReading(false)
    }
  }

  async function handleScannedInvoice(file: File) {
    await addDocument(file)
    await readInvoiceWithAi(file)
  }

  async function handleUploadedDocument(
    file: File,
  ) {
    await addDocument(file)

    if (file.type.startsWith('image/')) {
      await readInvoiceWithAi(file)
    }
  }

  async function removeDocument(id: string) {
    try {
      await deleteDocument(id)
      setDocuments((current) =>
        current.filter(
          (item) => item.id !== id,
        ),
      )
    } catch {
      window.alert(
        'Dokument nije moguće obrisati.',
      )
    }
  }

  async function saveInvoice() {
    const nextErrors: Record<
      string,
      string
    > = {}

    if (!supplierName.trim()) {
      nextErrors.supplierName =
        'Unesi dobavljača.'
    }

    if (!invoiceNumber.trim()) {
      nextErrors.invoiceNumber =
        'Unesi broj računa.'
    }

    if (!invoiceDate) {
      nextErrors.invoiceDate =
        'Odaberi datum računa.'
    }

    if (
      [netAmount, vatAmount, totalAmount].some(
        (value) => value < 0,
      )
    ) {
      nextErrors.amounts =
        'Iznosi ne mogu biti negativni.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    const now = new Date().toISOString()

    const saved: IncomingInvoice = {
      id:
        editing?.id ??
        createId('incoming-invoice'),
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
      totalAmount:
        Number(totalAmount) || 0,
      note: note.trim(),
      documents,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      await upsertIncomingInvoice(saved as IncomingInvoiceRecord)
    } catch (error) {
      console.error('Ulazni račun se nije mogao spremiti u bazu:', error)
      window.alert('Račun se nije mogao spremiti u bazu. Pokušaj ponovno.')
      return
    }

    const current = readInvoices()

    const updated = editing
      ? current.map((item) =>
          item.id === saved.id
            ? saved
            : item,
        )
      : [saved, ...current]

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated),
    )

    navigate('/incoming-invoices')
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1450px] space-y-4 pb-32 sm:space-y-6 sm:pb-12">
        <button
          type="button"
          onClick={() =>
            navigate('/incoming-invoices')
          }
          className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
        >
          <ArrowLeft size={18} />
          Ulazni računi
        </button>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                DIGITALNI REGISTRATOR
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {editing
                  ? 'Uredi ulazni račun'
                  : 'Novi ulazni račun'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Skeniraj račun ili ga unesi ručno.
                FERSYS AI popunjava samo podatke
                koje uspije pouzdano prepoznati.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setScannerOpen(true)
              }
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white active:scale-95 sm:hidden"
              aria-label="Skeniraj račun"
            >
              <Camera size={20} />
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <HeroMetric
              label="Dobavljač"
              value={
                supplierName ||
                'Nije unesen'
              }
            />
            <HeroMetric
              label="Dokumenti"
              value={String(
                documents.length,
              )}
            />
            <HeroMetric
              label="Ukupno"
              value={money(totalAmount)}
            />
          </div>
        </section>

        {(aiReading || aiMessage) && (
          <section
            className={`rounded-3xl border p-4 sm:p-5 ${
              aiReading
                ? 'border-violet-500/25 bg-violet-500/10'
                : 'border-emerald-500/20 bg-emerald-500/[0.07]'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                {aiReading ? (
                  <LoaderCircle
                    size={20}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={20} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-white">
                    FERSYS AI Scan
                  </p>
                  {aiConfidence !== null && (
                    <span className="rounded-full bg-slate-950/50 px-2 py-1 text-[10px] font-black text-emerald-300">
                      {Math.round(
                        aiConfidence * 100,
                      )}
                      % sigurnost
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {aiMessage}
                </p>

                {aiWarnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {aiWarnings.map(
                      (warning, index) => (
                        <p
                          key={`${warning}-${index}`}
                          className="text-xs font-bold text-amber-300"
                        >
                          • {warning}
                        </p>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200">
            Provjeri označena polja prije
            spremanja.
          </div>
        )}

        <MobileSection
          number="1"
          title="Dobavljač i račun"
          description="Osnovni podaci računa i knjiženja."
          icon={<FileText size={19} />}
        >
          <Field
            label="Dobavljač"
            error={errors.supplierName}
          >
            <input
              value={supplierName}
              onChange={(event) =>
                setSupplierName(
                  event.target.value,
                )
              }
              placeholder="INA, Pevex, Kaufland..."
              className={inputClass}
            />
          </Field>

          <Field label="OIB dobavljača">
            <input
              inputMode="numeric"
              maxLength={11}
              value={supplierOib}
              onChange={(event) =>
                setSupplierOib(
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 11),
                )
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Broj računa"
            error={errors.invoiceNumber}
          >
            <input
              value={invoiceNumber}
              onChange={(event) =>
                setInvoiceNumber(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="Datum računa"
            error={errors.invoiceDate}
          >
            <input
              type="date"
              value={invoiceDate}
              onChange={(event) =>
                setInvoiceDate(
                  event.target.value,
                )
              }
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <Field label="Datum dospijeća">
            <input
              type="date"
              value={dueDate}
              onChange={(event) =>
                setDueDate(
                  event.target.value,
                )
              }
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <Field label="Datum knjiženja">
            <input
              type="date"
              value={bookingDate}
              onChange={(event) =>
                setBookingDate(
                  event.target.value,
                )
              }
              className={`${inputClass} [color-scheme:dark]`}
            />
          </Field>

          <Field label="Kategorija">
            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target
                    .value as Category,
                )
              }
              className={inputClass}
            >
              {categories.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as Status,
                )
              }
              className={inputClass}
            >
              {statuses.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Način plaćanja"
            className="sm:col-span-2"
          >
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              {paymentMethods.map(
                (method) => (
                  <option
                    key={method}
                    value={method}
                  >
                    {method}
                  </option>
                ),
              )}
            </select>
          </Field>
        </MobileSection>

        <MobileSection
          number="2"
          title="Iznosi"
          description="Osnovica, PDV i ukupni iznos. Nula više ne smeta pri unosu."
        >
          <Field label="Osnovica">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={
                netAmount === 0
                  ? ''
                  : netAmount
              }
              onChange={(event) => {
                const value = numberValue(
                  event.target.value,
                )
                setNetAmount(value)
                setVatAmount(
                  Math.max(
                    0,
                    totalAmount - value,
                  ),
                )
              }}
              placeholder="0,00"
              className={`${inputClass} text-lg font-black`}
            />
          </Field>

          <Field label="PDV">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={
                vatAmount === 0
                  ? ''
                  : vatAmount
              }
              onChange={(event) =>
                setVatAmount(
                  numberValue(
                    event.target.value,
                  ),
                )
              }
              placeholder="0,00"
              className={`${inputClass} text-lg font-black`}
            />
          </Field>

          <Field
            label="Ukupno"
            className="sm:col-span-2"
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={
                totalAmount === 0
                  ? ''
                  : totalAmount
              }
              onChange={(event) => {
                const value = numberValue(
                  event.target.value,
                )
                setTotalAmount(value)
                setVatAmount(
                  Math.max(
                    0,
                    value - netAmount,
                  ),
                )
              }}
              placeholder="0,00"
              className={`${inputClass} border-violet-400/30 bg-violet-500/10 text-xl font-black`}
            />
          </Field>

          <div className="rounded-2xl bg-slate-950/50 p-4 sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Kontrola
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">
                Ukupno − osnovica
              </span>
              <strong className="text-white">
                {money(calculatedVat)}
              </strong>
            </div>
          </div>

          {errors.amounts && (
            <div className="rounded-2xl bg-red-500/10 p-3 text-sm font-black text-red-300 sm:col-span-2">
              {errors.amounts}
            </div>
          )}
        </MobileSection>

        <MobileSection
          number="3"
          title="Dokumenti i AI sken"
          description="Fotografiraj račun ili dodaj PDF/sliku."
          icon={<Paperclip size={19} />}
        >
          <button
            type="button"
            onClick={() =>
              setScannerOpen(true)
            }
            className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-3 text-center text-xs font-black text-white active:scale-[0.99]"
          >
            <Camera size={24} />
            Smart Scan + AI
            <span className="text-[10px] font-semibold text-violet-100">
              Fotografiraj → izreži → automatski
              popuni
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-3 text-center text-xs font-black text-white active:scale-[0.99]"
          >
            <Upload size={22} />
            PDF ili slika
            <span className="text-[10px] font-semibold text-slate-500">
              Slike se automatski analiziraju
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file =
                event.target.files?.[0]

              if (file) {
                void handleUploadedDocument(
                  file,
                )
              }

              event.currentTarget.value = ''
            }}
          />

          {(savingDocument || aiReading) && (
            <div className="rounded-2xl bg-cyan-500/10 p-3 text-sm font-black text-cyan-200 sm:col-span-2">
              {aiReading
                ? 'FERSYS AI analizira račun...'
                : 'Spremanje dokumenta...'}
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
                Još nema dokumenata.
              </div>
            ) : (
              documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">
                        {document.fileName}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        {document.mimeType}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void downloadDocument(
                          document.id,
                        )
                      }
                      className="min-h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-slate-200"
                    >
                      Otvori
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void removeDocument(
                          document.id,
                        )
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-red-500/10 px-3 text-xs font-black text-red-300"
                    >
                      <Trash2 size={14} />
                      Obriši
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </MobileSection>

        <MobileSection
          number="4"
          title="Napomena"
          description="Interni opis računa ili poveznica s poslom."
        >
          <Field
            label="Napomena"
            className="sm:col-span-2"
          >
            <textarea
              rows={5}
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Opis kupnje, vozilo, radni nalog ili zaposlenik..."
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
          </Field>
        </MobileSection>

        <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900 to-violet-950/30 p-4 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
            SAŽETAK
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <TotalBox
              label="Osnovica"
              value={money(netAmount)}
            />
            <TotalBox
              label="PDV"
              value={money(vatAmount)}
            />
            <TotalBox
              label="Ukupno"
              value={money(totalAmount)}
              strong
            />
          </div>
        </section>

        <div className="hidden justify-end sm:flex">
          <button
            type="button"
            onClick={saveInvoice}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 font-black text-white"
          >
            <Save size={18} />
            Spremi račun
          </button>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={saveInvoice}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          <Save size={18} />
          Spremi račun
        </button>
      </div>

      <DocumentScannerModal
        open={scannerOpen}
        onClose={() =>
          setScannerOpen(false)
        }
        onConfirm={handleScannedInvoice}
      />
    </>
  )
}

function MobileSection({
  number,
  title,
  description,
  icon,
  children,
}: {
  number: string
  title: string
  description: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-xs font-black text-violet-300">
          {icon ?? number}
        </span>

        <div className="min-w-0">
          <h2 className="text-lg font-black text-white sm:text-xl">
            {number}. {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  error,
  className = '',
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>
      <div className="mt-2">
        {children}
      </div>
      {error && (
        <span className="mt-2 block text-xs font-black text-red-300">
          {error}
        </span>
      )}
    </label>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

function TotalBox({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl p-3 ${
        strong
          ? 'bg-violet-600'
          : 'bg-slate-800/65'
      }`}
    >
      <p
        className={`truncate text-[9px] font-black uppercase tracking-wide ${
          strong
            ? 'text-violet-100'
            : 'text-slate-600'
        }`}
      >
        {label}
      </p>
      <p className="mt-2 truncate text-xs font-black text-white sm:text-sm">
        {value}
      </p>
    </div>
  )
}

export default NewIncomingInvoicePage
