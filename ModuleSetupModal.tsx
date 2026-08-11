import {
  Bot,
  CalendarDays,
  CarFront,
  Check,
  FileInput,
  FileText,
  Package,
  ReceiptText,
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
  incoming_invoices:
    FileInput,
  calendar: CalendarDays,
  inventory: Package,
  vehicles: CarFront,
  employees: UsersRound,
  ai: Bot,
}

export default function
ModuleSetupModal({
  open,
  initialModules,
  onSave,
}: {
  open: boolean
  initialModules:
    CompanyModuleKey[]
  onSave: (
    modules:
      CompanyModuleKey[],
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
    if (!open) {
      return
    }

    setSelected(
      initialModules,
    )
    setError('')
  }, [
    open,
    initialModules,
  ])

  const selectedSet =
    useMemo(
      () =>
        new Set(selected),
      [selected],
    )

  if (!open) {
    return null
  }

  function toggle(
    key:
      CompanyModuleKey,
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

  async function submit() {
    if (
      isSaving
    ) {
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

      await onSave(
        selected,
      )
    } catch (
      nextError
    ) {
      setError(
        nextError instanceof
          Error
          ? nextError.message
          : 'Odabir nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-slate-950/95 px-3 py-5 backdrop-blur-xl sm:px-5">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
          <div className="border-b border-slate-800 bg-gradient-to-br from-blue-600/20 via-slate-900 to-violet-600/15 px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
              Prilagodite FERSYS
            </p>

            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Što vam treba za rad?
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Odaberite samo module koje koristite.
              Kasnije ih možete uključiti ili isključiti u Postavke → Moduli.
            </p>
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
                    key={
                      module.key
                    }
                    type="button"
                    onClick={() =>
                      toggle(
                        module.key,
                      )
                    }
                    className={`relative min-h-[145px] rounded-2xl border p-5 text-left transition active:scale-[0.99] ${
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
                      <Icon
                        size={22}
                      />
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
                      {
                        module.label
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {
                        module.description
                      }
                    </p>
                  </button>
                )
              },
            )}
          </div>

          <div className="border-t border-slate-800 p-4 sm:px-6">
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-5 text-slate-400">
                Početna, Postavke i Podrška ostaju dostupne.
                Paket pretplate i ovlasti zaposlenika i dalje određuju što je dopušteno.
              </p>

              <button
                type="button"
                disabled={
                  isSaving
                }
                onClick={() =>
                  void submit()
                }
                className="min-h-12 shrink-0 rounded-2xl bg-blue-600 px-6 font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isSaving
                  ? 'Spremanje...'
                  : 'Nastavi →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
