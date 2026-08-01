import { useEffect, useState, type ChangeEvent } from 'react'
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
  defaultWorkOrderBranding,
  type WorkOrderBranding,
} from '../types/workOrder'
import { fileToCompressedDataUrl } from '../utils/imageUtils'
import {
  readBranding,
  writeBranding,
} from '../utils/workOrderStorage'

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/70 px-4 py-3">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-blue-600"
      />
    </label>
  )
}

export function WorkOrderSettingsPage() {
  const [branding, setBranding] = useState<WorkOrderBranding>(() =>
    readBranding(),
  )
  const [saved, setSaved] = useState(false)
  useEffect(() => {
  writeBranding(branding)
}, [branding])

  function update<K extends keyof WorkOrderBranding>(
    key: K,
    value: WorkOrderBranding[K],
  ) {
    setSaved(false)
    setBranding((current) => ({ ...current, [key]: value }))
  }

  async function handleImage(
    event: ChangeEvent<HTMLInputElement>,
    key: 'logo' | 'stamp' | 'backgroundImage',
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToCompressedDataUrl(
        file,
        key === 'backgroundImage' ? 1800 : 1000,
        key === 'backgroundImage' ? 1800 : 1000,
        0.84,
      )
      update(key, dataUrl)
    } catch {
      alert('Sliku nije moguće učitati.')
    } finally {
      event.target.value = ''
    }
  }

  function saveSettings() {
    writeBranding(branding)
    setSaved(true)
  }

  function resetSettings() {
    setBranding(defaultWorkOrderBranding)
    setSaved(false)
  }

  return (
    <section className="mx-auto w-full max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Izgled radnog naloga
          </h1>
          <p className="mt-2 text-slate-400">
            Prilagodi boje, logo, pozadinu, pečat i podatke tvrtke.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetSettings}
            className="flex h-12 items-center gap-2 rounded-xl bg-slate-800 px-5 font-semibold text-white"
          >
            <RotateCcw size={18} />
            Vrati zadano
          </button>

          <button
            type="button"
            onClick={saveSettings}
            className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white"
          >
            <Save size={18} />
            {saved ? 'Spremljeno' : 'Spremi izgled'}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_430px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <Building2 className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">Podaci tvrtke</h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ['companyName', 'Naziv tvrtke'],
                ['companyOib', 'OIB tvrtke'],
                ['companyAddress', 'Adresa'],
                ['companyPhone', 'Telefon'],
                ['companyEmail', 'E-mail'],
                ['companyIban', 'IBAN'],
                ['companyWebsite', 'Web stranica'],
                ['footerText', 'Tekst u podnožju'],
                ['watermarkText', 'Vodeni žig'],
              ].map(([key, label]) => (
                <label key={key} className={key === 'footerText' || key === 'watermarkText' ? 'md:col-span-2' : ''}>
                  <span className="text-sm font-semibold text-slate-300">
                    {label}
                  </span>
                  <input
                    value={String(branding[key as keyof WorkOrderBranding] ?? '')}
                    onChange={(event) =>
                      update(
                        key as keyof WorkOrderBranding,
                        event.target.value as never,
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <Palette className="text-violet-400" />
              <h2 className="text-xl font-bold text-white">Boje i raspored</h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['primaryColor', 'Glavna boja'],
                ['secondaryColor', 'Sekundarna boja'],
                ['accentColor', 'Naglasna boja'],
                ['textColor', 'Boja teksta'],
                ['borderColor', 'Boja obruba'],
                ['backgroundColor', 'Boja pozadine'],
              ].map(([key, label]) => (
                <label key={key} className="rounded-xl bg-slate-800/70 p-4">
                  <span className="text-sm font-semibold text-slate-300">
                    {label}
                  </span>
                  <div className="mt-3 flex gap-3">
                    <input
                      type="color"
                      value={String(
                        branding[key as keyof WorkOrderBranding],
                      )}
                      onChange={(event) =>
                        update(
                          key as keyof WorkOrderBranding,
                          event.target.value as never,
                        )
                      }
                      className="h-11 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <input
                      value={String(
                        branding[key as keyof WorkOrderBranding],
                      )}
                      onChange={(event) =>
                        update(
                          key as keyof WorkOrderBranding,
                          event.target.value as never,
                        )
                      }
                      className="h-11 min-w-0 flex-1 rounded-lg bg-slate-950 px-3 text-white outline-none"
                    />
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-slate-300">
                  Stil PDF-a
                </span>
                <select
                  value={branding.layout}
                  onChange={(event) =>
                    update(
                      'layout',
                      event.target.value as WorkOrderBranding['layout'],
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
                >
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>

              <label>
                <span className="text-sm font-semibold text-slate-300">
                  Položaj loga
                </span>
                <select
                  value={branding.headerAlignment}
                  onChange={(event) =>
                    update(
                      'headerAlignment',
                      event.target.value as WorkOrderBranding['headerAlignment'],
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl bg-slate-800 px-4 text-white"
                >
                  <option value="left">Lijevo</option>
                  <option value="center">Sredina</option>
                  <option value="right">Desno</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <ImagePlus className="text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Slike i pečat</h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                ['logo', 'Logo', ImagePlus],
                ['stamp', 'Pečat / štambilj', Stamp],
                ['backgroundImage', 'Pozadinska slika', ImagePlus],
              ].map(([key, label, Icon]) => {
                const value = branding[key as 'logo' | 'stamp' | 'backgroundImage']
                return (
                  <div key={String(key)} className="rounded-2xl bg-slate-800/70 p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Icon size={18} />
                      <span className="font-semibold">{String(label)}</span>
                    </div>

                    <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white">
                      {value ? (
                        <img src={value} alt={String(label)} className="h-full w-full object-contain p-2" />
                      ) : (
                        <span className="text-sm text-slate-500">Nije učitano</span>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <label className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white">
                        Učitaj
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            handleImage(
                              event,
                              key as 'logo' | 'stamp' | 'backgroundImage',
                            )
                          }
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          update(
                            key as 'logo' | 'stamp' | 'backgroundImage',
                            '',
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold text-white">Što se prikazuje</h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Toggle checked={branding.showLogo} onChange={(value) => update('showLogo', value)} label="Prikaži logo" />
              <Toggle checked={branding.showStamp} onChange={(value) => update('showStamp', value)} label="Prikaži pečat" />
              <Toggle checked={branding.showBackgroundImage} onChange={(value) => update('showBackgroundImage', value)} label="Prikaži pozadinsku sliku" />
              <Toggle checked={branding.showCompanyPhone} onChange={(value) => update('showCompanyPhone', value)} label="Prikaži telefon" />
              <Toggle checked={branding.showCompanyEmail} onChange={(value) => update('showCompanyEmail', value)} label="Prikaži e-mail" />
              <Toggle checked={branding.showCompanyIban} onChange={(value) => update('showCompanyIban', value)} label="Prikaži IBAN" />
              <Toggle checked={branding.showCompanyOib} onChange={(value) => update('showCompanyOib', value)} label="Prikaži OIB" />
              <Toggle checked={branding.showCompanyWebsite} onChange={(value) => update('showCompanyWebsite', value)} label="Prikaži web stranicu" />
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
              style={{ backgroundColor: branding.backgroundColor }}
            >
              {branding.showBackgroundImage && branding.backgroundImage && (
                <img
                  src={branding.backgroundImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-10"
                />
              )}

              <div
                className="relative rounded-lg p-4"
                style={{ backgroundColor: branding.secondaryColor }}
              >
                <div
                  className={`flex items-center gap-3 ${
                    branding.headerAlignment === 'center'
                      ? 'justify-center text-center'
                      : branding.headerAlignment === 'right'
                        ? 'justify-end text-right'
                        : ''
                  }`}
                >
                  {branding.showLogo && branding.logo && (
                    <img
                      src={branding.logo}
                      alt="Logo"
                      className="h-12 w-16 rounded bg-white object-contain p-1"
                    />
                  )}

                  <div>
                    <p className="text-sm font-extrabold text-white">
                      {branding.companyName || 'Naziv tvrtke'}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-300">
                      {branding.companyAddress}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="relative mt-4 rounded-md px-3 py-2 text-[10px] font-bold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                PODACI O KUPCU I NALOGU
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-3 text-[9px]" style={{ color: branding.textColor }}>
                <div className="space-y-2">
                  <p><b>Kupac:</b><br />Primjer kupca d.o.o.</p>
                  <p><b>Adresa:</b><br />Primjer ulica 1</p>
                  <p><b>Telefon:</b><br />+385 91 000 0000</p>
                </div>
                <div className="space-y-2">
                  <p><b>Datum:</b><br />26. 7. 2026.</p>
                  <p><b>Dolazak:</b><br />08:00</p>
                  <p><b>Odlazak:</b><br />10:30</p>
                </div>
              </div>

              <div
                className="relative mt-5 rounded-md px-3 py-2 text-[10px] font-bold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                OPIS RADOVA
              </div>

              <div className="relative mt-3 space-y-2">
                <div className="h-2 rounded bg-slate-300/70" />
                <div className="h-2 w-5/6 rounded bg-slate-300/70" />
                <div className="h-2 w-2/3 rounded bg-slate-300/70" />
              </div>

              <div className="relative mt-6 grid grid-cols-2 gap-4">
                <div className="h-20 rounded-lg border border-slate-300/70" />
                <div className="h-20 rounded-lg border border-slate-300/70" />
              </div>

              {branding.watermarkText && (
                <div className="pointer-events-none absolute inset-0 flex -rotate-45 items-center justify-center text-3xl font-black text-slate-300/25">
                  {branding.watermarkText}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

