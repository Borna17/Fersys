import {
  Award,
  CheckCircle2,
  Crown,
  Gift,
  LoaderCircle,
  RefreshCw,
  Users,
  XCircle,
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
  getAdminRewardsDashboard,
  resolveRewardRedemption,
  type AdminRewardsDashboard,
} from './services/adminRewards.service'

function formatDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(
    date.getTime(),
  )
    ? '—'
    : date.toLocaleDateString(
        'hr-HR',
      )
}

export function AdminRewardsPage() {
  const [
    data,
    setData,
  ] =
    useState<AdminRewardsDashboard | null>(
      null,
    )

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
    resolvingId,
    setResolvingId,
  ] =
    useState<string | null>(
      null,
    )

  const load =
    useCallback(async () => {
      try {
        setLoading(true)
        setError('')

        setData(
          await getAdminRewardsDashboard(),
        )
      } catch (value) {
        setError(
          value instanceof Error
            ? value.message
            : 'Rewards pregled nije moguće učitati.',
        )
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending =
    useMemo(
      () =>
        data?.redemptions.filter(
          (item) =>
            item.status ===
            'pending',
        ) ?? [],
      [data],
    )

  async function resolve(
    id: string,
    status:
      | 'approved'
      | 'rejected',
  ) {
    const verb =
      status === 'approved'
        ? 'odobriti'
        : 'odbiti'

    if (
      !window.confirm(
        `Želiš ${verb} ovaj zahtjev za nagradu?`,
      )
    ) {
      return
    }

    try {
      setResolvingId(id)

      await resolveRewardRedemption(
        id,
        status,
      )

      await load()
    } catch (value) {
      window.alert(
        value instanceof Error
          ? value.message
          : 'Zahtjev nije moguće riješiti.',
      )
    } finally {
      setResolvingId(null)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <LoaderCircle
          size={32}
          className="animate-spin text-violet-400"
        />
      </div>
    )
  }

  if (
    error ||
    !data
  ) {
    return (
      <section className="rounded-3xl border border-red-500/20 bg-slate-900 p-6 text-red-300">
        {error}
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-400">
            FERSYS Rewards
          </p>

          <h1 className="mt-2 text-3xl font-black text-white">
            Referral program
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Pregled preporuka,
            bodova i zahtjeva
            za nagrade.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void load()
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white"
        >
          <RefreshCw
            size={17}
          />
          Osvježi
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          icon={
            <Users
              size={20}
            />
          }
          label="Rewards računi"
          value={
            data.totals
              .accounts
          }
        />

        <Stat
          icon={
            <Gift
              size={20}
            />
          }
          label="Referral registracije"
          value={
            data.totals
              .referrals
          }
        />

        <Stat
          icon={
            <CheckCircle2
              size={20}
            />
          }
          label="Plaćene konverzije"
          value={
            data.totals
              .converted
          }
        />

        <Stat
          icon={
            <Crown
              size={20}
            />
          }
          label="Dodijeljeni bodovi"
          value={
            data.totals
              .points_awarded
          }
        />

        <Stat
          icon={
            <Award
              size={20}
            />
          }
          label="Čeka nagradu"
          value={
            data.totals
              .pending_redemptions
          }
        />
      </div>

      <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-black text-white">
          Zahtjevi za nagrade
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Odobrenje samo
          potvrđuje zahtjev.
          Primjenu besplatnog
          razdoblja na Stripe
          naplatu povezujemo u
          sljedećem koraku.
        </p>

        <div className="mt-5 space-y-3">
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-600">
              Nema zahtjeva koji
              čekaju obradu.
            </div>
          ) : (
            pending.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-white">
                      {
                        item.company_name
                      }
                    </p>

                    <p className="mt-1 text-sm font-bold text-violet-300">
                      {
                        item.reward_name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {
                        item.points_cost
                      }{' '}
                      bodova ·{' '}
                      {formatDate(
                        item.created_at,
                      )}
                    </p>
                  </div>

                  <Link
                    to={`/admin/companies/${item.company_id}`}
                    className="text-xs font-black text-blue-300"
                  >
                    Otvori tvrtku
                  </Link>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        resolvingId !==
                        null
                      }
                      onClick={() =>
                        void resolve(
                          item.id,
                          'approved',
                        )
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-50"
                    >
                      <CheckCircle2
                        size={15}
                      />
                      Odobri
                    </button>

                    <button
                      type="button"
                      disabled={
                        resolvingId !==
                        null
                      }
                      onClick={() =>
                        void resolve(
                          item.id,
                          'rejected',
                        )
                      }
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-3 text-xs font-black text-white disabled:opacity-50"
                    >
                      <XCircle
                        size={15}
                      />
                      Odbij
                    </button>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-black text-white">
          Najbolji promotori
        </h2>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1.5fr_.8fr_.8fr_.8fr_.8fr] gap-3 border-b border-slate-800 px-3 pb-2 text-[10px] font-black uppercase text-slate-600">
              <span>Tvrtka</span>
              <span>Kod</span>
              <span>Preporuke</span>
              <span>Konverzije</span>
              <span className="text-right">
                Bodovi
              </span>
            </div>

            {data.accounts.map(
              (item) => (
                <div
                  key={
                    item.account_id
                  }
                  className="grid grid-cols-[1.5fr_.8fr_.8fr_.8fr_.8fr] gap-3 border-b border-slate-800/70 px-3 py-4 text-sm"
                >
                  <Link
                    to={`/admin/companies/${item.company_id}`}
                    className="truncate font-black text-white"
                  >
                    {
                      item.company_name
                    }
                  </Link>

                  <span className="font-mono text-xs text-violet-300">
                    {
                      item.referral_code
                    }
                  </span>

                  <span className="text-slate-400">
                    {
                      item.referrals_total
                    }
                  </span>

                  <span className="text-slate-400">
                    {
                      item.referrals_converted
                    }
                  </span>

                  <strong className="text-right text-emerald-300">
                    {
                      item.lifetime_points
                    }
                  </strong>
                </div>
              ),
            )}
          </div>
        </div>
      </article>
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-violet-300">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  )
}
