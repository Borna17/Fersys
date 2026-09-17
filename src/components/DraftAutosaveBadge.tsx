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

    // Kada nacrt ima akciju brisanja, obavijest ostaje dostupna kako bi
    // korisnik u svakom trenutku mogao odbaciti nedovršeni posao i krenuti ispočetka.
    if (state === 'saved' && !onDiscard) {
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
        ? 'Nedovršeni nalog je spremljen'
        : text

  const dragOpacity = Math.max(0.25, 1 - Math.abs(dragX) / 180)

  return (
    <div
      className="fixed left-1/2 top-[5.35rem] z-[90] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 touch-pan-y select-none items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl md:bottom-4 md:left-auto md:right-4 md:top-auto md:max-w-md md:translate-x-0 md:text-sm"
      style={{
        translate: `${dragX}px 0`,
        opacity: dragOpacity,
        transition: dragging ? 'none' : 'translate 160ms ease, opacity 160ms ease',
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
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 font-black text-red-300 transition hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-200"
          title="Obriši nedovršeni nalog i započni novi"
          aria-label="Obriši nedovršeni nalog i započni novi"
        >
          <Trash2 size={14} />
          <span>Obriši nacrt</span>
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
