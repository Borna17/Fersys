import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  PackageSearch,
  QrCode,
  Search,
  X,
} from 'lucide-react'
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import {
  getInventoryItems,
  type InventoryItem,
} from '../services/inventory.service'

type BarcodeDetectorResult = {
  rawValue: string
}

type BarcodeDetectorInstance = {
  detect: (
    source: HTMLVideoElement,
  ) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorConstructor = new (
  options?: {
    formats?: string[]
  },
) => BarcodeDetectorInstance

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor
  }
}

function normalizeValue(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase('hr-HR')
}

function findInventoryItem(
  items: InventoryItem[],
  scannedValue: string,
): InventoryItem | undefined {
  const normalized =
    normalizeValue(scannedValue)

  return items.find((item) => {
    const possibleValues = [
      item.id,
      item.code,
      item.barcode,
      item.qrValue,
      `/inventory/items/${item.id}`,
      `${window.location.origin}/inventory/items/${item.id}`,
    ]
      .filter(Boolean)
      .map((value) =>
        normalizeValue(
          String(value),
        ),
      )

    if (
      possibleValues.includes(
        normalized,
      )
    ) {
      return true
    }

    try {
      const scannedUrl =
        new URL(scannedValue)

      const pathParts =
        scannedUrl.pathname
          .split('/')
          .filter(Boolean)

      return (
        pathParts[
          pathParts.length - 1
        ] === item.id
      )
    } catch {
      return false
    }
  })
}

export function InventoryQrScannerPage() {
  const navigate = useNavigate()

  const videoRef =
    useRef<HTMLVideoElement>(null)

  const cameraStreamRef =
    useRef<MediaStream | null>(null)

  const animationFrameRef =
    useRef<number | null>(null)

  const detectorRef =
    useRef<BarcodeDetectorInstance | null>(
      null,
    )

  const isDetectingRef =
    useRef(false)

  const lastScannedValueRef =
    useRef('')

  const [items, setItems] =
    useState<InventoryItem[]>([])

  const [isLoadingItems, setIsLoadingItems] =
    useState(true)

  const [isCameraActive, setIsCameraActive] =
    useState(false)

  const [isStartingCamera, setIsStartingCamera] =
    useState(false)

  const [manualValue, setManualValue] =
    useState('')

  const [errorMessage, setErrorMessage] =
    useState('')

  const [statusMessage, setStatusMessage] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadItems() {
      try {
        setIsLoadingItems(true)

        const savedItems =
          await getInventoryItems()

        if (!cancelled) {
          setItems(savedItems)
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Artikle nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingItems(false)
        }
      }
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [])

  function stopScanningLoop() {
    if (
      animationFrameRef.current !==
      null
    ) {
      window.cancelAnimationFrame(
        animationFrameRef.current,
      )

      animationFrameRef.current =
        null
    }

    isDetectingRef.current = false
  }

  function stopCamera() {
    stopScanningLoop()

    cameraStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      )

    cameraStreamRef.current =
      null

    if (videoRef.current) {
      videoRef.current.srcObject =
        null
    }

    setIsCameraActive(false)
    setIsStartingCamera(false)
  }

  function openScannedItem(
    value: string,
  ) {
    const trimmedValue =
      value.trim()

    if (!trimmedValue) {
      setErrorMessage(
        'QR kod ili šifra nisu ispravno očitani.',
      )
      return
    }

    const item =
      findInventoryItem(
        items,
        trimmedValue,
      )

    if (!item) {
      lastScannedValueRef.current =
        ''

      setStatusMessage('')

      setErrorMessage(
        `Artikl s oznakom „${trimmedValue}” nije pronađen u skladištu.`,
      )

      return
    }

    setErrorMessage('')

    setStatusMessage(
      `Pronađen artikl: ${item.name}`,
    )

    stopCamera()

    window.setTimeout(() => {
      navigate(
        `/inventory/items/${item.id}?action=exit`,
      )
    }, 300)
  }

  async function scanVideoFrame() {
    if (
      !videoRef.current ||
      !detectorRef.current ||
      !isCameraActive
    ) {
      return
    }

    const video =
      videoRef.current

    if (
      video.readyState <
      HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      animationFrameRef.current =
        window.requestAnimationFrame(
          scanVideoFrame,
        )

      return
    }

    if (
      !isDetectingRef.current
    ) {
      isDetectingRef.current =
        true

      try {
        const detectedCodes =
          await detectorRef.current.detect(
            video,
          )

        const detectedValue =
          detectedCodes[0]?.rawValue?.trim()

        if (
          detectedValue &&
          detectedValue !==
            lastScannedValueRef.current
        ) {
          lastScannedValueRef.current =
            detectedValue

          openScannedItem(
            detectedValue,
          )

          return
        }
      } catch {
        // nastavi skenirati
      } finally {
        isDetectingRef.current =
          false
      }
    }

    animationFrameRef.current =
      window.requestAnimationFrame(
        scanVideoFrame,
      )
  }

  async function startCamera() {
    setErrorMessage('')
    setStatusMessage('')

    lastScannedValueRef.current =
      ''

    if (
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      setErrorMessage(
        'Ovaj preglednik ne podržava pristup kameri.',
      )
      return
    }

    if (!window.BarcodeDetector) {
      setErrorMessage(
        'Ovaj preglednik nema ugrađenu podršku za QR skeniranje. Možeš ručno upisati šifru artikla.',
      )
      return
    }

    try {
      setIsStartingCamera(true)

      stopCamera()

      detectorRef.current =
        new window.BarcodeDetector({
          formats: ['qr_code'],
        })

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: false,
            video: {
              facingMode: {
                ideal:
                  'environment',
              },
              width: {
                ideal: 1920,
              },
              height: {
                ideal: 1080,
              },
            },
          },
        )

      cameraStreamRef.current =
        stream

      if (!videoRef.current) {
        throw new Error(
          'Video prikaz nije dostupan.',
        )
      }

      videoRef.current.srcObject =
        stream

      videoRef.current.setAttribute(
        'playsinline',
        'true',
      )

      await videoRef.current.play()

      setIsCameraActive(true)
      setIsStartingCamera(false)
    } catch (error) {
      stopCamera()

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Kameru nije moguće pokrenuti.',
      )
    }
  }

  useEffect(() => {
    if (!isCameraActive) {
      return
    }

    animationFrameRef.current =
      window.requestAnimationFrame(
        scanVideoFrame,
      )

    return () => {
      stopScanningLoop()
    }
  }, [
    isCameraActive,
    items,
  ])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  function handleManualSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    openScannedItem(
      manualValue,
    )
  }

  if (isLoadingItems) {
    return (
      <FersysLoader text="Učitavanje artikala..." />
    )
  }

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => {
              stopCamera()
              navigate(
                '/inventory',
              )
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              QR skener
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Skeniraj artikl i FERSYS će odmah otvoriti
              <b className="text-slate-200">
                {' '}
                Uzmi iz skladišta
              </b>
              .
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="flex-1 text-sm leading-6">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                setErrorMessage('')
              }
            >
              <X size={17} />
            </button>
          </div>
        )}

        {statusMessage && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            <CheckCircle2
              size={20}
            />
            <p className="text-sm font-semibold">
              {statusMessage}
            </p>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="relative aspect-[3/4] min-h-[420px] overflow-hidden bg-black sm:aspect-[4/3]">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`h-full w-full object-cover ${
                isCameraActive
                  ? 'block'
                  : 'hidden'
              }`}
            />

            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-slate-800 text-sky-400">
                  <CameraOff
                    size={38}
                  />
                </div>

                <h2 className="mt-5 text-xl font-semibold text-white">
                  Kamera nije pokrenuta
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Pokreni kameru i usmjeri je prema QR kodu na artiklu ili polici.
                </p>
              </div>
            )}

            {isCameraActive && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-black/20" />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
                  <div className="aspect-square w-full max-w-[330px] rounded-3xl border-4 border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                </div>
              </>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {!isCameraActive ? (
              <button
                type="button"
                disabled={
                  isStartingCamera
                }
                onClick={() =>
                  void startCamera()
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 font-bold text-white disabled:opacity-50"
              >
                <Camera
                  size={19}
                />

                {isStartingCamera
                  ? 'Pokretanje kamere...'
                  : 'Pokreni kameru'}
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  stopCamera
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 font-bold text-white"
              >
                <CameraOff
                  size={19}
                />
                Zaustavi kameru
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <Keyboard className="text-violet-400" />

            <div>
              <h2 className="font-bold text-white">
                Ručni unos
              </h2>

              <p className="text-xs text-slate-500">
                Možeš upisati šifru, barkod ili QR vrijednost.
              </p>
            </div>
          </div>

          <form
            onSubmit={
              handleManualSearch
            }
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={
                  manualValue
                }
                onChange={(event) =>
                  setManualValue(
                    event.target
                      .value,
                  )
                }
                placeholder="Npr. ART-00001"
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-white outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 font-bold text-white"
            >
              <PackageSearch
                size={18}
              />
              Pronađi
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
          <div className="flex gap-3">
            <QrCode
              size={20}
              className="mt-0.5 shrink-0 text-sky-300"
            />

            <p className="text-sm leading-6 text-slate-300">
              Nakon skeniranja ne moraš dodatno tražiti gumb. FERSYS odmah otvara prozor za unos količine koju radnik uzima.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryQrScannerPage