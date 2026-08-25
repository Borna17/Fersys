import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  ReceiptText,
  Truck,
  Workflow,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import { useAuth } from '../auth/AuthProvider'
import { getCustomers } from '../services/customers.service'
import {
  getInvoices,
} from '../services/invoices.service'
import {
  getOfferById,
  updateOffer,
} from '../services/offers.service'
import {
  getWorkOrderById,
  type CloudWorkOrder,
} from '../services/workOrders.service'
import type { Customer } from '../types/customer'
import type { Offer } from '../types/offers'

const WORK_ORDER_PREFILL_KEY =
  'fersys_ai_work_order_prefill'

const INVOICE_PREFILL_KEY =
  'fersys_invoice_prefill'

const PENDING_OFFER_WORK_ORDER_LINK =
  'fersys_pending_offer_work_order_link'

type LinkedInvoice = {
  id: string
  invoiceNumber: string
  issueDate: string
  status: string
  sourceWorkOrderId?: string
}

function customerTypeLabel(
  customer?: Customer,
) {
  if (!customer) {
    return 'Fizička osoba'
  }

  if (customer.type === 'company') {
    return 'Tvrtka'
  }

  if (customer.type === 'building') {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

function offerAddress(
  offer: Offer,
) {
  return [
    offer.address,
    offer.postalCode,
    offer.city,
  ]
    .filter(Boolean)
    .join(', ')
}

function offerTitle(
  offer: Offer,
) {
  const firstNamedItem =
    offer.items.find(
      (item) =>
        item.name.trim(),
    )

  return (
    offer.description.trim() ||
    firstNamedItem?.name.trim() ||
    `Radovi prema ponudi ${offer.offerNumber}`
  )
}

function toOfferWorkOrderPrefill(
  offer: Offer,
) {
  const commonVat =
    offer.items.find(
      (item) =>
        Number.isFinite(item.vat),
    )?.vat ?? 25

  return {
    sourceOfferId:
      offer.id,
    customerId:
      offer.customerId ?? '',
    customerName:
      offer.customerName,
    investorName:
      offer.contactPerson ||
      offer.customerName,
    contactPerson:
      offer.contactPerson ?? '',
    address:
      offerAddress(offer),
    title:
      offerTitle(offer),
    description:
      [
        offer.description,
        offer.customerNote,
        `Izvor: ponuda ${offer.offerNumber}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    materials:
      offer.items.map(
        (item) => ({
          name:
            item.name,
          quantity:
            item.quantity,
          unit:
            item.unit,
          unitPrice:
            item.price,
        }),
      ),
    vatRate:
      commonVat,
    priceNote:
      `Pripremljeno iz ponude ${offer.offerNumber}.`,
    status:
      'Novi',
    priority:
      'Normalan',
  }
}

function toOfferInvoicePrefill(
  offer: Offer,
) {
  return {
    sourceOfferId:
      offer.id,
    customerName:
      offer.customerName,
    customerType:
      offer.customerType,
    oib:
      offer.oib,
    email:
      offer.email,
    phone:
      offer.phone,
    address:
      offer.address,
    city:
      offer.city,
    responsiblePerson:
      offer.responsiblePerson,
    description:
      offer.description,
    internalNote:
      offer.internalNote,
    items:
      offer.items.map(
        (item) => ({
          name:
            item.name,
          description:
            item.description,
          quantity:
            item.quantity,
          unit:
            item.unit,
          price:
            item.price,
          discount:
            item.discount,
          vat:
            item.vat,
        }),
      ),
  }
}

function toWorkOrderInvoicePrefill(
  order: CloudWorkOrder,
  customer?: Customer,
) {
  const items = [
    ...order.materials.map(
      (material) => ({
        name:
          material.name,
        description:
          `Materijal iz radnog naloga ${order.orderNumber}`,
        quantity:
          material.quantity,
        unit:
          material.unit || 'kom',
        price:
          material.unitPrice || 0,
        discount: 0,
        vat:
          order.vatRate ?? 25,
      }),
    ),
  ]

  if (
    order.labourPrice > 0
  ) {
    items.push({
      name:
        order.title ||
        'Radovi / usluga',
      description:
        order.description || '',
      quantity: 1,
      unit: 'usl',
      price:
        order.labourPrice,
      discount: 0,
      vat:
        order.vatRate ?? 25,
    })
  }

  if (!items.length) {
    items.push({
      name:
        order.title ||
        'Radovi prema radnom nalogu',
      description:
        order.description || '',
      quantity: 1,
      unit: 'usl',
      price: 0,
      discount: 0,
      vat:
        order.vatRate ?? 25,
    })
  }

  return {
    sourceWorkOrderId:
      order.id,
    customerName:
      order.customerName,
    customerType:
      customerTypeLabel(
        customer,
      ),
    oib:
      order.customerOib,
    email:
      order.customerEmail,
    phone:
      order.customerPhone,
    address:
      order.address,
    city:
      customer?.city ?? '',
    responsiblePerson:
      order.investorName ||
      order.customerContactPerson ||
      '',
    description:
      [
        order.title,
        order.description,
        `Izvor: radni nalog ${order.orderNumber}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    internalNote:
      order.priceNote || '',
    serviceDate:
      order.date,
    items,
  }
}

export default function BusinessFlowActions() {
  const location =
    useLocation()
  const navigate =
    useNavigate()
  const { can } =
    useAuth()

  const [isOpen, setIsOpen] =
    useState(false)

  const [offer, setOffer] =
    useState<Offer | null>(
      null,
    )
  const [order, setOrder] =
    useState<CloudWorkOrder | null>(
      null,
    )
  const [customer, setCustomer] =
    useState<Customer | undefined>(
      undefined,
    )
  const [
    linkedInvoice,
    setLinkedInvoice,
  ] =
    useState<LinkedInvoice | null>(
      null,
    )
  const [loading, setLoading] =
    useState(false)
  const [linking, setLinking] =
    useState(false)

  const offerId =
    useMemo(() => {
      const match =
        location.pathname.match(
          /^\/offers\/([^/]+)$/,
        )

      if (
        !match ||
        match[1] === 'new'
      ) {
        return ''
      }

      return match[1]
    }, [location.pathname])

  const workOrderId =
    useMemo(() => {
      const match =
        location.pathname.match(
          /^\/work-orders\/([^/]+)$/,
        )

      if (
        !match ||
        match[1] === 'new'
      ) {
        return ''
      }

      return match[1]
    }, [location.pathname])

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow =
        ''
      return
    }

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [isOpen])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setOffer(null)
      setOrder(null)
      setCustomer(undefined)
      setLinkedInvoice(null)

      if (
        !offerId &&
        !workOrderId
      ) {
        return
      }

      try {
        setLoading(true)

        if (offerId) {
          const savedOffer =
            await getOfferById(
              offerId,
            )

          if (!cancelled) {
            setOffer(
              savedOffer,
            )
          }

          return
        }

        const [
          savedOrder,
          customers,
          invoices,
        ] =
          await Promise.all([
            getWorkOrderById(
              workOrderId,
            ),
            getCustomers(),
            getInvoices<LinkedInvoice>(),
          ])

        if (
          cancelled ||
          !savedOrder
        ) {
          return
        }

        setOrder(savedOrder)
        setCustomer(
          customers.find(
            (item) =>
              item.id ===
              savedOrder.customerId,
          ),
        )

        setLinkedInvoice(
          invoices.find(
            (invoice) =>
              invoice.sourceWorkOrderId ===
              savedOrder.id,
          ) ?? null,
        )
      } catch (error) {
        console.error(
          'Poslovni tok nije moguće učitati:',
          error,
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    offerId,
    workOrderId,
  ])

  useEffect(() => {
    if (!workOrderId) {
      return
    }

    const raw =
      sessionStorage.getItem(
        PENDING_OFFER_WORK_ORDER_LINK,
      )

    if (!raw) {
      return
    }

    void (async () => {
      try {
        const pending =
          JSON.parse(raw) as {
            offerId?: string
          }

        if (
          !pending.offerId
        ) {
          return
        }

        setLinking(true)

        await updateOffer(
          pending.offerId,
          {
            workOrderId,
          },
        )

        sessionStorage.removeItem(
          PENDING_OFFER_WORK_ORDER_LINK,
        )
      } catch (error) {
        console.warn(
          'Veza ponude i radnog naloga nije osvježena:',
          error,
        )
      } finally {
        setLinking(false)
      }
    })()
  }, [workOrderId])

  function createWorkOrderFromOffer() {
    if (!offer) {
      return
    }

    sessionStorage.setItem(
      WORK_ORDER_PREFILL_KEY,
      JSON.stringify(
        toOfferWorkOrderPrefill(
          offer,
        ),
      ),
    )

    sessionStorage.setItem(
      PENDING_OFFER_WORK_ORDER_LINK,
      JSON.stringify({
        offerId:
          offer.id,
      }),
    )

    navigate(
      '/work-orders/new',
    )
  }

  function createInvoiceFromOffer() {
    if (!offer) {
      return
    }

    sessionStorage.setItem(
      INVOICE_PREFILL_KEY,
      JSON.stringify(
        toOfferInvoicePrefill(
          offer,
        ),
      ),
    )

    navigate(
      '/invoices/new',
    )
  }

  function createInvoiceFromOrder() {
    if (!order) {
      return
    }

    sessionStorage.setItem(
      INVOICE_PREFILL_KEY,
      JSON.stringify(
        toWorkOrderInvoicePrefill(
          order,
          customer,
        ),
      ),
    )

    navigate(
      '/invoices/new',
    )
  }

  if (
    !offerId &&
    !workOrderId
  ) {
    return null
  }

  const hasData =
    Boolean(
      offer ||
      order,
    )

  if (
    !loading &&
    !hasData
  ) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsOpen(true)
        }
        className="fixed bottom-[calc(9.75rem+var(--fersys-safe-bottom))] right-3 z-[55] inline-flex h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 overflow-hidden rounded-2xl border border-blue-400/20 bg-slate-900/95 px-4 text-sm font-black text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition active:scale-95 md:bottom-6 md:right-6 md:h-12 md:max-w-none"
        aria-label="Otvori poslovni tok"
      >
        {loading ? (
          <Loader2
            size={18}
            className="animate-spin text-blue-400"
          />
        ) : (
          <Workflow
            size={18}
            className="text-blue-400"
          />
        )}

        <span>
          Poslovni tok
        </span>

        {(offer?.workOrderId ||
          offer?.invoiceId ||
          linkedInvoice) && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-slate-950">
            ✓
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center md:justify-end md:p-5">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() =>
              setIsOpen(false)
            }
            aria-label="Zatvori poslovni tok"
          />

          <section className="relative z-10 max-h-[82dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:max-h-[calc(100dvh-2.5rem)] md:w-[25rem] md:rounded-3xl md:border md:p-5">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-700 md:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <Workflow
                    size={21}
                  />
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                    POSLOVNI TOK
                  </p>

                  <h2 className="mt-1 truncate text-lg font-black text-white">
                    {offer
                      ? `Ponuda ${offer.offerNumber}`
                      : order
                        ? `Nalog ${order.orderNumber}`
                        : 'Povezani dokumenti'}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Prenesi postojeće podatke u sljedeći dokument bez ponovnog upisivanja.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-400 active:scale-95"
                aria-label="Zatvori"
              >
                <X size={19} />
              </button>
            </div>

            {loading ? (
              <div className="mt-6 flex min-h-28 items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 text-sm font-bold text-slate-400">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Učitavanje...
              </div>
            ) : offer ? (
              <OfferActions
                offer={offer}
                canCreateOrder={
                  can(
                    'workOrders.manage',
                  )
                }
                canCreateInvoice={
                  can(
                    'invoices.view',
                  )
                }
                canCreateDelivery={
                  can(
                    'inventory.manage',
                  )
                }
                onCreateOrder={
                  createWorkOrderFromOffer
                }
                onCreateInvoice={
                  createInvoiceFromOffer
                }
                onNavigate={
                  navigate
                }
              />
            ) : order ? (
              <WorkOrderActions
                order={order}
                linkedInvoice={
                  linkedInvoice
                }
                canCreateInvoice={
                  can(
                    'invoices.view',
                  )
                }
                canCreateDelivery={
                  can(
                    'inventory.manage',
                  )
                }
                onCreateInvoice={
                  createInvoiceFromOrder
                }
                onNavigate={
                  navigate
                }
              />
            ) : null}

            {linking && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300">
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Povezujem dokumente...
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function OfferActions({
  offer,
  canCreateOrder,
  canCreateInvoice,
  canCreateDelivery,
  onCreateOrder,
  onCreateInvoice,
  onNavigate,
}: {
  offer: Offer
  canCreateOrder: boolean
  canCreateInvoice: boolean
  canCreateDelivery: boolean
  onCreateOrder: () => void
  onCreateInvoice: () => void
  onNavigate: (path: string) => void
}) {
  return (
    <div className="mt-5 space-y-2">
      {canCreateOrder && (
        <FlowButton
          icon={
            <ClipboardList
              size={18}
            />
          }
          label={
            offer.workOrderId
              ? 'Otvori radni nalog'
              : 'Izradi radni nalog'
          }
          description={
            offer.workOrderId
              ? 'Radni nalog je već povezan s ovom ponudom.'
              : 'Prenesi investitora, opis, stavke i cijene u novi nalog.'
          }
          done={
            Boolean(
              offer.workOrderId,
            )
          }
          onClick={() => {
            if (
              offer.workOrderId
            ) {
              onNavigate(
                `/work-orders/${offer.workOrderId}`,
              )
            } else {
              onCreateOrder()
            }
          }}
        />
      )}

      {canCreateInvoice && (
        <FlowButton
          icon={
            <ReceiptText
              size={18}
            />
          }
          label={
            offer.invoiceId
              ? 'Otvori račun'
              : 'Izradi račun'
          }
          description={
            offer.invoiceId
              ? 'Račun je već povezan s ovom ponudom.'
              : 'Prenesi sve stavke, cijene, popuste i PDV.'
          }
          done={
            Boolean(
              offer.invoiceId,
            )
          }
          onClick={() => {
            if (
              offer.invoiceId
            ) {
              onNavigate(
                `/invoices/${offer.invoiceId}/edit`,
              )
            } else {
              onCreateInvoice()
            }
          }}
        />
      )}

      {canCreateDelivery && (
        <FlowButton
          icon={
            <Truck size={18} />
          }
          label="Izradi otpremnicu"
          description="Prenesi investitora i stavke ponude u otpremnicu."
          onClick={() =>
            onNavigate(
              `/inventory/delivery-notes/new?fromOffer=${encodeURIComponent(
                offer.id,
              )}`,
            )
          }
        />
      )}
    </div>
  )
}

function WorkOrderActions({
  order,
  linkedInvoice,
  canCreateInvoice,
  canCreateDelivery,
  onCreateInvoice,
  onNavigate,
}: {
  order: CloudWorkOrder
  linkedInvoice:
    LinkedInvoice | null
  canCreateInvoice: boolean
  canCreateDelivery: boolean
  onCreateInvoice: () => void
  onNavigate: (path: string) => void
}) {
  return (
    <div className="mt-5 space-y-2">
      {canCreateInvoice && (
        <FlowButton
          icon={
            <ReceiptText
              size={18}
            />
          }
          label={
            linkedInvoice
              ? `Otvori račun ${linkedInvoice.invoiceNumber}`
              : 'Izradi račun iz naloga'
          }
          description={
            linkedInvoice
              ? 'Ovaj račun je već nastao iz radnog naloga.'
              : 'Prenesi radove, materijal, cijenu rada i investitora.'
          }
          done={
            Boolean(
              linkedInvoice,
            )
          }
          onClick={() => {
            if (
              linkedInvoice
            ) {
              onNavigate(
                `/invoices/${linkedInvoice.id}/edit`,
              )
            } else {
              onCreateInvoice()
            }
          }}
        />
      )}

      {canCreateDelivery && (
        <FlowButton
          icon={
            <Truck size={18} />
          }
          label="Izradi otpremnicu iz naloga"
          description="Prenesi investitora, adresu i utrošeni materijal."
          onClick={() =>
            onNavigate(
              `/inventory/delivery-notes/new?fromWorkOrder=${encodeURIComponent(
                order.id,
              )}`,
            )
          }
        />
      )}
    </div>
  )
}

function FlowButton({
  icon,
  label,
  description,
  onClick,
  done = false,
}: {
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
  done?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[74px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
        done
          ? 'border-emerald-500/20 bg-emerald-500/10'
          : 'border-slate-700 bg-slate-950/55 hover:border-blue-500/30'
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          done
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-blue-500/15 text-blue-300'
        }`}
      >
        {done ? (
          <CheckCircle2
            size={19}
          />
        ) : (
          icon
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">
          {label}
        </span>

        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
          {description}
        </span>
      </span>

      <ArrowRight
        size={17}
        className="shrink-0 text-slate-600"
      />
    </button>
  )
}
