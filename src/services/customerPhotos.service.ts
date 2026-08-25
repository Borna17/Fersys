import { supabase } from '../lib/supabase'

const BUCKET = 'customer-photos'
const SIGNED_URL_SECONDS = 60 * 60

export type CustomerPhoto = {
  id: string
  companyId: string
  customerId: string
  storagePath: string
  fileName: string
  mimeType: string
  fileSize: number
  caption: string
  createdBy: string | null
  createdAt: string
  sourceWorkOrderId: string
  sourceImageId: string
  url: string
}

type CustomerPhotoRow = {
  id: string
  company_id: string
  customer_id: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number | string
  caption: string | null
  created_by: string | null
  created_at: string
  source_work_order_id?: string | null
  source_image_id?: string | null
}

export type WorkOrderGalleryImage = {
  id: string
  name: string
  dataUrl: string
}

export type WorkOrderGallerySyncInput = {
  workOrderId: string
  orderNumber: string
  customerId: string
  workDate: string
  title: string
  images: WorkOrderGalleryImage[]
}

function sanitizeFileName(
  value: string,
) {
  const extension =
    value.includes('.')
      ? `.${value.split('.').pop()?.toLowerCase() ?? 'jpg'}`
      : ''

  const base =
    value
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) ||
    'fotografija'

  return `${base}${extension}`
}

function captionForWorkOrder(
  input: WorkOrderGallerySyncInput,
) {
  return [
    input.orderNumber,
    input.title.trim(),
    input.workDate,
  ]
    .filter(Boolean)
    .join(' · ')
}

async function getCurrentCompanyId() {
  const { data, error } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

async function signedUrl(
  storagePath: string,
) {
  const { data, error } =
    await supabase.storage
      .from(BUCKET)
      .createSignedUrl(
        storagePath,
        SIGNED_URL_SECONDS,
      )

  if (error) {
    throw error
  }

  return data.signedUrl
}

async function mapPhoto(
  row: CustomerPhotoRow,
): Promise<CustomerPhoto> {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    caption: row.caption ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    sourceWorkOrderId:
      row.source_work_order_id ?? '',
    sourceImageId:
      row.source_image_id ?? '',
    url: await signedUrl(row.storage_path),
  }
}

async function dataUrlToBlob(
  dataUrl: string,
) {
  const match = dataUrl.match(
    /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s,
  )

  if (!match) {
    throw new Error(
      'Fotografiju nije moguće pripremiti za galeriju investitora.',
    )
  }

  const mimeType =
    match[1] || 'image/jpeg'
  const isBase64 =
    Boolean(match[2])
  const payload = match[3]

  try {
    if (isBase64) {
      const binary = atob(payload)
      const bytes =
        new Uint8Array(binary.length)

      for (
        let index = 0;
        index < binary.length;
        index += 1
      ) {
        bytes[index] =
          binary.charCodeAt(index)
      }

      return new Blob([bytes], {
        type: mimeType,
      })
    }

    return new Blob(
      [decodeURIComponent(payload)],
      { type: mimeType },
    )
  } catch {
    throw new Error(
      'Fotografiju nije moguće pripremiti za galeriju investitora.',
    )
  }
}

async function uploadWorkOrderImage(
  companyId: string,
  input: WorkOrderGallerySyncInput,
  image: WorkOrderGalleryImage,
) {
  const safeName =
    sanitizeFileName(
      image.name ||
      `radni-nalog-${image.id}.jpg`,
    )

  const storagePath =
    `${companyId}/${input.customerId}/work-orders/${input.workOrderId}/${image.id}-${safeName}`

  const blob =
    await dataUrlToBlob(
      image.dataUrl,
    )

  const mimeType =
    blob.type ||
    'image/jpeg'

  const {
    error: uploadError,
  } =
    await supabase.storage
      .from(BUCKET)
      .upload(
        storagePath,
        blob,
        {
          contentType:
            mimeType,
          upsert: true,
          cacheControl:
            '31536000',
        },
      )

  if (uploadError) {
    throw uploadError
  }

  const {
    error: insertError,
  } =
    await supabase
      .from('customer_photos')
      .upsert(
        {
          company_id:
            companyId,
          customer_id:
            input.customerId,
          storage_path:
            storagePath,
          file_name:
            image.name ||
            safeName,
          mime_type:
            mimeType,
          file_size:
            blob.size,
          caption:
            captionForWorkOrder(
              input,
            ),
          source_work_order_id:
            input.workOrderId,
          source_image_id:
            image.id,
        },
        {
          onConflict:
            'source_work_order_id,source_image_id',
          ignoreDuplicates:
            true,
        },
      )

  if (insertError) {
    throw insertError
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (
    item: T,
  ) => Promise<void>,
) {
  let index = 0

  async function runner() {
    while (
      index < items.length
    ) {
      const current =
        index

      index += 1

      await worker(
        items[current],
      )
    }
  }

  const count =
    Math.min(
      Math.max(
        1,
        concurrency,
      ),
      items.length,
    )

  await Promise.all(
    Array.from(
      {
        length: count,
      },
      () => runner(),
    ),
  )
}

export async function getCustomerPhotos(
  customerId: string,
): Promise<CustomerPhoto[]> {
  const { data, error } =
    await supabase
      .from('customer_photos')
      .select('*')
      .eq(
        'customer_id',
        customerId,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

  if (error) {
    throw error
  }

  return Promise.all(
    (
      (data ?? []) as
        CustomerPhotoRow[]
    ).map(
      mapPhoto,
    ),
  )
}

export async function uploadCustomerPhotos(
  customerId: string,
  files: File[],
): Promise<CustomerPhoto[]> {
  if (!files.length) {
    return []
  }

  const companyId =
    await getCurrentCompanyId()

  const uploaded:
    CustomerPhoto[] = []

  for (const file of files) {
    const safeName =
      sanitizeFileName(
        file.name,
      )

    const storagePath =
      `${companyId}/${customerId}/${crypto.randomUUID()}-${safeName}`

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(BUCKET)
        .upload(
          storagePath,
          file,
          {
            contentType:
              file.type ||
              'application/octet-stream',
            upsert: false,
            cacheControl:
              '3600',
          },
        )

    if (uploadError) {
      throw uploadError
    }

    const {
      data: inserted,
      error: insertError,
    } =
      await supabase
        .from('customer_photos')
        .insert({
          company_id:
            companyId,
          customer_id:
            customerId,
          storage_path:
            storagePath,
          file_name:
            file.name,
          mime_type:
            file.type ||
            'application/octet-stream',
          file_size:
            file.size,
        })
        .select('*')
        .single()

    if (insertError) {
      await supabase.storage
        .from(BUCKET)
        .remove([
          storagePath,
        ])

      throw insertError
    }

    uploaded.push(
      await mapPhoto(
        inserted as
          CustomerPhotoRow,
      ),
    )
  }

  return uploaded
}

export async function syncWorkOrderImagesToCustomerGallery(
  input: WorkOrderGallerySyncInput,
): Promise<number> {
  if (
    !input.customerId ||
    !input.workOrderId ||
    input.images.length === 0
  ) {
    return 0
  }

  const validImages =
    input.images.filter(
      (image) =>
        Boolean(
          image.id &&
          image.dataUrl,
        ),
    )

  if (
    validImages.length ===
    0
  ) {
    return 0
  }

  const {
    data: existingRows,
    error: existingError,
  } =
    await supabase
      .from('customer_photos')
      .select(
        'source_image_id',
      )
      .eq(
        'customer_id',
        input.customerId,
      )
      .eq(
        'source_work_order_id',
        input.workOrderId,
      )

  if (existingError) {
    throw existingError
  }

  const existingIds =
    new Set(
      (
        existingRows ??
        []
      )
        .map(
          (row) =>
            String(
              row
                .source_image_id ??
                '',
            ),
        )
        .filter(Boolean),
    )

  const missing =
    validImages.filter(
      (image) =>
        !existingIds.has(
          image.id,
        ),
    )

  if (
    missing.length === 0
  ) {
    return 0
  }

  const companyId =
    await getCurrentCompanyId()

  let completed = 0

  await runWithConcurrency(
    missing,
    1,
    async (image) => {
      await uploadWorkOrderImage(
        companyId,
        input,
        image,
      )

      completed += 1
    },
  )

  return completed
}

export async function deleteCustomerPhoto(
  photo: CustomerPhoto,
) {
  const {
    error: storageError,
  } =
    await supabase.storage
      .from(BUCKET)
      .remove([
        photo.storagePath,
      ])

  if (storageError) {
    throw storageError
  }

  const {
    error: deleteError,
  } =
    await supabase
      .from('customer_photos')
      .delete()
      .eq(
        'id',
        photo.id,
      )

  if (deleteError) {
    throw deleteError
  }
}
