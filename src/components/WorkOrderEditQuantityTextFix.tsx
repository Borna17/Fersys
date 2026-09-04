import { useEffect } from 'react'
import { useLocation } from 'react-router'

const QUANTITY_TEXT = 'Količina'
const STYLE_ID = 'fersys-work-order-quantity-no-spinner'

export default function WorkOrderEditQuantityTextFix() {
  const { pathname } = useLocation()

  useEffect(() => {
    const isWorkOrderForm =
      pathname === '/work-orders/new' ||
      /^\/work-orders\/[^/]+\/edit$/.test(pathname)

    if (!isWorkOrderForm) {
      return
    }

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        input[data-fersys-quantity-no-spinner="true"] {
          appearance: textfield !important;
          -moz-appearance: textfield !important;
        }
        input[data-fersys-quantity-no-spinner="true"]::-webkit-inner-spin-button,
        input[data-fersys-quantity-no-spinner="true"]::-webkit-outer-spin-button {
          -webkit-appearance: none !important;
          appearance: none !important;
          margin: 0 !important;
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }

    let attempts = 0

    function applyFix() {
      attempts += 1

      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          'input[type="number"]',
        ),
      ).filter((input) => {
        const placeholder = input.getAttribute('placeholder') ?? ''
        const parentText = input.parentElement?.textContent ?? ''
        return /^Koli/i.test(placeholder) || /Koli(?:čina|cina|Ä)/i.test(parentText)
      })

      for (const input of inputs) {
        input.placeholder = QUANTITY_TEXT
        input.setAttribute('data-fersys-quantity-no-spinner', 'true')
        input.setAttribute('inputmode', 'decimal')

        const field = input.parentElement
        if (!field) continue

        const walker = document.createTreeWalker(
          field,
          NodeFilter.SHOW_TEXT,
        )

        let node = walker.nextNode()
        while (node) {
          const text = node.nodeValue?.trim() ?? ''
          if (/^Koli/i.test(text) && text.length <= 24) {
            node.nodeValue = QUANTITY_TEXT
          }
          node = walker.nextNode()
        }
      }

      return inputs.length > 0
    }

    applyFix()

    const observer = new MutationObserver(() => {
      applyFix()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    const timer = window.setInterval(() => {
      if (applyFix() || attempts >= 20) {
        window.clearInterval(timer)
      }
    }, 100)

    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [pathname])

  return null
}
