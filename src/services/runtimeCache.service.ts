type CacheEnvelope<T> = { savedAt: number; value: T }

export function readRuntimeCache<T>(key: string, maxAgeMs: number, allowStale = false): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEnvelope<T>
    if (!parsed || typeof parsed.savedAt !== 'number') return null
    if (!allowStale && Date.now() - parsed.savedAt > maxAgeMs) return null
    return parsed.value
  } catch {
    return null
  }
}

export function writeRuntimeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies CacheEnvelope<T>))
  } catch {
    // Cache never blocks normal app flow.
  }
}
