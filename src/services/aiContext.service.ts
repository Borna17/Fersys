import { getCustomers } from './customers.service'
import { getOffers } from './offers.service'
import { getInvoices } from './invoices.service'
import { listIncomingInvoices } from './incomingInvoices.service'
import { getVehicles } from './vehicles.service'
import { getInventoryItems, getInventoryMovements } from './inventory.service'
import { getCalendarEvents } from './calendar.service'
import { getEmployees } from './employees.service'
import {
  getWorkOrders,
  type CloudWorkOrder,
} from './workOrders.service'
import type { Customer } from '../types/customer'
import type { Offer } from '../types/offers'

export type AiRuntimeContext = {
  generatedAt: string
  terminology: {
    customerAliases: string[]
    workOrderAliases: string[]
    offerAliases: string[]
    createVerbs: string[]
    openVerbs: string[]
  }
  locale: {
    language: 'hr-HR'
    timeZone: 'Europe/Zagreb'
    today: string
  }
  customers: Array<{
    id: string
    name: string
    type: Customer['type']
    oib: string
    phone: string
    email: string
    street: string
    city: string
    postalCode: string
    contactPerson: string
  }>
  workOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    title: string
    address: string
    date: string
    status: CloudWorkOrder['status']
    priority: CloudWorkOrder['priority']
    createdAt: string
    updatedAt: string
  }>
  offers: Array<{
    id: string
    offerNumber: string
    customerName: string
    description: string
    date: string
    status: Offer['status']
    createdAt: string
    updatedAt: string
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    customerName: string
    issueDate: string
    status: string
    createdAt: string
    updatedAt: string
    sourceOfferId: string
    sourceWorkOrderId: string
  }>
  operations: {
    employees: Array<Record<string, unknown>>
    calendar: Array<Record<string, unknown>>
    inventory: Array<Record<string, unknown>>
    inventoryMovements: Array<Record<string, unknown>>
    vehicles: Array<Record<string, unknown>>
    incomingInvoices: Array<Record<string, unknown>>
  }
}

export type LocalAiResolution =
  | {
      handled: true
      message: string
      clientAction: {
        type:
          | 'open_customer'
          | 'open_work_order'
          | 'open_offer'
        payload: Record<string, unknown>
      } | null
    }
  | { handled: false }

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('hr-HR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function score(query: string, candidate: string) {
  const q = normalize(query)
  const c = normalize(candidate)

  if (!q || !c) return 0
  if (q === c) return 1000
  if (c.includes(q)) return 700
  if (q.includes(c)) return 600

  const qTokens = q
    .split(' ')
    .filter((token) => token.length >= 2)
  const cTokens = new Set(
    c
      .split(' ')
      .filter((token) => token.length >= 2),
  )

  if (!qTokens.length) return 0

  const matches = qTokens.filter((token) =>
    cTokens.has(token),
  ).length

  return Math.round(
    (matches / qTokens.length) * 500,
  )
}

function rank<T>(
  items: T[],
  query: string,
  searchable: (item: T) => string,
) {
  return items
    .map((item) => ({
      item,
      score: score(
        query,
        searchable(item),
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
}

function choose<T>(
  ranked: Array<{ item: T; score: number }>,
) {
  if (!ranked.length) {
    return {
      match: null as T | null,
      ambiguous: [] as T[],
    }
  }

  const first = ranked[0]
  const second = ranked[1]

  if (
    first.score >= 700 ||
    !second ||
    first.score - second.score >= 180
  ) {
    return {
      match: first.item,
      ambiguous: [],
    }
  }

  const ambiguous = ranked
    .filter(
      (entry) =>
        first.score - entry.score <= 90,
    )
    .slice(0, 4)
    .map((entry) => entry.item)

  return ambiguous.length > 1
    ? {
        match: null,
        ambiguous,
      }
    : {
        match: first.item,
        ambiguous: [],
      }
}

function extract(
  message: string,
  entityPattern: RegExp,
) {
  return normalize(message)
    .replace(
      /\b(otvori|pronadi|nadi|pokazi|idi na|otidi na|pregledaj)\b/g,
      ' ',
    )
    .replace(entityPattern, ' ')
    .replace(
      /\b(molim te|molim|mi|taj|tu|tog|ovu|ovaj|ono)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function ambiguity(
  title: string,
  values: string[],
) {
  return [
    `Pronašao sam više mogućih ${title}:`,
    ...values.map(
      (value, index) =>
        `${index + 1}. ${value}`,
    ),
    'Napiši točan naziv ili broj.',
  ].join('\n')
}

export async function buildAiRuntimeContext():
Promise<AiRuntimeContext> {
  const [
    customers,
    workOrders,
    offers,
    invoices,
    employees,
    calendarEvents,
    inventoryItems,
    inventoryMovements,
    vehicles,
    incomingInvoices,
  ] = await Promise.all([
    getCustomers(),
    getWorkOrders(),
    getOffers(),
    getInvoices<any>(),
    getEmployees(),
    getCalendarEvents(),
    getInventoryItems(),
    getInventoryMovements(),
    getVehicles(),
    listIncomingInvoices(),
  ])

  return {
    generatedAt:
      new Date().toISOString(),
    terminology: {
      customerAliases: [
        'investitor',
        'kupac',
        'klijent',
        'stranka',
      ],
      workOrderAliases: [
        'radni nalog',
        'nalog',
      ],
      offerAliases: ['ponuda'],
      createVerbs: [
        'napravi',
        'dodaj',
        'kreiraj',
        'unesi',
        'ubaci',
        'stvori',
        'izradi',
      ],
      openVerbs: [
        'otvori',
        'pronađi',
        'nađi',
        'pokaži',
        'pregledaj',
      ],
    },
    locale: {
      language: 'hr-HR',
      timeZone: 'Europe/Zagreb',
      today:
        new Intl.DateTimeFormat(
          'en-CA',
          {
            timeZone:
              'Europe/Zagreb',
          },
        ).format(
          new Date(),
        ),
    },
    customers: customers
      .filter(
        (customer) =>
          customer.status === 'Aktivan',
      )
      .slice(0, 120)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        type: customer.type,
        oib: customer.oib,
        phone: customer.phone,
        email: customer.email,
        street: customer.street,
        city: customer.city,
        postalCode: customer.postalCode,
        contactPerson: customer.contactPerson ?? '',
      })),
    workOrders: workOrders
      .slice(0, 120)
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        title: order.title,
        address: order.address,
        date: order.date,
        status: order.status,
        priority: order.priority,
        createdAt: String((order as any).createdAt ?? ''),
        updatedAt: String((order as any).updatedAt ?? ''),
      })),
    offers: offers
      .slice(0, 120)
      .map((offer) => ({
        id: offer.id,
        offerNumber: offer.offerNumber,
        customerName: offer.customerName,
        description: offer.description,
        date: offer.date,
        status: offer.status,
        createdAt: String((offer as any).createdAt ?? ''),
        updatedAt: String((offer as any).updatedAt ?? ''),
      })),
    invoices: invoices.slice(0, 120).map((invoice: any) => ({
      id: String(invoice.id ?? ''),
      invoiceNumber: String(invoice.invoiceNumber ?? ''),
      customerName: String(invoice.customerName ?? invoice.customer?.name ?? ''),
      issueDate: String(invoice.issueDate ?? ''),
      status: String(invoice.status ?? ''),
      createdAt: String(invoice.createdAt ?? ''),
      updatedAt: String(invoice.updatedAt ?? ''),
      sourceOfferId: String(invoice.sourceOfferId ?? ''),
      sourceWorkOrderId: String(invoice.sourceWorkOrderId ?? ''),
    })),
    operations: {
      employees: employees.slice(0, 120).map((employee: any) => ({
        id: String(employee.id ?? ''), fullName: String(employee.fullName ?? ''), role: String(employee.role ?? ''), status: String(employee.status ?? ''), phone: String(employee.phone ?? ''), email: String(employee.email ?? ''),
      })),
      calendar: calendarEvents.slice(0, 160).map((event: any) => ({
        id: String(event.id ?? ''), title: String(event.title ?? ''), date: String(event.date ?? ''), startTime: String(event.startTime ?? ''), endTime: String(event.endTime ?? ''), status: String(event.status ?? ''), type: String(event.type ?? ''), customerName: String(event.customerName ?? ''), workOrderId: String(event.workOrderId ?? ''),
      })),
      inventory: inventoryItems.slice(0, 200).map((item: any) => ({
        id: String(item.id ?? ''), name: String(item.name ?? ''), sku: String(item.sku ?? ''), unit: String(item.unit ?? ''), quantity: Number(item.quantity ?? 0), minimumQuantity: Number(item.minimumQuantity ?? 0), purchasePrice: Number(item.purchasePrice ?? 0), sellingPrice: Number(item.sellingPrice ?? 0),
      })),
      inventoryMovements: inventoryMovements.slice(0, 200).map((movement: any) => ({
        id: String(movement.id ?? ''), itemId: String(movement.itemId ?? ''), type: String(movement.type ?? ''), quantity: Number(movement.quantity ?? 0), reference: String(movement.reference ?? ''), employeeName: String(movement.employeeName ?? ''), createdAt: String(movement.createdAt ?? ''),
      })),
      vehicles: vehicles.slice(0, 80).map((vehicle: any) => ({
        id: String(vehicle.id ?? ''), registration: String(vehicle.registration ?? ''), make: String(vehicle.make ?? ''), model: String(vehicle.model ?? ''), mileage: Number(vehicle.mileage ?? 0), status: String(vehicle.status ?? ''), nextServiceDate: String(vehicle.nextServiceDate ?? ''), nextServiceMileage: Number(vehicle.nextServiceMileage ?? 0), registrationExpiresOn: String(vehicle.registrationExpiresOn ?? ''), insuranceExpiresOn: String(vehicle.insuranceExpiresOn ?? ''),
      })),
      incomingInvoices: incomingInvoices.slice(0, 120).map((invoice: any) => ({
        id: String(invoice.id ?? ''), supplierName: String(invoice.supplierName ?? ''), supplierOib: String(invoice.supplierOib ?? ''), invoiceNumber: String(invoice.invoiceNumber ?? ''), invoiceDate: String(invoice.invoiceDate ?? ''), dueDate: String(invoice.dueDate ?? ''), category: String(invoice.category ?? ''), status: String(invoice.status ?? ''), totalAmount: Number(invoice.totalAmount ?? 0), note: String(invoice.note ?? ''),
      })),
    },
  }
}

export async function resolveLocalAiNavigation(
  message: string,
): Promise<LocalAiResolution> {
  const normalized = normalize(message)

  if (
    !/\b(otvori|pronadi|nadi|pokazi|idi na|otidi na|pregledaj)\b/.test(
      normalized,
    )
  ) {
    return { handled: false }
  }

  if (
    /\b(investitor\w*|kupac|kupca|kupcu|klijent\w*|strank\w*)\b/.test(
      normalized,
    )
  ) {
    const query = extract(
      message,
      /\b(investitor\w*|kupac|kupca|kupcu|klijent\w*|strank\w*)\b/g,
    )

    if (!query) return { handled: false }

    const customers = await getCustomers()
    const result = choose(
      rank(
        customers.filter(
          (customer) =>
            customer.status === 'Aktivan',
        ),
        query,
        (customer) =>
          [
            customer.name,
            customer.oib,
            customer.phone,
            customer.email,
            customer.street,
            customer.city,
            customer.contactPerson ?? '',
          ].join(' '),
      ),
    )

    if (result.match) {
      return {
        handled: true,
        message:
          `Otvaram investitora „${result.match.name}”.`,
        clientAction: {
          type: 'open_customer',
          payload: {
            customerId: result.match.id,
          },
        },
      }
    }

    if (result.ambiguous.length) {
      return {
        handled: true,
        message: ambiguity(
          'investitora',
          result.ambiguous.map(
            (customer) =>
              [
                customer.name,
                customer.city,
                customer.oib
                  ? `OIB ${customer.oib}`
                  : '',
              ]
                .filter(Boolean)
                .join(' · '),
          ),
        ),
        clientAction: null,
      }
    }

    return {
      handled: true,
      message:
        `Nisam pronašao investitora „${query}”. Ako želiš novog, napiši „napravi investitora ${query}”.`,
      clientAction: null,
    }
  }

  if (
    /\b(radni nalog|radnog naloga|nalog|naloga)\b/.test(
      normalized,
    )
  ) {
    const query = extract(
      message,
      /\b(radni nalog|radnog naloga|nalog|naloga)\b/g,
    )

    if (!query) return { handled: false }

    const orders = await getWorkOrders()
    const result = choose(
      rank(
        orders,
        query,
        (order) =>
          [
            order.orderNumber,
            order.customerName,
            order.title,
            order.address,
            order.status,
            order.priority,
          ].join(' '),
      ),
    )

    if (result.match) {
      return {
        handled: true,
        message:
          `Otvaram radni nalog ${result.match.orderNumber} — ${result.match.customerName}.`,
        clientAction: {
          type: 'open_work_order',
          payload: {
            workOrderId: result.match.id,
          },
        },
      }
    }

    if (result.ambiguous.length) {
      return {
        handled: true,
        message: ambiguity(
          'radnih naloga',
          result.ambiguous.map(
            (order) =>
              `${order.orderNumber} · ${order.customerName} · ${order.title}`,
          ),
        ),
        clientAction: null,
      }
    }

    return {
      handled: true,
      message:
        `Nisam pronašao radni nalog „${query}”.`,
      clientAction: null,
    }
  }

  if (
    /\b(ponuda|ponudu|ponude)\b/.test(
      normalized,
    )
  ) {
    const query = extract(
      message,
      /\b(ponuda|ponudu|ponude)\b/g,
    )

    if (!query) return { handled: false }

    const offers = await getOffers()
    const result = choose(
      rank(
        offers,
        query,
        (offer) =>
          [
            offer.offerNumber,
            offer.customerName,
            offer.oib,
            offer.description,
            offer.status,
          ].join(' '),
      ),
    )

    if (result.match) {
      return {
        handled: true,
        message:
          `Otvaram ponudu ${result.match.offerNumber} — ${result.match.customerName}.`,
        clientAction: {
          type: 'open_offer',
          payload: {
            offerId: result.match.id,
          },
        },
      }
    }

    if (result.ambiguous.length) {
      return {
        handled: true,
        message: ambiguity(
          'ponuda',
          result.ambiguous.map(
            (offer) =>
              `${offer.offerNumber} · ${offer.customerName} · ${offer.status}`,
          ),
        ),
        clientAction: null,
      }
    }

    return {
      handled: true,
      message:
        `Nisam pronašao ponudu „${query}”.`,
      clientAction: null,
    }
  }

  return { handled: false }
}
