import {
  Camera,
  Check,
  Crop,
  FileImage,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

type ScanMode =
  | 'original'
  | 'grayscale'
  | 'blackwhite'

type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

type DragMode =
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | null

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (
    file: File,
  ) => void | Promise<void>
}

const MIN_CROP = 0.12

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(min, value),
  )
}

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image()

      image.onload =
        () => resolve(image)

      image.onerror =
        () =>
          reject(
            new Error(),
          )

      image.src = source
    },
  )
}

function canvasToFile(
  canvas:
    HTMLCanvasElement,
): Promise<File> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(),
            )
            return
          }

          resolve(
            new File(
              [blob],
              `skenirani-racun-${Date.now()}.jpg`,
              {
                type:
                  'image/jpeg',
                lastModified:
                  Date.now(),
              },
            ),
          )
        },
        'image/jpeg',
        0.95,
      )
    },
  )
}

export function DocumentScannerModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const [
    sourceUrl,
    setSourceUrl,
  ] =
    useState('')

  const [
    processedUrl,
    setProcessedUrl,
  ] =
    useState('')

  const [
    mode,
    setMode,
  ] =
    useState<ScanMode>(
      'original',
    )

  const [
    brightness,
    setBrightness,
  ] =
    useState(4)

  const [
    contrast,
    setContrast,
  ] =
    useState(16)

  const [
    threshold,
    setThreshold,
  ] =
    useState(175)

  const [
    processing,
    setProcessing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    crop,
    setCrop,
  ] =
    useState<CropRect>({
      x: 0.04,
      y: 0.04,
      width: 0.92,
      height: 0.92,
    })

  const [
    dragMode,
    setDragMode,
  ] =
    useState<DragMode>(
      null,
    )

  const cameraInputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const uploadInputRef =
    useRef<HTMLInputElement | null>(
      null,
    )

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    )

  const previewRef =
    useRef<HTMLDivElement | null>(
      null,
    )

  const dragStartRef =
    useRef<{
      x: number
      y: number
      crop: CropRect
    } | null>(null)

  useEffect(() => {
    if (!open) {
      if (sourceUrl) {
        URL.revokeObjectURL(
          sourceUrl,
        )
      }

      setSourceUrl('')
      setProcessedUrl('')
      setError('')
      setMode('original')
      setBrightness(4)
      setContrast(16)
      setThreshold(175)
      setCrop({
        x: 0.04,
        y: 0.04,
        width: 0.92,
        height: 0.92,
      })
      setDragMode(null)
    }
  }, [open])

  useEffect(() => {
    if (!sourceUrl) {
      return
    }

    let cancelled =
      false

    async function processImage() {
      setProcessing(true)
      setError('')

      try {
        const image =
          await loadImage(
            sourceUrl,
          )

        if (cancelled) {
          return
        }

        const sourceX =
          Math.round(
            image.width *
              crop.x,
          )

        const sourceY =
          Math.round(
            image.height *
              crop.y,
          )

        const sourceWidth =
          Math.max(
            1,
            Math.round(
              image.width *
                crop.width,
            ),
          )

        const sourceHeight =
          Math.max(
            1,
            Math.round(
              image.height *
                crop.height,
            ),
          )

        const ratio =
          Math.min(
            2000 /
              sourceWidth,
            2800 /
              sourceHeight,
            1,
          )

        const width =
          Math.max(
            1,
            Math.round(
              sourceWidth *
                ratio,
            ),
          )

        const height =
          Math.max(
            1,
            Math.round(
              sourceHeight *
                ratio,
            ),
          )

        const canvas =
          canvasRef.current

        if (!canvas) {
          throw new Error()
        }

        canvas.width =
          width

        canvas.height =
          height

        const context =
          canvas.getContext(
            '2d',
            {
              willReadFrequently:
                true,
            },
          )

        if (!context) {
          throw new Error()
        }

        context.fillStyle =
          '#ffffff'

        context.fillRect(
          0,
          0,
          width,
          height,
        )

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          width,
          height,
        )

        if (
          mode !==
          'original'
        ) {
          const imageData =
            context.getImageData(
              0,
              0,
              width,
              height,
            )

          const pixels =
            imageData.data

          const factor =
            (259 *
              (contrast +
                255)) /
            (255 *
              (259 -
                contrast))

          for (
            let index = 0;
            index <
            pixels.length;
            index += 4
          ) {
            let gray =
              pixels[index] *
                0.299 +
              pixels[
                index + 1
              ] *
                0.587 +
              pixels[
                index + 2
              ] *
                0.114

            gray =
              factor *
                (gray +
                  brightness -
                  128) +
              128

            gray =
              Math.max(
                0,
                Math.min(
                  255,
                  gray,
                ),
              )

            const value =
              mode ===
              'blackwhite'
                ? gray >=
                  threshold
                  ? 255
                  : 0
                : gray

            pixels[index] =
              value

            pixels[
              index + 1
            ] = value

            pixels[
              index + 2
            ] = value
          }

          context.putImageData(
            imageData,
            0,
            0,
          )
        }

        if (!cancelled) {
          setProcessedUrl(
            canvas.toDataURL(
              'image/jpeg',
              0.94,
            ),
          )
        }
      } catch {
        setError(
          'Slika se nije mogla obraditi.',
        )
      } finally {
        if (!cancelled) {
          setProcessing(
            false,
          )
        }
      }
    }

    void processImage()

    return () => {
      cancelled = true
    }
  }, [
    sourceUrl,
    crop,
    mode,
    brightness,
    contrast,
    threshold,
  ])

  useEffect(() => {
    if (!dragMode) {
      return
    }

    function move(
      event:
        PointerEvent,
    ) {
      const wrapper =
        previewRef.current

      const start =
        dragStartRef.current

      if (
        !wrapper ||
        !start
      ) {
        return
      }

      const rect =
        wrapper.getBoundingClientRect()

      const dx =
        (event.clientX -
          start.x) /
        rect.width

      const dy =
        (event.clientY -
          start.y) /
        rect.height

      const base =
        start.crop

      if (
        dragMode ===
        'move'
      ) {
        setCrop({
          ...base,
          x: clamp(
            base.x + dx,
            0,
            1 -
              base.width,
          ),
          y: clamp(
            base.y + dy,
            0,
            1 -
              base.height,
          ),
        })
        return
      }

      let left =
        base.x

      let top =
        base.y

      let right =
        base.x +
        base.width

      let bottom =
        base.y +
        base.height
if (
  dragMode?.includes(
    's',
  )
) {
        left =
          clamp(
            base.x + dx,
            0,
            right -
              MIN_CROP,
          )
      }

      if (
  dragMode?.includes(
    's',
  )
) {
        right =
          clamp(
            right + dx,
            left +
              MIN_CROP,
            1,
          )
      }

      if (
  dragMode?.includes(
    'n',
  )
) {
        top =
          clamp(
            base.y + dy,
            0,
            bottom -
              MIN_CROP,
          )
      }

      if (
  dragMode?.includes(
    's',
  )
) {
        bottom =
          clamp(
            bottom + dy,
            top +
              MIN_CROP,
            1,
          )
      }

      setCrop({
        x: left,
        y: top,
        width:
          right -
          left,
        height:
          bottom -
          top,
      })
    }

    function stop() {
      setDragMode(null)
      dragStartRef.current =
        null
    }

    window.addEventListener(
      'pointermove',
      move,
    )

    window.addEventListener(
      'pointerup',
      stop,
    )

    return () => {
      window.removeEventListener(
        'pointermove',
        move,
      )

      window.removeEventListener(
        'pointerup',
        stop,
      )
    }
  }, [dragMode])

  if (!open) {
    return null
  }

  function handleFile(
    file?: File,
  ) {
    if (!file) {
      return
    }

    if (
      !file.type.startsWith(
        'image/',
      )
    ) {
      setError(
        'Odabrana datoteka nije slika.',
      )
      return
    }

    if (sourceUrl) {
      URL.revokeObjectURL(
        sourceUrl,
      )
    }

    setCrop({
      x: 0.04,
      y: 0.04,
      width: 0.92,
      height: 0.92,
    })

    setSourceUrl(
      URL.createObjectURL(
        file,
      ),
    )
  }

  function startDrag(
    event:
      React.PointerEvent,
    nextMode:
      Exclude<
        DragMode,
        null
      >,
  ) {
    event.preventDefault()
    event.stopPropagation()

    dragStartRef.current =
      {
        x:
          event.clientX,
        y:
          event.clientY,
        crop: {
          ...crop,
        },
      }

    setDragMode(
      nextMode,
    )
  }

  async function confirmScan() {
    const canvas =
      canvasRef.current

    if (
      !canvas ||
      !sourceUrl
    ) {
      return
    }

    try {
      setProcessing(true)

      await onConfirm(
        await canvasToFile(
          canvas,
        ),
      )

      onClose()
    } catch {
      setError(
        'Sken se nije mogao spremiti.',
      )
    } finally {
      setProcessing(false)
    }
  }

  function resetCrop() {
    setCrop({
      x: 0.04,
      y: 0.04,
      width: 0.92,
      height: 0.92,
    })
  }

  function fullImage() {
    setCrop({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 p-2 backdrop-blur-sm sm:p-5">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
        <header className="flex items-center justify-between border-b border-white/10 p-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-violet-300">
              <Camera
                size={17}
              />
              FERSYS Smart Scan
            </div>

            <h2 className="mt-1 text-xl font-black text-white">
              Skeniraj ulazni račun
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Označi samo račun — stol i pozadina neće biti spremljeni niti poslani AI-u.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 text-slate-400"
          >
            <X
              size={19}
            />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[1fr_330px]">
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-3">
            {!sourceUrl ? (
              <div className="max-w-md text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-violet-500/15 text-violet-300">
                  <FileImage
                    size={34}
                  />
                </div>

                <h3 className="mt-5 text-xl font-black text-white">
                  Fotografiraj ili odaberi račun
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Nakon fotografiranja možeš povući okvir i označiti samo papir računa.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      cameraInputRef.current?.click()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white"
                  >
                    <Camera
                      size={18}
                    />
                    Otvori kameru
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      uploadInputRef.current?.click()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-200"
                  >
                    <Upload
                      size={18}
                    />
                    Odaberi sliku
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={previewRef}
                className="relative inline-block max-h-[calc(100vh-190px)] max-w-full select-none overflow-hidden rounded-2xl bg-black shadow-2xl"
              >
                <img
                  src={sourceUrl}
                  alt="Izvorni račun"
                  draggable={false}
                  className="block max-h-[calc(100vh-190px)] max-w-full object-contain"
                />

                <div
                  className="absolute cursor-move border-2 border-violet-400 bg-violet-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]"
                  style={{
                    left:
                      `${crop.x * 100}%`,
                    top:
                      `${crop.y * 100}%`,
                    width:
                      `${crop.width * 100}%`,
                    height:
                      `${crop.height * 100}%`,
                  }}
                  onPointerDown={(
                    event,
                  ) =>
                    startDrag(
                      event,
                      'move',
                    )
                  }
                >
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                    {Array.from({
                      length: 9,
                    }).map(
                      (
                        _,
                        index,
                      ) => (
                        <span
                          key={
                            index
                          }
                          className="border border-white/30"
                        />
                      ),
                    )}
                  </div>

                  {(
                    [
                      [
                        'nw',
                        '-left-3 -top-3 cursor-nwse-resize',
                      ],
                      [
                        'ne',
                        '-right-3 -top-3 cursor-nesw-resize',
                      ],
                      [
                        'sw',
                        '-bottom-3 -left-3 cursor-nesw-resize',
                      ],
                      [
                        'se',
                        '-bottom-3 -right-3 cursor-nwse-resize',
                      ],
                    ] as const
                  ).map(
                    ([
                      handle,
                      classes,
                    ]) => (
                      <button
                        key={
                          handle
                        }
                        type="button"
                        aria-label={`Promijeni okvir ${handle}`}
                        onPointerDown={(
                          event,
                        ) =>
                          startDrag(
                            event,
                            handle,
                          )
                        }
                        className={`absolute h-7 w-7 rounded-full border-2 border-white bg-violet-600 shadow-lg ${classes}`}
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 font-black text-white">
              <Crop
                size={17}
              />
              Izrez računa
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Povuci okvir preko računa. Kutove možeš povlačiti kako bi izbacio stol, podlogu ili druge predmete.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  !sourceUrl
                }
                onClick={
                  resetCrop
                }
                className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-200 disabled:opacity-40"
              >
                Okvir računa
              </button>

              <button
                type="button"
                disabled={
                  !sourceUrl
                }
                onClick={
                  fullImage
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300 disabled:opacity-40"
              >
                Cijela slika
              </button>
            </div>

            <div className="h-px bg-white/10" />

            <div className="flex items-center gap-2 font-black text-white">
              <SlidersHorizontal
                size={17}
              />
              Obrada skena
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  [
                    'original',
                    'Izvorno',
                  ],
                  [
                    'grayscale',
                    'Sivo',
                  ],
                  [
                    'blackwhite',
                    'C/B',
                  ],
                ] as const
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={
                      value
                    }
                    type="button"
                    disabled={
                      !sourceUrl
                    }
                    onClick={() =>
                      setMode(
                        value,
                      )
                    }
                    className={`rounded-xl border px-2 py-2 text-xs font-black ${
                      mode ===
                      value
                        ? 'border-violet-400/40 bg-violet-500/20 text-violet-200'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            {mode !==
              'original' && (
              <>
                <label className="block space-y-2 text-xs font-bold text-slate-400">
                  <span>
                    Svjetlina:{' '}
                    {
                      brightness
                    }
                  </span>

                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={
                      brightness
                    }
                    disabled={
                      !sourceUrl
                    }
                    onChange={(
                      event,
                    ) =>
                      setBrightness(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                    className="w-full accent-violet-500"
                  />
                </label>

                <label className="block space-y-2 text-xs font-bold text-slate-400">
                  <span>
                    Kontrast:{' '}
                    {
                      contrast
                    }
                  </span>

                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={
                      contrast
                    }
                    disabled={
                      !sourceUrl
                    }
                    onChange={(
                      event,
                    ) =>
                      setContrast(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                    className="w-full accent-violet-500"
                  />
                </label>
              </>
            )}

            {mode ===
              'blackwhite' && (
              <label className="block space-y-2 text-xs font-bold text-slate-400">
                <span>
                  Prag:{' '}
                  {
                    threshold
                  }
                </span>

                <input
                  type="range"
                  min="80"
                  max="230"
                  value={
                    threshold
                  }
                  onChange={(
                    event,
                  ) =>
                    setThreshold(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                  className="w-full accent-violet-500"
                />
              </label>
            )}

            {processedUrl &&
              sourceUrl && (
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    AI će analizirati
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Samo označeni dio računa.
                  </p>
                </div>
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
                    onClick={() =>
                      void confirmScan()
                    }
                    disabled={
                      processing
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-black text-white disabled:opacity-50"
                  >
                    <Check
                      size={18}
                    />
                    {processing
                      ? 'Obrada...'
                      : 'Koristi sken i pročitaj AI-em'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      cameraInputRef.current?.click()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-black text-slate-200"
                  >
                    <RotateCcw
                      size={18}
                    />
                    Fotografiraj ponovno
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        <input
          ref={
            cameraInputRef
          }
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(
            event,
          ) => {
            handleFile(
              event.target
                .files?.[0],
            )

            event.currentTarget.value =
              ''
          }}
        />

        <input
          ref={
            uploadInputRef
          }
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(
            event,
          ) => {
            handleFile(
              event.target
                .files?.[0],
            )

            event.currentTarget.value =
              ''
          }}
        />
      </div>
    </div>
  )
}
