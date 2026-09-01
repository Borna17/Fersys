import type { MouseEvent } from 'react'

import { SupportPage as SupportPageContent } from './SupportPageContent'

const manualViewerHref = 'https://www.fersys.app/korisnicki-prirucnik'
const legacyGithubManualHref =
  'https://github.com/Borna17/Fersys/blob/main/public/FERSYS-Korisnicki-prirucnik.pdf'

export function SupportPage() {
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

  return (
    <section onClickCapture={handleClickCapture}>
      <SupportPageContent />
    </section>
  )
}
