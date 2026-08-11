import type { LucideIcon } from 'lucide-react'
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  completeOnboarding,
  saveOnboardingStep,
  skipOnboarding,
} from '../services/onboarding.service'

type TutorialStep = {
  title: string
  description: string
  icon: LucideIcon
  tips: string[]
}

type Props = {
  displayName: string
  initialStep: number
  onClose: () => void
}

const steps: TutorialStep[] = [
  {
    title: 'Dobrodošao u FERSYS',
    description:
      'Upoznaj najvažnije dijelove aplikacije prije nego odabereš module koje želiš koristiti.',
    icon: Sparkles,
    tips: [
      'Tutorijal traje oko minute.',
      'Napredak se automatski sprema.',
      'Možeš ga ponovno pokrenuti iz profila ili Postavki.',
    ],
  },
  {
    title: 'Početna i investitori',
    description:
      'Na Početnoj vidiš najvažnije podatke, a u Investitorima vodiš osobe, tvrtke i zgrade s njihovom poviješću.',
    icon: Gauge,
    tips: [
      'Početna se puni stvarnim podacima tvoje tvrtke.',
      'Investitore možeš pretraživati po imenu i OIB-u.',
      'Svaki investitor ima vlastiti profil.',
    ],
  },
  {
    title: 'Radni nalozi',
    description:
      'Radni nalog povezuje posao, radnike, materijal, fotografije, vrijeme rada, potpis i završni PDF.',
    icon: ClipboardList,
    tips: [
      'Na mobitelu je unos prilagođen radu na terenu.',
      'Fotografije i potpis ostaju vezani uz nalog.',
      'Završen nalog možeš ponovno otvoriti i preuzeti.',
    ],
  },
  {
    title: 'Ponude, računi i kalendar',
    description:
      'Ponude i računi imaju vlastite profesionalne dokumente, a Kalendar služi za planiranje termina i poslova.',
    icon: FileText,
    tips: [
      'Ponude i računi povezuju se s investitorima.',
      'Kalendar upozorava na preklapanja.',
      'Na mobitelu koristi donju navigaciju i veliki + za brze akcije.',
    ],
  },
  {
    title: 'Obavijesti na telefonu',
    description:
      'Zvonce na vrhu prikazuje FERSYS obavijesti. Kada dopustiš obavijesti, važne poruke mogu stići i kada FERSYS nije otvoren.',
    icon: BellRing,
    tips: [
      'Broj na zvoncu pokazuje nepročitane obavijesti.',
      'Klik na obavijest otvara odgovarajući dio FERSYS-a.',
      'Dozvole obavijesti možeš promijeniti i u postavkama telefona.',
    ],
  },
  {
    title: 'Odaberi svoje module',
    description:
      'Nakon tutorijala FERSYS će te pitati koje module želiš koristiti. Tako aplikacija ostaje jednostavna i prilagođena tvojoj tvrtki.',
    icon: Settings,
    tips: [
      'Možeš uključiti samo ono što ti sada treba.',
      'Odabir nije trajan.',
      'Module uvijek možeš promijeniti u Postavke → Moduli.',
    ],
  },
  {
    title: 'Spreman si',
    description:
      'Završi tutorijal i odmah nakon toga odaberi module za svoju tvrtku.',
    icon: CheckCircle2,
    tips: [
      'Sljedeći ekran je odabir modula.',
      'Postavke, podrška i obavijesti ostaju dostupne.',
      'FERSYS možeš koristiti na računalu i mobitelu.',
    ],
  },
]

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(
    steps.length - 1,
    Math.max(0, Math.floor(value)),
  )
}

export default function OnboardingTutorial({
  displayName,
  initialStep,
  onClose,
}: Props) {
  const [stepIndex, setStepIndex] =
    useState(clamp(initialStep))
  const [isSaving, setIsSaving] =
    useState(false)
  const [error, setError] =
    useState('')

  const step = steps[stepIndex]
  const Icon = step.icon
  const isFirst = stepIndex === 0
  const isLast =
    stepIndex === steps.length - 1

  const firstName = useMemo(
    () =>
      displayName
        .trim()
        .split(/\s+/)[0] ||
      'Korisniče',
    [displayName],
  )

  useEffect(() => {
    const timeout =
      window.setTimeout(() => {
        void saveOnboardingStep(
          stepIndex,
        ).catch((saveError) => {
          console.error(
            'Napredak tutorijala nije spremljen:',
            saveError,
          )
        })
      }, 200)

    return () =>
      window.clearTimeout(timeout)
  }, [stepIndex])

  async function finish() {
    if (isSaving) return

    try {
      setIsSaving(true)
      setError('')
      await completeOnboarding()
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Tutorijal nije moguće završiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function skip() {
    if (isSaving) return

    try {
      setIsSaving(true)
      setError('')
      await skipOnboarding()
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Tutorijal nije moguće preskočiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function next() {
    if (isLast) {
      void finish()
      return
    }

    setError('')
    setStepIndex((current) =>
      clamp(current + 1),
    )
  }

  function previous() {
    setError('')
    setStepIndex((current) =>
      clamp(current - 1),
    )
  }

  const progress =
    ((stepIndex + 1) /
      steps.length) *
    100

  return (
    <div className="fixed inset-0 z-[210] overflow-y-auto bg-slate-950/95 p-3 backdrop-blur-xl sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-center">
        <section className="relative w-full overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
          <div
            className="absolute left-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />

          <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400 sm:text-xs">
                FERSYS TUTORIJAL
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Korak {stepIndex + 1} od {steps.length}
              </p>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                void skip()
              }
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400 transition active:scale-95"
              aria-label="Preskoči tutorijal"
            >
              <X size={20} />
            </button>
          </header>

          <div className="grid md:grid-cols-[250px_1fr]">
            <aside className="hidden border-r border-slate-800 bg-slate-950/45 p-6 md:block">
              <div className="space-y-2">
                {steps.map(
                  (item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() =>
                        setStepIndex(index)
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                        index === stepIndex
                          ? 'bg-blue-500/15 text-blue-300'
                          : index < stepIndex
                            ? 'text-emerald-400'
                            : 'text-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] ${
                          index === stepIndex
                            ? 'bg-blue-600 text-white'
                            : index < stepIndex
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {index < stepIndex
                          ? '✓'
                          : index + 1}
                      </span>
                      <span className="truncate">
                        {item.title}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </aside>

            <main className="p-5 sm:p-8">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                <Icon size={31} />
              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                {stepIndex === 0
                  ? `Pozdrav, ${firstName}`
                  : `Korak ${stepIndex + 1}`}
              </p>

              <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                {step.title}
              </h1>

              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                {step.description}
              </p>

              <div className="mt-6 space-y-3">
                {step.tips.map(
                  (tip) => (
                    <div
                      key={tip}
                      className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4"
                    >
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-400"
                      />
                      <p className="text-sm leading-5 text-slate-300">
                        {tip}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {error && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="mt-7 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={
                    isFirst ||
                    isSaving
                  }
                  onClick={previous}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft
                    size={18}
                  />
                  Natrag
                </button>

                <div className="flex items-center gap-1.5 md:hidden">
                  {steps.map(
                    (_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 rounded-full transition-all ${
                          index === stepIndex
                            ? 'w-5 bg-blue-500'
                            : 'w-1.5 bg-slate-700'
                        }`}
                      />
                    ),
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={next}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving
                    ? 'Spremanje...'
                    : isLast
                      ? 'Odaberi module'
                      : 'Dalje'}
                  {!isLast && (
                    <ChevronRight
                      size={18}
                    />
                  )}
                </button>
              </div>
            </main>
          </div>
        </section>
      </div>
    </div>
  )
}
