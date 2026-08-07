import type {
  NavigateFunction,
} from 'react-router'

import {
  getOfferById,
} from '../services/offers.service'

import {
  getWorkOrderById,
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

export async function executeAiClientAction(
  action: AiClientAction,
  navigate: NavigateFunction,
) {
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
      return
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
      return
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
      return
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
      return
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
      return
    }
  }
}
