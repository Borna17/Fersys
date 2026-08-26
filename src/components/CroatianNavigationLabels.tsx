import { useEffect } from 'react'

/**
 * Sigurnosna HR lokalizacija za stare navigacijske oznake.
 * Ne dira rute ni podatke, samo preostali tekst "Dashboard" u UI-ju.
 */
export default function CroatianNavigationLabels() {
  useEffect(() => {
    function translateDashboardLabel() {
      const dashboardLinks =
        document.querySelectorAll<HTMLAnchorElement>(
          'a[href="/dashboard"]',
        )

      dashboardLinks.forEach((link) => {
        link
          .querySelectorAll<HTMLElement>('span')
          .forEach((span) => {
            if (
              span.textContent?.trim() ===
              'Dashboard'
            ) {
              span.textContent = 'Početna'
            }
          })

        if (link.title === 'Dashboard') {
          link.title = 'Početna'
        }
      })
    }

    translateDashboardLabel()

    const observer = new MutationObserver(
      translateDashboardLabel,
    )

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
