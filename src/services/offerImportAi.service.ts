import {
  supabase,
} from '../lib/supabase'

export type ImportedOfferItem = {
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
  confidence: number
}

export type OfferImportAiResult = {
  sourceSupplierName: string
  sourceOfferNumber: string
  sourceOfferDate: string
  sourceCurrency: string
  title: string
  description: string
  paymentTerms: string
  notes: string
  items: ImportedOfferItem[]
  confidence: number
  warnings: string[]
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes =
    new Uint8Array(
      buffer,
    )

  const chunkSize =
    0x8000

  let binary = ''

  for (
    let index = 0;
    index <
    bytes.length;
    index +=
      chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          index,
          Math.min(
            index +
              chunkSize,
            bytes.length,
          ),
        ),
      )
  }

  return btoa(binary)
}

export async function analyzeOfferScan(
  file: File,
): Promise<OfferImportAiResult> {
  if (
    !file.type.startsWith(
      'image/',
    )
  ) {
    throw new Error(
      'AI uvoz ponude trenutno očekuje fotografiju ili skeniranu sliku.',
    )
  }

  if (
    file.size >
    12 * 1024 * 1024
  ) {
    throw new Error(
      'Slika može imati najviše 12 MB.',
    )
  }

  const buffer =
    await file.arrayBuffer()

  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'offer-import-ai',
      {
        body: {
          imageBase64:
            arrayBufferToBase64(
              buffer,
            ),
          mimeType:
            file.type ||
            'image/jpeg',
        },
      },
    )

  if (error) {
    throw new Error(
      error.message ||
        'FERSYS AI nije mogao pročitati ponudu.',
    )
  }

  if (
    !data ||
    typeof data !==
      'object'
  ) {
    throw new Error(
      'FERSYS AI nije vratio ispravne podatke ponude.',
    )
  }

  return data as
    OfferImportAiResult
}
