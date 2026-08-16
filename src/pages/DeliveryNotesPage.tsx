import {
  Archive,
  ChevronRight,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Settings,
  Truck,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import {
  IncomingDeliveryIntakePanel,
} from '../components/deliveryNotes/IncomingDeliveryIntakePanel'
import {
  getDeliveryNotes,
} from '../services/deliveryNotes.service'
import {
  deliveryNoteStatusLabels,
  type DeliveryNote,
  type DeliveryNoteStatus,
} from '../types/deliveryNote'

type ViewTab =
  | 'outgoing'
  | 'incoming'

function formatDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      `${value}T12:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(date)
}

export function DeliveryNotesPage() {
  const navigate =
    useNavigate()

  const [
    tab,
    setTab,
  ] =
    useState<ViewTab>(
      'outgoing',
    )

  const [
    notes,
    setNotes,
  ] =
    useState<
      DeliveryNote[]
    >([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    status,
    setStatus,
  ] =
    useState<
      'all' |
      DeliveryNoteStatus
    >('all')

  async function load() {
    try {
      setLoading(true)
      setError('')
      setNotes(
        await getDeliveryNotes(),
      )
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Otpremnice nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        return notes.filter(
          (note) => {
            if (
              status !==
                'all' &&
              note.status !==
                status
            ) {
              return false
            }

            if (!query) {
              return true
            }

            return [
              note.number,
              note.customerName,
              note.customerOib,
              note.workOrderNumber,
              note.offerNumber,
              note.deliveryAddress,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    query,
                  ),
            )
          },
        )
      },
      [
        notes,
        search,
        status,
      ],
    )

  const stats =
    useMemo(
      () => ({
        total:
          notes.length,
        drafts:
          notes.filter(
            (note) =>
              note.status ===
              'draft',
          ).length,
        active:
          notes.filter(
            (note) =>
              note.status ===
                'issued' ||
              note.status ===
                'delivered',
          ).length,
        inventory:
          notes.filter(
            (note) =>
              note.inventoryPosted,
          ).length,
      }),
      [notes],
    )

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 pb-20">
      <header className="rounded-[2rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              FERSYS LOGISTIKA
            </p>

            <h1 className="mt-2 text-3xl font-black text-white">
              Otpremnice
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Izlaz robe prema investitoru, potpisi i PDF dokumenti te ulaz robe skeniranjem dobavljačeve otpremnice.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/settings/delivery-notes',
                )
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-white"
            >
              <Settings
                size={17}
              />
              Izgled PDF-a
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/inventory/delivery-notes/new',
                )
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
            >
              <Plus
                size={18}
              />
              Nova otpremnica
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric
            label="Ukupno"
            value={
              stats.total
            }
          />
          <Metric
            label="Nacrti"
            value={
              stats.drafts
            }
          />
          <Metric
            label="Izdane / isporučene"
            value={
              stats.active
            }
          />
          <Metric
            label="Skinuto sa skladišta"
            value={
              stats.inventory
            }
          />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
        <Tab
          active={
            tab ===
            'outgoing'
          }
          onClick={() =>
            setTab(
              'outgoing',
            )
          }
          icon={
            <Truck
              size={17}
            />
          }
          label="Izlazne otpremnice"
        />

        <Tab
          active={
            tab ===
            'incoming'
          }
          onClick={() =>
            setTab(
              'incoming',
            )
          }
          icon={
            <ScanLine
              size={17}
            />
          }
          label="Ulaz robe / skeniranje"
        />
      </div>

      {tab ===
      'incoming' ? (
        <IncomingDeliveryIntakePanel />
      ) : (
        <>
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Broj, investitor, OIB, nalog, ponuda..."
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>

              <select
                value={
                  status
                }
                onChange={(
                  event,
                ) =>
                  setStatus(
                    event
                      .target
                      .value as
                      'all' |
                      DeliveryNoteStatus,
                  )
                }
                className="h-12 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
              >
                <option value="all">
                  Svi statusi
                </option>
                <option value="draft">
                  Nacrt
                </option>
                <option value="issued">
                  Izdana
                </option>
                <option value="delivered">
                  Isporučena
                </option>
                <option value="cancelled">
                  Stornirana
                </option>
              </select>

              <button
                type="button"
                onClick={() =>
                  void load()
                }
                className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-300"
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
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            {loading ? (
              <div className="py-16 text-center text-sm font-bold text-slate-500">
                Učitavanje otpremnica...
              </div>
            ) : filtered.length ===
              0 ? (
              <div className="py-16 text-center">
                <Archive
                  size={38}
                  className="mx-auto text-slate-600"
                />
                <h2 className="mt-4 text-lg font-black text-white">
                  Nema otpremnica
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Izradi prvu izlaznu otpremnicu ili promijeni filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(
                  (note) => (
                    <button
                      type="button"
                      key={
                        note.id
                      }
                      onClick={() =>
                        navigate(
                          `/inventory/delivery-notes/${note.id}`,
                        )
                      }
                      className="grid w-full gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-left transition hover:border-slate-700 sm:grid-cols-[1.15fr_1.4fr_.9fr_.8fr_auto] sm:items-center"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Otpremnica
                        </p>
                        <p className="mt-1 font-black text-white">
                          {note.number}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {note.customerName}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {note.deliveryAddress ||
                            'Bez adrese'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-300">
                          {formatDate(
                            note.deliveryDate,
                          )}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-600">
                          {note.items.length} stavki
                        </p>
                      </div>

                      <div>
                        <Status
                          status={
                            note.status
                          }
                        />
                        {note.workOrderNumber && (
                          <p className="mt-2 text-[10px] text-slate-500">
                            {note.workOrderNumber}
                          </p>
                        )}
                      </div>

                      <ChevronRight
                        size={18}
                        className="text-slate-500"
                      />
                    </button>
                  ),
                )}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon:
    ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function Status({
  status,
}: {
  status:
    DeliveryNoteStatus
}) {
  const style =
    status ===
    'delivered'
      ? 'bg-emerald-500/10 text-emerald-300'
      : status ===
          'cancelled'
        ? 'bg-red-500/10 text-red-300'
        : status ===
            'issued'
          ? 'bg-blue-500/10 text-blue-300'
          : 'bg-slate-700 text-slate-300'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style}`}>
      {
        deliveryNoteStatusLabels[
          status
        ]
      }
    </span>
  )
}

export default DeliveryNotesPage
