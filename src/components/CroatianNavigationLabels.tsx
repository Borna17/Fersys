import { useEffect } from 'react'
import { getAppLanguage, translateUiText } from '../services/appLanguage.service'

/**
 * Compatibility layer for legacy Dashboard labels.
 * Keeps the route untouched and follows the language selected by the user.
 */
export default function CroatianNavigationLabels() {
  useEffect(() => {
    function translateDashboardLabel() {
      const language = getAppLanguage()
      const label = translateUiText('Početna', language)
      const dashboardLinks = document.querySelectorAll<HTMLAnchorElement>(
        'a[href="/dashboard"]',
      )

      dashboardLinks.forEach((link) => {
        link.querySelectorAll<HTMLElement>('span').forEach((span) => {
          const value = span.textContent?.trim()
          if (value === 'Dashboard' || value === 'Početna' || value === 'Home') {
            span.textContent = label
          }
        })

        if (link.title === 'Dashboard' || link.title === 'Početna' || link.title === 'Home') {
          link.title = label
        }
      })
    }

    translateDashboardLabel()

    const observer = new MutationObserver(translateDashboardLabel)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    window.addEventListener('fersys:language-changed', translateDashboardLabel)

    return () => {
      observer.disconnect()
      window.removeEventListener('fersys:language-changed', translateDashboardLabel)
    }
  }, [])

  return null
}
