import { supabase } from '../lib/supabase'

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
const BUCKET = 'incoming-invoices'

type AccessRow = {
  company_id: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (
        !database.objectStoreNames.contains(
          STORE_NAME,
        )
      ) {
        database.createObjectStore(
          STORE_NAME,
          {
            keyPath: 'id',
          },
        )
      }
    }

    request.onsuccess = () =>
      resolve(request.result)

    request.onerror = () =>
      reject(
        request.error ??
          new Error(
            'Baza dokumenata se nije mogla otvoriti.',
          ),
      )
  })
}

async function getCurrentCompanyId():
  Promise<string> {
  const { data, error } = await supabase.rpc(
    'get_current_user_access',
  )

  if (error) {
    throw error
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  const companyId =
    (row as AccessRow | null)?.company_id

  if (!companyId) {
    throw new Error(
      'Aktivna tvrtka nije pronađena.',
    )
  }

  return companyId
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:"*?<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 140) || 'dokument'
  )
}

async function saveLocal(
  document: StoredDocument,
): Promise<void> {
  const database = await openDatabase()

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          'readwrite',
        )

      transaction
        .objectStore(STORE_NAME)
        .put(document)

      transaction.oncomplete = () =>
        resolve()

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error(
              'Dokument se nije mogao spremiti.',
            ),
        )
    },
  )

  database.close()
}

async function getLocal(
  documentId: string,
): Promise<StoredDocument | null> {
  const database = await openDatabase()

  const document =
    await new Promise<
      StoredDocument | null
    >((resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          'readonly',
        )

      const request =
        transaction
          .objectStore(STORE_NAME)
          .get(documentId)

      request.onsuccess = () =>
        resolve(
          (request.result as
            | StoredDocument
            | undefined) ?? null,
        )

      request.onerror = () =>
        reject(
          request.error ??
            new Error(
              'Dokument se nije mogao učitati.',
            ),
        )
    })

  database.close()
  return document
}

async function deleteLocal(
  documentId: string,
): Promise<void> {
  const database = await openDatabase()

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          'readwrite',
        )

      transaction
        .objectStore(STORE_NAME)
        .delete(documentId)

      transaction.oncomplete = () =>
        resolve()

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error(
              'Dokument se nije mogao obrisati.',
            ),
        )
    },
  )

  database.close()
}

async function cloudFolder(
  documentId: string,
) {
  const companyId =
    await getCurrentCompanyId()

  return {
    companyId,
    folder:
      `${companyId}/${documentId}`,
  }
}

async function uploadCloud(
  document: StoredDocument,
): Promise<void> {
  const { folder } =
    await cloudFolder(document.id)

  const path =
    `${folder}/${safeFileName(
      document.fileName,
    )}`

  const { data: existing } =
    await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit: 100,
      })

  if (existing?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(
        existing.map(
          (item) =>
            `${folder}/${item.name}`,
        ),
      )
  }

  const { error } =
    await supabase.storage
      .from(BUCKET)
      .upload(
        path,
        document.blob,
        {
          contentType:
            document.mimeType ||
            'application/octet-stream',
          upsert: true,
        },
      )

  if (error) {
    throw error
  }
}

async function getCloud(
  documentId: string,
): Promise<StoredDocument | null> {
  const { folder } =
    await cloudFolder(documentId)

  const { data, error } =
    await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit: 10,
      })

  if (error) {
    throw error
  }

  const file = data?.[0]

  if (!file) {
    return null
  }

  const path =
    `${folder}/${file.name}`

  const {
    data: blob,
    error: downloadError,
  } = await supabase.storage
    .from(BUCKET)
    .download(path)

  if (downloadError) {
    throw downloadError
  }

  return {
    id: documentId,
    fileName: file.name,
    mimeType:
      blob.type ||
      'application/octet-stream',
    createdAt:
      file.created_at ??
      new Date().toISOString(),
    blob,
  }
}

async function deleteCloud(
  documentId: string,
): Promise<void> {
  const { folder } =
    await cloudFolder(documentId)

  const { data, error } =
    await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit: 100,
      })

  if (error) {
    throw error
  }

  if (!data?.length) {
    return
  }

  const { error: removeError } =
    await supabase.storage
      .from(BUCKET)
      .remove(
        data.map(
          (item) =>
            `${folder}/${item.name}`,
        ),
      )

  if (removeError) {
    throw removeError
  }
}

export async function saveDocument(
  document: StoredDocument,
): Promise<void> {
  await saveLocal(document)
  await uploadCloud(document)
}

export async function syncLocalDocumentToCloud(
  documentId: string,
): Promise<void> {
  const local =
    await getLocal(documentId)

  if (!local) {
    return
  }

  try {
    const cloud =
      await getCloud(documentId)

    if (!cloud) {
      await uploadCloud(local)
    }
  } catch (error) {
    console.error(
      'Lokalni dokument nije prenesen u cloud:',
      error,
    )
  }
}

export async function getDocument(
  documentId: string,
): Promise<StoredDocument | null> {
  const local =
    await getLocal(documentId)

  if (local) {
    return local
  }

  const cloud =
    await getCloud(documentId)

  if (cloud) {
    try {
      await saveLocal(cloud)
    } catch {
      // Cloud dokument i dalje ostaje dostupan.
    }
  }

  return cloud
}

export async function deleteDocument(
  documentId: string,
): Promise<void> {
  await Promise.allSettled([
    deleteLocal(documentId),
    deleteCloud(documentId),
  ])
}

export async function downloadDocument(
  documentId: string,
): Promise<void> {
  const document =
    await getDocument(documentId)

  if (!document) {
    window.alert(
      'Dokument nije pronađen.',
    )
    return
  }

  const url =
    URL.createObjectURL(document.blob)

  const anchor =
    window.document.createElement('a')

  anchor.href = url
  anchor.download =
    document.fileName
  anchor.click()

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    2000,
  )
}
