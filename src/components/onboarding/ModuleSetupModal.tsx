import {
  Bot,
  CalendarDays,
  CarFront,
  Check,
  FileInput,
  FileText,
  Info,
  Package,
  ReceiptText,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  companyModules,
  type CompanyModuleKey,
} from '../../services/companyModules.service'

import {
  getOnboardingProgress,
} from '../../services/onboarding.service'

const icons: Record<
  CompanyModuleKey,
  typeof Wrench
> = {
  work_orders: Wrench,
  customers: Users,
  offers: FileText,
  invoices: ReceiptText,
  incoming_invoices: FileInput,
  calendar: CalendarDays,
  inventory: Package,
  vehicles: CarFront,
  employees: UsersRound,
  ai: Bot,
}

export default function ModuleSetupModal({
  open,
  initialModules,
  onSave,
}: {
  open: boolean
  initialModules: CompanyModuleKey[]
  onSave: (
    modules: CompanyModuleKey[],
  ) => Promise<void>
}) {
  const [
    tutorialCompleted,
    setTutorialCompleted,
  ] = useState(false)

  const [
    isCheckingTutorial,
    setIsCheckingTutorial,
  ] = useState(false)

  const [
    selected,
    setSelected,
  ] = useState<
    CompanyModuleKey[]
  >(initialModules)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    if (!open) {
      setTutorialCompleted(false)
      setIsCheckingTutorial(false)
      return
    }

    let cancelled = false
    let intervalId:
      number | undefined

    async function checkTutorial() {
      try {
        setIsCheckingTutorial(true)

        const progress =
          await getOnboardingProgress()

        if (cancelled) {
          return
        }

        setTutorialCompleted(
          progress.completed,
        )

        if (progress.completed) {
          if (intervalId) {
            window.clearInterval(
              intervalId,
            )
          }
        }
      } catch (nextError) {
        console.error(
          'Status tutorijala nije moguće provjeriti:',
          nextError,
        )

        /*
         * Ne prikazujemo modul picker preko tutorijala
         * ako status nije moguće potvrditi.
         */
        if (!cancelled) {
          setTutorialCompleted(false)
        }
      } finally {
        if (!cancelled) {
          setIsCheckingTutorial(false)
        }
      }
    }

    void checkTutorial()

    /*
     * Tutorijal već postoji u AppLayoutu i nakon završetka
     * upisuje completed=true u Supabase.
     * Polling traje samo dok se taj korak ne završi.
     */
    intervalId =
      window.setInterval(
        () => {
          void checkTutorial()
        },
        700,
      )

    return () => {
      cancelled = true

      if (intervalId) {
        window.clearInterval(
          intervalId,
        )
      }
    }
  }, [open])

  useEffect(() => {
    if (
      !open ||
      !tutorialCompleted
    ) {
      return
    }

    setSelected(initialModules)
    setError('')
  }, [
    open,
    tutorialCompleted,
    initialModules,
  ])

  const selectedSet =
    useMemo(
      () =>
        new Set(selected),
      [selected],
    )

  if (
    !open ||
    isCheckingTutorial ||
    !tutorialCompleted
  ) {
    return null
  }

  function toggle(
    key: CompanyModuleKey,
  ) {
    setSelected(
      (current) =>
        current.includes(key)
          ? current.filter(
              (item) =>
                item !== key,
            )
          : [
              ...current,
              key,
            ],
    )
  }

  function selectRecommended() {
    setSelected([
      'work_orders',
      'customers',
      'offers',
      'invoices',
      'calendar',
    ])
  }

  function selectAll() {
    setSelected(
      companyModules.map(
        (module) =>
          module.key,
      ),
    )
  }

  async function submit() {
    if (isSaving) {
      return
    }

    if (
      selected.length === 0
    ) {
      setError(
        'Odaberi barem jedan poslovni modul.',
      )
      return
    }

    try {
      setIsSaving(true)
      setError('')

      await onSave(selected)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Odabir nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-slate-950/96 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center">
        <div className="w-full overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 sm:rounded-[2rem]">
          <div className="border-b border-slate-800 bg-gradient-to-br from-blue-600/25 via-slate-900 to-violet-600/20 px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20">
                <Sparkles size={24} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
                  Još samo jedan korak
                </p>

                <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  Odaberi što želiš koristiti
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  FERSYS će prikazivati samo module koji su ti potrebni,
                  kako bi aplikacija na mobitelu i računalu ostala pregledna.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-400/15 bg-blue-500/10 p-4">
              <Settings
                size={19}
                className="mt-0.5 shrink-0 text-blue-300"
              />

              <p className="text-xs font-semibold leading-5 text-blue-100/85 sm:text-sm">
                Ništa nije trajno zaključano. Ovaj odabir možeš
                <strong className="text-white"> uvijek promijeniti u Postavke → Moduli</strong>
                {' '}i uključiti ili isključiti bilo koji modul kada ti zatreba.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectRecommended}
                className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-blue-500/40 hover:text-white"
              >
                Preporučeni odabir
              </button>

              <button
                type="button"
                onClick={selectAll}
                className="rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-blue-500/40 hover:text-white"
              >
                Odaberi sve
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {companyModules.map(
              (module) => {
                const Icon =
                  icons[module.key]

                const active =
                  selectedSet.has(
                    module.key,
                  )

                return (
                  <button
                    key={module.key}
                    type="button"
                    onClick={() =>
                      toggle(
                        module.key,
                      )
                    }
                    className={`relative min-h-[132px] rounded-2xl border p-4 text-left transition active:scale-[0.99] sm:min-h-[145px] sm:p-5 ${
                      active
                        ? 'border-blue-400/70 bg-blue-500/15 ring-2 ring-blue-500/10'
                        : 'border-slate-700 bg-slate-800/65 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${
                        active
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Icon size={22} />
                    </span>

                    {active && (
                      <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
                        <Check
                          size={16}
                          strokeWidth={3}
                        />
                      </span>
                    )}

                    <p className="mt-4 font-black text-white">
                      {module.label}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {module.description}
                    </p>
                  </button>
                )
              },
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-950/25 p-4 sm:px-6 sm:py-5">
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-xl items-start gap-2 text-xs leading-5 text-slate-400">
                <Info
                  size={16}
                  className="mt-0.5 shrink-0 text-slate-500"
                />

                <p>
                  Početna, Postavke, Podrška i obavijesti ostaju dostupne.
                  Paket pretplate i ovlasti zaposlenika i dalje određuju
                  što pojedini korisnik smije koristiti.
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  void submit()
                }
                className="min-h-12 shrink-0 rounded-2xl bg-blue-600 px-7 font-black text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isSaving
                  ? 'Spremanje...'
                  : `Nastavi s ${selected.length} ${
                      selected.length === 1
                        ? 'modulom'
                        : 'modula'
                    } →`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
