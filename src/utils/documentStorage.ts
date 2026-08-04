export type StoredDocument = {
  id: string
  fileName: string
  mimeType: string
  createdAt: string
  blob: Blob
}

const DATABASE_NAME = 'fersys_documents'
const DATABASE_VERSION = 1
const STORE_NAME = 'documents'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(
        request.error ??
          new Error('Baza dokumenata se nije mogla otvoriti.'),
      )
  })
}

export async function saveDocument(
  document: StoredDocument,
): Promise<void> {
  const database = await openDatabase()

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      'readwrite',
    )
    const store = transaction.objectStore(STORE_NAME)

    store.put(document)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error('Dokument se nije mogao spremiti.'),
      )
  })

  database.close()
}

export async function getDocument(
  documentId: string,
): Promise<StoredDocument | null> {
  const database = await openDatabase()

  const document = await new Promise<StoredDocument | null>(
    (resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        'readonly',
      )
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(documentId)

      request.onsuccess = () =>
        resolve(
          (request.result as StoredDocument | undefined) ?? null,
        )
      request.onerror = () =>
        reject(
          request.error ??
            new Error('Dokument se nije mogao učitati.'),
        )
    },
  )

  database.close()
  return document
}

export async function deleteDocument(
  documentId: string,
): Promise<void> {
  const database = await openDatabase()

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      'readwrite',
    )
    const store = transaction.objectStore(STORE_NAME)

    store.delete(documentId)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error('Dokument se nije mogao obrisati.'),
      )
  })

  database.close()
}

export async function downloadDocument(
  documentId: string,
): Promise<void> {
  const document = await getDocument(documentId)

  if (!document) {
    window.alert('Dokument nije pronađen.')
    return
  }

  const url = URL.createObjectURL(document.blob)
  const anchor = window.document.createElement('a')

  anchor.href = url
  anchor.download = document.fileName
  anchor.click()

  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

