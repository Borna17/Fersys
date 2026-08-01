import {
  AlertCircle,
  Bot,
  PackageSearch,
  ReceiptText,
  Sparkles,
} from 'lucide-react'

const recommendations = [
  {
    title: '3 radna naloga kasne',
    description:
      'Predlažem da pregledate naloge kojima je prošao planirani rok završetka.',
    icon: AlertCircle,
    colour: 'text-red-400 bg-red-500/15',
  },
  {
    title: 'Zaliha materijala je niska',
    description:
      'Bakrena cijev 1/4 i izolacija približavaju se minimalnoj zalihi.',
    icon: PackageSearch,
    colour: 'text-amber-400 bg-amber-500/15',
  },
  {
    title: '2 računa nisu plaćena',
    description:
      'Ukupna vrijednost neplaćenih računa iznosi 480 €.',
    icon: ReceiptText,
    colour: 'text-blue-400 bg-blue-500/15',
  },
]

export default function AiRecommendations() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-900 p-6">
      <div className="pointer-events-none absolute right-[-90px] top-[-90px] h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <Bot size={24} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                AI preporuke
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Najvažnije stvari koje traže vašu pažnju.
              </p>
            </div>
          </div>

          <Sparkles size={22} className="text-violet-400" />
        </div>

        <div className="mt-6 space-y-3">
          {recommendations.map((recommendation) => {
            const Icon = recommendation.icon

            return (
              <article
                key={recommendation.title}
                className="rounded-2xl bg-slate-800/70 p-4 transition hover:bg-slate-800"
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${recommendation.colour}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">
                      {recommendation.title}
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {recommendation.description}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
        >
          Otvori AI pomoćnika
        </button>
      </div>
    </section>
  )
}
