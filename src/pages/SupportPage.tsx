import type { MouseEvent } from 'react'

import { SupportPage as SupportPageContent } from './SupportPageContent'

const manualViewerHref = '/support?manual=1'
const legacyGithubManualHref =
  'https://github.com/Borna17/Fersys/blob/main/public/FERSYS-Korisnicki-prirucnik.pdf'
const manualPdfHref = '/FERSYS-Korisnicki-prirucnik.pdf'

export function SupportPage() {
  const showManual =
    new URLSearchParams(window.location.search).get('manual') === '1'

  function handleClickCapture(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null
    const link = target?.closest('a') as HTMLAnchorElement | null

    if (!link) return

    const href = link.getAttribute('href') ?? ''
    const isManualOpenLink =
      href === legacyGithubManualHref ||
      (link.textContent ?? '').includes('Otvori PDF')

    if (!isManualOpenLink) return

    event.preventDefault()
    event.stopPropagation()
    window.location.assign(manualViewerHref)
  }

  if (showManual) {
    return (
      <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-10">
        <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                FERSYS • POMOĆ I DOKUMENTACIJA
              </p>
              <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">
                Korisnički priručnik
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Službeni FERSYS vodič otvoren unutar aplikacije.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <a
                href="/support"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Natrag na podršku
              </a>
              <a
                href={manualPdfHref}
                download="FERSYS-Korisnicki-prirucnik.pdf"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500"
              >
                Preuzmi PDF
              </a>
            </div>
          </div>

          <div className="bg-slate-950 p-2 sm:p-4">
            <iframe
              src={manualPdfHref}
              title="FERSYS korisnički priručnik"
              className="h-[78dvh] min-h-[620px] w-full rounded-2xl border border-slate-800 bg-white"
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section onClickCapture={handleClickCapture}>
      <SupportPageContent />
    </section>
  )
}
