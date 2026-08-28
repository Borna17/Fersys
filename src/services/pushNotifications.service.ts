import { supabase } from '../lib/supabase'
import { isNativeApp } from '../lib/platform'

export type PushRegistrationState =
  | 'unsupported'
  | 'missing-key'
  | 'denied'
  | 'available'
  | 'subscribed'

const firebaseConfig = {
  apiKey: 'AIzaSyBM1dPzjGK5cZEv_P5fKGSGMMOZfP22VfQ',
  authDomain: 'fersys-2e3d3.firebaseapp.com',
  projectId: 'fersys-2e3d3',
  storageBucket: 'fersys-2e3d3.firebasestorage.app',
  messagingSenderId: '37815987533',
  appId: '1:37815987533:web:5a39d63f8ada0491175b04',
}

const NATIVE_TOKEN_KEY = 'fersys_native_push_token'
const FIREBASE_SW_SCOPE = '/firebase-cloud-messaging-push-scope/'

function vapidKey() {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '').trim()
}

function isDesktopViewport() {
  return typeof window !== 'undefined' && !isNativeApp() && window.matchMedia('(min-width: 768px)').matches
}

async function save(token: string) {
  const { error } = await supabase.rpc('register_my_fcm_token', {
    requested_token: token,
    requested_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'FERSYS Native',
    requested_platform: typeof navigator !== 'undefined' ? navigator.platform ?? '' : 'native',
  })
  if (error) throw error
}

async function disableSavedToken(token: string) {
  const { error } = await supabase.rpc('disable_my_fcm_token', { requested_token: token })
  if (error) throw error
}

async function nativePermissionState(): Promise<PushRegistrationState> {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const permission = await PushNotifications.checkPermissions()
  if (permission.receive === 'denied') return 'denied'
  if (permission.receive !== 'granted') return 'available'
  const stored = localStorage.getItem(NATIVE_TOKEN_KEY)
  if (!stored) return 'available'
  await save(stored)
  return 'subscribed'
}

async function registerNativeToken(): Promise<string> {
  const { PushNotifications } = await import('@capacitor/push-notifications')

  return new Promise<string>(async (resolve, reject) => {
    let settled = false
    const registrationListener = await PushNotifications.addListener('registration', (token) => {
      if (settled) return
      settled = true
      resolve(token.value)
    })
    const errorListener = await PushNotifications.addListener('registrationError', (error) => {
      if (settled) return
      settled = true
      reject(new Error(error.error || 'Android nije vratio push token.'))
    })
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('Registracija obavijesti traje predugo. Pokušaj ponovno.'))
    }, 15000)

    try {
      await PushNotifications.register()
    } catch (error) {
      if (!settled) {
        settled = true
        reject(error)
      }
    } finally {
      void Promise.resolve().then(async () => {
        while (!settled) await new Promise((done) => window.setTimeout(done, 100))
        window.clearTimeout(timer)
        await registrationListener.remove()
        await errorListener.remove()
      })
    }
  })
}

async function enableNativePush(): Promise<PushRegistrationState> {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  let permission = await PushNotifications.checkPermissions()
  if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return 'denied'

  const token = await registerNativeToken()
  if (!token) throw new Error('Android nije vratio FCM token za ovaj uređaj.')
  localStorage.setItem(NATIVE_TOKEN_KEY, token)
  await save(token)
  return 'subscribed'
}

async function getFirebaseMessagingRegistration() {
  const existing = await navigator.serviceWorker.getRegistration(FIREBASE_SW_SCOPE)
  if (existing) {
    await existing.update().catch(() => undefined)
    return existing
  }

  return navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: FIREBASE_SW_SCOPE,
    updateViaCache: 'none',
  })
}

async function webContext() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || typeof Notification === 'undefined') return null
  if (isDesktopViewport()) return null
  if (!('serviceWorker' in navigator)) return null

  const [firebaseApp, firebaseMessaging] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])
  if (!(await firebaseMessaging.isSupported())) return null

  const firebase = firebaseApp.getApps().length
    ? firebaseApp.getApp()
    : firebaseApp.initializeApp(firebaseConfig)

  const registration = await getFirebaseMessagingRegistration()
  await navigator.serviceWorker.ready.catch(() => undefined)

  return {
    registration,
    messaging: firebaseMessaging.getMessaging(firebase),
    getToken: firebaseMessaging.getToken,
    deleteToken: firebaseMessaging.deleteToken,
  }
}

export async function getPushRegistrationState(): Promise<PushRegistrationState> {
  if (isNativeApp()) return nativePermissionState()
  if (isDesktopViewport()) return 'unsupported'
  const ctx = await webContext()
  if (!ctx) return 'unsupported'
  if (!vapidKey()) return 'missing-key'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'available'

  const token = await ctx.getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })
  if (!token) return 'available'
  await save(token)
  return 'subscribed'
}

export async function enablePushNotifications(): Promise<PushRegistrationState> {
  if (isNativeApp()) return enableNativePush()
  const ctx = await webContext()
  if (!ctx) return 'unsupported'
  if (!vapidKey()) return 'missing-key'

  let permission = Notification.permission
  if (permission !== 'granted') permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const token = await ctx.getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })
  if (!token) throw new Error('Firebase nije vratio FCM token za ovaj uređaj.')
  await save(token)
  return 'subscribed'
}

export async function disablePushNotifications() {
  if (isNativeApp()) {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const token = localStorage.getItem(NATIVE_TOKEN_KEY)
    if (token) await disableSavedToken(token)
    localStorage.removeItem(NATIVE_TOKEN_KEY)
    await PushNotifications.unregister()
    return
  }

  const ctx = await webContext()
  if (!ctx || !vapidKey()) return
  const token = await ctx.getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })
  if (token) await disableSavedToken(token)
  await ctx.deleteToken(ctx.messaging)
}
