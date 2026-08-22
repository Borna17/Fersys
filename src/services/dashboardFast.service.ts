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

type WorkOrderSummaryRow = {
  id: string
  order_number: string
  customer_name: string
  work_date: string
  arrival_time: string | null
  title: string
  status: DashboardTodayOrder['status']
  priority: DashboardTodayOrder['priority']
}

type OfferItemsRow = {
  items: unknown
}

function localDate(
  date = new Date(),
) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function monthRange() {
  const now = new Date()

  return {
    from: localDate(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ),
    ),
    to: localDate(
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ),
    ),
  }
}

function errorText(
  value: unknown,
) {
  if (
    value &&
    typeof value === 'object' &&
    'message' in value
  ) {
    return String(
      (
        value as {
          message?: unknown
        }
      ).message ?? 'Greška',
    )
  }

  return String(
    value ?? 'Nepoznata greška',
  )
}

function offerItemsTotal(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return 0
  }

  return value.reduce(
    (
      total,
      raw,
    ) => {
      if (
        !raw ||
        typeof raw !== 'object'
      ) {
        return total
      }

      const item =
        raw as Record<
          string,
          unknown
        >

      const quantity =
        Math.max(
          0,
          Number(
            item.quantity,
          ) || 0,
        )
      const price =
        Math.max(
          0,
          Number(
            item.price,
          ) || 0,
        )
      const discount =
        Math.min(
          100,
          Math.max(
            0,
            Number(
              item.discount,
            ) || 0,
          ),
        )
      const vat =
        Math.min(
          100,
          Math.max(
            0,
            Number(
              item.vat,
            ) || 0,
          ),
        )

      const base =
        quantity *
        price *
        (
          1 -
          discount / 100
        )

      return (
        total +
        base *
          (
            1 +
            vat / 100
          )
      )
    },
    0,
  )
}

async function safeCount(
  label: string,
  query:
    PromiseLike<{
      count:
        | number
        | null
      error:
        | {
            message: string
          }
        | null
    }>,
  warnings: string[],
) {
  try {
    const {
      count,
      error,
    } =
      await query

    if (error) {
      warnings.push(
        `${label}: ${error.message}`,
      )
      return 0
    }

    return count ?? 0
  } catch (error) {
    warnings.push(
      `${label}: ${errorText(
        error,
      )}`,
    )
    return 0
  }
}

export async function getFastDashboardData(
  options: {
    includeOffers: boolean
    includeEmployees: boolean
  },
): Promise<FastDashboardData> {
  const warnings:
    string[] = []

  const today =
    localDate()
  const range =
    monthRange()

  const customersPromise =
    safeCount(
      'Investitori',
      supabase
        .from('customers')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )
        .is(
          'deleted_at',
          null,
        ),
      warnings,
    )

  const activeOrdersPromise =
    safeCount(
      'Aktivni nalozi',
      supabase
        .from(
          'work_orders',
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )
        .in(
          'status',
          [
            'Novi',
            'Zakazan',
            'U tijeku',
          ],
        ),
      warnings,
    )

  const urgentOrdersPromise =
    safeCount(
      'Hitni nalozi',
      supabase
        .from(
          'work_orders',
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )
        .in(
          'status',
          [
            'Novi',
            'Zakazan',
            'U tijeku',
          ],
        )
        .eq(
          'priority',
          'Hitno',
        ),
      warnings,
    )

  const unfinishedOrdersPromise =
    safeCount(
      'Nalozi za provjeru',
      supabase
        .from(
          'work_orders',
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )
        .in(
          'status',
          [
            'Novi',
            'Zakazan',
            'U tijeku',
          ],
        )
        .lt(
          'work_date',
          today,
        ),
      warnings,
    )

  const completedPromise =
    safeCount(
      'Završeni poslovi',
      supabase
        .from(
          'work_orders',
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          },
        )
        .eq(
          'status',
          'Završen',
        )
        .gte(
          'work_date',
          range.from,
        )
        .lte(
          'work_date',
          range.to,
        ),
      warnings,
    )

  const todayOrdersPromise =
    (
      async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                'work_orders',
              )
              .select(
                'id,order_number,customer_name,work_date,arrival_time,title,status,priority',
              )
              .eq(
                'work_date',
                today,
              )
              .neq(
                'status',
                'Otkazan',
              )
              .order(
                'arrival_time',
                {
                  ascending:
                    true,
                  nullsFirst:
                    false,
                },
              )
              .limit(50)

          if (error) {
            warnings.push(
              `Današnji nalozi: ${error.message}`,
            )
            return []
          }

          return (
            (
              data ??
              []
            ) as WorkOrderSummaryRow[]
          ).map(
            (row) => ({
              id: row.id,
              orderNumber:
                row.order_number,
              customerName:
                row.customer_name,
              date:
                row.work_date,
              arrivalTime:
                row.arrival_time
                  ?.slice(
                    0,
                    5,
                  ) ??
                '',
              title:
                row.title,
              status:
                row.status,
              priority:
                row.priority,
            }),
          )
        } catch (error) {
          warnings.push(
            `Današnji nalozi: ${errorText(
              error,
            )}`,
          )
          return []
        }
      }
    )()

  const pendingOffersPromise =
    options.includeOffers
      ? safeCount(
          'Ponude u obradi',
          supabase
            .from(
              'offers',
            )
            .select(
              'id',
              {
                count:
                  'exact',
                head: true,
              },
            )
            .in(
              'status',
              [
                'Nacrt',
                'Poslano',
                'Pregledano',
                'U tijeku',
              ],
            ),
          warnings,
        )
      : Promise.resolve(
          0,
        )

  const acceptedValuePromise =
    options.includeOffers
      ? (
          async () => {
            try {
              const {
                data,
                error,
              } =
                await supabase
                  .from(
                    'offers',
                  )
                  .select(
                    'items',
                  )
                  .eq(
                    'status',
                    'Prihvaćeno',
                  )
                  .gte(
                    'offer_date',
                    range.from,
                  )
                  .lte(
                    'offer_date',
                    range.to,
                  )
                  .limit(
                    250,
                  )

              if (error) {
                warnings.push(
                  `Vrijednost ponuda: ${error.message}`,
                )
                return 0
              }

              return (
                (
                  data ??
                  []
                ) as OfferItemsRow[]
              ).reduce(
                (
                  sum,
                  row,
                ) =>
                  sum +
                  offerItemsTotal(
                    row.items,
                  ),
                0,
              )
            } catch (error) {
              warnings.push(
                `Vrijednost ponuda: ${errorText(
                  error,
                )}`,
              )
              return 0
            }
          }
        )()
      : Promise.resolve(
          0,
        )

  const employeesPromise =
    options.includeEmployees
      ? safeCount(
          'Zaposlenici',
          supabase
            .from(
              'company_members',
            )
            .select(
              'id',
              {
                count:
                  'exact',
                head: true,
              },
            )
            .eq(
              'status',
              'active',
            ),
          warnings,
        )
      : Promise.resolve(
          0,
        )

  const [
    customersCount,
    activeOrdersCount,
    urgentOrdersCount,
    unfinishedOrdersCount,
    completedThisMonthCount,
    todayOrders,
    pendingOffersCount,
    acceptedOfferValue,
    activeEmployeesCount,
  ] =
    await Promise.all([
      customersPromise,
      activeOrdersPromise,
      urgentOrdersPromise,
      unfinishedOrdersPromise,
      completedPromise,
      todayOrdersPromise,
      pendingOffersPromise,
      acceptedValuePromise,
      employeesPromise,
    ])

  return {
    customersCount,
    activeOrdersCount,
    urgentOrdersCount,
    unfinishedOrdersCount,
    completedThisMonthCount,
    pendingOffersCount,
    acceptedOfferValue,
    activeEmployeesCount,
    todayOrders,
    warnings,
  }
}
