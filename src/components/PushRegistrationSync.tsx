import { useEffect } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { isNativeApp } from '../lib/platform'
import { enablePushNotifications } from '../services/pushNotifications.service'

export default function PushRegistrationSync() {
  const { session } = useAuth()

  useEffect(() => {
    if (!session?.user.id || !isNativeApp()) return

    let cancelled = false

    void (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const permission = await PushNotifications.checkPermissions()

        if (cancelled || permission.receive !== 'granted') return

        await enablePushNotifications()
      } catch (error) {
        console.warn('[FERSYS] Native push token refresh failed', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [session?.user.id])

  return null
}
