import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useAuth,
} from '../auth/AuthProvider'

import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiClientAction,
  type AiProposedAction,
} from '../services/aiAssistant.service'

const STORAGE_VERSION =
  'v5'

const LEGACY_MESSAGES_KEY =
  'fersys_ai_messages_v4'

const LEGACY_ACTION_KEY =
  'fersys_ai_action_v4'

const LEGACY_CLIENT_ACTION_KEY =
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

function defaultMessages():
AiAssistantMessage[] {
  return [
    createMessage(
      'assistant',
      AI_WELCOME_TEXT,
    ),
  ]
}

function getStorageKeys(
  userId: string,
) {
  return {
    messages:
      `fersys_ai_messages_${STORAGE_VERSION}_${userId}`,

    action:
      `fersys_ai_action_${STORAGE_VERSION}_${userId}`,

    clientAction:
      `fersys_ai_client_action_${STORAGE_VERSION}_${userId}`,
  }
}

function removeLegacySharedConversation() {
  /*
   * Stari v4 ključevi bili su zajednički
   * svim korisnicima istog browsera.
   *
   * Ne migriramo ih nijednom korisniku
   * jer bi time mogli prenijeti tuđu AI
   * povijest u privatni razgovor.
   */
  localStorage.removeItem(
    LEGACY_MESSAGES_KEY,
  )

  localStorage.removeItem(
    LEGACY_ACTION_KEY,
  )

  localStorage.removeItem(
    LEGACY_CLIENT_ACTION_KEY,
  )
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

function readMessages(
  userId: string | null | undefined,
): AiAssistantMessage[] {
  if (!userId) {
    return defaultMessages()
  }

  try {
    const {
      messages: messagesKey,
    } =
      getStorageKeys(userId)

    const raw =
      localStorage.getItem(
        messagesKey,
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

function readAction(
  userId: string | null | undefined,
): AiProposedAction | null {
  if (!userId) {
    return null
  }

  const {
    action,
  } =
    getStorageKeys(userId)

  return readJson<AiProposedAction>(
    action,
  )
}

function readClientAction(
  userId: string | null | undefined,
): AiClientAction | null {
  if (!userId) {
    return null
  }

  const {
    clientAction,
  } =
    getStorageKeys(userId)

  return readJson<AiClientAction>(
    clientAction,
  )
}

function saveConversation(
  userId: string,
  messages: AiAssistantMessage[],
  action:
    AiProposedAction | null,
  clientAction:
    AiClientAction | null,
) {
  const keys =
    getStorageKeys(userId)

  localStorage.setItem(
    keys.messages,
    JSON.stringify(messages),
  )

  if (action) {
    localStorage.setItem(
      keys.action,
      JSON.stringify(action),
    )
  } else {
    localStorage.removeItem(
      keys.action,
    )
  }

  if (clientAction) {
    localStorage.setItem(
      keys.clientAction,
      JSON.stringify(clientAction),
    )
  } else {
    localStorage.removeItem(
      keys.clientAction,
    )
  }

  window.dispatchEvent(
    new CustomEvent(
      CHANGE_EVENT,
      {
        detail: {
          userId,
          messages,
          action,
          clientAction,
        },
      },
    ),
  )
}

export function useAiConversation() {
  const {
    user,
  } = useAuth()

  const userId =
    user?.id ?? null

  const [
    messages,
    setMessages,
  ] =
    useState<AiAssistantMessage[]>(
      () => defaultMessages(),
    )

  const [
    proposedAction,
    setProposedAction,
  ] =
    useState<AiProposedAction | null>(
      null,
    )

  const [
    clientAction,
    setClientAction,
  ] =
    useState<AiClientAction | null>(
      null,
    )

  const [
    isSending,
    setIsSending,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  /*
   * Kod promjene prijavljenog korisnika
   * učitava se samo njegova povijest.
   *
   * Time se sprječava da radnik vidi
   * razgovore vlasnika ili drugog radnika
   * na istom uređaju/browseru.
   */
  useEffect(() => {
    removeLegacySharedConversation()

    setError('')
    setIsSending(false)

    setMessages(
      readMessages(userId),
    )

    setProposedAction(
      readAction(userId),
    )

    setClientAction(
      readClientAction(userId),
    )
  }, [userId])

  /*
   * Sinkronizira AI panel i glavnu
   * AI stranicu samo za istog korisnika.
   */
  useEffect(() => {
    function sync(
      event: Event,
    ) {
      const custom =
        event as CustomEvent<{
          userId: string
          messages:
            AiAssistantMessage[]
          action:
            AiProposedAction | null
          clientAction:
            AiClientAction | null
        }>

      if (
        !custom.detail ||
        !userId ||
        custom.detail.userId !==
          userId
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

    function syncStorage(
      event: StorageEvent,
    ) {
      if (!userId) {
        return
      }

      const keys =
        getStorageKeys(userId)

      if (
        event.key !==
          keys.messages &&
        event.key !==
          keys.action &&
        event.key !==
          keys.clientAction
      ) {
        return
      }

      setMessages(
        readMessages(userId),
      )

      setProposedAction(
        readAction(userId),
      )

      setClientAction(
        readClientAction(
          userId,
        ),
      )
    }

    window.addEventListener(
      CHANGE_EVENT,
      sync,
    )

    window.addEventListener(
      'storage',
      syncStorage,
    )

    return () => {
      window.removeEventListener(
        CHANGE_EVENT,
        sync,
      )

      window.removeEventListener(
        'storage',
        syncStorage,
      )
    }
  }, [userId])

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
        if (!userId) {
          setMessages(
            nextMessages,
          )

          setProposedAction(
            nextAction,
          )

          setClientAction(
            nextClientAction,
          )

          return
        }

        setMessages(
          nextMessages,
        )

        setProposedAction(
          nextAction,
        )

        setClientAction(
          nextClientAction,
        )

        saveConversation(
          userId,
          nextMessages,
          nextAction,
          nextClientAction,
        )
      },
      [userId],
    )

  const send =
    useCallback(
      async (
        text: string,
      ) => {
        const clean =
          text.trim()

        if (
          !clean ||
          isSending
        ) {
          return
        }

        if (!userId) {
          setError(
            'Korisnik nije prijavljen.',
          )

          return
        }

        setError('')

        const before =
          readMessages(userId)

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
        userId,
      ],
    )

  const confirm =
    useCallback(
      async () => {
        if (
          !userId ||
          isSending
        ) {
          return
        }

        const action =
          readAction(userId)

        if (!action) {
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
            readMessages(
              userId,
            )

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
        userId,
      ],
    )

  const cancelAction =
    useCallback(() => {
      if (!userId) {
        replace(
          messages,
          null,
          null,
        )

        return
      }

      replace(
        readMessages(userId),
        null,
        null,
      )
    }, [
      messages,
      replace,
      userId,
    ])

  const clearClientAction =
    useCallback(() => {
      if (!userId) {
        replace(
          messages,
          proposedAction,
          null,
        )

        return
      }

      replace(
        readMessages(userId),
        readAction(userId),
        null,
      )
    }, [
      messages,
      proposedAction,
      replace,
      userId,
    ])

  const appendAssistantMessage =
    useCallback(
      (
        content: string,
      ) => {
        const clean =
          content.trim()

        if (!clean) {
          return
        }

        const current =
          userId
            ? readMessages(
                userId,
              )
            : messages

        replace(
          [
            ...current,

            createMessage(
              'assistant',
              clean,
            ),
          ],

          userId
            ? readAction(
                userId,
              )
            : proposedAction,

          userId
            ? readClientAction(
                userId,
              )
            : clientAction,
        )
      },
      [
        clientAction,
        messages,
        proposedAction,
        replace,
        userId,
      ],
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