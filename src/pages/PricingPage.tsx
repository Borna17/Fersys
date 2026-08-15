import {
  Check,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  useState,
} from 'react'

import {
  featureLabels,
  formatPlanLimit,
  getYearlyMonthlyEquivalent,
  getYearlySavings,
  planOrder,
  plans,
  TRIAL_DAYS,
  TRIAL_PLAN_ID,
  type BillingPeriod,
  type SubscriptionFeature,
} from '../subscription/plans'
import { useSubscription } from '../subscription/SubscriptionProvider'

const comparedFeatures:
SubscriptionFeature[] = [
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

  if (
    planId === 'business'
  ) {
    return Sparkles
  }

  return Zap
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value)
}

function planBadge(
  planId: string,
) {
  if (planId === 'pro') {
    return 'NAJBOLJI IZBOR'
  }

  if (planId === 'business') {
    return 'ZA MALE TIMOVE'
  }

  return 'ZA SAMOSTALNI RAD'
}

function planSubline(
  planId: string,
) {
  if (planId === 'pro') {
    return 'Bez limita. Sve FERSYS funkcije.'
  }

  if (planId === 'business') {
    return 'Više kapaciteta za tim i poslovanje.'
  }

  return 'Sve osnovno za digitalni početak.'
}

export function PricingPage() {
  const {
    subscription,
    isTrialing,
    trialDaysRemaining,
  } = useSubscription()

  const [
    billingPeriod,
    setBillingPeriod,
  ] =
    useState<BillingPeriod>(
      'monthly',
    )

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-5 pb-10 sm:space-y-8">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/45 p-5 text-center sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            FERSYS paketi
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:mt-5 sm:text-5xl">
            Odaberi paket koji prati rast tvoje tvrtke
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:mt-5 sm:text-base sm:leading-7">
            Starter pokriva osnovni rad, Business je za mali tim, a FERSYS Pro je najbolji izbor za tvrtke koje žele raditi bez mjesečnih ograničenja.
          </p>

          <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5 sm:mt-7 sm:inline-flex sm:w-auto sm:max-w-none">
            <button
              type="button"
              onClick={() =>
                setBillingPeriod(
                  'monthly',
                )
              }
              className={`min-h-11 rounded-xl px-3 text-xs font-black transition sm:px-5 sm:text-sm ${
                billingPeriod ===
                'monthly'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mjesečno
            </button>

            <button
              type="button"
              onClick={() =>
                setBillingPeriod(
                  'yearly',
                )
              }
              className={`min-h-11 rounded-xl px-3 text-xs font-black transition sm:px-5 sm:text-sm ${
                billingPeriod ===
                'yearly'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Godišnje
              <span className="ml-2 rounded-full bg-slate-950/15 px-2 py-0.5 text-[10px]">
                povoljnije
              </span>
            </button>
          </div>

          {isTrialing && (
            <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-left">
              <p className="font-black text-violet-200">
                Trenutno koristiš besplatni Business trial.
              </p>

              <p className="mt-1 text-sm leading-6 text-violet-200/70">
                Trial traje {TRIAL_DAYS} dana i uključuje Business funkcije.
                {trialDaysRemaining > 0
                  ? ` Preostalo ti je još ${trialDaysRemaining} dana.`
                  : ''}
              </p>
            </div>
          )}

          {!isTrialing && (
            <p className="mt-5 text-sm text-slate-500">
              Novi korisnici dobivaju {TRIAL_DAYS} dana besplatnog {plans[TRIAL_PLAN_ID].name} paketa.
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {planOrder.map(
          (planId) => {
            const plan =
              plans[planId]

            const Icon =
              planIcon(planId)

            const isCurrent =
              !isTrialing &&
              subscription?.planId ===
                planId

            const yearly =
              billingPeriod ===
              'yearly'

            const shownPrice =
              yearly
                ? getYearlyMonthlyEquivalent(
                    planId,
                  )
                : plan.monthlyPrice

            return (
              <article
                key={plan.id}
                className={`relative overflow-hidden rounded-3xl border p-5 shadow-2xl sm:p-6 ${
                  plan.id === 'pro'
                    ? 'border-violet-400/60 bg-gradient-to-b from-violet-600/20 via-slate-900 to-slate-900 lg:-translate-y-4 lg:scale-[1.02]'
                    : plan.id === 'business'
                      ? 'border-blue-500/35 bg-gradient-to-b from-blue-600/10 to-slate-900'
                      : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div
                  className={`absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                    plan.id === 'pro'
                      ? 'bg-violet-500 text-white'
                      : plan.id === 'business'
                        ? 'bg-blue-500/15 text-blue-300'
                        : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {planBadge(planId)}
                </div>

                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
                  plan.id === 'pro'
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'bg-white/5 text-blue-300'
                }`}>
                  <Icon size={24} />
                </div>

                <h2 className="mt-5 text-2xl font-black text-white">
                  {plan.name}
                </h2>

                <p className="mt-2 min-h-14 text-sm font-semibold leading-6 text-slate-300">
                  {plan.description}
                </p>

                <p className={`mt-2 text-xs ${
                  plan.id === 'pro'
                    ? 'font-black text-violet-300'
                    : 'text-slate-500'
                }`}>
                  {planSubline(planId)}
                </p>

                <div className="mt-6">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white sm:text-5xl">
                      {formatMoney(
                        shownPrice,
                      )}
                    </span>

                    <span className="pb-1 text-sm text-slate-500">
                      / mj.
                    </span>
                  </div>

                  {yearly ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-bold text-emerald-300">
                        {formatMoney(
                          plan.yearlyPrice,
                        )}{' '}
                        godišnje
                      </p>

                      <p className="text-xs text-slate-500">
                        Ušteda{' '}
                        {formatMoney(
                          getYearlySavings(
                            planId,
                          ),
                        )}{' '}
                        godišnje
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      {formatMoney(
                        plan.monthlyPrice *
                          12,
                      )}{' '}
                      kroz 12 mjesečnih uplata
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    isCurrent
                  }
                  className={`mt-6 min-h-12 w-full rounded-2xl px-5 text-sm font-black transition active:scale-[0.99] ${
                    isCurrent
                      ? 'cursor-default border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                      : plan.id === 'pro'
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-950/30 hover:brightness-110'
                        : plan.id === 'business'
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {isCurrent
                    ? 'Trenutni paket'
                    : plan.id === 'pro'
                      ? 'Odaberi FERSYS Pro'
                      : yearly
                        ? 'Odaberi godišnje'
                        : 'Odaberi mjesečno'}
                </button>

                <div className="mt-7 space-y-3">
                  {plan.highlights.map(
                    (
                      highlight,
                    ) => (
                      <div
                        key={
                          highlight
                        }
                        className="flex items-start gap-3 text-sm text-slate-300"
                      >
                        <Check
                          size={17}
                          className="mt-0.5 shrink-0 text-emerald-400"
                        />

                        <span>
                          {
                            highlight
                          }
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

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4 sm:p-6">
          <h2 className="text-2xl font-black text-white">
            Usporedba paketa
          </h2>
        </div>

        <div className="space-y-3 p-4 sm:hidden">
          <MobileComparisonRow label="Korisnici" resource="users" />
          <MobileComparisonRow label="Investitori" resource="customers" />
          <MobileComparisonRow label="Radni nalozi mjesečno" resource="work_orders_monthly" />
          <MobileComparisonRow label="Ponude mjesečno" resource="offers_monthly" />
          {comparedFeatures.map((feature) => (
            <MobileBooleanComparison
              key={feature}
              label={featureLabels[feature]}
              values={Object.fromEntries(
                planOrder.map((planId) => [
                  planId,
                  plans[planId].features[feature],
                ]),
              )}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-4 text-left text-sm text-slate-400">
                  Funkcija
                </th>

                {planOrder.map(
                  (
                    planId,
                  ) => (
                    <th
                      key={
                        planId
                      }
                      className={`px-6 py-4 text-center text-sm font-black ${
                        planId === 'pro'
                          ? 'text-violet-300'
                          : 'text-white'
                      }`}
                    >
                      {
                        plans[
                          planId
                        ].name
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
                label="Investitori"
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
                (
                  feature,
                ) => (
                  <tr
                    key={
                      feature
                    }
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
                      (
                        planId,
                      ) => (
                        <td
                          key={
                            planId
                          }
                          className={`px-6 py-4 text-center ${
                            planId === 'pro'
                              ? 'bg-violet-500/[0.035]'
                              : ''
                          }`}
                        >
                          {plans[
                            planId
                          ].features[
                            feature
                          ] ? (
                            <Check
                              size={19}
                              className={`mx-auto ${
                                planId === 'pro'
                                  ? 'text-violet-300'
                                  : 'text-emerald-400'
                              }`}
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
    </section>
  )
}

function MobileComparisonRow({
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3">
      <p className="text-xs font-black text-slate-300">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {planOrder.map((planId) => (
          <div
            key={planId}
            className={`rounded-xl p-2 text-center ${
              planId === 'pro'
                ? 'border border-violet-500/20 bg-violet-500/10'
                : 'bg-slate-800/70'
            }`}
          >
            <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
              {plans[planId].name}
            </p>
            <p className="mt-1 text-xs font-black text-white">
              {formatPlanLimit(plans[planId].limits[resource])}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileBooleanComparison({
  label,
  values,
}: {
  label: string
  values: Record<string, boolean>
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3">
      <p className="text-xs font-black text-slate-300">
        {label}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {planOrder.map((planId) => (
          <div
            key={planId}
            className={`rounded-xl p-2 text-center ${
              planId === 'pro'
                ? 'border border-violet-500/20 bg-violet-500/10'
                : 'bg-slate-800/70'
            }`}
          >
            <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
              {plans[planId].name}
            </p>

            {values[planId] ? (
              <Check
                size={17}
                className={`mx-auto mt-1 ${
                  planId === 'pro'
                    ? 'text-violet-300'
                    : 'text-emerald-400'
                }`}
              />
            ) : (
              <span className="mt-1 block text-slate-700">
                —
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
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
            className={`px-6 py-4 text-center text-sm font-black ${
              planId === 'pro'
                ? 'bg-violet-500/[0.035] text-violet-200'
                : 'text-white'
            }`}
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