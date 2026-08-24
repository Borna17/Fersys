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
    if (!open) return
    setSelected(initialModules)
    setError('')
  }, [
    open,
    initialModules,
  ])

  /*
   * Dok je modal otvoren zaključavamo samo pozadinu.
   * Sam modal ima vlastiti 100dvh scroll, što radi i na iOS Safari.
   */
  useEffect(() => {
    if (!open) return

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [open])

  const selectedSet =
    useMemo(
      () =>
        new Set(selected),
      [selected],
    )

  if (!open) return null

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

  function recommended() {
    setSelected([
      'work_orders',
      'customers',
      'offers',
      'invoices',
      'calendar',
    ])
  }

  function all() {
    setSelected(
      companyModules.map(
        (module) =>
          module.key,
      ),
    )
  }

  async function submit() {
    if (isSaving) return

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
    <div
      className="fixed inset-0 z-[205] h-[100dvh] overflow-y-auto overscroll-contain bg-slate-950/96 p-3 backdrop-blur-xl sm:p-5"
      style={{
        WebkitOverflowScrolling:
          'touch',
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-start py-1 sm:items-center sm:py-0">
        <section className="my-1 w-full overflow-visible rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 sm:my-auto">
          <header className="overflow-hidden rounded-t-[1.75rem] border-b border-slate-800 bg-gradient-to-br from-blue-600/20 via-slate-900 to-violet-600/15 px-5 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                <Sparkles size={24} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
                  POSTAVI SVOJ FERSYS
                </p>

                <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  Koje module želiš koristiti?
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Odaberi samo ono što je tvojoj tvrtki trenutno potrebno.
                  FERSYS će navigaciju i brze akcije prilagoditi tom odabiru.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-400/15 bg-blue-500/10 p-4">
              <Settings
                size={19}
                className="mt-0.5 shrink-0 text-blue-300"
              />

              <p className="text-xs font-semibold leading-5 text-blue-100/85 sm:text-sm">
                Ovaj odabir možeš
                <strong className="text-white">
                  {' '}uvijek promijeniti u Postavke → Moduli
                </strong>.
                Ništa nije trajno zaključano.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={recommended}
                className="min-h-10 rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-xs font-black text-slate-200"
              >
                Preporučeni odabir
              </button>

              <button
                type="button"
                onClick={all}
                className="min-h-10 rounded-xl border border-slate-700 bg-slate-950/50 px-3 text-xs font-black text-slate-200"
              >
                Odaberi sve
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-3 p-4 pb-28 sm:grid-cols-2 sm:p-6 sm:pb-28 lg:grid-cols-3">
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
                    className={`relative min-h-[126px] rounded-2xl border p-4 text-left transition active:scale-[0.99] sm:min-h-[140px] ${
                      active
                        ? 'border-blue-400/60 bg-blue-500/15 ring-2 ring-blue-500/10'
                        : 'border-slate-700 bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Icon size={22} />
                    </span>

                    {active && (
                      <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white">
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

          <footer className="sticky bottom-0 z-20 rounded-b-[1.75rem] border-t border-slate-700/90 bg-slate-950/95 p-4 shadow-[0_-14px_35px_rgba(2,6,23,0.75)] backdrop-blur-xl sm:px-6 sm:py-5">
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-xl items-start gap-2 text-xs leading-5 text-slate-400">
                <Info
                  size={16}
                  className="mt-0.5 shrink-0"
                />

                <p>
                  Odabrano:{' '}
                  <strong className="text-white">
                    {selected.length}
                  </strong>.
                  Početna, Postavke, Podrška i obavijesti ostaju dostupne.
                </p>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  void submit()
                }
                className="min-h-12 w-full rounded-2xl bg-blue-600 px-7 font-black text-white shadow-lg shadow-blue-950/30 disabled:opacity-50 sm:w-auto"
              >
                {isSaving
                  ? 'Spremanje...'
                  : 'Spremi i pokreni FERSYS →'}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}