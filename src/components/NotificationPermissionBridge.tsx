import { useEffect } from 'react'

import { isNativeApp } from '../lib/platform'
import {
  enablePushNotifications,
  getPushRegistrationState,
} from '../services/pushNotifications.service'

const ENABLE_ATTEMPT_KEY =
  'fersys_native_notification_permission_attempted'

export default function NotificationPermissionBridge() {
  useEffect(() => {
    if (!isNativeApp()) {
      return
    }

    async function requestFromBell() {
      try {
        const state =
          await getPushRegistrationState()

        if (
          state !== 'available'
        ) {
          return
        }

        const next =
          await enablePushNotifications()

        sessionStorage.setItem(
          ENABLE_ATTEMPT_KEY,
          next,
        )

        window.dispatchEvent(
          new Event(
            'fersys:notifications-refresh',
          ),
        )
      } catch (error) {
        console.error(
          'Dopuštenje za FERSYS obavijesti nije moguće zatražiti:',
          error,
        )
      }
    }

    function handleClick(
      event: MouseEvent,
    ) {
      const target =
        event.target as
          HTMLElement | null

      const button =
        target?.closest(
          'button[aria-label="Obavijesti"]',
        )

      if (!button) {
        return
      }

      void requestFromBell()
    }

    document.addEventListener(
      'click',
      handleClick,
      true,
    )

    return () => {
      document.removeEventListener(
        'click',
        handleClick,
        true,
      )
    }
  }, [])

  return null
}
