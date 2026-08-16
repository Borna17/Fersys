import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Palette,
  RotateCcw,
  Save,
} from 'lucide-react'
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import {
  defaultDeliveryNotePdfSettings,
  getDeliveryNotePdfSettings,
  saveDeliveryNotePdfSettings,
  type DeliveryNotePdfPreset,
  type DeliveryNotePdfSettings,
} from '../services/deliveryNoteAppearance.service'

const presets:
Array<{
  id:
    DeliveryNotePdfPreset
  label: string
  description: string
}> = [
  {
    id: 'modern',
    label: 'Modern',
    description:
      'Čist FERSYS izgled s naglašenom bojom tvrtke.',
  },
  {
    id: 'classic',
    label: 'Classic',
    description:
      'Klasičan poslovni dokument s tamnoplavim naglascima.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description:
      'Jednostavan i kompaktan izgled za maksimalnu čitljivost.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description:
      'Vlastite boje i prikaz elemenata.',
  },
]

export function DeliveryNoteSettingsPage() {
  const navigate =
    useNavigate()

  const [
    settings,
    setSettings,
  ] =
    useState<
      DeliveryNotePdfSettings
    >(
      defaultDeliveryNotePdfSettings,
    )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  useEffect(() => {
    let cancelled =
      false

    void (async () => {
      try {
        setLoading(true)
        const value =
          await getDeliveryNotePdfSettings()

        if (
          !cancelled
        ) {
          setSettings(
            value,
          )
        }
      } catch (value) {
        if (
          !cancelled
        ) {
          setError(
            value instanceof
              Error
              ? value.message
              : 'Postavke nije moguće učitati.',
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  function patch(
    value:
      Partial<
        DeliveryNotePdfSettings
      >,
  ) {
    setMessage('')
    setSettings(
      (current) => ({
        ...current,
        ...value,
      }),
    )
  }

  function applyPreset(
    preset:
      DeliveryNotePdfPreset,
  ) {
    if (
      preset ===
      'modern'
    ) {
      patch({
        ...defaultDeliveryNotePdfSettings,
        preset,
      })
      return
    }

    if (
      preset ===
      'classic'
    ) {
      patch({
        ...defaultDeliveryNotePdfSettings,
        preset,
        primaryColor:
          '#1E3A5F',
        secondaryColor:
          '#111827',
        accentColor:
          '#64748B',
        borderColor:
          '#94A3B8',
      })
      return
    }

    if (
      preset ===
      'minimal'
    ) {
      patch({
        ...defaultDeliveryNotePdfSettings,
        preset,
        primaryColor:
          '#111827',
        secondaryColor:
          '#FFFFFF',
        accentColor:
          '#64748B',
        borderColor:
          '#E5E7EB',
        compactTable:
          true,
      })
      return
    }

    patch({
      ...settings,
      preset:
        'custom',
    })
  }

  async function save() {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      const value =
        await saveDeliveryNotePdfSettings(
          settings,
        )

      setSettings(value)
      setMessage(
        'Izgled otpremnice je spremljen.',
      )
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Postavke nije moguće spremiti.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-400">
        Učitavanje...
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1300px] space-y-5 pb-20">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/inventory/delivery-notes',
          )
        }
        className="inline-flex items-center gap-2 text-sm font-black text-slate-400"
      >
        <ArrowLeft
          size={18}
        />
        Otpremnice
      </button>

      <header className="rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 to-violet-950/30 p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
            <Palette
              size={22}
            />
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
              POSTAVKE → IZGLED DOKUMENATA
            </p>
            <h1 className="mt-1 text-3xl font-black text-white">
              Otpremnica
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Modern / Classic / Minimal / Custom, logo, pečat, potpisi i footer.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
          <CheckCircle2
            size={18}
          />
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
        <div className="space-y-5">
          <Card
            title="Predložak"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {presets.map(
                (
                  preset,
                ) => (
                  <button
                    type="button"
                    key={
                      preset.id
                    }
                    onClick={() =>
                      applyPreset(
                        preset.id,
                      )
                    }
                    className={`rounded-2xl border p-4 text-left ${
                      settings.preset ===
                      preset.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-800 bg-slate-950/45'
                    }`}
                  >
                    <strong className="text-white">
                      {preset.label}
                    </strong>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {preset.description}
                    </p>
                  </button>
                ),
              )}
            </div>
          </Card>

          <Card
            title="Boje"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Color
                label="Glavna"
                value={
                  settings.primaryColor
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    primaryColor:
                      value,
                    preset:
                      'custom',
                  })
                }
              />
              <Color
                label="Sekundarna"
                value={
                  settings.secondaryColor
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    secondaryColor:
                      value,
                    preset:
                      'custom',
                  })
                }
              />
              <Color
                label="Naglasak"
                value={
                  settings.accentColor
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    accentColor:
                      value,
                    preset:
                      'custom',
                  })
                }
              />
            </div>
          </Card>

          <Card
            title="Elementi dokumenta"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Logo tvrtke"
                value={
                  settings.showLogo
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    showLogo:
                      value,
                  })
                }
              />
              <Toggle
                label="Pečat"
                value={
                  settings.showStamp
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    showStamp:
                      value,
                  })
                }
              />
              <Toggle
                label="Potpisi"
                value={
                  settings.showSignatures
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    showSignatures:
                      value,
                  })
                }
              />
              <Toggle
                label="Povezani dokumenti"
                value={
                  settings.showRelatedDocuments
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    showRelatedDocuments:
                      value,
                  })
                }
              />
              <Toggle
                label="Footer"
                value={
                  settings.showFooter
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    showFooter:
                      value,
                  })
                }
              />
              <Toggle
                label="Kompaktna tablica"
                value={
                  settings.compactTable
                }
                onChange={(
                  value,
                ) =>
                  patch({
                    compactTable:
                      value,
                  })
                }
              />
            </div>
          </Card>

          <Card
            title="Tekst"
          >
            <label className={labelClass}>
              Naslov dokumenta
              <input
                value={
                  settings.title
                }
                onChange={(
                  event,
                ) =>
                  patch({
                    title:
                      event
                        .target
                        .value,
                  })
                }
                className={inputClass}
              />
            </label>

            <label className={`${labelClass} mt-4 block`}>
              Footer
              <textarea
                value={
                  settings.footerText
                }
                onChange={(
                  event,
                ) =>
                  patch({
                    footerText:
                      event
                        .target
                        .value,
                  })
                }
                rows={3}
                className={`${inputClass} h-auto py-3`}
              />
            </label>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-5 xl:self-start">
          <Card
            title="Pregled"
          >
            <div
              className="aspect-[1/1.414] overflow-hidden rounded-2xl border border-slate-700 bg-white p-5"
              style={{
                color:
                  settings.textColor,
              }}
            >
              <div
                className="h-1.5 rounded-full"
                style={{
                  background:
                    settings.primaryColor,
                }}
              />

              <div className="mt-5 flex items-start justify-between">
                <div>
                  <div className="h-8 w-20 rounded bg-slate-100" />
                  <div className="mt-2 h-2 w-28 rounded bg-slate-200" />
                </div>

                <div className="text-right">
                  <p
                    className="text-xl font-black"
                    style={{
                      color:
                        settings.secondaryColor,
                    }}
                  >
                    {settings.title}
                  </p>
                  <p
                    className="mt-1 text-[6px] font-black uppercase"
                    style={{
                      color:
                        settings.primaryColor,
                    }}
                  >
                    Dokument isporuke
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="h-20 rounded-lg border border-slate-200" />
                <div className="h-20 rounded-lg border border-slate-200" />
              </div>

              <div
                className="mt-4 h-7 rounded-t-lg"
                style={{
                  background:
                    settings.primaryColor,
                }}
              />

              {[1,2,3,4].map(
                (row) => (
                  <div
                    key={
                      row
                    }
                    className="grid h-9 grid-cols-[30px_1fr_60px] items-center border-x border-b border-slate-200 px-2"
                  >
                    <div className="h-2 w-3 rounded bg-slate-200" />
                    <div className="h-2 w-24 rounded bg-slate-200" />
                    <div className="h-2 w-8 justify-self-end rounded bg-slate-200" />
                  </div>
                ),
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="h-24 rounded-lg border border-slate-200" />
                <div className="h-24 rounded-lg border border-slate-200" />
              </div>
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Eye
                size={15}
              />
              PDF koristi logo, pečat i podatke tvrtke iz postojećih FERSYS postavki.
            </p>
          </Card>
        </aside>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            setSettings(
              defaultDeliveryNotePdfSettings,
            )
          }
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 font-black text-white"
        >
          <RotateCcw
            size={17}
          />
          Vrati zadano
        </button>

        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            void save()
          }
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-6 font-black text-white disabled:opacity-50"
        >
          <Save
            size={17}
          />
          {saving
            ? 'Spremanje...'
            : 'Spremi izgled'}
        </button>
      </div>
    </section>
  )
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500'

const labelClass =
  'text-xs font-black uppercase tracking-wide text-slate-500'

function Card({
  title,
  children,
}: {
  title: string
  children:
    ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 font-black text-white">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Color({
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
    <label className={labelClass}>
      {label}
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-2">
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
          className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent"
        />
        <span className="text-xs font-bold text-slate-300">
          {value}
        </span>
      </div>
    </label>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (
    value: boolean,
  ) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <span className="text-sm font-bold text-slate-200">
        {label}
      </span>

      <input
        type="checkbox"
        checked={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="h-4 w-4"
      />
    </label>
  )
}

export default DeliveryNoteSettingsPage
