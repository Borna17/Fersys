/**
 * Returns a per-account storage key so data cached in the browser/native
 * WebView can never be shown to a different signed-in FERSYS account.
 *
 * Supabase persists the active auth session under an sb-*-auth-token key.
 * We only read the user id from that local session object; if it cannot be
 * resolved we deliberately use an isolated fallback rather than the old
 * shared global key.
 */
export function scopedStorageKey(base: string): string {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) {
        continue
      }

      const raw = localStorage.getItem(key)
      if (!raw) continue

      const parsed = JSON.parse(raw) as {
        user?: { id?: string }
        currentSession?: { user?: { id?: string } }
      }

      const userId = parsed?.user?.id ?? parsed?.currentSession?.user?.id
      if (userId) {
        return `${base}:${userId}`
      }
    }
  } catch {
    // Never fall back to the old unscoped key.
  }

  return `${base}:isolated`
}
