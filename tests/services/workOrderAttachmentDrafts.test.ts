import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  deleteWorkOrderAttachmentDraft,
  loadWorkOrderAttachmentDraft,
  saveWorkOrderAttachmentDraft,
} from '../../src/services/workOrderAttachmentDrafts.service'

async function resetDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('fersys-work-order-attachments')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Attachment test database deletion was blocked.'))
  })
}

describe('work order attachment drafts', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('persists photos and signature locally and restores them after reopening', async () => {
    const images = [
      {
        id: 'photo-1',
        dataUrl: 'data:image/jpeg;base64,LOCAL_ONLY_BINARY',
        name: 'before.jpg',
      },
    ] as never

    const savedAt = await saveWorkOrderAttachmentDraft('wo-42', images, 'data:image/png;base64,SIGNATURE')
    const restored = await loadWorkOrderAttachmentDraft('wo-42')

    expect(restored).not.toBeNull()
    expect(restored?.workOrderId).toBe('wo-42')
    expect(restored?.images).toEqual(images)
    expect(restored?.investorSignature).toBe('data:image/png;base64,SIGNATURE')
    expect(restored?.updatedAt).toBe(savedAt)
  })

  it('isolates attachment drafts by work order and deletes only the requested draft', async () => {
    await saveWorkOrderAttachmentDraft('wo-a', [] as never, 'sig-a')
    await saveWorkOrderAttachmentDraft('wo-b', [] as never, 'sig-b')

    await deleteWorkOrderAttachmentDraft('wo-a')

    expect(await loadWorkOrderAttachmentDraft('wo-a')).toBeNull()
    expect((await loadWorkOrderAttachmentDraft('wo-b'))?.investorSignature).toBe('sig-b')
  })
})
