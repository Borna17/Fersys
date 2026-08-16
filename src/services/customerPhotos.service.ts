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
    url: await signedUrl(row.storage_path),
  }
}

export async function getCustomerPhotos(
  customerId: string,
): Promise<CustomerPhoto[]> {
  const { data, error } =
    await supabase
      .from('customer_photos')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    throw error
  }

  return Promise.all(
    ((data ?? []) as CustomerPhotoRow[])
      .map(mapPhoto),
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

  const uploaded: CustomerPhoto[] = []

  for (const file of files) {
    const safeName =
      sanitizeFileName(file.name)

    const storagePath =
      `${companyId}/${customerId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } =
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
            cacheControl: '3600',
          },
        )

    if (uploadError) {
      throw uploadError
    }

    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from('customer_photos')
      .insert({
        company_id: companyId,
        customer_id: customerId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type:
          file.type ||
          'application/octet-stream',
        file_size: file.size,
      })
      .select('*')
      .single()

    if (insertError) {
      await supabase.storage
        .from(BUCKET)
        .remove([storagePath])

      throw insertError
    }

    uploaded.push(
      await mapPhoto(
        inserted as CustomerPhotoRow,
      ),
    )
  }

  return uploaded
}

export async function deleteCustomerPhoto(
  photo: CustomerPhoto,
) {
  const { error: storageError } =
    await supabase.storage
      .from(BUCKET)
      .remove([
        photo.storagePath,
      ])

  if (storageError) {
    throw storageError
  }

  const { error: deleteError } =
    await supabase
      .from('customer_photos')
      .delete()
      .eq('id', photo.id)

  if (deleteError) {
    throw deleteError
  }
}
