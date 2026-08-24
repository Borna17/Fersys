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
} from '../../services/companyModules.service'

const icons: Record<CompanyModuleKey, typeof Wrench> = {
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

export default function ModulesSettingsTab() {
  const { enabledModules, isLoading, error, role, save } = useCompanyModules()
  const [selected, setSelected] = useState<CompanyModuleKey[]>(enabledModules)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSelected(enabledModules)
  }, [enabledModules])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const canEdit = role === 'owner'

  function toggle(key: CompanyModuleKey) {
    if (!canEdit) return
    setMessage('')
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    )
  }

  async function saveChanges() {
    if (!canEdit || isSaving) return
    if (!selected.length) {
      setMessage('Odaberi barem jedan poslovni modul.')
      return
    }

    try {
      setIsSaving(true)
      setMessage('')
      await save(selected, true)
      setMessage('Moduli su spremljeni. Navigacija je odmah ažurirana.')
    } catch (nextError) {
      setMessage(
        nextError instanceof Error
          ? nextError.message
          : 'Module nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
        Učitavanje modula...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
              POSTAVKE → MODULI
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Aktivni moduli
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400 sm:text-sm">
              Uključi samo ono što tvrtka koristi. Isključivanje modula ne briše postojeće podatke.
            </p>
          </div>

          {canEdit ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveChanges()}
              className="min-h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-50"
            >
              {isSaving ? 'Spremanje...' : 'Spremi promjene'}
            </button>
          ) : (
            <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300">
              Samo vlasnik mijenja module
            </span>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-400" />
          <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
            Promjene se odmah primjenjuju na navigaciju i brze akcije.
          </p>
        </div>

        {(error || message) && (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
              error || message.startsWith('Odaberi')
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {error || message}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {companyModules.map((module) => {
          const Icon = icons[module.key]
          const active = selectedSet.has(module.key)

          return (
            <button
              key={module.key}
              type="button"
              disabled={!canEdit}
              onClick={() => toggle(module.key)}
              className={`relative min-h-[112px] rounded-2xl border p-3 text-left transition sm:min-h-[120px] sm:p-4 ${
                active
                  ? 'border-blue-400/50 bg-blue-500/12'
                  : 'border-slate-700 bg-slate-900'
              } ${canEdit ? 'active:scale-[0.99]' : 'cursor-default opacity-80'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon size={19} />
                </span>

                <span
                  className={`rounded-full px-2 py-1 text-[8px] font-black uppercase sm:text-[9px] ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {active ? 'Uključeno' : 'Isključeno'}
                </span>
              </div>

              <p className="mt-3 text-xs font-black text-white sm:text-sm">
                {module.label}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500 sm:text-[11px]">
                {module.description}
              </p>

              {active && (
                <Check size={13} className="absolute bottom-3 right-3 text-emerald-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
