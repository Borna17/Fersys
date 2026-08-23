import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function isAndroidApp() {
  return Capacitor.getPlatform() === 'android'
}

export function isIosApp() {
  return Capacitor.getPlatform() === 'ios'
}

export function isWebApp() {
  return Capacitor.getPlatform() === 'web'
}
