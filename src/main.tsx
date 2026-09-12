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
import { SplashScreen } from '@capacitor/splash-screen'

import App from './App'
import ActivityTracker from './components/ActivityTracker'
import AppLanguageRuntime from './components/AppLanguageRuntime'
import FieldTodayPanel from './components/FieldTodayPanel'
import FersysLoader from './components/FersysLoader'
import OfflineReadyNotice from './components/OfflineReadyNotice'
import AdminTrialMessagePolish from './components/AdminTrialMessagePolish'
import ConnectionStatusNotice from './components/ConnectionStatusNotice'
import DeliveryNoteMobileLayoutFix from './components/DeliveryNoteMobileLayoutFix'
import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import FloatingUiLayoutFix from './components/FloatingUiLayoutFix'
import GoogleCalendarOAuthBridge from './components/GoogleCalendarOAuthBridge'
import IncomingInvoicesDatabaseBridge from './components/IncomingInvoicesDatabaseBridge'
import WorkOrderEditQuantityTextFix from './components/WorkOrderEditQuantityTextFix'
import { isNativeApp } from './lib/platform'
import './index.css'
import './styles/workOrderPdfTotalsFix.css'

const DocumentFlowOrchestrator = lazy(() => import('./components/DocumentFlowOrchestrator'))
const FirstTenMinutes = lazy(() => import('./components/FirstTenMinutes'))
const FirstStepsControlCenter = lazy(() => import('./components/FirstStepsControlCenter'))

function registerWebServiceWorker() {
  if (isNativeApp()) return

  let reloadingForUpdate = false
  let activeRegistration: ServiceWorkerRegistration | null = null

  const updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_serviceWorkerUrl, registration) {
      if (!registration) return
      activeRegistration = registration
      void registration.update()
      window.setInterval(() => void registration.update(), 30 * 60 * 1000)
    },
    onNeedRefresh() {
      void updateServiceWorker(true)
    },
    onRegisterError(error) {
      console.error('FERSYS PWA service worker nije registriran:', error)
    },
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return
    reloadingForUpdate = true
    window.location.reload()
  })

  let lastUpdateCheckAt = 0

  const checkForUpdate = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return

    const now = Date.now()
    if (now - lastUpdateCheckAt < 60_000) return
    lastUpdateCheckAt = now

    if (activeRegistration) {
      void activeRegistration.update()
      return
    }
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        activeRegistration = registration
        return registration.update()
      }
      return undefined
    })
  }

  window.addEventListener('focus', checkForUpdate)
  window.addEventListener('online', checkForUpdate)
  document.addEventListener('visibilitychange', checkForUpdate)
}

registerWebServiceWorker()

function NativeStartupLoader() {
  const [visible, setVisible] = useState(() => isNativeApp())

  useEffect(() => {
    if (!isNativeApp()) return

    let cancelled = false
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 180 })
      } catch (error) {
        console.warn('Native splash nije moguće sakriti:', error)
      }
    }

    const nativeTimer = window.setTimeout(() => {
      if (!cancelled) void hideNativeSplash()
    }, 250)

    const loaderTimer = window.setTimeout(() => {
      if (!cancelled) setVisible(false)
    }, 1100)

    return () => {
      cancelled = true
      window.clearTimeout(nativeTimer)
      window.clearTimeout(loaderTimer)
    }
  }, [])

  if (!visible) return null
  return <FersysLoader fullScreen text="FERSYS se učitava..." />
}

function DeferredEnhancements() {
  const [ready, setReady] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setReady(false)
      return
    }

    const timer = window.setTimeout(() => setReady(true), 1_200)
    return () => window.clearTimeout(timer)
  }, [isMobile])

  return (
    <Suspense fallback={null}>
      {!isMobile && ready && (
        <>
          <DocumentFlowOrchestrator />
          <FirstTenMinutes />
          <FirstStepsControlCenter />
        </>
      )}
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <NativeStartupLoader />
      <AppLanguageRuntime />
      <FieldTodayPanel />
      <OfflineReadyNotice />
      <ActivityTracker />
      <AdminTrialMessagePolish />
      <ConnectionStatusNotice />
      <IncomingInvoicesDatabaseBridge />
      <FloatingUiLayoutFix />
      <WorkOrderEditQuantityTextFix />
      <DeliveryNoteMobileLayoutFix />
      <GoogleCalendarOAuthBridge />
      <DownloadFeedbackCenter />
      <DeferredEnhancements />
    </BrowserRouter>
  </StrictMode>,
)
