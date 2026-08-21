import { supabase } from '../lib/supabase'
import {
  buildAiRuntimeContext,
  resolveLocalAiNavigation,
  type AiRuntimeContext,
} from './aiContext.service'

export type AiAssistantRole =
  | 'user'
  | 'assistant'

export type AiAssistantMessage = {
  id: string
  role: AiAssistantRole
  content: string
  createdAt: string
}

export type AiActionType =
  | 'create_calendar_event'
  | 'change_offer_status'
  | 'change_work_order_status'
  | 'create_customer'
  | 'create_work_order'
  | 'create_offer'
  | 'create_vehicle'
  | 'update_vehicle_mileage'
  | 'add_vehicle_service'
  | 'generate_offer_pdf'
  | 'generate_work_order_pdf'
  | 'answer'
  | 'none'

export type AiClientActionType =
  | 'open_customer'
  | 'open_offer'
  | 'open_work_order'
  | 'create_work_order'
  | 'create_offer'
  | 'create_vehicle'
  | 'update_vehicle_mileage'
  | 'add_vehicle_service'
  | 'generate_offer_pdf'
  | 'generate_work_order_pdf'
  | 'change_offer_status'
  | 'change_work_order_status'

export type AiClientAction = {
  type: AiClientActionType
  payload: Record<string, unknown>
}

export type AiProposedAction = {
  type: AiActionType
  title: string
  description: string
  requiresConfirmation: boolean
  payload: Record<string, unknown>
  warnings: string[]
}

export type AiAssistantResponse = {
  message: string
  proposedAction: AiProposedAction | null
  clientAction: AiClientAction | null
}

const AI_FUNCTION_SLUG =
  'dynamic-handler-v3'
const AI_TIMEOUT_MS = 45_000
const AUDIO_TIMEOUT_MS = 60_000

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: number | undefined

  const timeoutPromise =
    new Promise<never>(
      (_, reject) => {
        timeoutId =
          window.setTimeout(
            () =>
              reject(
                new Error(
                  timeoutMessage,
                ),
              ),
            timeoutMs,
          )
      },
    )

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ])
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function parseResponse(
  data: unknown,
): AiAssistantResponse {
  if (!isRecord(data)) {
    throw new Error(
      'FERSYS AI nije vratio ispravan odgovor.',
    )
  }

  if (
    typeof data.message !== 'string'
  ) {
    throw new Error(
      'FERSYS AI nije vratio tekstualni odgovor.',
    )
  }

  return {
    message: data.message.trim(),
    proposedAction:
      isRecord(data.proposedAction)
        ? (data.proposedAction as AiProposedAction)
        : null,
    clientAction:
      isRecord(data.clientAction)
        ? (data.clientAction as AiClientAction)
        : null,
  }
}

async function invokeAi(
  body: Record<string, unknown>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  const result =
    await withTimeout(
      supabase.functions.invoke(
        AI_FUNCTION_SLUG,
        { body },
      ),
      timeoutMs,
      timeoutMessage,
    )

  if (result.error) {
    throw new Error(
      result.error.message ||
        'FERSYS AI funkcija nije dostupna.',
    )
  }

  return result.data
}

function compactContext(
  context: AiRuntimeContext,
) {
  return {
    generatedAt:
      context.generatedAt,
    terminology:
      context.terminology,
    customers:
      context.customers,
    workOrders:
      context.workOrders,
    offers:
      context.offers,
  }
}

export async function askAiAssistant(
  message: string,
  conversation: AiAssistantMessage[],
): Promise<AiAssistantResponse> {
  const cleanMessage =
    message.trim()

  if (!cleanMessage) {
    throw new Error(
      'Upiši ili izgovori poruku.',
    )
  }

  try {
    const local =
      await resolveLocalAiNavigation(
        cleanMessage,
      )

    if (local.handled) {
      return {
        message: local.message,
        proposedAction: null,
        clientAction:
          local.clientAction,
      }
    }
  } catch (error) {
    console.error(
      'Lokalni FERSYS AI resolver:',
      error,
    )
  }

  let context:
    AiRuntimeContext | null = null

  try {
    context =
      await buildAiRuntimeContext()
  } catch (error) {
    console.error(
      'FERSYS AI kontekst nije učitan:',
      error,
    )
  }

  const data =
    await invokeAi(
      {
        message: cleanMessage,
        conversation:
          conversation
            .slice(-10)
            .map((item) => ({
              role: item.role,
              content:
                item.content,
            })),
        context:
          context
            ? compactContext(context)
            : null,
      },
      AI_TIMEOUT_MS,
      'FERSYS AI trenutačno obrađuje zahtjev dulje nego inače. Provjeri internet i pokušaj ponovno.',
    )

  return parseResponse(data)
}

export async function confirmAiAction(
  action: AiProposedAction,
): Promise<AiAssistantResponse> {
  const data =
    await invokeAi(
      {
        confirmAction: action,
      },
      AI_TIMEOUT_MS,
      'Radnja se nije dovršila na vrijeme. Provjeri je li zapis već napravljen prije ponovnog pokušaja.',
    )

  return parseResponse(data)
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes =
    new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          index,
          Math.min(
            index + chunkSize,
            bytes.length,
          ),
        ),
      )
  }

  return btoa(binary)
}

export async function transcribeAiAudio(
  blob: Blob,
): Promise<string> {
  if (blob.size === 0) {
    throw new Error(
      'Snimka je prazna. Pokušaj ponovno.',
    )
  }

  const data =
    await invokeAi(
      {
        audioBase64:
          arrayBufferToBase64(
            await blob.arrayBuffer(),
          ),
        audioMimeType:
          blob.type || 'audio/webm',
      },
      AUDIO_TIMEOUT_MS,
      'Pretvaranje govora u tekst traje predugo. Provjeri internet i pokušaj ponovno.',
    )

  const transcript =
    typeof data?.transcript === 'string'
      ? data.transcript.trim()
      : ''

  if (!transcript) {
    throw new Error(
      'Nisam prepoznao govor. Pokušaj ponovno malo sporije i bliže mikrofonu.',
    )
  }

  return transcript
}
