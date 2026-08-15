import {
  ArrowRight,
  Crown,
  Sparkles,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router'

import {
  plans,
  type PlanId,
} from '../../subscription/plans'

export default function LimitReachedModal({
  isOpen,
  onClose,
  title,
  description,
  requiredPlan,
  recommendedPlan = 'pro',
  currentPlan = 'starter',
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  requiredPlan: PlanId
  recommendedPlan?: PlanId
  currentPlan?: PlanId
}) {
  const navigate =
    useNavigate()

  if (!isOpen) {
    return null
  }

  const required =
    plans[requiredPlan]

  const recommended =
    plans[recommendedPlan]

  const showRequiredAlternative =
    requiredPlan !==
      recommendedPlan &&
    currentPlan !== 'pro'

  function goToPricing(
    planId: PlanId,
  ) {
    onClose()

    navigate(
      `/pricing?plan=${planId}`,
    )
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-violet-500/25 bg-slate-900 text-white shadow-2xl shadow-black/50">
        <div className="relative overflow-hidden border-b border-slate-800 p-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-300">
                Dosegnut limit
              </div>

              <h2 className="mt-4 text-2xl font-black">
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 transition hover:text-white"
              aria-label="Zatvori prozor"
            >
              <X size={19} />
            </button>
          </div>

          <p className="relative mt-4 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        <div className="space-y-3 p-6">
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-blue-500/10 p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                <Crown size={22} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-300">
                  Preporučujemo
                </p>

                <h3 className="mt-1 text-xl font-black">
                  {recommended.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Neograničeni investitori, radni nalozi i ponude te sve FERSYS funkcije bez mjesečnih limita.
                </p>

                <p className="mt-3 text-2xl font-black text-white">
                  {recommended.monthlyPrice} €
                  <span className="ml-1 text-sm font-semibold text-slate-500">
                    / mj.
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                goToPricing(
                  recommendedPlan,
                )
              }
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 font-black text-white transition hover:brightness-110"
            >
              Pogledaj FERSYS Pro
              <ArrowRight size={18} />
            </button>
          </div>

          {showRequiredAlternative && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                  <Sparkles size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">
                    Ili prijeđi na {required.name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {required.monthlyPrice} € / mj. · {required.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  goToPricing(
                    requiredPlan,
                  )
                }
                className="mt-4 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-slate-200 transition hover:bg-slate-700"
              >
                Pogledaj {required.name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}