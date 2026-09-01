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

type DownloadState = {
  status:
    | 'preparing'
    | 'success'
    | 'warning'
    | 'error'
  title: string
  message: string
  fileName?: string
  openUrl?: string
}

type DownloadEventDetail = {
  fileName?: string
  openUrl?: string
  message?: string
}

/*
 * VAŽNO:
 * Ne smijemo reagirati na samu riječ "PDF" ili "Excel".
 * Takve riječi se pojavljuju u običnim opisima modula,
 * npr. "potpis i PDF", i prije su lažno palile loader.
 */
const DOWNLOAD_ACTION_PATTERN =
  /\b(preuzmi|preuzimanje|download|izvezi|export|spremi\s+(?:pdf|excel)|izradi\s+(?:pdf|excel)|generiraj\s+(?:pdf|excel)|otvori\s+pdf)\b/i

const EXCLUDED_BUTTON_PATTERN =
  /\b(preuzmi aplikaciju|instaliraj aplikaciju)\b/i

const SLOW_WARNING_MS =
  10_000

const SUCCESS_TIMEOUT_MS =
  12_000

function findDownloadButton(
  target:
    EventTarget | null,
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

  if (
    element.dataset
      .downloadFeedback ===
    'false'
  ) {
    return null
  }

  const explicit =
    element.dataset
      .downloadFeedback ===
    'true'

  if (explicit) {
    return element
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

  if (
    EXCLUDED_BUTTON_PATTERN.test(
      text,
    )
  ) {
    return null
  }

  if (
    !DOWNLOAD_ACTION_PATTERN.test(
      text,
    )
  ) {
    return null
  }

  return element
}

function displayName(
  fileName?: string,
) {
  if (!fileName) {
    return 'datoteku'
  }

  const lower =
    fileName.toLowerCase()

  if (
    lower.endsWith(
      '.pdf',
    )
  ) {
    return 'PDF'
  }

  if (
    lower.endsWith(
      '.xlsx',
    ) ||
    lower.endsWith(
      '.xls',
    )
  ) {
    return 'Excel'
  }

  return 'datoteku'
}

export default function DownloadFeedbackCenter() {
  const [
    state,
    setState,
  ] =
    useState<
      DownloadState | null
    >(null)

  const activeButton =
    useRef<
      HTMLElement | null
    >(null)

  const slowTimer =
    useRef<
      number | null
    >(null)

  const dismissTimer =
    useRef<
      number | null
    >(null)

  function clearTimer(
    ref:
      React.MutableRefObject<
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

  function clearButton() {
    if (
      activeButton.current
    ) {
      delete activeButton
        .current.dataset
        .fersysDownloadState

      activeButton.current
        .removeAttribute(
          'aria-busy',
        )
    }

    activeButton.current =
      null
  }

  function dismiss() {
    clearTimer(
      slowTimer,
    )
    clearTimer(
      dismissTimer,
    )
    clearButton()
    setState(null)
  }

  function scheduleSlowWarning() {
    clearTimer(
      slowTimer,
    )

    slowTimer.current =
      window.setTimeout(
        () => {
          setState((current) => ({
            status: 'preparing',
            title: 'Veći dokument – još ga pripremam...',
            message:
              'Radni nalog s više stavki ili fotografija može potrajati malo duže. Ne zatvaraj aplikaciju – FERSYS i dalje radi.',
            fileName: current?.fileName,
          }))
        },
        SLOW_WARNING_MS,
      )
  }

  function showPreparing(
    fileName?: string,
  ) {
    clearTimer(
      dismissTimer,
    )

    setState({
      status:
        'preparing',
      title:
        `Pripremam ${displayName(
          fileName,
        )}...`,
      message:
        'FERSYS izrađuje dokument. To bi trebalo trajati samo nekoliko sekundi.',
      fileName,
    })

    scheduleSlowWarning()
  }

  function showSuccess(
    detail:
      DownloadEventDetail,
  ) {
    clearTimer(
      slowTimer,
    )
    clearTimer(
      dismissTimer,
    )
    clearButton()

    setState({
      status:
        'success',
      title:
        detail.fileName
          ?.toLowerCase()
          .endsWith('.pdf')
          ? 'PDF je spreman'
          : 'Datoteka je spremna',
      message:
        detail.fileName
          ? `${detail.fileName} je pripremljen za preuzimanje.`
          : 'Preuzimanje je pokrenuto.',
      fileName:
        detail.fileName,
      openUrl:
        detail.openUrl,
    })

    dismissTimer.current =
      window.setTimeout(
        () =>
          setState(
            null,
          ),
        SUCCESS_TIMEOUT_MS,
      )
  }

  function showError(
    detail:
      DownloadEventDetail,
  ) {
    clearTimer(
      slowTimer,
    )
    clearTimer(
      dismissTimer,
    )
    clearButton()

    setState({
      status:
        'error',
      title:
        'Preuzimanje nije uspjelo',
      message:
        detail.message ||
        'Pokušaj ponovno.',
      fileName:
        detail.fileName,
    })

    dismissTimer.current =
      window.setTimeout(
        () =>
          setState(
            null,
          ),
        9000,
      )
  }

  useEffect(() => {
    const originalAnchorClick =
      HTMLAnchorElement
        .prototype.click

    HTMLAnchorElement
      .prototype.click =
      function patchedClick() {
        const skip =
          this.dataset
            .fersysSkipDownloadFeedback ===
          'true'

        if (
          !skip &&
          (
            Boolean(
              this.download,
            ) ||
            this.href.startsWith(
              'blob:',
            )
          )
        ) {
          const fileName =
            this.download ||
            undefined

          const openUrl =
            this.href.startsWith(
              'blob:',
            )
              ? this.href
              : undefined

          window.setTimeout(
            () => {
              window.dispatchEvent(
                new CustomEvent(
                  'fersys:download-complete',
                  {
                    detail: {
                      fileName,
                      openUrl,
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

    function userClick(
      event: MouseEvent,
    ) {
      const button =
        findDownloadButton(
          event.target,
        )

      if (!button) {
        return
      }

      clearButton()

      activeButton.current =
        button

      button.dataset
        .fersysDownloadState =
        'loading'

      button.setAttribute(
        'aria-busy',
        'true',
      )

      showPreparing()
    }

    function preparing(
      event: Event,
    ) {
      const detail =
        (
          event as
            CustomEvent<
              DownloadEventDetail
            >
        ).detail ??
        {}

      showPreparing(
        detail.fileName,
      )
    }

    function complete(
      event: Event,
    ) {
      const detail =
        (
          event as
            CustomEvent<
              DownloadEventDetail
            >
        ).detail ??
        {}

      showSuccess(
        detail,
      )
    }

    function error(
      event: Event,
    ) {
      const detail =
        (
          event as
            CustomEvent<
              DownloadEventDetail
            >
        ).detail ??
        {}

      showError(
        detail,
      )
    }

    function pageChanged() {
      /*
       * Ako korisnik ode na drugu stranicu,
       * stari download toast ne smije ostati preko UI-ja.
       */
      dismiss()
    }

    document.addEventListener(
      'click',
      userClick,
      true,
    )

    window.addEventListener(
      'fersys:download-preparing',
      preparing,
    )

    window.addEventListener(
      'fersys:download-complete',
      complete,
    )

    window.addEventListener(
      'fersys:download-error',
      error,
    )

    window.addEventListener(
      'popstate',
      pageChanged,
    )

    window.addEventListener(
      'hashchange',
      pageChanged,
    )

    return () => {
      document.removeEventListener(
        'click',
        userClick,
        true,
      )

      window.removeEventListener(
        'fersys:download-preparing',
        preparing,
      )

      window.removeEventListener(
        'fersys:download-complete',
        complete,
      )

      window.removeEventListener(
        'fersys:download-error',
        error,
      )

      window.removeEventListener(
        'popstate',
        pageChanged,
      )

      window.removeEventListener(
        'hashchange',
        pageChanged,
      )

      HTMLAnchorElement
        .prototype.click =
        originalAnchorClick

      clearTimer(
        slowTimer,
      )
      clearTimer(
        dismissTimer,
      )
      clearButton()
    }
  }, [])

  if (!state) {
    return (
      <Styles />
    )
  }

  const preparing =
    state.status ===
    'preparing'

  const success =
    state.status ===
    'success'

  const error =
    state.status ===
    'error'

  return (
    <>
      <Styles />

      <div
        className="fersys-download-toast"
        role="status"
        aria-live="polite"
      >
        <div
          className={`fersys-download-icon ${
            preparing
              ? 'is-loading'
              : success
                ? 'is-success'
                : error
                  ? 'is-error'
                  : 'is-warning'
          }`}
        >
          {preparing ? (
            <LoaderCircle
              size={24}
              className="fersys-download-spin"
            />
          ) : success ? (
            <CheckCircle2
              size={24}
            />
          ) : (
            <Download
              size={23}
            />
          )}
        </div>

        <div className="fersys-download-copy">
          <strong>
            {state.title}
          </strong>

          <span>
            {state.message}
          </span>
        </div>

        {success &&
          state.openUrl && (
            <button
              type="button"
              className="fersys-download-open"
              onClick={() => {
                window.open(
                  state.openUrl,
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
          className="fersys-download-close"
          aria-label="Zatvori"
          onClick={dismiss}
        >
          <X
            size={17}
          />
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

function Styles() {
  return (
    <style>{`
      [data-fersys-download-state="loading"] {
        position: relative !important;
        overflow: hidden !important;
        pointer-events: none !important;
        cursor: wait !important;
        transform: scale(.985) !important;
        opacity: .84 !important;
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
          fersys-download-shimmer
          .9s linear infinite;
        pointer-events: none;
      }

      @keyframes fersys-download-shimmer {
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
            20px,
            env(safe-area-inset-bottom)
          );
        width:
          min(
            calc(100vw - 28px),
            560px
          );
        min-height: 74px;
        display: grid;
        grid-template-columns:
          48px minmax(0,1fr)
          auto auto;
        align-items: center;
        gap: 12px;
        padding:
          12px 13px;
        border:
          1px solid
          rgba(148,163,184,.22);
        border-radius: 20px;
        background:
          rgba(8,15,31,.97);
        box-shadow:
          0 22px 70px
          rgba(0,0,0,.45);
        color: #f8fafc;
        backdrop-filter:
          blur(20px);
        transform:
          translateX(-50%);
        overflow: hidden;
        animation:
          fersys-toast-in
          .18s ease-out both;
      }

      @keyframes fersys-toast-in {
        from {
          opacity: 0;
          transform:
            translate(-50%, 12px)
            scale(.98);
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

      .fersys-download-icon.is-error {
        background:
          rgba(239,68,68,.14);
        color: #f87171;
      }

      .fersys-download-spin {
        animation:
          fersys-spin
          .7s linear infinite;
      }

      @keyframes fersys-spin {
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
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.45;
      }

      .fersys-download-open {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
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
        width: 42%;
        height: 100%;
        background:
          linear-gradient(
            90deg,
            #2563eb,
            #7c3aed,
            #d946ef
          );
        animation:
          fersys-progress
          .9s ease-in-out infinite;
      }

      @keyframes fersys-progress {
        from {
          transform:
            translateX(-110%);
        }

        to {
          transform:
            translateX(340%);
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
          min-height: 70px;
          padding:
            10px 10px 10px 11px;
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
          justify-content: center;
        }

        .fersys-download-copy strong {
          font-size: 13px;
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
