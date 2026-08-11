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
  useCompanyModules,
  type CompanyModuleKey,
} from './services/companyModules.service'

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
ModulesSettingsTab() {
  const {
    enabledModules,
    isLoading,
    error,
    role,
    save,
  } = useCompanyModules()

  const [
    selected,
    setSelected,
  ] = useState<
    CompanyModuleKey[]
  >(enabledModules)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState('')

  useEffect(() => {
    setSelected(
      enabledModules,
    )
  }, [enabledModules])

  const selectedSet =
    useMemo(
      () =>
        new Set(selected),
      [selected],
    )

  const canEdit =
    role === 'owner'

  function toggle(
    key:
      CompanyModuleKey,
  ) {
    if (!canEdit) {
      return
    }

    setMessage('')

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

  async function
  saveChanges() {
    if (
      !canEdit ||
      isSaving
    ) {
      return
    }

    if (
      selected.length === 0
    ) {
      setMessage(
        'Odaberi barem jedan poslovni modul.',
      )
      return
    }

    try {
      setIsSaving(true)
      setMessage('')

      await save(
        selected,
        true,
      )

      setMessage(
        'Moduli su spremljeni. Navigacija je ažurirana.',
      )
    } catch (
      nextError
    ) {
      setMessage(
        nextError instanceof
          Error
          ? nextError.message
          : 'Module nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">
        Učitavanje modula...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
              Prikaz aplikacije
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Uključeni moduli
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Isključeni moduli nestaju iz sidebara,
              mobilne navigacije i brzih akcija.
              Možete ih vratiti u bilo kojem trenutku.
            </p>
          </div>

          {canEdit ? (
            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                void saveChanges()
              }
              className="min-h-11 shrink-0 rounded-xl bg-blue-600 px-5 font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving
                ? 'Spremanje...'
                : 'Spremi module'}
            </button>
          ) : (
            <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300">
              Samo vlasnik mijenja module
            </span>
          )}
        </div>

        {(error ||
          message) && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {error ||
              message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                disabled={
                  !canEdit
                }
                onClick={() =>
                  toggle(
                    module.key,
                  )
                }
                className={`relative min-h-[145px] rounded-2xl border p-5 text-left transition ${
                  active
                    ? 'border-blue-400/50 bg-blue-500/12'
                    : 'border-slate-700 bg-slate-900'
                } ${
                  canEdit
                    ? 'hover:border-slate-500 active:scale-[0.99]'
                    : 'cursor-default opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-2xl ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon
                      size={22}
                    />
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {active
                      ? 'Uključeno'
                      : 'Isključeno'}
                  </span>
                </div>

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

                {active && (
                  <Check
                    size={15}
                    className="absolute bottom-4 right-4 text-emerald-400"
                  />
                )}
              </button>
            )
          },
        )}
      </div>
    </div>
  )
}
