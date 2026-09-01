import { useEffect } from 'react'

import { SupportPage as SupportPageContent } from './SupportPageContent'

const manualOpenHref = '/FERSYS-Korisnicki-prirucnik.pdf'
const legacyGithubManualHref =
  'https://github.com/Borna17/Fersys/blob/main/public/FERSYS-Korisnicki-prirucnik.pdf'

export function SupportPage() {
  useEffect(() => {
    const manualLink = document.querySelector<HTMLAnchorElement>(
      `a[href="${legacyGithubManualHref}"]`,
    )

    if (manualLink) {
      manualLink.href = manualOpenHref
    }
  }, [])

  return <SupportPageContent />
}
