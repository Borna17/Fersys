import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Clock3,
  Headphones,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getAdminSupportTickets,
  updateAdminSupportTicket,
  type AdminSupportTicket,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from './services/support.service'

const statusLabels: Record<
  SupportTicketStatus,
  string
> = {
  new: 'Novi',
  open: 'Otvoren',
  waiting: 'Čeka korisnika',
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

export function AdminSupportPage() {
  const [tickets, setTickets] =
    useState<AdminSupportTicket[]>([])
  const [selected, setSelected] =
    useState<AdminSupportTicket | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<'all' | SupportTicketStatus>(
      'all',
    )
  const [loading, setLoading] =
    useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const next =
        await getAdminSupportTickets()
      setTickets(next)

      if (selected) {
        setSelected(
          next.find(
            (item) =>
              item.id === selected.id,
          ) ?? null,
        )
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Support tickete nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === 'all' ||
        ticket.status === statusFilter

      const matchesSearch =
        !query ||
        [
          ticket.subject,
          ticket.companyName,
          ticket.requesterName,
          ticket.requesterEmail,
          ticket.message,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(query),
        )

      return (
        matchesStatus && matchesSearch
      )
    })
  }, [
    search,
    statusFilter,
    tickets,
  ])

  const summary = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) =>
        ['new', 'open'].includes(
          ticket.status,
        ),
      ).length,
      waiting: tickets.filter(
        (ticket) =>
          ticket.status === 'waiting',
      ).length,
      urgent: tickets.filter(
        (ticket) =>
          ticket.priority === 'urgent' &&
          ![
            'resolved',
            'closed',
          ].includes(ticket.status),
      ).length,
    }),
    [tickets],
  )

  return (
    <section className="mx-auto max-w-[1600px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-blue-300">
            <Headphones size={15} />
            Support centar
          </div>

          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            FERSYS podrška
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Pregledaj zahtjeve korisnika,
            odgovori na poruke i upravljaj
            prioritetima i statusima.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              loading ? 'animate-spin' : ''
            }
          />
          Osvježi
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ukupno"
          value={summary.total}
          note="Svi support zahtjevi"
          icon={<Headphones size={20} />}
          accent="blue"
        />
        <SummaryCard
          title="Otvoreni"
          value={summary.open}
          note="Novi i otvoreni zahtjevi"
          icon={
            <MessageSquareText size={20} />
          }
          accent="violet"
        />
        <SummaryCard
          title="Čeka korisnika"
          value={summary.waiting}
          note="Odgovor je već poslan"
          icon={<Clock3 size={20} />}
          accent="amber"
        />
        <SummaryCard
          title="Hitni"
          value={summary.urgent}
          note="Zahtijevaju brzu reakciju"
          icon={<ShieldAlert size={20} />}
          accent="red"
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

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
          <label className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pretraži predmet, tvrtku, korisnika ili poruku..."
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-500"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'all'
                  | SupportTicketStatus,
              )
            }
            className="h-12 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="all">
              Svi statusi
            </option>
            {Object.entries(
              statusLabels,
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid min-h-[620px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 lg:grid-cols-[420px_1fr]">
        <div className="border-b border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 px-5 py-4">
            <p className="text-sm font-black">
              Zahtjevi
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {filtered.length} prikazano
            </p>
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {filtered.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() =>
                  setSelected(ticket)
                }
                className={`w-full border-b border-slate-800/70 p-5 text-left transition ${
                  selected?.id === ticket.id
                    ? 'bg-blue-500/10'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge
                    status={ticket.status}
                  />
                  <PriorityBadge
                    priority={
                      ticket.priority
                    }
                  />
                </div>

                <p className="mt-3 line-clamp-1 font-black">
                  {ticket.subject ||
                    'Bez predmeta'}
                </p>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                  {ticket.message}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span className="truncate">
                    {ticket.companyName ||
                      ticket.requesterEmail}
                  </span>
                  <span className="shrink-0">
                    {formatDateTime(
                      ticket.createdAt,
                    )}
                  </span>
                </div>
              </button>
            ))}

            {!loading &&
              filtered.length === 0 && (
                <div className="px-6 py-16 text-center text-slate-500">
                  Nema pronađenih ticketa.
                </div>
              )}

            {loading && (
              <div className="px-6 py-16 text-center text-slate-500">
                Učitavanje ticketa...
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <TicketDetails
              ticket={selected}
              onClose={() =>
                setSelected(null)
              }
              onSaved={load}
            />
          ) : (
            <div className="grid min-h-[620px] place-items-center p-8 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                  <Headphones size={30} />
                </div>
                <h2 className="mt-5 text-2xl font-black">
                  Odaberi support zahtjev
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Klikni na ticket s lijeve
                  strane za pregled poruke,
                  odgovor i promjenu statusa.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TicketDetails({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: AdminSupportTicket
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [status, setStatus] =
    useState(ticket.status)
  const [priority, setPriority] =
    useState(ticket.priority)
  const [adminReply, setAdminReply] =
    useState(ticket.adminReply)
  const [internalNote, setInternalNote] =
    useState(ticket.internalNote)
  const [saving, setSaving] =
    useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] =
    useState('')

  useEffect(() => {
    setStatus(ticket.status)
    setPriority(ticket.priority)
    setAdminReply(ticket.adminReply)
    setInternalNote(ticket.internalNote)
    setError('')
    setSuccess('')
  }, [ticket])

  async function save() {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await updateAdminSupportTicket({
        ticketId: ticket.id,
        status,
        priority,
        adminReply,
        internalNote,
      })

      setSuccess(
        'Support ticket je uspješno spremljen.',
      )
      await onSaved()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={status} />
            <PriorityBadge
              priority={priority}
            />
          </div>

          <h2 className="mt-4 text-2xl font-black">
            {ticket.subject ||
              'Bez predmeta'}
          </h2>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <span>
              {ticket.companyName ||
                'Tvrtka nije navedena'}
            </span>
            <span>
              {formatDateTime(
                ticket.createdAt,
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-slate-300">
          <Mail size={17} />
          {ticket.requesterName ||
            'Korisnik'}
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {ticket.requesterEmail ||
            'E-mail nije naveden'}
        </p>

        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {ticket.message}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-300">
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as SupportTicketStatus,
              )
            }
            className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-blue-500"
          >
            {Object.entries(
              statusLabels,
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-slate-300">
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
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-5 block text-sm font-bold text-slate-300">
        Odgovor korisniku
        <textarea
          value={adminReply}
          onChange={(event) =>
            setAdminReply(
              event.target.value,
            )
          }
          placeholder="Upiši odgovor koji će korisnik vidjeti..."
          className="mt-2 min-h-36 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      </label>

      <label className="mt-5 block text-sm font-bold text-slate-300">
        Interna napomena
        <textarea
          value={internalNote}
          onChange={(event) =>
            setInternalNote(
              event.target.value,
            )
          }
          placeholder="Napomena koju vidi samo FERSYS administracija..."
          className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
      </label>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
          {success}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        <Send size={18} />
        {saving
          ? 'Spremanje...'
          : 'Spremi i odgovori'}
      </button>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  note,
  icon,
  accent,
}: {
  title: string
  value: number
  note: string
  icon: ReactNode
  accent:
    | 'blue'
    | 'violet'
    | 'amber'
    | 'red'
}) {
  const classes = {
    blue: 'bg-blue-500/10 text-blue-300',
    violet:
      'bg-violet-500/10 text-violet-300',
    amber:
      'bg-amber-500/10 text-amber-300',
    red: 'bg-red-500/10 text-red-300',
  }

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {note}
          </p>
        </div>

        <div
          className={`grid h-11 w-11 place-items-center rounded-2xl ${classes[accent]}`}
        >
          {icon}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({
  status,
}: {
  status: SupportTicketStatus
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}
    >
      {statusLabels[status]}
    </span>
  )
}

function PriorityBadge({
  priority,
}: {
  priority: SupportTicketPriority
}) {
  const className =
    priority === 'urgent'
      ? 'bg-red-500/10 text-red-300'
      : priority === 'high'
        ? 'bg-amber-500/10 text-amber-300'
        : 'bg-slate-800 text-slate-400'

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${className}`}
    >
      {priorityLabels[priority]}
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