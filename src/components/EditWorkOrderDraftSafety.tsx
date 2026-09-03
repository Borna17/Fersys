import { useEffect } from 'react'

type SavedControl = {
  tag: string
  type: string
  value: string
  checked?: boolean
}

type EditDraft = {
  version: 1
  path: string
  savedAt: number
  controls: SavedControl[]
}

const PREFIX = 'fersys_edit_work_order_draft_v1:'
const SAVE_DELAY_MS = 350
const SUCCESS_WINDOW_MS = 20000

function draftKey(path: string) {
  return `${PREFIX}${path}`
}

function isEditPath(path: string) {
  return /^\/work-orders\/[^/]+\/edit\/?$/.test(path)
}

function controls(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="file"]), textarea, select',
    ),
  )
}

function snapshot(form: HTMLFormElement): SavedControl[] {
  return controls(form).map((control) => ({
    tag: control.tagName,
    type: control instanceof HTMLInputElement ? control.type : '',
    value: control.value,
    checked:
      control instanceof HTMLInputElement &&
      (control.type === 'checkbox' || control.type === 'radio')
        ? control.checked
        : undefined,
  }))
}

function setNativeValue(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  saved: SavedControl,
) {
  if (
    control instanceof HTMLInputElement &&
    (control.type === 'checkbox' || control.type === 'radio')
  ) {
    if (typeof saved.checked === 'boolean' && control.checked !== saved.checked) {
      control.click()
    }
    return
  }

  if (control.value === saved.value) return

  const prototype =
    control instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype

  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(control, saved.value)
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

function restore(form: HTMLFormElement, draft: EditDraft) {
  const current = controls(form)
  const limit = Math.min(current.length, draft.controls.length)

  for (let index = 0; index < limit; index += 1) {
    const control = current[index]
    const saved = draft.controls[index]
    if (control.tagName !== saved.tag) continue
    setNativeValue(control, saved)
  }
}

export default function EditWorkOrderDraftSafety() {
  useEffect(() => {
    let timer = 0
    let lastEditPath = ''
    let submittedAt = 0
    let restoredPath = ''

    const saveNow = () => {
      const path = window.location.pathname
      if (!isEditPath(path)) return

      const form = document.getElementById(
        'mobile-edit-work-order-form',
      ) as HTMLFormElement | null
      if (!form) return

      const draft: EditDraft = {
        version: 1,
        path,
        savedAt: Date.now(),
        controls: snapshot(form),
      }

      try {
        localStorage.setItem(draftKey(path), JSON.stringify(draft))
      } catch (error) {
        console.warn('[FERSYS] Sigurnosni nacrt uređivanja nije moguće spremiti.', error)
      }
    }

    const scheduleSave = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(saveNow, SAVE_DELAY_MS)
    }

    const tryRestore = () => {
      const path = window.location.pathname
      if (!isEditPath(path) || restoredPath === path) return

      const form = document.getElementById(
        'mobile-edit-work-order-form',
      ) as HTMLFormElement | null
      if (!form) return

      let draft: EditDraft | null = null
      try {
        const raw = localStorage.getItem(draftKey(path))
        draft = raw ? (JSON.parse(raw) as EditDraft) : null
      } catch {
        draft = null
      }

      restoredPath = path
      lastEditPath = path

      if (!draft || draft.version !== 1 || draft.path !== path) return

      // Pusti Reactu da završi učitavanje spremljenog naloga pa vrati
      // zadnje lokalne izmjene. Dva prolaza pokrivaju sporije mobitele.
      window.setTimeout(() => restore(form, draft as EditDraft), 80)
      window.setTimeout(() => restore(form, draft as EditDraft), 450)
    }

    const onInput = (event: Event) => {
      const target = event.target as Element | null
      if (!target?.closest('#mobile-edit-work-order-form')) return
      scheduleSave()
    }

    const onSubmit = (event: Event) => {
      const target = event.target as Element | null
      if (!(target instanceof HTMLFormElement)) return
      if (target.id !== 'mobile-edit-work-order-form') return

      lastEditPath = window.location.pathname
      submittedAt = Date.now()
      saveNow()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow()
    }

    const onPageHide = () => saveNow()

    document.addEventListener('input', onInput, true)
    document.addEventListener('change', onInput, true)
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    const watcher = window.setInterval(() => {
      const path = window.location.pathname

      if (isEditPath(path)) {
        if (lastEditPath !== path) {
          lastEditPath = path
          restoredPath = ''
        }
        tryRestore()
        return
      }

      // Nacrt brišemo samo kada je korisnik upravo pritisnuo Spremi i
      // aplikacija je nakon uspješnog server savea napustila edit rutu.
      // Običan izlazak, poziv, gašenje aplikacije ili refresh ga NE brišu.
      if (
        lastEditPath &&
        submittedAt > 0 &&
        Date.now() - submittedAt < SUCCESS_WINDOW_MS
      ) {
        try {
          localStorage.removeItem(draftKey(lastEditPath))
        } catch {
          // Sigurnosni nacrt smije ostati; bolje višak nego gubitak rada.
        }
        submittedAt = 0
      }
    }, 250)

    return () => {
      saveNow()
      window.clearTimeout(timer)
      window.clearInterval(watcher)
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onInput, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return null
}
