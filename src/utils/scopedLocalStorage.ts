/**
 * Returns a storage key isolated by both signed-in account and active company.
 *
 * Supabase remains the source of truth for business data. localStorage is used
 * only as a local cache/fallback by older screens, so it must never be shared
 * between companies or accounts in the same browser/native WebView.
 */
export function scopedStorageKey(base: string): string {
  try {
    const companyId =
      sessionStorage.getItem('fersys_active_company_id') || 'no-company'

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
        return `${base}:${userId}:${companyId}`
      }
    }
  } catch {
    // Never fall back to an old unscoped key.
  }

  return `${base}:isolated:no-company`
}
