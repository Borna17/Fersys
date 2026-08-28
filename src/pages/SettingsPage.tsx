import {
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  Palette,
  Plug,
  RotateCcw,
  Save,
  SlidersHorizontal,
  ShieldCheck,
  Stamp,
  Trash2,
  Upload,
  UsersRound,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router'

import FersysLoader from '../components/FersysLoader'
import ModulesSettingsTab from '../components/settings/ModulesSettingsTab'
import WeatherMorningSettingsCard from '../components/settings/WeatherMorningSettingsCard'
import {
  defaultWorkingHours,
  getCompanySettings,
  updateCompanySettings,
  type CompanySettings,
  type WorkingHours,
} from '../services/companySettings.service'
import { fileToCompressedDataUrl } from '../utils/imageUtils'
import { removeLightBackgroundFromLogo } from '../utils/logoBackground'
import { supabase } from '../lib/supabase'
import { resetOnboarding } from '../services/onboarding.service'
import { notifyCompanyBrandingUpdated } from '../services/companyBranding.service'

type SettingsTab =
  | 'overview'
  | 'modules'
  | 'company'
  | 'documents'
  | 'working-hours'
  | 'notifications'
  | 'security'

type ImageField =
  | 'logoUrl'
  | 'stampUrl'
  | 'signatureUrl'

const tabs: Array<{
  id: SettingsTab
  label: string
  icon: typeof Building2
}> = [
  {
    id: 'overview',
    label: 'Pregled',
    icon: LayoutDashboard,
  },
  {
    id: 'modules',
    label: 'Moduli',
    icon: SlidersHorizontal,
  },
  {
    id: 'company',
    label: 'Tvrtka',
    icon: Building2,
  },
  {
    id: 'documents',
    label: 'Dokumenti',
    icon: FileText,
  },
  {
    id: 'working-hours',
    label: 'Radno vrijeme',
    icon: Clock3,
  },
  {
    id: 'notifications',
    label: 'Obavijesti',
    icon: Bell,
  },
  {
    id: 'security',
    label: 'Sigurnost',
    icon: ShieldCheck,
  },
]

const dayLabels: Array<{
  key: keyof WorkingHours
  label: string
}> = [
  {
    key: 'monday',
    label: 'Ponedjeljak',
  },
  {
    key: 'tuesday',
    label: 'Utorak',
  },
  {
    key: 'wednesday',
    label: 'Srijeda',
  },
  {
    key: 'thursday',
    label: 'Četvrtak',
  },
  {
    key: 'friday',
    label: 'Petak',
  },
  {
    key: 'saturday',
    label: 'Subota',
  },
  {
    key: 'sunday',
    label: 'Nedjelja',
  },
]

export function SettingsPage() {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] =
    useState<SettingsTab>('overview')

  const [settings, setSettings] =
    useState<CompanySettings | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSaving, setIsSaving] =
    useState(false)

  const [loadError, setLoadError] =
    useState('')

  const [saveError, setSaveError] =
    useState('')

  const [saved, setSaved] =
    useState(false)

  const [uploadingField, setUploadingField] =
    useState<ImageField | null>(null)

  const [isSendingPasswordReset, setIsSendingPasswordReset] =
    useState(false)

  const [securityMessage, setSecurityMessage] =
    useState('')

  const [securityError, setSecurityError] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        setIsLoading(true)
        setLoadError('')

        const companySettings =
          await getCompanySettings()

        if (!cancelled) {
          setSettings(companySettings)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Postavke tvrtke nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const setupCompletion = useMemo(() => {
    if (!settings) {
      return {
        percentage: 0,
        completed: 0,
        total: 8,
      }
    }

    const checks = [
      Boolean(settings.name.trim()),
      settings.oib.replace(/\D/g, '').length === 11,
      Boolean(settings.address.trim() && settings.city.trim()),
      Boolean(settings.phone.trim() || settings.email.trim()),
      Boolean(settings.iban.trim()),
      Boolean(settings.logoUrl),
      Boolean(settings.documentFooter.trim()),
      Boolean(settings.workingHours),
    ]

    const completed = checks.filter(Boolean).length

    return {
      percentage: Math.round(
        (completed / checks.length) * 100,
      ),
      completed,
      total: checks.length,
    }
  }, [settings])

  function updateField<
    Key extends keyof CompanySettings,
  >(
    key: Key,
    value: CompanySettings[Key],
  ) {
    setSaved(false)
    setSaveError('')

    setSettings((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [key]: value,
      }
    })
  }

  function updateWorkingDay(
    day: keyof WorkingHours,
    field: 'enabled' | 'from' | 'to',
    value: boolean | string,
  ) {
    if (!settings) {
      return
    }

    updateField('workingHours', {
      ...settings.workingHours,
      [day]: {
        ...settings.workingHours[day],
        [field]: value,
      },
    })
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: ImageField,
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      alert(
        'Slika mora biti PNG, JPG, JPEG ili WEBP.',
      )

      event.target.value = ''
      return
    }

    const maximumSize = 3 * 1024 * 1024

    if (file.size > maximumSize) {
      alert(
        'Slika ne smije biti veća od 3 MB.',
      )

      event.target.value = ''
      return
    }

    try {
      setUploadingField(field)

      const dataUrl =
        field === 'logoUrl'
          ? await removeLightBackgroundFromLogo(file)
          : await fileToCompressedDataUrl(
              file,
              field === 'signatureUrl'
                ? 1200
                : 1400,
              field === 'signatureUrl'
                ? 600
                : 1400,
              0.88,
            )

      updateField(field, dataUrl)
    } catch {
      alert(
        'Sliku nije moguće učitati.',
      )
    } finally {
      setUploadingField(null)
      event.target.value = ''
    }
  }

  async function saveSettings() {
    if (!settings || isSaving) {
      return
    }

    try {
      setIsSaving(true)
      setSaveError('')
      setSaved(false)

      const updated =
        await updateCompanySettings({
          name: settings.name,
          oib: settings.oib,
          address: settings.address,
          city: settings.city,
          postalCode: settings.postalCode,
          country: settings.country,

          phone: settings.phone,
          email: settings.email,
          website: settings.website,

          iban: settings.iban,
          bankName: settings.bankName,

          logoUrl: settings.logoUrl,
          stampUrl: settings.stampUrl,
          signatureUrl:
            settings.signatureUrl,

          defaultVatRate:
            settings.defaultVatRate,

          currency: settings.currency,

          primaryColor:
            settings.primaryColor,

          secondaryColor:
            settings.secondaryColor,

          workingHours:
            settings.workingHours,

          workOrderPrefix:
            settings.workOrderPrefix,

          offerPrefix:
            settings.offerPrefix,

          invoicePrefix:
            settings.invoicePrefix,

          incomingInvoicePrefix:
            settings.incomingInvoicePrefix,

          defaultPaymentDays:
            settings.defaultPaymentDays,

          defaultOfferValidityDays:
            settings.defaultOfferValidityDays,

          documentFooter:
            settings.documentFooter,

          documentWatermark:
            settings.documentWatermark,

          notificationsEnabled:
            settings.notificationsEnabled,

          emailNotificationsEnabled:
            settings.emailNotificationsEnabled,

          profileSettings:
            settings.profileSettings,
        })

      setSettings(updated)
      notifyCompanyBrandingUpdated(updated)
      setSaved(true)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Postavke nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function sendPasswordReset() {
    const email =
      settings?.email.trim().toLowerCase() ||
      ''

    setSecurityMessage('')
    setSecurityError('')

    if (!email) {
      setSecurityError(
        'Prvo spremi e-mail adresu tvrtke ili korisnika.',
      )
      return
    }

    try {
      setIsSendingPasswordReset(true)

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          },
        )

      if (error) {
        throw error
      }

      setSecurityMessage(
        'Poveznica za promjenu lozinke poslana je na e-mail.',
      )
    } catch (error) {
      setSecurityError(
        error instanceof Error
          ? error.message
          : 'Poveznicu nije moguće poslati.',
      )
    } finally {
      setIsSendingPasswordReset(false)
    }
  }

  async function restartTutorial() {
    try {
      setSecurityMessage('')
      setSecurityError('')

      await resetOnboarding()

      setSecurityMessage(
        'Tutorijal je resetiran. Otvorit će se nakon osvježavanja aplikacije.',
      )
    } catch (error) {
      setSecurityError(
        error instanceof Error
          ? error.message
          : 'Tutorijal nije moguće resetirati.',
      )
    }
  }

  function resetWorkingHours() {
    updateField(
      'workingHours',
      structuredClone(defaultWorkingHours),
    )
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje postavki tvrtke..." />
    )
  }

  if (loadError || !settings) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black text-white">
            Postavke nije moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm leading-6 text-red-300">
            {loadError ||
              'Podaci tvrtke nisu pronađeni.'}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Pokušaj ponovno
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-44 sm:space-y-6 sm:pb-12">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
              UPRAVLJAČKI CENTAR
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Postavke
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Tvrtka, dokumenti, moduli, radno vrijeme, obavijesti i sigurnost.
            </p>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void saveSettings()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white active:scale-95 disabled:opacity-50 sm:hidden"
            aria-label="Spremi postavke"
          >
            {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <HeroMetric label="Dovršeno" value={`${setupCompletion.percentage}%`} />
          <HeroMetric label="Postavljeno" value={`${setupCompletion.completed}/${setupCompletion.total}`} />
          <HeroMetric label="Kartica" value={tabs.find((tab) => tab.id === activeTab)?.label ?? 'Pregled'} />
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveSettings()}
          className="relative mt-4 hidden h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white disabled:opacity-50 sm:inline-flex"
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {isSaving ? 'Spremanje...' : saved ? 'Spremljeno' : 'Spremi postavke'}
        </button>
      </section>

      {saveError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {saveError}
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900 p-2">
        <div className="flex min-w-max gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`flex min-h-11 items-center gap-2 rounded-2xl px-3 text-xs font-black transition sm:px-4 sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {activeTab === 'overview' && (
          <OverviewSettingsTab
            settings={settings}
            completion={setupCompletion}
            onOpenTab={setActiveTab}
            onNavigate={navigate}
          />
        )}

        {activeTab === 'modules' && (
          <ModulesSettingsTab />
        )}

        {activeTab === 'company' && (
          <CompanySettingsTab
            settings={settings}
            updateField={updateField}
            handleImageUpload={
              handleImageUpload
            }
            uploadingField={
              uploadingField
            }
          />
        )}

        {activeTab === 'documents' && (
          <DocumentSettingsTab
            settings={settings}
            updateField={updateField}
          />
        )}

        {activeTab ===
          'working-hours' && (
          <WorkingHoursTab
            settings={settings}
            updateWorkingDay={
              updateWorkingDay
            }
            resetWorkingHours={
              resetWorkingHours
            }
          />
        )}

        {activeTab ===
          'notifications' && (
          <NotificationsTab
            settings={settings}
            updateField={updateField}
          />
        )}

        {activeTab === 'security' && (
          <SecuritySettingsTab
            email={settings.email}
            isSendingPasswordReset={
              isSendingPasswordReset
            }
            message={securityMessage}
            error={securityError}
            onSendPasswordReset={() => {
              void sendPasswordReset()
            }}
            onRestartTutorial={() => {
              void restartTutorial()
            }}
            onOpenEmployees={() =>
              navigate('/settings/employees')
            }
          />
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl md:hidden">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveSettings()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white disabled:opacity-50"
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {isSaving ? 'Spremanje...' : saved ? 'Spremljeno' : 'Spremi postavke'}
        </button>
      </div>

      {isSaving && (
        <FersysLoader
          fullScreen
          text="Spremanje postavki tvrtke..."
        />
      )}
    </section>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

type UpdateField = <
  Key extends keyof CompanySettings,
>(
  key: Key,
  value: CompanySettings[Key],
) => void

function CompanySettingsTab({
  settings,
  updateField,
  handleImageUpload,
  uploadingField,
}: {
  settings: CompanySettings
  updateField: UpdateField
  handleImageUpload: (
    event: ChangeEvent<HTMLInputElement>,
    field: ImageField,
  ) => Promise<void>
  uploadingField: ImageField | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      <div className="space-y-4 sm:space-y-6">
        <SettingsCard
          icon={
            <Building2 className="text-blue-400" />
          }
          title="Osnovni podaci tvrtke"
          description="Podaci koji se koriste na ponudama, računima i radnim nalozima."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="Naziv tvrtke"
              value={settings.name}
              required
              onChange={(value) =>
                updateField('name', value)
              }
            />

            <TextField
              label="OIB"
              value={settings.oib}
              inputMode="numeric"
              maxLength={11}
              onChange={(value) =>
                updateField(
                  'oib',
                  value
                    .replace(/\D/g, '')
                    .slice(0, 11),
                )
              }
            />

            <TextField
              label="Telefon"
              value={settings.phone}
              onChange={(value) =>
                updateField('phone', value)
              }
            />

            <TextField
              label="E-mail"
              type="email"
              value={settings.email}
              onChange={(value) =>
                updateField('email', value)
              }
            />

            <TextField
              label="Web stranica"
              value={settings.website}
              placeholder="https://..."
              onChange={(value) =>
                updateField(
                  'website',
                  value,
                )
              }
            />

            <TextField
              label="Država"
              value={settings.country}
              onChange={(value) =>
                updateField(
                  'country',
                  value,
                )
              }
            />

            <div className="md:col-span-2">
              <TextField
                label="Adresa"
                value={settings.address}
                onChange={(value) =>
                  updateField(
                    'address',
                    value,
                  )
                }
              />
            </div>

            <TextField
              label="Poštanski broj"
              value={settings.postalCode}
              onChange={(value) =>
                updateField(
                  'postalCode',
                  value,
                )
              }
            />

            <TextField
              label="Grad"
              value={settings.city}
              onChange={(value) =>
                updateField('city', value)
              }
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <Building2 className="text-emerald-400" />
          }
          title="Banka i porezni podaci"
          description="Postavke za račune i financijske dokumente."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="IBAN"
              value={settings.iban}
              onChange={(value) =>
                updateField(
                  'iban',
                  value.toUpperCase(),
                )
              }
            />

            <TextField
              label="Naziv banke"
              value={settings.bankName}
              onChange={(value) =>
                updateField(
                  'bankName',
                  value,
                )
              }
            />

            <NumberField
              label="Zadana stopa PDV-a"
              value={settings.defaultVatRate}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) =>
                updateField(
                  'defaultVatRate',
                  value,
                )
              }
            />

            <SelectField
              label="Valuta"
              value={settings.currency}
              options={[
                {
                  value: 'EUR',
                  label: 'EUR – euro',
                },
                {
                  value: 'USD',
                  label: 'USD – dolar',
                },
                {
                  value: 'GBP',
                  label: 'GBP – funta',
                },
              ]}
              onChange={(value) =>
                updateField(
                  'currency',
                  value,
                )
              }
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <Palette className="text-violet-400" />
          }
          title="Boje sustava i dokumenata"
          description="Boje će se kasnije automatski koristiti kroz FERSYS i PDF dokumente."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ColorField
              label="Glavna boja"
              value={settings.primaryColor}
              onChange={(value) =>
                updateField(
                  'primaryColor',
                  value,
                )
              }
            />

            <ColorField
              label="Sekundarna boja"
              value={
                settings.secondaryColor
              }
              onChange={(value) =>
                updateField(
                  'secondaryColor',
                  value,
                )
              }
            />
          </div>
        </SettingsCard>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <ImageSettingsCard
          title="Logo tvrtke"
          description="FERSYS automatski uklanja bijelu ili gotovo bijelu pozadinu, obrezuje prazne rubove i sprema transparentni PNG."
          value={settings.logoUrl}
          field="logoUrl"
          icon={<ImagePlus size={21} />}
          uploading={
            uploadingField === 'logoUrl'
          }
          onUpload={handleImageUpload}
          onRemove={() =>
            updateField('logoUrl', '')
          }
        />

        <ImageSettingsCard
          title="Pečat / štambilj"
          description="Koristi se na PDF dokumentima."
          value={settings.stampUrl}
          field="stampUrl"
          icon={<Stamp size={21} />}
          uploading={
            uploadingField === 'stampUrl'
          }
          onUpload={handleImageUpload}
          onRemove={() =>
            updateField('stampUrl', '')
          }
        />

        <ImageSettingsCard
          title="Potpis vlasnika"
          description="Opcionalni potpis za dokumente."
          value={settings.signatureUrl}
          field="signatureUrl"
          icon={<Upload size={21} />}
          uploading={
            uploadingField ===
            'signatureUrl'
          }
          onUpload={handleImageUpload}
          onRemove={() =>
            updateField(
              'signatureUrl',
              '',
            )
          }
        />
      </div>
    </div>
  )
}

function DocumentSettingsTab({
  settings,
  updateField,
}: {
  settings: CompanySettings
  updateField: UpdateField
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <SettingsCard
        icon={
          <FileText className="text-blue-400" />
        }
        title="Oznake dokumenata"
        description="Prefiksi koji se prikazuju ispred rednog broja dokumenta."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Radni nalozi"
            value={settings.workOrderPrefix}
            placeholder="RN"
            maxLength={10}
            onChange={(value) =>
              updateField(
                'workOrderPrefix',
                value.toUpperCase(),
              )
            }
          />

          <TextField
            label="Ponude"
            value={settings.offerPrefix}
            placeholder="P"
            maxLength={10}
            onChange={(value) =>
              updateField(
                'offerPrefix',
                value.toUpperCase(),
              )
            }
          />

          <TextField
            label="Izlazni računi"
            value={settings.invoicePrefix}
            placeholder="R"
            maxLength={10}
            onChange={(value) =>
              updateField(
                'invoicePrefix',
                value.toUpperCase(),
              )
            }
          />

          <TextField
            label="Ulazni računi"
            value={
              settings.incomingInvoicePrefix
            }
            placeholder="UR"
            maxLength={10}
            onChange={(value) =>
              updateField(
                'incomingInvoicePrefix',
                value.toUpperCase(),
              )
            }
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={
          <Clock3 className="text-amber-400" />
        }
        title="Rokovi dokumenata"
        description="Zadani rokovi pri izradi novih ponuda i računa."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <NumberField
            label="Rok plaćanja"
            value={
              settings.defaultPaymentDays
            }
            min={0}
            max={365}
            suffix="dana"
            onChange={(value) =>
              updateField(
                'defaultPaymentDays',
                value,
              )
            }
          />

          <NumberField
            label="Valjanost ponude"
            value={
              settings.defaultOfferValidityDays
            }
            min={1}
            max={365}
            suffix="dana"
            onChange={(value) =>
              updateField(
                'defaultOfferValidityDays',
                value,
              )
            }
          />
        </div>
      </SettingsCard>

      <div className="xl:col-span-2">
        <SettingsCard
          icon={
            <FileText className="text-violet-400" />
          }
          title="Izgled dokumenata"
          description="Tekst koji će se prikazivati na dokumentima tvrtke."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextAreaField
              label="Tekst u podnožju"
              value={
                settings.documentFooter
              }
              rows={5}
              onChange={(value) =>
                updateField(
                  'documentFooter',
                  value,
                )
              }
            />

            <TextAreaField
              label="Vodeni žig"
              value={
                settings.documentWatermark
              }
              rows={5}
              placeholder="Primjer: RADNI NALOG"
              onChange={(value) =>
                updateField(
                  'documentWatermark',
                  value,
                )
              }
            />
          </div>
        </SettingsCard>
      </div>
    </div>
  )
}

function WorkingHoursTab({
  settings,
  updateWorkingDay,
  resetWorkingHours,
}: {
  settings: CompanySettings
  updateWorkingDay: (
    day: keyof WorkingHours,
    field: 'enabled' | 'from' | 'to',
    value: boolean | string,
  ) => void
  resetWorkingHours: () => void
}) {
  return (
    <SettingsCard
      icon={
        <Clock3 className="text-blue-400" />
      }
      title="Radno vrijeme"
      description="Postavi uobičajeno radno vrijeme tvrtke."
      action={
        <button
          type="button"
          onClick={resetWorkingHours}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
        >
          Vrati zadano
        </button>
      }
    >
      <div className="space-y-3">
        {dayLabels.map((day) => {
          const value =
            settings.workingHours[day.key]

          return (
            <div
              key={day.key}
              className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:grid-cols-[180px_1fr] sm:items-center lg:grid-cols-[180px_160px_1fr_1fr]"
            >
              <p className="font-bold text-white">
                {day.label}
              </p>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={value.enabled}
                  onChange={(event) =>
                    updateWorkingDay(
                      day.key,
                      'enabled',
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 accent-blue-600"
                />

                {value.enabled
                  ? 'Radi se'
                  : 'Neradni dan'}
              </label>

              <TimeField
                label="Od"
                value={value.from}
                disabled={!value.enabled}
                onChange={(time) =>
                  updateWorkingDay(
                    day.key,
                    'from',
                    time,
                  )
                }
              />

              <TimeField
                label="Do"
                value={value.to}
                disabled={!value.enabled}
                onChange={(time) =>
                  updateWorkingDay(
                    day.key,
                    'to',
                    time,
                  )
                }
              />
            </div>
          )
        })}
      </div>
    </SettingsCard>
  )
}

function NotificationsTab({
  settings,
  updateField,
}: {
  settings: CompanySettings
  updateField: UpdateField
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <SettingsCard
        icon={
          <Bell className="text-blue-400" />
        }
        title="Obavijesti u aplikaciji"
        description="Uključi obavijesti o važnim događajima u FERSYS-u."
      >
        <ToggleSetting
          title="Obavijesti u aplikaciji"
          description="Prikazuj obavijesti o nalozima, računima, skladištu i drugim promjenama."
          checked={
            settings.notificationsEnabled
          }
          onChange={(checked) =>
            updateField(
              'notificationsEnabled',
              checked,
            )
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={
          <Bell className="text-violet-400" />
        }
        title="E-mail obavijesti"
        description="Slanje obavijesti na e-mail korisnika."
      >
        <ToggleSetting
          title="E-mail obavijesti"
          description="Primaj e-mail obavijesti o važnim promjenama i pozivnicama."
          checked={
            settings.emailNotificationsEnabled
          }
          onChange={(checked) =>
            updateField(
              'emailNotificationsEnabled',
              checked,
            )
          }
        />
      </SettingsCard>

      <WeatherMorningSettingsCard />

      <div className="xl:col-span-2">
        <SettingsCard
          icon={
            <Clock3 className="text-emerald-400" />
          }
          title="Regionalne postavke"
          description="Jezik, vremenska zona i prikaz vremena."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <SelectField
              label="Jezik"
              value={
                settings.profileSettings
                  .language ?? 'hr'
              }
              options={[
                {
                  value: 'hr',
                  label: 'Hrvatski',
                },
                {
                  value: 'en',
                  label: 'English',
                },
              ]}
              onChange={(value) =>
                updateField(
                  'profileSettings',
                  {
                    ...settings.profileSettings,
                    language: value,
                  },
                )
              }
            />

            <SelectField
              label="Vremenska zona"
              value={
                settings.profileSettings
                  .timezone ??
                'Europe/Zagreb'
              }
              options={[
                {
                  value:
                    'Europe/Zagreb',
                  label:
                    'Europe/Zagreb',
                },
                {
                  value: 'UTC',
                  label: 'UTC',
                },
              ]}
              onChange={(value) =>
                updateField(
                  'profileSettings',
                  {
                    ...settings.profileSettings,
                    timezone: value,
                  },
                )
              }
            />

            <SelectField
              label="Prikaz vremena"
              value={
                settings.profileSettings
                  .timeFormat ?? '24h'
              }
              options={[
                {
                  value: '24h',
                  label: '24 sata',
                },
                {
                  value: '12h',
                  label: '12 sati',
                },
              ]}
              onChange={(value) =>
                updateField(
                  'profileSettings',
                  {
                    ...settings.profileSettings,
                    timeFormat:
                      value as
                        | '12h'
                        | '24h',
                  },
                )
              }
            />
          </div>
        </SettingsCard>
      </div>
    </div>
  )
}

function OverviewSettingsTab({
  settings,
  completion,
  onOpenTab,
  onNavigate,
}: {
  settings: CompanySettings
  completion: {
    percentage: number
    completed: number
    total: number
  }
  onOpenTab: (tab: SettingsTab) => void
  onNavigate: (path: string) => void
}) {
  const setupItems = [
    {
      label: 'Naziv tvrtke',
      completed: Boolean(settings.name.trim()),
      tab: 'company' as SettingsTab,
    },
    {
      label: 'OIB',
      completed:
        settings.oib.replace(/\D/g, '').length === 11,
      tab: 'company' as SettingsTab,
    },
    {
      label: 'Adresa i grad',
      completed: Boolean(
        settings.address.trim() &&
          settings.city.trim(),
      ),
      tab: 'company' as SettingsTab,
    },
    {
      label: 'Kontakt',
      completed: Boolean(
        settings.phone.trim() ||
          settings.email.trim(),
      ),
      tab: 'company' as SettingsTab,
    },
    {
      label: 'IBAN',
      completed: Boolean(settings.iban.trim()),
      tab: 'company' as SettingsTab,
    },
    {
      label: 'Logo',
      completed: Boolean(settings.logoUrl),
      tab: 'company' as SettingsTab,
    },
    {
      label: 'Izgled dokumenata',
      completed: Boolean(
        settings.documentFooter.trim(),
      ),
      tab: 'documents' as SettingsTab,
    },
    {
      label: 'Radno vrijeme',
      completed: Boolean(settings.workingHours),
      tab: 'working-hours' as SettingsTab,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {completion.percentage < 100 && (
      <section className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-violet-500/10 p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative grid gap-7 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">
              Postavljanje tvrtke
            </p>

            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              {completion.percentage === 100
                ? 'Tvrtka je spremna za rad'
                : 'Dovrši postavljanje FERSYS-a'}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Podaci koje ovdje uneseš koriste se na ponudama,
              računima, radnim nalozima i svim dokumentima tvrtke.
            </p>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700"
                style={{
                  width: `${completion.percentage}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                {completion.completed}/{completion.total} stavki
              </span>

              <span className="font-black text-blue-400">
                {completion.percentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {setupItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onOpenTab(item.tab)}
                className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 text-left transition ${
                  item.completed
                    ? 'border-emerald-500/20 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/50 hover:border-blue-500/30'
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    item.completed
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {item.completed ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                  )}
                </span>

                <span className="text-xs font-bold text-slate-300">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ControlCenterCard
          icon={<Building2 size={23} />}
          title="Tvrtka i branding"
          description="Podaci, logo, pečat, potpis, boje i banka."
          action="Uredi tvrtku"
          onClick={() => onOpenTab('company')}
        />

        <ControlCenterCard
          icon={<FileText size={23} />}
          title="Dokumenti"
          description="Prefiksi, rokovi, podnožje i vodeni žig."
          action="Uredi dokumente"
          onClick={() => onOpenTab('documents')}
        />

        <ControlCenterCard
          icon={<Palette size={23} />}
          title="Izgled radnog naloga"
          description="Boje, logo, pečat, pozadina, raspored i PDF prikaz radnog naloga."
          action="Uredi izgled"
          onClick={() =>
            onNavigate('/settings/work-orders')
          }
        />

        <ControlCenterCard
          icon={<UsersRound size={23} />}
          title="Zaposlenici"
          description="Članovi tima, uloge i pristup aplikaciji."
          action="Otvori zaposlenike"
          onClick={() =>
            onNavigate('/settings/employees')
          }
        />

        <ControlCenterCard
          icon={<ShieldCheck size={23} />}
          title="Sigurnost"
          description="Lozinka, tutorijal i zaštita korisničkog računa."
          action="Sigurnosne postavke"
          onClick={() => onOpenTab('security')}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatusCard
          icon={<Clock3 size={21} />}
          label="Radno vrijeme"
          value="Postavljeno"
          detail="AI i kalendar koriste definirane radne dane."
          onClick={() => onOpenTab('working-hours')}
        />

        <StatusCard
          icon={<Bell size={21} />}
          label="Obavijesti"
          value={
            settings.notificationsEnabled
              ? 'Uključene'
              : 'Isključene'
          }
          detail="Obavijesti u aplikaciji i putem e-maila."
          onClick={() => onOpenTab('notifications')}
        />

        <StatusCard
          icon={<Plug size={21} />}
          label="Integracije"
          value="U pripremi"
          detail="Google Calendar, Gmail, Drive i druge usluge."
        />
      </section>
    </div>
  )
}

function ControlCenterCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-500/30 sm:p-4"
    >
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-400 sm:h-10 sm:w-10">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-black leading-5 text-white sm:text-base">
        {title}
      </h3>

      <p className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">
        {description}
      </p>

      <p className="mt-2 text-[10px] font-black text-blue-400 sm:text-xs">
        {action} →
      </p>
    </button>
  )
}

function StatusCard({
  icon,
  label,
  value,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-400">
          {icon}
        </div>

        <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black text-slate-400">
          {value}
        </span>
      </div>

      <h3 className="mt-4 font-black text-white">
        {label}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </>
  )

  if (!onClick) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-violet-500/30"
    >
      {content}
    </button>
  )
}

function SecuritySettingsTab({
  email,
  isSendingPasswordReset,
  message,
  error,
  onSendPasswordReset,
  onRestartTutorial,
  onOpenEmployees,
}: {
  email: string
  isSendingPasswordReset: boolean
  message: string
  error: string
  onSendPasswordReset: () => void
  onRestartTutorial: () => void
  onOpenEmployees: () => void
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {message && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard
          icon={<LockKeyhole className="text-blue-400" />}
          title="Lozinka korisnika"
          description="Pošalji sigurnu poveznicu za promjenu lozinke."
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              E-mail
            </p>

            <p className="mt-2 break-words font-bold text-white">
              {email || 'E-mail nije postavljen'}
            </p>
          </div>

          <button
            type="button"
            disabled={isSendingPasswordReset}
            onClick={onSendPasswordReset}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white disabled:opacity-50"
          >
            <LockKeyhole size={18} />

            {isSendingPasswordReset
              ? 'Slanje...'
              : 'Pošalji promjenu lozinke'}
          </button>
        </SettingsCard>

        <SettingsCard
          icon={<UsersRound className="text-violet-400" />}
          title="Korisnici i pristup"
          description="Upravljaj članovima tima i njihovim pristupom."
        >
          <p className="text-sm leading-6 text-slate-400">
            Zaposlenike dodaj zasebno, dodijeli im uloge i
            ograniči pristup osjetljivim poslovnim podacima.
          </p>

          <button
            type="button"
            onClick={onOpenEmployees}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-5 font-bold text-violet-300"
          >
            <UsersRound size={18} />
            Otvori zaposlenike
          </button>
        </SettingsCard>

        <SettingsCard
          icon={<RotateCcw className="text-amber-400" />}
          title="Tutorijal i onboarding"
          description="Ponovno pokreni početni vodič za ovaj korisnički račun."
        >
          <p className="text-sm leading-6 text-slate-400">
            Resetiranje ne briše poslovne podatke. Samo vraća
            početni tutorijal na prvi korak.
          </p>

          <button
            type="button"
            onClick={onRestartTutorial}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 font-bold text-amber-300"
          >
            <RotateCcw size={18} />
            Ponovno pokreni tutorijal
          </button>
        </SettingsCard>

        <SettingsCard
          icon={<ShieldCheck className="text-emerald-400" />}
          title="Napredna zaštita"
          description="Dodatne sigurnosne mogućnosti za poslovne račune."
        >
          <div className="space-y-3">
            {[
              'Dvofaktorska autentifikacija (2FA)',
              'Pregled aktivnih uređaja',
              'Odjava sa svih uređaja',
              'Dnevnik prijava i aktivnosti',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-800/50 px-4 py-3"
              >
                <span className="text-sm font-semibold text-slate-400">
                  {item}
                </span>

                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-500">
                  Uskoro
                </span>
              </div>
            ))}
          </div>
        </SettingsCard>
      </div>
    </div>
  )
}

function SettingsCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {icon}
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {action}
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}

function ImageSettingsCard({
  title,
  description,
  value,
  field,
  icon,
  uploading,
  onUpload,
  onRemove,
}: {
  title: string
  description: string
  value: string
  field: ImageField
  icon: React.ReactNode
  uploading: boolean
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
    field: ImageField,
  ) => Promise<void>
  onRemove: () => void
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
          {icon}
        </div>

        <div>
          <h2 className="font-black text-white">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="logo-preview-grid mt-5 flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-slate-700">
        {value ? (
          <img
            src={value}
            alt={title}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="text-center text-slate-400">
            <ImagePlus
              size={30}
              className="mx-auto"
            />

            <p className="mt-2 text-sm">
              Slika nije učitana
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500">
          <Upload size={17} />

          {uploading
            ? 'Obrada...'
            : value
              ? 'Promijeni'
              : 'Učitaj'}

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(event) =>
              void onUpload(
                event,
                field,
              )
            }
            className="hidden"
          />
        </label>

        {value && (
          <button
            type="button"
            onClick={onRemove}
            className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <style>{`
        .logo-preview-grid {
          background-color: #ffffff;
          background-image:
            linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
            linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
            linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
          background-size: 20px 20px;
          background-position:
            0 0,
            0 10px,
            10px -10px,
            -10px 0;
        }
      `}</style>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  inputMode,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  inputMode?:
    | 'text'
    | 'numeric'
    | 'decimal'
    | 'email'
    | 'tel'
    | 'url'
  maxLength?: number
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">
        {label}
        {required && (
          <span className="ml-1 text-red-400">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 h-12 w-full rounded-xl border border-transparent bg-slate-800 px-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </label>
  )
}

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">
        {label}
      </span>

      <div className="relative mt-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(
              Number(event.target.value),
            )
          }
          className="h-12 w-full rounded-xl border border-transparent bg-slate-800 px-4 pr-16 text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{
    value: string
    label: string
  }>
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 h-12 w-full rounded-xl border border-transparent bg-slate-800 px-4 text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="rounded-2xl bg-slate-800/70 p-4">
      <span className="text-sm font-bold text-slate-300">
        {label}
      </span>

      <div className="mt-3 flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-12 w-16 cursor-pointer rounded-xl border-0 bg-transparent"
        />

        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-12 min-w-0 flex-1 rounded-xl bg-slate-950 px-4 font-mono text-white outline-none"
        />
      </div>
    </label>
  )
}

function TextAreaField({
  label,
  value,
  rows,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  rows: number
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-transparent bg-slate-800 p-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      />
    </label>
  )
}

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl bg-slate-800 px-4 text-white [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  )
}

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div>
        <p className="font-bold text-white">
          {title}
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-6 w-6 shrink-0 accent-blue-600"
      />
    </label>
  )
}
