import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { SplashScreen } from '@capacitor/splash-screen'

import App from './App'
import { isNativeApp } from './lib/platform'
import './index.css'
import './styles/workOrderPdfTotalsFix.css'

const WEB_RECOVERY_KEY = 'fersys_web_recovery_2026_09_12_v1'
const NATIVE_RECOVERY_KEY = 'fersys_native_recovery_1_0_13_v1'

async function clearStaleWebRuntimeCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
  } catch (error) {
    console.warn('FERSYS runtime cache cleanup nije uspio:', error)
  }
}

async function prepareWebRuntime() {
  const native = isNativeApp()
  const recoveryKey = native ? NATIVE_RECOVERY_KEY : WEB_RECOVERY_KEY

  if (window.localStorage.getItem(recoveryKey) === 'done') return true

  const hadServiceWorkerController =
    'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller)

  await clearStaleWebRuntimeCaches()
  window.localStorage.setItem(recoveryKey, 'done')

  // Stariji FERSYS buildovi mogli su ostaviti aktivan service worker u
  // Capacitor WebViewu. Nakon Play Store nadogradnje on može vratiti stari
  // index.html koji pokazuje na JS chunkove kojih više nema, pa korisnik vidi
  // samo tamnu pozadinu. Jedan reload nakon unregistera prebacuje WebView na
  // svježe assete ugrađene u novi APK/AAB.
  if (hadServiceWorkerController) {
    window.location.reload()
    return false
  }

  return true
}

function NativeSplashDismiss() {
  useEffect(() => {
    if (!isNativeApp()) return

    let cancelled = false
    const dismiss = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 180 })
      } catch (error) {
        if (!cancelled) console.warn('Native splash nije moguće sakriti:', error)
      }
    }

    const frame = window.requestAnimationFrame(() => void dismiss())
    const fallback = window.setTimeout(() => void dismiss(), 1200)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(fallback)
    }
  }, [])

  return null
}

function renderApp() {
  const root = document.getElementById('root')
  if (!root) throw new Error('FERSYS root element nije pronađen.')

  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
        <NativeSplashDismiss />
      </BrowserRouter>
    </StrictMode>,
  )
}

void prepareWebRuntime()
  .then((ready) => {
    if (ready) renderApp()
  })
  .catch((error) => {
    // Cache recovery must never be able to block the entire application.
    console.error('FERSYS startup recovery nije uspio:', error)
    renderApp()
  })
