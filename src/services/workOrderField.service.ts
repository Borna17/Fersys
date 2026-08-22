import { supabase } from '../lib/supabase'
import type {
  CloudWorkOrder,
  CloudWorkOrderStatus,
} from './workOrders.service'

function zagrebClock() {
  const parts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          'Europe/Zagreb',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    ).formatToParts(
      new Date(),
    )

  const values =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    )

  return `${values.hour}:${values.minute}`
}

function minutesFromClock(
  value: string,
) {
  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      value.trim(),
    )

  if (!match) {
    return null
  }

  const hours =
    Number(match[1])
  const minutes =
    Number(match[2])

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  return (
    hours * 60 +
    minutes
  )
}

function durationBetween(
  arrival: string,
  departure: string,
) {
  const from =
    minutesFromClock(
      arrival,
    )
  const to =
    minutesFromClock(
      departure,
    )

  if (
    from === null ||
    to === null
  ) {
    return 0
  }

  let duration =
    to - from

  if (duration < 0) {
    duration += 24 * 60
  }

  return Math.max(
    0,
    duration,
  )
}

async function updateFields(
  workOrderId: string,
  fields: Record<
    string,
    unknown
  >,
) {
  const { error } =
    await supabase
      .from('work_orders')
      .update({
        ...fields,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        workOrderId,
      )

  if (error) {
    throw new Error(
      `Radni nalog nije moguće ažurirati: ${error.message}`,
    )
  }

  window.dispatchEvent(
    new Event(
      'fersys:work-order-field-refresh',
    ),
  )
}

export async function markWorkOrderArrival(
  order: CloudWorkOrder,
) {
  const time =
    zagrebClock()

  await updateFields(
    order.id,
    {
      arrival_time: time,
      status:
        order.status ===
          'Završen' ||
        order.status ===
          'Otkazan'
          ? order.status
          : 'U tijeku',
    },
  )

  return time
}

export async function markWorkOrderDeparture(
  order: CloudWorkOrder,
) {
  const time =
    zagrebClock()

  const duration =
    durationBetween(
      order.arrivalTime,
      time,
    )

  await updateFields(
    order.id,
    {
      departure_time: time,
      duration_minutes:
        duration,
    },
  )

  return {
    time,
    duration,
  }
}

export async function setWorkOrderFieldStatus(
  workOrderId: string,
  status:
    CloudWorkOrderStatus,
) {
  await updateFields(
    workOrderId,
    { status },
  )
}

export async function finishWorkOrderFromField(
  order: CloudWorkOrder,
) {
  const fields:
    Record<string, unknown> = {
      status: 'Završen',
    }

  let departure =
    order.departureTime

  if (!departure) {
    departure =
      zagrebClock()

    fields.departure_time =
      departure
  }

  if (
    order.arrivalTime &&
    departure
  ) {
    fields.duration_minutes =
      durationBetween(
        order.arrivalTime,
        departure,
      )
  }

  await updateFields(
    order.id,
    fields,
  )
}
