import { getApp, getApps, initializeApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { supabase } from '../lib/supabase'

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

function app() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

function vapidKey() {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '').trim()
}

async function context() {
  if (!(await isSupported()) || !('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.ready
  return {
    registration,
    messaging: getMessaging(app()),
  }
}

async function save(token: string) {
  const { error } = await supabase.rpc('register_my_fcm_token', {
    requested_token: token,
    requested_user_agent: navigator.userAgent,
    requested_platform: navigator.platform ?? '',
  })
  if (error) throw error
}

export async function getPushRegistrationState(): Promise<PushRegistrationState> {
  const ctx = await context()
  if (!ctx) return 'unsupported'
  if (!vapidKey()) return 'missing-key'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'available'

  const token = await getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })

  if (!token) return 'available'
  await save(token)
  return 'subscribed'
}

export async function enablePushNotifications(): Promise<PushRegistrationState> {
  const ctx = await context()
  if (!ctx) return 'unsupported'
  if (!vapidKey()) return 'missing-key'

  let permission = Notification.permission
  if (permission !== 'granted') permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const token = await getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })

  if (!token) throw new Error('Firebase nije vratio FCM token za ovaj uređaj.')
  await save(token)
  return 'subscribed'
}

export async function disablePushNotifications() {
  const ctx = await context()
  if (!ctx || !vapidKey()) return

  const token = await getToken(ctx.messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: ctx.registration,
  })

  if (token) {
    const { error } = await supabase.rpc('disable_my_fcm_token', {
      requested_token: token,
    })
    if (error) throw error
  }

  await deleteToken(ctx.messaging)
}
