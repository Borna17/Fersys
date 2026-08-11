import { supabase } from '../lib/supabase'

export type PushRegistrationState =
  | 'unsupported'
  | 'missing-key'
  | 'denied'
  | 'available'
  | 'subscribed'

function urlBase64ToUint8Array(
  value: string,
) {
  const padding =
    '='.repeat(
      (4 -
        (value.length % 4)) %
        4,
    )

  const base64 =
    (value + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

  const raw =
    window.atob(base64)

  return Uint8Array.from(
    raw,
    (char) =>
      char.charCodeAt(0),
  )
}

function getVapidPublicKey() {
  return String(
    import.meta.env
      .VITE_VAPID_PUBLIC_KEY ??
      '',
  ).trim()
}

function supportsWebPush() {
  return (
    typeof window !==
      'undefined' &&
    'serviceWorker' in
      navigator &&
    'PushManager' in
      window &&
    typeof Notification !==
      'undefined'
  )
}

async function saveSubscription(
  subscription:
    PushSubscription,
) {
  const json =
    subscription.toJSON()

  const endpoint =
    subscription.endpoint

  const p256dh =
    json.keys?.p256dh ?? ''

  const auth =
    json.keys?.auth ?? ''

  if (
    !endpoint ||
    !p256dh ||
    !auth
  ) {
    throw new Error(
      'Push subscription nije potpuna.',
    )
  }

  const {
    error,
  } =
    await supabase.rpc(
      'register_my_push_subscription',
      {
        requested_endpoint:
          endpoint,
        requested_p256dh:
          p256dh,
        requested_auth:
          auth,
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

export async function
getPushRegistrationState():
Promise<PushRegistrationState> {
  if (!supportsWebPush()) {
    return 'unsupported'
  }

  if (
    !getVapidPublicKey()
  ) {
    return 'missing-key'
  }

  if (
    Notification.permission ===
    'denied'
  ) {
    return 'denied'
  }

  const registration =
    await navigator
      .serviceWorker
      .ready

  const subscription =
    await registration
      .pushManager
      .getSubscription()

  if (!subscription) {
    return 'available'
  }

  await saveSubscription(
    subscription,
  )

  return 'subscribed'
}

export async function
enablePushNotifications():
Promise<PushRegistrationState> {
  if (!supportsWebPush()) {
    return 'unsupported'
  }

  const vapidPublicKey =
    getVapidPublicKey()

  if (!vapidPublicKey) {
    return 'missing-key'
  }

  let permission =
    Notification.permission

  if (
    permission ===
    'default'
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

  const registration =
    await navigator
      .serviceWorker
      .ready

  let subscription =
    await registration
      .pushManager
      .getSubscription()

  if (!subscription) {
    subscription =
      await registration
        .pushManager
        .subscribe({
          userVisibleOnly:
            true,
          applicationServerKey:
            urlBase64ToUint8Array(
              vapidPublicKey,
            ),
        })
  }

  await saveSubscription(
    subscription,
  )

  return 'subscribed'
}

export async function
disablePushNotifications() {
  if (!supportsWebPush()) {
    return
  }

  const registration =
    await navigator
      .serviceWorker
      .ready

  const subscription =
    await registration
      .pushManager
      .getSubscription()

  if (!subscription) {
    return
  }

  const endpoint =
    subscription.endpoint

  const {
    error,
  } =
    await supabase.rpc(
      'disable_my_push_subscription',
      {
        requested_endpoint:
          endpoint,
      },
    )

  if (error) {
    throw error
  }

  await subscription
    .unsubscribe()
}
