import {
  supabase,
} from '../lib/supabase'

export type IncomingInvoiceCategory =
  | 'Gorivo'
  | 'Materijal'
  | 'Alat'
  | 'Servis i održavanje'
  | 'Najam'
  | 'Telekomunikacije'
  | 'Komunalije'
  | 'Reprezentacija'
  | 'Uredski troškovi'
  | 'Ostalo'

export type IncomingInvoicePaymentMethod =
  | 'Kartica'
  | 'Gotovina'
  | 'Transakcijski račun'
  | 'Internet bankarstvo'
  | 'Ostalo'

export type IncomingInvoiceAiResult = {
  supplierName: string
  supplierOib: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  category:
    IncomingInvoiceCategory
  paymentMethod:
    IncomingInvoicePaymentMethod
  netAmount: number
  vatAmount: number
  totalAmount: number
  note: string
  currency: string
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

export async function analyzeIncomingInvoice(
  file: File,
): Promise<IncomingInvoiceAiResult> {
  if (
    !file.type.startsWith(
      'image/',
    )
  ) {
    throw new Error(
      'AI čitanje trenutno radi sa slikom računa.',
    )
  }

  const buffer =
    await file.arrayBuffer()

  const result =
    await supabase.functions.invoke(
      'incoming-invoice-ai',
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

  if (result.error) {
    throw new Error(
      result.error.message ||
        'AI nije mogao pročitati račun.',
    )
  }

  const data =
    result.data

  if (
    !data ||
    typeof data !==
      'object'
  ) {
    throw new Error(
      'AI nije vratio ispravne podatke računa.',
    )
  }

  return data as
    IncomingInvoiceAiResult
}
