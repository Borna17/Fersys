import { useEffect } from 'react'
import { useLocation } from 'react-router'

const QUANTITY_TEXT = 'Kolicina'

export default function WorkOrderEditQuantityTextFix() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!/^\/work-orders\/[^/]+\/edit$/.test(pathname)) {
      return
    }

    let attempts = 0

    function applyFix() {
      attempts += 1

      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[type="number"]',
        ),
      ).filter((input) =>
        /^Koli/i.test(
          input.getAttribute('placeholder') ?? '',
        ),
      )

      for (const input of inputs) {
        input.placeholder = QUANTITY_TEXT

        const field = input.parentElement
        if (!field) continue

        const walker = document.createTreeWalker(
          field,
          NodeFilter.SHOW_TEXT,
        )

        let node = walker.nextNode()
        while (node) {
          const text = node.nodeValue?.trim() ?? ''
          if (/^Koli/i.test(text) && text.length <= 20) {
            node.nodeValue = QUANTITY_TEXT
          }
          node = walker.nextNode()
        }
      }

      return inputs.length > 0
    }

    if (applyFix()) {
      return
    }

    const timer = window.setInterval(() => {
      if (applyFix() || attempts >= 20) {
        window.clearInterval(timer)
      }
    }, 100)

    return () => {
      window.clearInterval(timer)
    }
  }, [pathname])

  return null
}
