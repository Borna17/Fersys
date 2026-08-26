import {
  StrictMode,
  Suspense,
  lazy,
  useEffect,
  useState,
} from 'react'
import {
  createRoot,
} from 'react-dom/client'
import {
  BrowserRouter,
} from 'react-router'
import {
  registerSW,
} from 'virtual:pwa-register'

import App from './App'
import ActivityTracker from './components/ActivityTracker'
import DeliveryNoteMobileLayoutFix from './components/DeliveryNoteMobileLayoutFix'
import FloatingUiLayoutFix from './components/FloatingUiLayoutFix'
import GoogleCalendarOAuthBridge from './components/GoogleCalendarOAuthBridge'
import { isNativeApp } from './lib/platform'
import './index.css'
import './styles/workOrderPdfTotalsFix.css'

const DownloadFeedbackCenter =
  lazy(
    () =>
      import(
        './components/DownloadFeedbackCenter'
      ),
  )

const MobileNotificationBell =
  lazy(
    () =>
      import(
        './components/MobileNotificationBell'
      ),
  )

const DocumentFlowOrchestrator =
  lazy(
    () =>
      import(
        './components/DocumentFlowOrchestrator'
      ),
  )

const FirstTenMinutes =
  lazy(
    () =>
      import(
        './components/FirstTenMinutes'
      ),
  )

const FirstStepsControlCenter =
  lazy(
    () =>
      import(
        './components/FirstStepsControlCenter'
      ),
  )

function registerWebServiceWorker() {
  if (
    isNativeApp()
  ) {
    return
  }

  const updateServiceWorker =
    registerSW({
      immediate: true,

      onRegisteredSW(
        _serviceWorkerUrl,
        registration,
      ) {
        if (!registration) {
          return
        }

        window.setTimeout(
          () => {
            void registration.update()
          },
          2_500,
        )

        window.setInterval(
          () => {
            void registration.update()
          },
          60 * 60 * 1000,
        )
      },

      onNeedRefresh() {
        void updateServiceWorker(
          true,
        )
      },

      onRegisterError(
        error,
      ) {
        console.error(
          'FERSYS PWA service worker nije registriran:',
          error,
        )
      },
    })
}

registerWebServiceWorker()

function DeferredEnhancements() {
  const [
    ready,
    setReady,
  ] =
    useState(false)

  const [
    isMobile,
    setIsMobile,
  ] =
    useState(() =>
      window.matchMedia(
        '(max-width: 767px)',
      ).matches,
    )

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        '(max-width: 767px)',
      )

    const handleChange = () => {
      setIsMobile(
        mediaQuery.matches,
      )
    }

    handleChange()

    mediaQuery.addEventListener(
      'change',
      handleChange,
    )

    return () => {
      mediaQuery.removeEventListener(
        'change',
        handleChange,
      )
    }
  }, [])

  useEffect(() => {
    if (isMobile) {
      setReady(false)
      return
    }

    const timer =
      window.setTimeout(
        () => {
          setReady(true)
        },
        1_200,
      )

    return () => {
      window.clearTimeout(
        timer,
      )
    }
  }, [isMobile])

  if (
    isMobile ||
    !ready
  ) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <DownloadFeedbackCenter />
      <MobileNotificationBell />
      <DocumentFlowOrchestrator />
      <FirstTenMinutes />
      <FirstStepsControlCenter />
    </Suspense>
  )
}

createRoot(
  document.getElementById(
    'root',
  )!,
).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <ActivityTracker />

      <FloatingUiLayoutFix />
      <DeliveryNoteMobileLayoutFix />
      <GoogleCalendarOAuthBridge />

      <DeferredEnhancements />
    </BrowserRouter>
  </StrictMode>,
)
