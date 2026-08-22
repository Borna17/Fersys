import {
  Check,
  CloudOff,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import {
  getDraftSyncStatus,
  syncPendingUserDrafts,
  type DraftSyncStatus,
} from '../services/drafts.service'

const EMPTY_STATUS:
DraftSyncStatus = {
  online:
    typeof navigator ===
      'undefined'
      ? true
      : navigator.onLine,
  pending: 0,
  lastSyncedAt: '',
}

export default function OfflineSyncStatus() {
  const [
    status,
    setStatus,
  ] =
    useState<DraftSyncStatus>(
      EMPTY_STATUS,
    )
  const [
    syncing,
    setSyncing,
  ] =
    useState(false)
  const [
    justSynced,
    setJustSynced,
  ] =
    useState(false)

  async function refresh() {
    setStatus(
      await getDraftSyncStatus(),
    )
  }

  async function sync() {
    if (
      !navigator.onLine ||
      syncing
    ) {
      await refresh()
      return
    }

    try {
      setSyncing(true)

      const synced =
        await syncPendingUserDrafts()

      await refresh()

      if (
        synced > 0
      ) {
        setJustSynced(true)

        window.setTimeout(
          () =>
            setJustSynced(
              false,
            ),
          2500,
        )
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void refresh()

    function online() {
      void sync()
    }

    function offline() {
      void refresh()
    }

    function draftChange() {
      void refresh()
    }

    window.addEventListener(
      'online',
      online,
    )
    window.addEventListener(
      'offline',
      offline,
    )
    window.addEventListener(
      'fersys:draft-sync-change',
      draftChange,
    )

    return () => {
      window.removeEventListener(
        'online',
        online,
      )
      window.removeEventListener(
        'offline',
        offline,
      )
      window.removeEventListener(
        'fersys:draft-sync-change',
        draftChange,
      )
    }
  }, [])

  if (
    status.online &&
    status.pending === 0 &&
    !justSynced
  ) {
    return null
  }

  if (
    !status.online
  ) {
    return (
      <div className="fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom))] left-3 z-[190] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/95 px-3 py-2 text-[11px] font-black text-amber-200 shadow-2xl shadow-black/40 backdrop-blur-xl md:bottom-5 md:left-auto md:right-5">
        <WifiOff
          size={15}
          className="shrink-0"
        />

        <span className="min-w-0">
          Bez interneta
          {status.pending > 0
            ? ` · ${status.pending} nacrt${status.pending === 1 ? '' : 'a'} čeka sinkronizaciju`
            : ' · unos se čuva lokalno'}
        </span>
      </div>
    )
  }

  if (
    justSynced
  ) {
    return (
      <div className="fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom))] left-3 z-[190] flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/95 px-3 py-2 text-[11px] font-black text-emerald-200 shadow-xl md:bottom-5 md:left-auto md:right-5">
        <Check size={15} />
        Nacrti sinkronizirani
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        void sync()
      }
      disabled={syncing}
      className="fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom))] left-3 z-[190] inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-slate-900/95 px-3 py-2 text-[11px] font-black text-blue-200 shadow-2xl shadow-black/40 backdrop-blur-xl active:scale-95 disabled:opacity-60 md:bottom-5 md:left-auto md:right-5"
    >
      {syncing ? (
        <Loader2
          size={15}
          className="animate-spin"
        />
      ) : (
        <CloudOff
          size={15}
        />
      )}

      {syncing
        ? 'Sinkroniziram...'
        : `${status.pending} nacrt${status.pending === 1 ? '' : 'a'} čeka cloud`}

      {!syncing && (
        <RefreshCw
          size={13}
          className="opacity-60"
        />
      )}
    </button>
  )
}