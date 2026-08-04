import {
  defaultWorkOrderBranding,
  type Customer,
  type WorkOrder,
  type WorkOrderBranding,
} from '../types/workOrder'

const WORK_ORDERS_KEY = 'fersys-work-orders-v2'
const CUSTOMERS_KEY = 'fersys-customers'
const BRANDING_KEY = 'fersys-work-order-branding'

export function readCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeCustomers(customers: Customer[]) {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers))
}

export function readWorkOrders(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(WORK_ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeWorkOrders(workOrders: WorkOrder[]) {
  localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(workOrders))
}

export function readBranding(): WorkOrderBranding {
  try {
    const raw = localStorage.getItem(BRANDING_KEY)
    if (!raw) return defaultWorkOrderBranding

    const parsed = JSON.parse(raw) as Partial<WorkOrderBranding>
    return {
      ...defaultWorkOrderBranding,
      ...parsed,
    }
  } catch {
    return defaultWorkOrderBranding
  }
}

export function writeBranding(branding: WorkOrderBranding) {
  localStorage.setItem(BRANDING_KEY, JSON.stringify(branding))
}

export function generateWorkOrderNumber(existingOrders: WorkOrder[]) {
  const year = new Date().getFullYear()
  const matching = existingOrders
    .map((order) => order.orderNumber)
    .filter((number) => number.startsWith(`RN-${year}-`))
    .map((number) => Number(number.split('-').at(-1)))
    .filter((value) => Number.isFinite(value))

  const next = matching.length > 0 ? Math.max(...matching) + 1 : 1
  return `RN-${year}-${String(next).padStart(3, '0')}`
}

