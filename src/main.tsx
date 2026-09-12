import {
  Component,
  StrictMode,
  Suspense,
  lazy,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { SplashScreen } from '@capacitor/splash-screen'

import App from './App'
import AppLanguageRuntime from './components/AppLanguageRuntime'
import FersysLoader from './components/FersysLoader'
import { isNativeApp } from './lib/platform'
import './index.css'
import './styles/workOrderPdfTotalsFix.css'

const ActivityTracker = lazy(() => import('./components/ActivityTracker'))
const FieldTodayPanel = lazy(() => import('./components/FieldTodayPanel'))
const OfflineReadyNotice = lazy(() => import('./components/OfflineReadyNotice'))
const AdminTrialMessagePolish = lazy(() => import('./components/AdminTrialMessagePolish'))
const ConnectionStatusNotice = lazy(() => import('./components/ConnectionStatusNotice'))
const DeliveryNoteMobileLayoutFix = lazy(() => import('./components/DeliveryNoteMobileLayoutFix'))
const DownloadFeedbackCenter = lazy(() => import('./components/DownloadFeedbackCenter'))
const FloatingUiLayoutFix = lazy(() => import('./components/FloatingUiLayoutFix'))
const GoogleCalendarOAuthBridge = lazy(() => import('./components/GoogleCalendarOAuthBridge'))
const IncomingInvoicesDatabaseBridge = lazy(() => import('./components/IncomingInvoicesDatabaseBridge'))
const WorkOrderEditQuantityTextFix = lazy(() => import('./components/WorkOrderEditQuantityTextFix'))
const DocumentFlowOrchestrator = lazy(() => import('./components/DocumentFlowOrchestrator'))
const FirstTenMinutes = lazy(() => import('./components/FirstTenMinutes'))
const FirstStepsControlCenter = lazy(() => import('./components/FirstStepsControlCenter'))

async function registerWebServiceWorker() {
  if (isNativeApp()) return
  if (!('serviceWorker' in navigator)) return

  try {
    const { registerSW } = await import('virtual:pwa-register')

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
  } catch (error) {
    console.error('FERSYS PWA runtime nije moguće pokrenuti:', error)
  }
}

void registerWebServiceWorker()

function NativeSplashDismiss() {
  useEffect(() => {
    if (!isNativeApp()) return

    let stopped = false
    const dismiss = async () => {
      try {
        await SplashScreen.hide()
      } catch (error) {
        if (!stopped) console.warn('Native splash nije moguće sakriti:', error)
      }
    }

    const frame = window.requestAnimationFrame(() => void dismiss())
    const fallback = window.setTimeout(() => void dismiss(), 1200)

    return () => {
      stopped = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(fallback)
    }
  }, [])

  return null
}

class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FERSYS startup error]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-5 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-slate-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">FERSYS STARTUP</p>
          <h1 className="mt-3 text-xl font-black">Aplikacija se nije mogla pokrenuti</h1>
          <p className="mt-3 break-words text-sm leading-6 text-slate-300">
            {this.state.error.message || 'Nepoznata JavaScript greška.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 min-h-11 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white"
          >
            Pokušaj ponovno
          </button>
        </section>
      </main>
    )
  }
}

function DeferredWebEnhancements() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isNativeApp()) return
    const timer = window.setTimeout(() => setReady(true), 1000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready || isNativeApp()) return null

  return (
    <Suspense fallback={null}>
      <ActivityTracker />
      <FieldTodayPanel />
      <OfflineReadyNotice />
      <AdminTrialMessagePolish />
      <ConnectionStatusNotice />
      <IncomingInvoicesDatabaseBridge />
      <FloatingUiLayoutFix />
      <WorkOrderEditQuantityTextFix />
      <DeliveryNoteMobileLayoutFix />
      <GoogleCalendarOAuthBridge />
      <DownloadFeedbackCenter />
      <DocumentFlowOrchestrator />
      <FirstTenMinutes />
      <FirstStepsControlCenter />
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<FersysLoader fullScreen text="Pokretanje FERSYS-a..." />}>
          <App />
          <NativeSplashDismiss />
          <AppLanguageRuntime />
          <DeferredWebEnhancements />
        </Suspense>
      </BrowserRouter>
    </StartupErrorBoundary>
  </StrictMode>,
)
