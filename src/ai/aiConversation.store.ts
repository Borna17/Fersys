import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useAuth,
} from '../auth/AuthProvider'
import {
  supabase,
} from '../lib/supabase'
import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiClientAction,
  type AiProposedAction,
} from '../services/aiAssistant.service'
import {
  confirmLocalCustomerCreation,
  tryCustomerFastPath,
} from './aiCustomerFastPath'

const CHANGE_EVENT =
  'fersys:ai-conversation-change'

export const AI_WELCOME_TEXT =
  'Pozdrav! Pitaj me prirodno. Mogu pronaći i otvoriti investitore, kreirati novog kupca uz potvrdu, raditi s ponudama i radnim nalozima te pomoći s kalendarom.'

type ConversationSnapshot = {
  userId: string
  messages:
    AiAssistantMessage[]
  action:
    AiProposedAction | null
  clientAction:
    AiClientAction | null
}

type ConversationRow = {
  messages: unknown
  proposed_action: unknown
  client_action: unknown
}

function createMessage(
  role:
    AiAssistantMessage[
      'role'
    ],
  content: string,
): AiAssistantMessage {
  return {
    id:
      crypto.randomUUID(),
    role,
    content,
    createdAt:
      new Date()
        .toISOString(),
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

function isMessage(
  value: unknown,
): value is AiAssistantMessage {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }

  const message =
    value as Record<
      string,
      unknown
    >

  return (
    typeof message.id ===
      'string' &&
    (
      message.role ===
        'user' ||
      message.role ===
        'assistant'
    ) &&
    typeof message.content ===
      'string' &&
    typeof message.createdAt ===
      'string'
  )
}

function parseMessages(
  value: unknown,
): AiAssistantMessage[] {
  if (
    !Array.isArray(value)
  ) {
    return defaultMessages()
  }

  const parsed =
    value.filter(
      isMessage,
    )

  return parsed.length
    ? parsed
    : defaultMessages()
}

function parseObjectOrNull<T>(
  value: unknown,
): T | null {
  if (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as T
  }

  return null
}

function clearLegacyAiLocalStorage() {
  const keysToRemove:
    string[] = []

  for (
    let index = 0;
    index <
    localStorage.length;
    index += 1
  ) {
    const key =
      localStorage.key(
        index,
      )

    if (
      key &&
      (
        key.startsWith(
          'fersys_ai_messages_',
        ) ||
        key.startsWith(
          'fersys_ai_action_',
        ) ||
        key.startsWith(
          'fersys_ai_client_action_',
        )
      )
    ) {
      keysToRemove.push(
        key,
      )
    }
  }

  for (
    const key of
      keysToRemove
  ) {
    localStorage.removeItem(
      key,
    )
  }
}

async function getCurrentCompanyId():
Promise<string> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) {
    throw new Error(
      error.message,
    )
  }

  if (!data) {
    throw new Error(
      'Korisnik nije povezan s aktivnom tvrtkom.',
    )
  }

  return String(data)
}

async function loadConversation(
  userId: string,
): Promise<{
  messages:
    AiAssistantMessage[]
  action:
    AiProposedAction | null
  clientAction:
    AiClientAction | null
}> {
  const companyId =
    await getCurrentCompanyId()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'ai_user_conversations',
      )
      .select(
        'messages,proposed_action,client_action',
      )
      .eq(
        'company_id',
        companyId,
      )
      .eq(
        'user_id',
        userId,
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      error.message,
    )
  }

  if (!data) {
    return {
      messages:
        defaultMessages(),
      action:
        null,
      clientAction:
        null,
    }
  }

  const row =
    data as
      ConversationRow

  return {
    messages:
      parseMessages(
        row.messages,
      ),
    action:
      parseObjectOrNull<
        AiProposedAction
      >(
        row.proposed_action,
      ),
    clientAction:
      parseObjectOrNull<
        AiClientAction
      >(
        row.client_action,
      ),
  }
}

async function saveConversation(
  userId: string,
  messages:
    AiAssistantMessage[],
  action:
    AiProposedAction | null,
  clientAction:
    AiClientAction | null,
): Promise<void> {
  const companyId =
    await getCurrentCompanyId()

  const {
    error,
  } =
    await supabase
      .from(
        'ai_user_conversations',
      )
      .upsert(
        {
          company_id:
            companyId,
          user_id:
            userId,
          messages,
          proposed_action:
            action,
          client_action:
            clientAction,
        },
        {
          onConflict:
            'company_id,user_id',
        },
      )

  if (error) {
    throw new Error(
      error.message,
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
        } satisfies
          ConversationSnapshot,
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

  const activeUserIdRef =
    useRef<
      string | null
    >(userId)

  const [
    messages,
    setMessages,
  ] =
    useState<
      AiAssistantMessage[]
    >(
      () =>
        defaultMessages(),
    )

  const [
    proposedAction,
    setProposedAction,
  ] =
    useState<
      AiProposedAction | null
    >(null)

  const [
    clientAction,
    setClientAction,
  ] =
    useState<
      AiClientAction | null
    >(null)

  const [
    isSending,
    setIsSending,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    isConversationLoading,
    setIsConversationLoading,
  ] =
    useState(true)

  const loadCurrentConversation =
    useCallback(
      async () => {
        if (!userId) {
          setMessages(
            defaultMessages(),
          )
          setProposedAction(
            null,
          )
          setClientAction(
            null,
          )
          setIsConversationLoading(
            false,
          )
          return
        }

        const requestedUserId =
          userId

        try {
          setIsConversationLoading(
            true,
          )
          setError('')

          const conversation =
            await loadConversation(
              requestedUserId,
            )

          if (
            activeUserIdRef
              .current !==
            requestedUserId
          ) {
            return
          }

          setMessages(
            conversation
              .messages,
          )
          setProposedAction(
            conversation.action,
          )
          setClientAction(
            conversation
              .clientAction,
          )
        } catch (value) {
          if (
            activeUserIdRef
              .current !==
            requestedUserId
          ) {
            return
          }

          setMessages(
            defaultMessages(),
          )
          setProposedAction(
            null,
          )
          setClientAction(
            null,
          )
          setError(
            value instanceof
              Error
              ? value.message
              : 'AI razgovor nije moguće učitati.',
          )
        } finally {
          if (
            activeUserIdRef
              .current ===
            requestedUserId
          ) {
            setIsConversationLoading(
              false,
            )
          }
        }
      },
      [userId],
    )

  useEffect(() => {
    clearLegacyAiLocalStorage()
    activeUserIdRef.current =
      userId

    setMessages(
      defaultMessages(),
    )
    setProposedAction(
      null,
    )
    setClientAction(
      null,
    )
    setError('')
    setIsSending(
      false,
    )

    void loadCurrentConversation()
  }, [
    userId,
    loadCurrentConversation,
  ])

  useEffect(() => {
    function sync(
      event: Event,
    ) {
      const custom =
        event as
          CustomEvent<
            ConversationSnapshot
          >

      if (
        !custom.detail ||
        !userId ||
        custom.detail
          .userId !==
          userId
      ) {
        return
      }

      setMessages(
        custom.detail
          .messages,
      )
      setProposedAction(
        custom.detail
          .action,
      )
      setClientAction(
        custom.detail
          .clientAction,
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
  }, [userId])

  const replace =
    useCallback(
      async (
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

        const requestedUserId =
          userId

        setMessages(
          nextMessages,
        )
        setProposedAction(
          nextAction,
        )
        setClientAction(
          nextClientAction,
        )

        try {
          await saveConversation(
            requestedUserId,
            nextMessages,
            nextAction,
            nextClientAction,
          )
        } catch (value) {
          if (
            activeUserIdRef
              .current ===
            requestedUserId
          ) {
            setError(
              value instanceof
                Error
                ? value.message
                : 'AI razgovor nije moguće spremiti.',
            )
          }
          throw value
        }
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
          isSending ||
          isConversationLoading
        ) {
          return
        }

        if (!userId) {
          setError(
            'Korisnik nije prijavljen.',
          )
          return
        }

        const requestedUserId =
          userId

        setError('')

        const before =
          messages

        const userMessage =
          createMessage(
            'user',
            clean,
          )

        const next = [
          ...before,
          userMessage,
        ]

        setIsSending(true)

        try {
          await replace(
            next,
            null,
            null,
          )

          /*
           * FAST PATH:
           * investitori se rješavaju izravno iz Supabasea,
           * bez čekanja AI Edge Functiona.
           */
          const customerFast =
            await tryCustomerFastPath(
              clean,
              before,
            )

          const response =
            customerFast ??
            await askAiAssistant(
              clean,
              next,
            )

          if (
            activeUserIdRef
              .current !==
            requestedUserId
          ) {
            return
          }

          const completed = [
            ...next,
            createMessage(
              'assistant',
              response.message,
            ),
          ]

          await replace(
            completed,
            response
              .proposedAction,
            response
              .clientAction,
          )
        } catch (value) {
          if (
            activeUserIdRef
              .current !==
            requestedUserId
          ) {
            return
          }

          const message =
            value instanceof
              Error
              ? value.message
              : 'AI pomoćnik trenutačno nije dostupan.'

          setError(
            message,
          )

          try {
            await replace(
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
          } catch {
            // Greška spremanja je već prikazana.
          }
        } finally {
          if (
            activeUserIdRef
              .current ===
            requestedUserId
          ) {
            setIsSending(
              false,
            )
          }
        }
      },
      [
        isConversationLoading,
        isSending,
        messages,
        replace,
        userId,
      ],
    )

  const confirm =
    useCallback(
      async () => {
        if (
          !userId ||
          isSending ||
          isConversationLoading ||
          !proposedAction
        ) {
          return
        }

        const requestedUserId =
          userId

        const action =
          proposedAction

        setError('')
        setIsSending(true)

        try {
          /*
           * create_customer se izvršava lokalno preko
           * postojećeg customers.service.ts.
           * Nema drugog odlaska na Edge Function.
           */
          const localResponse =
            await confirmLocalCustomerCreation(
              action,
            )

          const response =
            localResponse ??
            await confirmAiAction(
              action,
            )

          if (
            activeUserIdRef
              .current !==
            requestedUserId
          ) {
            return
          }

          await replace(
            [
              ...messages,
              createMessage(
                'assistant',
                response.message,
              ),
            ],
            null,
            response
              .clientAction,
          )
        } catch (value) {
          if (
            activeUserIdRef
              .current ===
            requestedUserId
          ) {
            setError(
              value instanceof
                Error
                ? value.message
                : 'Radnju nije moguće izvršiti.',
            )
          }
        } finally {
          if (
            activeUserIdRef
              .current ===
            requestedUserId
          ) {
            setIsSending(
              false,
            )
          }
        }
      },
      [
        isConversationLoading,
        isSending,
        messages,
        proposedAction,
        replace,
        userId,
      ],
    )

  const cancelAction =
    useCallback(
      () => {
        void replace(
          messages,
          null,
          null,
        )
      },
      [
        messages,
        replace,
      ],
    )

  const clearClientAction =
    useCallback(
      () => {
        void replace(
          messages,
          proposedAction,
          null,
        )
      },
      [
        messages,
        proposedAction,
        replace,
      ],
    )

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

        void replace(
          [
            ...messages,
            createMessage(
              'assistant',
              clean,
            ),
          ],
          proposedAction,
          clientAction,
        )
      },
      [
        clientAction,
        messages,
        proposedAction,
        replace,
      ],
    )

  const clear =
    useCallback(
      () => {
        setError('')

        void replace(
          defaultMessages(),
          null,
          null,
        )
      },
      [replace],
    )

  return {
    messages,
    proposedAction,
    clientAction,
    isSending:
      isSending ||
      isConversationLoading,
    isConversationLoading,
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
