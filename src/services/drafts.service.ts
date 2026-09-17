import * as base from './drafts.service.base'

export type {
  DraftType,
  DraftRecord,
  DraftSyncStatus,
  DraftManifestEntry,
} from './drafts.service.base'

export {
  getDraftManifestEntries,
  refreshDraftManifestFromCloud,
  saveUserDraft,
  deleteUserDraft,
  getDraftSyncStatus,
  syncPendingUserDrafts,
  formatDraftSavedAt,
} from './drafts.service.base'

import type { DraftType, DraftRecord } from './drafts.service.base'

type LocalDraftEnvelope<T> = {
  key: string
  companyId: string
  userId: string
  draftType: DraftType
  draftKey: string
  payload: T
  updatedAt: string
  syncState?: 'pending' | 'synced'
}

type CachedIdentity = {
  companyId: string
  userId: string
}

const DB_NAME = 'fersys-user-drafts'
const STORE_NAME = 'drafts'
const IDENTITY_CACHE_KEY = 'fersys-draft-identity-v2'

function readCachedIdentity(): CachedIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedIdentity>
    const companyId = String(parsed.companyId ?? '').trim()
    const userId = String(parsed.userId ?? '').trim()
    return companyId && userId ? { companyId, userId } : null
  } catch {
    return null
  }
}

async function loadPendingLocal<T>(
  draftType: DraftType,
  draftKey: string,
): Promise<LocalDraftEnvelope<T> | null> {
  const identity = readCachedIdentity()
  if (!identity) return null

  const key = [identity.companyId, identity.userId, draftType, draftKey].join(':')

  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    try {
      const value = await new Promise<LocalDraftEnvelope<T> | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (!value || value.syncState !== 'pending') return null
      return value
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

export async function loadUserDraft<T>(
  draftType: DraftType,
  draftKey: string,
): Promise<DraftRecord<T> | null> {
  // A pending local edit is authoritative until it has been uploaded. A newer
  // cloud timestamp can come from another device and must never erase unsynced
  // work from this device merely because the user reopened the draft online.
  const pendingLocal = await loadPendingLocal<T>(draftType, draftKey)

  if (pendingLocal) {
    return {
      draftType,
      draftKey,
      payload: pendingLocal.payload,
      updatedAt: pendingLocal.updatedAt,
      source: 'local',
    }
  }

  return base.loadUserDraft<T>(draftType, draftKey)
}
