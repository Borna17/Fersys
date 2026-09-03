import {
  CheckCircle2,
  CloudOff,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

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
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const pointerStartXRef = useRef<number | null>(null)

  useEffect(() => {
    if (state === 'idle' && !text) {
      setVisible(false)
      setDragX(0)
      return
    }

    setVisible(true)
    setDragX(0)

    if (state === 'saved') {
      const timer = window.setTimeout(() => setVisible(false), 1400)
      return () => window.clearTimeout(timer)
    }

    if (state === 'restored' && !onDiscard) {
      const timer = window.setTimeout(() => setVisible(false), 3500)
      return () => window.clearTimeout(timer)
    }
  }, [state, text, onDiscard])

  function dismiss() {
    setVisible(false)
    setDragX(0)
    setDragging(false)
    pointerStartXRef.current = null
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStartXRef.current = event.clientX
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const startX = pointerStartXRef.current
    if (startX === null) return
    setDragX(event.clientX - startX)
  }

  function finishDrag() {
    if (Math.abs(dragX) >= 70) {
      dismiss()
      return
    }

    setDragX(0)
    setDragging(false)
    pointerStartXRef.current = null
  }

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

  const dragOpacity = Math.max(0.25, 1 - Math.abs(dragX) / 180)

  return (
    <div
      className="fixed left-1/2 top-[5.35rem] z-[90] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 touch-pan-y select-none items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:top-auto md:max-w-sm md:translate-x-0 md:text-sm"
      style={{
        transform: `translateX(calc(-50% + ${dragX}px))`,
        opacity: dragOpacity,
        transition: dragging ? 'none' : 'transform 160ms ease, opacity 160ms ease',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
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

      <div className="min-w-0 flex-1">
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
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onDiscard}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400"
          title="Odbaci nedovršeni nacrt"
          aria-label="Odbaci nedovršeni nacrt"
        >
          <Trash2 size={14} />
        </button>
      )}

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={dismiss}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"
        title="Sakrij obavijest"
        aria-label="Sakrij obavijest"
      >
        <X size={14} />
      </button>
    </div>
  )
}
