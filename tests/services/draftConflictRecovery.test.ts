import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cloudRow = vi.hoisted(() => ({
  value: null as null | { payload: unknown; updated_at: string },
}))

const maybeSingle = vi.hoisted(() => vi.fn(async () => ({ data: cloudRow.value, error: null })))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-a' } } }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } }, error: null })),
    },
    rpc: vi.fn(async () => ({ data: 'company-a', error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle })),
            })),
          })),
        })),
      })),
      upsert: vi.fn(async () => ({ error: null })),
      insert: vi.fn(async () => ({ error: null })),
    })),
  },
}))

import { loadUserDraft, saveUserDraft } from '../../src/services/drafts.service'

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

describe('draft conflict recovery', () => {
  beforeEach(async () => {
    await resetDatabase()
    localStorage.clear()
    cloudRow.value = null
    maybeSingle.mockClear()
    localStorage.setItem(
      'fersys-draft-identity-v2',
      JSON.stringify({ companyId: 'company-a', userId: 'user-a' }),
    )
  })

  it('keeps an unsynced local edit visible when another device has a newer cloud version', async () => {
    setOnline(false)
    await saveUserDraft('work-order', 'edit:wo-1', { description: 'LOCAL UNSYNCED' })

    cloudRow.value = {
      payload: { description: 'NEWER CLOUD' },
      updated_at: '2099-01-01T00:00:00.000Z',
    }
    setOnline(true)

    const restored = await loadUserDraft<{ description: string }>('work-order', 'edit:wo-1')

    expect(restored?.payload.description).toBe('LOCAL UNSYNCED')
    expect(restored?.source).toBe('local')
  })
})
