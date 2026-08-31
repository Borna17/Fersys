import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export default function PushRegistrationSync() {
  const { user, membership } = useAuth()

  useEffect(() => {
    if (!user?.id || !membership?.companyId || !Capacitor.isNativePlatform()) {
      return
    }

    let cancelled = false
    const handles: Array<{ remove: () => Promise<void> }> = []

    void (async () => {
      try {
        handles.push(
          await PushNotifications.addListener('registration', (token) => {
            if (cancelled || !token.value) return

            void supabase.rpc('register_my_fcm_token', {
              requested_token: token.value,
              requested_user_agent: navigator.userAgent,
              requested_platform: Capacitor.getPlatform(),
            }).then(({ error }) => {
              if (error) {
                console.error('FCM token nije spremljen:', error)
              }
            })
          }),
        )

        handles.push(
          await PushNotifications.addListener('registrationError', (error) => {
            console.error('Native push registracija nije uspjela:', error)
          }),
        )

        let permission = await PushNotifications.checkPermissions()

        if (permission.receive === 'prompt') {
          permission = await PushNotifications.requestPermissions()
        }

        if (permission.receive !== 'granted' || cancelled) {
          return
        }

        await PushNotifications.register()
      } catch (error) {
        console.error('Native push inicijalizacija nije uspjela:', error)
      }
    })()

    return () => {
      cancelled = true
      for (const handle of handles) {
        void handle.remove()
      }
    }
  }, [membership?.companyId, user?.id])

  return null
}
