import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import {
  Building2,
  ImagePlus,
  Palette,
  RotateCcw,
  Save,
  Stamp,
  Trash2,
} from 'lucide-react'

import {
  useAuth,
} from '../auth/AuthProvider'

import FersysLoader from '../components/FersysLoader'

import {
  type WorkOrderBranding,
} from '../types/workOrder'

import {
  fileToCompressedDataUrl,
} from '../utils/imageUtils'

import {
  getWorkOrderBrandingFromCompanySettings,
  resetWorkOrderBranding,
  saveWorkOrderBranding,
} from '../services/workOrderBranding.service'

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (
    checked: boolean,
  ) => void
  label: string
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/70 px-4 py-3">
      <span className="text-sm font-medium text-slate-300">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="h-5 w-5 accent-blue-600"
      />
    </label>
  )
}

export function WorkOrderSettingsPage() {
  const {
    can,
  } = useAuth()

  const canManageSettings =
    can('settings.manage')

  const [
    branding,
    setBranding,
  ] =
    useState<WorkOrderBranding | null>(
      null,
    )

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    isResetting,
    setIsResetting,
  ] = useState(false)

  const [
    loadError,
    setLoadError,
  ] = useState('')

  const [
    saved,
    setSaved,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setLoadError('')

        const loaded =
          await getWorkOrderBrandingFromCompanySettings()

        if (!cancelled) {
          setBranding(
            loaded,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Postavke radnog naloga nije moguće učitati.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  function update<
    K extends keyof WorkOrderBranding,
  >(
    key: K,
    value:
      WorkOrderBranding[K],
  ) {
    setSaved(false)

    setBranding(
      (current) =>
        current
          ? {
              ...current,
              [key]: value,
            }
          : current,
    )
  }

  async function handleImage(
    event:
      ChangeEvent<HTMLInputElement>,
    key:
      | 'logo'
      | 'stamp'
      | 'backgroundImage',
  ) {
    const file =
      event.target
        .files?.[0]

    if (!file) {
      return
    }

    try {
      const isBackground =
        key ===
        'backgroundImage'

      const dataUrl =
        await fileToCompressedDataUrl(
          file,
          isBackground
            ? 1800
            : 1000,
          isBackground
            ? 1800
            : 1000,
          0.82,
        )

      update(
        key,
        dataUrl,
      )
    } catch (error) {
      console.error(
        'Učitavanje slike nije uspjelo:',
        error,
      )

      alert(
        'Sliku nije moguće učitati.',
      )
    } finally {
      event.target.value =
        ''
    }
  }

  async function saveSettings() {
    if (
      !branding ||
      isSaving
    ) {
      return
    }

    try {
      setIsSaving(true)
      setSaved(false)

      const savedBranding =
        await saveWorkOrderBranding(
          branding,
        )

      setBranding(
        savedBranding,
      )

      setSaved(true)
    } catch (error) {
      console.error(
        'Spremanje izgleda radnog naloga nije uspjelo:',
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : 'Izgled radnog naloga nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function resetSettings() {
    if (isResetting) {
      return
    }

    const confirmed =
      window.confirm(
        'Želite li vratiti izgled radnog naloga na zadane postavke firme?',
      )

    if (!confirmed) {
      return
    }

    try {
      setIsResetting(true)
      setSaved(false)

      const resetBranding =
        await resetWorkOrderBranding()

      setBranding(
        resetBranding,
      )
    } catch (error) {
      console.error(
        'Vraćanje postavki nije uspjelo:',
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : 'Postavke nije moguće vratiti.',
      )
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader
        text="Učitavanje izgleda radnog naloga..."
      />
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Postavke nije
            moguće učitati
          </h1>

          <p className="mt-3 break-words text-sm text-red-300">
            {loadError}
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

  if (!branding) {
    return null
  }

  if (
    !canManageSettings
  ) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-amber-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Nemate dopuštenje
          </h1>

          <p className="mt-3 text-slate-400">
            Izgled radnog
            naloga može
            mijenjati samo
            korisnik koji ima
            dopuštenje za
            postavke firme.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Izgled radnog
            naloga
          </h1>

          <p className="mt-2 max-w-3xl text-slate-400">
            Ove postavke
            vrijede za cijelu
            tvrtku. Radnici i
            ostali korisnici
            koriste isti izgled
            PDF dokumenta.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={
              isResetting ||
              isSaving
            }
            onClick={
              resetSettings
            }
            className="flex h-12 items-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw
              size={18}
            />

            {isResetting
              ? 'Vraćanje...'
              : 'Vrati zadano'}
          </button>

          <button
            type="button"
            disabled={
              isSaving ||
              isResetting
            }
            onClick={
              saveSettings
            }
            className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={18} />

            {isSaving
              ? 'Spremanje...'
              : saved
                ? 'Spremljeno'
                : 'Spremi izgled'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
          <p className="font-semibold text-emerald-300">
            Izgled radnog
            naloga spremljen
            je za cijelu
            tvrtku.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_430px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <Building2 className="text-blue-400" />

              <h2 className="text-xl font-bold text-white">
                Podaci tvrtke
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Naziv tvrtke"
                value={
                  branding.companyName
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyName',
                    value,
                  )
                }
              />

              <TextField
                label="OIB tvrtke"
                value={
                  branding.companyOib
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyOib',
                    value,
                  )
                }
              />

              <TextField
                label="Adresa"
                value={
                  branding.companyAddress
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyAddress',
                    value,
                  )
                }
              />

              <TextField
                label="Telefon"
                value={
                  branding.companyPhone
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyPhone',
                    value,
                  )
                }
              />

              <TextField
                label="E-mail"
                value={
                  branding.companyEmail
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyEmail',
                    value,
                  )
                }
              />

              <TextField
                label="IBAN"
                value={
                  branding.companyIban
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyIban',
                    value,
                  )
                }
              />

              <TextField
                label="Web stranica"
                value={
                  branding.companyWebsite
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'companyWebsite',
                    value,
                  )
                }
              />

              <div />

              <TextAreaField
                label="Tekst u podnožju"
                value={
                  branding.footerText
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'footerText',
                    value,
                  )
                }
              />

              <TextAreaField
                label="Vodeni žig"
                value={
                  branding.watermarkText
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'watermarkText',
                    value,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <Palette className="text-violet-400" />

              <h2 className="text-xl font-bold text-white">
                Boje i raspored
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField
                label="Glavna boja"
                value={
                  branding.primaryColor
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'primaryColor',
                    value,
                  )
                }
              />

              <ColorField
                label="Sekundarna boja"
                value={
                  branding.secondaryColor
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'secondaryColor',
                    value,
                  )
                }
              />

              <ColorField
                label="Naglasna boja"
                value={
                  branding.accentColor
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'accentColor',
                    value,
                  )
                }
              />

              <ColorField
                label="Boja teksta"
                value={
                  branding.textColor
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'textColor',
                    value,
                  )
                }
              />

              <ColorField
                label="Boja obruba"
                value={
                  branding.borderColor
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'borderColor',
                    value,
                  )
                }
              />

              <ColorField
                label="Boja pozadine"
                value={
                  branding.backgroundColor
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'backgroundColor',
                    value,
                  )
                }
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-slate-300">
                  Stil PDF-a
                </span>

                <select
                  value={
                    branding.layout
                  }
                  onChange={(
                    event,
                  ) =>
                    update(
                      'layout',
                      event.target
                        .value as WorkOrderBranding['layout'],
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
                >
                  <option value="classic">
                    Classic
                  </option>

                  <option value="modern">
                    Modern
                  </option>

                  <option value="minimal">
                    Minimal
                  </option>
                </select>
              </label>

              <label>
                <span className="text-sm font-semibold text-slate-300">
                  Položaj loga
                </span>

                <select
                  value={
                    branding.headerAlignment
                  }
                  onChange={(
                    event,
                  ) =>
                    update(
                      'headerAlignment',
                      event.target
                        .value as WorkOrderBranding['headerAlignment'],
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
                >
                  <option value="left">
                    Lijevo
                  </option>

                  <option value="center">
                    Sredina
                  </option>

                  <option value="right">
                    Desno
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <ImagePlus className="text-emerald-400" />

              <h2 className="text-xl font-bold text-white">
                Slike i pečat
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              <ImageCard
                title="Logo"
                value={
                  branding.logo
                }
                icon={
                  <ImagePlus
                    size={18}
                  />
                }
                onUpload={(
                  event,
                ) =>
                  handleImage(
                    event,
                    'logo',
                  )
                }
                onRemove={() =>
                  update(
                    'logo',
                    '',
                  )
                }
              />

              <ImageCard
                title="Pečat / štambilj"
                value={
                  branding.stamp
                }
                icon={
                  <Stamp
                    size={18}
                  />
                }
                onUpload={(
                  event,
                ) =>
                  handleImage(
                    event,
                    'stamp',
                  )
                }
                onRemove={() =>
                  update(
                    'stamp',
                    '',
                  )
                }
              />

              <ImageCard
                title="Pozadinska slika"
                value={
                  branding.backgroundImage
                }
                icon={
                  <ImagePlus
                    size={18}
                  />
                }
                onUpload={(
                  event,
                ) =>
                  handleImage(
                    event,
                    'backgroundImage',
                  )
                }
                onRemove={() =>
                  update(
                    'backgroundImage',
                    '',
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold text-white">
              Što se prikazuje
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Toggle
                checked={
                  branding.showLogo
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showLogo',
                    value,
                  )
                }
                label="Prikaži logo"
              />

              <Toggle
                checked={
                  branding.showStamp
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showStamp',
                    value,
                  )
                }
                label="Prikaži pečat"
              />

              <Toggle
                checked={
                  branding.showBackgroundImage
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showBackgroundImage',
                    value,
                  )
                }
                label="Prikaži pozadinsku sliku"
              />

              <Toggle
                checked={
                  branding.showCompanyPhone
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showCompanyPhone',
                    value,
                  )
                }
                label="Prikaži telefon"
              />

              <Toggle
                checked={
                  branding.showCompanyEmail
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showCompanyEmail',
                    value,
                  )
                }
                label="Prikaži e-mail"
              />

              <Toggle
                checked={
                  branding.showCompanyIban
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showCompanyIban',
                    value,
                  )
                }
                label="Prikaži IBAN"
              />

              <Toggle
                checked={
                  branding.showCompanyOib
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showCompanyOib',
                    value,
                  )
                }
                label="Prikaži OIB"
              />

              <Toggle
                checked={
                  branding.showCompanyWebsite
                }
                onChange={(
                  value,
                ) =>
                  update(
                    'showCompanyWebsite',
                    value,
                  )
                }
                label="Prikaži web stranicu"
              />
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <p className="mb-4 text-sm font-semibold text-slate-300">
              Pregled izgleda
            </p>

            <div
              className="relative aspect-[210/297] overflow-hidden rounded-xl p-5 shadow-2xl"
              style={{
                backgroundColor:
                  branding.backgroundColor,
                color:
                  branding.textColor,
              }}
            >
              {branding.showBackgroundImage &&
                branding.backgroundImage && (
                  <img
                    src={
                      branding.backgroundImage
                    }
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}

              <div
                className="relative rounded-lg p-4"
                style={{
                  backgroundColor:
                    branding.secondaryColor,
                }}
              >
                <div
                  className={`flex items-center gap-3 ${
                    branding.headerAlignment ===
                    'center'
                      ? 'justify-center text-center'
                      : branding.headerAlignment ===
                          'right'
                        ? 'justify-end text-right'
                        : ''
                  }`}
                >
                  {branding.showLogo &&
                    branding.logo && (
                      <img
                        src={
                          branding.logo
                        }
                        alt="Logo"
                        className="h-12 w-16 rounded bg-white object-contain p-1"
                      />
                    )}

                  <div>
                    <p className="text-sm font-extrabold text-white">
                      {branding.companyName ||
                        'Naziv tvrtke'}
                    </p>

                    <p className="mt-1 text-[9px] text-slate-300">
                      {
                        branding.companyAddress
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="relative mt-4 rounded-md px-3 py-2 text-[10px] font-bold text-white"
                style={{
                  backgroundColor:
                    branding.primaryColor,
                }}
              >
                PODACI O KUPCU I
                NALOGU
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-3 text-[9px]">
                <div className="space-y-2">
                  <p>
                    <b>
                      Kupac:
                    </b>
                    <br />
                    Primjer kupca
                    d.o.o.
                  </p>

                  <p>
                    <b>
                      Adresa:
                    </b>
                    <br />
                    Primjer ulica
                    1
                  </p>
                </div>

                <div className="space-y-2">
                  <p>
                    <b>
                      Datum:
                    </b>
                    <br />
                    08. 08. 2026.
                  </p>

                  <p>
                    <b>
                      Dolazak:
                    </b>
                    <br />
                    08:00
                  </p>
                </div>
              </div>

              <div
                className="relative mt-5 rounded-md px-3 py-2 text-[10px] font-bold text-white"
                style={{
                  backgroundColor:
                    branding.primaryColor,
                }}
              >
                OPIS RADOVA
              </div>

              <div
                className="relative mt-3 h-20 rounded-md border p-3 text-[8px]"
                style={{
                  borderColor:
                    branding.borderColor,
                }}
              >
                Servis i pregled
                instalacije.
                Izvršeni potrebni
                radovi.
              </div>

              <div
                className="relative mt-5 rounded-md px-3 py-2 text-[10px] font-bold text-white"
                style={{
                  backgroundColor:
                    branding.primaryColor,
                }}
              >
                MATERIJAL
              </div>

              <div
                className="relative mt-3 rounded-md border p-3 text-[8px]"
                style={{
                  borderColor:
                    branding.borderColor,
                }}
              >
                Materijal 1 — 2
                kom
                <br />
                Materijal 2 — 1
                kom
              </div>

              <div className="relative mt-8 flex items-end justify-between">
                {branding.showStamp &&
                  branding.stamp ? (
                    <img
                      src={
                        branding.stamp
                      }
                      alt="Pečat"
                      className="h-20 w-24 object-contain"
                    />
                  ) : (
                    <div className="h-20 w-24" />
                  )}

                <div className="text-right text-[8px]">
                  <div className="mb-2 h-8 w-24 border-b border-slate-400" />

                  Potpis
                  investitora
                </div>
              </div>

              {branding.watermarkText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="-rotate-45 text-3xl font-black opacity-[0.035]">
                    {
                      branding.watermarkText
                    }
                  </span>
                </div>
              )}

              {branding.footerText && (
                <p className="absolute bottom-3 left-4 right-4 text-center text-[7px] opacity-60">
                  {
                    branding.footerText
                  }
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-sm font-semibold text-blue-300">
              Zajedničke
              postavke firme
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Nakon spremanja
              svi korisnici ove
              tvrtke koriste
              ovaj izgled pri
              izradi PDF radnog
              naloga.
            </p>
          </div>
        </div>
      </div>

      {(isSaving ||
        isResetting) && (
        <FersysLoader
          fullScreen
          text={
            isSaving
              ? 'Spremanje izgleda radnog naloga...'
              : 'Vraćanje zadanog izgleda...'
          }
        />
      )}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
}) {
  return (
    <label>
      <span className="text-sm font-semibold text-slate-300">
        {label}
      </span>

      <input
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
}) {
  return (
    <label>
      <span className="text-sm font-semibold text-slate-300">
        {label}
      </span>

      <textarea
        rows={3}
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 w-full rounded-xl bg-slate-800 p-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
      />
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
  onChange: (
    value: string,
  ) => void
}) {
  return (
    <label className="rounded-xl bg-slate-800/70 p-4">
      <span className="text-sm font-semibold text-slate-300">
        {label}
      </span>

      <div className="mt-3 flex gap-3">
        <input
          type="color"
          value={value}
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          className="h-11 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
        />

        <input
          value={value}
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          className="h-11 min-w-0 flex-1 rounded-lg bg-slate-950 px-3 text-white outline-none"
        />
      </div>
    </label>
  )
}

function ImageCard({
  title,
  value,
  icon,
  onUpload,
  onRemove,
}: {
  title: string
  value: string
  icon: React.ReactNode
  onUpload: (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-2xl bg-slate-800/70 p-4">
      <div className="flex items-center gap-2 text-white">
        {icon}

        <span className="font-semibold">
          {title}
        </span>
      </div>

      <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white">
        {value ? (
          <img
            src={value}
            alt={title}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="text-sm text-slate-500">
            Nije učitano
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <label className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white">
          Učitaj

          <input
            type="file"
            accept="image/*"
            onChange={
              onUpload
            }
            className="hidden"
          />
        </label>

        <button
          type="button"
          disabled={!value}
          onClick={onRemove}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Trash2
            size={18}
          />
        </button>
      </div>
    </div>
  )
}