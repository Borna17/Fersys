import {
  CheckCircle2,
  Download,
  ExternalLink,
  LoaderCircle,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

type DownloadToast = {
  id: number
  status:
    | 'preparing'
    | 'success'
    | 'warning'
  title: string
  message: string
  fileName?: string
  openUrl?: string
}

const DOWNLOAD_BUTTON_PATTERN =
  /\b(preuzmi|preuzimanje|download|pdf|excel|izvezi|export)\b/i

const EXCLUDED_BUTTON_PATTERN =
  /\b(preuzmi aplikaciju|instaliraj aplikaciju)\b/i

const PREPARING_TIMEOUT =
  45_000

const SUCCESS_TIMEOUT =
  12_000

function isDownloadIntentElement(
  target: EventTarget | null,
) {
  if (
    !(target instanceof
      Element)
  ) {
    return null
  }

  const element =
    target.closest(
      'button, a, [role="button"]',
    ) as HTMLElement | null

  if (!element) {
    return null
  }

  const text =
    (
      element.innerText ||
      element.textContent ||
      ''
    )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()

  const explicit =
    element.dataset
      .downloadFeedback ===
    'true'

  if (
    !explicit &&
    (
      !DOWNLOAD_BUTTON_PATTERN.test(
        text,
      ) ||
      EXCLUDED_BUTTON_PATTERN.test(
        text,
      )
    )
  ) {
    return null
  }

  return element
}

function downloadLabel(
  element:
    HTMLElement | null,
) {
  if (!element) {
    return 'datoteke'
  }

  const explicit =
    element.dataset
      .downloadLabel
      ?.trim()

  if (explicit) {
    return explicit
  }

  const text =
    (
      element.innerText ||
      element.textContent ||
      ''
    )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()
      .toLowerCase()

  if (
    text.includes(
      'ponud',
    )
  ) {
    return 'PDF ponude'
  }

  if (
    text.includes(
      'račun',
    ) ||
    text.includes(
      'racun',
    )
  ) {
    return 'PDF računa'
  }

  if (
    text.includes(
      'radni',
    ) &&
    text.includes(
      'nalog',
    )
  ) {
    return 'PDF radnog naloga'
  }

  if (
    text.includes(
      'excel',
    ) ||
    text.includes(
      'izvezi',
    )
  ) {
    return 'datoteke'
  }

  if (
    text.includes(
      'pdf',
    )
  ) {
    return 'PDF dokumenta'
  }

  return 'datoteke'
}

function safeAnchorHref(
  anchor:
    HTMLAnchorElement,
) {
  const href =
    anchor.href?.trim()

  if (!href) {
    return undefined
  }

  if (
    href.startsWith(
      'blob:',
    ) ||
    href.startsWith(
      'data:',
    ) ||
    href.startsWith(
      'http://',
    ) ||
    href.startsWith(
      'https://',
    )
  ) {
    return href
  }

  return undefined
}

export default function DownloadFeedbackCenter() {
  const [
    toast,
    setToast,
  ] =
    useState<
      DownloadToast | null
    >(null)

  const sourceElementRef =
    useRef<
      HTMLElement | null
    >(null)

  const preparingTimerRef =
    useRef<
      number | null
    >(null)

  const dismissTimerRef =
    useRef<
      number | null
    >(null)

  const sequenceRef =
    useRef(0)

  function clearTimer(
    ref: React.MutableRefObject<
      number | null
    >,
  ) {
    if (
      ref.current !==
      null
    ) {
      window.clearTimeout(
        ref.current,
      )
      ref.current = null
    }
  }

  function resetButton() {
    const element =
      sourceElementRef.current

    if (element) {
      delete element.dataset
        .fersysDownloadState

      element.removeAttribute(
        'aria-busy',
      )
    }

    sourceElementRef.current =
      null
  }

  function beginPreparing(
    element:
      HTMLElement,
  ) {
    clearTimer(
      dismissTimerRef,
    )
    clearTimer(
      preparingTimerRef,
    )

    resetButton()

    sourceElementRef.current =
      element

    element.dataset
      .fersysDownloadState =
      'loading'

    element.setAttribute(
      'aria-busy',
      'true',
    )

    const label =
      downloadLabel(
        element,
      )

    sequenceRef.current +=
      1

    setToast({
      id:
        sequenceRef.current,
      status:
        'preparing',
      title:
        `Pripremam ${label}...`,
      message:
        'Pričekaj trenutak. FERSYS izrađuje datoteku za preuzimanje.',
    })

    preparingTimerRef.current =
      window.setTimeout(
        () => {
          resetButton()

          sequenceRef.current +=
            1

          setToast({
            id:
              sequenceRef.current,
            status:
              'warning',
            title:
              'Preuzimanje traje dulje',
            message:
              'Ako se datoteka nije pojavila u Preuzimanjima, pokušaj ponovno.',
          })

          dismissTimerRef.current =
            window.setTimeout(
              () =>
                setToast(
                  null,
                ),
              7000,
            )
        },
        PREPARING_TIMEOUT,
      )
  }

  function markDownloaded(
    anchor:
      HTMLAnchorElement,
  ) {
    clearTimer(
      preparingTimerRef,
    )
    clearTimer(
      dismissTimerRef,
    )

    const fileName =
      anchor.download
        ?.trim() ||
      undefined

    const openUrl =
      safeAnchorHref(
        anchor,
      )

    resetButton()

    sequenceRef.current +=
      1

    setToast({
      id:
        sequenceRef.current,
      status:
        'success',
      title:
        'Preuzimanje je pokrenuto',
      message:
        fileName
          ? `${fileName} je poslan u Preuzimanja.`
          : 'Datoteka je poslana u Preuzimanja.',
      fileName,
      openUrl,
    })

    dismissTimerRef.current =
      window.setTimeout(
        () =>
          setToast(null),
        SUCCESS_TIMEOUT,
      )
  }

  useEffect(() => {
    const originalAnchorClick =
      HTMLAnchorElement
        .prototype.click

    HTMLAnchorElement
      .prototype.click =
      function patchedAnchorClick() {
        const shouldTrack =
          Boolean(
            this.download,
          ) ||
          this.href.startsWith(
            'blob:',
          )

        if (
          shouldTrack
        ) {
          window.setTimeout(
            () => {
              window.dispatchEvent(
                new CustomEvent(
                  'fersys:download-started',
                  {
                    detail: {
                      anchor:
                        this,
                    },
                  },
                ),
              )
            },
            0,
          )
        }

        return originalAnchorClick.call(
          this,
        )
      }

    function handleUserClick(
      event: MouseEvent,
    ) {
      const element =
        isDownloadIntentElement(
          event.target,
        )

      if (!element) {
        return
      }

      /*
       * Ako je klik direktno na <a download>, browser
       * odmah pokreće preuzimanje pa ne prikazujemo
       * nepotrebno dugo "pripremam".
       *
       * Za PDF gumbe jsPDF prvo generira dokument,
       * pa spinner ostaje dok se ne pojavi stvarni
       * download anchor.
       */
      if (
        element instanceof
          HTMLAnchorElement &&
        element.download
      ) {
        return
      }

      beginPreparing(
        element,
      )
    }

    function handleStarted(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          anchor?:
            HTMLAnchorElement
        }>

      const anchor =
        customEvent.detail
          ?.anchor

      if (!anchor) {
        return
      }

      markDownloaded(
        anchor,
      )
    }

    document.addEventListener(
      'click',
      handleUserClick,
      true,
    )

    window.addEventListener(
      'fersys:download-started',
      handleStarted,
    )

    return () => {
      document.removeEventListener(
        'click',
        handleUserClick,
        true,
      )

      window.removeEventListener(
        'fersys:download-started',
        handleStarted,
      )

      HTMLAnchorElement
        .prototype.click =
        originalAnchorClick

      clearTimer(
        preparingTimerRef,
      )

      clearTimer(
        dismissTimerRef,
      )

      resetButton()
    }
  }, [])

  if (!toast) {
    return (
      <DownloadFeedbackStyles />
    )
  }

  const success =
    toast.status ===
    'success'

  const preparing =
    toast.status ===
    'preparing'

  return (
    <>
      <DownloadFeedbackStyles />

      <div
        className="fersys-download-toast"
        role="status"
        aria-live="polite"
      >
        <div
          className={`fersys-download-icon ${
            success
              ? 'is-success'
              : preparing
                ? 'is-loading'
                : 'is-warning'
          }`}
        >
          {success ? (
            <CheckCircle2
              size={24}
            />
          ) : preparing ? (
            <LoaderCircle
              size={24}
              className="fersys-download-spin"
            />
          ) : (
            <Download
              size={23}
            />
          )}
        </div>

        <div className="fersys-download-copy">
          <strong>
            {toast.title}
          </strong>

          <span>
            {toast.message}
          </span>
        </div>

        {success &&
          toast.openUrl && (
            <button
              type="button"
              className="fersys-download-open"
              onClick={() => {
                window.open(
                  toast.openUrl,
                  '_blank',
                  'noopener,noreferrer',
                )
              }}
            >
              <ExternalLink
                size={16}
              />
              Otvori
            </button>
          )}

        <button
          type="button"
          aria-label="Zatvori obavijest"
          className="fersys-download-close"
          onClick={() => {
            clearTimer(
              dismissTimerRef,
            )

            clearTimer(
              preparingTimerRef,
            )

            resetButton()
            setToast(null)
          }}
        >
          <X size={17} />
        </button>

        {preparing && (
          <div className="fersys-download-progress">
            <span />
          </div>
        )}
      </div>
    </>
  )
}

function DownloadFeedbackStyles() {
  return (
    <style>{`
      [data-fersys-download-state="loading"] {
        position: relative !important;
        overflow: hidden !important;
        pointer-events: none !important;
        cursor: wait !important;
        transform: translateY(0) scale(.985) !important;
        opacity: .82 !important;
        transition:
          transform .16s ease,
          opacity .16s ease,
          box-shadow .16s ease !important;
      }

      [data-fersys-download-state="loading"]::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background:
          linear-gradient(
            105deg,
            transparent 20%,
            rgba(255,255,255,.16) 45%,
            transparent 70%
          );
        transform: translateX(-120%);
        animation:
          fersys-download-button-shimmer
          1.05s linear infinite;
        pointer-events: none;
      }

      @keyframes fersys-download-button-shimmer {
        to {
          transform: translateX(120%);
        }
      }

      .fersys-download-toast {
        position: fixed;
        z-index: 2147483000;
        left: 50%;
        bottom:
          max(
            22px,
            env(safe-area-inset-bottom)
          );
        width:
          min(
            calc(100vw - 28px),
            560px
          );
        min-height: 76px;
        display: grid;
        grid-template-columns:
          48px minmax(0,1fr)
          auto auto;
        align-items: center;
        gap: 12px;
        padding: 13px 13px 13px 14px;
        border:
          1px solid
          rgba(148,163,184,.22);
        border-radius: 20px;
        background:
          rgba(8,15,31,.96);
        box-shadow:
          0 22px 70px
          rgba(0,0,0,.45),
          inset 0 1px 0
          rgba(255,255,255,.04);
        color: #f8fafc;
        backdrop-filter:
          blur(20px);
        -webkit-backdrop-filter:
          blur(20px);
        transform:
          translateX(-50%);
        overflow: hidden;
        animation:
          fersys-download-toast-in
          .22s ease-out both;
      }

      @keyframes fersys-download-toast-in {
        from {
          opacity: 0;
          transform:
            translate(-50%, 18px)
            scale(.97);
        }

        to {
          opacity: 1;
          transform:
            translate(-50%, 0)
            scale(1);
        }
      }

      .fersys-download-icon {
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border-radius: 15px;
        background:
          rgba(124,58,237,.16);
        color: #c4b5fd;
      }

      .fersys-download-icon.is-success {
        background:
          rgba(16,185,129,.14);
        color: #34d399;
      }

      .fersys-download-icon.is-warning {
        background:
          rgba(245,158,11,.14);
        color: #fbbf24;
      }

      .fersys-download-spin {
        animation:
          fersys-download-spin
          .85s linear infinite;
      }

      @keyframes fersys-download-spin {
        to {
          transform:
            rotate(360deg);
        }
      }

      .fersys-download-copy {
        min-width: 0;
        display: grid;
        gap: 4px;
      }

      .fersys-download-copy strong {
        overflow: hidden;
        color: #fff;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 900;
        text-overflow:
          ellipsis;
        white-space: nowrap;
      }

      .fersys-download-copy span {
        overflow: hidden;
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.45;
        text-overflow:
          ellipsis;
        white-space: nowrap;
      }

      .fersys-download-open {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content:
          center;
        gap: 7px;
        padding: 0 13px;
        border:
          1px solid
          rgba(96,165,250,.25);
        border-radius: 12px;
        background:
          rgba(37,99,235,.13);
        color: #bfdbfe;
        font: inherit;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
      }

      .fersys-download-open:hover {
        background:
          rgba(37,99,235,.22);
      }

      .fersys-download-close {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
      }

      .fersys-download-close:hover {
        background:
          rgba(148,163,184,.08);
        color: #cbd5e1;
      }

      .fersys-download-progress {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
        overflow: hidden;
        background:
          rgba(148,163,184,.08);
      }

      .fersys-download-progress span {
        display: block;
        width: 38%;
        height: 100%;
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            #2563eb,
            #7c3aed,
            #d946ef
          );
        animation:
          fersys-download-progress
          1.15s ease-in-out infinite;
      }

      @keyframes fersys-download-progress {
        0% {
          transform:
            translateX(-110%);
        }

        100% {
          transform:
            translateX(370%);
        }
      }

      @media (max-width: 640px) {
        .fersys-download-toast {
          bottom:
            max(
              14px,
              env(safe-area-inset-bottom)
            );
          grid-template-columns:
            44px minmax(0,1fr)
            auto;
          gap: 10px;
          min-height: 72px;
          padding:
            11px 10px 11px 11px;
          border-radius: 18px;
        }

        .fersys-download-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
        }

        .fersys-download-open {
          grid-column: 2 / 4;
          width: 100%;
          min-height: 38px;
          margin-top: 1px;
        }

        .fersys-download-close {
          width: 34px;
          height: 34px;
        }

        .fersys-download-copy strong {
          font-size: 13px;
        }

        .fersys-download-copy span {
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        [data-fersys-download-state="loading"]::after,
        .fersys-download-spin,
        .fersys-download-progress span,
        .fersys-download-toast {
          animation: none !important;
        }
      }
    `}</style>
  )
}
