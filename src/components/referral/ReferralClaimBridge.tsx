import {
  useEffect,
  useRef,
} from 'react'

import {
  useAuth,
} from '../../auth/AuthProvider'
import {
  claimStoredReferral,
  getStoredReferralCode,
} from '../../services/referral.service'

export default function ReferralClaimBridge() {
  const {
    user,
    membership,
    isAccessLoading,
  } = useAuth()

  const attemptedForUser =
    useRef<string | null>(
      null,
    )

  useEffect(() => {
    if (
      !user?.id ||
      !membership ||
      isAccessLoading
    ) {
      return
    }

    if (
      attemptedForUser.current ===
      user.id
    ) {
      return
    }

    const stored =
      getStoredReferralCode()

    if (!stored) {
      attemptedForUser.current =
        user.id
      return
    }

    attemptedForUser.current =
      user.id

    void claimStoredReferral()
      .then((result) => {
        if (result) {
          console.info(
            'FERSYS referral:',
            result.reason,
          )
        }
      })
      .catch((error) => {
        attemptedForUser.current =
          null

        console.warn(
          'Referral se nije mogao povezati:',
          error,
        )
      })
  }, [
    user?.id,
    membership,
    isAccessLoading,
  ])

  return null
}
