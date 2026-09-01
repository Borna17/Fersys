import {
  useEffect,
  type MouseEvent,
} from 'react'

import { SupportPage as SupportPageContent } from './SupportPageContent'

const manualViewerHref = 'https://www.fersys.app/korisnicki-prirucnik'
const legacyGithubManualHref =
  'https://github.com/Borna17/Fersys/blob/main/public/FERSYS-Korisnicki-prirucnik.pdf'

export function SupportPage() {
  useEffect(() => {
    const manualLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a'),
    ).filter((link) => {
      const href = link.getAttribute('href') ?? ''
      const text = link.textContent ?? ''

      return (
        href === legacyGithubManualHref ||
        text.includes('Otvori PDF')
      )
    })

    manualLinks.forEach((link) => {
      link.dataset.downloadFeedback = 'false'
      link.href = manualViewerHref
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    })
  }, [])

  function handleClickCapture(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null
    const link = target?.closest('a') as HTMLAnchorElement | null

    if (!link) return

    const href = link.getAttribute('href') ?? ''
    const isManualOpenLink =
      href === legacyGithubManualHref ||
      href === manualViewerHref ||
      (link.textContent ?? '').includes('Otvori PDF')

    if (!isManualOpenLink) return

    event.preventDefault()
    event.stopPropagation()
    window.open(
      manualViewerHref,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <section onClickCapture={handleClickCapture}>
      <SupportPageContent />
    </section>
  )
}
