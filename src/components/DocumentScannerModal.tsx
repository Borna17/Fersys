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
  useMemo,
  useRef,
  useState,
} from 'react'

type ScanMode =
  | 'original'
  | 'grayscale'
  | 'blackwhite'

type Point = {
  x: number
  y: number
}

type CornerKey =
  | 'tl'
  | 'tr'
  | 'br'
  | 'bl'

type Corners = Record<
  CornerKey,
  Point
>

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (
    file: File,
  ) => void | Promise<void>
}

const DEFAULT_CORNERS: Corners = {
  tl: {
    x: 0.05,
    y: 0.05,
  },
  tr: {
    x: 0.95,
    y: 0.05,
  },
  br: {
    x: 0.95,
    y: 0.95,
  },
  bl: {
    x: 0.05,
    y: 0.95,
  },
}

const MAX_OUTPUT_WIDTH =
  1700

const MAX_OUTPUT_HEIGHT =
  2400

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  )
}

function distance(
  a: Point,
  b: Point,
) {
  return Math.hypot(
    b.x - a.x,
    b.y - a.y,
  )
}

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const image =
        new Image()

      image.onload =
        () => resolve(
          image,
        )

      image.onerror =
        () =>
          reject(
            new Error(),
          )

      image.src =
        source
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
        0.96,
      )
    },
  )
}

function solveLinearSystem(
  matrix: number[][],
  values: number[],
) {
  const n =
    values.length

  const augmented =
    matrix.map(
      (
        row,
        rowIndex,
      ) => [
        ...row,
        values[
          rowIndex
        ],
      ],
    )

  for (
    let column = 0;
    column < n;
    column += 1
  ) {
    let pivot =
      column

    for (
      let row =
        column + 1;
      row < n;
      row += 1
    ) {
      if (
        Math.abs(
          augmented[
            row
          ][
            column
          ],
        ) >
        Math.abs(
          augmented[
            pivot
          ][
            column
          ],
        )
      ) {
        pivot =
          row
      }
    }

    if (
      Math.abs(
        augmented[
          pivot
        ][
          column
        ],
      ) <
      1e-10
    ) {
      throw new Error(
        'Neispravan okvir dokumenta.',
      )
    }

    if (
      pivot !==
      column
    ) {
      const temp =
        augmented[
          column
        ]

      augmented[
        column
      ] =
        augmented[
          pivot
        ]

      augmented[
        pivot
      ] =
        temp
    }

    const pivotValue =
      augmented[
        column
      ][
        column
      ]

    for (
      let c =
        column;
      c <= n;
      c += 1
    ) {
      augmented[
        column
      ][c] /=
        pivotValue
    }

    for (
      let row = 0;
      row < n;
      row += 1
    ) {
      if (
        row ===
        column
      ) {
        continue
      }

      const factor =
        augmented[
          row
        ][
          column
        ]

      for (
        let c =
          column;
        c <= n;
        c += 1
      ) {
        augmented[
          row
        ][c] -=
          factor *
          augmented[
            column
          ][c]
      }
    }
  }

  return augmented.map(
    (row) =>
      row[n],
  )
}

function getHomography(
  destination:
    Point[],
  source:
    Point[],
) {
  const matrix:
    number[][] = []

  const values:
    number[] = []

  for (
    let index = 0;
    index < 4;
    index += 1
  ) {
    const x =
      destination[
        index
      ].x

    const y =
      destination[
        index
      ].y

    const u =
      source[
        index
      ].x

    const v =
      source[
        index
      ].y

    matrix.push([
      x,
      y,
      1,
      0,
      0,
      0,
      -u * x,
      -u * y,
    ])

    values.push(
      u,
    )

    matrix.push([
      0,
      0,
      0,
      x,
      y,
      1,
      -v * x,
      -v * y,
    ])

    values.push(
      v,
    )
  }

  const h =
    solveLinearSystem(
      matrix,
      values,
    )

  return [
    h[0],
    h[1],
    h[2],
    h[3],
    h[4],
    h[5],
    h[6],
    h[7],
    1,
  ]
}

function applyHomography(
  matrix:
    number[],
  x: number,
  y: number,
): Point {
  const denominator =
    matrix[6] *
      x +
    matrix[7] *
      y +
    matrix[8]

  return {
    x:
      (
        matrix[0] *
          x +
        matrix[1] *
          y +
        matrix[2]
      ) /
      denominator,
    y:
      (
        matrix[3] *
          x +
        matrix[4] *
          y +
        matrix[5]
      ) /
      denominator,
  }
}

function bilinearSample(
  pixels:
    Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  const safeX =
    clamp(
      x,
      0,
      width - 1,
    )

  const safeY =
    clamp(
      y,
      0,
      height - 1,
    )

  const x0 =
    Math.floor(
      safeX,
    )

  const y0 =
    Math.floor(
      safeY,
    )

  const x1 =
    Math.min(
      width - 1,
      x0 + 1,
    )

  const y1 =
    Math.min(
      height - 1,
      y0 + 1,
    )

  const dx =
    safeX - x0

  const dy =
    safeY - y0

  const read = (
    px: number,
    py: number,
    channel: number,
  ) =>
    pixels[
      (
        py *
          width +
        px
      ) *
        4 +
      channel
    ]

  const result = [
    0,
    0,
    0,
    255,
  ]

  for (
    let channel = 0;
    channel < 3;
    channel += 1
  ) {
    const top =
      read(
        x0,
        y0,
        channel,
      ) *
        (
          1 -
          dx
        ) +
      read(
        x1,
        y0,
        channel,
      ) *
        dx

    const bottom =
      read(
        x0,
        y1,
        channel,
      ) *
        (
          1 -
          dx
        ) +
      read(
        x1,
        y1,
        channel,
      ) *
        dx

    result[
      channel
    ] =
      top *
        (
          1 -
          dy
        ) +
      bottom *
        dy
  }

  return result
}

function getOutputSize(
  imageWidth: number,
  imageHeight: number,
  corners:
    Corners,
) {
  const tl = {
    x:
      corners.tl.x *
      imageWidth,
    y:
      corners.tl.y *
      imageHeight,
  }

  const tr = {
    x:
      corners.tr.x *
      imageWidth,
    y:
      corners.tr.y *
      imageHeight,
  }

  const br = {
    x:
      corners.br.x *
      imageWidth,
    y:
      corners.br.y *
      imageHeight,
  }

  const bl = {
    x:
      corners.bl.x *
      imageWidth,
    y:
      corners.bl.y *
      imageHeight,
  }

  const width =
    Math.max(
      distance(
        tl,
        tr,
      ),
      distance(
        bl,
        br,
      ),
    )

  const height =
    Math.max(
      distance(
        tl,
        bl,
      ),
      distance(
        tr,
        br,
      ),
    )

  const ratio =
    Math.min(
      MAX_OUTPUT_WIDTH /
        Math.max(
          1,
          width,
        ),
      MAX_OUTPUT_HEIGHT /
        Math.max(
          1,
          height,
        ),
      1,
    )

  return {
    width:
      Math.max(
        1,
        Math.round(
          width *
            ratio,
        ),
      ),
    height:
      Math.max(
        1,
        Math.round(
          height *
            ratio,
        ),
      ),
  }
}

function polygonPath(
  corners:
    Corners,
) {
  return [
    `${corners.tl.x * 100}% ${corners.tl.y * 100}%`,
    `${corners.tr.x * 100}% ${corners.tr.y * 100}%`,
    `${corners.br.x * 100}% ${corners.br.y * 100}%`,
    `${corners.bl.x * 100}% ${corners.bl.y * 100}%`,
  ].join(
    ', ',
  )
}

function lineStyle(
  a: Point,
  b: Point,
) {
  const dx =
    (
      b.x -
      a.x
    ) *
    100

  const dy =
    (
      b.y -
      a.y
    ) *
    100

  const length =
    Math.hypot(
      dx,
      dy,
    )

  const angle =
    Math.atan2(
      dy,
      dx,
    ) *
    (
      180 /
      Math.PI
    )

  return {
    left:
      `${a.x * 100}%`,
    top:
      `${a.y * 100}%`,
    width:
      `${length}%`,
    transform:
      `rotate(${angle}deg)`,
  }
}

function isValidQuad(
  corners:
    Corners,
) {
  const points = [
    corners.tl,
    corners.tr,
    corners.br,
    corners.bl,
  ]

  let sign = 0

  for (
    let index = 0;
    index < 4;
    index += 1
  ) {
    const a =
      points[
        index
      ]

    const b =
      points[
        (
          index + 1
        ) %
        4
      ]

    const c =
      points[
        (
          index + 2
        ) %
        4
      ]

    const cross =
      (
        b.x -
        a.x
      ) *
        (
          c.y -
          b.y
        ) -
      (
        b.y -
        a.y
      ) *
        (
          c.x -
          b.x
        )

    if (
      Math.abs(
        cross,
      ) <
      0.0005
    ) {
      return false
    }

    const currentSign =
      Math.sign(
        cross,
      )

    if (
      sign === 0
    ) {
      sign =
        currentSign
    } else if (
      currentSign !==
      sign
    ) {
      return false
    }
  }

  return true
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
    corners,
    setCorners,
  ] =
    useState<Corners>(
      DEFAULT_CORNERS,
    )

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
    draggingCorner,
    setDraggingCorner,
  ] =
    useState<
      CornerKey | null
    >(null)

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

  const cornersRef =
    useRef<Corners>(
      corners,
    )

  useEffect(() => {
    cornersRef.current =
      corners
  }, [corners])

  const validQuad =
    useMemo(
      () =>
        isValidQuad(
          corners,
        ),
      [corners],
    )

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
      setCorners(
        DEFAULT_CORNERS,
      )
      setMode(
        'original',
      )
      setBrightness(4)
      setContrast(16)
      setThreshold(175)
      setDraggingCorner(
        null,
      )
    }
  }, [open])

  useEffect(() => {
    if (
      !sourceUrl ||
      !validQuad
    ) {
      return
    }

    let cancelled =
      false

    const timer =
      window.setTimeout(
        () => {
          void processImage()
        },
        draggingCorner
          ? 260
          : 60,
      )

    async function processImage() {
      setProcessing(
        true,
      )

      setError('')

      try {
        const image =
          await loadImage(
            sourceUrl,
          )

        if (cancelled) {
          return
        }

        const activeCorners =
          cornersRef.current

        const sourceCanvas =
          document.createElement(
            'canvas',
          )

        sourceCanvas.width =
          image.width

        sourceCanvas.height =
          image.height

        const sourceContext =
          sourceCanvas.getContext(
            '2d',
            {
              willReadFrequently:
                true,
            },
          )

        if (
          !sourceContext
        ) {
          throw new Error()
        }

        sourceContext.drawImage(
          image,
          0,
          0,
        )

        const sourceData =
          sourceContext.getImageData(
            0,
            0,
            image.width,
            image.height,
          )

        const {
          width:
            outputWidth,
          height:
            outputHeight,
        } =
          getOutputSize(
            image.width,
            image.height,
            activeCorners,
          )

        const destinationPoints = [
          {
            x: 0,
            y: 0,
          },
          {
            x:
              outputWidth -
              1,
            y: 0,
          },
          {
            x:
              outputWidth -
              1,
            y:
              outputHeight -
              1,
          },
          {
            x: 0,
            y:
              outputHeight -
              1,
          },
        ]

        const sourcePoints = [
          {
            x:
              activeCorners.tl.x *
              (
                image.width -
                1
              ),
            y:
              activeCorners.tl.y *
              (
                image.height -
                1
              ),
          },
          {
            x:
              activeCorners.tr.x *
              (
                image.width -
                1
              ),
            y:
              activeCorners.tr.y *
              (
                image.height -
                1
              ),
          },
          {
            x:
              activeCorners.br.x *
              (
                image.width -
                1
              ),
            y:
              activeCorners.br.y *
              (
                image.height -
                1
              ),
          },
          {
            x:
              activeCorners.bl.x *
              (
                image.width -
                1
              ),
            y:
              activeCorners.bl.y *
              (
                image.height -
                1
              ),
          },
        ]

        const homography =
          getHomography(
            destinationPoints,
            sourcePoints,
          )

        const canvas =
          canvasRef.current

        if (!canvas) {
          throw new Error()
        }

        canvas.width =
          outputWidth

        canvas.height =
          outputHeight

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

        const output =
          context.createImageData(
            outputWidth,
            outputHeight,
          )

        const outPixels =
          output.data

        const inPixels =
          sourceData.data

        for (
          let y = 0;
          y <
          outputHeight;
          y += 1
        ) {
          for (
            let x = 0;
            x <
            outputWidth;
            x += 1
          ) {
            const source =
              applyHomography(
                homography,
                x,
                y,
              )

            const sample =
              bilinearSample(
                inPixels,
                image.width,
                image.height,
                source.x,
                source.y,
              )

            const index =
              (
                y *
                  outputWidth +
                x
              ) *
              4

            outPixels[
              index
            ] =
              sample[0]

            outPixels[
              index + 1
            ] =
              sample[1]

            outPixels[
              index + 2
            ] =
              sample[2]

            outPixels[
              index + 3
            ] = 255
          }
        }

        if (
          mode !==
          'original'
        ) {
          const factor =
            (259 *
              (
                contrast +
                255
              )) /
            (255 *
              (
                259 -
                contrast
              ))

          for (
            let index = 0;
            index <
            outPixels.length;
            index += 4
          ) {
            let gray =
              outPixels[
                index
              ] *
                0.299 +
              outPixels[
                index + 1
              ] *
                0.587 +
              outPixels[
                index + 2
              ] *
                0.114

            gray =
              factor *
                (
                  gray +
                  brightness -
                  128
                ) +
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

            outPixels[
              index
            ] =
              value

            outPixels[
              index + 1
            ] =
              value

            outPixels[
              index + 2
            ] =
              value
          }
        }

        context.putImageData(
          output,
          0,
          0,
        )

        if (!cancelled) {
          setProcessedUrl(
            canvas.toDataURL(
              'image/jpeg',
              0.95,
            ),
          )
        }
      } catch {
        if (!cancelled) {
          setError(
            'Račun se nije mogao perspektivno obraditi. Provjeri položaj sva 4 kuta.',
          )
        }
      } finally {
        if (!cancelled) {
          setProcessing(
            false,
          )
        }
      }
    }

    return () => {
      cancelled = true

      window.clearTimeout(
        timer,
      )
    }
  }, [
    sourceUrl,
    corners,
    mode,
    brightness,
    contrast,
    threshold,
    validQuad,
    draggingCorner,
  ])

  useEffect(() => {
    if (
      !draggingCorner
    ) {
      return
    }

    function move(
      event:
        PointerEvent,
    ) {
      const wrapper =
        previewRef.current

      if (!wrapper) {
        return
      }

      const rect =
        wrapper.getBoundingClientRect()

      const x =
        clamp(
          (
            event.clientX -
            rect.left
          ) /
            rect.width,
          0,
          1,
        )

      const y =
        clamp(
          (
            event.clientY -
            rect.top
          ) /
            rect.height,
          0,
          1,
        )

      setCorners(
        (
          current,
        ) => ({
          ...current,
          [draggingCorner as CornerKey]:
            {
              x,
              y,
            },
        }),
      )
    }

    function stop() {
      setDraggingCorner(
        null,
      )
    }

    window.addEventListener(
      'pointermove',
      move,
      {
        passive: true,
      },
    )

    window.addEventListener(
      'pointerup',
      stop,
    )

    window.addEventListener(
      'pointercancel',
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

      window.removeEventListener(
        'pointercancel',
        stop,
      )
    }
  }, [draggingCorner])

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

    setCorners(
      DEFAULT_CORNERS,
    )

    setProcessedUrl(
      '',
    )

    setSourceUrl(
      URL.createObjectURL(
        file,
      ),
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

    if (!validQuad) {
      setError(
        'Kutovi se ne smiju križati. Postavi svaki kut na odgovarajući kut računa.',
      )
      return
    }

    try {
      setProcessing(
        true,
      )

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
      setProcessing(
        false,
      )
    }
  }

  function resetCorners() {
    setCorners(
      DEFAULT_CORNERS,
    )
  }

  function fullImage() {
    setCorners({
      tl: {
        x: 0,
        y: 0,
      },
      tr: {
        x: 1,
        y: 0,
      },
      br: {
        x: 1,
        y: 1,
      },
      bl: {
        x: 0,
        y: 1,
      },
    })
  }

  const lines = [
    [
      corners.tl,
      corners.tr,
    ],
    [
      corners.tr,
      corners.br,
    ],
    [
      corners.br,
      corners.bl,
    ],
    [
      corners.bl,
      corners.tl,
    ],
  ] as const

  const cornerButtons: Array<{
    key: CornerKey
    label: string
  }> = [
    {
      key: 'tl',
      label:
        'Gornji lijevi',
    },
    {
      key: 'tr',
      label:
        'Gornji desni',
    },
    {
      key: 'br',
      label:
        'Donji desni',
    },
    {
      key: 'bl',
      label:
        'Donji lijevi',
    },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 p-2 backdrop-blur-sm sm:p-5">
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
              Označi sva 4 kuta računa
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Svaki ljubičasti krug pomiče se zasebno. Postavi gornji lijevi, gornji desni, donji desni i donji lijevi točno na rub papira. FERSYS će račun automatski izravnati.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 text-slate-400"
          >
            <X
              size={19}
            />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[1fr_340px]">
          <div className="flex min-h-[430px] items-center justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-3">
            {!sourceUrl ? (
              <div className="max-w-md text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-violet-500/15 text-violet-300">
                  <FileImage
                    size={34}
                  />
                </div>

                <h3 className="mt-5 text-xl font-black text-white">
                  Fotografiraj račun
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Može biti fotografiran i malo ukoso. Nakon toga ćeš označiti sva četiri kuta papira.
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
                ref={
                  previewRef
                }
                className="relative inline-block max-h-[calc(100vh-190px)] max-w-full select-none touch-none overflow-hidden rounded-2xl bg-black shadow-2xl"
              >
                <img
                  src={
                    sourceUrl
                  }
                  alt="Račun za označavanje"
                  draggable={
                    false
                  }
                  className="pointer-events-none block max-h-[calc(100vh-190px)] max-w-full object-contain"
                />

                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    clipPath:
                      `polygon(${polygonPath(
                        corners,
                      )})`,
                    background:
                      'rgba(124, 58, 237, 0.10)',
                    boxShadow:
                      'inset 0 0 0 9999px rgba(124,58,237,.04)',
                  }}
                />

                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'rgba(0,0,0,.52)',
                    clipPath:
                      `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${corners.tl.x * 100}% ${corners.tl.y * 100}%, ${corners.bl.x * 100}% ${corners.bl.y * 100}%, ${corners.br.x * 100}% ${corners.br.y * 100}%, ${corners.tr.x * 100}% ${corners.tr.y * 100}%, ${corners.tl.x * 100}% ${corners.tl.y * 100}%)`,
                  }}
                />

                {lines.map(
                  (
                    [
                      a,
                      b,
                    ],
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="pointer-events-none absolute h-[3px] origin-left rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,.95)]"
                      style={
                        lineStyle(
                          a,
                          b,
                        )
                      }
                    />
                  ),
                )}

                {cornerButtons.map(
                  (
                    corner,
                  ) => {
                    const point =
                      corners[
                        corner.key
                      ]

                    const active =
                      draggingCorner ===
                      corner.key

                    return (
                      <button
                        key={
                          corner.key
                        }
                        type="button"
                        title={
                          corner.label
                        }
                        aria-label={
                          corner.label
                        }
                        onPointerDown={(
                          event,
                        ) => {
                          event.preventDefault()
                          event.stopPropagation()

                          event.currentTarget.setPointerCapture?.(
                            event.pointerId,
                          )

                          setDraggingCorner(
                            corner.key,
                          )
                        }}
                        className={`absolute z-20 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-[3px] border-white bg-violet-600 shadow-[0_0_0_6px_rgba(124,58,237,.24),0_8px_30px_rgba(0,0,0,.55)] transition ${
                          active
                            ? 'scale-125 bg-fuchsia-500'
                            : 'hover:scale-110'
                        }`}
                        style={{
                          left:
                            `${point.x * 100}%`,
                          top:
                            `${point.y * 100}%`,
                        }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                      </button>
                    )
                  },
                )}

                {!validQuad && (
                  <div className="absolute inset-x-4 top-4 z-30 rounded-2xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-center text-xs font-black text-red-200 shadow-xl">
                    Kutovi se križaju. Vrati ih redom: gornji lijevi → gornji desni → donji desni → donji lijevi.
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 font-black text-white">
              <Crop
                size={17}
              />
              4-point izrez
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Sada svaki kut radi potpuno neovisno. Možeš npr. prvo staviti gornji desni na rub računa, zatim gornji lijevi, pa oba donja.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {cornerButtons.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.key
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"
                  >
                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-600">
                      {
                        item.label
                      }
                    </p>

                    <p className="mt-1 font-mono text-[10px] text-violet-300">
                      {Math.round(
                        corners[
                          item.key
                        ].x *
                          100,
                      )}
                      % ·{' '}
                      {Math.round(
                        corners[
                          item.key
                        ].y *
                          100,
                      )}
                      %
                    </p>
                  </div>
                ),
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  !sourceUrl
                }
                onClick={
                  resetCorners
                }
                className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-200 disabled:opacity-40"
              >
                Resetiraj kutove
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
                    {
                      label
                    }
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

            {sourceUrl && (
              <div
                className={`rounded-2xl border p-3 ${
                  validQuad
                    ? 'border-emerald-500/15 bg-emerald-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    validQuad
                      ? 'text-emerald-300'
                      : 'text-red-300'
                  }`}
                >
                  {validQuad
                    ? 'Perspektiva spremna'
                    : 'Provjeri kutove'}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {validQuad
                    ? 'FERSYS će označeni četverokut pretvoriti u ravni pravokutni sken.'
                    : 'Kutovi dokumenta trenutno se križaju ili nisu pravilnim redoslijedom.'}
                </p>
              </div>
            )}

            {processedUrl &&
              sourceUrl &&
              validQuad && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-2">
                  <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-wider text-slate-600">
                    Pregled izravnanog skena
                  </p>

                  <img
                    src={
                      processedUrl
                    }
                    alt="Izravnani sken"
                    className="max-h-48 w-full rounded-lg object-contain"
                  />
                </div>
              )}

            {error && (
              <div className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-200">
                {
                  error
                }
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
                      processing ||
                      !validQuad
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Check
                      size={18}
                    />
                    {processing
                      ? 'Izravnavanje...'
                      : 'Koristi ovaj sken i pročitaj AI-em'}
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
          ref={
            canvasRef
          }
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