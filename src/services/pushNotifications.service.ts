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

async function getContext() {
  const [
    userResult,
    companyResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc(
      'current_company_id',
    ),
  ])

  if (userResult.error) {
    throw userResult.error
  }

  if (companyResult.error) {
    throw companyResult.error
  }

  if (
    !userResult.data.user
  ) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  if (!companyResult.data) {
    throw new Error(
      'Aktivna tvrtka nije pronađena.',
    )
  }

  return {
    userId:
      userResult.data.user.id,
    companyId:
      String(
        companyResult.data,
      ),
  }
}

async function saveSubscription(
  subscription:
    PushSubscription,
) {
  const {
    userId,
    companyId,
  } =
    await getContext()

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
    await supabase
      .from(
        'push_subscriptions',
      )
      .upsert(
        {
          user_id:
            userId,
          company_id:
            companyId,
          endpoint,
          p256dh,
          auth,
          user_agent:
            navigator.userAgent,
          platform:
            navigator.platform ??
            '',
          active: true,
          last_seen_at:
            new Date()
              .toISOString(),
          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'endpoint',
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

  if (subscription) {
    try {
      await saveSubscription(
        subscription,
      )
    } catch (error) {
      console.error(
        'Postojeći push subscription nije sinkroniziran:',
        error,
      )
    }

    return 'subscribed'
  }

  return 'available'
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

  try {
    await subscription
      .unsubscribe()
  } finally {
    const {
      error,
    } =
      await supabase
        .from(
          'push_subscriptions',
        )
        .update({
          active: false,
          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'endpoint',
          endpoint,
        )

    if (error) {
      throw error
    }
  }
}

