import {
  useEffect,
  type MouseEvent,
} from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

import { SupportPage as SupportPageContent } from './SupportPageContent'

const manualPdfHref =
  'https://www.fersys.app/FERSYS-Korisnicki-prirucnik.pdf'
const legacyGithubManualHref =
  'https://github.com/Borna17/Fersys/blob/main/public/FERSYS-Korisnicki-prirucnik.pdf'
const legacyManualViewerHref =
  'https://www.fersys.app/korisnicki-prirucnik'

async function openManual() {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url: manualPdfHref,
      presentationStyle: 'popover',
    })
    return
  }

  window.open(
    manualPdfHref,
    '_blank',
    'noopener,noreferrer',
  )
}

export function SupportPage() {
  useEffect(() => {
    const manualLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a'),
    ).filter((link) => {
      const href = link.getAttribute('href') ?? ''
      const text = link.textContent ?? ''

      return (
        href === legacyGithubManualHref ||
        href === legacyManualViewerHref ||
        text.includes('Otvori PDF')
      )
    })

    manualLinks.forEach((link) => {
      link.dataset.downloadFeedback = 'false'
      link.href = manualPdfHref
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
      href === legacyManualViewerHref ||
      href === manualPdfHref ||
      (link.textContent ?? '').includes('Otvori PDF')

    if (!isManualOpenLink) return

    event.preventDefault()
    event.stopPropagation()
    void openManual()
  }

  return (
    <section onClickCapture={handleClickCapture}>
      <SupportPageContent />
    </section>
  )
}
