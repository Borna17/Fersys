import {
  AlertTriangle,
  ChevronRight,
  FilePenLine,
  Trash2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  deleteUserDraft,
  getDraftManifestEntries,
  loadUserDraft,
  saveUserDraft,
  type DraftManifestEntry,
} from '../services/drafts.service'

type SavedControl = {
  key: string
  tag: string
  type: string
  value: string
  checked?: boolean
}

type UniversalPayload = {
  __draftMeta: {
    label: string
    route: string
  }
  controls: SavedControl[]
  controlCount: number
}

const SAVE_DELAY_MS = 350
const SUCCESS_WINDOW_MS = 20000
const RESTORE_MAX_ATTEMPTS = 12

function routeKey() {
  return `route:${window.location.pathname}${window.location.search}`
}

function isPublicOrAdmin(path: string) {
  return (
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/terms') ||
    path.startsWith('/privacy') ||
    path.startsWith('/cookies') ||
    path.startsWith('/refund-policy') ||
    path.startsWith('/admin') ||
    path.startsWith('/delete-account')
  )
}

function hasStructuredDraft(path: string) {
  if (path === '/work-orders/new') return true
  if (/^\/work-orders\/[^/]+\/edit\/?$/.test(path)) return true
  if (path === '/offers/new') return true
  if (path === '/invoices/new') return true
  return false
}

function labelForRoute(path: string) {
  if (path.includes('/work-orders')) return 'Radni nalog – nespremljene izmjene'
  if (path.includes('/offers')) return 'Ponuda – nespremljene izmjene'
  if (path.includes('/incoming-invoices')) return 'Ulazni račun – nedovršeni unos'
  if (path.includes('/invoices')) return 'Račun – nespremljene izmjene'
  if (path.includes('/delivery-notes')) return 'Otpremnica – nedovršeni unos'
  if (path.includes('/customers')) return 'Investitor – nedovršeni unos'
  if (path.includes('/inventory')) return 'Skladište – nedovršeni unos'
  if (path.includes('/vehicles')) return 'Vozilo – nedovršeni unos'
  if (path.includes('/employees')) return 'Zaposlenik – nedovršeni unos'
  if (path.includes('/calendar')) return 'Kalendar – nedovršene izmjene'
  if (path.includes('/settings')) return 'Postavke – nespremljene izmjene'
  return 'Nedovršeni unos'
}

function visibleForms() {
  return Array.from(document.querySelectorAll<HTMLFormElement>('form')).filter(
    (form) => {
      const style = window.getComputedStyle(form)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const rect = form.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    },
  )
}

function controls(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >('input:not([type="file"]), textarea, select'),
  ).filter((control) => !control.disabled)
}

function seriousForm(form: HTMLFormElement) {
  const editable = controls(form).filter((control) => {
    if (control instanceof HTMLInputElement && control.type === 'hidden') return false
    return true
  })
  if (editable.length < 2) return false

  const submit = form.querySelector<HTMLElement>(
    'button[type="submit"], input[type="submit"]',
  )
  if (submit) return true

  const buttons = Array.from(form.querySelectorAll<HTMLButtonElement>('button'))
  return buttons.some((button) =>
    /(spremi|dodaj|kreiraj|izradi|potvrdi|ažuriraj|uredi|izdaj)/i.test(
      button.textContent ?? '',
    ),
  )
}

function activeForm() {
  return visibleForms().find(seriousForm) ?? null
}

function controlKey(
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  index: number,
) {
  return (
    control.dataset.draftKey ||
    control.id ||
    control.getAttribute('name') ||
    control.getAttribute('aria-label') ||
    control.getAttribute('placeholder') ||
    `${control.tagName.toLowerCase()}:${control instanceof HTMLInputElement ? control.type : ''}:${index}`
  )
}

function snapshot(form: HTMLFormElement): SavedControl[] {
  return controls(form).map((control, index) => ({
    key: controlKey(control, index),
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
    if (
      typeof saved.checked === 'boolean' &&
      control.checked !== saved.checked
    ) {
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

  const setter = Object.getOwnPropertyDescriptor(
    prototype,
    'value',
  )?.set
  setter?.call(control, saved.value)
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

function findAddButton() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  return buttons.find((button) => {
    if (button.disabled) return false
    const text = (button.textContent ?? '').trim()
    return /dodaj (stavku|materijal|red|artikl)|nova stavka|još jednu stavku/i.test(text)
  })
}

function tryOpenModalForRoute(path: string) {
  if (!['/customers', '/vehicles', '/settings/employees'].includes(path)) return false
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  const button = buttons.find((item) => {
    const text = (item.textContent ?? '').trim()
    if (path === '/customers') return /(dodaj|novi).*(investitor|kupac)/i.test(text)
    if (path === '/vehicles') return /(dodaj|novo).*(vozilo)/i.test(text)
    return /(dodaj|novi).*(zaposlenik|radnik|korisnik)/i.test(text)
  })
  button?.click()
  return Boolean(button)
}

function restoreControls(
  form: HTMLFormElement,
  payload: UniversalPayload,
) {
  const current = controls(form)

  if (current.length < payload.controlCount) {
    const add = findAddButton()
    if (add) add.click()
    return false
  }

  const byKey = new Map<string, SavedControl>()
  payload.controls.forEach((item) => byKey.set(item.key, item))

  current.forEach((control, index) => {
    const key = controlKey(control, index)
    const saved = byKey.get(key) ?? payload.controls[index]
    if (!saved || control.tagName !== saved.tag) return
    setNativeValue(control, saved)
  })

  return true
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UniversalDraftProtection() {
  const [entries, setEntries] = useState<DraftManifestEntry[]>([])
  const [open, setOpen] = useState(false)
  const [restoredMessage, setRestoredMessage] = useState('')

  const refresh = () => {
    setEntries(getDraftManifestEntries())
  }

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener('fersys:draft-sync-change', onChange)
    window.addEventListener('storage', onChange)
    const timer = window.setInterval(refresh, 2500)
    return () => {
      window.removeEventListener('fersys:draft-sync-change', onChange)
      window.removeEventListener('storage', onChange)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!entries.length || document.visibilityState !== 'visible') return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const newest = entries[0]
    const age = Date.now() - new Date(newest.updatedAt).getTime()
    if (age < 30 * 60 * 1000) return

    const notificationKey = 'fersys-draft-notification-v1'
    const last = Number(localStorage.getItem(notificationKey) ?? '0')
    if (Date.now() - last < 6 * 60 * 60 * 1000) return

    try {
      new Notification('FERSYS – imate nedovršeno', {
        body:
          entries.length === 1
            ? entries[0].label
            : `Imate ${entries.length} nedovršenih unosa ili izmjena.`,
      })
      localStorage.setItem(notificationKey, String(Date.now()))
    } catch {
      // In-app upozorenje ostaje dostupno i kad OS ne dopušta lokalnu notifikaciju.
    }
  }, [entries])

  useEffect(() => {
    let timer = 0
    let watcher = 0
    let dirty = false
    let submittedAt = 0
    let submittedKey = ''
    let restoredKey = ''
    let restoreAttempts = 0
    let lastLocation = ''

    const currentLocation = () =>
      `${window.location.pathname}${window.location.search}`

    const eligible = () => {
      const path = window.location.pathname
      return !isPublicOrAdmin(path) && !hasStructuredDraft(path)
    }

    const saveNow = () => {
      if (!eligible() || !dirty) return
      const form = activeForm()
      if (!form) return

      const key = routeKey()
      const route = currentLocation()
      const payload: UniversalPayload = {
        __draftMeta: {
          label: labelForRoute(window.location.pathname),
          route,
        },
        controls: snapshot(form),
        controlCount: controls(form).length,
      }

      void saveUserDraft('form', key, payload)
        .then(refresh)
        .catch((error) => {
          console.warn('[FERSYS] Univerzalni autosave nije uspio:', error)
        })
    }

    const scheduleSave = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(saveNow, SAVE_DELAY_MS)
    }

    const restore = async () => {
      if (!eligible()) return
      const key = routeKey()
      if (restoredKey === key) return

      const draft = await loadUserDraft<UniversalPayload>('form', key).catch(() => null)
      if (!draft?.payload) {
        restoredKey = key
        return
      }

      let form = activeForm()
      if (!form && tryOpenModalForRoute(window.location.pathname)) {
        return
      }
      form = activeForm()
      if (!form) return

      const done = restoreControls(form, draft.payload)
      restoreAttempts += 1
      if (!done && restoreAttempts < RESTORE_MAX_ATTEMPTS) return

      restoredKey = key
      dirty = true
      setRestoredMessage(
        `Vraćene su nespremljene izmjene · ${formatTime(draft.updatedAt)}`,
      )
      window.setTimeout(() => setRestoredMessage(''), 5500)
    }

    const onInput = (event: Event) => {
      const target = event.target as Element | null
      const form = target?.closest('form') as HTMLFormElement | null
      if (!form || !seriousForm(form) || !eligible()) return
      dirty = true
      scheduleSave()
    }

    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null
      if (!form || !seriousForm(form) || !eligible()) return
      dirty = true
      submittedAt = Date.now()
      submittedKey = routeKey()
      saveNow()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow()
    }

    document.addEventListener('input', onInput, true)
    document.addEventListener('change', onInput, true)
    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', saveNow)
    window.addEventListener('beforeunload', saveNow)

    watcher = window.setInterval(() => {
      const location = currentLocation()
      if (location !== lastLocation) {
        lastLocation = location
        restoredKey = ''
        restoreAttempts = 0
        dirty = false
      }

      void restore()

      if (
        submittedKey &&
        submittedAt > 0 &&
        Date.now() - submittedAt < SUCCESS_WINDOW_MS
      ) {
        const routeChanged = routeKey() !== submittedKey
        const formGone = !activeForm()
        if (routeChanged || formGone) {
          void deleteUserDraft('form', submittedKey).then(() => {
            submittedKey = ''
            submittedAt = 0
            dirty = false
            refresh()
          })
        }
      }
    }, 300)

    return () => {
      saveNow()
      window.clearTimeout(timer)
      window.clearInterval(watcher)
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onInput, true)
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', saveNow)
      window.removeEventListener('beforeunload', saveNow)
    }
  }, [])

  const visibleEntries = useMemo(
    () => {
      const currentRoute = `${window.location.pathname}${window.location.search}`

      return entries.filter(
        (entry) =>
          entry.route &&
          !entry.route.startsWith('/login') &&
          entry.route !== currentRoute,
      )
    },
    [entries],
  )

  if (!visibleEntries.length && !restoredMessage) {
    return null
  }

  return (
    <>
      {restoredMessage && (
        <div className="fixed left-1/2 top-[5.35rem] z-[120] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-xl border border-emerald-400/25 bg-slate-950/95 px-3 py-2 text-xs font-bold text-emerald-200 shadow-xl backdrop-blur sm:bottom-8 sm:top-auto sm:text-sm">
          {restoredMessage}
        </div>
      )}

      {visibleEntries.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed left-3 top-[5.35rem] z-[115] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-xl border border-amber-400/25 bg-slate-950/95 px-3 py-2 text-left text-white shadow-xl backdrop-blur sm:bottom-5 sm:left-5 sm:top-auto sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/15 text-amber-300 sm:h-10 sm:w-10 sm:rounded-xl">
            <FilePenLine size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-wide text-amber-300">
              Nedovršeno ({visibleEntries.length})
            </span>
            <span className="block truncate text-xs text-slate-400">
              {visibleEntries[0].label}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[130] grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
          <section className="max-h-[86dvh] w-full overflow-hidden rounded-t-[2rem] border border-slate-700 bg-slate-950 shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  SIGURNOSNE SKICE
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Imate nedovršeno
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  FERSYS čuva unos dok ga uspješno ne spremite ili sami ne odbacite.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-slate-400"
              >
                <X size={19} />
              </button>
            </header>

            <div className="max-h-[60dvh] space-y-2 overflow-y-auto p-4">
              {visibleEntries.map((entry) => (
                <article
                  key={`${entry.draftType}:${entry.draftKey}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
                    <AlertTriangle size={19} />
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      window.location.href = entry.route
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <strong className="block truncate text-sm text-white">
                      {entry.label}
                    </strong>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatTime(entry.updatedAt)} · Nastavi
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Odbaci skicu"
                    onClick={() => {
                      if (!window.confirm(`Odbaciti: ${entry.label}?`)) return
                      void deleteUserDraft(entry.draftType, entry.draftKey).then(refresh)
                    }}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-300"
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
