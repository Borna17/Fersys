import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  PackageSearch,
  QrCode,
  RefreshCw,
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

import {
  getInventoryItems,
  type InventoryItem,
} from '../utils/inventoryStorage'

type BarcodeDetectorResult = {
  rawValue: string
}

type BarcodeDetectorInstance = {
  detect: (
    source: HTMLVideoElement,
  ) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[]
}) => BarcodeDetectorInstance

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor
  }
}

function normalizeValue(value: string): string {
  return value.trim().toLocaleLowerCase('hr-HR')
}

function findInventoryItem(
  scannedValue: string,
): InventoryItem | undefined {
  const normalizedScannedValue =
    normalizeValue(scannedValue)

  const items = getInventoryItems()

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
      .map((value) => normalizeValue(String(value)))

    if (
      possibleValues.includes(normalizedScannedValue)
    ) {
      return true
    }

    try {
      const scannedUrl = new URL(scannedValue)
      const pathParts = scannedUrl.pathname
        .split('/')
        .filter(Boolean)

      const itemIdFromUrl =
        pathParts[pathParts.length - 1]

      return itemIdFromUrl === item.id
    } catch {
      return false
    }
  })
}

export function InventoryQrScannerPage() {
  const navigate = useNavigate()

  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef =
    useRef<MediaStream | null>(null)
  const animationFrameRef =
    useRef<number | null>(null)
  const detectorRef =
    useRef<BarcodeDetectorInstance | null>(null)
  const isDetectingRef = useRef(false)
  const lastScannedValueRef = useRef('')

  const [isCameraActive, setIsCameraActive] =
    useState(false)
  const [isStartingCamera, setIsStartingCamera] =
    useState(false)
  const [isScanning, setIsScanning] =
    useState(false)

  const [manualValue, setManualValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] =
    useState('')

  const [cameraSupported, setCameraSupported] =
    useState(true)
  const [
    barcodeDetectorSupported,
    setBarcodeDetectorSupported,
  ] = useState(true)

  function stopScanningLoop() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(
        animationFrameRef.current,
      )
      animationFrameRef.current = null
    }

    isDetectingRef.current = false
    setIsScanning(false)
  }

  function stopCamera() {
    stopScanningLoop()

    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraActive(false)
    setIsStartingCamera(false)
  }

  function openScannedItem(value: string) {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      setErrorMessage(
        'QR kod ili šifra nisu ispravno očitani.',
      )
      return
    }

    const item = findInventoryItem(trimmedValue)

    if (!item) {
      lastScannedValueRef.current = ''
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
      navigate(`/inventory/items/${item.id}`)
    }, 450)
  }

  async function scanVideoFrame() {
    if (
      !videoRef.current ||
      !detectorRef.current ||
      !isCameraActive
    ) {
      return
    }

    const video = videoRef.current

    if (
      video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      animationFrameRef.current =
        window.requestAnimationFrame(scanVideoFrame)
      return
    }

    if (!isDetectingRef.current) {
      isDetectingRef.current = true

      try {
        const detectedCodes =
          await detectorRef.current.detect(video)

        const detectedValue =
          detectedCodes[0]?.rawValue?.trim()

        if (
          detectedValue &&
          detectedValue !==
            lastScannedValueRef.current
        ) {
          lastScannedValueRef.current =
            detectedValue

          openScannedItem(detectedValue)
          return
        }
      } catch {
        // Pojedinačna neuspješna analiza slike
        // ne prekida daljnje skeniranje.
      } finally {
        isDetectingRef.current = false
      }
    }

    animationFrameRef.current =
      window.requestAnimationFrame(scanVideoFrame)
  }

  async function startCamera() {
    setErrorMessage('')
    setStatusMessage('')
    lastScannedValueRef.current = ''

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraSupported(false)
      setErrorMessage(
        'Ovaj preglednik ne podržava pristup kameri.',
      )
      return
    }

    if (!window.BarcodeDetector) {
      setBarcodeDetectorSupported(false)
      setErrorMessage(
        'Ovaj preglednik nema ugrađenu podršku za očitavanje QR kodova. QR skener otvori u Google Chromeu na Android uređaju ili upiši šifru ručno.',
      )
      return
    }

    try {
      setIsStartingCamera(true)
      stopCamera()

      const detector = new window.BarcodeDetector({
        formats: ['qr_code'],
      })

      detectorRef.current = detector

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              ideal: 'environment',
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
        })

      cameraStreamRef.current = stream

      if (!videoRef.current) {
        throw new Error(
          'Video prikaz kamere nije dostupan.',
        )
      }

      videoRef.current.srcObject = stream
      videoRef.current.setAttribute(
        'playsinline',
        'true',
      )

      await videoRef.current.play()

      setIsCameraActive(true)
      setIsScanning(true)
      setIsStartingCamera(false)
    } catch (error) {
      stopCamera()

      const errorName =
        error instanceof DOMException
          ? error.name
          : ''

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError'
      ) {
        setErrorMessage(
          'Pristup kameri nije dopušten. U postavkama preglednika dopusti korištenje kamere za FERSYS.',
        )
        return
      }

      if (
        errorName === 'NotFoundError' ||
        errorName === 'DevicesNotFoundError'
      ) {
        setErrorMessage(
          'Kamera nije pronađena na ovom uređaju.',
        )
        return
      }

      if (
        errorName === 'NotReadableError' ||
        errorName === 'TrackStartError'
      ) {
        setErrorMessage(
          'Kameru trenutačno koristi druga aplikacija. Zatvori drugu aplikaciju i pokušaj ponovno.',
        )
        return
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Kameru nije moguće pokrenuti.',
      )
    }
  }

  function handleManualSearch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!manualValue.trim()) {
      setErrorMessage(
        'Unesi QR vrijednost, barkod ili šifru artikla.',
      )
      return
    }

    openScannedItem(manualValue)
  }

  useEffect(() => {
    if (!isCameraActive) {
      return
    }

    animationFrameRef.current =
      window.requestAnimationFrame(scanVideoFrame)

    return () => {
      stopScanningLoop()
    }
  }, [isCameraActive])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameRef.current,
        )
      }

      cameraStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop())
    }
  }, [])

  return (
    <div className="min-h-full bg-slate-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => {
              stopCamera()
              navigate('/inventory')
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Povratak u skladište"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              QR skener
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Skeniraj QR naljepnicu i odmah otvori
              artikl u skladištu.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-300 transition hover:bg-red-500/10"
              aria-label="Zatvori poruku"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {statusMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {statusMessage}
            </p>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/10">
          <div className="relative aspect-[3/4] max-h-[680px] min-h-[420px] overflow-hidden bg-black sm:aspect-[4/3]">
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
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 text-sky-400">
                  {cameraSupported &&
                  barcodeDetectorSupported ? (
                    <QrCode size={38} />
                  ) : (
                    <CameraOff size={38} />
                  )}
                </div>

                <h2 className="mt-5 text-xl font-semibold text-white">
                  Kamera nije pokrenuta
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Pritisni gumb ispod i dopusti
                  pregledniku pristup kameri.
                </p>
              </div>
            )}

            {isCameraActive && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-black/20" />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
                  <div className="relative aspect-square w-full max-w-[330px]">
                    <div className="absolute left-0 top-0 h-14 w-14 rounded-tl-3xl border-l-4 border-t-4 border-sky-400" />
                    <div className="absolute right-0 top-0 h-14 w-14 rounded-tr-3xl border-r-4 border-t-4 border-sky-400" />
                    <div className="absolute bottom-0 left-0 h-14 w-14 rounded-bl-3xl border-b-4 border-l-4 border-sky-400" />
                    <div className="absolute bottom-0 right-0 h-14 w-14 rounded-br-3xl border-b-4 border-r-4 border-sky-400" />

                    <div className="absolute left-4 right-4 top-1/2 h-0.5 animate-pulse bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-5 flex justify-center px-5">
                  <div className="rounded-full bg-slate-950/80 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                    {isScanning
                      ? 'Usmjeri kameru prema QR kodu'
                      : 'Priprema skenera...'}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-800 p-5">
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                disabled={isStartingCamera}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStartingCamera ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Pokretanje kamere...
                  </>
                ) : (
                  <>
                    <Camera size={19} />
                    Pokreni kameru
                  </>
                )}
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  <RefreshCw size={18} />
                  Ponovno pokreni
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  <CameraOff size={18} />
                  Ugasi kameru
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sky-400">
              <Keyboard size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Ručno pronalaženje
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Upiši šifru artikla, barkod ili
                vrijednost QR koda ako kamera ne radi.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleManualSearch}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <PackageSearch
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                value={manualValue}
                onChange={(event) => {
                  setManualValue(event.target.value)
                  setErrorMessage('')
                  setStatusMessage('')
                }}
                placeholder="Primjer: ART-0001 ili barkod"
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              <Search size={18} />
              Pronađi artikl
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="text-sm leading-6 text-slate-300">
            Kamera najbolje očitava QR kod kada je
            naljepnica ravna, dobro osvijetljena i kada je
            cijeli kod unutar označenog kvadrata.
          </p>
        </div>
      </div>
    </div>
  )
}

export default InventoryQrScannerPage
