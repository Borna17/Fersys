import { useEffect } from 'react'
import { syncPendingUserDrafts } from '../services/drafts.service'

const RETRY_INTERVAL_MS = 30_000

export default function DraftSyncManager() {
  useEffect(() => {
    let running = false
    let disposed = false

    const sync = async () => {
      if (disposed || running || !navigator.onLine) return
      running = true
      try {
        await syncPendingUserDrafts()
      } catch (error) {
        console.warn('[FERSYS] Pozadinska sinkronizacija će pokušati ponovno:', error)
      } finally {
        running = false
      }
    }

    const onOnline = () => void sync()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void sync()
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)

    const interval = window.setInterval(() => void sync(), RETRY_INTERVAL_MS)
    void sync()

    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return null
}
