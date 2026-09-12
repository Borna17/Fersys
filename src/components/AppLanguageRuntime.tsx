import { useEffect } from 'react'
import { getAppLanguage, translateUiText, type AppLanguage } from '../services/appLanguage.service'

const textOriginals = new WeakMap<Text, string>()
const attributeOriginals = new WeakMap<Element, Map<string, string>>()
const translatedAttributes = ['placeholder', 'title', 'aria-label'] as const

function originalAttribute(element: Element, attribute: string) {
  let values = attributeOriginals.get(element)
  if (!values) {
    values = new Map<string, string>()
    attributeOriginals.set(element, values)
  }

  if (!values.has(attribute)) {
    values.set(attribute, element.getAttribute(attribute) ?? '')
  }

  return values.get(attribute) ?? ''
}

function translateAttributes(language: AppLanguage) {
  const elements = document.body.querySelectorAll<HTMLElement>('*')

  elements.forEach((element) => {
    translatedAttributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return
      const original = originalAttribute(element, attribute)
      if (!original.trim()) return
      const translated = translateUiText(original.trim(), language)
      if (element.getAttribute(attribute) !== translated) {
        element.setAttribute(attribute, translated)
      }
    })

    if (element instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(element.type)) {
      const original = originalAttribute(element, 'value')
      if (original.trim()) element.value = translateUiText(original.trim(), language)
    }

    if (element instanceof HTMLOptionElement) {
      const current = element.textContent ?? ''
      if (!element.dataset.fersysOriginalText) element.dataset.fersysOriginalText = current
      const original = element.dataset.fersysOriginalText ?? current
      element.textContent = translateUiText(original.trim(), language)
    }
  })
}

function applyLanguage(language: AppLanguage) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()

  while (node) {
    const text = node as Text
    const parent = text.parentElement
    const current = text.nodeValue ?? ''

    if (!textOriginals.has(text)) textOriginals.set(text, current)
    const original = textOriginals.get(text) ?? current

    if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName) && original.trim()) {
      const translated = translateUiText(original.trim(), language)
      const target = `${original.match(/^\s*/)?.[0] ?? ''}${translated}${original.match(/\s*$/)?.[0] ?? ''}`
      if (text.nodeValue !== target) text.nodeValue = target
    }

    node = walker.nextNode()
  }

  translateAttributes(language)
}

export default function AppLanguageRuntime() {
  useEffect(() => {
    let language = getAppLanguage()
    document.documentElement.lang = language
    let queued = false

    const apply = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        applyLanguage(language)
      })
    }

    const observer = new MutationObserver(apply)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributes, 'value'],
    })

    const onLanguage = (event: Event) => {
      language = (event as CustomEvent<AppLanguage>).detail ?? getAppLanguage()
      document.documentElement.lang = language
      apply()
    }

    window.addEventListener('fersys:language-changed', onLanguage)
    apply()

    return () => {
      observer.disconnect()
      window.removeEventListener('fersys:language-changed', onLanguage)
    }
  }, [])

  return null
}
