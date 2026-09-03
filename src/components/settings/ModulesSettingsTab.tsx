import {
  Bot,
  CalendarDays,
  CarFront,
  Check,
  FileInput,
  FileText,
  Globe2,
  GraduationCap,
  Info,
  Package,
  ReceiptText,
  Save,
  ShieldCheck,
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
import {
  getCompanyComplianceSettings,
  updateCompanyComplianceSettings,
  type CompanyComplianceSettings,
  type CompanyCountryCode,
  type FiscalizationMode,
} from '../../services/companyCompliance.service'

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

const countries: Array<{
  value: CompanyCountryCode
  label: string
  currency: string
}> = [
  { value: 'HR', label: 'Hrvatska', currency: 'EUR' },
  { value: 'BA', label: 'Bosna i Hercegovina', currency: 'BAM' },
  { value: 'RS', label: 'Srbija', currency: 'RSD' },
  { value: 'SI', label: 'Slovenija', currency: 'EUR' },
  { value: 'ME', label: 'Crna Gora', currency: 'EUR' },
  { value: 'MK', label: 'Sjeverna Makedonija', currency: 'MKD' },
  { value: 'XK', label: 'Kosovo', currency: 'EUR' },
  { value: 'OTHER', label: 'Druga država', currency: 'EUR' },
]

export default function ModulesSettingsTab() {
  const { enabledModules, isLoading, error, role, save } = useCompanyModules()
  const [selected, setSelected] = useState<CompanyModuleKey[]>(enabledModules)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [compliance, setCompliance] =
    useState<CompanyComplianceSettings | null>(null)
  const [isComplianceLoading, setIsComplianceLoading] = useState(true)
  const [isComplianceSaving, setIsComplianceSaving] = useState(false)
  const [complianceMessage, setComplianceMessage] = useState('')

  useEffect(() => {
    setSelected(enabledModules)
  }, [enabledModules])

  useEffect(() => {
    let cancelled = false

    async function loadCompliance() {
      try {
        setIsComplianceLoading(true)
        const next = await getCompanyComplianceSettings()
        if (!cancelled) setCompliance(next)
      } catch (nextError) {
        if (!cancelled) {
          setComplianceMessage(
            nextError instanceof Error
              ? nextError.message
              : 'Postavke države nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) setIsComplianceLoading(false)
      }
    }

    void loadCompliance()
    return () => {
      cancelled = true
    }
  }, [])

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

  function updateCompliance(
    patch: Partial<CompanyComplianceSettings>,
  ) {
    setComplianceMessage('')
    setCompliance((current) =>
      current ? { ...current, ...patch } : current,
    )
  }

  function changeCountry(countryCode: CompanyCountryCode) {
    if (!compliance) return
    const selectedCountry = countries.find((country) => country.value === countryCode)

    updateCompliance({
      countryCode,
      currency: selectedCountry?.currency ?? compliance.currency,
      fiscalization: {
        ...compliance.fiscalization,
        mode: 'OFF',
        provider: countryCode === 'HR' ? 'CROATIA_TAX_AUTHORITY' : '',
        businessPremiseCode: '',
        deviceCode: '',
        operatorTaxId: '',
      },
    })
  }

  function changeFiscalizationMode(mode: FiscalizationMode) {
    if (!compliance) return
    setComplianceMessage('')
    setCompliance({
      ...compliance,
      fiscalization: {
        ...compliance.fiscalization,
        mode,
      },
    })
  }

  async function saveCompliance() {
    if (!canEdit || !compliance || isComplianceSaving) return

    try {
      setIsComplianceSaving(true)
      setComplianceMessage('')

      const safeCompliance: CompanyComplianceSettings = {
        ...compliance,
        fiscalization: {
          ...compliance.fiscalization,
          mode:
            compliance.operatingMode === 'BUSINESS' && compliance.countryCode === 'HR'
              ? compliance.fiscalization.mode
              : 'OFF',
        },
      }

      const saved = await updateCompanyComplianceSettings(safeCompliance)
      setCompliance(saved)
      setComplianceMessage('Način rada, država i porezne postavke su spremljeni za ovu tvrtku.')
    } catch (nextError) {
      setComplianceMessage(
        nextError instanceof Error
          ? nextError.message
          : 'Postavke države nije moguće spremiti.',
      )
    } finally {
      setIsComplianceSaving(false)
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
      <section className="rounded-2xl border border-blue-500/20 bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
              TVRTKA → NAČIN RADA I DRŽAVA
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white">
              <Globe2 size={20} className="text-blue-400" />
              Regionalne i fiskalne postavke
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400 sm:text-sm">
              Svaka tvrtka u FERSYS-u ima vlastitu državu, valutu i fiskalizaciju. Fiskalizacija je opcionalna i po zadanim postavkama isključena.
            </p>
          </div>

          {canEdit && (
            <button
              type="button"
              disabled={isComplianceSaving || isComplianceLoading || !compliance}
              onClick={() => void saveCompliance()}
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-50"
            >
              <Save size={16} />
              {isComplianceSaving ? 'Spremanje...' : 'Spremi'}
            </button>
          )}
        </div>

        {isComplianceLoading ? (
          <p className="mt-4 text-sm text-slate-400">Učitavanje postavki države...</p>
        ) : compliance ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Način rada
                </span>
                <select
                  value={compliance.operatingMode}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateCompliance({
                      operatingMode: event.target.value === 'BUSINESS' ? 'BUSINESS' : 'LEARNING',
                      fiscalization:
                        event.target.value === 'BUSINESS'
                          ? compliance.fiscalization
                          : { ...compliance.fiscalization, mode: 'OFF' },
                    })
                  }
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-70"
                >
                  <option value="LEARNING">Učenje / demo</option>
                  <option value="BUSINESS">Registrirana tvrtka / obrt</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Država tvrtke
                </span>
                <select
                  value={compliance.countryCode}
                  disabled={!canEdit}
                  onChange={(event) => changeCountry(event.target.value as CompanyCountryCode)}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-70"
                >
                  {countries.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Valuta
                </span>
                <input
                  value={compliance.currency}
                  disabled={!canEdit}
                  maxLength={3}
                  onChange={(event) => updateCompliance({ currency: event.target.value.toUpperCase() })}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold uppercase text-white outline-none focus:border-blue-500 disabled:opacity-70"
                />
              </label>
            </div>

            {compliance.operatingMode === 'LEARNING' ? (
              <div className="flex gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                <GraduationCap size={20} className="mt-0.5 shrink-0 text-violet-300" />
                <div>
                  <p className="text-sm font-black text-violet-200">Način učenja</p>
                  <p className="mt-1 text-xs leading-5 text-violet-200/70">
                    Možeš koristiti kupce, ponude, radne naloge i probne račune bez povezivanja s poreznom upravom. Slanje fiskalizacije je zaključano.
                  </p>
                </div>
              </div>
            ) : compliance.countryCode === 'HR' ? (
              <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-black text-white">Hrvatska fiskalizacija</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Odaberi OFF dok fiskalizaciju ne želiš koristiti. TEST će kasnije služiti za testno okruženje, a LIVE za produkcijsko slanje. FERSYS ovdje priprema podatke, ali ništa se ne šalje Poreznoj dok službeni certifikat/posrednik i produkcijski adapter nisu povezani i testirani.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">Fiskalizacija</span>
                    <select
                      value={compliance.fiscalization.mode}
                      disabled={!canEdit}
                      onChange={(event) => changeFiscalizationMode(event.target.value as FiscalizationMode)}
                      className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                    >
                      <option value="OFF">Isključena</option>
                      <option value="TEST">Testni način</option>
                      <option value="LIVE">Produkcija (priprema)</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">Poslovni prostor</span>
                    <input
                      value={compliance.fiscalization.businessPremiseCode}
                      disabled={!canEdit || compliance.fiscalization.mode === 'OFF'}
                      onChange={(event) => setCompliance({
                        ...compliance,
                        fiscalization: { ...compliance.fiscalization, businessPremiseCode: event.target.value.toUpperCase() },
                      })}
                      className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">Naplatni uređaj</span>
                    <input
                      value={compliance.fiscalization.deviceCode}
                      disabled={!canEdit || compliance.fiscalization.mode === 'OFF'}
                      onChange={(event) => setCompliance({
                        ...compliance,
                        fiscalization: { ...compliance.fiscalization, deviceCode: event.target.value.toUpperCase() },
                      })}
                      className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500">Porezni broj operatora (OIB)</span>
                    <input
                      value={compliance.fiscalization.operatorTaxId}
                      disabled={!canEdit || compliance.fiscalization.mode === 'OFF'}
                      inputMode="numeric"
                      maxLength={11}
                      onChange={(event) => setCompliance({
                        ...compliance,
                        fiscalization: {
                          ...compliance.fiscalization,
                          operatorTaxId: event.target.value.replace(/\D/g, '').slice(0, 11),
                        },
                      })}
                      className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <Info size={20} className="mt-0.5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-black text-amber-200">Poslovni način je aktivan</p>
                  <p className="mt-1 text-xs leading-5 text-amber-200/70">
                    Podaci ove tvrtke ostaju odvojeni. Fiskalizacijski adapter za odabranu državu još nije uključen, zato FERSYS neće pokušavati slanje hrvatskoj Poreznoj upravi.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {complianceMessage && (
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            {complianceMessage}
          </div>
        )}
      </section>

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
