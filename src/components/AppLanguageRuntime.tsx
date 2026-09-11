import { useEffect } from 'react'
import { getAppLanguage, translateUiText, type AppLanguage } from '../services/appLanguage.service'

const originals = new WeakMap<Text, string>()

function applyLanguage(language: AppLanguage) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    const parent = text.parentElement
    const current = text.nodeValue ?? ''
    if (!originals.has(text)) originals.set(text, current)
    const original = originals.get(text) ?? current
    if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName) && original.trim()) {
      const translated = translateUiText(original.trim(), language)
      const target = `${original.match(/^\s*/)?.[0] ?? ''}${translated}${original.match(/\s*$/)?.[0] ?? ''}`
      if (text.nodeValue !== target) text.nodeValue = target
    }
    node = walker.nextNode()
  }
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
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
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
