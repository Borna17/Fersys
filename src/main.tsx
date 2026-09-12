import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { SplashScreen } from '@capacitor/splash-screen'

import App from './App'
import { isNativeApp } from './lib/platform'
import './index.css'
import './styles/workOrderPdfTotalsFix.css'

const WEB_RECOVERY_KEY = 'fersys_web_recovery_2026_09_12_v1'

async function prepareWebRuntime() {
  if (isNativeApp()) return true
  if (window.localStorage.getItem(WEB_RECOVERY_KEY) === 'done') return true

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('fersys-') || name.startsWith('workbox-'))
          .map((name) => caches.delete(name)),
      )
    }
  } catch (error) {
    console.warn('FERSYS web cache cleanup nije uspio:', error)
  }

  window.localStorage.setItem(WEB_RECOVERY_KEY, 'done')

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
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

void prepareWebRuntime().then((ready) => {
  if (ready) renderApp()
})
