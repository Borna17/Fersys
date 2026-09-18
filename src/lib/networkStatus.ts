import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

let nativeConnected: boolean | null = null
let initialized = false

export function isNetworkOnline(): boolean {
  if (!Capacitor.isNativePlatform()) return navigator.onLine
  // Android WebView's navigator.onLine can report a false negative during
  // startup. Until the native Network plugin answers, prefer a real request.
  return nativeConnected ?? true
}

function publish(connected: boolean) {
  const previous = nativeConnected
  nativeConnected = connected
  if (previous === connected) return

  window.dispatchEvent(new Event(connected ? 'online' : 'offline'))
  window.dispatchEvent(new CustomEvent('fersys:network-status', {
    detail: { connected },
  }))
}

export async function initializeNetworkStatus(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return
  initialized = true

  try {
    const status = await Network.getStatus()
    nativeConnected = status.connected
    await Network.addListener('networkStatusChange', (next) => {
      publish(next.connected)
    })
  } catch (error) {
    // Do not lock the native app into offline mode if the plugin itself fails.
    nativeConnected = null
    console.warn('[FERSYS] Native network status nije dostupan:', error)
  }
}
