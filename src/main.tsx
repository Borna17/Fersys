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
import AdminTrialMessagePolish from './components/AdminTrialMessagePolish'
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

  let reloadingForUpdate = false
  let activeRegistration:
    ServiceWorkerRegistration | null =
    null

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

        activeRegistration =
          registration

        // Provjeri novu verziju odmah nakon pokretanja aplikacije.
        void registration.update()

        window.setTimeout(
          () => {
            void registration.update()
          },
          1_500,
        )

        // Dok je aplikacija otvorena provjeravaj deploy svakih 5 min.
        window.setInterval(
          () => {
            void registration.update()
          },
          5 * 60 * 1000,
        )
      },

      onNeedRefresh() {
        // Vite PWA aktivira novi SW bez pitanja korisnika.
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

  // Čim novi service worker preuzme kontrolu, jednom ponovno
  // učitaj aplikaciju kako bi korisnik odmah dobio novi deploy.
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      if (reloadingForUpdate) {
        return
      }

      reloadingForUpdate = true
      window.location.reload()
    },
  )

  const checkForUpdate = () => {
    if (
      document.visibilityState !==
        'visible' ||
      !navigator.onLine
    ) {
      return
    }

    if (activeRegistration) {
      void activeRegistration.update()
      return
    }

    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (registration) {
          activeRegistration =
            registration
          return registration.update()
        }

        return undefined
      })
  }

  // Ako se korisnik vrati u FERSYS nakon što je u međuvremenu
  // napravljen novi Vercel deploy, odmah provjeri novu verziju.
  window.addEventListener(
    'focus',
    checkForUpdate,
  )

  window.addEventListener(
    'online',
    checkForUpdate,
  )

  document.addEventListener(
    'visibilitychange',
    checkForUpdate,
  )
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
      <AdminTrialMessagePolish />

      <FloatingUiLayoutFix />
      <DeliveryNoteMobileLayoutFix />
      <GoogleCalendarOAuthBridge />

      <DeferredEnhancements />
    </BrowserRouter>
  </StrictMode>,
)
