import {
  ArrowRight,
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
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  requiredPlan: PlanId
}) {
  const navigate =
    useNavigate()

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
              DOSEGNUT LIMIT
            </div>

            <h2 className="mt-4 text-2xl font-black">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Zatvori prozor"
          >
            <X size={19} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          {description}
        </p>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm font-bold">
            Preporučeni paket:
          </p>

          <p className="mt-1 text-xl font-black text-blue-400">
            {plans[requiredPlan].name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/pricing')
          }}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500"
        >
          Nadogradi paket
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

