import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gauge,
  ReceiptText,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

import {
  completeOnboarding,
  saveOnboardingStep,
  skipOnboarding,
} from '../services/onboarding.service'

type TutorialStep = {
  title: string
  description: string
  icon: LucideIcon
  route?: string
  actionLabel?: string
  tips: string[]
}

type OnboardingTutorialProps = {
  displayName: string
  initialStep: number
  onClose: () => void
}

const steps: TutorialStep[] = [
  {
    title: 'Dobrodošao u FERSYS',
    description:
      'Kroz nekoliko kratkih koraka upoznat ćeš glavne dijelove aplikacije i gdje se što nalazi.',
    icon: Sparkles,
    tips: [
      'Tutorijal traje približno dvije minute.',
      'Napredak se automatski sprema.',
      'Možeš ga preskočiti i kasnije ponovno pokrenuti.',
    ],
  },
  {
    title: 'Dashboard',
    description:
      'Dashboard je početni pregled poslovanja. Ovdje vidiš aktivne naloge, kupce, termine i druge važne podatke.',
    icon: Gauge,
    route: '/dashboard',
    actionLabel: 'Otvori Dashboard',
    tips: [
      'Statistike se pune stvarnim podacima tvoje tvrtke.',
      'Novi račun počinje s praznim Dashboardom.',
      'Klikom na kartice brzo dolaziš do detalja.',
    ],
  },
  {
    title: 'Investitori',
    description:
      'U modulu Investitori vodiš fizičke osobe, tvrtke i zgrade te pratiš njihove kontakte i povijest poslova.',
    icon: UsersRound,
    route: '/customers',
    actionLabel: 'Otvori Kupce',
    tips: [
      'Pretražuj po imenu, OIB-u i kontaktu.',
      'Svaki investitor ima vlastiti profil.',
      'S profila investitora otvaraš naloge i dokumente.',
    ],
  },
  {
    title: 'Radni nalozi',
    description:
      'Radni nalog sadrži opis posla, radnike, materijal, fotografije, vrijeme rada, potpis i PDF dokument.',
    icon: ClipboardList,
    route: '/work-orders',
    actionLabel: 'Otvori Radne naloge',
    tips: [
      'Novi nalog otvaraš gumbom „Novi radni nalog”.',
      'Fotografije i potpis ostaju vezani uz nalog.',
      'Završen nalog možeš preuzeti kao PDF.',
    ],
  },
  {
    title: 'Ponude i računi',
    description:
      'U ovim modulima pripremaš ponude, izlazne račune i ulazne račune te pratiš njihov status.',
    icon: ReceiptText,
    route: '/offers/new',
    actionLabel: 'Otvori Novu ponudu',
    tips: [
      'Ponudu možeš spremiti kao nacrt.',
      'Status pokazuje je li ponuda poslana ili prihvaćena.',
      'Dokumenti se povezuju s investitorima i poslovima.',
    ],
  },
  {
    title: 'Kalendar',
    description:
      'Kalendar služi za planiranje poslova. FERSYS provjerava preklapanja i može se povezati s Google Kalendarom.',
    icon: CalendarDays,
    route: '/calendar',
    actionLabel: 'Otvori Kalendar',
    tips: [
      'Klikom na dan dodaješ novi termin.',
      'AI koristi isti kalendar kao i ručni unos.',
      'Termini se vide na svim uređajima.',
    ],
  },
  {
    title: 'Skladište',
    description:
      'U skladištu pratiš artikle, količine, ulaze, izlaze, inventuru i kretanje materijala.',
    icon: Boxes,
    route: '/inventory',
    actionLabel: 'Otvori Skladište',
    tips: [
      'Svaki artikl ima svoju karticu.',
      'Promjene količine ostaju zabilježene.',
      'QR skener ubrzava pronalazak artikla.',
    ],
  },
  {
    title: 'AI pomoćnik',
    description:
      'AI pomoćniku možeš pisati ili govoriti. On prvo priprema radnju, provjerava podatke i traži tvoju potvrdu.',
    icon: Bot,
    route: '/ai',
    actionLabel: 'Otvori AI pomoćnika',
    tips: [
      'Primjer: „Rezerviraj servis klime sutra u 10.”',
      'AI provjerava zauzetost, vikende i blagdane.',
      'Termin se ne sprema dok ga ne potvrdiš.',
    ],
  },
  {
    title: 'Spreman si za rad',
    description:
      'Osnovne funkcije su ti sada poznate. Možeš krenuti s dodavanjem prvog investitora i prvog radnog naloga.',
    icon: CheckCircle2,
    tips: [
      'Počni s unosom stvarnih podataka svoje tvrtke.',
      'Tutorijal možeš ponovno pokrenuti iz Postavki.',
      'FERSYS je dostupan na računalu i mobitelu.',
    ],
  },
]

function clampStep(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(
    steps.length - 1,
    Math.max(
      0,
      Math.floor(value),
    ),
  )
}

export default function OnboardingTutorial({
  displayName,
  initialStep,
  onClose,
}: OnboardingTutorialProps) {
  const navigate = useNavigate()

  const [
    stepIndex,
    setStepIndex,
  ] = useState(
    clampStep(initialStep),
  )

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const step =
    steps[stepIndex]

  const Icon =
    step.icon

  const progress =
    ((stepIndex + 1) /
      steps.length) *
    100

  const isFirst =
    stepIndex === 0

  const isLast =
    stepIndex ===
    steps.length - 1

  const greetingName =
    useMemo(
      () =>
        displayName
          .trim()
          .split(/\s+/)[0] ||
        'Korisniče',
      [displayName],
    )

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void saveOnboardingStep(
          stepIndex,
        ).catch(
          (saveError) => {
            console.error(
              'Napredak tutorijala nije spremljen:',
              saveError,
            )
          },
        )
      }, 250)

    return () => {
      window.clearTimeout(
        timeoutId,
      )
    }
  }, [stepIndex])

  function moveToStep(
    nextStep: number,
  ) {
    setStepIndex(
      clampStep(nextStep),
    )
    setError('')
  }

  async function handleOpenRoute() {
    if (!step.route || isSaving) {
      return
    }

    try {
      setIsSaving(true)
      setError('')

      const nextStep = clampStep(
        stepIndex + 1,
      )

      await saveOnboardingStep(
        nextStep,
      )

      navigate(step.route)

      if (!isLast) {
        setStepIndex(nextStep)
      }
    } catch (saveError) {
      console.error(
        'Stranicu tutorijala nije moguće otvoriti:',
        saveError,
      )

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Traženu stranicu trenutno nije moguće otvoriti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function finishTutorial() {
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

  async function handleSkip() {
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

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
        <div
          className="absolute left-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-300"
          style={{
            width: `${progress}%`,
          }}
        />

        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              FERSYS TUTORIJAL
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Korak {stepIndex + 1} od {steps.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleSkip()
            }}
            disabled={isSaving}
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
            aria-label="Preskoči tutorijal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid md:grid-cols-[290px_1fr]">
          <aside className="border-b border-slate-800 bg-slate-950/45 p-5 md:border-b-0 md:border-r md:p-7">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <Icon size={31} />
            </div>

            <h2 className="mt-5 text-2xl font-black text-white">
              {stepIndex === 0
                ? `Pozdrav, ${greetingName}!`
                : step.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {step.description}
            </p>

            <div className="mt-7 hidden space-y-2 md:block">
              {steps.map(
                (
                  item,
                  index,
                ) => (
                  <button
                    key={
                      item.title
                    }
                    type="button"
                    onClick={() =>
                      moveToStep(
                        index,
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                      index ===
                      stepIndex
                        ? 'bg-blue-600/15 text-blue-300'
                        : index <
                            stepIndex
                          ? 'text-emerald-400'
                          : 'text-slate-600 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${
                        index ===
                        stepIndex
                          ? 'bg-blue-600 text-white'
                          : index <
                              stepIndex
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {index <
                      stepIndex
                        ? '✓'
                        : index +
                          1}
                    </span>

                    <span className="truncate">
                      {
                        item.title
                      }
                    </span>
                  </button>
                ),
              )}
            </div>
          </aside>

          <main className="p-5 sm:p-7 md:p-9">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-400 sm:grid">
                  <Icon size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-400">
                    {stepIndex === 0
                      ? 'Početak'
                      : 'Što se ovdje nalazi'}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {step.title}
                  </h3>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {step.tips.map(
                  (tip) => (
                    <div
                      key={tip}
                      className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xs font-black text-blue-400">
                        ✓
                      </span>

                      <p className="text-sm leading-6 text-slate-300">
                        {tip}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {step.route &&
                step.actionLabel && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      void handleOpenRoute()
                    }}
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 text-sm font-bold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? 'Otvaranje...'
                      : step.actionLabel}
                  </button>
                )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  void handleSkip()
                }}
                disabled={isSaving}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
              >
                Preskoči tutorijal
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={
                    isFirst ||
                    isSaving
                  }
                  onClick={() =>
                    moveToStep(
                      stepIndex -
                        1,
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={18}
                  />
                  Natrag
                </button>

                {isLast ? (
                  <button
                    type="button"
                    onClick={() => {
                      void finishTutorial()
                    }}
                    disabled={
                      isSaving
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={18}
                    />

                    {isSaving
                      ? 'Spremanje...'
                      : 'Završi tutorijal'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      isSaving
                    }
                    onClick={() =>
                      moveToStep(
                        stepIndex +
                          1,
                      )
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    Dalje

                    <ChevronRight
                      size={18}
                    />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}