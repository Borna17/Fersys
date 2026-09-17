import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsertState = vi.hoisted(() => ({ fail: false }))
const upsert = vi.hoisted(() => vi.fn(async () => ({
  error: upsertState.fail ? { message: 'backend 500' } : null,
})))
const insert = vi.hoisted(() => vi.fn(async () => ({ error: null })))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-a' } } }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } }, error: null })),
    },
    rpc: vi.fn(async () => ({ data: 'company-a', error: null })),
    from: vi.fn(() => ({
      upsert,
      insert,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
            })),
          })),
        })),
      })),
    })),
  },
}))

import {
  getDraftSyncStatus,
  loadUserDraft,
  saveUserDraft,
  syncPendingUserDrafts,
} from '../../src/services/drafts.service'

async function resetDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('fersys-user-drafts')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Draft test database deletion was blocked.'))
  })
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value })
}

describe('P0 offline draft recovery', () => {
  beforeEach(async () => {
    await resetDatabase()
    localStorage.clear()
    upsert.mockClear()
    insert.mockClear()
    upsertState.fail = false
    localStorage.setItem(
      'fersys-draft-identity-v2',
      JSON.stringify({ companyId: 'company-a', userId: 'user-a' }),
    )
  })

  it('survives an offline save and reopen without touching the backend', async () => {
    setOnline(false)
    await saveUserDraft('work-order', 'edit:wo-offline', { description: 'saved before force-close' })

    const restored = await loadUserDraft<{ description: string }>('work-order', 'edit:wo-offline')
    const status = await getDraftSyncStatus()

    expect(restored?.payload.description).toBe('saved before force-close')
    expect(restored?.source).toBe('local')
    expect(status.online).toBe(false)
    expect(status.pending).toBe(1)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('syncs the pending offline draft after connectivity returns', async () => {
    setOnline(false)
    await saveUserDraft('work-order', 'edit:wo-sync', { description: 'offline change' })

    setOnline(true)
    const synced = await syncPendingUserDrafts()
    const status = await getDraftSyncStatus()

    expect(synced).toBe(1)
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(status.pending).toBe(0)
    expect(status.lastSyncedAt).not.toBe('')
  })

  it('keeps a draft pending when backend save fails and retries it later', async () => {
    setOnline(false)
    await saveUserDraft('work-order', 'edit:wo-retry', { description: 'must not disappear' })

    setOnline(true)
    upsertState.fail = true
    expect(await syncPendingUserDrafts()).toBe(0)
    expect((await getDraftSyncStatus()).pending).toBe(1)

    upsertState.fail = false
    expect(await syncPendingUserDrafts()).toBe(1)
    expect((await getDraftSyncStatus()).pending).toBe(0)
  })
})
