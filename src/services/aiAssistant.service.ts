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
  | 'create_work_order'
  | 'create_customer'
  | 'create_offer'
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

export async function askAiAssistant(
  message: string,
  conversation: AiAssistantMessage[],
): Promise<AiAssistantResponse> {
  const cleanMessage = message.trim()

  if (!cleanMessage) {
    throw new Error('Upišite ili izgovorite poruku.')
  }

  const { data, error } =
    await supabase.functions.invoke(
      'dynamic-handler',
      {
        body: {
          message: cleanMessage,
          conversation: conversation.map(
            (item) => ({
              role: item.role,
              content: item.content,
            }),
          ),
        },
      },
    )

  if (error) {
    throw error
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
  const { data, error } =
    await supabase.functions.invoke(
      'dynamic-handler',
      {
        body: {
          confirmAction: action,
        },
      },
    )

  if (error) {
    throw error
  }

  if (
    !data ||
    typeof data.message !== 'string'
  ) {
    throw new Error(
      'Radnju nije moguće izvršiti.',
    )
  }

  return {
    message: data.message,
    proposedAction: null,
  }
}
