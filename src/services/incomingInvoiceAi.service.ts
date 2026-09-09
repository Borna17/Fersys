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

export type IncomingInvoiceVehicleExpenseCategory =
  | 'Gorivo'
  | 'Servis'
  | 'Gume'
  | 'Registracija'
  | 'Osiguranje'
  | 'Cestarina'
  | 'Ostalo'

export type IncomingInvoiceAiResult = {
  supplierName: string
  supplierOib: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  category: IncomingInvoiceCategory
  paymentMethod: IncomingInvoicePaymentMethod
  netAmount: number
  vatAmount: number
  totalAmount: number
  note: string
  currency: string
  confidence: number
  warnings: string[]
  vehicleId?: string
  vehicleRegistration?: string
  vehicleExpenseCategory?: IncomingInvoiceVehicleExpenseCategory
  vehicleMatchConfidence?: number
  vehicleMatchReason?: string
  fuelLiters?: number
  fuelUnitPrice?: number
  vehicleMileage?: number
}

type VehicleLinkResult = {
  vehicleId?: string
  vehicleRegistration?: string
  expenseCategory?: IncomingInvoiceVehicleExpenseCategory
  confidence?: number
  reason?: string
  fuelLiters?: number
  fuelUnitPrice?: number
  mileage?: number
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes =
    new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        index,
        Math.min(index + chunkSize, bytes.length),
      ),
    )
  }

  return btoa(binary)
}

export async function analyzeIncomingInvoice(
  file: File,
): Promise<IncomingInvoiceAiResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error(
      'AI čitanje trenutno radi sa slikom računa.',
    )
  }

  const buffer = await file.arrayBuffer()
  const imageBase64 = arrayBufferToBase64(buffer)
  const body = {
    imageBase64,
    mimeType: file.type || 'image/jpeg',
  }

  const [invoiceResult, vehicleResult] = await Promise.all([
    supabase.functions.invoke(
      'incoming-invoice-ai',
      { body },
    ),
    supabase.functions.invoke(
      'incoming-invoice-vehicle-link',
      { body },
    ).catch(() => ({
      data: null,
      error: null,
    })),
  ])

  if (invoiceResult.error) {
    throw new Error(
      invoiceResult.error.message ||
        'AI nije mogao pročitati račun.',
    )
  }

  const data = invoiceResult.data

  if (!data || typeof data !== 'object') {
    throw new Error(
      'AI nije vratio ispravne podatke računa.',
    )
  }

  const vehicle =
    vehicleResult.data &&
    typeof vehicleResult.data === 'object'
      ? vehicleResult.data as VehicleLinkResult
      : null

  const warnings = Array.isArray((data as IncomingInvoiceAiResult).warnings)
    ? [...(data as IncomingInvoiceAiResult).warnings]
    : []

  if (
    vehicle?.vehicleId &&
    Number(vehicle.confidence ?? 0) >= 0.9
  ) {
    warnings.push(
      `Prepoznato vozilo ${vehicle.vehicleRegistration}. Trošak će se moći povezati s vozilom nakon spremanja računa.`,
    )
  }

  return {
    ...(data as IncomingInvoiceAiResult),
    warnings,
    vehicleId: vehicle?.vehicleId ?? '',
    vehicleRegistration:
      vehicle?.vehicleRegistration ?? '',
    vehicleExpenseCategory:
      vehicle?.expenseCategory,
    vehicleMatchConfidence:
      Number(vehicle?.confidence ?? 0),
    vehicleMatchReason:
      vehicle?.reason ?? '',
    fuelLiters: Math.max(0, Number(vehicle?.fuelLiters ?? 0)),
    fuelUnitPrice: Math.max(0, Number(vehicle?.fuelUnitPrice ?? 0)),
    vehicleMileage: Math.max(0, Math.round(Number(vehicle?.mileage ?? 0))),
  }
}
