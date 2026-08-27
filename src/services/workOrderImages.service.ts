import { supabase } from '../lib/supabase'
import type { CloudWorkOrderImage } from './workOrders.service'

const BUCKET = 'customer-photos'
const SIGNED_URL_SECONDS = 60 * 60

type GalleryRow = {
  id: string
  file_name: string
  storage_path: string
  source_image_id: string | null
  created_at: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLegacyImages(value: unknown): CloudWorkOrderImage[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isObject)
    .map((image) => ({
      id: typeof image.id === 'string' ? image.id : crypto.randomUUID(),
      name: typeof image.name === 'string' ? image.name : 'Fotografija',
      dataUrl: typeof image.dataUrl === 'string' ? image.dataUrl : '',
    }))
    .filter((image) => image.dataUrl !== '')
}

async function getGalleryImages(workOrderId: string): Promise<CloudWorkOrderImage[]> {
  const { data, error } = await supabase
    .from('customer_photos')
    .select('id,file_name,storage_path,source_image_id,created_at')
    .eq('source_work_order_id', workOrderId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as GalleryRow[]
  if (!rows.length) return []

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS)

      if (signedError) throw signedError

      return {
        id: row.source_image_id || row.id,
        name: row.file_name || 'Fotografija',
        dataUrl: signed.signedUrl,
      }
    }),
  )
}

async function getLegacyImages(workOrderId: string): Promise<CloudWorkOrderImage[]> {
  const { data, error } = await supabase.rpc(
    'get_legacy_work_order_images_by_id',
    { requested_work_order_id: workOrderId },
  )

  if (error) throw error
  return parseLegacyImages(data)
}

export async function getWorkOrderImagesForDisplay(
  workOrderId: string,
): Promise<CloudWorkOrderImage[]> {
  const galleryImages = await getGalleryImages(workOrderId)

  if (galleryImages.length > 0) {
    return galleryImages
  }

  return getLegacyImages(workOrderId)
}
