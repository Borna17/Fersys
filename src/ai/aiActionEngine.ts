import type {
  NavigateFunction,
} from 'react-router'

import {
  createOffer,
  getOfferById,
  type CreateOfferInput,
} from '../services/offers.service'

import {
  createWorkOrder,
  getWorkOrderById,
  type CreateWorkOrderInput,
} from '../services/workOrders.service'

import type {
  AiClientAction,
} from '../services/aiAssistant.service'

import {
  openOfferPdf,
} from '../utils/offerPdf'

import {
  downloadWorkOrderPdf,
} from '../utils/workOrderPdf'

import {
  readBranding,
} from '../utils/workOrderStorage'

function requiredString(
  value: unknown,
  label: string,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : ''

  if (!text) {
    throw new Error(
      `AI radnji nedostaje ${label}.`,
    )
  }

  return text
}

function stringValue(
  value: unknown,
  fallback = '',
) {
  return typeof value === 'string'
    ? value.trim()
    : fallback
}

function numberValue(
  value: unknown,
  fallback = 0,
) {
  const parsed =
    Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

function booleanValue(
  value: unknown,
) {
  return value === true
}

function calculateDuration(
  start: string,
  end: string,
) {
  if (!start || !end) {
    return 0
  }

  const [
    startHour,
    startMinute,
  ] =
    start.split(':').map(Number)

  const [
    endHour,
    endMinute,
  ] =
    end.split(':').map(Number)

  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return 0
  }

  const startTotal =
    startHour * 60 +
    startMinute

  let endTotal =
    endHour * 60 +
    endMinute

  if (endTotal < startTotal) {
    endTotal += 24 * 60
  }

  return Math.max(
    0,
    endTotal - startTotal,
  )
}

function workOrderMaterials(
  value: unknown,
): CreateWorkOrderInput['materials'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === 'object',
    )
    .map((raw) => {
      const item =
        raw as Record<
          string,
          unknown
        >

      return {
        id: crypto.randomUUID(),
        name:
          stringValue(
            item.name,
          ),
        quantity:
          Math.max(
            0,
            numberValue(
              item.quantity,
              1,
            ),
          ),
        unit:
          stringValue(
            item.unit,
            'kom',
          ) || 'kom',
        unitPrice:
          Math.max(
            0,
            numberValue(
              item.unitPrice,
              0,
            ),
          ),
      }
    })
    .filter(
      (item) =>
        item.name !== '',
    )
}

function offerItems(
  value: unknown,
): CreateOfferInput['items'] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === 'object',
    )
    .map((raw) => {
      const item =
        raw as Record<
          string,
          unknown
        >

      return {
        id: crypto.randomUUID(),
        name:
          stringValue(
            item.name,
          ),
        description:
          stringValue(
            item.description,
          ),
        quantity:
          Math.max(
            0,
            numberValue(
              item.quantity,
              1,
            ),
          ),
        unit:
          stringValue(
            item.unit,
            'kom',
          ) || 'kom',
        price:
          Math.max(
            0,
            numberValue(
              item.price,
              0,
            ),
          ),
        discount:
          Math.min(
            100,
            Math.max(
              0,
              numberValue(
                item.discount,
                0,
              ),
            ),
          ),
        vat:
          Math.min(
            100,
            Math.max(
              0,
              numberValue(
                item.vat,
                25,
              ),
            ),
          ),
      }
    })
    .filter(
      (item) =>
        item.name !== '',
    )
}

function mapOfferCustomerType(
  value: unknown,
): CreateOfferInput['customer']['type'] {
  if (
    value === 'company' ||
    value === 'Tvrtka'
  ) {
    return 'Tvrtka'
  }

  if (
    value === 'building' ||
    value === 'Zgrada'
  ) {
    return 'Zgrada'
  }

  return 'Fizička osoba'
}

export type AiClientActionResult = {
  message: string
}

export async function executeAiClientAction(
  action: AiClientAction,
  navigate: NavigateFunction,
): Promise<AiClientActionResult> {
  switch (action.type) {
    case 'open_customer': {
      const customerId =
        requiredString(
          action.payload.customerId,
          'ID kupca',
        )

      navigate(
        `/customers/${customerId}`,
      )

      return {
        message:
          'Otvorio sam profil kupca.',
      }
    }

    case 'open_offer': {
      const offerId =
        requiredString(
          action.payload.offerId,
          'ID ponude',
        )

      navigate(
        `/offers/${offerId}/edit`,
      )

      return {
        message:
          'Otvorio sam ponudu.',
      }
    }

    case 'open_work_order': {
      const workOrderId =
        requiredString(
          action.payload.workOrderId,
          'ID radnog naloga',
        )

      navigate(
        `/work-orders/${workOrderId}`,
      )

      return {
        message:
          'Otvorio sam radni nalog.',
      }
    }

    case 'create_work_order': {
      const customerId =
        requiredString(
          action.payload.customerId,
          'ID kupca',
        )

      const customerName =
        requiredString(
          action.payload.customerName,
          'ime kupca',
        )

      const materials =
        workOrderMaterials(
          action.payload.materials,
        )

      const materialPrice =
        materials.reduce(
          (sum, material) =>
            sum +
            material.quantity *
              material.unitPrice,
          0,
        )

      const labourPrice =
        Math.max(
          0,
          numberValue(
            action.payload.labourPrice,
            0,
          ),
        )

      const vatRate =
        Math.max(
          0,
          numberValue(
            action.payload.vatRate,
            25,
          ),
        )

      const subtotal =
        materialPrice +
        labourPrice

      const totalPrice =
        subtotal +
        subtotal *
          (vatRate / 100)

      const arrivalTime =
        stringValue(
          action.payload.arrivalTime,
        )

      const departureTime =
        stringValue(
          action.payload.departureTime,
        )

      const workers =
        Array.isArray(
          action.payload.assignedWorkers,
        )
          ? action.payload.assignedWorkers
              .filter(
                (
                  value,
                ): value is string =>
                  typeof value === 'string',
              )
              .map(
                (value) =>
                  value.trim(),
              )
              .filter(Boolean)
          : []

      const input:
        CreateWorkOrderInput = {
          customerId,
          customerName,
          customerContactPerson:
            stringValue(
              action.payload
                .customerContactPerson,
            ),
          customerPhone:
            stringValue(
              action.payload
                .customerPhone,
            ),
          customerEmail:
            stringValue(
              action.payload
                .customerEmail,
            ),
          customerOib:
            stringValue(
              action.payload
                .customerOib,
            ),
          address:
            stringValue(
              action.payload.address,
            ),
          date:
            requiredString(
              action.payload.date,
              'datum',
            ),
          arrivalTime,
          departureTime,
          durationMinutes:
            calculateDuration(
              arrivalTime,
              departureTime,
            ),
          title:
            requiredString(
              action.payload.title,
              'naziv naloga',
            ),
          description:
            stringValue(
              action.payload.description,
            ),
          materials,
          assignedWorkers:
            workers,
          labourPrice,
          materialPrice,
          vatRate,
          totalPrice,
          priceNote:
            stringValue(
              action.payload.priceNote,
            ),
          investorName:
            stringValue(
              action.payload.investorName,
              customerName,
            ) || customerName,
          investorSignature: '',
          images: [],
          status:
            action.payload.status ===
              'Zakazan' ||
            action.payload.status ===
              'U tijeku' ||
            action.payload.status ===
              'Završen' ||
            action.payload.status ===
              'Otkazan'
              ? action.payload.status
              : 'Novi',
          priority:
            action.payload.priority ===
              'Nizak' ||
            action.payload.priority ===
              'Visok' ||
            action.payload.priority ===
              'Hitno'
              ? action.payload.priority
              : 'Normalan',
        }

      const created =
        await createWorkOrder(
          input,
        )

      if (
        booleanValue(
          action.payload
            .generatePdfAfterCreate,
        )
      ) {
        downloadWorkOrderPdf(
          created,
          readBranding(),
        )
      }

      return {
        message:
          booleanValue(
            action.payload
              .generatePdfAfterCreate,
          )
            ? `Radni nalog ${created.orderNumber} je kreiran i PDF je pokrenut za preuzimanje.`
            : `Radni nalog ${created.orderNumber} je uspješno kreiran.`,
      }
    }

    case 'create_offer': {
      const customerId =
        requiredString(
          action.payload.customerId,
          'ID kupca',
        )

      const customerName =
        requiredString(
          action.payload.customerName,
          'ime kupca',
        )

      let items =
        offerItems(
          action.payload.items,
        )

      if (items.length === 0) {
        items = [
          {
            id:
              crypto.randomUUID(),
            name:
              stringValue(
                action.payload.title,
                'Usluga',
              ) || 'Usluga',
            description:
              stringValue(
                action.payload.description,
              ),
            quantity: 1,
            unit: 'usl',
            price: 0,
            discount: 0,
            vat:
              Math.max(
                0,
                numberValue(
                  action.payload.vatRate,
                  25,
                ),
              ),
          },
        ]
      }

      const input:
        CreateOfferInput = {
          customer: {
            id:
              customerId,
            name:
              customerName,
            type:
              mapOfferCustomerType(
                action.payload
                  .customerType,
              ),
            oib:
              stringValue(
                action.payload
                  .customerOib,
              ),
            email:
              stringValue(
                action.payload
                  .customerEmail,
              ),
            phone:
              stringValue(
                action.payload
                  .customerPhone,
              ),
            address:
              stringValue(
                action.payload
                  .customerAddress,
              ),
            postalCode:
              stringValue(
                action.payload
                  .customerPostalCode,
              ),
            city:
              stringValue(
                action.payload
                  .customerCity,
              ),
            contactPerson:
              stringValue(
                action.payload
                  .customerContactPerson,
              ),
          },
          date:
            requiredString(
              action.payload.date,
              'datum ponude',
            ),
          validUntil:
            requiredString(
              action.payload.validUntil,
              'datum valjanosti',
            ),
          status: 'Nacrt',
          responsiblePerson:
            stringValue(
              action.payload
                .responsiblePerson,
            ),
          description:
            stringValue(
              action.payload.description,
            ),
          internalNote: '',
          customerNote:
            stringValue(
              action.payload.customerNote,
            ),
          paymentTerms:
            stringValue(
              action.payload.paymentTerms,
              'Plaćanje prema dogovoru.',
            ) ||
            'Plaćanje prema dogovoru.',
          items,
          attachments: [],
          version: 1,
          history: [],
        }

      const created =
        await createOffer(input)

      if (
        booleanValue(
          action.payload
            .generatePdfAfterCreate,
        )
      ) {
        openOfferPdf(created)
      }

      return {
        message:
          booleanValue(
            action.payload
              .generatePdfAfterCreate,
          )
            ? `Ponuda ${created.offerNumber} je kreirana i otvoren je PDF pregled.`
            : `Ponuda ${created.offerNumber} je uspješno kreirana.`,
      }
    }

    case 'generate_offer_pdf': {
      const offerId =
        requiredString(
          action.payload.offerId,
          'ID ponude',
        )

      const offer =
        await getOfferById(
          offerId,
        )

      if (!offer) {
        throw new Error(
          'Ponuda više ne postoji ili joj nemaš pristup.',
        )
      }

      openOfferPdf(offer)

      return {
        message:
          `Otvoren je PDF ponude ${offer.offerNumber}.`,
      }
    }

    case 'generate_work_order_pdf': {
      const workOrderId =
        requiredString(
          action.payload.workOrderId,
          'ID radnog naloga',
        )

      const order =
        await getWorkOrderById(
          workOrderId,
        )

      if (!order) {
        throw new Error(
          'Radni nalog više ne postoji ili mu nemaš pristup.',
        )
      }

      downloadWorkOrderPdf(
        order,
        readBranding(),
      )

      return {
        message:
          `PDF radnog naloga ${order.orderNumber} je pokrenut za preuzimanje.`,
      }
    }
  }
}
