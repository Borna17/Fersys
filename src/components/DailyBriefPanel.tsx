import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import {
  getDailyBrief,
  type DailyBrief,
  type DailyBriefItem,
} from '../services/dailyBrief.service'
import {
  getSmartFollowUps,
  type SmartFollowUpItem,
} from '../services/smartFollowUp.service'

type PanelTab =
  | 'today'
  | 'follow-up'

const SNOOZE_KEY =
  'fersys-smart-follow-up-snoozed-v1'

function dateKey(
  offsetDays = 0,
) {
  const date =
    new Date()

  date.setDate(
    date.getDate() +
      offsetDays,
  )

  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Europe/Zagreb',
    },
  ).format(date)
}

function loadSnoozed() {
  try {
    return JSON.parse(
      localStorage.getItem(
        SNOOZE_KEY,
      ) ?? '{}',
    ) as Record<
      string,
      string
    >
  } catch {
    return {} as Record<
      string,
      string
    >
  }
}

function isSnoozed(
  id: string,
) {
  const until =
    loadSnoozed()[id]

  return Boolean(
    until &&
    until > dateKey(),
  )
}

function snoozeUntilTomorrow(
  id: string,
) {
  const current =
    loadSnoozed()

  current[id] =
    dateKey(1)

  localStorage.setItem(
    SNOOZE_KEY,
    JSON.stringify(
      current,
    ),
  )
}

export default function DailyBriefPanel() {
  const location =
    useLocation()
  const navigate =
    useNavigate()

  const [
    open,
    setOpen,
  ] =
    useState(false)

  const [
    tab,
    setTab,
  ] =
    useState<PanelTab>(
      'today',
    )

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    loaded,
    setLoaded,
  ] =
    useState(false)

  const [
    brief,
    setBrief,
  ] =
    useState<DailyBrief | null>(
      null,
    )

  const [
    followUps,
    setFollowUps,
  ] =
    useState<
      SmartFollowUpItem[]
    >([])

  const isDashboard =
    location.pathname ===
    '/dashboard'

  const visibleFollowUps =
    useMemo(
      () =>
        followUps.filter(
          (item) =>
            !isSnoozed(
              item.id,
            ),
        ),
      [followUps],
    )

  async function load() {
    try {
      setLoading(true)
      setError('')

      const [
        nextBrief,
        nextFollowUps,
      ] =
        await Promise.all([
          getDailyBrief(),
          getSmartFollowUps(),
        ])

      setBrief(
        nextBrief,
      )
      setFollowUps(
        nextFollowUps,
      )
      setLoaded(true)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Pregled trenutno nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function openPanel() {
    setOpen(true)

    if (!loaded) {
      await load()
    }
  }

  if (!isDashboard) {
    return null
  }

  const attentionCount =
    (
      brief?.urgentOrders ??
      0
    ) +
    (
      brief
        ?.unfinishedOrders ??
      0
    ) +
    (
      brief
        ?.invoiceAlerts ??
      0
    )

  const highFollowUps =
    visibleFollowUps.filter(
      (item) =>
        item.priority ===
        'high',
    ).length

  return (
    <>
      <button
        type="button"
        onClick={() =>
          void openPanel()
        }
        className="fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom))] right-3 z-[53] inline-flex h-11 items-center gap-2 rounded-2xl border border-violet-500/20 bg-slate-900/95 px-3.5 text-xs font-black text-white shadow-2xl shadow-black/40 backdrop-blur-xl active:scale-95 md:bottom-6 md:right-6"
      >
        <Sparkles
          size={17}
          className="text-violet-300"
        />

        Dnevni pregled

        {(attentionCount +
          highFollowUps) >
          0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-500 px-1 text-[10px] text-white">
            {attentionCount +
              highFollowUps >
            99
              ? '99+'
              : attentionCount +
                highFollowUps}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[175] flex items-end md:items-center md:justify-center md:p-5">
          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Zatvori pregled"
          />

          <section className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl md:w-[40rem] md:rounded-3xl md:border">
            <header className="border-b border-slate-800 p-4 sm:p-5">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700 md:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
                    FERSYS PREGLED
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    Danas i sljedeći koraci
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400"
                >
                  <X size={19} />
                </button>
              </div>

              {!loading &&
                loaded && (
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950/60 p-1">
                  <TabButton
                    active={
                      tab ===
                      'today'
                    }
                    icon={
                      <CalendarDays
                        size={15}
                      />
                    }
                    label="Danas"
                    badge={
                      attentionCount
                    }
                    onClick={() =>
                      setTab(
                        'today',
                      )
                    }
                  />

                  <TabButton
                    active={
                      tab ===
                      'follow-up'
                    }
                    icon={
                      <Sparkles
                        size={15}
                      />
                    }
                    label="Sljedeći koraci"
                    badge={
                      visibleFollowUps.length
                    }
                    onClick={() =>
                      setTab(
                        'follow-up',
                      )
                    }
                  />
                </div>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="grid min-h-56 place-items-center text-slate-500">
                  <div className="text-center">
                    <Loader2
                      size={26}
                      className="mx-auto animate-spin"
                    />
                    <p className="mt-3 text-xs">
                      Učitavam detaljni pregled...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                  <button
                    type="button"
                    onClick={() =>
                      void load()
                    }
                    className="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"
                  >
                    <RefreshCw
                      size={14}
                    />
                    Pokušaj ponovno
                  </button>
                </div>
              ) : tab ===
                'today' ? (
                brief ? (
                  <TodayTab
                    brief={brief}
                    onRefresh={() =>
                      void load()
                    }
                    onOpen={(
                      route,
                    ) => {
                      setOpen(
                        false,
                      )
                      navigate(
                        route,
                      )
                    }}
                  />
                ) : null
              ) : (
                <FollowUpTab
                  items={
                    visibleFollowUps
                  }
                  onRefresh={() =>
                    void load()
                  }
                  onOpen={(
                    route,
                  ) => {
                    setOpen(
                      false,
                    )
                    navigate(
                      route,
                    )
                  }}
                  onSnooze={(
                    id,
                  ) => {
                    snoozeUntilTomorrow(
                      id,
                    )
                    setFollowUps(
                      (current) =>
                        [
                          ...current,
                        ],
                    )
                  }}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function TabButton({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  badge: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-black transition ${
        active
          ? 'bg-slate-800 text-white'
          : 'text-slate-500'
      }`}
    >
      {icon}
      <span className="truncate">
        {label}
      </span>
      {badge > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[9px] text-white">
          {badge > 99
            ? '99+'
            : badge}
        </span>
      )}
    </button>
  )
}

function TodayTab({
  brief,
  onRefresh,
  onOpen,
}: {
  brief: DailyBrief
  onRefresh: () => void
  onOpen:
    (route: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <BriefMetric
          icon={
            <CalendarDays
              size={17}
            />
          }
          label="Danas"
          value={
            brief.todayOrders
          }
        />
        <BriefMetric
          icon={
            <AlertTriangle
              size={17}
            />
          }
          label="Hitno"
          value={
            brief.urgentOrders
          }
          alert={
            brief.urgentOrders >
            0
          }
        />
        <BriefMetric
          icon={
            <Wrench
              size={17}
            />
          }
          label="Provjeri"
          value={
            brief.unfinishedOrders
          }
        />
        <BriefMetric
          icon={
            <FileText
              size={17}
            />
          }
          label="Ponude"
          value={
            brief.waitingOffers
          }
        />
        <BriefMetric
          icon={
            <ReceiptText
              size={17}
            />
          }
          label="Računi"
          value={
            brief.invoiceAlerts
          }
        />
      </div>

      <SectionHeader
        label="Prioriteti"
        onRefresh={
          onRefresh
        }
      />

      {brief.items.length ===
      0 ? (
        <EmptyState
          title="Nema posebnih prioriteta"
          text="Trenutno nema hitnih ili nezavršenih stavki."
        />
      ) : (
        <div className="mt-3 space-y-2">
          {brief.items.map(
            (item) => (
              <BriefItemButton
                key={item.id}
                item={item}
                onClick={() =>
                  onOpen(
                    item.route,
                  )
                }
              />
            ),
          )}
        </div>
      )}
    </>
  )
}

function FollowUpTab({
  items,
  onRefresh,
  onOpen,
  onSnooze,
}: {
  items:
    SmartFollowUpItem[]
  onRefresh: () => void
  onOpen:
    (route: string) => void
  onSnooze:
    (id: string) => void
}) {
  return (
    <>
      <SectionHeader
        label={`${items.length} sljedećih koraka`}
        onRefresh={
          onRefresh
        }
      />

      {items.length ===
      0 ? (
        <EmptyState
          title="Nema otvorenih follow-upa"
          text="Trenutno nema očitog sljedećeg koraka."
        />
      ) : (
        <div className="mt-3 space-y-2">
          {items
            .slice(
              0,
              15,
            )
            .map(
              (item) => (
                <FollowUpCard
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                  onOpen={() =>
                    onOpen(
                      item.route,
                    )
                  }
                  onSnooze={() =>
                    onSnooze(
                      item.id,
                    )
                  }
                />
              ),
            )}
        </div>
      )}
    </>
  )
}

function FollowUpCard({
  item,
  onOpen,
  onSnooze,
}: {
  item:
    SmartFollowUpItem
  onOpen: () => void
  onSnooze: () => void
}) {
  const Icon =
    item.kind ===
      'work-order-to-invoice' ||
    item.kind ===
      'invoice-due'
      ? ReceiptText
      : item.kind ===
          'offer-to-work-order'
        ? Wrench
        : FileText

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">
            {item.title}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            {item.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[11px] font-black text-white"
        >
          {item.actionLabel}
          <ChevronRight
            size={14}
          />
        </button>

        <button
          type="button"
          onClick={onSnooze}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-[10px] font-black text-slate-400"
        >
          <Clock3
            size={13}
          />
          Sutra
        </button>
      </div>
    </div>
  )
}

function SectionHeader({
  label,
  onRefresh,
}: {
  label: string
  onRefresh: () => void
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-800 px-3 text-[10px] font-black text-slate-400"
      >
        <RefreshCw
          size={13}
        />
        Osvježi
      </button>
    </div>
  )
}

function EmptyState({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="mt-3 grid min-h-44 place-items-center rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5 text-center">
      <div>
        <CheckCircle2
          size={30}
          className="mx-auto text-emerald-400"
        />
        <p className="mt-3 font-black text-white">
          {title}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {text}
        </p>
      </div>
    </div>
  )
}

function BriefMetric({
  icon,
  label,
  value,
  alert,
}: {
  icon: ReactNode
  label: string
  value: number
  alert?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        alert
          ? 'border-red-500/20 bg-red-500/10'
          : 'border-slate-800 bg-slate-950/55'
      }`}
    >
      <span
        className={
          alert
            ? 'text-red-300'
            : 'text-blue-300'
        }
      >
        {icon}
      </span>
      <p className="mt-3 text-xl font-black text-white">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-black uppercase text-slate-600">
        {label}
      </p>
    </div>
  )
}

function BriefItemButton({
  item,
  onClick,
}: {
  item: DailyBriefItem
  onClick: () => void
}) {
  const Icon =
    item.kind ===
      'work-order'
      ? Wrench
      : item.kind ===
          'offer'
        ? FileText
        : ReceiptText

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[70px] w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3 text-left"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">
          {item.title}
        </span>
        <span className="mt-1 block truncate text-[11px] text-slate-500">
          {item.description}
        </span>
      </span>
    </button>
  )
}
