import {
  useEffect,
  useRef,
} from 'react'

import {
  useAuth,
} from '../auth/AuthProvider'
import {
  supabase,
} from '../lib/supabase'
import {
  syncWorkOrderImagesToCustomerGallery,
  type WorkOrderGalleryImage,
} from '../services/customerPhotos.service'

type WorkOrderRealtimeRow = {
  id?: unknown
  company_id?: unknown
  customer_id?: unknown
  order_number?: unknown
  work_date?: unknown
  title?: unknown
  images?: unknown
}

function normalizeImages(
  value: unknown,
): WorkOrderGalleryImage[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (
        item,
      ): item is Record<
        string,
        unknown
      > =>
        Boolean(
          item &&
          typeof item ===
            'object',
        ),
    )
    .map(
      (item) => ({
        id:
          String(
            item.id ?? '',
          ),
        name:
          String(
            item.name ??
              'Fotografija',
          ),
        dataUrl:
          String(
            item.dataUrl ??
              '',
          ),
      }),
    )
    .filter(
      (image) =>
        Boolean(
          image.id &&
          image.dataUrl,
        ),
    )
}

export default function WorkOrderPhotoGallerySync() {
  const {
    membership,
  } =
    useAuth()

  const companyId =
    membership?.companyId ??
    ''

  const pendingRef =
    useRef(
      new Map<
        string,
        number
      >(),
    )

  useEffect(() => {
    if (!companyId) {
      return
    }

    let disposed = false

    function schedule(
      row:
        WorkOrderRealtimeRow,
    ) {
      if (disposed) {
        return
      }

      const workOrderId =
        String(
          row.id ?? '',
        )

      const customerId =
        String(
          row.customer_id ??
            '',
        )

      const rowCompanyId =
        String(
          row.company_id ??
            '',
        )

      const images =
        normalizeImages(
          row.images,
        )

      if (
        !workOrderId ||
        !customerId ||
        !images.length ||
        (
          rowCompanyId &&
          rowCompanyId !==
            companyId
        )
      ) {
        return
      }

      const currentTimer =
        pendingRef.current.get(
          workOrderId,
        )

      if (currentTimer) {
        window.clearTimeout(
          currentTimer,
        )
      }

      const timer =
        window.setTimeout(
          () => {
            pendingRef.current.delete(
              workOrderId,
            )

            if (disposed) {
              return
            }

            void syncWorkOrderImagesToCustomerGallery({
              workOrderId,
              customerId,
              orderNumber:
                String(
                  row.order_number ??
                    '',
                ),
              workDate:
                String(
                  row.work_date ??
                    '',
                ),
              title:
                String(
                  row.title ??
                    '',
                ),
              images,
            })
              .then(
                (
                  synced,
                ) => {
                  if (
                    !disposed &&
                    synced > 0
                  ) {
                    window.dispatchEvent(
                      new CustomEvent(
                        'fersys:customer-photos-changed',
                        {
                          detail: {
                            customerId,
                            workOrderId,
                            synced,
                          },
                        },
                      ),
                    )
                  }
                },
              )
              .catch(
                (
                  error,
                ) => {
                  if (!disposed) {
                    console.warn(
                      '[FERSYS] Fotografije radnog naloga nisu još sinkronizirane u galeriju investitora:',
                      error,
                    )
                  }
                },
              )
          },
          250,
        )

      pendingRef.current.set(
        workOrderId,
        timer,
      )
    }

    /*
     * Supabase vraća postojeći kanal kada se u developmentu/HMR-u
     * ponovno koristi ista tema. Tada je kanal već subscribe-an i novi
     * postgres_changes callback više se ne smije dodati. Zato svaka
     * instanca dobiva jedinstvenu temu i samo jedan '*' listener.
     */
    const instanceId =
      typeof crypto !== 'undefined' &&
      'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`

    const channel =
      supabase
        .channel(
          `work-order-photo-gallery:${companyId}:${instanceId}`,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'work_orders',
            filter:
              `company_id=eq.${companyId}`,
          },
          (
            payload,
          ) => {
            if (
              payload.eventType ===
                'INSERT' ||
              payload.eventType ===
                'UPDATE'
            ) {
              schedule(
                payload.new as
                  WorkOrderRealtimeRow,
              )
            }
          },
        )
        .subscribe()

    return () => {
      disposed = true

      for (
        const timer of
          pendingRef.current.values()
      ) {
        window.clearTimeout(
          timer,
        )
      }

      pendingRef.current.clear()

      void supabase.removeChannel(
        channel,
      )
    }
  }, [
    companyId,
  ])

  return null
}
