import { useEffect } from 'react'

const TRIAL_LABEL = 'Poruka korisniku (opcionalno)'
const INTERNAL_LABEL = 'Interna napomena'
const TRIAL_PLACEHOLDER = 'Npr. Produžili smo probni period za dodatnih 14 dana kako biste dovršili testiranje FERSYS-a.'
const INTERNAL_PLACEHOLDER = 'Razlog promjene ili interna bilješka...'

function polishAdminTrialMessage() {
  if (!window.location.pathname.startsWith('/admin/companies/')) return

  const textarea = Array.from(document.querySelectorAll('textarea')).find((item) => {
    const placeholder = item.getAttribute('placeholder') ?? ''
    return placeholder.includes('Razlog promjene') || placeholder.includes('Produžili smo probni period')
  }) as HTMLTextAreaElement | undefined

  if (!textarea) return

  const managementCard = textarea.closest('article, div.rounded-3xl') ?? textarea.parentElement?.parentElement
  const selects = managementCard ? Array.from(managementCard.querySelectorAll('select')) : []
  const statusSelect = selects.find((select) =>
    Array.from(select.options).some((option) => option.value === 'trialing') &&
    Array.from(select.options).some((option) => option.value === 'active'),
  ) as HTMLSelectElement | undefined

  const isTrial = statusSelect?.value === 'trialing'
  const fieldWrapper = textarea.parentElement
  const label = fieldWrapper?.querySelector(':scope > p') as HTMLParagraphElement | null

  if (label) label.textContent = isTrial ? TRIAL_LABEL : INTERNAL_LABEL
  textarea.placeholder = isTrial ? TRIAL_PLACEHOLDER : INTERNAL_PLACEHOLDER

  const helperId = 'fersys-admin-trial-message-helper'
  let helper = document.getElementById(helperId) as HTMLParagraphElement | null

  if (isTrial) {
    if (!helper) {
      helper = document.createElement('p')
      helper.id = helperId
      helper.className = 'mt-2 text-xs leading-5 text-violet-300/80'
      textarea.insertAdjacentElement('afterend', helper)
    }
    helper.textContent = 'Ovu će poruku vlasnik tvrtke dobiti uz obavijest o produženju triala. Ako polje ostaviš prazno, poslat će se samo informacija da je trial produžen.'
  } else {
    helper?.remove()
  }
}

export default function AdminTrialMessagePolish() {
  useEffect(() => {
    let scheduled = false

    const run = () => {
      scheduled = false
      polishAdminTrialMessage()
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(run)
    }

    schedule()

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })

    const handleChange = (event: Event) => {
      const target = event.target
      if (target instanceof HTMLSelectElement) schedule()
    }

    window.addEventListener('change', handleChange, true)
    window.addEventListener('popstate', schedule)

    return () => {
      observer.disconnect()
      window.removeEventListener('change', handleChange, true)
      window.removeEventListener('popstate', schedule)
    }
  }, [])

  return null
}
