import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsert = vi.hoisted(() => vi.fn(async () => ({ error: null })))
const insert = vi.hoisted(() => vi.fn(async () => ({ error: null })))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-a' } } }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } }, error: null })),
    },
    rpc: vi.fn(async () => ({ data: 'company-a', error: null })),
    from: vi.fn(() => ({ upsert, insert })),
  },
}))

import { loadUserDraft, saveUserDraft } from '../../src/services/drafts.service'
import {
  loadWorkOrderAttachmentDraft,
  saveWorkOrderAttachmentDraft,
} from '../../src/services/workOrderAttachmentDrafts.service'

async function resetDatabase(name: string) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error(`${name} deletion blocked`))
  })
}

describe('P0 large payload durability', () => {
  beforeEach(async () => {
    await resetDatabase('fersys-user-drafts')
    await resetDatabase('fersys-work-order-attachments')
    localStorage.clear()
    upsert.mockClear()
    insert.mockClear()
    localStorage.setItem(
      'fersys-draft-identity-v2',
      JSON.stringify({ companyId: 'company-a', userId: 'user-a' }),
    )
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
  })

  it('persists a large structured work order without binary photo data in the critical draft', async () => {
    const materials = Array.from({ length: 300 }, (_, i) => ({
      id: `material-${i}`,
      name: `Materijal ${i}`,
      quantity: i + 1,
      unit: 'kom',
      note: 'x'.repeat(120),
    }))
    const structured = {
      title: 'Veliki radni nalog',
      description: 'opis '.repeat(5000),
      materials,
      workers: Array.from({ length: 50 }, (_, i) => ({ id: `worker-${i}`, name: `Radnik ${i}` })),
    }

    await saveUserDraft('work-order', 'edit:wo-large', structured)
    await saveWorkOrderAttachmentDraft(
      'wo-large',
      Array.from({ length: 40 }, (_, i) => ({
        id: `photo-${i}`,
        name: `photo-${i}.jpg`,
        dataUrl: `data:image/jpeg;base64,${'A'.repeat(10000)}`,
      })) as never,
      `data:image/png;base64,${'S'.repeat(10000)}`,
    )

    const draft = await loadUserDraft<typeof structured>('work-order', 'edit:wo-large')
    const attachments = await loadWorkOrderAttachmentDraft('wo-large')

    expect(draft?.payload.materials).toHaveLength(300)
    expect(draft?.payload.description.length).toBeGreaterThan(20_000)
    expect(JSON.stringify(draft?.payload)).not.toContain('data:image/')
    expect(attachments?.images).toHaveLength(40)
    expect(attachments?.investorSignature).toContain('data:image/png;base64,')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('persists a large offer as structured data while offline', async () => {
    const offer = {
      customerName: 'Veliki kupac',
      notes: 'napomena '.repeat(4000),
      items: Array.from({ length: 500 }, (_, i) => ({
        id: `item-${i}`,
        description: `Stavka ${i} ${'detalj '.repeat(20)}`,
        quantity: 10,
        unitPrice: 12.34,
      })),
    }

    await saveUserDraft('offer', 'edit:offer-large', offer)
    const restored = await loadUserDraft<typeof offer>('offer', 'edit:offer-large')

    expect(restored?.source).toBe('local')
    expect(restored?.payload.items).toHaveLength(500)
    expect(restored?.payload.notes.length).toBeGreaterThan(20_000)
    expect(upsert).not.toHaveBeenCalled()
  })
})
