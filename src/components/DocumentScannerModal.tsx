import { Camera, Check, FileImage, RotateCcw, SlidersHorizontal, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ScanMode = 'original' | 'grayscale' | 'blackwhite'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (file: File) => void
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error())
    image.src = source
  })
}

function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error())
          return
        }

        resolve(
          new File(
            [blob],
            `skenirani-racun-${Date.now()}.jpg`,
            {
              type: 'image/jpeg',
              lastModified: Date.now(),
            },
          ),
        )
      },
      'image/jpeg',
      0.92,
    )
  })
}

export function DocumentScannerModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const [sourceUrl, setSourceUrl] = useState('')
  const [processedUrl, setProcessedUrl] = useState('')
  const [mode, setMode] = useState<ScanMode>('blackwhite')
  const [brightness, setBrightness] = useState(8)
  const [contrast, setContrast] = useState(32)
  const [threshold, setThreshold] = useState(170)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!open) {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      setSourceUrl('')
      setProcessedUrl('')
      setError('')
      setMode('blackwhite')
    }
  }, [open])

  useEffect(() => {
    if (!sourceUrl) return

    let cancelled = false

    async function processImage() {
      setProcessing(true)
      setError('')

      try {
        const image = await loadImage(sourceUrl)
        if (cancelled) return

        const ratio = Math.min(
          1800 / image.width,
          2400 / image.height,
          1,
        )
        const width = Math.max(1, Math.round(image.width * ratio))
        const height = Math.max(1, Math.round(image.height * ratio))
        const canvas = canvasRef.current

        if (!canvas) throw new Error()

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d', {
          willReadFrequently: true,
        })

        if (!context) throw new Error()

        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)

        if (mode !== 'original') {
          const imageData = context.getImageData(
            0,
            0,
            width,
            height,
          )
          const pixels = imageData.data
          const factor =
            (259 * (contrast + 255)) /
            (255 * (259 - contrast))

          for (let index = 0; index < pixels.length; index += 4) {
            let gray =
              pixels[index] * 0.299 +
              pixels[index + 1] * 0.587 +
              pixels[index + 2] * 0.114

            gray = factor * (gray + brightness - 128) + 128
            gray = Math.max(0, Math.min(255, gray))

            const value =
              mode === 'blackwhite'
                ? gray >= threshold
                  ? 255
                  : 0
                : gray

            pixels[index] = value
            pixels[index + 1] = value
            pixels[index + 2] = value
          }

          context.putImageData(imageData, 0, 0)
        }

        if (!cancelled) {
          setProcessedUrl(canvas.toDataURL('image/jpeg', 0.9))
        }
      } catch {
        setError('Slika se nije mogla obraditi.')
      } finally {
        if (!cancelled) setProcessing(false)
      }
    }

    void processImage()
    return () => {
      cancelled = true
    }
  }, [sourceUrl, mode, brightness, contrast, threshold])

  if (!open) return null

  function handleFile(file?: File) {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Odabrana datoteka nije slika.')
      return
    }

    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(URL.createObjectURL(file))
  }

  async function confirmScan() {
    const canvas = canvasRef.current
    if (!canvas || !sourceUrl) return

    try {
      onConfirm(await canvasToFile(canvas))
      onClose()
    } catch {
      setError('Sken se nije mogao spremiti.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 p-3 backdrop-blur-sm sm:p-5">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
        <header className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-violet-300">
              <Camera size={17} />
              Skener dokumenta
            </div>
            <h2 className="mt-1 text-xl font-black text-white">
              Skeniraj ulazni račun
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 text-slate-400"
          >
            <X size={19} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-3">
            {!sourceUrl ? (
              <div className="max-w-md text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-violet-500/15 text-violet-300">
                  <FileImage size={34} />
                </div>
                <h3 className="mt-5 text-xl font-black text-white">
                  Fotografiraj ili odaberi račun
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Račun postavi na ravnu podlogu i fotografiraj odozgo.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white"
                  >
                    <Camera size={18} />
                    Otvori kameru
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-200"
                  >
                    <Upload size={18} />
                    Odaberi sliku
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center">
                {processedUrl && (
                  <img
                    src={processedUrl}
                    alt="Sken"
                    className="max-h-[calc(100vh-190px)] max-w-full rounded-xl bg-white object-contain"
                  />
                )}
                {processing && (
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/60">
                    <div className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white">
                      Obrada dokumenta...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 font-black text-white">
              <SlidersHorizontal size={17} />
              Obrada skena
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                ['original', 'Izvorno'],
                ['grayscale', 'Sivo'],
                ['blackwhite', 'Crno-bijelo'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={!sourceUrl}
                  onClick={() => setMode(value as ScanMode)}
                  className={`rounded-xl border px-2 py-2 text-xs font-black ${
                    mode === value
                      ? 'border-violet-400/40 bg-violet-500/20 text-violet-200'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block space-y-2 text-xs font-bold text-slate-400">
              <span>Svjetlina: {brightness}</span>
              <input
                type="range"
                min="-60"
                max="60"
                value={brightness}
                disabled={!sourceUrl}
                onChange={(event) =>
                  setBrightness(Number(event.target.value))
                }
                className="w-full accent-violet-500"
              />
            </label>

            <label className="block space-y-2 text-xs font-bold text-slate-400">
              <span>Kontrast: {contrast}</span>
              <input
                type="range"
                min="-100"
                max="100"
                value={contrast}
                disabled={!sourceUrl}
                onChange={(event) =>
                  setContrast(Number(event.target.value))
                }
                className="w-full accent-violet-500"
              />
            </label>

            {mode === 'blackwhite' && (
              <label className="block space-y-2 text-xs font-bold text-slate-400">
                <span>Prag: {threshold}</span>
                <input
                  type="range"
                  min="80"
                  max="230"
                  value={threshold}
                  onChange={(event) =>
                    setThreshold(Number(event.target.value))
                  }
                  className="w-full accent-violet-500"
                />
              </label>
            )}

            {error && (
              <div className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              {sourceUrl && (
                <>
                  <button
                    type="button"
                    onClick={confirmScan}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-black text-white"
                  >
                    <Check size={18} />
                    Koristi ovaj sken
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-black text-slate-200"
                  >
                    <RotateCcw size={18} />
                    Fotografiraj ponovno
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />
      </div>
    </div>
  )
}

