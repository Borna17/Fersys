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
  Sparkles,
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
    <section className="mx-auto w-full max-w-4xl space-y-4 pb-10 sm:space-y-6">
      <button
        type="button"
        onClick={() => {
          stopCamera()
          navigate(
            '/inventory',
          )
        }}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-black text-slate-400 active:text-white"
      >
        <ArrowLeft size={18} />
        Skladište
      </button>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-sky-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400">
              SKLADIŠTE
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              QR skener
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Skeniraj artikl i FERSYS odmah otvara unos količine za izlaz iz skladišta.
            </p>
          </div>

          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-300">
            <QrCode size={22} />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <HeroMetric
            label="Artikli"
            value={String(
              items.length,
            )}
          />

          <HeroMetric
            label="Kamera"
            value={
              isCameraActive
                ? 'Aktivna'
                : 'Isključena'
            }
          />

          <HeroMetric
            label="Radnja"
            value="Izlaz robe"
          />
        </div>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="min-w-0 flex-1 text-sm leading-6">
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
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
          <CheckCircle2
            size={20}
          />

          <p className="text-sm font-black">
            {statusMessage}
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">
        <div className="relative aspect-[4/5] min-h-[460px] overflow-hidden bg-black sm:aspect-[4/3] sm:min-h-[520px]">
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
              <div className="grid h-24 w-24 place-items-center rounded-[2rem] bg-slate-800 text-sky-400">
                <CameraOff
                  size={42}
                />
              </div>

              <h2 className="mt-5 text-xl font-black text-white">
                Kamera nije pokrenuta
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Pokreni stražnju kameru i usmjeri je prema QR kodu artikla.
              </p>
            </div>
          )}

          {isCameraActive && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-black/10" />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                <div className="relative aspect-square w-full max-w-[330px] rounded-[2rem] border-[3px] border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]">
                  <Corner className="left-[-4px] top-[-4px] border-l-4 border-t-4" />
                  <Corner className="right-[-4px] top-[-4px] border-r-4 border-t-4" />
                  <Corner className="bottom-[-4px] left-[-4px] border-b-4 border-l-4" />
                  <Corner className="bottom-[-4px] right-[-4px] border-b-4 border-r-4" />

                  <div className="absolute left-1/2 top-1/2 h-[2px] w-[72%] -translate-x-1/2 -translate-y-1/2 bg-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.8)]" />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-black text-white backdrop-blur">
                  <Sparkles
                    size={15}
                    className="text-sky-300"
                  />
                  Tražim QR kod...
                </div>
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
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 text-base font-black text-white active:scale-[0.99] disabled:opacity-50"
            >
              <Camera
                size={21}
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
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 text-base font-black text-white active:scale-[0.99]"
            >
              <CameraOff
                size={21}
              />
              Zaustavi kameru
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
            <Keyboard size={20} />
          </div>

          <div>
            <h2 className="font-black text-white">
              Ručni unos
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Ako kamera ne radi, upiši šifru, barkod ili QR vrijednost.
            </p>
          </div>
        </div>

        <form
          onSubmit={
            handleManualSearch
          }
          className="mt-4 space-y-3 sm:flex sm:gap-3 sm:space-y-0"
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
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-base font-semibold text-white outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 font-black text-white active:scale-[0.99] sm:w-auto"
          >
            <PackageSearch
              size={19}
            />
            Pronađi artikl
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-sky-500/20 bg-sky-500/10 p-4">
        <div className="flex gap-3">
          <QrCode
            size={20}
            className="mt-0.5 shrink-0 text-sky-300"
          />

          <p className="text-sm leading-6 text-slate-300">
            Nakon uspješnog skeniranja FERSYS automatski otvara artikl i prozor <b className="text-white">Uzmi iz skladišta</b>, pa radnik samo unese količinu.
          </p>
        </div>
      </section>
    </section>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Corner({
  className,
}: {
  className: string
}) {
  return (
    <span
      className={`absolute h-10 w-10 rounded-[0.75rem] border-sky-300 ${className}`}
    />
  )
}

export default InventoryQrScannerPage
