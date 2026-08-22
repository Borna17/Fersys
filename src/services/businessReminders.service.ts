import { supabase } from '../lib/supabase'
import {
  getNotificationPreferences,
  type AppNotification,
  type NotificationCategory,
  type NotificationPreference,
} from './notifications.service'
import {
  getInvoices,
  type InvoiceCloudShape,
} from './invoices.service'
import { getOffers } from './offers.service'
import { getWorkOrders } from './workOrders.service'

type ReminderInvoice = InvoiceCloudShape & {
  customerName?: string
  dueDate?: string
  total?: number
  totalAmount?: number
  amount?: number
  paidAt?: string
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zagreb',
  }).format(new Date())
}

function daysBetween(value: string) {
  if (!value) return null

  const target = new Date(`${value}T12:00:00`)
  const current = new Date(`${today()}T12:00:00`)

  if (Number.isNaN(target.getTime())) {
    return null
  }

  return Math.round(
    (target.getTime() - current.getTime()) /
      86_400_000,
  )
}

function daysSince(value: string) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - date.getTime()) / 86_400_000,
    ),
  )
}

function dayText(days: number) {
  if (days === 0) return 'danas'
  if (days === 1) return 'sutra'
  if (days > 1) return `za ${days} dana`
  if (days === -1) return 'kasni 1 dan'
  return `kasni ${Math.abs(days)} dana`
}

function money(value: unknown) {
  const parsed = Number(value ?? 0)

  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(
    Number.isFinite(parsed) ? parsed : 0,
  )
}

function preferenceMap(
  preferences: NotificationPreference[],
) {
  return new Map(
    preferences.map((item) => [
      item.category,
      item,
    ]),
  )
}

function getMode(
  map: Map<
    NotificationCategory,
    NotificationPreference
  >,
  category: NotificationCategory,
) {
  return map.get(category)?.mode ?? 'enabled'
}

async function getReadKeys() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new Set<string>()
  }

  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_key')
    .eq('user_id', user.id)

  if (error) {
    console.error('Business reminder reads:', error)
    return new Set<string>()
  }

  return new Set(
    (data ?? []).map((row) =>
      String(row.notification_key),
    ),
  )
}

function makeNotification(
  input: {
    id: string
    title: string
    description: string
    route: string
    kind: AppNotification['kind']
    silent: boolean
  },
  readKeys: Set<string>,
): AppNotification {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    route: input.route,
    createdAt: new Date().toISOString(),
    isRead: readKeys.has(input.id),
    isSilent: input.silent,
    kind: input.kind,
    senderName: '',
    companyName: '',
    fersysCode: '',
  }
}

export async function getBusinessReminders():
Promise<AppNotification[]> {
  const [
    preferences,
    readKeys,
    orders,
    offers,
    invoices,
  ] = await Promise.all([
    getNotificationPreferences(),
    getReadKeys(),
    getWorkOrders(),
    getOffers(),
    getInvoices<ReminderInvoice>(),
  ])

  const pref = preferenceMap(preferences)
  const currentDate = today()
  const result: AppNotification[] = []

  const workMode = getMode(pref, 'work_orders')

  if (workMode !== 'off') {
    for (const order of orders) {
      if (
        order.status === 'Završen' ||
        order.status === 'Otkazan'
      ) {
        continue
      }

      const days = daysBetween(order.date)

      if (days === null) continue

      const silent = workMode === 'silent'

      if (days < 0 && days >= -60) {
        result.push(
          makeNotification(
            {
              id: `smart:work:${order.id}:late:${currentDate}`,
              title:
                `Nezavršen radni nalog ${order.orderNumber}`,
              description: [
                order.customerName,
                order.title,
                `od ${order.date}`,
              ]
                .filter(Boolean)
                .join(' · '),
              route:
                `/work-orders/${order.id}`,
              kind: 'work_orders',
              silent,
            },
            readKeys,
          ),
        )
        continue
      }

      if (days === 0 || days === 1) {
        result.push(
          makeNotification(
            {
              id:
                `smart:work:${order.id}:${days === 0 ? 'today' : 'tomorrow'}:${currentDate}`,
              title:
                days === 0
                  ? order.priority === 'Hitno'
                    ? `HITNO danas · ${order.orderNumber}`
                    : `Današnji nalog ${order.orderNumber}`
                  : `Nalog ${order.orderNumber} je sutra`,
              description: [
                order.arrivalTime,
                order.customerName,
                order.title,
              ]
                .filter(Boolean)
                .join(' · '),
              route:
                `/work-orders/${order.id}`,
              kind: 'work_orders',
              silent,
            },
            readKeys,
          ),
        )
        continue
      }

      if (
        order.priority === 'Hitno' &&
        days > 1
      ) {
        result.push(
          makeNotification(
            {
              id:
                `smart:work:${order.id}:urgent:${currentDate}`,
              title:
                `Hitni nalog čeka · ${order.orderNumber}`,
              description: [
                order.customerName,
                order.title,
                dayText(days),
              ]
                .filter(Boolean)
                .join(' · '),
              route:
                `/work-orders/${order.id}`,
              kind: 'work_orders',
              silent,
            },
            readKeys,
          ),
        )
      }
    }
  }

  const offerMode = getMode(pref, 'offers')

  if (offerMode !== 'off') {
    for (const offer of offers) {
      if (
        [
          'Prihvaćeno',
          'Odbijeno',
          'Otkazano',
          'Isteklo',
        ].includes(offer.status)
      ) {
        continue
      }

      const silent = offerMode === 'silent'
      const validity =
        daysBetween(offer.validUntil)

      if (
        validity !== null &&
        validity < 0
      ) {
        result.push(
          makeNotification(
            {
              id:
                `smart:offer:${offer.id}:expired:${currentDate}`,
              title:
                `Ponuda ${offer.offerNumber} je istekla`,
              description:
                `${offer.customerName} · rok ${offer.validUntil}`,
              route:
                `/offers/${offer.id}`,
              kind: 'offers',
              silent,
            },
            readKeys,
          ),
        )
        continue
      }

      if (
        validity === 0 ||
        validity === 1 ||
        validity === 2
      ) {
        result.push(
          makeNotification(
            {
              id:
                `smart:offer:${offer.id}:validity:${currentDate}`,
              title:
                `Ponuda ${offer.offerNumber} istječe ${dayText(validity)}`,
              description:
                offer.customerName,
              route:
                `/offers/${offer.id}`,
              kind: 'offers',
              silent,
            },
            readKeys,
          ),
        )
      }

      if (
        offer.status === 'Poslano' ||
        offer.status === 'Pregledano'
      ) {
        const age = daysSince(
          offer.viewedAt ||
            offer.sentAt ||
            offer.updatedAt ||
            offer.date,
        )

        if (
          age !== null &&
          age >= 3 &&
          age <= 45
        ) {
          result.push(
            makeNotification(
              {
                id:
                  `smart:offer:${offer.id}:waiting:${currentDate}`,
                title:
                  `Ponuda ${offer.offerNumber} čeka odgovor`,
                description:
                  `${offer.customerName} · ${age} dana bez odluke`,
                route:
                  `/offers/${offer.id}`,
                kind: 'offers',
                silent,
              },
              readKeys,
            ),
          )
        }
      }
    }
  }

  const invoiceMode = getMode(pref, 'invoices')
  const invoicePref = pref.get('invoices')
  const reminderDays =
    invoicePref?.reminderDays.length
      ? invoicePref.reminderDays
      : [5, 1, 0]

  if (invoiceMode !== 'off') {
    for (const invoice of invoices) {
      const status =
        String(invoice.status ?? '')
          .toLocaleLowerCase('hr-HR')

      if (
        status.includes('plać') ||
        status.includes('plac') ||
        status === 'paid' ||
        Boolean(invoice.paidAt)
      ) {
        continue
      }

      const dueDate = invoice.dueDate ?? ''
      const days = daysBetween(dueDate)

      if (
        days === null ||
        days < -90
      ) {
        continue
      }

      if (
        days >= 0 &&
        !reminderDays.includes(days)
      ) {
        continue
      }

      result.push(
        makeNotification(
          {
            id:
              `smart:invoice:${invoice.id}:due:${currentDate}`,
            title:
              days < 0
                ? `Račun ${invoice.invoiceNumber} kasni`
                : `Račun ${invoice.invoiceNumber} dospijeva ${dayText(days)}`,
            description: [
              invoice.customerName,
              money(
                invoice.total ??
                  invoice.totalAmount ??
                  invoice.amount,
              ),
              days < 0 ? dayText(days) : '',
            ]
              .filter(Boolean)
              .join(' · '),
            route:
              `/invoices/${invoice.id}/edit`,
            kind: 'invoices',
            silent:
              invoiceMode === 'silent',
          },
          readKeys,
        ),
      )
    }
  }

  const deduped = new Map<
    string,
    AppNotification
  >()

  result.forEach((item) => {
    deduped.set(item.id, item)
  })

  return Array.from(
    deduped.values(),
  ).sort((a, b) => {
    const urgentA =
      /kasni|hitno|istekla/i.test(a.title)
        ? 1
        : 0
    const urgentB =
      /kasni|hitno|istekla/i.test(b.title)
        ? 1
        : 0

    return urgentB - urgentA
  })
}
