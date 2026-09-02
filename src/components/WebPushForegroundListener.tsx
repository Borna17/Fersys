import { useEffect } from 'react'
import { isNativeApp } from '../lib/platform'

const firebaseConfig = {
  apiKey: 'AIzaSyBM1dPzjGK5cZEv_P5fKGSGMMOZfP22VfQ',
  authDomain: 'fersys-2e3d3.firebaseapp.com',
  projectId: 'fersys-2e3d3',
  storageBucket: 'fersys-2e3d3.firebasestorage.app',
  messagingSenderId: '37815987533',
  appId: '1:37815987533:web:5a39d63f8ada0491175b04',
}

const FIREBASE_SW_SCOPE = '/firebase-cloud-messaging-push-scope/'

export default function WebPushForegroundListener() {
  useEffect(() => {
    if (isNativeApp()) return
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return
    if (typeof Notification === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (Notification.permission !== 'granted') return

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    void (async () => {
      try {
        const [firebaseApp, firebaseMessaging] = await Promise.all([
          import('firebase/app'),
          import('firebase/messaging'),
        ])

        if (cancelled) return

        const app = firebaseApp.getApps().length
          ? firebaseApp.getApp()
          : firebaseApp.initializeApp(firebaseConfig)

        const messaging = firebaseMessaging.getMessaging(app)

        unsubscribe = firebaseMessaging.onMessage(messaging, async (payload) => {
          if (cancelled || Notification.permission !== 'granted') return

          try {
            const registration =
              (await navigator.serviceWorker.getRegistration(FIREBASE_SW_SCOPE)) ??
              (await navigator.serviceWorker.ready)

            const data = payload.data ?? {}
            const title =
              payload.notification?.title ||
              data.title ||
              'FERSYS'
            const body =
              payload.notification?.body ||
              data.body ||
              'Imate novu FERSYS obavijest.'

            await registration.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/notification-badge-96.png',
              tag:
                data.notificationKey ||
                data.tag ||
                `fersys-foreground-${Date.now()}`,
              data: {
                route: data.route || '/dashboard',
                notificationKey: data.notificationKey || '',
                category: data.category || '',
              },
            })
          } catch (error) {
            console.error('Foreground web push prikaz nije uspio:', error)
          }
        })
      } catch (error) {
        console.error('Foreground web push listener nije moguće pokrenuti:', error)
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return null
}
