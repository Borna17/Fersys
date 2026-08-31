import { lazy, type ComponentType } from 'react'

const RETRY_PREFIX = 'fersys_lazy_retry:'

/**
 * React.lazy wrapper that recovers from a stale Vite/PWA chunk after a deploy.
 *
 * A browser that still has an older index/service-worker can try to load an
 * asset hash that no longer exists. In that case the dynamic import rejects
 * with messages such as "Failed to fetch dynamically imported module" and
 * React reports the page name (for example NewWorkOrderPage) as the failure.
 * We reload exactly once for that page so the browser receives the newest
 * asset manifest, while real application errors are still re-thrown.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  key: string,
) {
  return lazy(async () => {
    try {
      const loaded = await loader()
      sessionStorage.removeItem(`${RETRY_PREFIX}${key}`)
      return loaded
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name} ${error.message}`
          : String(error)

      const isChunkLoadFailure =
        /dynamically imported module|failed to fetch|loading chunk|chunkloaderror|importing a module script/i.test(
          message,
        )

      const retryKey = `${RETRY_PREFIX}${key}`
      const alreadyRetried =
        sessionStorage.getItem(retryKey) === '1'

      if (isChunkLoadFailure && !alreadyRetried) {
        sessionStorage.setItem(retryKey, '1')
        window.location.reload()

        // Reload replaces this document. Keep Suspense pending until then.
        return await new Promise<{ default: T }>(() => undefined)
      }

      sessionStorage.removeItem(retryKey)
      throw error
    }
  })
}
