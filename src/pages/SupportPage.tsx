import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Headphones,
  MailQuestion,
  MessageSquareText,
  RefreshCw,
  Send,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  createSupportTicket,
  getMySupportTickets,
  type MySupportTicket,
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
  const [loading, setLoading] =
    useState(true)
  const [submitting, setSubmitting] =
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

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setTickets(
        await getMySupportTickets(),
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Support zahtjeve nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
        })

      setSuccess(
        `Zahtjev ${ticketNumber} uspješno je poslan FERSYS podršci.`,
      )

      setSubject('')
      setDescription('')
      setPriority('normal')
      setModule('')
      setContactPhone('')

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

  return (
    <section className="mx-auto max-w-[1500px]">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-blue-300">
          <Headphones size={15} />
          FERSYS podrška
        </div>

        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          Kako ti možemo pomoći?
        </h1>

        <p className="mt-2 max-w-2xl text-slate-400">
          Pošalji support zahtjev i prati
          odgovor FERSYS administracije
          izravno u aplikaciji.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
          />
          <span>{success}</span>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-xl font-black text-white">
            Novi support zahtjev
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Opiši problem što detaljnije.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-300">
              Kategorija
              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-blue-500"
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
            </label>

            <label className="block text-sm font-bold text-slate-300">
              Predmet
              <input
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value,
                  )
                }
                placeholder="Primjer: Ne mogu spremiti radni nalog"
                maxLength={120}
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-bold text-slate-300">
              Opis problema
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Napiši što si pokušao, što se dogodilo i prikazuje li se neka greška..."
                maxLength={4000}
                className="mt-2 min-h-40 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-300">
                Modul
                <select
                  value={module}
                  onChange={(event) =>
                    setModule(
                      event.target.value,
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-blue-500"
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
              </label>

              <label className="block text-sm font-bold text-slate-300">
                Prioritet
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as SupportTicketPriority,
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-blue-500"
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
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-300">
              Kontakt telefon — opcionalno
              <input
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(
                    event.target.value,
                  )
                }
                placeholder="+385..."
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </label>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
              {submitting
                ? 'Slanje...'
                : 'Pošalji zahtjev'}
            </button>
          </div>
        </article>

        <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
            <div>
              <h2 className="text-xl font-black text-white">
                Moji zahtjevi
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Statusi i odgovori podrške.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400 transition hover:text-white disabled:opacity-50"
              aria-label="Osvježi"
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

          <div className="max-h-[760px] overflow-y-auto">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
              />
            ))}

            {!loading &&
              tickets.length === 0 && (
                <div className="px-6 py-20 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <Headphones size={30} />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-white">
                    Još nema zahtjeva
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Poslani support zahtjevi
                    prikazat će se ovdje.
                  </p>
                </div>
              )}

            {loading && (
              <div className="px-6 py-20 text-center text-slate-500">
                Učitavanje zahtjeva...
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

function TicketCard({
  ticket,
}: {
  ticket: MySupportTicket
}) {
  return (
    <div className="border-b border-slate-800 p-5 last:border-0 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-300">
            {ticket.ticketNumber}
          </p>
          <h3 className="mt-2 text-lg font-black text-white">
            {ticket.subject}
          </h3>
        </div>

        <StatusBadge
          status={ticket.status}
        />
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
        {ticket.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
          {ticket.category}
        </span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
          {priorityLabels[
            ticket.priority
          ]}
        </span>
        {ticket.module && (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
            {ticket.module}
          </span>
        )}
      </div>

      {ticket.adminReply && (
        <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-300">
            Odgovor FERSYS podrške
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
            {ticket.adminReply}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
        <Clock3 size={14} />
        {formatDateTime(ticket.createdAt)}
      </div>
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
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
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
  const className =
    status === 'new'
      ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
      : status === 'open'
        ? 'border-violet-500/20 bg-violet-500/10 text-violet-300'
        : status === 'waiting'
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
          : status === 'resolved'
            ? 'border-green-500/20 bg-green-500/10 text-green-300'
            : 'border-slate-700 bg-slate-800 text-slate-300'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
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