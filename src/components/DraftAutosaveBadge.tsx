import {
  CheckCircle2,
  CloudOff,
  RotateCcw,
  Trash2,
} from 'lucide-react'

export type DraftAutosaveState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'restored'

export default function DraftAutosaveBadge({
  state,
  text,
  onDiscard,
}: {
  state: DraftAutosaveState
  text: string
  onDiscard?: () => void
}) {
  if (
    state === 'idle' &&
    !text
  ) {
    return null
  }

  const Icon =
    state === 'offline'
      ? CloudOff
      : state === 'restored'
        ? RotateCcw
        : CheckCircle2

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-sm shadow-2xl backdrop-blur-xl">
      <Icon
        size={18}
        className={
          state === 'offline'
            ? 'text-amber-400'
            : state === 'restored'
              ? 'text-violet-400'
              : 'text-emerald-400'
        }
      />

      <div className="min-w-0">
        <p className="truncate font-bold text-white">
          {state === 'saving'
            ? 'Automatsko spremanje...'
            : text}
        </p>

        {state === 'offline' && (
          <p className="text-xs text-slate-400">
            Spremljeno lokalno. Cloud će se sinkronizirati kad se internet vrati.
          </p>
        )}
      </div>

      {onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400"
          title="Odbaci nedovršeni nacrt"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
