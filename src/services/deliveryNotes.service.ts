import {
  supabase,
} from '../lib/supabase'
import type {
  CreateDeliveryNoteInput,
  DeliveryNote,
  DeliveryNoteItem,
  DeliveryNoteStatus,
} from '../types/deliveryNote'
import {
  adjustInventoryQuantity,
  getInventoryItemById,
} from '../utils/inventoryStorage'

type DeliveryNoteRow = {
  id: string
  company_id: string
  delivery_note_number: string

  customer_id: string | null
  customer_name: string
  customer_type: string | null
  customer_oib: string | null
  customer_email: string | null
  customer_phone: string | null

  delivery_date: string
  delivery_time: string | null
  delivery_address: string | null
  delivery_place: string | null

  work_order_id: string | null
  work_order_number: string | null
  offer_id: string | null
  offer_number: string | null
  invoice_id: string | null
  invoice_number: string | null

  vehicle_registration: string | null
  delivered_by: string | null
  received_by: string | null

  delivered_signature: string | null
  received_signature: string | null

  note: string | null
  status: DeliveryNoteStatus

  deduct_inventory: boolean | null
  inventory_posted: boolean | null

  items: unknown

  created_at: string
  updated_at: string
  issued_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function parseItems(
  value: unknown,
): DeliveryNoteItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((item) => ({
      id:
        typeof item.id ===
        'string'
          ? item.id
          : crypto.randomUUID(),

      inventoryItemId:
        typeof item
          .inventoryItemId ===
        'string'
          ? item
              .inventoryItemId
          : '',

      code:
        typeof item.code ===
        'string'
          ? item.code
          : '',

      name:
        typeof item.name ===
        'string'
          ? item.name
          : '',

      description:
        typeof item
          .description ===
        'string'
          ? item.description
          : '',

      quantity:
        Math.max(
          0,
          Number(
            item.quantity,
          ) || 0,
        ),

      unit:
        typeof item.unit ===
        'string'
          ? item.unit
          : 'kom',

      note:
        typeof item.note ===
        'string'
          ? item.note
          : '',

      unitPrice:
        Math.max(
          0,
          Number(
            item.unitPrice,
          ) || 0,
        ),

      vatRate:
        Math.max(
          0,
          Number(
            item.vatRate,
          ) || 0,
        ),
    }))
}

function mapRow(
  row: DeliveryNoteRow,
): DeliveryNote {
  return {
    id: row.id,
    companyId:
      row.company_id,
    number:
      row.delivery_note_number,

    customerId:
      row.customer_id ?? '',
    customerName:
      row.customer_name,
    customerType:
      row.customer_type ?? '',
    customerOib:
      row.customer_oib ?? '',
    customerEmail:
      row.customer_email ?? '',
    customerPhone:
      row.customer_phone ?? '',

    deliveryDate:
      row.delivery_date,
    deliveryTime:
      row.delivery_time?.slice(
        0,
        5,
      ) ?? '',
    deliveryAddress:
      row.delivery_address ?? '',
    deliveryPlace:
      row.delivery_place ?? '',

    workOrderId:
      row.work_order_id ?? '',
    workOrderNumber:
      row.work_order_number ?? '',
    offerId:
      row.offer_id ?? '',
    offerNumber:
      row.offer_number ?? '',
    invoiceId:
      row.invoice_id ?? '',
    invoiceNumber:
      row.invoice_number ?? '',

    vehicleRegistration:
      row.vehicle_registration ?? '',
    deliveredBy:
      row.delivered_by ?? '',
    receivedBy:
      row.received_by ?? '',

    deliveredSignature:
      row.delivered_signature ?? '',
    receivedSignature:
      row.received_signature ?? '',

    note:
      row.note ?? '',
    status:
      row.status,

    deductInventory:
      Boolean(
        row.deduct_inventory,
      ),
    inventoryPosted:
      Boolean(
        row.inventory_posted,
      ),

    items:
      parseItems(
        row.items,
      ),

    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
    issuedAt:
      row.issued_at ?? '',
    deliveredAt:
      row.delivered_at ?? '',
    cancelledAt:
      row.cancelled_at ?? '',
  }
}

async function currentCompanyId() {
  const {
    data,
    error,
  } =
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

async function generateNumber(
  companyId: string,
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'generate_delivery_note_number',
      {
        requested_company_id:
          companyId,
      },
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Broj otpremnice nije moguće generirati.',
    )
  }

  return String(data)
}

function cleanItems(
  items:
    DeliveryNoteItem[],
) {
  return items
    .map((item) => ({
      ...item,
      id:
        item.id ||
        crypto.randomUUID(),
      inventoryItemId:
        item
          .inventoryItemId
          .trim(),
      code:
        item.code.trim(),
      name:
        item.name.trim(),
      description:
        item.description.trim(),
      quantity:
        Math.max(
          0,
          Number(
            item.quantity,
          ) || 0,
        ),
      unit:
        item.unit.trim() ||
        'kom',
      note:
        item.note.trim(),
      unitPrice:
        Math.max(
          0,
          Number(
            item.unitPrice,
          ) || 0,
        ),
      vatRate:
        Math.max(
          0,
          Number(
            item.vatRate,
          ) || 0,
        ),
    }))
    .filter(
      (item) =>
        item.name &&
        item.quantity > 0,
    )
}

function payload(
  input:
    CreateDeliveryNoteInput,
) {
  return {
    customer_id:
      input.customerId ||
      null,
    customer_name:
      input.customerName.trim(),
    customer_type:
      input.customerType.trim() ||
      null,
    customer_oib:
      input.customerOib
        .replace(
          /\D/g,
          '',
        ) ||
      null,
    customer_email:
      input.customerEmail
        .trim()
        .toLowerCase() ||
      null,
    customer_phone:
      input.customerPhone
        .trim() ||
      null,

    delivery_date:
      input.deliveryDate,
    delivery_time:
      input.deliveryTime ||
      null,
    delivery_address:
      input.deliveryAddress
        .trim() ||
      null,
    delivery_place:
      input.deliveryPlace
        .trim() ||
      null,

    work_order_id:
      input.workOrderId ||
      null,
    work_order_number:
      input.workOrderNumber
        .trim() ||
      null,
    offer_id:
      input.offerId ||
      null,
    offer_number:
      input.offerNumber
        .trim() ||
      null,
    invoice_id:
      input.invoiceId ||
      null,
    invoice_number:
      input.invoiceNumber
        .trim() ||
      null,

    vehicle_registration:
      input.vehicleRegistration
        .trim()
        .toUpperCase() ||
      null,
    delivered_by:
      input.deliveredBy
        .trim() ||
      null,
    received_by:
      input.receivedBy
        .trim() ||
      null,

    delivered_signature:
      input.deliveredSignature ||
      null,
    received_signature:
      input.receivedSignature ||
      null,

    note:
      input.note.trim() ||
      null,
    status:
      input.status,

    deduct_inventory:
      input.deductInventory,

    items:
      cleanItems(
        input.items,
      ),
  }
}

export async function
getDeliveryNotes():
Promise<DeliveryNote[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .select('*')
      .order(
        'delivery_date',
        {
          ascending:
            false,
        },
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        },
      )

  if (error) {
    throw error
  }

  return (
    (data ?? []) as
      DeliveryNoteRow[]
  ).map(mapRow)
}

export async function
getDeliveryNoteById(
  id: string,
): Promise<
  DeliveryNote | null
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .select('*')
      .eq(
        'id',
        id,
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapRow(
        data as
          DeliveryNoteRow,
      )
    : null
}

export async function
createDeliveryNote(
  input:
    CreateDeliveryNoteInput,
): Promise<DeliveryNote> {
  if (
    !input.customerName.trim()
  ) {
    throw new Error(
      'Odaberi investitora / primatelja.',
    )
  }

  const items =
    cleanItems(
      input.items,
    )

  if (!items.length) {
    throw new Error(
      'Otpremnica mora imati barem jednu stavku.',
    )
  }

  const companyId =
    await currentCompanyId()

  const number =
    input.number?.trim() ||
    await generateNumber(
      companyId,
    )

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .insert({
        company_id:
          companyId,
        delivery_note_number:
          number,
        created_by:
          user?.id ??
          null,
        ...payload({
          ...input,
          items,
        }),
      })
      .select('*')
      .single()

  if (error) {
    if (
      error.code ===
      '23505'
    ) {
      throw new Error(
        'Otpremnica s ovim brojem već postoji.',
      )
    }

    throw error
  }

  return mapRow(
    data as
      DeliveryNoteRow,
  )
}

export async function
updateDeliveryNote(
  note:
    DeliveryNote,
): Promise<DeliveryNote> {
  if (
    note.status !==
      'draft' &&
    note.status !==
      'issued'
  ) {
    throw new Error(
      'Ovu otpremnicu više nije moguće uređivati.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .update({
        ...payload(
          note,
        ),
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        note.id,
      )
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as
      DeliveryNoteRow,
  )
}

function validateInventoryExit(
  note:
    DeliveryNote,
) {
  for (
    const item of
      note.items
  ) {
    if (
      !item.inventoryItemId
    ) {
      continue
    }

    const stock =
      getInventoryItemById(
        item.inventoryItemId,
      )

    if (!stock) {
      throw new Error(
        `Artikl "${item.name}" više ne postoji u skladištu.`,
      )
    }

    if (
      stock.quantity <
      item.quantity
    ) {
      throw new Error(
        `Nema dovoljno artikla "${item.name}". Stanje: ${stock.quantity} ${stock.unit}, potrebno: ${item.quantity} ${item.unit}.`,
      )
    }
  }
}

function postInventoryExit(
  note:
    DeliveryNote,
) {
  if (
    !note.deductInventory ||
    note.inventoryPosted
  ) {
    return
  }

  validateInventoryExit(
    note,
  )

  note.items.forEach(
    (item) => {
      if (
        !item.inventoryItemId
      ) {
        return
      }

      adjustInventoryQuantity({
        itemId:
          item
            .inventoryItemId,
        type: 'exit',
        quantity:
          item.quantity,
        workOrderId:
          note.workOrderId ||
          undefined,
        workOrderNumber:
          note
            .workOrderNumber ||
          undefined,
        employeeName:
          note.deliveredBy ||
          'Otpremnica',
        note:
          `Izlaz po otpremnici ${note.number} · ${note.customerName}`,
      })
    },
  )
}

function reverseInventoryExit(
  note:
    DeliveryNote,
) {
  if (
    !note.inventoryPosted
  ) {
    return
  }

  note.items.forEach(
    (item) => {
      if (
        !item.inventoryItemId
      ) {
        return
      }

      adjustInventoryQuantity({
        itemId:
          item
            .inventoryItemId,
        type: 'entry',
        quantity:
          item.quantity,
        workOrderId:
          note.workOrderId ||
          undefined,
        workOrderNumber:
          note
            .workOrderNumber ||
          undefined,
        employeeName:
          note.deliveredBy ||
          'Storno otpremnice',
        note:
          `Povrat robe – storno otpremnice ${note.number}`,
      })
    },
  )
}

export async function
issueDeliveryNote(
  note:
    DeliveryNote,
): Promise<DeliveryNote> {
  if (
    note.status !==
    'draft'
  ) {
    throw new Error(
      'Samo nacrt se može izdati.',
    )
  }

  postInventoryExit(
    note,
  )

  const now =
    new Date()
      .toISOString()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .update({
        status:
          'issued',
        inventory_posted:
          note.deductInventory,
        issued_at:
          now,
        updated_at:
          now,
      })
      .eq(
        'id',
        note.id,
      )
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as
      DeliveryNoteRow,
  )
}

export async function
markDeliveryNoteDelivered(
  note:
    DeliveryNote,
  receivedBy?: string,
  receivedSignature?: string,
): Promise<DeliveryNote> {
  if (
    note.status ===
      'cancelled'
  ) {
    throw new Error(
      'Stornirana otpremnica ne može biti isporučena.',
    )
  }

  const now =
    new Date()
      .toISOString()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .update({
        status:
          'delivered',
        received_by:
          receivedBy?.trim() ||
          note.receivedBy ||
          null,
        received_signature:
          receivedSignature ||
          note.receivedSignature ||
          null,
        delivered_at:
          now,
        updated_at:
          now,
      })
      .eq(
        'id',
        note.id,
      )
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as
      DeliveryNoteRow,
  )
}

export async function
cancelDeliveryNote(
  note:
    DeliveryNote,
): Promise<DeliveryNote> {
  if (
    note.status ===
    'cancelled'
  ) {
    return note
  }

  if (
    !window.confirm(
      `Stornirati otpremnicu ${note.number}? Ako je roba skinuta sa skladišta, količine će se vratiti.`,
    )
  ) {
    return note
  }

  reverseInventoryExit(
    note,
  )

  const now =
    new Date()
      .toISOString()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .update({
        status:
          'cancelled',
        inventory_posted:
          false,
        cancelled_at:
          now,
        updated_at:
          now,
      })
      .eq(
        'id',
        note.id,
      )
      .select('*')
      .single()

  if (error) {
    throw error
  }

  return mapRow(
    data as
      DeliveryNoteRow,
  )
}

export async function
deleteDeliveryNote(
  note:
    DeliveryNote,
) {
  if (
    note.status !==
    'draft'
  ) {
    throw new Error(
      'Može se obrisati samo nacrt. Izdanu otpremnicu treba stornirati.',
    )
  }

  const {
    error,
  } =
    await supabase
      .from(
        'delivery_notes',
      )
      .delete()
      .eq(
        'id',
        note.id,
      )

  if (error) {
    throw error
  }
}
