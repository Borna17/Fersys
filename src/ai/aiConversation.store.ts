import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiProposedAction,
} from '../services/aiAssistant.service'

const MESSAGES_KEY =
  'fersys_ai_messages_v3'
const ACTION_KEY =
  'fersys_ai_action_v3'
const CHANGE_EVENT =
  'fersys:ai-conversation-change'

export const AI_WELCOME_TEXT =
  'Pozdrav! Pitaj me prirodno. Mogu pronaći kupce, njihove ponude i radne naloge, provjeriti kalendar te pripremiti radnje koje ćeš potvrditi prije spremanja.'

function createMessage(
  role: AiAssistantMessage['role'],
  content: string,
): AiAssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt:
      new Date().toISOString(),
  }
}

function defaultMessages() {
  return [
    createMessage(
      'assistant',
      AI_WELCOME_TEXT,
    ),
  ]
}

function readMessages():
AiAssistantMessage[] {
  try {
    const raw =
      localStorage.getItem(
        MESSAGES_KEY,
      )

    if (!raw) {
      return defaultMessages()
    }

    const parsed =
      JSON.parse(raw)

    if (
      !Array.isArray(parsed) ||
      parsed.length === 0
    ) {
      return defaultMessages()
    }

    return parsed as AiAssistantMessage[]
  } catch {
    return defaultMessages()
  }
}

function readAction():
AiProposedAction | null {
  try {
    const raw =
      localStorage.getItem(
        ACTION_KEY,
      )

    if (!raw) return null

    return JSON.parse(
      raw,
    ) as AiProposedAction
  } catch {
    return null
  }
}

function saveConversation(
  messages: AiAssistantMessage[],
  action: AiProposedAction | null,
) {
  localStorage.setItem(
    MESSAGES_KEY,
    JSON.stringify(messages),
  )

  if (action) {
    localStorage.setItem(
      ACTION_KEY,
      JSON.stringify(action),
    )
  } else {
    localStorage.removeItem(
      ACTION_KEY,
    )
  }

  window.dispatchEvent(
    new CustomEvent(
      CHANGE_EVENT,
      {
        detail: {
          messages,
          action,
        },
      },
    ),
  )
}

export function useAiConversation() {
  const [
    messages,
    setMessages,
  ] =
    useState<AiAssistantMessage[]>(
      () => readMessages(),
    )

  const [
    proposedAction,
    setProposedAction,
  ] =
    useState<AiProposedAction | null>(
      () => readAction(),
    )

  const [
    isSending,
    setIsSending,
  ] = useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    function syncFromEvent(
      event: Event,
    ) {
      const custom =
        event as CustomEvent<{
          messages:
            AiAssistantMessage[]
          action:
            AiProposedAction | null
        }>

      if (
        custom.detail
          ?.messages
      ) {
        setMessages(
          custom.detail.messages,
        )

        setProposedAction(
          custom.detail.action ??
            null,
        )
      }
    }

    function syncFromStorage() {
      setMessages(
        readMessages(),
      )
      setProposedAction(
        readAction(),
      )
    }

    window.addEventListener(
      CHANGE_EVENT,
      syncFromEvent,
    )

    window.addEventListener(
      'storage',
      syncFromStorage,
    )

    return () => {
      window.removeEventListener(
        CHANGE_EVENT,
        syncFromEvent,
      )

      window.removeEventListener(
        'storage',
        syncFromStorage,
      )
    }
  }, [])

  const replaceConversation =
    useCallback(
      (
        nextMessages:
          AiAssistantMessage[],
        nextAction:
          AiProposedAction | null,
      ) => {
        setMessages(nextMessages)
        setProposedAction(
          nextAction,
        )

        saveConversation(
          nextMessages,
          nextAction,
        )
      },
      [],
    )

  const send =
    useCallback(
      async (text: string) => {
        const clean =
          text.trim()

        if (
          !clean ||
          isSending
        ) {
          return
        }

        setError('')

        const userMessage =
          createMessage(
            'user',
            clean,
          )

        const before =
          readMessages()

        const nextConversation = [
          ...before,
          userMessage,
        ]

        replaceConversation(
          nextConversation,
          null,
        )

        setIsSending(true)

        try {
          const response =
            await askAiAssistant(
              clean,
              nextConversation,
            )

          const assistantMessage =
            createMessage(
              'assistant',
              response.message,
            )

          const completed = [
            ...nextConversation,
            assistantMessage,
          ]

          replaceConversation(
            completed,
            response.proposedAction,
          )
        } catch (value) {
          const message =
            value instanceof Error
              ? value.message
              : 'AI pomoćnik trenutačno nije dostupan.'

          setError(message)

          const failedMessage =
            createMessage(
              'assistant',
              `Nisam uspio obraditi zahtjev.\n\n${message}`,
            )

          replaceConversation(
            [
              ...nextConversation,
              failedMessage,
            ],
            null,
          )
        } finally {
          setIsSending(false)
        }
      },
      [
        isSending,
        replaceConversation,
      ],
    )

  const confirm =
    useCallback(
      async () => {
        const action =
          readAction()

        if (
          !action ||
          isSending
        ) {
          return
        }

        setError('')
        setIsSending(true)

        try {
          const response =
            await confirmAiAction(
              action,
            )

          const current =
            readMessages()

          const assistantMessage =
            createMessage(
              'assistant',
              response.message,
            )

          replaceConversation(
            [
              ...current,
              assistantMessage,
            ],
            null,
          )
        } catch (value) {
          const message =
            value instanceof Error
              ? value.message
              : 'Radnju nije moguće izvršiti.'

          setError(message)
        } finally {
          setIsSending(false)
        }
      },
      [
        isSending,
        replaceConversation,
      ],
    )

  const cancelAction =
    useCallback(() => {
      const current =
        readMessages()

      replaceConversation(
        current,
        null,
      )
    }, [replaceConversation])

  const clear =
    useCallback(() => {
      setError('')

      replaceConversation(
        defaultMessages(),
        null,
      )
    }, [replaceConversation])

  return {
    messages,
    proposedAction,
    isSending,
    error,
    setError,
    send,
    confirm,
    cancelAction,
    clear,
  }
}
