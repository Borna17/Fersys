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
import FloatingUiLayoutFix from './components/FloatingUiLayoutFix'
import GoogleCalendarOAuthBridge from './components/GoogleCalendarOAuthBridge'
import { isNativeApp } from './lib/platform'
import './index.css'

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

const VideoTutorialCenter =
  lazy(
    () =>
      import(
        './components/VideoTutorialCenter'
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

  useEffect(() => {
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
  }, [])

  if (!ready) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <DownloadFeedbackCenter />
      <MobileNotificationBell />
      <DocumentFlowOrchestrator />
      <FirstTenMinutes />
      <FirstStepsControlCenter />
      <VideoTutorialCenter />
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
      <GoogleCalendarOAuthBridge />

      <DeferredEnhancements />
    </BrowserRouter>
  </StrictMode>,
)
