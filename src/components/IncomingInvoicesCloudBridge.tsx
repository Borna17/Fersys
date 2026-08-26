import {
  useEffect,
  useRef,
} from 'react'

import {
  deleteIncomingInvoiceCloud,
  getIncomingInvoicesCloud,
  migrateLegacyIncomingInvoices,
  type CloudIncomingInvoice,
} from '../services/incomingInvoicesCloud.service'
import {
  syncLocalDocumentToCloud,
} from '../utils/documentStorage'

const STORAGE_KEY =
  'fersys_incoming_invoices'

const SYNC_INTERVAL_MS = 30000

function readLocal():
  CloudIncomingInvoice[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(
        STORAGE_KEY,
      ) ?? '[]',
    ) as CloudIncomingInvoice[]

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch {
    return []
  }
}

function writeLocal(
  invoices:
    CloudIncomingInvoice[],
) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(invoices),
  )
}

function byNewest(
  items:
    CloudIncomingInvoice[],
) {
  return [...items].sort(
    (a, b) =>
      new Date(
        b.updatedAt ||
          b.createdAt,
      ).getTime() -
      new Date(
        a.updatedAt ||
          a.createdAt,
      ).getTime(),
  )
}

function mergeInvoices(
  local:
    CloudIncomingInvoice[],
  remote:
    CloudIncomingInvoice[],
) {
  const map =
    new Map<
      string,
      CloudIncomingInvoice
    >()

  for (const item of remote) {
    map.set(item.id, item)
  }

  for (const item of local) {
    const existing =
      map.get(item.id)

    if (!existing) {
      map.set(item.id, item)
      continue
    }

    const localTime =
      new Date(
        item.updatedAt ||
          item.createdAt,
      ).getTime()

    const remoteTime =
      new Date(
        existing.updatedAt ||
          existing.createdAt,
      ).getTime()

    if (
      localTime >=
      remoteTime
    ) {
      map.set(item.id, item)
    }
  }

  return byNewest(
    Array.from(
      map.values(),
    ),
  )
}

function errorKey(error: unknown) {
  if (
    error &&
    typeof error === 'object'
  ) {
    const record =
      error as Record<string, unknown>

    return [
      String(record.code ?? ''),
      String(record.message ?? ''),
    ].join(':')
  }

  return String(error)
}

export function
IncomingInvoicesCloudBridge() {
  const previousLocalIdsRef =
    useRef<Set<string> | null>(
      null,
    )

  const syncingRef =
    useRef(false)

  const migrationAttemptedRef =
    useRef(false)

  const lastErrorRef =
    useRef('')

  useEffect(() => {
    let cancelled = false

    async function sync() {
      if (
        cancelled ||
        syncingRef.current
      ) {
        return
      }

      syncingRef.current = true

      try {
        const {
          data: {
            session,
          },
        } =
          await (
            await import(
              '../lib/supabase'
            )
          ).supabase.auth
            .getSession()

        if (!session) {
          return
        }

        const local =
          readLocal()

        const currentLocalIds =
          new Set(
            local.map(
              (item) => item.id,
            ),
          )

        const previousIds =
          previousLocalIdsRef.current

        if (previousIds) {
          const removedIds =
            Array.from(
              previousIds,
            ).filter(
              (id) =>
                !currentLocalIds.has(
                  id,
                ),
            )

          for (
            const id
            of removedIds
          ) {
            await deleteIncomingInvoiceCloud(
              id,
            )
          }
        }

        if (
          !migrationAttemptedRef.current &&
          local.length > 0
        ) {
          migrationAttemptedRef.current = true

          for (
            const invoice
            of local
          ) {
            for (
              const document
              of invoice.documents ??
                []
            ) {
              await syncLocalDocumentToCloud(
                document.id,
              )
            }
          }

          await migrateLegacyIncomingInvoices(
            local,
          )
        }

        const remote =
          await getIncomingInvoicesCloud()

        const merged =
          mergeInvoices(
            local,
            remote,
          )

        const previousJson =
          JSON.stringify(
            byNewest(local),
          )

        const nextJson =
          JSON.stringify(
            merged,
          )

        if (
          previousJson !==
          nextJson
        ) {
          writeLocal(
            merged,
          )

          window.dispatchEvent(
            new CustomEvent(
              'fersys:incoming-invoices-synced',
              {
                detail: {
                  invoices:
                    merged,
                },
              },
            ),
          )
        }

        previousLocalIdsRef.current =
          new Set(
            merged.map(
              (item) =>
                item.id,
            ),
          )

        lastErrorRef.current = ''
      } catch (error) {
        const key = errorKey(error)

        if (
          lastErrorRef.current !== key
        ) {
          lastErrorRef.current = key
          console.error(
            'Cloud sinkronizacija ulaznih računa nije uspjela:',
            error,
          )
        }
      } finally {
        syncingRef.current =
          false
      }
    }

    void sync()

    const timer =
      window.setInterval(
        () => {
          void sync()
        },
        SYNC_INTERVAL_MS,
      )

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void sync()
        }
      }

    window.addEventListener(
      'focus',
      sync,
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    )

    return () => {
      cancelled = true

      window.clearInterval(
        timer,
      )

      window.removeEventListener(
        'focus',
        sync,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      )
    }
  }, [])

  return null
}
