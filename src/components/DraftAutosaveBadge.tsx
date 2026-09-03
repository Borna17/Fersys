import {
  CheckCircle2,
  CloudOff,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

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
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (state === 'idle' && !text) {
      setVisible(false)
      return
    }

    setVisible(true)

    if (state === 'saved') {
      const timer = window.setTimeout(() => setVisible(false), 1400)
      return () => window.clearTimeout(timer)
    }

    if (state === 'restored' && !onDiscard) {
      const timer = window.setTimeout(() => setVisible(false), 3500)
      return () => window.clearTimeout(timer)
    }
  }, [state, text, onDiscard])

  if (!visible) return null

  const Icon =
    state === 'offline'
      ? CloudOff
      : state === 'restored'
        ? RotateCcw
        : CheckCircle2

  const message =
    state === 'saving'
      ? 'Automatsko spremanje...'
      : state === 'saved'
        ? 'Automatski spremljeno'
        : text

  return (
    <div className="fixed left-1/2 top-[5.35rem] z-[90] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:top-auto md:max-w-sm md:translate-x-0 md:text-sm">
      <Icon
        size={16}
        className={
          state === 'offline'
            ? 'shrink-0 text-amber-400'
            : state === 'restored'
              ? 'shrink-0 text-violet-400'
              : 'shrink-0 text-emerald-400'
        }
      />

      <div className="min-w-0">
        <p className="truncate font-semibold text-white">
          {message}
        </p>

        {state === 'offline' && (
          <p className="mt-0.5 max-w-[70vw] text-[11px] leading-4 text-slate-400 md:max-w-xs">
            Spremljeno lokalno. Sinkronizirat će se kad se internet vrati.
          </p>
        )}
      </div>

      {onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400"
          title="Odbaci nedovršeni nacrt"
          aria-label="Odbaci nedovršeni nacrt"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
