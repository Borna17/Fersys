import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  RotateCcw,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import {
  getCompanySettings,
  type CompanySettings,
} from '../services/companySettings.service'
import {
  getCustomers,
} from '../services/customers.service'
import {
  getOffers,
} from '../services/offers.service'
import {
  getWorkOrders,
} from '../services/workOrders.service'

type FirstStepsData = {
  company:
    CompanySettings | null
  customers: number
  offers: number
  workOrders: number
}

type StoredState = {
  hidden?: boolean
  aiVisited?: boolean
  collapsed?: boolean
}

const STORAGE_PREFIX =
  'fersys_first_10_minutes_v1'

function storageKey(
  companyId?: string,
) {
  return `${STORAGE_PREFIX}:${
    companyId || 'unknown'
  }`
}

function readState(
  companyId?: string,
): StoredState {
  try {
    const raw =
      localStorage.getItem(
        storageKey(
          companyId,
        ),
      )

    if (!raw) {
      return {}
    }

    const parsed =
      JSON.parse(raw)

    return (
      parsed &&
      typeof parsed === 'object'
        ? parsed
        : {}
    )
  } catch {
    return {}
  }
}

function writeState(
  companyId: string | undefined,
  state: StoredState,
) {
  try {
    localStorage.setItem(
      storageKey(
        companyId,
      ),
      JSON.stringify(
        state,
      ),
    )
  } catch {
    // LocalStorage ne smije blokirati aplikaciju.
  }
}

function companyIsReady(
  company:
    CompanySettings | null,
) {
  if (!company) {
    return false
  }

  const hasIdentity =
    Boolean(
      company.name?.trim(),
    )

  const hasUsefulProfileData =
    Boolean(
      company.logoUrl ||
      company.address ||
      company.email ||
      company.phone,
    )

  return (
    hasIdentity &&
    hasUsefulProfileData
  )
}

export default function FirstTenMinutes() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const isDashboard =
    location.pathname ===
      '/dashboard' ||
    location.pathname === '/'

  const [
    data,
    setData,
  ] =
    useState<FirstStepsData>({
      company: null,
      customers: 0,
      offers: 0,
      workOrders: 0,
    })

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    state,
    setState,
  ] =
    useState<StoredState>(
      {},
    )

  const companyId =
    data.company?.id

  useEffect(() => {
    if (!isDashboard) {
      return
    }

    let cancelled =
      false

    async function load() {
      setLoading(true)

      const [
        companyResult,
        customersResult,
        offersResult,
        workOrdersResult,
      ] =
        await Promise.allSettled([
          getCompanySettings(),
          getCustomers(),
          getOffers(),
          getWorkOrders(),
        ])

      if (cancelled) {
        return
      }

      const company =
        companyResult.status ===
        'fulfilled'
          ? companyResult.value
          : null

      const customers =
        customersResult.status ===
        'fulfilled'
          ? customersResult.value.length
          : 0

      const offers =
        offersResult.status ===
        'fulfilled'
          ? offersResult.value.length
          : 0

      const workOrders =
        workOrdersResult.status ===
        'fulfilled'
          ? workOrdersResult.value.length
          : 0

      setData({
        company,
        customers,
        offers,
        workOrders,
      })

      setState(
        readState(
          company?.id,
        ),
      )

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [
    isDashboard,
    location.key,
  ])

  const steps =
    useMemo(
      () => [
        {
          id: 'company',
          title:
            'Postavi podatke tvrtke',
          description:
            'Dodaj logo i osnovne podatke kako bi dokumenti izgledali profesionalno.',
          route:
            '/settings',
          complete:
            companyIsReady(
              data.company,
            ),
          icon:
            Building2,
        },
        {
          id: 'customer',
          title:
            'Dodaj prvog investitora',
          description:
            'Investitor može biti osoba, tvrtka ili zgrada. OIB nije obavezan.',
          route:
            '/customers',
          complete:
            data.customers >
            0,
          icon:
            Users,
        },
        {
          id: 'offer',
          title:
            'Izradi prvu ponudu',
          description:
            'Dodaj stavke ručno ili skeniraj postojeću ponudu i zatim izradi PDF.',
          route:
            '/offers/new',
          complete:
            data.offers >
            0,
          icon:
            FileText,
        },
        {
          id: 'work-order',
          title:
            'Izradi prvi radni nalog',
          description:
            'Dodaj radnike, materijal, fotografije i potpis investitora.',
          route:
            '/work-orders/new',
          complete:
            data.workOrders >
            0,
          icon:
            Wrench,
        },
        {
          id: 'ai',
          title:
            'Upoznaj FERSYS AI',
          description:
            'AI može pomoći pronaći podatke i ubrzati svakodnevne radnje u FERSYS-u.',
          route:
            '/ai',
          complete:
            Boolean(
              state.aiVisited,
            ),
          icon:
            Sparkles,
        },
      ],
      [
        data,
        state.aiVisited,
      ],
    )

  const completed =
    steps.filter(
      (step) =>
        step.complete,
    ).length

  const progress =
    Math.round(
      (
        completed /
        steps.length
      ) *
        100,
    )

  if (!isDashboard) {
    return null
  }

  function updateState(
    patch:
      Partial<StoredState>,
  ) {
    const next = {
      ...state,
      ...patch,
    }

    setState(next)
    writeState(
      companyId,
      next,
    )
  }

  function openStep(
    step:
      (typeof steps)[number],
  ) {
    if (
      step.id ===
      'ai'
    ) {
      updateState({
        aiVisited: true,
      })
    }

    navigate(
      step.route,
    )
  }

  if (
    state.hidden
  ) {
    return (
      <button
        type="button"
        onClick={() =>
          updateState({
            hidden: false,
            collapsed:
              false,
          })
        }
        className="fixed right-4 top-20 z-[82] inline-flex min-h-11 items-center gap-2 rounded-2xl border border-blue-500/25 bg-slate-900/95 px-4 text-xs font-black text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-blue-400/50 active:scale-[0.98] sm:top-24"
      >
        <RotateCcw
          size={16}
          className="text-blue-300"
        />
        Prvi koraci
      </button>
    )
  }

  return (
    <aside className="fixed inset-x-3 top-20 z-[82] mx-auto max-w-[470px] overflow-hidden rounded-[1.6rem] border border-blue-500/20 bg-slate-900/97 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:inset-x-auto sm:right-5 sm:top-24 sm:w-[440px]">
      <div className="relative overflow-hidden border-b border-slate-800 p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              FERSYS · PRVIH 10 MINUTA
            </p>

            <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
              Postavi FERSYS za rad
            </h2>

            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              Napravi ovih nekoliko koraka i nakon toga možeš normalno voditi posao kroz aplikaciju.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              updateState({
                hidden: true,
              })
            }
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 transition hover:text-white"
            title="Sakrij vodič"
            aria-label="Sakrij vodič"
          >
            <X
              size={17}
            />
          </button>
        </div>

        <div className="relative mt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-slate-300">
              {completed}/{steps.length} završeno
            </span>

            <span className="text-xs font-black text-blue-300">
              {progress}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-all duration-500"
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div
        className={
          state.collapsed
            ? 'hidden'
            : 'max-h-[58vh] overflow-y-auto p-3 sm:p-4'
        }
      >
        {loading ? (
          <div className="py-8 text-center text-sm font-bold text-slate-500">
            Provjeravam početne korake...
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map(
              (step) => {
                const Icon =
                  step.icon

                return (
                  <button
                    key={
                      step.id
                    }
                    type="button"
                    onClick={() =>
                      openStep(
                        step,
                      )
                    }
                    className={`group flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                      step.complete
                        ? 'border-emerald-500/15 bg-emerald-500/[0.055]'
                        : 'border-slate-800 bg-slate-950/55 hover:border-blue-500/30 hover:bg-blue-500/[0.035]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        step.complete
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-blue-500/10 text-blue-300'
                      }`}
                    >
                      {step.complete ? (
                        <Check
                          size={17}
                        />
                      ) : (
                        <Icon
                          size={17}
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-black ${
                          step.complete
                            ? 'text-emerald-200'
                            : 'text-white'
                        }`}
                      >
                        {step.title}
                      </span>

                      <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                        {
                          step.description
                        }
                      </span>
                    </span>

                    <span className="mt-2 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-300">
                      {step.complete ? (
                        <Circle
                          size={14}
                          className="fill-emerald-400 text-emerald-400"
                        />
                      ) : (
                        <ArrowRight
                          size={16}
                        />
                      )}
                    </span>
                  </button>
                )
              },
            )}
          </div>
        )}

        {completed ===
          steps.length && (
          <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="font-black text-emerald-200">
              FERSYS je spreman 🎉
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/70">
              Prošao si osnovne korake. Vodič sada možeš sakriti i vratiti ga kad god želiš.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/40 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() =>
            updateState({
              collapsed:
                !state.collapsed,
            })
          }
          className="inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-black text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          {state.collapsed ? (
            <>
              <ChevronDown
                size={15}
              />
              Prikaži korake
            </>
          ) : (
            <>
              <ChevronUp
                size={15}
              />
              Smanji
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            updateState({
              hidden: true,
            })
          }
          className="min-h-9 rounded-xl px-3 text-xs font-black text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
        >
          Sakrij za sada
        </button>
      </div>
    </aside>
  )
}
