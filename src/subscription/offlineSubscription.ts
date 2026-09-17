import type { SubscriptionContext } from './subscription.service'

const KEY = 'fersys-offline-subscription-v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type CachedSubscription = {
  userId: string
  companyId: string
  verifiedAt: number
  context: SubscriptionContext
}

export function rememberOfflineSubscription(
  userId: string,
  companyId: string,
  context: SubscriptionContext,
) {
  if (!userId || !companyId || context.companyId !== companyId) return

  try {
    localStorage.setItem(KEY, JSON.stringify({
      userId,
      companyId,
      verifiedAt: Date.now(),
      context,
    } satisfies CachedSubscription))
  } catch {
    // Online subscription checks must not fail because device storage is full/unavailable.
  }
}

export function readOfflineSubscription(
  userId: string,
  companyId: string,
): SubscriptionContext | null {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) ?? 'null') as CachedSubscription | null
    if (!cached || cached.userId !== userId || cached.companyId !== companyId) return null
    if (cached.context?.companyId !== companyId) return null
    if (typeof cached.verifiedAt !== 'number') return null
    if (cached.verifiedAt > Date.now() || Date.now() - cached.verifiedAt > MAX_AGE_MS) return null
    return cached.context
  } catch {
    return null
  }
}

export function clearOfflineSubscription() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // noop
  }
}
