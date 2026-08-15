import { supabase } from '../lib/supabase'

export type PushRegistrationState =
  | 'unsupported'
  | 'missing-key'
  | 'denied'
  | 'available'
  | 'subscribed'

const firebaseConfig = {
  apiKey:
    'AIzaSyBM1dPzjGK5cZEv_P5fKGSGMMOZfP22VfQ',
  authDomain:
    'fersys-2e3d3.firebaseapp.com',
  projectId:
    'fersys-2e3d3',
  storageBucket:
    'fersys-2e3d3.firebasestorage.app',
  messagingSenderId:
    '37815987533',
  appId:
    '1:37815987533:web:5a39d63f8ada0491175b04',
}

function vapidKey() {
  return String(
    import.meta.env
      .VITE_FIREBASE_VAPID_KEY ??
      '',
  ).trim()
}

function isDesktopViewport() {
  return (
    typeof window !==
      'undefined' &&
    window.matchMedia(
      '(min-width: 768px)',
    ).matches
  )
}

/*
 * Firebase je namjerno dynamic import.
 * Time se Firebase Messaging ne dodaje u početni
 * FERSYS bundle nego se učitava tek kada je push
 * stvarno potreban na mobilnom uređaju.
 */
async function context() {
  if (
    typeof window ===
      'undefined' ||
    typeof navigator ===
      'undefined' ||
    typeof Notification ===
      'undefined'
  ) {
    return null
  }

  /*
   * MobileNotificationBell je CSS-om skriven na desktopu,
   * ali se React komponenta ipak izvršava.
   * Ne želimo zbog toga povlačiti Firebase na desktopu.
   */
  if (
    isDesktopViewport()
  ) {
    return null
  }

  if (
    !(
      'serviceWorker' in
      navigator
    )
  ) {
    return null
  }

  const [
    firebaseApp,
    firebaseMessaging,
  ] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ])

  if (
    !(
      await firebaseMessaging
        .isSupported()
    )
  ) {
    return null
  }

  const firebase =
    firebaseApp.getApps().length
      ? firebaseApp.getApp()
      : firebaseApp.initializeApp(
          firebaseConfig,
        )

  const registration =
    await navigator
      .serviceWorker
      .ready

  return {
    registration,
    messaging:
      firebaseMessaging
        .getMessaging(
          firebase,
        ),
    getToken:
      firebaseMessaging
        .getToken,
    deleteToken:
      firebaseMessaging
        .deleteToken,
  }
}

async function save(
  token: string,
) {
  const { error } =
    await supabase.rpc(
      'register_my_fcm_token',
      {
        requested_token:
          token,
        requested_user_agent:
          navigator.userAgent,
        requested_platform:
          navigator.platform ??
          '',
      },
    )

  if (error) {
    throw error
  }
}

export async function getPushRegistrationState():
Promise<PushRegistrationState> {
  /*
   * Na desktopu bell ionako nije prikazan.
   * Vraćamo unsupported bez učitavanja Firebase paketa.
   */
  if (
    isDesktopViewport()
  ) {
    return 'unsupported'
  }

  const ctx =
    await context()

  if (!ctx) {
    return 'unsupported'
  }

  if (!vapidKey()) {
    return 'missing-key'
  }

  if (
    Notification.permission ===
    'denied'
  ) {
    return 'denied'
  }

  if (
    Notification.permission !==
    'granted'
  ) {
    return 'available'
  }

  const token =
    await ctx.getToken(
      ctx.messaging,
      {
        vapidKey:
          vapidKey(),
        serviceWorkerRegistration:
          ctx.registration,
      },
    )

  if (!token) {
    return 'available'
  }

  await save(token)

  return 'subscribed'
}

export async function enablePushNotifications():
Promise<PushRegistrationState> {
  const ctx =
    await context()

  if (!ctx) {
    return 'unsupported'
  }

  if (!vapidKey()) {
    return 'missing-key'
  }

  let permission =
    Notification.permission

  if (
    permission !==
    'granted'
  ) {
    permission =
      await Notification
        .requestPermission()
  }

  if (
    permission !==
    'granted'
  ) {
    return 'denied'
  }

  const token =
    await ctx.getToken(
      ctx.messaging,
      {
        vapidKey:
          vapidKey(),
        serviceWorkerRegistration:
          ctx.registration,
      },
    )

  if (!token) {
    throw new Error(
      'Firebase nije vratio FCM token za ovaj uređaj.',
    )
  }

  await save(token)

  return 'subscribed'
}

export async function disablePushNotifications() {
  const ctx =
    await context()

  if (
    !ctx ||
    !vapidKey()
  ) {
    return
  }

  const token =
    await ctx.getToken(
      ctx.messaging,
      {
        vapidKey:
          vapidKey(),
        serviceWorkerRegistration:
          ctx.registration,
      },
    )

  if (token) {
    const { error } =
      await supabase.rpc(
        'disable_my_fcm_token',
        {
          requested_token:
            token,
        },
      )

    if (error) {
      throw error
    }
  }

  await ctx.deleteToken(
    ctx.messaging,
  )
}