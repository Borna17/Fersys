import {
  useEffect,
} from 'react'

const KEYBOARD_THRESHOLD =
  140

function viewportHeight() {
  return (
    window.visualViewport
      ?.height ??
    window.innerHeight
  )
}

export default function MobileUxPolish() {
  useEffect(() => {
    const root =
      document.documentElement

    let baselineHeight =
      Math.max(
        window.innerHeight,
        viewportHeight(),
      )

    function updateViewport() {
      const currentHeight =
        viewportHeight()

      if (
        currentHeight >
        baselineHeight
      ) {
        baselineHeight =
          currentHeight
      }

      const keyboardOpen =
        baselineHeight -
          currentHeight >
        KEYBOARD_THRESHOLD

      root.dataset.fersysKeyboard =
        keyboardOpen
          ? 'open'
          : 'closed'

      root.style.setProperty(
        '--fersys-viewport-height',
        `${currentHeight}px`,
      )

      root.style.setProperty(
        '--fersys-safe-top',
        'env(safe-area-inset-top, 0px)',
      )

      root.style.setProperty(
        '--fersys-safe-bottom',
        'env(safe-area-inset-bottom, 0px)',
      )
    }

    function onFocusIn(
      event: FocusEvent,
    ) {
      const target =
        event.target

      if (
        target instanceof
          HTMLInputElement ||
        target instanceof
          HTMLTextAreaElement ||
        target instanceof
          HTMLSelectElement
      ) {
        root.dataset.fersysEditing =
          'true'
      }
    }

    function onFocusOut() {
      window.setTimeout(
        () => {
          const active =
            document.activeElement

          const editing =
            active instanceof
              HTMLInputElement ||
            active instanceof
              HTMLTextAreaElement ||
            active instanceof
              HTMLSelectElement

          root.dataset.fersysEditing =
            editing
              ? 'true'
              : 'false'
        },
        80,
      )
    }

    updateViewport()

    window.addEventListener(
      'resize',
      updateViewport,
    )

    window.addEventListener(
      'orientationchange',
      updateViewport,
    )

    window.visualViewport
      ?.addEventListener(
        'resize',
        updateViewport,
      )

    window.visualViewport
      ?.addEventListener(
        'scroll',
        updateViewport,
      )

    document.addEventListener(
      'focusin',
      onFocusIn,
    )

    document.addEventListener(
      'focusout',
      onFocusOut,
    )

    return () => {
      window.removeEventListener(
        'resize',
        updateViewport,
      )

      window.removeEventListener(
        'orientationchange',
        updateViewport,
      )

      window.visualViewport
        ?.removeEventListener(
          'resize',
          updateViewport,
        )

      window.visualViewport
        ?.removeEventListener(
          'scroll',
          updateViewport,
        )

      document.removeEventListener(
        'focusin',
        onFocusIn,
      )

      document.removeEventListener(
        'focusout',
        onFocusOut,
      )

      delete root.dataset
        .fersysKeyboard
      delete root.dataset
        .fersysEditing
    }
  }, [])

  return (
    <style>{`
      :root {
        --fersys-mobile-nav-height: 4.5rem;
        --fersys-floating-gap: .75rem;
        --fersys-touch-min: 44px;
      }

      html {
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
        overscroll-behavior-y: none;
      }

      body {
        min-height: 100dvh;
        min-height: var(--fersys-viewport-height, 100dvh);
        overscroll-behavior-y: none;
      }

      button,
      a,
      [role="button"] {
        -webkit-tap-highlight-color: transparent;
      }

      @media (max-width: 767px) {
        input,
        textarea,
        select {
          font-size: 16px !important;
        }

        input,
        select {
          min-height: var(--fersys-touch-min);
        }

        textarea {
          min-height: 88px;
        }

        button:not([aria-hidden="true"]),
        a[role="button"],
        [role="button"] {
          touch-action: manipulation;
        }

        [class*="fixed"][class*="inset-0"] section,
        [class*="fixed"][class*="inset-0"] > div {
          max-height: calc(
            var(--fersys-viewport-height, 100dvh) -
            env(safe-area-inset-top, 0px)
          );
        }

        html[data-fersys-keyboard="open"]
          button[aria-label="Pretraži FERSYS"],
        html[data-fersys-keyboard="open"]
          button[aria-label="Otvori poslovni tok"],
        html[data-fersys-keyboard="open"]
          button[aria-label="Poslovne obavijesti"],
        html[data-fersys-keyboard="open"]
          [data-fersys-floating="daily-brief"],
        html[data-fersys-keyboard="open"]
          [data-fersys-floating="field-mode"],
        html[data-fersys-keyboard="open"]
          [data-fersys-floating="offline-status"] {
          opacity: 0 !important;
          pointer-events: none !important;
          transform: translateY(12px) !important;
          transition:
            opacity 140ms ease,
            transform 140ms ease;
        }

        html[data-fersys-editing="true"]
          [data-fersys-hide-while-editing="true"] {
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .fersys-mobile-sheet {
          padding-bottom:
            max(
              1rem,
              env(safe-area-inset-bottom, 0px)
            );
        }

        .fersys-mobile-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      }

      @media (hover: hover) and (pointer: fine) {
        button,
        a,
        [role="button"] {
          cursor: pointer;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }
      }
    `}</style>
  )
}
