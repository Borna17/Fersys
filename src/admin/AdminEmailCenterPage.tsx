import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Mail,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  UsersRound,
  XCircle,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import {
  getEmailCenterStats,
  runEmailAutomationsNow,
  sendEmailCampaign,
  type EmailCenterStats,
  type SendCampaignInput,
} from './services/emailCenter.service'

const emptyStats:
EmailCenterStats = {
  sentTotal: 0,
  failedTotal: 0,
  sentThisMonth: 0,
  campaignsTotal: 0,
  recentDeliveries: [],
  recentCampaigns: [],
}

export function AdminEmailCenterPage() {
  const [
    stats,
    setStats,
  ] =
    useState<
      EmailCenterStats
    >(emptyStats)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    sending,
    setSending,
  ] = useState(false)

  const [
    running,
    setRunning,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const [
    form,
    setForm,
  ] =
    useState<SendCampaignInput>({
      audienceType: 'all',
      subject: '',
      htmlBody:
        '<h1>Novo u FERSYS-u</h1><p>Dodali smo novu funkciju koja može olakšati svakodnevni rad tvoje tvrtke.</p>',
      ctaLabel:
        'Otvori FERSYS',
      ctaUrl:
        'https://app.fersys.app/dashboard',
      campaignType:
        'product_update',
    })

  const load =
    useCallback(async () => {
      try {
        setLoading(true)
        setError('')

        setStats(
          await getEmailCenterStats(),
        )
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : 'Email centar nije moguće učitati.',
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (
      !window.confirm(
        'Poslati ovu poruku odabranoj grupi korisnika?',
      )
    ) {
      return
    }

    try {
      setSending(true)
      setError('')
      setSuccess('')

      const result =
        await sendEmailCampaign(
          form,
        )

      setSuccess(
        `Kampanja završena: ${result.sent} poslano, ${result.failed} neuspjelo.`,
      )

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

  async function runAutomations() {
    try {
      setRunning(true)
      setError('')
      setSuccess('')

      const result =
        await runEmailAutomationsNow()

      setSuccess(
        `Automatizacije provjerene: ${result.checked} tvrtki, ${result.sent} novih poruka poslano.`,
      )

      await load()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Automatizacije nije moguće pokrenuti.',
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="mx-auto max-w-[1550px]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
            <Mail
              size={15}
            />
            FERSYS Messaging
          </div>

          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            E-mail centar
          </h1>

          <p className="mt-2 max-w-2xl text-slate-400">
            Automatske poruke za trial i limite paketa te ručne FERSYS novosti, updatei i newsletteri.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void runAutomations()
            }
            disabled={running}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 text-sm font-black text-violet-200 disabled:opacity-50"
          >
            <Sparkles
              size={17}
            />
            {running
              ? 'Provjera...'
              : 'Pokreni automatizacije'}
          </button>

          <button
            type="button"
            onClick={() =>
              void load()
            }
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-black text-slate-300"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />
            Osvježi
          </button>
        </div>
      </div>

      {error && (
        <Message
          tone="error"
          icon={
            <AlertTriangle
              size={18}
            />
          }
        >
          {error}
        </Message>
      )}

      {success && (
        <Message
          tone="success"
          icon={
            <CheckCircle2
              size={18}
            />
          }
        >
          {success}
        </Message>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Send />}
          label="Ukupno poslano"
          value={
            stats.sentTotal
          }
        />

        <Stat
          icon={<Clock3 />}
          label="Ovaj mjesec"
          value={
            stats.sentThisMonth
          }
        />

        <Stat
          icon={
            <Megaphone />
          }
          label="Kampanje"
          value={
            stats.campaignsTotal
          }
        />

        <Stat
          icon={<XCircle />}
          label="Neuspjelo"
          value={
            stats.failedTotal
          }
          danger={
            stats.failedTotal >
            0
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <form
          onSubmit={submit}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
              <Megaphone
                size={20}
              />
            </span>

            <div>
              <h2 className="font-black">
                Nova poruka
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Pošalji update ili newsletter.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Field
              label="Primatelji"
            >
              <select
                value={
                  form.audienceType
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    audienceType:
                      event.target
                        .value as SendCampaignInput['audienceType'],
                  })
                }
                className={inputClass}
              >
                <option value="all">
                  Sve tvrtke
                </option>
                <option value="starter">
                  Starter
                </option>
                <option value="business">
                  Business
                </option>
                <option value="pro">
                  FERSYS Pro
                </option>
                <option value="trialing">
                  Samo trial korisnici
                </option>
              </select>
            </Field>

            <Field
              label="Vrsta poruke"
            >
              <select
                value={
                  form.campaignType
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    campaignType:
                      event.target
                        .value as SendCampaignInput['campaignType'],
                  })
                }
                className={inputClass}
              >
                <option value="product_update">
                  Novost / update
                </option>
                <option value="newsletter">
                  Newsletter
                </option>
                <option value="system">
                  Važna sistemska obavijest
                </option>
              </select>
            </Field>

            <Field
              label="Naslov"
            >
              <input
                value={
                  form.subject
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    subject:
                      event.target.value,
                  })
                }
                placeholder="Novo u FERSYS-u — Vozni park"
                className={inputClass}
              />
            </Field>

            <Field
              label="Sadržaj"
            >
              <textarea
                value={
                  form.htmlBody
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    htmlBody:
                      event.target.value,
                  })
                }
                rows={9}
                className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-6 text-white outline-none focus:border-violet-500"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Tekst gumba"
              >
                <input
                  value={
                    form.ctaLabel ??
                    ''
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ctaLabel:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>

              <Field
                label="Link gumba"
              >
                <input
                  value={
                    form.ctaUrl ??
                    ''
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      ctaUrl:
                        event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={
                sending ||
                !form.subject.trim() ||
                !form.htmlBody.trim()
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-black text-white hover:bg-violet-500 disabled:opacity-50"
            >
              <Send
                size={18}
              />
              {sending
                ? 'Slanje...'
                : 'Pošalji poruku'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <UsersRound
                size={20}
                className="text-blue-400"
              />

              <div>
                <h2 className="font-black">
                  Automatske poruke
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Aktivne zaštite od dvostrukog slanja.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AutomationCard
                title="Trial — 3 dana"
                text="Podsjetnik na odabir paketa."
              />
              <AutomationCard
                title="Trial — 1 dan"
                text="Podsjetnik dan prije završetka."
              />
              <AutomationCard
                title="Trial — danas"
                text="Poruka na dan završetka."
              />
              <AutomationCard
                title="80% limita"
                text="Upozorenje prije blokade."
              />
              <AutomationCard
                title="100% limita"
                text="Upgrade poruka kada se dosegne limit."
              />
            </div>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-black">
              Zadnje poslane poruke
            </h2>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
              {stats.recentDeliveries.length ===
              0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Još nema poslanih poruka.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {stats.recentDeliveries
                    .slice(
                      0,
                      12,
                    )
                    .map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="grid gap-2 bg-slate-950/35 p-4 sm:grid-cols-[1fr_140px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-200">
                              {
                                item.subject
                              }
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {
                                item.recipientEmail
                              }
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                item.status ===
                                'sent'
                                  ? 'bg-emerald-500/10 text-emerald-300'
                                  : 'bg-red-500/10 text-red-300'
                              }`}
                            >
                              {
                                item.status
                              }
                            </span>
                            <p className="mt-2 text-[10px] text-slate-600">
                              {formatDate(
                                item.createdAt,
                              )}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

const inputClass =
  'mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500'

function Field({
  label,
  children,
}: {
  label: string
  children:
    ReactNode
}) {
  return (
    <label className="block text-sm font-bold text-slate-300">
      {label}
      {children}
    </label>
  )
}

function Stat({
  icon,
  label,
  value,
  danger = false,
}: {
  icon:
    ReactNode
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${
            danger
              ? 'bg-red-500/10 text-red-300'
              : 'bg-violet-500/10 text-violet-300'
          }`}
        >
          {icon}
        </span>

        <strong className="text-2xl font-black">
          {value}
        </strong>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </article>
  )
}

function AutomationCard({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2
          size={16}
          className="text-emerald-400"
        />
        <p className="text-sm font-black text-white">
          {title}
        </p>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  )
}

function Message({
  tone,
  icon,
  children,
}: {
  tone:
    | 'error'
    | 'success'
  icon:
    ReactNode
  children:
    ReactNode
}) {
  return (
    <div
      className={`mt-5 flex gap-3 rounded-2xl border p-4 text-sm ${
        tone === 'error'
          ? 'border-red-500/20 bg-red-500/10 text-red-300'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {icon}
      {children}
    </div>
  )
}

function formatDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
    {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}
