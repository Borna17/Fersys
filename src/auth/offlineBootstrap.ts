import type { Session } from '@supabase/supabase-js'
import type { CurrentMembership } from './permissions'

const KEY = 'fersys-offline-bootstrap-v2'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export type LocalIdentity = { userId: string; companyId: string }
let activeIdentity: LocalIdentity | null = null
let verifiedOnline = false

// This identity authorizes device-local access only. Server RLS remains authoritative.
export function getActiveLocalIdentity() { return activeIdentity }
export function isIdentityVerifiedOnline() { return verifiedOnline }
export function activateLocalIdentity(userId: string, membership: CurrentMembership, online: boolean) {
  activeIdentity = membership.status === 'active' ? { userId, companyId: membership.companyId } : null
  verifiedOnline = !!activeIdentity && online
}
export function clearActiveLocalIdentity() {
  activeIdentity = null
  verifiedOnline = false
}
export function clearOfflineBootstrap() {
  clearActiveLocalIdentity()
  try {
    localStorage.removeItem(KEY)
    // These old, unscoped UI/identity hints must never identify the next account.
    localStorage.removeItem('fersys-draft-identity-v2')
    localStorage.removeItem('fersys-draft-manifest-v1')
    sessionStorage.removeItem('fersys_active_company_id')
  } catch { /* Private storage can be unavailable. Drafts in IndexedDB are retained. */ }
}
export function rememberOfflineBootstrap(session: Session, membership: CurrentMembership | null) {
  if (!membership || membership.status !== 'active') {
    clearOfflineBootstrap()
    return
  }
  activateLocalIdentity(session.user.id, membership, true)
  try {
    // Never duplicate access/refresh tokens. They remain in Supabase's own storage.
    localStorage.setItem(KEY, JSON.stringify({
      userId: session.user.id, membership, verifiedAt: Date.now(),
    }))
  } catch { /* Online access must still work if cache cannot be written. */ }
}
export function readOfflineBootstrap(authStorageKey: string): { session: Session; membership: CurrentMembership } | null {
  try {
    const cache = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const session = JSON.parse(localStorage.getItem(authStorageKey) ?? 'null') as Session | null
    if (!cache || !session?.user?.id || !session.access_token || !session.refresh_token) return null
    if (session.user.id !== cache.userId) return null
    if (typeof cache.verifiedAt !== 'number' || cache.verifiedAt > Date.now() || Date.now() - cache.verifiedAt > MAX_AGE_MS) return null
    const membership = cache.membership as CurrentMembership
    if (!membership?.membershipId || !membership.companyId || membership.status !== 'active') return null
    if (!['owner','admin','manager','worker','assistant','intern','accounting','viewer'].includes(membership.role)) return null
    return { session, membership }
  } catch { return null }
}
