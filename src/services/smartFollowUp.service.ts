import {
  getInvoices,
  type InvoiceCloudShape,
} from './invoices.service'
import { getOffers } from './offers.service'
import { getWorkOrders } from './workOrders.service'

type FollowUpInvoice =
  InvoiceCloudShape & {
    customerName?: string
    dueDate?: string
    paidAt?: string
    sourceOfferId?: string
    sourceWorkOrderId?: string
    total?: number
    totalAmount?: number
    amount?: number
  }

export type SmartFollowUpKind =
  | 'offer-to-work-order'
  | 'work-order-to-invoice'
  | 'offer-waiting'
  | 'offer-draft'
  | 'invoice-due'

export type SmartFollowUpItem = {
  id: string
  kind: SmartFollowUpKind
  title: string
  description: string
  actionLabel: string
  route: string
  priority:
    | 'high'
    | 'medium'
    | 'normal'
  createdFrom: string
}

function localDate() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone:
        'Europe/Zagreb',
    },
  ).format(new Date())
}

function daysSince(
  value: string,
) {
  if (!value) {
    return 0
  }

  const parsed =
    new Date(value)

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        parsed.getTime()
      ) /
        86_400_000,
    ),
  )
}

function daysUntil(
  value: string,
) {
  if (!value) {
    return null
  }

  const target =
    new Date(
      `${value}T12:00:00`,
    )

  const now =
    new Date(
      `${localDate()}T12:00:00`,
    )

  if (
    Number.isNaN(
      target.getTime(),
    )
  ) {
    return null
  }

  return Math.round(
    (
      target.getTime() -
      now.getTime()
    ) /
      86_400_000,
  )
}

function money(
  value: unknown,
) {
  const parsed =
    Number(value ?? 0)

  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
    },
  ).format(
    Number.isFinite(
      parsed,
    )
      ? parsed
      : 0,
  )
}

function isInvoicePaid(
  invoice:
    FollowUpInvoice,
) {
  const status =
    String(
      invoice.status ?? '',
    )
      .toLocaleLowerCase(
        'hr-HR',
      )
      .trim()

  return (
    Boolean(
      invoice.paidAt,
    ) ||
    status === 'paid' ||
    status.includes(
      'plać',
    ) ||
    status.includes(
      'plac',
    )
  )
}

export async function getSmartFollowUps():
Promise<SmartFollowUpItem[]> {
  const [
    offers,
    orders,
    invoices,
  ] =
    await Promise.all([
      getOffers(),
      getWorkOrders(),
      getInvoices<FollowUpInvoice>(),
    ])

  const items:
    SmartFollowUpItem[] = []

  const invoiceByOrder =
    new Map<
      string,
      FollowUpInvoice
    >()

  invoices.forEach(
    (invoice) => {
      const source =
        String(
          invoice.sourceWorkOrderId ??
            '',
        ).trim()

      if (source) {
        invoiceByOrder.set(
          source,
          invoice,
        )
      }
    },
  )

  offers.forEach(
    (offer) => {
      if (
        offer.status ===
          'Prihvaćeno' &&
        !offer.workOrderId
      ) {
        items.push({
          id:
            `offer-to-order:${offer.id}`,
          kind:
            'offer-to-work-order',
          title:
            `Nastavi prihvaćenu ponudu ${offer.offerNumber}`,
          description:
            `${offer.customerName} · ponuda je prihvaćena, ali još nema povezan radni nalog.`,
          actionLabel:
            'Izradi radni nalog',
          route:
            `/offers/${offer.id}`,
          priority: 'high',
          createdFrom:
            offer.acceptedAt ||
            offer.updatedAt ||
            offer.date,
        })

        return
      }

      if (
        (
          offer.status ===
            'Poslano' ||
          offer.status ===
            'Pregledano'
        ) &&
        daysSince(
          offer.viewedAt ||
          offer.sentAt ||
          offer.updatedAt ||
          offer.date,
        ) >= 3
      ) {
        const age =
          daysSince(
            offer.viewedAt ||
            offer.sentAt ||
            offer.updatedAt ||
            offer.date,
          )

        items.push({
          id:
            `offer-waiting:${offer.id}`,
          kind:
            'offer-waiting',
          title:
            `Provjeri ponudu ${offer.offerNumber}`,
          description:
            `${offer.customerName} · ${age} dana bez odluke.`,
          actionLabel:
            'Otvori ponudu',
          route:
            `/offers/${offer.id}`,
          priority:
            age >= 7
              ? 'high'
              : 'medium',
          createdFrom:
            offer.viewedAt ||
            offer.sentAt ||
            offer.updatedAt ||
            offer.date,
        })

        return
      }

      if (
        offer.status ===
          'Nacrt' &&
        daysSince(
          offer.updatedAt ||
          offer.createdAt ||
          offer.date,
        ) >= 3
      ) {
        const age =
          daysSince(
            offer.updatedAt ||
            offer.createdAt ||
            offer.date,
          )

        items.push({
          id:
            `offer-draft:${offer.id}`,
          kind:
            'offer-draft',
          title:
            `Dovrši nacrt ${offer.offerNumber}`,
          description:
            `${offer.customerName} · nacrt nije mijenjan ${age} dana.`,
          actionLabel:
            'Nastavi ponudu',
          route:
            `/offers/${offer.id}`,
          priority: 'normal',
          createdFrom:
            offer.updatedAt ||
            offer.createdAt ||
            offer.date,
        })
      }
    },
  )

  orders.forEach(
    (order) => {
      if (
        order.status !==
          'Završen'
      ) {
        return
      }

      if (
        invoiceByOrder.has(
          order.id,
        )
      ) {
        return
      }

      items.push({
        id:
          `order-to-invoice:${order.id}`,
        kind:
          'work-order-to-invoice',
        title:
          `Naplati završeni nalog ${order.orderNumber}`,
        description:
          `${order.customerName} · radni nalog je završen, a račun još nije pronađen.`,
        actionLabel:
          'Izradi račun',
        route:
          `/work-orders/${order.id}`,
        priority:
          daysSince(
            order.updatedAt ||
            order.date,
          ) >= 2
            ? 'high'
            : 'medium',
        createdFrom:
          order.updatedAt ||
          order.date,
      })
    },
  )

  invoices.forEach(
    (invoice) => {
      if (
        isInvoicePaid(
          invoice,
        )
      ) {
        return
      }

      const due =
        daysUntil(
          String(
            invoice.dueDate ??
            '',
          ),
        )

      if (
        due === null ||
        due > 1
      ) {
        return
      }

      const total =
        invoice.total ??
        invoice.totalAmount ??
        invoice.amount ??
        0

      items.push({
        id:
          `invoice-due:${invoice.id}`,
        kind:
          'invoice-due',
        title:
          due < 0
            ? `Provjeri naplatu ${invoice.invoiceNumber}`
            : due === 0
              ? `Račun ${invoice.invoiceNumber} dospijeva danas`
              : `Račun ${invoice.invoiceNumber} dospijeva sutra`,
        description:
          [
            invoice.customerName,
            money(total),
            due < 0
              ? `rok prošao prije ${Math.abs(
                  due,
                )} dana`
              : '',
          ]
            .filter(Boolean)
            .join(' · '),
        actionLabel:
          'Otvori račun',
        route:
          `/invoices/${invoice.id}/edit`,
        priority:
          due < 0
            ? 'high'
            : 'medium',
        createdFrom:
          invoice.dueDate ||
          invoice.issueDate,
      })
    },
  )

  const priorityRank = {
    high: 3,
    medium: 2,
    normal: 1,
  } as const

  return items.sort(
    (first, second) => {
      const rank =
        priorityRank[
          second.priority
        ] -
        priorityRank[
          first.priority
        ]

      if (rank !== 0) {
        return rank
      }

      return String(
        first.createdFrom,
      ).localeCompare(
        String(
          second.createdFrom,
        ),
      )
    },
  )
}
