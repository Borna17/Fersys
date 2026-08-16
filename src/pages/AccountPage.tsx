import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Copy,
  Crown,
  FileText,
  Gift,
  LoaderCircle,
  Mail,
  ReceiptText,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Link,
} from 'react-router'

import {
  useAuth,
} from '../auth/AuthProvider'
import {
  getFersysPortal,
  getMyReferrals,
  getMyRewardTransactions,
  getReferralUrl,
  redeemReward,
  referralPointsByPlan,
  rewards,
  type FersysPortal,
  type ReferralRow,
  type RewardTransaction,
} from '../services/referral.service'

function formatDate(
  value: string | null,
) {
  if (!value) return '—'

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—'
  }

  return date.toLocaleDateString(
    'hr-HR',
  )
}

function planName(
  plan:
    | 'starter'
    | 'business'
    | 'pro',
) {
  if (plan === 'starter') {
    return 'Starter'
  }

  if (plan === 'business') {
    return 'Business'
  }

  return 'FERSYS Pro'
}

function monthName(
  monthKey: string,
) {
  const [
    year,
    month,
  ] =
    monthKey.split('-')

  const date =
    new Date(
      Number(year),
      Number(month) - 1,
      1,
    )

  return date.toLocaleDateString(
    'hr-HR',
    {
      month: 'short',
    },
  )
}

export function AccountPage() {
  const {
    user,
    role,
  } = useAuth()

  const [
    portal,
    setPortal,
  ] =
    useState<FersysPortal | null>(
      null,
    )

  const [
    referrals,
    setReferrals,
  ] =
    useState<ReferralRow[]>([])

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      RewardTransaction[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    copied,
    setCopied,
  ] =
    useState(false)

  const [
    redeeming,
    setRedeeming,
  ] =
    useState<string | null>(
      null,
    )

  const load =
    useCallback(async () => {
      try {
        setLoading(true)
        setError('')

        const [
          nextPortal,
          nextReferrals,
          nextTransactions,
        ] =
          await Promise.all([
            getFersysPortal(),
            getMyReferrals(),
            getMyRewardTransactions(),
          ])

        setPortal(
          nextPortal,
        )

        setReferrals(
          nextReferrals,
        )

        setTransactions(
          nextTransactions,
        )
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : 'Moj FERSYS trenutno nije moguće učitati.',
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void load()
  }, [load])

  const referralUrl =
    portal
      ? getReferralUrl(
          portal.referral.code,
        )
      : ''

  const nextReward =
    useMemo(() => {
      if (!portal) {
        return rewards[0]
      }

      return (
        rewards.find(
          (reward) =>
            reward.points >
            portal.referral
              .points_balance,
        ) ??
        rewards[
          rewards.length - 1
        ]
      )
    }, [portal])

  const maxActivity =
    useMemo(() => {
      if (!portal) {
        return 1
      }

      return Math.max(
        1,
        ...portal.monthly_activity.flatMap(
          (entry) => [
            entry.work_orders,
            entry.offers,
            entry.invoices,
          ],
        ),
      )
    }, [portal])

  async function copyReferral() {
    if (!referralUrl) {
      return
    }

    await navigator.clipboard.writeText(
      referralUrl,
    )

    setCopied(true)

    window.setTimeout(
      () =>
        setCopied(false),
      1800,
    )
  }

  function shareWhatsApp() {
    if (!referralUrl) {
      return
    }

    const text =
      `Isprobaj FERSYS za digitalno vođenje poslovanja: ${referralUrl}`

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        text,
      )}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function shareEmail() {
    if (!referralUrl) {
      return
    }

    const subject =
      'Pozivnica za FERSYS'

    const body =
      `Pozivam te da isprobaš FERSYS. Registriraj se preko mog linka:\n\n${referralUrl}`

    window.location.href =
      `mailto:?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(
        body,
      )}`
  }

  async function handleRedeem(
    rewardCode: string,
    rewardName: string,
    points: number,
  ) {
    if (
      !portal ||
      portal.referral
        .points_balance <
        points
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Želiš iskoristiti ${points} bodova za nagradu "${rewardName}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setRedeeming(
        rewardCode,
      )

      await redeemReward(
        rewardCode,
      )

      window.alert(
        'Nagrada je zatražena. Bodovi su rezervirani i zahtjev je poslan FERSYS administraciji.',
      )

      await load()
    } catch (value) {
      window.alert(
        value instanceof Error
          ? value.message
          : 'Nagradu trenutno nije moguće iskoristiti.',
      )
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <div className="text-center">
          <LoaderCircle
            size={34}
            className="mx-auto animate-spin text-violet-400"
          />

          <p className="mt-3 text-sm font-bold text-slate-400">
            Učitavanje Moj
            FERSYS...
          </p>
        </div>
      </div>
    )
  }

  if (
    role !== 'owner'
  ) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-amber-500/20 bg-slate-900 p-7 text-center">
        <Building2
          size={32}
          className="mx-auto text-amber-300"
        />

        <h1 className="mt-4 text-2xl font-black text-white">
          Moj FERSYS je
          račun vlasnika
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Referral bodovi,
          pretplata i nagrade
          vezani su uz vlasnika
          tvrtke.
        </p>
      </section>
    )
  }

  if (
    error ||
    !portal
  ) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-slate-900 p-7 text-center">
        <p className="text-red-300">
          {error ||
            'Portal nije dostupan.'}
        </p>

        <button
          type="button"
          onClick={() =>
            void load()
          }
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          <RefreshCw
            size={17}
          />
          Pokušaj ponovno
        </button>
      </section>
    )
  }

  const progress =
    Math.min(
      100,
      Math.round(
        (
          portal.referral
            .points_balance /
          nextReward.points
        ) *
          100,
      ),
    )

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <header className="overflow-hidden rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white">
              {portal.company
                .logo_url ? (
                <img
                  src={
                    portal.company
                      .logo_url
                  }
                  alt=""
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2
                  size={28}
                  className="text-slate-500"
                />
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                Moj FERSYS
              </p>

              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {
                  portal.company
                    .name
                }
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/pricing"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/50 px-4 text-sm font-black text-white"
            >
              <Crown
                size={17}
              />
              Pretplata
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white"
            >
              Otvori FERSYS
              <ArrowRight
                size={17}
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Investitori"
          value={
            portal.stats
              .customers
          }
          icon={
            <Users
              size={21}
            />
          }
        />

        <StatCard
          label="Radni nalozi"
          value={
            portal.stats
              .work_orders
          }
          icon={
            <Wrench
              size={21}
            />
          }
        />

        <StatCard
          label="Ponude"
          value={
            portal.stats
              .offers
          }
          icon={
            <FileText
              size={21}
            />
          }
        />

        <StatCard
          label="Računi"
          value={
            portal.stats
              .invoices
          }
          icon={
            <ReceiptText
              size={21}
            />
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-400">
                Pretplata
              </p>

              <h2 className="mt-2 text-xl font-black text-white">
                {planName(
                  portal
                    .subscription
                    .plan_id,
                )}
              </h2>
            </div>

            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300">
              {
                portal
                  .subscription
                  .status
              }
            </span>
          </div>

          <div className="mt-5 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm">
            <InfoLine
              label="Trial završava"
              value={formatDate(
                portal
                  .subscription
                  .trial_ends_at,
              )}
            />

            <InfoLine
              label="Sljedeće razdoblje"
              value={formatDate(
                portal
                  .subscription
                  .current_period_end,
              )}
            />

            <InfoLine
              label="Otkaz na kraju razdoblja"
              value={
                portal
                  .subscription
                  .cancel_at_period_end
                  ? 'Da'
                  : 'Ne'
              }
            />
          </div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
              <BarChart3
                size={21}
              />
            </div>

            <div>
              <h2 className="font-black text-white">
                Aktivnost zadnjih
                6 mjeseci
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Nalozi, ponude i
                računi.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-6 gap-2">
            {portal.monthly_activity.map(
              (month) => (
                <div
                  key={
                    month.month_key
                  }
                  className="min-w-0"
                >
                  <div className="flex h-36 items-end justify-center gap-1 rounded-xl bg-slate-950/45 px-1.5 py-2">
                    <Bar
                      value={
                        month.work_orders
                      }
                      max={
                        maxActivity
                      }
                      className="bg-blue-500"
                    />

                    <Bar
                      value={
                        month.offers
                      }
                      max={
                        maxActivity
                      }
                      className="bg-violet-500"
                    />

                    <Bar
                      value={
                        month.invoices
                      }
                      max={
                        maxActivity
                      }
                      className="bg-emerald-500"
                    />
                  </div>

                  <p className="mt-2 truncate text-center text-[10px] font-bold uppercase text-slate-600">
                    {monthName(
                      month.month_key,
                    )}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500">
            <Legend
              color="bg-blue-500"
              label="Nalozi"
            />
            <Legend
              color="bg-violet-500"
              label="Ponude"
            />
            <Legend
              color="bg-emerald-500"
              label="Računi"
            />
          </div>
        </article>
      </div>

      <article className="overflow-hidden rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-violet-950/35 via-slate-900 to-slate-900">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-violet-300">
                <Gift
                  size={20}
                />

                <span className="text-xs font-black uppercase tracking-[0.16em]">
                  FERSYS Rewards
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-black text-white">
                {
                  portal.referral
                    .points_balance
                }{' '}
                bodova
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Preporuči FERSYS
                drugim firmama i
                skupljaj bodove za
                pakete.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniMetric
                label="Pozvano"
                value={
                  portal.referral
                    .total_referrals
                }
              />

              <MiniMetric
                label="Aktivirano"
                value={
                  portal.referral
                    .converted_referrals
                }
              />

              <MiniMetric
                label="Ukupno bodova"
                value={
                  portal.referral
                    .lifetime_points
                }
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  Moj referral link
                </p>

                <p className="mt-1 truncate font-mono text-sm font-bold text-white">
                  {referralUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyReferral()
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white"
                >
                  {copied ? (
                    <Check
                      size={16}
                    />
                  ) : (
                    <Copy
                      size={16}
                    />
                  )}
                  {copied
                    ? 'Kopirano'
                    : 'Kopiraj'}
                </button>

                <button
                  type="button"
                  onClick={
                    shareWhatsApp
                  }
                  className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-emerald-300"
                  title="Podijeli WhatsAppom"
                >
                  <Share2
                    size={17}
                  />
                </button>

                <button
                  type="button"
                  onClick={
                    shareEmail
                  }
                  className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-blue-300"
                  title="Pošalji e-mailom"
                >
                  <Mail
                    size={17}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-400">
                Do{' '}
                {
                  nextReward.name
                }
              </span>

              <strong className="text-white">
                {
                  portal.referral
                    .points_balance
                }{' '}
                /{' '}
                {
                  nextReward.points
                }
              </strong>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/25 p-5 sm:p-7">
          <p className="text-sm font-black text-white">
            Koliko bodova dobivaš?
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <PointCard
              label="Starter"
              points={
                referralPointsByPlan
                  .starter
              }
            />
            <PointCard
              label="Business"
              points={
                referralPointsByPlan
                  .business
              }
            />
            <PointCard
              label="FERSYS Pro"
              points={
                referralPointsByPlan
                  .pro
              }
              featured
            />
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles
              size={21}
              className="text-violet-300"
            />
            <h2 className="text-lg font-black text-white">
              Nagrade
            </h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {rewards.map(
              (reward) => {
                const enough =
                  portal.referral
                    .points_balance >=
                  reward.points

                return (
                  <div
                    key={
                      reward.code
                    }
                    className={`rounded-2xl border p-4 ${
                      reward.highlight
                        ? 'border-violet-500/25 bg-violet-500/[0.07]'
                        : 'border-slate-800 bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-white">
                          {
                            reward.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Paket{' '}
                          {planName(
                            reward.plan,
                          )}
                        </p>
                      </div>

                      <strong className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-violet-300">
                        {
                          reward.points
                        }{' '}
                        bod.
                      </strong>
                    </div>

                    <button
                      type="button"
                      disabled={
                        !enough ||
                        redeeming !==
                          null
                      }
                      onClick={() =>
                        void handleRedeem(
                          reward.code,
                          reward.name,
                          reward.points,
                        )
                      }
                      className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                    >
                      {redeeming ===
                      reward.code ? (
                        <LoaderCircle
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Gift
                          size={16}
                        />
                      )}

                      {enough
                        ? 'Iskoristi nagradu'
                        : `Nedostaje ${
                            reward.points -
                            portal
                              .referral
                              .points_balance
                          } bodova`}
                    </button>
                  </div>
                )
              },
            )}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-600">
            Zahtjev za nagradu
            ide FERSYS
            administraciji kako
            se ne bi poremetila
            postojeća Stripe
            pretplata. Bodovi se
            rezerviraju odmah.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="text-lg font-black text-white">
            Zadnje promjene
            bodova
          </h2>

          <div className="mt-4 divide-y divide-slate-800">
            {transactions.length ===
            0 ? (
              <p className="py-8 text-center text-sm text-slate-600">
                Još nema
                transakcija.
              </p>
            ) : (
              transactions
                .slice(0, 6)
                .map(
                  (
                    transaction,
                  ) => (
                    <div
                      key={
                        transaction.transaction_id
                      }
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-300">
                          {
                            transaction.description
                          }
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          {formatDate(
                            transaction.created_at,
                          )}
                        </p>
                      </div>

                      <strong
                        className={
                          transaction.points >
                          0
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }
                      >
                        {transaction.points >
                        0
                          ? '+'
                          : ''}
                        {
                          transaction.points
                        }
                      </strong>
                    </div>
                  ),
                )
            )}
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">
              Moje preporuke
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Bodovi se
              dodjeljuju kada
              preporučena firma
              aktivira plaćeni
              paket.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[650px]">
            <div className="grid grid-cols-[1.4fr_.7fr_.8fr_.6fr] gap-3 border-b border-slate-800 px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-600">
              <span>Tvrtka</span>
              <span>Status</span>
              <span>Paket</span>
              <span className="text-right">
                Bodovi
              </span>
            </div>

            {referrals.length ===
            0 ? (
              <div className="py-10 text-center text-sm text-slate-600">
                Još nema
                preporučenih
                tvrtki.
              </div>
            ) : (
              referrals.map(
                (referral) => (
                  <div
                    key={
                      referral.referral_id
                    }
                    className="grid grid-cols-[1.4fr_.7fr_.8fr_.6fr] gap-3 border-b border-slate-800/70 px-3 py-4 text-sm"
                  >
                    <span className="truncate font-black text-white">
                      {
                        referral.company_name
                      }
                    </span>

                    <span className="text-slate-400">
                      {
                        referral.status ===
                        'converted'
                          ? 'Aktiviran'
                          : 'Registriran'
                      }
                    </span>

                    <span className="text-slate-400">
                      {referral.converted_plan_id
                        ? planName(
                            referral.converted_plan_id as
                              | 'starter'
                              | 'business'
                              | 'pro',
                          )
                        : '—'}
                    </span>

                    <strong className="text-right text-emerald-300">
                      {referral.points_awarded >
                      0
                        ? `+${referral.points_awarded}`
                        : '—'}
                    </strong>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </article>
    </section>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function InfoLine({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
      <span className="text-slate-500">
        {label}
      </span>

      <strong className="text-right text-white">
        {value}
      </strong>
    </div>
  )
}

function Bar({
  value,
  max,
  className,
}: {
  value: number
  max: number
  className: string
}) {
  const height =
    value <= 0
      ? 3
      : Math.max(
          8,
          Math.round(
            (value / max) *
              100,
          ),
        )

  return (
    <div className="flex h-full flex-1 items-end">
      <div
        className={`w-full rounded-t-md ${className}`}
        style={{
          height: `${height}%`,
        }}
        title={String(value)}
      />
    </div>
  )
}

function Legend({
  color,
  label,
}: {
  color: string
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2.5 w-2.5 rounded-full ${color}`}
      />
      {label}
    </span>
  )
}

function MiniMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/35 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>
    </div>
  )
}

function PointCard({
  label,
  points,
  featured = false,
}: {
  label: string
  points: number
  featured?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        featured
          ? 'border-violet-500/25 bg-violet-500/[0.07]'
          : 'border-slate-800 bg-slate-900'
      }`}
    >
      <p className="text-sm font-black text-white">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-violet-300">
        +{points}
      </p>

      <p className="mt-1 text-[10px] text-slate-600">
        kada preporučena
        tvrtka aktivira paket
      </p>
    </div>
  )
}
