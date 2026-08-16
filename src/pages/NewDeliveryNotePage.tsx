import {
  ArrowLeft,
  Boxes,
  ClipboardList,
  Link2,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  Truck,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  useNavigate,
  useSearchParams,
} from 'react-router'

import {
  SignaturePad,
} from '../components/SignaturePad'
import {
  getCustomers,
} from '../services/customers.service'
import {
  createDeliveryNote,
  getDeliveryNoteById,
  issueDeliveryNote,
  updateDeliveryNote,
} from '../services/deliveryNotes.service'
import {
  getOffers,
} from '../services/offers.service'
import {
  getWorkOrders,
  type CloudWorkOrder,
} from '../services/workOrders.service'
import type {
  Customer,
} from '../types/customer'
import type {
  DeliveryNote,
  DeliveryNoteItem,
} from '../types/deliveryNote'
import type {
  Offer,
} from '../types/offers'
import {
  getInventoryItems,
  type InventoryItem,
} from '../utils/inventoryStorage'

const units = [
  'kom',
  'm',
  'kg',
  'l',
  'paket',
  'rola',
  'set',
  'usl',
]

function id() {
  return crypto.randomUUID()
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

function emptyItem():
DeliveryNoteItem {
  return {
    id: id(),
    inventoryItemId: '',
    code: '',
    name: '',
    description: '',
    quantity: 1,
    unit: 'kom',
    note: '',
    unitPrice: 0,
    vatRate: 25,
  }
}

function normalize(
  value: string,
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ' ',
    )
    .trim()
}

function findInventory(
  name: string,
  inventory:
    InventoryItem[],
) {
  const key =
    normalize(name)

  if (!key) {
    return undefined
  }

  return inventory.find(
    (item) =>
      normalize(item.name) ===
        key ||
      normalize(
        item.shortName,
      ) ===
        key ||
      item.alternativeNames.some(
        (alternative) =>
          normalize(
            alternative,
          ) === key,
      ),
  )
}

function customerType(
  customer:
    Customer,
) {
  if (
    customer.type ===
    'company'
  ) {
    return 'Tvrtka'
  }

  if (
    customer.type ===
    'building'
  ) {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

export function NewDeliveryNotePage() {
  const navigate =
    useNavigate()

  const [
    searchParams,
  ] =
    useSearchParams()

  const editId =
    searchParams.get(
      'edit',
    ) ?? ''

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    customers,
    setCustomers,
  ] =
    useState<
      Customer[]
    >([])

  const [
    workOrders,
    setWorkOrders,
  ] =
    useState<
      CloudWorkOrder[]
    >([])

  const [
    offers,
    setOffers,
  ] =
    useState<
      Offer[]
    >([])

  const [
    inventory,
    setInventory,
  ] =
    useState<
      InventoryItem[]
    >([])

  const [
    existing,
    setExisting,
  ] =
    useState<
      DeliveryNote | null
    >(null)

  const [
    customerId,
    setCustomerId,
  ] = useState('')

  const [
    customerName,
    setCustomerName,
  ] = useState('')

  const [
    customerTypeValue,
    setCustomerTypeValue,
  ] =
    useState('Tvrtka')

  const [
    customerOib,
    setCustomerOib,
  ] = useState('')

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState('')

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState('')

  const [
    deliveryDate,
    setDeliveryDate,
  ] =
    useState(today())

  const [
    deliveryTime,
    setDeliveryTime,
  ] =
    useState(
      new Date()
        .toTimeString()
        .slice(0, 5),
    )

  const [
    deliveryAddress,
    setDeliveryAddress,
  ] = useState('')

  const [
    deliveryPlace,
    setDeliveryPlace,
  ] = useState('')

  const [
    workOrderId,
    setWorkOrderId,
  ] = useState('')

  const [
    workOrderNumber,
    setWorkOrderNumber,
  ] = useState('')

  const [
    offerId,
    setOfferId,
  ] = useState('')

  const [
    offerNumber,
    setOfferNumber,
  ] = useState('')

  const [
    vehicleRegistration,
    setVehicleRegistration,
  ] = useState('')

  const [
    deliveredBy,
    setDeliveredBy,
  ] = useState('')

  const [
    receivedBy,
    setReceivedBy,
  ] = useState('')

  const [
    deliveredSignature,
    setDeliveredSignature,
  ] = useState('')

  const [
    receivedSignature,
    setReceivedSignature,
  ] = useState('')

  const [
    note,
    setNote,
  ] = useState('')

  const [
    deductInventory,
    setDeductInventory,
  ] = useState(true)

  const [
    items,
    setItems,
  ] =
    useState<
      DeliveryNoteItem[]
    >([
      emptyItem(),
    ])

  const sourceApplied =
    useRef(false)

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (customer) =>
            customer.status ===
            'Aktivan',
        ),
      [customers],
    )

  useEffect(() => {
    let cancelled =
      false

    void (async () => {
      try {
        setLoading(true)
        setError('')

        const [
          savedCustomers,
          savedWorkOrders,
          savedOffers,
        ] =
          await Promise.all([
            getCustomers(),
            getWorkOrders(),
            getOffers(),
          ])

        if (cancelled) {
          return
        }

        setCustomers(
          savedCustomers,
        )
        setWorkOrders(
          savedWorkOrders,
        )
        setOffers(
          savedOffers,
        )
        setInventory(
          getInventoryItems(),
        )

        if (editId) {
          const saved =
            await getDeliveryNoteById(
              editId,
            )

          if (
            !saved
          ) {
            throw new Error(
              'Otpremnica nije pronađena.',
            )
          }

          if (
            saved.status !==
            'draft'
          ) {
            throw new Error(
              'Može se uređivati samo nacrt otpremnice.',
            )
          }

          setExisting(
            saved,
          )
          setCustomerId(
            saved.customerId,
          )
          setCustomerName(
            saved.customerName,
          )
          setCustomerTypeValue(
            saved.customerType ||
            'Tvrtka',
          )
          setCustomerOib(
            saved.customerOib,
          )
          setCustomerEmail(
            saved.customerEmail,
          )
          setCustomerPhone(
            saved.customerPhone,
          )
          setDeliveryDate(
            saved.deliveryDate,
          )
          setDeliveryTime(
            saved.deliveryTime,
          )
          setDeliveryAddress(
            saved.deliveryAddress,
          )
          setDeliveryPlace(
            saved.deliveryPlace,
          )
          setWorkOrderId(
            saved.workOrderId,
          )
          setWorkOrderNumber(
            saved.workOrderNumber,
          )
          setOfferId(
            saved.offerId,
          )
          setOfferNumber(
            saved.offerNumber,
          )
          setVehicleRegistration(
            saved.vehicleRegistration,
          )
          setDeliveredBy(
            saved.deliveredBy,
          )
          setReceivedBy(
            saved.receivedBy,
          )
          setDeliveredSignature(
            saved.deliveredSignature,
          )
          setReceivedSignature(
            saved.receivedSignature,
          )
          setNote(
            saved.note,
          )
          setDeductInventory(
            saved.deductInventory,
          )
          setItems(
            saved.items.length
              ? saved.items
              : [
                  emptyItem(),
                ],
          )
        }
      } catch (value) {
        if (
          !cancelled
        ) {
          setError(
            value instanceof
              Error
              ? value.message
              : 'Podatke nije moguće učitati.',
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [editId])

  function selectCustomer(
    idValue: string,
  ) {
    setCustomerId(
      idValue,
    )

    const customer =
      customers.find(
        (item) =>
          item.id ===
          idValue,
      )

    if (!customer) {
      return
    }

    setCustomerName(
      customer.name,
    )
    setCustomerTypeValue(
      customerType(
        customer,
      ),
    )
    setCustomerOib(
      customer.oib,
    )
    setCustomerEmail(
      customer.email,
    )
    setCustomerPhone(
      customer.phone,
    )
    setDeliveryAddress(
      [
        customer.street,
        [
          customer.postalCode,
          customer.city,
        ]
          .filter(Boolean)
          .join(' '),
      ]
        .filter(Boolean)
        .join(', '),
    )
    setDeliveryPlace(
      customer.city,
    )
  }

  function applyWorkOrder(
    idValue: string,
  ) {
    setWorkOrderId(
      idValue,
    )

    const order =
      workOrders.find(
        (item) =>
          item.id ===
          idValue,
      )

    if (!order) {
      setWorkOrderNumber(
        '',
      )
      return
    }

    setWorkOrderNumber(
      order.orderNumber,
    )

    if (
      order.customerId
    ) {
      selectCustomer(
        order.customerId,
      )
    } else {
      setCustomerName(
        order.customerName,
      )
      setCustomerOib(
        order.customerOib,
      )
      setCustomerEmail(
        order.customerEmail,
      )
      setCustomerPhone(
        order.customerPhone,
      )
    }

    setDeliveryAddress(
      order.address ||
      deliveryAddress,
    )

    if (
      order.materials.length
    ) {
      setItems(
        order.materials.map(
          (material) => {
            const matched =
              findInventory(
                material.name,
                inventory,
              )

            return {
              id: id(),
              inventoryItemId:
                matched?.id ??
                '',
              code:
                matched?.code ??
                '',
              name:
                material.name,
              description: '',
              quantity:
                material.quantity,
              unit:
                material.unit ||
                matched?.unit ||
                'kom',
              note:
                `Materijal iz radnog naloga ${order.orderNumber}`,
              unitPrice:
                material.unitPrice ||
                matched?.salePrice ||
                0,
              vatRate:
                matched?.vatRate ??
                order.vatRate ??
                25,
            }
          },
        ),
      )
    }
  }

  function applyOffer(
    idValue: string,
  ) {
    setOfferId(
      idValue,
    )

    const offer =
      offers.find(
        (item) =>
          item.id ===
          idValue,
      )

    if (!offer) {
      setOfferNumber(
        '',
      )
      return
    }

    setOfferNumber(
      offer.offerNumber,
    )

    if (
      offer.customerId
    ) {
      selectCustomer(
        offer.customerId,
      )
    } else {
      setCustomerName(
        offer.customerName,
      )
      setCustomerTypeValue(
        offer.customerType,
      )
      setCustomerOib(
        offer.oib,
      )
      setCustomerEmail(
        offer.email,
      )
      setCustomerPhone(
        offer.phone,
      )
      setDeliveryAddress(
        [
          offer.address,
          [
            offer.postalCode,
            offer.city,
          ]
            .filter(Boolean)
            .join(' '),
        ]
          .filter(Boolean)
          .join(', '),
      )
      setDeliveryPlace(
        offer.city,
      )
    }

    if (
      offer.items.length
    ) {
      setItems(
        offer.items.map(
          (offerItem) => {
            const matched =
              findInventory(
                offerItem.name,
                inventory,
              )

            return {
              id: id(),
              inventoryItemId:
                matched?.id ??
                '',
              code:
                matched?.code ??
                '',
              name:
                offerItem.name,
              description:
                offerItem.description,
              quantity:
                offerItem.quantity,
              unit:
                offerItem.unit,
              note:
                `Stavka iz ponude ${offer.offerNumber}`,
              unitPrice:
                offerItem.price,
              vatRate:
                offerItem.vat,
            }
          },
        ),
      )
    }
  }

  useEffect(() => {
    if (
      loading ||
      existing ||
      sourceApplied.current
    ) {
      return
    }

    const fromCustomer =
      searchParams.get(
        'customerId',
      )
    const fromWorkOrder =
      searchParams.get(
        'fromWorkOrder',
      )
    const fromOffer =
      searchParams.get(
        'fromOffer',
      )

    if (
      fromWorkOrder
    ) {
      applyWorkOrder(
        fromWorkOrder,
      )
      sourceApplied.current =
        true
      return
    }

    if (fromOffer) {
      applyOffer(
        fromOffer,
      )
      sourceApplied.current =
        true
      return
    }

    if (fromCustomer) {
      selectCustomer(
        fromCustomer,
      )
      sourceApplied.current =
        true
    }
  }, [
    loading,
    existing,
    customers,
    workOrders,
    offers,
    inventory,
    searchParams,
  ])

  function patchItem(
    itemId: string,
    patch:
      Partial<
        DeliveryNoteItem
      >,
  ) {
    setItems(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            itemId
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    )
  }

  function setInventoryItem(
    rowId: string,
    inventoryId:
      string,
  ) {
    const stock =
      inventory.find(
        (item) =>
          item.id ===
          inventoryId,
      )

    if (!stock) {
      patchItem(
        rowId,
        {
          inventoryItemId:
            '',
        },
      )
      return
    }

    patchItem(
      rowId,
      {
        inventoryItemId:
          stock.id,
        code:
          stock.code,
        name:
          stock.name,
        description:
          stock.description,
        unit:
          stock.unit,
        unitPrice:
          stock.salePrice,
        vatRate:
          stock.vatRate,
      },
    )
  }

  function validate() {
    if (
      !customerName.trim()
    ) {
      throw new Error(
        'Odaberi investitora / primatelja.',
      )
    }

    if (
      !deliveryDate
    ) {
      throw new Error(
        'Unesi datum isporuke.',
      )
    }

    const valid =
      items.filter(
        (item) =>
          item.name.trim() &&
          Number(
            item.quantity,
          ) > 0,
      )

    if (!valid.length) {
      throw new Error(
        'Dodaj barem jednu stavku.',
      )
    }

    if (
      deductInventory
    ) {
      valid.forEach(
        (item) => {
          if (
            !item
              .inventoryItemId
          ) {
            return
          }

          const stock =
            inventory.find(
              (value) =>
                value.id ===
                item
                  .inventoryItemId,
            )

          if (
            stock &&
            stock.quantity <
              item.quantity
          ) {
            throw new Error(
              `Nema dovoljno artikla "${item.name}". Dostupno: ${stock.quantity} ${stock.unit}.`,
            )
          }
        },
      )
    }
  }

  function input() {
    return {
      customerId,
      customerName,
      customerType:
        customerTypeValue,
      customerOib,
      customerEmail,
      customerPhone,

      deliveryDate,
      deliveryTime,
      deliveryAddress,
      deliveryPlace,

      workOrderId,
      workOrderNumber,
      offerId,
      offerNumber,
      invoiceId: '',
      invoiceNumber: '',

      vehicleRegistration,
      deliveredBy,
      receivedBy,

      deliveredSignature,
      receivedSignature,

      note,
      status:
        'draft' as const,

      deductInventory,
      items,
    }
  }

  async function save(
    issueNow:
      boolean,
  ) {
    if (saving) {
      return
    }

    try {
      validate()
      setSaving(true)
      setError('')

      let saved:
        DeliveryNote

      if (existing) {
        saved =
          await updateDeliveryNote({
            ...existing,
            ...input(),
          })
      } else {
        saved =
          await createDeliveryNote(
            input(),
          )
      }

      if (issueNow) {
        saved =
          await issueDeliveryNote(
            saved,
          )
      }

      navigate(
        `/inventory/delivery-notes/${saved.id}`,
        {
          replace: true,
        },
      )
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Otpremnicu nije moguće spremiti.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2
          size={32}
          className="animate-spin text-blue-400"
        />
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-5 pb-28">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/inventory/delivery-notes',
          )
        }
        className="inline-flex items-center gap-2 text-sm font-black text-slate-400"
      >
        <ArrowLeft
          size={18}
        />
        Otpremnice
      </button>

      <header className="rounded-[2rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid h-13 w-13 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
            <Truck
              size={24}
            />
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              Dokument isporuke
            </p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {existing
                ? `Uredi ${existing.number}`
                : 'Nova otpremnica'}
            </h1>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      <Card
        title="Primatelj / investitor"
        icon={
          <Search
            size={18}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Investitor
            <select
              value={
                customerId
              }
              onChange={(
                event,
              ) =>
                selectCustomer(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Odaberi investitora...
              </option>
              {activeCustomers.map(
                (
                  customer,
                ) => (
                  <option
                    key={
                      customer.id
                    }
                    value={
                      customer.id
                    }
                  >
                    {customer.name}
                    {customer.oib
                      ? ` · ${customer.oib}`
                      : ''}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className={labelClass}>
            Naziv primatelja
            <input
              value={
                customerName
              }
              onChange={(
                event,
              ) =>
                setCustomerName(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            OIB
            <input
              value={
                customerOib
              }
              onChange={(
                event,
              ) =>
                setCustomerOib(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            E-mail
            <input
              value={
                customerEmail
              }
              onChange={(
                event,
              ) =>
                setCustomerEmail(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>
        </div>
      </Card>

      <Card
        title="Povezani dokumenti"
        icon={
          <Link2
            size={18}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Radni nalog
            <select
              value={
                workOrderId
              }
              onChange={(
                event,
              ) =>
                applyWorkOrder(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Bez povezanog naloga
              </option>
              {workOrders.map(
                (order) => (
                  <option
                    key={
                      order.id
                    }
                    value={
                      order.id
                    }
                  >
                    {order.orderNumber} · {order.customerName}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className={labelClass}>
            Ponuda
            <select
              value={
                offerId
              }
              onChange={(
                event,
              ) =>
                applyOffer(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Bez povezane ponude
              </option>
              {offers.map(
                (offer) => (
                  <option
                    key={
                      offer.id
                    }
                    value={
                      offer.id
                    }
                  >
                    {offer.offerNumber} · {offer.customerName}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Odabirom radnog naloga ili ponude FERSYS automatski prenosi investitora, adresu i stavke/materijal.
        </p>
      </Card>

      <Card
        title="Podaci o isporuci"
        icon={
          <Truck
            size={18}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className={labelClass}>
            Datum
            <input
              type="date"
              value={
                deliveryDate
              }
              onChange={(
                event,
              ) =>
                setDeliveryDate(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Vrijeme
            <input
              type="time"
              value={
                deliveryTime
              }
              onChange={(
                event,
              ) =>
                setDeliveryTime(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Mjesto
            <input
              value={
                deliveryPlace
              }
              onChange={(
                event,
              ) =>
                setDeliveryPlace(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Registracija vozila
            <input
              value={
                vehicleRegistration
              }
              onChange={(
                event,
              ) =>
                setVehicleRegistration(
                  event
                    .target
                    .value,
                )
              }
              placeholder="SB 123 AB"
              className={inputClass}
            />
          </label>
        </div>

        <label className={`${labelClass} mt-4 block`}>
          Adresa isporuke
          <input
            value={
              deliveryAddress
            }
            onChange={(
              event,
            ) =>
              setDeliveryAddress(
                event
                  .target
                  .value,
              )
            }
            className={inputClass}
          />
        </label>
      </Card>

      <Card
        title="Stavke / materijal"
        icon={
          <Boxes
            size={18}
          />
        }
        action={
          <button
            type="button"
            onClick={() =>
              setItems(
                (current) => [
                  ...current,
                  emptyItem(),
                ],
              )
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white"
          >
            <Plus
              size={15}
            />
            Stavka
          </button>
        }
      >
        <div className="space-y-3">
          {items.map(
            (
              item,
              index,
            ) => {
              const stock =
                inventory.find(
                  (value) =>
                    value.id ===
                    item
                      .inventoryItemId,
                )

              return (
                <article
                  key={
                    item.id
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-300">
                      {index +
                        1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <label className={labelClass}>
                          Artikl iz skladišta
                          <select
                            value={
                              item.inventoryItemId
                            }
                            onChange={(
                              event,
                            ) =>
                              setInventoryItem(
                                item.id,
                                event
                                  .target
                                  .value,
                              )
                            }
                            className={inputClass}
                          >
                            <option value="">
                              Ručna stavka / nije iz skladišta
                            </option>
                            {inventory.map(
                              (
                                inventoryItem,
                              ) => (
                                <option
                                  key={
                                    inventoryItem.id
                                  }
                                  value={
                                    inventoryItem.id
                                  }
                                >
                                  {inventoryItem.name} · {inventoryItem.quantity} {inventoryItem.unit}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className={labelClass}>
                          Naziv
                          <input
                            value={
                              item.name
                            }
                            onChange={(
                              event,
                            ) =>
                              patchItem(
                                item.id,
                                {
                                  name:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className={labelClass}>
                          Šifra
                          <input
                            value={
                              item.code
                            }
                            onChange={(
                              event,
                            ) =>
                              patchItem(
                                item.id,
                                {
                                  code:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            className={inputClass}
                          />
                        </label>

                        <label className={labelClass}>
                          Količina
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event,
                            ) =>
                              patchItem(
                                item.id,
                                {
                                  quantity:
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                },
                              )
                            }
                            className={inputClass}
                          />
                        </label>

                        <label className={labelClass}>
                          JM
                          <select
                            value={
                              item.unit
                            }
                            onChange={(
                              event,
                            ) =>
                              patchItem(
                                item.id,
                                {
                                  unit:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            className={inputClass}
                          >
                            {units.map(
                              (
                                unit,
                              ) => (
                                <option
                                  key={
                                    unit
                                  }
                                  value={
                                    unit
                                  }
                                >
                                  {unit}
                                </option>
                              ),
                            )}
                          </select>
                        </label>

                        <label className={labelClass}>
                          Cijena za račun
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              item.unitPrice
                            }
                            onChange={(
                              event,
                            ) =>
                              patchItem(
                                item.id,
                                {
                                  unitPrice:
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                },
                              )
                            }
                            className={inputClass}
                          />
                        </label>

                        <label className={labelClass}>
                          PDV %
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              item.vatRate
                            }
                            onChange={(
                              event,
                            ) =>
                              patchItem(
                                item.id,
                                {
                                  vatRate:
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                },
                              )
                            }
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                        <input
                          value={
                            item.note
                          }
                          onChange={(
                            event,
                          ) =>
                            patchItem(
                              item.id,
                              {
                                note:
                                  event
                                    .target
                                    .value,
                              },
                            )
                          }
                          placeholder="Napomena uz stavku..."
                          className={inputClass}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setItems(
                              (
                                current,
                              ) =>
                                current.filter(
                                  (
                                    value,
                                  ) =>
                                    value.id !==
                                    item.id,
                                ),
                            )
                          }
                          className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>

                      {stock && (
                        <div
                          className={`mt-3 rounded-xl border p-3 text-xs font-semibold ${
                            stock.quantity >=
                            item.quantity
                              ? 'border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-300'
                              : 'border-red-500/20 bg-red-500/10 text-red-300'
                          }`}
                        >
                          Stanje skladišta: {stock.quantity} {stock.unit}
                          {' → '}
                          nakon izdavanja: {stock.quantity - Number(item.quantity || 0)} {stock.unit}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            },
          )}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-500/15 bg-blue-500/[0.06] p-4">
          <input
            type="checkbox"
            checked={
              deductInventory
            }
            onChange={(
              event,
            ) =>
              setDeductInventory(
                event
                  .target
                  .checked,
              )
            }
            className="mt-1 h-4 w-4"
          />

          <span>
            <strong className="block text-sm text-white">
              Skini povezane artikle sa skladišta nakon izdavanja otpremnice
            </strong>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Ručne stavke bez odabranog artikla ne mijenjaju stanje. Storniranje vraća skinute količine.
            </span>
          </span>
        </label>
      </Card>

      <Card
        title="Predaja i preuzimanje"
        icon={
          <ClipboardList
            size={18}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Predao
            <input
              value={
                deliveredBy
              }
              onChange={(
                event,
              ) =>
                setDeliveredBy(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Preuzeo
            <input
              value={
                receivedBy
              }
              onChange={(
                event,
              ) =>
                setReceivedBy(
                  event
                    .target
                    .value,
                )
              }
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SignaturePad
            title="Potpis osobe koja predaje"
            value={
              deliveredSignature
            }
            onChange={
              setDeliveredSignature
            }
          />

          <SignaturePad
            title="Potpis osobe koja preuzima"
            value={
              receivedSignature
            }
            onChange={
              setReceivedSignature
            }
          />
        </div>

        <label className={`${labelClass} mt-4 block`}>
          Napomena
          <textarea
            value={note}
            onChange={(
              event,
            ) =>
              setNote(
                event
                  .target
                  .value,
              )
            }
            rows={4}
            className={`${inputClass} h-auto min-h-28 py-3`}
          />
        </label>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            void save(
              false,
            )
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 font-black text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2
              size={17}
              className="animate-spin"
            />
          ) : (
            <Save
              size={17}
            />
          )}
          Spremi nacrt
        </button>

        <button
          type="button"
          disabled={
            saving
          }
          onClick={() =>
            void save(
              true,
            )
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2
              size={17}
              className="animate-spin"
            />
          ) : (
            <Send
              size={17}
            />
          )}
          Izdaj otpremnicu
        </button>
      </div>
    </section>
  )
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500'

const labelClass =
  'text-xs font-black uppercase tracking-wide text-slate-500'

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon:
    ReactNode
  action?:
    ReactNode
  children:
    ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
            {icon}
          </span>
          <h2 className="font-black text-white">
            {title}
          </h2>
        </div>

        {action}
      </div>

      {children}
    </section>
  )
}

export default NewDeliveryNotePage
