import { Component, StrictMode, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { SplashScreen } from '@capacitor/splash-screen'

import App from './App'
import { isNativeApp } from './lib/platform'
import { initializeNetworkStatus } from './lib/networkStatus'
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
      await Promise.all(cacheNames.filter((name) => name.startsWith('fersys-') || name.startsWith('workbox-')).map((name) => caches.delete(name)))
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

function showFatalStartup(error: unknown) {
  const root = document.getElementById('root')
  if (!root) return
  const message = error instanceof Error ? error.message : String(error || 'Nepoznata greška')
  root.innerHTML = `<main style="min-height:100vh;background:#020617;color:white;display:grid;place-items:center;padding:24px;font-family:system-ui"><section style="max-width:560px;text-align:center"><h1 style="font-size:24px">FERSYS se nije uspio pokrenuti</h1><p style="color:#94a3b8;line-height:1.6">Aplikacija je zaustavljena prije učitavanja sučelja. Zatvori je i pokušaj ponovno. Ako se problem ponovi, pošalji podršci kod ispod.</p><code style="display:block;margin-top:16px;padding:12px;background:#0f172a;border-radius:12px;word-break:break-word">${message.replace(/[<>&]/g, '')}</code></section></main>`
  void SplashScreen.hide().catch(() => undefined)
}

class StartupErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[FERSYS] React startup crash', error, info) }
  render() {
    if (this.state.error) {
      return <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-white"><section className="w-full max-w-xl text-center"><h1 className="text-2xl font-black">FERSYS se nije uspio učitati</h1><p className="mt-3 text-sm text-slate-400">Zatvori aplikaciju i pokušaj ponovno. Podaci na uređaju nisu obrisani.</p><code className="mt-5 block break-words rounded-xl bg-slate-900 p-3 text-xs text-red-200">{this.state.error.message}</code></section></main>
    }
    return this.props.children
  }
}

function NativeSplashDismiss() {
  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    const dismiss = async () => {
      try { await SplashScreen.hide({ fadeOutDuration: 180 }) }
      catch (error) { if (!cancelled) console.warn('Native splash nije moguće sakriti:', error) }
    }
    const frame = window.requestAnimationFrame(() => void dismiss())
    const fallback = window.setTimeout(() => void dismiss(), 1200)
    return () => { cancelled = true; window.cancelAnimationFrame(frame); window.clearTimeout(fallback) }
  }, [])
  return null
}

function renderApp() {
  const root = document.getElementById('root')
  if (!root) throw new Error('FERSYS root element nije pronađen.')
  createRoot(root).render(
    <StrictMode>
      <StartupErrorBoundary>
        <BrowserRouter>
          <App />
          <NativeSplashDismiss />
        </BrowserRouter>
      </StartupErrorBoundary>
    </StrictMode>,
  )
}

window.addEventListener('error', (event) => {
  console.error('[FERSYS] Global startup error', event.error || event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('[FERSYS] Unhandled startup rejection', event.reason)
})

void (async () => {
  await initializeNetworkStatus()
  const ready = await prepareWebRuntime()
  if (ready) renderApp()
})().catch(showFatalStartup)
