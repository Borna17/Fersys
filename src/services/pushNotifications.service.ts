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
let enablePromise: Promise<PushRegistrationState> | null = null

function vapidKey() {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '').trim()
}

function webPushBasicsAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

function readableError(value: unknown) {
  if (value instanceof Error && value.message) return value.message
  if (typeof value === 'string' && value.trim()) return value
  return 'Nepoznata pogreška.'
}

async function save(token: string) {
  const { error } = await supabase.rpc('register_my_fcm_token', {
    requested_token: token,
    requested_user_agent:
      typeof navigator !== 'undefined'
        ? navigator.userAgent
        : 'FERSYS Native',
    requested_platform:
      typeof navigator !== 'undefined'
        ? navigator.platform ?? ''
        : 'native',
  })

  if (error) throw error
}

async function disableSavedToken(token: string) {
  const { error } = await supabase.rpc('disable_my_fcm_token', {
    requested_token: token,
  })

  if (error) throw error
}

async function ensureNativeChannel() {
  const { PushNotifications } = await import(
    '@capacitor/push-notifications'
  )

  if ('createChannel' in PushNotifications) {
    await PushNotifications.createChannel({
      id: 'fersys_default',
      name: 'FERSYS obavijesti',
      description:
        'Radni nalozi, poslovne obavijesti i vremenska prognoza',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    })
  }
}

async function nativePermissionState(): Promise<PushRegistrationState> {
  const { PushNotifications } = await import(
    '@capacitor/push-notifications'
  )

  const permission = await PushNotifications.checkPermissions()

  if (permission.receive === 'denied') return 'denied'
  if (permission.receive !== 'granted') return 'available'

  await ensureNativeChannel()

  const stored = localStorage.getItem(NATIVE_TOKEN_KEY)
  if (!stored) return 'available'

  await save(stored)
  return 'subscribed'
}

async function registerNativeToken(): Promise<string> {
  const { PushNotifications } = await import(
    '@capacitor/push-notifications'
  )

  let resolveToken!: (token: string) => void
  let rejectToken!: (error: Error) => void
  let settled = false

  const tokenPromise = new Promise<string>((resolve, reject) => {
    resolveToken = resolve
    rejectToken = reject
  })

  const registrationListener = await PushNotifications.addListener(
    'registration',
    (token) => {
      if (settled) return
      settled = true
      resolveToken(token.value)
    },
  )

  const errorListener = await PushNotifications.addListener(
    'registrationError',
    (registrationError) => {
      if (settled) return
      settled = true
      rejectToken(
        new Error(
          registrationError.error ||
            'Uređaj nije vratio push token.',
        ),
      )
    },
  )

  const timer = window.setTimeout(() => {
    if (settled) return
    settled = true
    rejectToken(
      new Error(
        'Registracija obavijesti traje predugo. Pokušaj ponovno.',
      ),
    )
  }, 15000)

  try {
    await PushNotifications.register()
    const token = await tokenPromise
    localStorage.setItem(NATIVE_TOKEN_KEY, token)
    return token
  } finally {
    window.clearTimeout(timer)
    await Promise.allSettled([
      registrationListener.remove(),
      errorListener.remove(),
    ])
  }
}

async function enableNativePush(): Promise<PushRegistrationState> {
  const { PushNotifications } = await import(
    '@capacitor/push-notifications'
  )

  let permission = await PushNotifications.checkPermissions()

  if (permission.receive !== 'granted') {
    permission = await PushNotifications.requestPermissions()
  }

  if (permission.receive !== 'granted') return 'denied'

  await ensureNativeChannel()

  const stored = localStorage.getItem(NATIVE_TOKEN_KEY)
  if (stored) {
    await save(stored)
    return 'subscribed'
  }

  const token = await registerNativeToken()

  if (!token) {
    throw new Error('Uređaj nije vratio FCM token.')
  }

  await save(token)
  return 'subscribed'
}

async function getFirebaseMessagingRegistration() {
  const existing = await navigator.serviceWorker.getRegistration(
    FIREBASE_SW_SCOPE,
  )

  if (existing) {
    await existing.update().catch(() => undefined)
    return existing
  }

  return navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    {
      scope: FIREBASE_SW_SCOPE,
      updateViaCache: 'none',
    },
  )
}

async function webContext() {
  if (!webPushBasicsAvailable()) return null

  const [firebaseApp, firebaseMessaging] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])

  const firebase = firebaseApp.getApps().length
    ? firebaseApp.getApp()
    : firebaseApp.initializeApp(firebaseConfig)

  const registration = await getFirebaseMessagingRegistration()

  return {
    registration,
    messaging: firebaseMessaging.getMessaging(firebase),
    getToken: firebaseMessaging.getToken,
    deleteToken: firebaseMessaging.deleteToken,
  }
}

async function getWebToken() {
  const ctx = await webContext()
  if (!ctx) return null

  return ctx.getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })
}

export async function getPushRegistrationState(): Promise<PushRegistrationState> {
  if (isNativeApp()) return nativePermissionState()
  if (!webPushBasicsAvailable()) return 'unsupported'
  if (!vapidKey()) return 'missing-key'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'available'

  try {
    const token = await getWebToken()
    if (!token) return 'available'
    await save(token)
    return 'subscribed'
  } catch (error) {
    console.error('Provjera web push registracije nije uspjela:', error)
    return 'available'
  }
}

async function doEnablePushNotifications(): Promise<PushRegistrationState> {
  if (isNativeApp()) return enableNativePush()
  if (!webPushBasicsAvailable()) return 'unsupported'
  if (!vapidKey()) return 'missing-key'

  let permission = Notification.permission

  if (permission !== 'granted') {
    permission = await Notification.requestPermission()
  }

  if (permission !== 'granted') return 'denied'

  try {
    const token = await getWebToken()

    if (!token) {
      throw new Error('Firebase nije vratio FCM token za ovaj uređaj.')
    }

    await save(token)
    return 'subscribed'
  } catch (error) {
    console.error('Web push registracija nije uspjela:', error)
    throw new Error(
      `Registracija push obavijesti nije uspjela: ${readableError(error)}`,
    )
  }
}

export async function enablePushNotifications(): Promise<PushRegistrationState> {
  if (enablePromise) return enablePromise

  enablePromise = doEnablePushNotifications().finally(() => {
    enablePromise = null
  })

  return enablePromise
}

export async function disablePushNotifications() {
  if (isNativeApp()) {
    const { PushNotifications } = await import(
      '@capacitor/push-notifications'
    )

    const token = localStorage.getItem(NATIVE_TOKEN_KEY)

    if (token) await disableSavedToken(token)

    localStorage.removeItem(NATIVE_TOKEN_KEY)
    await PushNotifications.unregister()
    return
  }

  if (!webPushBasicsAvailable() || !vapidKey()) return
  if (Notification.permission !== 'granted') return

  try {
    const ctx = await webContext()
    if (!ctx) return

    const token = await ctx.getToken(ctx.messaging, {
      vapidKey: vapidKey(),
      serviceWorkerRegistration: ctx.registration,
    })

    if (token) await disableSavedToken(token)
    await ctx.deleteToken(ctx.messaging)
  } catch (error) {
    console.error('Web push odjava nije uspjela:', error)
  }
}
