
import {
  ArrowRight,
  Clock3,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router'

import { useSubscription } from '../../subscription/SubscriptionProvider'

export default function TrialBanner() {
  const navigate = useNavigate()

  const {
    subscription,
    isTrialing,
    trialDaysRemaining,
  } = useSubscription()

  if (!subscription) {
    return null
  }

  if (!subscription.isUsable) {
    return (
      <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-300">
              <CreditCard size={20} />
            </div>

            <div>
              <p className="text-sm font-black">
                Potrebno je odabrati paket
              </p>

              <p className="mt-0.5 text-xs text-red-200/80">
                Podaci su sačuvani, ali stvaranje novih zapisa nije dostupno dok ne aktivirate paket.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate('/pricing')
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Odaberi paket
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  if (!isTrialing) {
    return null
  }

  return (
    <div className="border-b border-blue-500/20 bg-gradient-to-r from-blue-600/20 via-violet-600/15 to-blue-600/20 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
            <Sparkles size={20} />
          </div>

          <div>
            <p className="text-sm font-black">
              Business probno razdoblje
            </p>

            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300">
              <Clock3 size={14} />

              Preostalo je{' '}
              <strong className="text-white">
                {trialDaysRemaining}{' '}
                {trialDaysRemaining === 1
                  ? 'dan'
                  : 'dana'}
              </strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate('/pricing')
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          Odaberi paket
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}
