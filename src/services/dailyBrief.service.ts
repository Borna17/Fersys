import {
  getBusinessReminders,
} from './businessReminders.service'
import {
  getInvoices,
  type InvoiceCloudShape,
} from './invoices.service'
import { getOffers } from './offers.service'
import {
  getWorkOrders,
} from './workOrders.service'

type BriefInvoice =
  InvoiceCloudShape & {
    customerName?: string
    dueDate?: string
    total?: number
    totalAmount?: number
    amount?: number
    paidAt?: string
  }

export type DailyBriefItem = {
  id: string
  title: string
  description: string
  route: string
  level:
    | 'urgent'
    | 'attention'
    | 'normal'
  kind:
    | 'work-order'
    | 'offer'
    | 'invoice'
}

export type DailyBrief = {
  generatedAt: string
  todayOrders: number
  urgentOrders: number
  unfinishedOrders: number
  waitingOffers: number
  invoiceAlerts: number
  items: DailyBriefItem[]
}

function today() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Europe/Zagreb',
    },
  ).format(new Date())
}

function normalizeStatus(
  value: string,
) {
  return value
    .toLocaleLowerCase(
      'hr-HR',
    )
    .trim()
}

export async function getDailyBrief():
Promise<DailyBrief> {
  const currentDate =
    today()

  const [
    orders,
    offers,
    invoices,
    reminders,
  ] =
    await Promise.all([
      getWorkOrders(),
      getOffers(),
      getInvoices<BriefInvoice>(),
      getBusinessReminders(),
    ])

  const activeOrders =
    orders.filter(
      (order) =>
        ![
          'Završen',
          'Otkazan',
        ].includes(
          order.status,
        ),
    )

  const todayOrders =
    activeOrders.filter(
      (order) =>
        order.date ===
        currentDate,
    )

  const urgentOrders =
    activeOrders.filter(
      (order) =>
        order.priority ===
        'Hitno',
    )

  const unfinishedOrders =
    activeOrders.filter(
      (order) =>
        order.date <
        currentDate,
    )

  const waitingOffers =
    offers.filter(
      (offer) =>
        [
          'Poslano',
          'Pregledano',
        ].includes(
          offer.status,
        ),
    )

  const invoiceAlerts =
    reminders.filter(
      (item) =>
        item.kind ===
        'invoices' &&
        !item.isRead,
    )

  const items:
    DailyBriefItem[] = []

  urgentOrders
    .slice(0, 4)
    .forEach(
      (order) => {
        items.push({
          id:
            `urgent:${order.id}`,
          title:
            `Hitni nalog ${order.orderNumber}`,
          description:
            [
              order.customerName,
              order.title,
              order.date ===
                currentDate
                ? 'danas'
                : order.date,
            ]
              .filter(Boolean)
              .join(' · '),
          route:
            `/work-orders/${order.id}`,
          level:
            'urgent',
          kind:
            'work-order',
        })
      },
    )

  todayOrders
    .filter(
      (order) =>
        order.priority !==
        'Hitno',
    )
    .slice(0, 5)
    .forEach(
      (order) => {
        items.push({
          id:
            `today:${order.id}`,
          title:
            order.arrivalTime
              ? `${order.arrivalTime.slice(
                  0,
                  5,
                )} · ${order.orderNumber}`
              : `Danas · ${order.orderNumber}`,
          description:
            [
              order.customerName,
              order.title,
            ]
              .filter(Boolean)
              .join(' · '),
          route:
            `/work-orders/${order.id}`,
          level:
            'normal',
          kind:
            'work-order',
        })
      },
    )

  unfinishedOrders
    .filter(
      (order) =>
        order.priority !==
        'Hitno',
    )
    .slice(0, 3)
    .forEach(
      (order) => {
        items.push({
          id:
            `unfinished:${order.id}`,
          title:
            `Provjeri nalog ${order.orderNumber}`,
          description:
            [
              order.customerName,
              `nezavršen od ${order.date}`,
            ]
              .filter(Boolean)
              .join(' · '),
          route:
            `/work-orders/${order.id}`,
          level:
            'attention',
          kind:
            'work-order',
        })
      },
    )

  reminders
    .filter(
      (item) =>
        !item.isRead &&
        (
          item.kind ===
            'offers' ||
          item.kind ===
            'invoices'
        ),
    )
    .slice(0, 5)
    .forEach(
      (item) => {
        items.push({
          id:
            `reminder:${item.id}`,
          title:
            item.title,
          description:
            item.description,
          route:
            item.route,
          level:
            /kasni|istekla/i.test(
              item.title,
            )
              ? 'urgent'
              : 'attention',
          kind:
            item.kind ===
              'offers'
              ? 'offer'
              : 'invoice',
        })
      },
    )

  const hasImportantInvoice =
    invoices.some(
      (invoice) => {
        const status =
          normalizeStatus(
            invoice.status,
          )

        return (
          Boolean(
            invoice.dueDate,
          ) &&
          !status.includes(
            'plać',
          ) &&
          !status.includes(
            'plac',
          ) &&
          status !==
            'paid' &&
          !invoice.paidAt
        )
      },
    )

  return {
    generatedAt:
      new Date()
        .toISOString(),
    todayOrders:
      todayOrders.length,
    urgentOrders:
      urgentOrders.length,
    unfinishedOrders:
      unfinishedOrders.length,
    waitingOffers:
      waitingOffers.length,
    invoiceAlerts:
      invoiceAlerts.length ||
      (
        hasImportantInvoice
          ? 1
          : 0
      ),
    items:
      items.slice(0, 12),
  }
}
