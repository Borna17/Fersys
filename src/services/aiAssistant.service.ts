import { supabase } from '../lib/supabase'

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
  'dynamic-handler-v2'

/*
 * 22 s je dovoljno za običan tekstualni upit.
 * Govor i skeniranja imaju svoj duži timeout.
 */
const AI_TIMEOUT_MS = 22_000

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<T> {
  let timeoutId = 0

  const timeoutPromise =
    new Promise<never>(
      (_, reject) => {
        timeoutId =
          window.setTimeout(
            () => {
              reject(
                new Error(
                  'FERSYS AI nije odgovorio na vrijeme. Pokušaj ponovno.',
                ),
              )
            },
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
    window.clearTimeout(
      timeoutId,
    )
  }
}

function parseResponse(
  data: unknown,
): AiAssistantResponse {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    throw new Error(
      'FERSYS AI nije vratio ispravan odgovor.',
    )
  }

  const value =
    data as Record<
      string,
      unknown
    >

  if (
    typeof value.message !==
    'string'
  ) {
    throw new Error(
      'FERSYS AI nije vratio tekstualni odgovor.',
    )
  }

  return {
    message:
      value.message,
    proposedAction:
      value.proposedAction &&
      typeof value.proposedAction ===
        'object'
        ? value.proposedAction as
            AiProposedAction
        : null,
    clientAction:
      value.clientAction &&
      typeof value.clientAction ===
        'object'
        ? value.clientAction as
            AiClientAction
        : null,
  }
}

export async function askAiAssistant(
  message: string,
  conversation:
    AiAssistantMessage[],
): Promise<AiAssistantResponse> {
  const cleanMessage =
    message.trim()

  if (!cleanMessage) {
    throw new Error(
      'Upiši ili izgovori poruku.',
    )
  }

  const result =
    await withTimeout(
      supabase.functions.invoke(
        AI_FUNCTION_SLUG,
        {
          body: {
            message:
              cleanMessage,

            /*
             * Kraći kontekst = manji payload i manje
             * nepotrebnog rada na Edge Functionu.
             */
            conversation:
              conversation
                .slice(-8)
                .map(
                  (item) => ({
                    role:
                      item.role,
                    content:
                      item.content,
                  }),
                ),
          },
        },
      ),
    )

  if (result.error) {
    throw new Error(
      result.error.message ||
        'FERSYS AI funkcija nije dostupna.',
    )
  }

  return parseResponse(
    result.data,
  )
}

export async function confirmAiAction(
  action: AiProposedAction,
): Promise<AiAssistantResponse> {
  const result =
    await withTimeout(
      supabase.functions.invoke(
        AI_FUNCTION_SLUG,
        {
          body: {
            confirmAction:
              action,
          },
        },
      ),
    )

  if (result.error) {
    throw new Error(
      result.error.message ||
        'Radnju nije moguće izvršiti.',
    )
  }

  return parseResponse(
    result.data,
  )
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes =
    new Uint8Array(
      buffer,
    )

  const chunkSize =
    0x8000

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
            index +
              chunkSize,
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
  const buffer =
    await blob.arrayBuffer()

  const result =
    await withTimeout(
      supabase.functions.invoke(
        AI_FUNCTION_SLUG,
        {
          body: {
            audioBase64:
              arrayBufferToBase64(
                buffer,
              ),
            audioMimeType:
              blob.type ||
              'audio/webm',
          },
        },
      ),
      50_000,
    )

  if (result.error) {
    throw new Error(
      result.error.message ||
        'Govor nije moguće pretvoriti u tekst.',
    )
  }

  const transcript =
    typeof result.data
      ?.transcript ===
      'string'
      ? result.data
          .transcript
          .trim()
      : ''

  if (!transcript) {
    throw new Error(
      'Nisam prepoznao govor. Pokušaj ponovno.',
    )
  }

  return transcript
}
