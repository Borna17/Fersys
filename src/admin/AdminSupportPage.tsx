import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Clock3,
  Headphones,
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
  getAdminSupportMessages,
  getAdminSupportTickets,
  sendAdminSupportMessage,
  updateAdminSupportTicket,
  type AdminSupportTicket,
  type SupportMessage,
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
  low: 'Nizak',
  normal: 'Normalan',
  high: 'Visok',
  urgent: 'Hitan',
}

function ticketTimestamp(
  value: string,
) {
  const time =
    new Date(value).getTime()

  return Number.isFinite(time)
    ? time
    : 0
}

function sortSupportTickets(
  items: AdminSupportTicket[],
) {
  return [...items].sort(
    (a, b) => {
      const aNew =
        a.status === 'new'
      const bNew =
        b.status === 'new'

      if (aNew !== bNew) {
        return aNew
          ? -1
          : 1
      }

      return (
        ticketTimestamp(
          b.createdAt,
        ) -
        ticketTimestamp(
          a.createdAt,
        )
      )
    },
  )
}

export function AdminSupportPage() {
  const [tickets, setTickets] =
    useState<AdminSupportTicket[]>([])
  const [selected, setSelected] =
    useState<AdminSupportTicket | null>(null)
  const [messages, setMessages] =
    useState<SupportMessage[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<'all' | SupportTicketStatus>(
      'all',
    )
  const [loading, setLoading] =
    useState(true)
  const [messagesLoading, setMessagesLoading] =
    useState(false)
  const [openingTicketId, setOpeningTicketId] =
    useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const next =
        sortSupportTickets(
          await getAdminSupportTickets(),
        )

      setTickets(next)

      setSelected(
        (current) =>
          current
            ? next.find(
                (item) =>
                  item.id === current.id,
              ) ?? null
            : null,
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Support tickete nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages =
    useCallback(async (
      ticket: AdminSupportTicket,
    ) => {
      try {
        setMessagesLoading(true)

        const next =
          await getAdminSupportMessages(
            ticket.id,
          )

        setMessages(next)
      } catch (value) {
        console.error(
          'Support poruke nije moguće učitati:',
          value,
        )

        setMessages([
          {
            id:
              `fallback-${ticket.id}`,
            ticketId:
              ticket.id,
            senderType:
              'user',
            senderName:
              ticket.requesterName ||
              ticket.requesterEmail ||
              'Korisnik',
            message:
              ticket.message ||
              'Nema sadržaja poruke.',
            attachmentUrl: '',
            createdAt:
              ticket.createdAt,
            readByUserAt: null,
            readByAdminAt:
              new Date().toISOString(),
          },
        ])
      } finally {
        setMessagesLoading(false)
      }
    }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (selected) {
      void loadMessages(selected)
    } else {
      setMessages([])
    }
  }, [
    selected?.id,
    loadMessages,
  ])

  async function openTicket(
    ticket: AdminSupportTicket,
  ) {
    if (
      openingTicketId === ticket.id
    ) {
      return
    }

    if (
      ticket.status !== 'new'
    ) {
      setError('')
      setSelected(ticket)
      return
    }

    try {
      setOpeningTicketId(
        ticket.id,
      )
      setError('')

      await updateAdminSupportTicket({
        ticketId:
          ticket.id,
        status: 'open',
        priority:
          ticket.priority,
        internalNote:
          ticket.internalNote,
      })

      const openedTicket:
        AdminSupportTicket = {
          ...ticket,
          status: 'open',
          updatedAt:
            new Date().toISOString(),
        }

      setTickets(
        (current) =>
          sortSupportTickets(
            current.map(
              (item) =>
                item.id === ticket.id
                  ? openedTicket
                  : item,
            ),
          ),
      )

      setSelected(
        openedTicket,
      )

      await load()
    } catch (value) {
      console.error(
        'Support ticket nije moguće označiti otvorenim:',
        value,
      )

      setSelected(ticket)

      setError(
        'Ticket je otvoren za pregled, ali status nije moguće automatski promijeniti. Pokušaj ručno spremiti status "Otvoren".',
      )
    } finally {
      setOpeningTicketId(
        null,
      )
    }
  }

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase()

    const matching =
      tickets.filter((ticket) => {
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
          matchesStatus &&
          matchesSearch
        )
      })

    return sortSupportTickets(
      matching,
    )
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
      newCount: tickets.filter(
        (ticket) =>
          ticket.status === 'new',
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
            Razgovaraj s korisnicima i
            upravljaj ticketima.
          </p>

          {summary.newCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
              {summary.newCount}{' '}
              {summary.newCount === 1
                ? 'novi zahtjev'
                : 'novih zahtjeva'}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-200"
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
          icon={<Headphones size={20} />}
        />
        <SummaryCard
          title="Otvoreni"
          value={summary.open}
          icon={
            <MessageSquareText size={20} />
          }
        />
        <SummaryCard
          title="Čeka korisnika"
          value={summary.waiting}
          icon={<Clock3 size={20} />}
        />
        <SummaryCard
          title="Hitni"
          value={summary.urgent}
          icon={<ShieldAlert size={20} />}
        />
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle
            size={18}
            className="mr-2 inline"
          />
          {error}
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
              placeholder="Pretraži ticket..."
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none"
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
            className="h-12 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-slate-200"
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

      <div className="mt-6 grid min-h-[650px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 lg:grid-cols-[390px_1fr]">
        <div className="border-b border-slate-800 lg:border-b-0 lg:border-r">
          <div className="max-h-[650px] overflow-y-auto">
            {filtered.map((ticket) => {
              const isNew =
                ticket.status === 'new'

              const isOpening =
                openingTicketId ===
                ticket.id

              return (
                <button
                  key={ticket.id}
                  type="button"
                  disabled={isOpening}
                  onClick={() =>
                    void openTicket(ticket)
                  }
                  className={`relative w-full border-b p-5 text-left transition ${
                    selected?.id === ticket.id
                      ? isNew
                        ? 'border-emerald-400/25 bg-emerald-400/10'
                        : 'border-slate-800/70 bg-blue-500/10'
                      : isNew
                        ? 'border-emerald-400/20 bg-emerald-400/[0.07] hover:bg-emerald-400/10'
                        : 'border-slate-800/70 hover:bg-slate-800/40'
                  } disabled:opacity-70`}
                >
                  {isNew && (
                    <span className="absolute bottom-0 left-0 top-0 w-1 bg-emerald-400" />
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={ticket.status}
                      />
                    </div>

                    <PriorityBadge
                      priority={
                        ticket.priority
                      }
                    />
                  </div>

                  <p
                    className={`mt-3 font-black ${
                      isNew
                        ? 'text-white'
                        : ''
                    }`}
                  >
                    {ticket.subject}
                  </p>

                  <p
                    className={`mt-2 line-clamp-2 text-sm ${
                      isNew
                        ? 'text-slate-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {ticket.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">
                      {ticket.companyName ||
                        ticket.requesterEmail}
                    </span>

                    <span
                      className={`shrink-0 font-semibold ${
                        isNew
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {isOpening
                        ? 'Otvaranje...'
                        : formatDateTime(
                            ticket.createdAt,
                          )}
                    </span>
                  </div>
                </button>
              )
            })}

            {!loading &&
              filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  Nema support ticketa za odabrani filter.
                </div>
              )}
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <TicketChat
              ticket={selected}
              messages={messages}
              messagesLoading={
                messagesLoading
              }
              onClose={() =>
                setSelected(null)
              }
              onRefresh={async () => {
                await loadMessages(
                  selected,
                )
                await load()
              }}
            />
          ) : (
            <div className="grid min-h-[650px] place-items-center p-8 text-center text-slate-500">
              Odaberi ticket za razgovor.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TicketChat({
  ticket,
  messages,
  messagesLoading,
  onClose,
  onRefresh,
}: {
  ticket: AdminSupportTicket
  messages: SupportMessage[]
  messagesLoading: boolean
  onClose: () => void
  onRefresh: () => Promise<void>
}) {
  const [status, setStatus] =
    useState(ticket.status)
  const [priority, setPriority] =
    useState(ticket.priority)
  const [internalNote, setInternalNote] =
    useState(ticket.internalNote)
  const [reply, setReply] =
    useState('')
  const [saving, setSaving] =
    useState(false)
  const [sending, setSending] =
    useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStatus(ticket.status)
    setPriority(ticket.priority)
    setInternalNote(ticket.internalNote)
    setReply('')
    setError('')
  }, [ticket])

  async function saveSettings() {
    try {
      setSaving(true)
      setError('')

      await updateAdminSupportTicket({
        ticketId: ticket.id,
        status,
        priority,
        internalNote,
      })

      await onRefresh()
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

  async function sendReply() {
    if (!reply.trim()) {
      return
    }

    try {
      setSending(true)
      setError('')

      await sendAdminSupportMessage(
        ticket.id,
        reply.trim(),
      )

      setReply('')
      await onRefresh()
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

  return (
    <div className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">
            {ticket.subject}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {ticket.companyName ||
              'Tvrtka bez naziva'}
            {' · '}
            {ticket.requesterName ||
              ticket.requesterEmail}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>
              Poslano:{' '}
              <strong className="text-slate-300">
                {formatDateTime(
                  ticket.createdAt,
                )}
              </strong>
            </span>

            <span>
              Zadnja promjena:{' '}
              <strong className="text-slate-300">
                {formatDateTime(
                  ticket.updatedAt,
                )}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 max-h-[390px] space-y-3 overflow-y-auto rounded-2xl bg-slate-950/50 p-4">
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

      <div className="mt-4 flex gap-3">
        <textarea
          value={reply}
          onChange={(event) =>
            setReply(event.target.value)
          }
          placeholder="Napiši odgovor korisniku..."
          className="min-h-24 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-blue-500"
        />

        <button
          type="button"
          disabled={
            sending || !reply.trim()
          }
          onClick={() =>
            void sendReply()
          }
          className="self-end rounded-xl bg-blue-600 p-4 text-white disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
            className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
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
            className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
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

      <label className="mt-4 block text-sm font-bold text-slate-300">
        Interna napomena
        <textarea
          value={internalNote}
          onChange={(event) =>
            setInternalNote(
              event.target.value,
            )
          }
          className="mt-2 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
        />
      </label>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          void saveSettings()
        }
        className="mt-4 h-11 w-full rounded-xl bg-violet-600 font-black text-white disabled:opacity-50"
      >
        {saving
          ? 'Spremanje...'
          : 'Spremi status i napomenu'}
      </button>
    </div>
  )
}

function ChatBubble({
  message,
}: {
  message: SupportMessage
}) {
  const isAdmin =
    message.senderType === 'admin'

  const receiptText = isAdmin
    ? message.readByUserAt
      ? `Pročitano od korisnika ${formatDateTime(
          message.readByUserAt,
        )}`
      : 'Korisnik još nije pročitao'
    : message.readByAdminAt
      ? `Otvoreno u administraciji ${formatDateTime(
          message.readByAdminAt,
        )}`
      : 'Nova poruka korisnika'

  return (
    <div
      className={`flex ${
        isAdmin
          ? 'justify-end'
          : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[85%] rounded-2xl p-4 ${
          isAdmin
            ? 'bg-violet-600 text-white'
            : 'bg-slate-800 text-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-xs font-black opacity-80">
            {message.senderName ||
              (isAdmin
                ? 'FERSYS podrška'
                : 'Korisnik')}
          </p>

          <p className="text-[11px] opacity-60">
            {formatDateTime(
              message.createdAt,
            )}
          </p>
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>

        <p
          className={`mt-3 text-[11px] font-bold ${
            isAdmin &&
            !message.readByUserAt
              ? 'text-amber-200'
              : 'opacity-65'
          }`}
        >
          {receiptText}
        </p>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: ReactNode
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black">
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
  status: SupportTicketStatus
}) {
  const isNew =
    status === 'new'

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        isNew
          ? 'bg-emerald-400/15 text-emerald-300'
          : 'bg-slate-800 text-slate-300'
      }`}
    >
      {isNew
        ? 'NOVO'
        : statusLabels[status]}
    </span>
  )
}

function PriorityBadge({
  priority,
}: {
  priority: SupportTicketPriority
}) {
  const classes =
    priority === 'urgent'
      ? 'bg-red-500/15 text-red-300'
      : priority === 'high'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-slate-800 text-slate-300'

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}
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
