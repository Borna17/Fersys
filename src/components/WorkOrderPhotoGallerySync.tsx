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

    function schedule(
      row:
        WorkOrderRealtimeRow,
    ) {
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
                  console.warn(
                    '[FERSYS] Fotografije radnog naloga nisu još sinkronizirane u galeriju investitora:',
                    error,
                  )
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

    const channel =
      supabase
        .channel(
          `work-order-photo-gallery:${companyId}`,
        )
        .on(
          'postgres_changes',
          {
            event:
              'INSERT',
            schema:
              'public',
            table:
              'work_orders',
            filter:
              `company_id=eq.${companyId}`,
          },
          (
            payload,
          ) => {
            schedule(
              payload.new as
                WorkOrderRealtimeRow,
            )
          },
        )
        .on(
          'postgres_changes',
          {
            event:
              'UPDATE',
            schema:
              'public',
            table:
              'work_orders',
            filter:
              `company_id=eq.${companyId}`,
          },
          (
            payload,
          ) => {
            schedule(
              payload.new as
                WorkOrderRealtimeRow,
            )
          },
        )
        .subscribe()

    return () => {
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
