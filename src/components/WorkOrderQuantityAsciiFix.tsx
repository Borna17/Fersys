import { useEffect } from 'react'

const QUANTITY_TEXT = 'Kolicina'

export default function WorkOrderQuantityAsciiFix() {
  useEffect(() => {
    function fixQuantityText() {
      if (!window.location.pathname.startsWith('/work-orders')) return

      document
        .querySelectorAll<HTMLInputElement>('input[type="number"]')
        .forEach((input) => {
          const placeholder = input.getAttribute('placeholder') ?? ''
          if (/^Koli/i.test(placeholder)) {
            input.setAttribute('placeholder', QUANTITY_TEXT)
          }
        })

      const walker = document.createTreeWalker(
        document.body,
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

    fixQuantityText()

    const observer = new MutationObserver(fixQuantityText)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder'],
    })

    window.addEventListener('popstate', fixQuantityText)

    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', fixQuantityText)
    }
  }, [])

  return null
}
