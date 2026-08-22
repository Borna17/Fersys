import { supabase } from '../lib/supabase'

export type DashboardTodayOrder = {
  id: string
  orderNumber: string
  customerName: string
  date: string
  arrivalTime: string
  title: string
  status:
    | 'Novi'
    | 'Zakazan'
    | 'U tijeku'
    | 'Završen'
    | 'Otkazan'
  priority:
    | 'Nizak'
    | 'Normalan'
    | 'Visok'
    | 'Hitno'
}

export type FastDashboardData = {
  customersCount: number
  activeOrdersCount: number
  urgentOrdersCount: number
  unfinishedOrdersCount: number
  completedThisMonthCount: number
  pendingOffersCount: number
  acceptedOfferValue: number
  activeEmployeesCount: number
  todayOrders: DashboardTodayOrder[]
  warnings: string[]
}

type DashboardRpcShape = Partial<
  FastDashboardData
>

export const EMPTY_DASHBOARD_DATA:
FastDashboardData = {
  customersCount: 0,
  activeOrdersCount: 0,
  urgentOrdersCount: 0,
  unfinishedOrdersCount: 0,
  completedThisMonthCount: 0,
  pendingOffersCount: 0,
  acceptedOfferValue: 0,
  activeEmployeesCount: 0,
  todayOrders: [],
  warnings: [],
}

function numberValue(
  value: unknown,
) {
  const parsed =
    Number(value ?? 0)

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0
}

function normalizeTodayOrders(
  value: unknown,
): DashboardTodayOrder[] {
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
        orderNumber:
          String(
            item.orderNumber ??
              '',
          ),
        customerName:
          String(
            item.customerName ??
              '',
          ),
        date:
          String(
            item.date ?? '',
          ),
        arrivalTime:
          String(
            item.arrivalTime ??
              '',
          ),
        title:
          String(
            item.title ?? '',
          ),
        status:
          String(
            item.status ??
              'Novi',
          ) as DashboardTodayOrder['status'],
        priority:
          String(
            item.priority ??
              'Normalan',
          ) as DashboardTodayOrder['priority'],
      }),
    )
    .filter(
      (item) =>
        item.id.length > 0,
    )
}

export async function getFastDashboardData():
Promise<FastDashboardData> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_fast_dashboard_summary',
    )

  if (error) {
    throw error
  }

  const raw =
    (
      data &&
      typeof data ===
        'object'
        ? data
        : {}
    ) as DashboardRpcShape &
      Record<
        string,
        unknown
      >

  return {
    customersCount:
      numberValue(
        raw.customersCount,
      ),
    activeOrdersCount:
      numberValue(
        raw.activeOrdersCount,
      ),
    urgentOrdersCount:
      numberValue(
        raw.urgentOrdersCount,
      ),
    unfinishedOrdersCount:
      numberValue(
        raw.unfinishedOrdersCount,
      ),
    completedThisMonthCount:
      numberValue(
        raw.completedThisMonthCount,
      ),
    pendingOffersCount:
      numberValue(
        raw.pendingOffersCount,
      ),
    acceptedOfferValue:
      numberValue(
        raw.acceptedOfferValue,
      ),
    activeEmployeesCount:
      numberValue(
        raw.activeEmployeesCount,
      ),
    todayOrders:
      normalizeTodayOrders(
        raw.todayOrders,
      ),
    warnings: [],
  }
}
