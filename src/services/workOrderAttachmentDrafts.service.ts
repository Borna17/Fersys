import type { WorkOrderImage } from '../types/workOrder'

const DB_NAME = 'fersys-work-order-attachments'
const DB_VERSION = 1
const STORE = 'attachments'

type AttachmentDraft = {
  key: string
  workOrderId: string
  images: WorkOrderImage[]
  investorSignature: string
  updatedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Attachment storage nije dostupan.'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Attachment storage operacija nije uspjela.'))
      tx.onerror = () => reject(tx.error ?? new Error('Attachment storage transakcija nije uspjela.'))
    })
  } finally {
    db.close()
  }
}

const keyFor = (workOrderId: string) => `edit:${workOrderId}`

export async function saveWorkOrderAttachmentDraft(workOrderId: string, images: WorkOrderImage[], investorSignature: string) {
  const draft: AttachmentDraft = {
    key: keyFor(workOrderId),
    workOrderId,
    images,
    investorSignature,
    updatedAt: new Date().toISOString(),
  }
  await withStore('readwrite', (store) => store.put(draft))
  return draft.updatedAt
}

export async function loadWorkOrderAttachmentDraft(workOrderId: string): Promise<AttachmentDraft | null> {
  const result = await withStore<AttachmentDraft | undefined>('readonly', (store) => store.get(keyFor(workOrderId)))
  return result ?? null
}

export async function deleteWorkOrderAttachmentDraft(workOrderId: string) {
  await withStore('readwrite', (store) => store.delete(keyFor(workOrderId)))
}
