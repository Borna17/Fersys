import type {
  WorkOrderMaterial,
} from '../types/workOrder'

export type WorkOrderPricing = {
  materialPrice: number
  labourPrice: number
  subtotalBeforeDiscount: number
  discountRate: number
  discountAmount: number
  taxableBase: number
  vatRate: number
  vatAmount: number
  totalPrice: number
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(
    100,
    Math.max(0, value),
  )
}

export function materialLineTotal(
  material: Pick<
    WorkOrderMaterial,
    | 'quantity'
    | 'unitPrice'
    | 'discountRate'
  >,
) {
  const gross =
    Math.max(0, Number(material.quantity) || 0) *
    Math.max(0, Number(material.unitPrice) || 0)

  const discount =
    clampPercent(
      Number(material.discountRate) || 0,
    )

  return (
    gross *
    (1 - discount / 100)
  )
}

export function calculateWorkOrderPricing({
  materials,
  labourPrice,
  discountRate,
  vatRate,
}: {
  materials: WorkOrderMaterial[]
  labourPrice: number
  discountRate?: number
  vatRate: number
}): WorkOrderPricing {
  const materialPrice =
    materials.reduce(
      (sum, material) =>
        sum +
        materialLineTotal(
          material,
        ),
      0,
    )

  const safeLabourPrice =
    Math.max(
      0,
      Number(labourPrice) || 0,
    )

  const subtotalBeforeDiscount =
    materialPrice +
    safeLabourPrice

  const safeDiscountRate =
    clampPercent(
      Number(discountRate) || 0,
    )

  const discountAmount =
    subtotalBeforeDiscount *
    (safeDiscountRate / 100)

  const taxableBase =
    Math.max(
      0,
      subtotalBeforeDiscount -
        discountAmount,
    )

  const safeVatRate =
    clampPercent(
      Number(vatRate) || 0,
    )

  const vatAmount =
    taxableBase *
    (safeVatRate / 100)

  return {
    materialPrice,
    labourPrice:
      safeLabourPrice,
    subtotalBeforeDiscount,
    discountRate:
      safeDiscountRate,
    discountAmount,
    taxableBase,
    vatRate: safeVatRate,
    vatAmount,
    totalPrice:
      taxableBase + vatAmount,
  }
}
