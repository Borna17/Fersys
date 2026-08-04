import { useEffect, useRef, useState } from 'react'
import { Check, Eraser, PenLine, X } from 'lucide-react'

type SignaturePadProps = {
  value: string
  onChange: (value: string) => void
  title?: string
}

export function SignaturePad({
  value,
  onChange,
  title = 'Potpis investitora',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1

      canvas.width = Math.floor(rect.width * ratio)
      canvas.height = Math.floor(rect.height * ratio)

      const context = canvas.getContext('2d')
      if (!context) return

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = 2.6
      context.strokeStyle = '#0F172A'
      context.fillStyle = '#FFFFFF'
      context.fillRect(0, 0, rect.width, rect.height)

      if (value) {
        const image = new Image()
        image.onload = () => {
          context.drawImage(image, 0, 0, rect.width, rect.height)
        }
        image.src = value
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [isOpen, value])

  function pointFromEvent(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const previous = lastPointRef.current
    if (!canvas || !context || !previous) return

    const current = pointFromEvent(event)

    context.beginPath()
    context.moveTo(previous.x, previous.y)
    context.lineTo(current.x, current.y)
    context.stroke()

    lastPointRef.current = current
  }

  function stopDrawing() {
    drawingRef.current = false
    lastPointRef.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, rect.width, rect.height)
    onChange('')
  }

  function confirmSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
    setIsOpen(false)
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-400">
              Potpis se može unijeti prstom, mišem ili S-Pen olovkom.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-500"
          >
            <PenLine size={18} />
            {value ? 'Promijeni potpis' : 'Otvori potpis'}
          </button>
        </div>

        {value && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700 bg-white">
            <img
              src={value}
              alt="Potpis investitora"
              className="h-36 w-full object-contain"
            />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">
                Potpišite se unutar bijelog prostora.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300"
              aria-label="Zatvori potpis"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 p-4 sm:p-6">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
              className="h-full min-h-[340px] w-full touch-none rounded-2xl bg-white shadow-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-800 p-4 sm:flex sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={clearCanvas}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white"
            >
              <Eraser size={19} />
              Obriši
            </button>

            <button
              type="button"
              onClick={confirmSignature}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white"
            >
              <Check size={19} />
              Potvrdi
            </button>
          </div>
        </div>
      )}
    </>
  )
}

