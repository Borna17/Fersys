import { supabase } from '../lib/supabase'

export type DraftType =
  | 'work-order'
  | 'offer'
  | 'invoice'
  | 'inventory-item'

export type DraftRecord<T> = {
  draftType: DraftType
  draftKey: string
  payload: T
  updatedAt: string
  source: 'local' | 'cloud'
}

type Identity = {
  companyId: string
  userId: string
}

const DB_NAME = 'fersys-user-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'

function localKey(
  identity: Identity,
  draftType: DraftType,
  draftKey: string,
) {
  return [
    identity.companyId,
    identity.userId,
    draftType,
    draftKey,
  ].join(':')
}

async function getIdentity():
Promise<Identity> {
  const [
    companyResponse,
    userResponse,
  ] = await Promise.all([
    supabase.rpc(
      'current_company_id',
    ),
    supabase.auth.getUser(),
  ])

  if (companyResponse.error) {
    throw companyResponse.error
  }

  if (userResponse.error) {
    throw userResponse.error
  }

  if (
    !companyResponse.data ||
    !userResponse.data.user
  ) {
    throw new Error(
      'Korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return {
    companyId:
      String(
        companyResponse.data,
      ),

    userId:
      userResponse.data.user.id,
  }
}

function openDatabase():
Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION,
        )

      request.onupgradeneeded =
        () => {
          const db =
            request.result

          if (
            !db.objectStoreNames.contains(
              STORE_NAME,
            )
          ) {
            db.createObjectStore(
              STORE_NAME,
              {
                keyPath: 'key',
              },
            )
          }
        }

      request.onsuccess =
        () =>
          resolve(
            request.result,
          )

      request.onerror =
        () =>
          reject(
            request.error,
          )
    },
  )
}

async function saveLocal<T>(
  key: string,
  value: {
    payload: T
    updatedAt: string
  },
) {
  try {
    const db =
      await openDatabase()

    await new Promise<void>(
      (resolve, reject) => {
        const tx =
          db.transaction(
            STORE_NAME,
            'readwrite',
          )

        tx.objectStore(
          STORE_NAME,
        ).put({
          key,
          ...value,
        })

        tx.oncomplete =
          () => resolve()

        tx.onerror =
          () =>
            reject(tx.error)
      },
    )

    db.close()
  } catch (error) {
    console.error(
      'Lokalni autosave nije uspio:',
      error,
    )
  }
}

async function loadLocal<T>(
  key: string,
): Promise<{
  payload: T
  updatedAt: string
} | null> {
  try {
    const db =
      await openDatabase()

    const result =
      await new Promise<
        | {
            key: string
            payload: T
            updatedAt: string
          }
        | undefined
      >(
        (
          resolve,
          reject,
        ) => {
          const tx =
            db.transaction(
              STORE_NAME,
              'readonly',
            )

          const request =
            tx
              .objectStore(
                STORE_NAME,
              )
              .get(key)

          request.onsuccess =
            () =>
              resolve(
                request.result,
              )

          request.onerror =
            () =>
              reject(
                request.error,
              )
        },
      )

    db.close()

    if (!result) {
      return null
    }

    return {
      payload:
        result.payload,
      updatedAt:
        result.updatedAt,
    }
  } catch {
    return null
  }
}

async function deleteLocal(
  key: string,
) {
  try {
    const db =
      await openDatabase()

    await new Promise<void>(
      (resolve, reject) => {
        const tx =
          db.transaction(
            STORE_NAME,
            'readwrite',
          )

        tx.objectStore(
          STORE_NAME,
        ).delete(key)

        tx.oncomplete =
          () => resolve()

        tx.onerror =
          () =>
            reject(tx.error)
      },
    )

    db.close()
  } catch {
    // Cloud cleanup will still run.
  }
}

export async function saveUserDraft<T>(
  draftType: DraftType,
  draftKey: string,
  payload: T,
): Promise<string> {
  const identity =
    await getIdentity()

  const updatedAt =
    new Date().toISOString()

  const key =
    localKey(
      identity,
      draftType,
      draftKey,
    )

  // Lokalno se sprema prvo:
  // radi i kad internet nestane.
  await saveLocal(
    key,
    {
      payload,
      updatedAt,
    },
  )

  // Cloud je dodatna zaštita
  // i omogućuje nastavak na drugom uređaju.
  try {
    const {
      error,
    } = await supabase
      .from('user_drafts')
      .upsert(
        {
          company_id:
            identity.companyId,

          user_id:
            identity.userId,

          draft_type:
            draftType,

          draft_key:
            draftKey,

          payload,

          updated_at:
            updatedAt,

          expires_at:
            new Date(
              Date.now() +
                30 *
                  24 *
                  60 *
                  60 *
                  1000,
            ).toISOString(),
        },
        {
          onConflict:
            'company_id,user_id,draft_type,draft_key',
        },
      )

    if (error) {
      console.warn(
        'Cloud autosave trenutno nije dostupan:',
        error.message,
      )
    }
  } catch {
    // Offline: lokalna kopija ostaje.
  }

  return updatedAt
}

export async function loadUserDraft<T>(
  draftType: DraftType,
  draftKey: string,
): Promise<DraftRecord<T> | null> {
  const identity =
    await getIdentity()

  const key =
    localKey(
      identity,
      draftType,
      draftKey,
    )

  const local =
    await loadLocal<T>(
      key,
    )

  let cloud:
    | {
        payload: T
        updatedAt: string
      }
    | null = null

  try {
    const {
      data,
      error,
    } = await supabase
      .from('user_drafts')
      .select(
        'payload,updated_at',
      )
      .eq(
        'company_id',
        identity.companyId,
      )
      .eq(
        'user_id',
        identity.userId,
      )
      .eq(
        'draft_type',
        draftType,
      )
      .eq(
        'draft_key',
        draftKey,
      )
      .maybeSingle()

    if (!error && data) {
      cloud = {
        payload:
          data.payload as T,

        updatedAt:
          String(
            data.updated_at,
          ),
      }
    }
  } catch {
    // Offline.
  }

  if (!local && !cloud) {
    return null
  }

  if (
    cloud &&
    (
      !local ||
      new Date(
        cloud.updatedAt,
      ).getTime() >
        new Date(
          local.updatedAt,
        ).getTime()
    )
  ) {
    await saveLocal(
      key,
      cloud,
    )

    return {
      draftType,
      draftKey,
      payload:
        cloud.payload,
      updatedAt:
        cloud.updatedAt,
      source: 'cloud',
    }
  }

  return {
    draftType,
    draftKey,
    payload:
      local!.payload,
    updatedAt:
      local!.updatedAt,
    source: 'local',
  }
}

export async function deleteUserDraft(
  draftType: DraftType,
  draftKey: string,
): Promise<void> {
  const identity =
    await getIdentity()

  await deleteLocal(
    localKey(
      identity,
      draftType,
      draftKey,
    ),
  )

  try {
    await supabase
      .from('user_drafts')
      .delete()
      .eq(
        'company_id',
        identity.companyId,
      )
      .eq(
        'user_id',
        identity.userId,
      )
      .eq(
        'draft_type',
        draftType,
      )
      .eq(
        'draft_key',
        draftKey,
      )
  } catch {
    // Lokalni nacrt je već obrisan.
  }
}

export function formatDraftSavedAt(
  value: string,
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Automatski spremljeno'
  }

  return `Automatski spremljeno ${date.toLocaleTimeString(
    'hr-HR',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )}`
}
