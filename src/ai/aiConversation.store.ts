import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiClientAction,
  type AiProposedAction,
} from '../services/aiAssistant.service'

const MESSAGES_KEY =
  'fersys_ai_messages_v4'

const ACTION_KEY =
  'fersys_ai_action_v4'

const CLIENT_ACTION_KEY =
  'fersys_ai_client_action_v4'

const CHANGE_EVENT =
  'fersys:ai-conversation-change'

export const AI_WELCOME_TEXT =
  'Pozdrav! Pitaj me prirodno. Mogu pronaći kupce, ponude i radne naloge, otvoriti spremljene zapise, generirati PDF postojećih dokumenata i raditi s kalendarom.'

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

    return (
      Array.isArray(parsed) &&
      parsed.length > 0
    )
      ? parsed
      : defaultMessages()
  } catch {
    return defaultMessages()
  }
}

function readJson<T>(
  key: string,
): T | null {
  try {
    const raw =
      localStorage.getItem(key)

    return raw
      ? JSON.parse(raw) as T
      : null
  } catch {
    return null
  }
}

function saveConversation(
  messages: AiAssistantMessage[],
  action: AiProposedAction | null,
  clientAction:
    AiClientAction | null,
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

  if (clientAction) {
    localStorage.setItem(
      CLIENT_ACTION_KEY,
      JSON.stringify(clientAction),
    )
  } else {
    localStorage.removeItem(
      CLIENT_ACTION_KEY,
    )
  }

  window.dispatchEvent(
    new CustomEvent(
      CHANGE_EVENT,
      {
        detail: {
          messages,
          action,
          clientAction,
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
      () =>
        readJson<AiProposedAction>(
          ACTION_KEY,
        ),
    )

  const [
    clientAction,
    setClientAction,
  ] =
    useState<AiClientAction | null>(
      () =>
        readJson<AiClientAction>(
          CLIENT_ACTION_KEY,
        ),
    )

  const [
    isSending,
    setIsSending,
  ] = useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    function sync(
      event: Event,
    ) {
      const custom =
        event as CustomEvent<{
          messages:
            AiAssistantMessage[]
          action:
            AiProposedAction | null
          clientAction:
            AiClientAction | null
        }>

      if (
        !custom.detail
      ) {
        return
      }

      setMessages(
        custom.detail.messages,
      )

      setProposedAction(
        custom.detail.action,
      )

      setClientAction(
        custom.detail.clientAction,
      )
    }

    window.addEventListener(
      CHANGE_EVENT,
      sync,
    )

    return () => {
      window.removeEventListener(
        CHANGE_EVENT,
        sync,
      )
    }
  }, [])

  const replace =
    useCallback(
      (
        nextMessages:
          AiAssistantMessage[],
        nextAction:
          AiProposedAction | null,
        nextClientAction:
          AiClientAction | null,
      ) => {
        setMessages(nextMessages)
        setProposedAction(
          nextAction,
        )
        setClientAction(
          nextClientAction,
        )

        saveConversation(
          nextMessages,
          nextAction,
          nextClientAction,
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

        const before =
          readMessages()

        const userMessage =
          createMessage(
            'user',
            clean,
          )

        const next = [
          ...before,
          userMessage,
        ]

        replace(
          next,
          null,
          null,
        )

        setIsSending(true)

        try {
          const response =
            await askAiAssistant(
              clean,
              next,
            )

          const completed = [
            ...next,
            createMessage(
              'assistant',
              response.message,
            ),
          ]

          replace(
            completed,
            response.proposedAction,
            response.clientAction,
          )
        } catch (value) {
          const message =
            value instanceof Error
              ? value.message
              : 'AI pomoćnik trenutačno nije dostupan.'

          setError(message)

          replace(
            [
              ...next,
              createMessage(
                'assistant',
                `Nisam uspio obraditi zahtjev.\n\n${message}`,
              ),
            ],
            null,
            null,
          )
        } finally {
          setIsSending(false)
        }
      },
      [
        isSending,
        replace,
      ],
    )

  const confirm =
    useCallback(
      async () => {
        const action =
          readJson<AiProposedAction>(
            ACTION_KEY,
          )

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

          replace(
            [
              ...current,
              createMessage(
                'assistant',
                response.message,
              ),
            ],
            null,
            response.clientAction,
          )
        } catch (value) {
          setError(
            value instanceof Error
              ? value.message
              : 'Radnju nije moguće izvršiti.',
          )
        } finally {
          setIsSending(false)
        }
      },
      [
        isSending,
        replace,
      ],
    )

  const cancelAction =
    useCallback(() => {
      replace(
        readMessages(),
        null,
        null,
      )
    }, [replace])

  const clearClientAction =
    useCallback(() => {
      replace(
        readMessages(),
        readJson<AiProposedAction>(
          ACTION_KEY,
        ),
        null,
      )
    }, [replace])

  const appendAssistantMessage =
    useCallback(
      (content: string) => {
        const clean =
          content.trim()

        if (!clean) {
          return
        }

        const current =
          readMessages()

        replace(
          [
            ...current,
            createMessage(
              'assistant',
              clean,
            ),
          ],
          readJson<AiProposedAction>(
            ACTION_KEY,
          ),
          readJson<AiClientAction>(
            CLIENT_ACTION_KEY,
          ),
        )
      },
      [replace],
    )

  const clear =
    useCallback(() => {
      setError('')

      replace(
        defaultMessages(),
        null,
        null,
      )
    }, [replace])

  return {
    messages,
    proposedAction,
    clientAction,
    isSending,
    error,
    setError,
    send,
    confirm,
    cancelAction,
    clearClientAction,
    appendAssistantMessage,
    clear,
  }
}
