
import {
  Check,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react'

import {
  featureLabels,
  formatPlanLimit,
  planOrder,
  plans,
  type SubscriptionFeature,
} from '../subscription/plans'
import { useSubscription } from '../subscription/SubscriptionProvider'

const comparedFeatures: SubscriptionFeature[] = [
  'employees',
  'permissions',
  'invoices',
  'incoming_invoices',
  'inventory',
  'ai',
  'advanced_pdf',
  'email_sending',
  'inventory_costs',
  'advanced_finance',
  'advanced_ai',
  'automations',
  'multi_location',
  'excel_export',
]

function planIcon(
  planId: string,
) {
  if (planId === 'pro') {
    return Crown
  }

  if (planId === 'business') {
    return Sparkles
  }

  return Zap
}

export function PricingPage() {
  const {
    subscription,
  } = useSubscription()

  return (
    <section className="mx-auto w-full max-w-[1500px] pb-10">
      <header className="mx-auto max-w-3xl text-center">
        <div className="mx-auto inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
          FERSYS paketi
        </div>

        <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">
          Odaberite paket koji prati rast vaše tvrtke
        </h1>

        <p className="mt-5 text-base leading-7 text-slate-400">
          Starter je za samostalni rad, Business za timove,
          a FERSYS Pro uključuje sve mogućnosti bez ograničenja.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {planOrder.map(
          (planId) => {
            const plan =
              plans[planId]

            const Icon =
              planIcon(planId)

            const isCurrent =
              subscription?.planId ===
              planId

            return (
              <article
                key={plan.id}
                className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl ${
                  plan.recommended
                    ? 'border-blue-500/50 bg-gradient-to-b from-blue-600/15 to-slate-900 lg:-translate-y-3'
                    : plan.id === 'pro'
                      ? 'border-violet-500/35 bg-gradient-to-b from-violet-600/15 to-slate-900'
                      : 'border-slate-800 bg-slate-900'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute right-5 top-5 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">
                    Najpopularniji
                  </div>
                )}

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-blue-300">
                  <Icon size={24} />
                </div>

                <h2 className="mt-5 text-2xl font-black text-white">
                  {plan.name}
                </h2>

                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-black text-white">
                    {plan.price} €
                  </span>

                  <span className="pb-1 text-sm text-slate-500">
                    / mjesečno
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  className={`mt-7 min-h-12 w-full rounded-xl px-5 text-sm font-black transition ${
                    isCurrent
                      ? 'cursor-default border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                      : plan.recommended
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {isCurrent
                    ? 'Trenutni paket'
                    : 'Odaberi paket'}
                </button>

                <div className="mt-7 space-y-3">
                  {plan.highlights.map(
                    (highlight) => (
                      <div
                        key={highlight}
                        className="flex items-start gap-3 text-sm text-slate-300"
                      >
                        <Check
                          size={17}
                          className="mt-0.5 shrink-0 text-emerald-400"
                        />

                        <span>
                          {highlight}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </article>
            )
          },
        )}
      </div>

      <section className="mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <h2 className="text-2xl font-black text-white">
            Usporedba paketa
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm text-slate-400">
                  Funkcija
                </th>

                {planOrder.map(
                  (planId) => (
                    <th
                      key={planId}
                      className="px-6 py-4 text-center text-sm font-black text-white"
                    >
                      {
                        plans[planId]
                          .name
                      }
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              <LimitRow
                label="Korisnici"
                resource="users"
              />

              <LimitRow
                label="Kupci"
                resource="customers"
              />

              <LimitRow
                label="Radni nalozi mjesečno"
                resource="work_orders_monthly"
              />

              <LimitRow
                label="Ponude mjesečno"
                resource="offers_monthly"
              />

              {comparedFeatures.map(
                (feature) => (
                  <tr
                    key={feature}
                    className="border-b border-slate-800/70"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-300">
                      {
                        featureLabels[
                          feature
                        ]
                      }
                    </td>

                    {planOrder.map(
                      (planId) => (
                        <td
                          key={planId}
                          className="px-6 py-4 text-center"
                        >
                          {plans[
                            planId
                          ].features[
                            feature
                          ] ? (
                            <Check
                              size={19}
                              className="mx-auto text-emerald-400"
                            />
                          ) : (
                            <span className="text-slate-700">
                              —
                            </span>
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-slate-500">
        Stripe plaćanje povezujemo u sljedećem koraku. Gumbi
        za odabir paketa tada će pokretati sigurnu naplatu.
      </p>
    </section>
  )
}

function LimitRow({
  label,
  resource,
}: {
  label: string
  resource:
    | 'users'
    | 'customers'
    | 'work_orders_monthly'
    | 'offers_monthly'
}) {
  return (
    <tr className="border-b border-slate-800/70">
      <td className="px-6 py-4 text-sm font-semibold text-slate-300">
        {label}
      </td>

      {planOrder.map(
        (planId) => (
          <td
            key={planId}
            className="px-6 py-4 text-center text-sm font-bold text-white"
          >
            {formatPlanLimit(
              plans[planId]
                .limits[
                  resource
                ],
            )}
          </td>
        ),
      )}
    </tr>
  )
}
