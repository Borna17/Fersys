import { supabase } from '../lib/supabase'

export type DraftType =
  | 'work-order'
  | 'offer'
  | 'invoice'
  | 'inventory-item'
  | 'delivery-note'
  | 'incoming-invoice'
  | 'customer'
  | 'vehicle'
  | 'employee'
  | 'form'

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

type LocalDraftEnvelope<T = unknown> = {
  key: string
  companyId: string
  userId: string
  draftType: DraftType
  draftKey: string
  payload: T
  updatedAt: string
  syncState: 'pending' | 'synced'
}

export type DraftSyncStatus = {
  online: boolean
  pending: number
  lastSyncedAt: string
}

const DB_NAME = 'fersys-user-drafts'
const DB_VERSION = 2
const STORE_NAME = 'drafts'
const IDENTITY_CACHE_KEY =
  'fersys-draft-identity-v2'
const LAST_SYNC_KEY =
  'fersys-draft-last-sync-v1'

const DRAFT_MANIFEST_KEY =
  'fersys-draft-manifest-v1'

export type DraftManifestEntry = {
  draftType: DraftType
  draftKey: string
  label: string
  route: string
  updatedAt: string
}

function draftMeta(
  draftType: DraftType,
  draftKey: string,
  payload: unknown,
): { label: string; route: string } {
  const source =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null

  const meta =
    source?.__draftMeta &&
    typeof source.__draftMeta === 'object'
      ? (source.__draftMeta as Record<string, unknown>)
      : null

  const explicitLabel =
    typeof meta?.label === 'string'
      ? meta.label.trim()
      : ''
  const explicitRoute =
    typeof meta?.route === 'string'
      ? meta.route.trim()
      : ''

  if (explicitLabel && explicitRoute) {
    return {
      label: explicitLabel,
      route: explicitRoute,
    }
  }

  const editId =
    draftKey.startsWith('edit:')
      ? draftKey.slice(5)
      : ''

  switch (draftType) {
    case 'work-order':
      return {
        label: editId
          ? 'Uređivanje radnog naloga'
          : 'Novi radni nalog',
        route: editId
          ? `/work-orders/${editId}/edit`
          : '/work-orders/new',
      }
    case 'offer':
      return {
        label: editId
          ? 'Uređivanje ponude'
          : 'Nova ponuda',
        route: editId
          ? `/offers/${editId}/edit`
          : '/offers/new',
      }
    case 'invoice':
      return {
        label: editId
          ? 'Uređivanje računa'
          : 'Novi račun',
        route: editId
          ? `/invoices/${editId}/edit`
          : '/invoices/new',
      }
    case 'inventory-item':
      return {
        label: editId
          ? 'Uređivanje artikla'
          : 'Novi artikl',
        route: editId
          ? `/inventory/${editId}/edit`
          : '/inventory/new',
      }
    case 'delivery-note':
      return {
        label: editId
          ? 'Uređivanje otpremnice'
          : 'Nova otpremnica',
        route: editId
          ? `/delivery-notes/new?edit=${encodeURIComponent(editId)}`
          : '/delivery-notes/new',
      }
    case 'incoming-invoice':
      return {
        label: editId
          ? 'Uređivanje ulaznog računa'
          : 'Novi ulazni račun',
        route: editId
          ? `/incoming-invoices/${editId}/edit`
          : '/incoming-invoices/new',
      }
    case 'customer':
      return {
        label: editId
          ? 'Uređivanje investitora'
          : 'Novi investitor',
        route: editId
          ? `/customers/${editId}`
          : '/customers',
      }
    case 'vehicle':
      return {
        label: editId
          ? 'Uređivanje vozila'
          : 'Novo vozilo',
        route: editId
          ? `/vehicles/${editId}`
          : '/vehicles',
      }
    case 'employee':
      return {
        label: editId
          ? 'Uređivanje zaposlenika'
          : 'Novi zaposlenik',
        route: '/settings/employees',
      }
    default:
      return {
        label: explicitLabel || 'Nedovršeni unos',
        route: explicitRoute || '/dashboard',
      }
  }
}

function readDraftManifest(): DraftManifestEntry[] {
  try {
    const raw = localStorage.getItem(DRAFT_MANIFEST_KEY)
    if (!raw) return []
    const value = JSON.parse(raw) as DraftManifestEntry[]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeDraftManifest(entries: DraftManifestEntry[]) {
  try {
    localStorage.setItem(
      DRAFT_MANIFEST_KEY,
      JSON.stringify(entries),
    )
  } catch {
    // Manifest je pomoćni prikaz; IndexedDB nacrt ostaje glavni izvor sigurnosti.
  }
}

function rememberDraftManifest(
  draftType: DraftType,
  draftKey: string,
  payload: unknown,
  updatedAt: string,
) {
  const meta = draftMeta(draftType, draftKey, payload)
  const next: DraftManifestEntry = {
    draftType,
    draftKey,
    label: meta.label,
    route: meta.route,
    updatedAt,
  }

  const current = readDraftManifest().filter(
    (entry) =>
      !(
        entry.draftType === draftType &&
        entry.draftKey === draftKey
      ),
  )

  writeDraftManifest([next, ...current].slice(0, 100))
}

function forgetDraftManifest(
  draftType: DraftType,
  draftKey: string,
) {
  writeDraftManifest(
    readDraftManifest().filter(
      (entry) =>
        !(
          entry.draftType === draftType &&
          entry.draftKey === draftKey
        ),
    ),
  )
}

export function getDraftManifestEntries() {
  return readDraftManifest().sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime(),
  )
}

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

function readCachedIdentity():
Identity | null {
  try {
    const raw =
      localStorage.getItem(
        IDENTITY_CACHE_KEY,
      )

    if (!raw) {
      return null
    }

    const parsed =
      JSON.parse(raw) as
        Partial<Identity>

    const companyId =
      String(
        parsed.companyId ?? '',
      ).trim()
    const userId =
      String(
        parsed.userId ?? '',
      ).trim()

    if (
      !companyId ||
      !userId
    ) {
      return null
    }

    return {
      companyId,
      userId,
    }
  } catch {
    return null
  }
}

function cacheIdentity(
  identity: Identity,
) {
  try {
    localStorage.setItem(
      IDENTITY_CACHE_KEY,
      JSON.stringify(
        identity,
      ),
    )
  } catch {
    // Privatni način rada ili puni storage ne smiju blokirati aplikaciju.
  }
}

async function getSessionUserId() {
  try {
    const {
      data,
      error,
    } =
      await supabase.auth
        .getSession()

    if (error) {
      return ''
    }

    return (
      data.session?.user.id ??
      ''
    )
  } catch {
    return ''
  }
}

async function getIdentity():
Promise<Identity> {
  const sessionUserId =
    await getSessionUserId()

  try {
    const [
      companyResponse,
      userResponse,
    ] = await Promise.all([
      supabase.rpc(
        'current_company_id',
      ),
      supabase.auth.getUser(),
    ])

    if (
      !companyResponse.error &&
      !userResponse.error &&
      companyResponse.data &&
      userResponse.data.user
    ) {
      const identity = {
        companyId:
          String(
            companyResponse.data,
          ),
        userId:
          userResponse.data.user.id,
      }

      cacheIdentity(
        identity,
      )

      return identity
    }
  } catch {
    // Mreža može biti potpuno nedostupna.
  }

  const cached =
    readCachedIdentity()

  if (
    cached &&
    (
      !sessionUserId ||
      cached.userId ===
        sessionUserId
    )
  ) {
    return cached
  }

  throw new Error(
    navigator.onLine
      ? 'Korisnik nije povezan s aktivnom tvrtkom.'
      : 'Nema mreže i lokalni identitet još nije spremljen. Otvori FERSYS jednom dok si online.',
  )
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

async function putLocal<T>(
  envelope:
    LocalDraftEnvelope<T>,
) {
  const db =
    await openDatabase()

  try {
    await new Promise<void>(
      (resolve, reject) => {
        const tx =
          db.transaction(
            STORE_NAME,
            'readwrite',
          )

        tx.objectStore(
          STORE_NAME,
        ).put(
          envelope,
        )

        tx.oncomplete =
          () => resolve()

        tx.onerror =
          () =>
            reject(
              tx.error,
            )
      },
    )
  } finally {
    db.close()
  }
}

async function loadLocal<T>(
  key: string,
): Promise<
  LocalDraftEnvelope<T> | null
> {
  try {
    const db =
      await openDatabase()

    try {
      const result =
        await new Promise<
          LocalDraftEnvelope<T> |
            undefined
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

      return result ?? null
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

async function listLocal():
Promise<LocalDraftEnvelope[]> {
  try {
    const db =
      await openDatabase()

    try {
      return await new Promise<
        LocalDraftEnvelope[]
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
              .getAll()

          request.onsuccess =
            () =>
              resolve(
                (
                  request.result ??
                  []
                ) as LocalDraftEnvelope[],
              )

          request.onerror =
            () =>
              reject(
                request.error,
              )
        },
      )
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

async function deleteLocal(
  key: string,
) {
  try {
    const db =
      await openDatabase()

    try {
      await new Promise<void>(
        (
          resolve,
          reject,
        ) => {
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
              reject(
                tx.error,
              )
        },
      )
    } finally {
      db.close()
    }
  } catch {
    // Cloud cleanup se i dalje pokušava.
  }
}

function normalizeLegacyEnvelope<T>(
  value:
    LocalDraftEnvelope<T>,
  identity: Identity,
  draftType: DraftType,
  draftKey: string,
): LocalDraftEnvelope<T> {
  return {
    key:
      value.key ||
      localKey(
        identity,
        draftType,
        draftKey,
      ),
    companyId:
      value.companyId ||
      identity.companyId,
    userId:
      value.userId ||
      identity.userId,
    draftType:
      value.draftType ||
      draftType,
    draftKey:
      value.draftKey ||
      draftKey,
    payload:
      value.payload,
    updatedAt:
      value.updatedAt,
    syncState:
      value.syncState ||
      'pending',
  }
}

async function uploadEnvelope(
  envelope:
    LocalDraftEnvelope,
) {
  const {
    error,
  } =
    await supabase
      .from(
        'user_drafts',
      )
      .upsert(
        {
          company_id:
            envelope.companyId,
          user_id:
            envelope.userId,
          draft_type:
            envelope.draftType,
          draft_key:
            envelope.draftKey,
          payload:
            envelope.payload,
          updated_at:
            envelope.updatedAt,
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
    throw error
  }

  await putLocal({
    ...envelope,
    syncState:
      'synced',
  })
}

export async function saveUserDraft<T>(
  draftType: DraftType,
  draftKey: string,
  payload: T,
): Promise<string> {
  const identity =
    await getIdentity()

  const updatedAt =
    new Date()
      .toISOString()

  const envelope:
    LocalDraftEnvelope<T> = {
      key:
        localKey(
          identity,
          draftType,
          draftKey,
        ),
      companyId:
        identity.companyId,
      userId:
        identity.userId,
      draftType,
      draftKey,
      payload,
      updatedAt,
      syncState:
        'pending',
    }

  // Prvo IndexedDB. Ovo je izvor sigurnosti kad mreža nestane.
  await putLocal(
    envelope,
  )

  rememberDraftManifest(
    draftType,
    draftKey,
    payload,
    updatedAt,
  )

  window.dispatchEvent(
    new Event(
      'fersys:draft-sync-change',
    ),
  )

  if (
    navigator.onLine
  ) {
    try {
      await uploadEnvelope(
        envelope,
      )
    } catch (error) {
      console.warn(
        'Cloud autosave trenutno nije dostupan:',
        error,
      )
    }
  }

  window.dispatchEvent(
    new Event(
      'fersys:draft-sync-change',
    ),
  )

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

  const rawLocal =
    await loadLocal<T>(
      key,
    )

  const local =
    rawLocal
      ? normalizeLegacyEnvelope(
          rawLocal,
          identity,
          draftType,
          draftKey,
        )
      : null

  let cloud:
    | {
        payload: T
        updatedAt: string
      }
    | null = null

  if (
    navigator.onLine
  ) {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'user_drafts',
          )
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

      if (
        !error &&
        data
      ) {
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
      // Lokalni nacrt ostaje dostupan.
    }
  }

  if (
    !local &&
    !cloud
  ) {
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
    const envelope:
      LocalDraftEnvelope<T> = {
      key,
      companyId:
        identity.companyId,
      userId:
        identity.userId,
      draftType,
      draftKey,
      payload:
        cloud.payload,
      updatedAt:
        cloud.updatedAt,
      syncState:
        'synced',
    }

    await putLocal(
      envelope,
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

  const key =
    localKey(
      identity,
      draftType,
      draftKey,
    )

  await deleteLocal(
    key,
  )

  forgetDraftManifest(
    draftType,
    draftKey,
  )

  window.dispatchEvent(
    new Event(
      'fersys:draft-sync-change',
    ),
  )

  if (
    !navigator.onLine
  ) {
    return
  }

  try {
    await supabase
      .from(
        'user_drafts',
      )
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

export async function getDraftSyncStatus():
Promise<DraftSyncStatus> {
  let pending = 0

  try {
    const identity =
      await getIdentity()

    const drafts =
      await listLocal()

    pending =
      drafts.filter(
        (draft) =>
          draft.companyId ===
            identity.companyId &&
          draft.userId ===
            identity.userId &&
          (
            !draft.syncState ||
            draft.syncState ===
              'pending'
          ),
      ).length
  } catch {
    // Offline prije prvog uspješnog identiteta.
  }

  return {
    online:
      navigator.onLine,
    pending,
    lastSyncedAt:
      localStorage.getItem(
        LAST_SYNC_KEY,
      ) ?? '',
  }
}

export async function syncPendingUserDrafts():
Promise<number> {
  if (
    !navigator.onLine
  ) {
    return 0
  }

  const identity =
    await getIdentity()

  const drafts =
    await listLocal()

  const pending =
    drafts.filter(
      (draft) =>
        (
          draft.companyId ===
            identity.companyId ||
          !draft.companyId
        ) &&
        (
          draft.userId ===
            identity.userId ||
          !draft.userId
        ) &&
        (
          !draft.syncState ||
          draft.syncState ===
            'pending'
        ),
    )

  let synced = 0

  for (
    const raw of
      pending
  ) {
    const envelope =
      normalizeLegacyEnvelope(
        raw,
        identity,
        raw.draftType,
        raw.draftKey,
      )

    try {
      await uploadEnvelope(
        envelope,
      )
      synced += 1
    } catch (error) {
      console.warn(
        'Nacrt još nije sinkroniziran:',
        error,
      )
    }
  }

  if (
    synced > 0 ||
    pending.length === 0
  ) {
    try {
      localStorage.setItem(
        LAST_SYNC_KEY,
        new Date()
          .toISOString(),
      )
    } catch {
      // Status sinkronizacije nije kritičan.
    }
  }

  window.dispatchEvent(
    new Event(
      'fersys:draft-sync-change',
    ),
  )

  return synced
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
