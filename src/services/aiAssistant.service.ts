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
  | 'answer'
  | 'none'

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
}

const AI_TIMEOUT_MS = 30_000

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = AI_TIMEOUT_MS,
): Promise<T> {
  let timeoutId = 0

  const timeoutPromise =
    new Promise<never>((_, reject) => {
      timeoutId =
        window.setTimeout(() => {
          reject(
            new Error(
              'AI pomoćnik nije odgovorio unutar 30 sekundi. Provjeri je li Supabase Edge Function "dynamic-handler" deployana i pokušaj ponovno.',
            ),
          )
        }, timeoutMs)
    })

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ])
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function askAiAssistant(
  message: string,
  conversation: AiAssistantMessage[],
): Promise<AiAssistantResponse> {
  const cleanMessage = message.trim()

  if (!cleanMessage) {
    throw new Error(
      'Upiši ili izgovori poruku.',
    )
  }

  const invokePromise =
    supabase.functions.invoke(
      'dynamic-handler',
      {
        body: {
          message: cleanMessage,
          conversation:
            conversation.map(
              (item) => ({
                role: item.role,
                content: item.content,
              }),
            ),
        },
      },
    )

  const { data, error } =
    await withTimeout(invokePromise)

  if (error) {
    throw new Error(
      error.message ||
        'Supabase AI funkcija nije dostupna.',
    )
  }

  if (
    !data ||
    typeof data.message !== 'string'
  ) {
    throw new Error(
      'AI pomoćnik nije vratio ispravan odgovor.',
    )
  }

  return {
    message: data.message,
    proposedAction:
      data.proposedAction &&
      typeof data.proposedAction ===
        'object'
        ? (data.proposedAction as AiProposedAction)
        : null,
  }
}

export async function confirmAiAction(
  action: AiProposedAction,
): Promise<AiAssistantResponse> {
  const invokePromise =
    supabase.functions.invoke(
      'dynamic-handler',
      {
        body: {
          confirmAction: action,
        },
      },
    )

  const { data, error } =
    await withTimeout(invokePromise)

  if (error) {
    throw new Error(
      error.message ||
        'Radnju nije moguće izvršiti.',
    )
  }

  if (
    !data ||
    typeof data.message !== 'string'
  ) {
    throw new Error(
      'AI nije vratio potvrdu izvršene radnje.',
    )
  }

  return {
    message: data.message,
    proposedAction: null,
  }
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    binary += String.fromCharCode(
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
  const buffer =
    await blob.arrayBuffer()

  const audioBase64 =
    arrayBufferToBase64(buffer)

  const invokePromise =
    supabase.functions.invoke(
      'dynamic-handler',
      {
        body: {
          audioBase64,
          audioMimeType:
            blob.type ||
            'audio/webm',
        },
      },
    )

  const { data, error } =
    await withTimeout(
      invokePromise,
      45_000,
    )

  if (error) {
    throw new Error(
      error.message ||
        'Govor nije moguće pretvoriti u tekst.',
    )
  }

  const transcript =
    typeof data?.transcript ===
      'string'
      ? data.transcript.trim()
      : ''

  if (!transcript) {
    throw new Error(
      'Nisam prepoznao govor. Pokušaj ponovno.',
    )
  }

  return transcript
}
