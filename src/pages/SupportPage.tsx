import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Download,
  ExternalLink,
  CheckCircle2,
  Headphones,
  MailQuestion,
  MessageSquareText,
  ImagePlus,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  createSupportTicket,
  getMySupportMessages,
  getMySupportTickets,
  sendMySupportMessage,
  uploadSupportAttachment,
  validateSupportImage,
  type MySupportTicket,
  type SupportMessage,
  type SupportTicketPriority,
} from '../services/support.service'

const categories = [
  'Tehnički problem',
  'Radni nalozi',
  'Ponude',
  'Računi',
  'Skladište',
  'Pretplata i naplata',
  'Prijedlog poboljšanja',
  'Ostalo',
]

const modules = [
  'Dashboard',
  'Kupci',
  'Radni nalozi',
  'Ponude',
  'Računi',
  'Kalendar',
  'Skladište',
  'Zaposlenici',
  'AI pomoćnik',
  'Postavke',
  'Drugo',
]

const statusLabels: Record<string, string> = {
  new: 'Novi',
  open: 'U obradi',
  waiting: 'Čeka tvoj odgovor',
  resolved: 'Riješen',
  closed: 'Zatvoren',
}

const priorityLabels: Record<
  SupportTicketPriority,
  string
> = {
  normal: 'Normalan',
  high: 'Visok',
  urgent: 'Hitan',
}

export function SupportPage() {
  const [tickets, setTickets] =
    useState<MySupportTicket[]>([])
  const [selected, setSelected] =
    useState<MySupportTicket | null>(null)
  const [messages, setMessages] =
    useState<SupportMessage[]>([])
  const [loading, setLoading] =
    useState(true)
  const [messagesLoading, setMessagesLoading] =
    useState(false)
  const [submitting, setSubmitting] =
    useState(false)
  const [sending, setSending] =
    useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] =
    useState('')

  const [category, setCategory] =
    useState(categories[0])
  const [subject, setSubject] =
    useState('')
  const [description, setDescription] =
    useState('')
  const [priority, setPriority] =
    useState<SupportTicketPriority>(
      'normal',
    )
  const [module, setModule] =
    useState('')
  const [contactPhone, setContactPhone] =
    useState('')
  const [reply, setReply] =
    useState('')
  const [
    newAttachment,
    setNewAttachment,
  ] = useState<File | null>(null)
  const [
    replyAttachment,
    setReplyAttachment,
  ] = useState<File | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const next =
        await getMySupportTickets()
      setTickets(next)

      if (selected) {
        setSelected(
          next.find(
            (ticket) =>
              ticket.id === selected.id,
          ) ?? null,
        )
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Support zahtjeve nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [selected])

  const loadMessages =
    useCallback(async (
      ticketId: string,
    ) => {
      try {
        setMessagesLoading(true)
        setError('')
        setMessages(
          await getMySupportMessages(
            ticketId,
          ),
        )
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : 'Razgovor nije moguće učitati.',
        )
      } finally {
        setMessagesLoading(false)
      }
    }, [])

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (selected) {
      void loadMessages(selected.id)
    } else {
      setMessages([])
    }
  }, [selected?.id])

  const openCount = useMemo(
    () =>
      tickets.filter((ticket) =>
        [
          'new',
          'open',
          'waiting',
        ].includes(ticket.status),
      ).length,
    [tickets],
  )

  async function submit() {
    if (
      subject.trim().length < 4 ||
      description.trim().length < 10
    ) {
      setError(
        'Upiši predmet i detaljniji opis problema.',
      )
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const attachmentPath =
        newAttachment
          ? await uploadSupportAttachment(
              newAttachment,
            )
          : ''

      const ticketNumber =
        await createSupportTicket({
          category,
          subject: subject.trim(),
          description:
            description.trim(),
          priority,
          module,
          contactPhone:
            contactPhone.trim(),
          attachmentUrl:
            attachmentPath,
        })

      setSuccess(
        `Zahtjev ${ticketNumber} uspješno je poslan FERSYS podršci.`,
      )

      setSubject('')
      setDescription('')
      setPriority('normal')
      setModule('')
      setContactPhone('')
      setNewAttachment(null)

      await load()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Zahtjev nije moguće poslati.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function sendReply() {
    if (
      !selected ||
      (
        reply.trim().length < 1 &&
        !replyAttachment
      )
    ) {
      return
    }

    try {
      setSending(true)
      setError('')

      const attachmentPath =
        replyAttachment
          ? await uploadSupportAttachment(
              replyAttachment,
            )
          : ''

      await sendMySupportMessage(
        selected.id,
        reply.trim() ||
          'Priložen screenshot.',
        attachmentPath,
      )

      setReply('')
      setReplyAttachment(null)
      await loadMessages(selected.id)
      await load()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Poruku nije moguće poslati.',
      )
    } finally {
      setSending(false)
    }
  }

  function chooseNewAttachment(
    file: File | null,
  ) {
    if (!file) return

    try {
      validateSupportImage(file)
      setNewAttachment(file)
      setError('')
    } catch (value) {
      setNewAttachment(null)
      setError(
        value instanceof Error
          ? value.message
          : 'Slika nije valjana.',
      )
    }
  }

  function chooseReplyAttachment(
    file: File | null,
  ) {
    if (!file) return

    try {
      validateSupportImage(file)
      setReplyAttachment(file)
      setError('')
    } catch (value) {
      setReplyAttachment(null)
      setError(
        value instanceof Error
          ? value.message
          : 'Slika nije valjana.',
      )
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-10 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              FERSYS PODRŠKA
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Kako ti možemo pomoći?
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Pošalji zahtjev i razgovaraj s FERSYS administracijom izravno u aplikaciji.
            </p>
          </div>

          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
            <Headphones size={22} />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <HeroMetric label="Ukupno" value={tickets.length} />
          <HeroMetric label="Otvoreni" value={openCount} />
          <HeroMetric
            label="Riješeni"
            value={tickets.filter((ticket) => ticket.status === 'resolved').length}
          />
        </div>
      </section>

      <div className="hidden gap-4 sm:grid sm:grid-cols-3">
        <SummaryCard
          label="Ukupno zahtjeva"
          value={tickets.length}
          icon={<MailQuestion size={20} />}
        />
        <SummaryCard
          label="Otvoreni"
          value={openCount}
          icon={
            <MessageSquareText size={20} />
          }
        />
        <SummaryCard
          label="Riješeni"
          value={
            tickets.filter(
              (ticket) =>
                ticket.status ===
                'resolved',
            ).length
          }
          icon={<CheckCircle2 size={20} />}
        />
      </div>

      <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-900 to-blue-500/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
              <BookOpen size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">POMOĆ PRIJE SLANJA ZAHTJEVA</p>
              <h2 className="mt-1 text-lg font-black text-white sm:text-xl">Korisnički priručnik</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                Otvori službeni FERSYS PDF vodič s prikazima aplikacije i kratkim uputama. Ako ne pronađeš rješenje, pošalji poruku podršci ispod.
              </p>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <a
              href="https://github.com/Borna17/Fersys/blob/main/public/FERSYS-Korisnicki-prirucnik.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500"
            >
              <ExternalLink size={17} />
              Otvori PDF
            </a>
            <a
              href="/FERSYS-Korisnicki-prirucnik.pdf"
              download="FERSYS-Korisnicki-prirucnik.pdf"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <Download size={17} />
              Preuzmi
            </a>
          </div>
        </div>
      </section>

      {error && (
        <MessageBox
          type="error"
          text={error}
        />
      )}

      {success && (
        <MessageBox
          type="success"
          text={success}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] xl:gap-6">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <h2 className="text-xl font-black text-white">
            Novi support zahtjev
          </h2>

          <div className="mt-4 space-y-4 sm:mt-6">
            <Field label="Kategorija">
              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
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

            <Field label="Predmet">
              <input
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value,
                  )
                }
                placeholder="Primjer: Ne mogu spremiti radni nalog"
                maxLength={120}
                className={inputClass}
              />
            </Field>

            <Field label="Opis problema">
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Napiši što si pokušao i što se dogodilo..."
                maxLength={4000}
                className={`${inputClass} min-h-40 py-3`}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Modul">
                <select
                  value={module}
                  onChange={(event) =>
                    setModule(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Nije odabrano
                  </option>
                  {modules.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Prioritet">
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as SupportTicketPriority,
                    )
                  }
                  className={inputClass}
                >
                  {Object.entries(
                    priorityLabels,
                  ).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>

            <Field label="Priloži screenshot — opcionalno">
              <label className="mt-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 text-sm text-slate-300 transition hover:border-blue-500/60">
                <ImagePlus
                  size={20}
                  className="shrink-0 text-blue-400"
                />

                <span className="min-w-0 flex-1 truncate">
                  {newAttachment
                    ? newAttachment.name
                    : 'Odaberi sliku iz galerije'}
                </span>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    chooseNewAttachment(
                      event.target.files?.[0] ??
                        null,
                    )
                    event.target.value = ''
                  }}
                />
              </label>

              {newAttachment && (
                <button
                  type="button"
                  onClick={() =>
                    setNewAttachment(null)
                  }
                  className="mt-2 text-xs font-black text-red-300"
                >
                  Ukloni prilog
                </button>
              )}

              <p className="mt-2 text-xs font-normal leading-5 text-slate-500">
                Slika do 8 MB.
              </p>
            </Field>

            <Field label="Kontakt telefon — opcionalno">
              <input
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(
                    event.target.value,
                  )
                }
                placeholder="+385..."
                className={inputClass}
              />
            </Field>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white transition active:scale-[0.99] hover:bg-blue-500 disabled:opacity-50"
            >
              <Send size={18} />
              {submitting
                ? 'Slanje...'
                : 'Pošalji zahtjev'}
            </button>
          </div>
        </article>

        <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5">
            <div>
              <h2 className="text-xl font-black text-white">
                Moji zahtjevi
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Klikni ticket za razgovor.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-400"
            >
              <RefreshCw
                size={18}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />
            </button>
          </div>

          {selected ? (
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-300">
                    {selected.ticketNumber}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {selected.subject}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelected(null)
                  }
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 max-h-[55dvh] space-y-3 overflow-y-auto rounded-2xl bg-slate-950/50 p-3 sm:mt-5 sm:max-h-[470px] sm:p-4">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                  />
                ))}

                {messagesLoading && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Učitavanje razgovora...
                  </p>
                )}
              </div>

              {![
                'resolved',
                'closed',
              ].includes(selected.status) && (
                <div className="sticky bottom-0 mt-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 backdrop-blur-xl">
                  {replyAttachment && (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate text-slate-300">
                        {replyAttachment.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReplyAttachment(
                            null,
                          )
                        }
                        className="shrink-0 text-slate-500 hover:text-white"
                        aria-label="Ukloni prilog"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <label
                      className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-slate-800 text-slate-400 transition active:scale-95 hover:text-white"
                      title="Priloži screenshot"
                    >
                      <Paperclip size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          chooseReplyAttachment(
                            event.target.files?.[0] ??
                              null,
                          )
                          event.target.value = ''
                        }}
                      />
                    </label>

                    <textarea
                      value={reply}
                      onChange={(event) =>
                        setReply(
                          event.target.value,
                        )
                      }
                      placeholder="Napiši poruku podršci..."
                      className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      disabled={
                        sending ||
                        (
                          !reply.trim() &&
                          !replyAttachment
                        )
                      }
                      onClick={() =>
                        void sendReply()
                      }
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[65dvh] overflow-y-auto sm:max-h-[700px]">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() =>
                    setSelected(ticket)
                  }
                  className="w-full border-b border-slate-800 p-4 text-left transition active:bg-slate-800/40 hover:bg-slate-800/40 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-300">
                        {ticket.ticketNumber}
                      </p>
                      <p className="mt-2 font-black text-white">
                        {ticket.subject}
                      </p>
                    </div>

                    <StatusBadge
                      status={ticket.status}
                    />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                    {ticket.description}
                  </p>
                </button>
              ))}

              {!loading &&
                tickets.length === 0 && (
                  <div className="px-6 py-20 text-center text-slate-500">
                    Još nema zahtjeva.
                  </div>
                )}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

const inputClass =
  'mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm font-bold text-slate-300">
      {label}
      {children}
    </label>
  )
}

function ChatBubble({
  message,
}: {
  message: SupportMessage
}) {
  const isAdmin =
    message.senderType === 'admin'

  return (
    <div
      className={`flex ${
        isAdmin
          ? 'justify-start'
          : 'justify-end'
      }`}
    >
      <div
        className={`max-w-[90%] rounded-2xl p-3 sm:max-w-[85%] sm:p-4 ${
          isAdmin
            ? 'bg-violet-500/10 text-slate-200'
            : 'bg-blue-600 text-white'
        }`}
      >
        <p className="text-xs font-black opacity-70">
          {message.senderName ||
            (isAdmin
              ? 'FERSYS podrška'
              : 'Korisnik')}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>

        {message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block overflow-hidden rounded-xl border border-white/10 bg-black/15"
            title="Otvori screenshot"
          >
            <img
              src={message.attachmentUrl}
              alt="Priloženi screenshot"
              className="max-h-72 w-full object-contain"
              loading="lazy"
            />
          </a>
        )}

        <p className="mt-2 text-[11px] opacity-60">
          {formatDateTime(
            message.createdAt,
          )}
        </p>
      </div>
    </div>
  )
}

function MessageBox({
  type,
  text,
}: {
  type: 'error' | 'success'
  text: string
}) {
  const isError = type === 'error'
  const Icon = isError
    ? AlertTriangle
    : CheckCircle2

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        isError
          ? 'border-red-500/20 bg-red-500/10 text-red-300'
          : 'border-green-500/20 bg-green-500/10 text-green-300'
      }`}
    >
      <Icon size={19} />
      <span>{text}</span>
    </div>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-2 py-3 text-center">
      <p className="truncate text-[8px] font-black uppercase tracking-wide text-slate-500 sm:text-[10px]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {value}
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
          {icon}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">
      {statusLabels[status] ?? status}
    </span>
  )
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}