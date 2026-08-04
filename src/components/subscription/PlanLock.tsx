
import {
  ArrowRight,
  LockKeyhole,
} from 'lucide-react'
import { useNavigate } from 'react-router'

import {
  featureLabels,
  plans,
  type PlanId,
  type SubscriptionFeature,
} from '../../subscription/plans'

export default function PlanLock({
  feature,
  requiredPlan,
  title,
  description,
}: {
  feature?: SubscriptionFeature
  requiredPlan: PlanId
  title?: string
  description?: string
}) {
  const navigate =
    useNavigate()

  const plan =
    plans[requiredPlan]

  return (
    <main className="grid min-h-[65vh] place-items-center px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-violet-500/20 bg-slate-900 p-7 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
          <LockKeyhole size={30} />
        </div>

        <div className="mx-auto mt-5 inline-flex rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-violet-300">
          Dostupno u {plan.name}
        </div>

        <h1 className="mt-5 text-2xl font-black">
          {title ??
            (feature
              ? featureLabels[feature]
              : 'Premium funkcija')}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {description ??
            `Ova funkcija nije uključena u vaš trenutni paket. Nadogradite na ${plan.name} kako biste je koristili.`}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/pricing')
          }
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-500"
        >
          Pogledaj pakete
          <ArrowRight size={18} />
        </button>
      </section>
    </main>
  )
}
