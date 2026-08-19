import { supabase } from '../lib/supabase'
import type {
  CloudWorkOrder,
  CloudWorkOrderStatus,
} from './workOrders.service'

type WorkOrderRow = {
  id: string
  company_id: string
  order_number: string
  customer_id: string
  customer_name: string
  customer_contact_person: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_oib: string | null
  address: string | null
  work_date: string
  arrival_time: string | null
  departure_time: string | null
  duration_minutes: number | null
  title: string
  description: string | null
  materials: unknown
  assigned_workers: unknown
  labour_price: number | string | null
  material_price: number | string | null
  vat_rate: number | string | null
  total_price: number | string | null
  price_note: string | null
  investor_name: string | null
  investor_signature: string | null
  images: unknown
  status: CloudWorkOrderStatus
  priority:
    | 'Nizak'
    | 'Normalan'
    | 'Visok'
    | 'Hitno'
  created_at: string
  updated_at: string
}

function objectArray(
  value: unknown,
) {
  return Array.isArray(value)
    ? value.filter(
        (
          item,
        ): item is Record<
          string,
          unknown
        > =>
          Boolean(
            item &&
              typeof item ===
                'object' &&
              !Array.isArray(
                item,
              ),
          ),
      )
    : []
}

function mapWorkOrder(
  row: WorkOrderRow,
): CloudWorkOrder {
  return {
    id: row.id,
    companyId:
      row.company_id,
    orderNumber:
      row.order_number,
    customerId:
      row.customer_id,
    customerName:
      row.customer_name,
    customerContactPerson:
      row.customer_contact_person ??
      '',
    customerPhone:
      row.customer_phone ??
      '',
    customerEmail:
      row.customer_email ??
      '',
    customerOib:
      row.customer_oib ??
      '',
    address:
      row.address ?? '',
    date:
      row.work_date,
    arrivalTime:
      row.arrival_time?.slice(
        0,
        5,
      ) ?? '',
    departureTime:
      row.departure_time?.slice(
        0,
        5,
      ) ?? '',
    durationMinutes:
      Number(
        row.duration_minutes,
      ) || 0,
    title: row.title,
    description:
      row.description ?? '',
    materials:
      objectArray(
        row.materials,
      ).map(
        (item) => ({
          id:
            typeof item.id ===
              'string'
              ? item.id
              : crypto.randomUUID(),
          name:
            String(
              item.name ?? '',
            ),
          quantity:
            Number(
              item.quantity,
            ) || 0,
          unit:
            String(
              item.unit ??
                'kom',
            ),
          unitPrice:
            Number(
              item.unitPrice,
            ) || 0,
        }),
      ),
    assignedWorkers:
      Array.isArray(
        row.assigned_workers,
      )
        ? row.assigned_workers.filter(
            (
              item,
            ): item is string =>
              typeof item ===
              'string',
          )
        : [],
    labourPrice:
      Number(
        row.labour_price,
      ) || 0,
    materialPrice:
      Number(
        row.material_price,
      ) || 0,
    vatRate:
      Number(
        row.vat_rate,
      ) || 0,
    totalPrice:
      Number(
        row.total_price,
      ) || 0,
    priceNote:
      row.price_note ?? '',
    investorName:
      row.investor_name ??
      '',
    investorSignature:
      row.investor_signature ??
      '',
    images:
      objectArray(
        row.images,
      )
        .map(
          (item) => ({
            id:
              typeof item.id ===
                'string'
                ? item.id
                : crypto.randomUUID(),
            name:
              String(
                item.name ??
                  'Fotografija',
              ),
            dataUrl:
              String(
                item.dataUrl ??
                  '',
              ),
          }),
        )
        .filter(
          (item) =>
            Boolean(
              item.dataUrl,
            ),
        ),
    status:
      row.status,
    priority:
      row.priority,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

/**
 * Brza izmjena samo statusa.
 * Ne učitava cijeli nalog pa ga ponovno sprema,
 * nego radi jedan UPDATE prema Supabaseu.
 */
export async function updateWorkOrderQuickStatus(
  workOrderId: string,
  status:
    CloudWorkOrderStatus,
): Promise<CloudWorkOrder> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'work_orders',
      )
      .update({
        status,
      })
      .eq(
        'id',
        workOrderId,
      )
      .select('*')
      .single()

  if (error) {
    throw new Error(
      `Status radnog naloga nije moguće spremiti: ${error.message}`,
    )
  }

  return mapWorkOrder(
    data as WorkOrderRow,
  )
}
