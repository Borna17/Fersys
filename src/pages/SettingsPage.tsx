import {
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  ImagePlus,
  Palette,
  Save,
  Stamp,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import FersysLoader from '../components/FersysLoader'
import {
  defaultWorkingHours,
  getCompanySettings,
  updateCompanySettings,
  type CompanySettings,
  type WorkingHours,
} from '../services/companySettings.service'
import { fileToCompressedDataUrl } from '../utils/imageUtils'

type SettingsTab =
  | 'company'
  | 'documents'
  | 'working-hours'
  | 'notifications'

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
  const [activeTab, setActiveTab] =
    useState<SettingsTab>('company')

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
        await fileToCompressedDataUrl(
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
    <section className="mx-auto w-full max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">
            Postavke
          </h1>

          <p className="mt-2 text-slate-400">
            Upravljaj podacima tvrtke,
            dokumentima, radnim vremenom i
            obavijestima.
          </p>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            void saveSettings()
          }
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? (
            <CheckCircle2 size={19} />
          ) : (
            <Save size={19} />
          )}

          {isSaving
            ? 'Spremanje...'
            : saved
              ? 'Spremljeno'
              : 'Spremi postavke'}
        </button>
      </div>

      {saveError && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {saveError}
        </div>
      )}

      <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-2">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
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

      <div className="mt-6">
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-6">
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

      <div className="space-y-6">
        <ImageSettingsCard
          title="Logo tvrtke"
          description="Prikazuje se u aplikaciji i dokumentima."
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

      <div className="mt-5 flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-white">
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
