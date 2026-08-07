import {
  useEffect,
  useRef,
} from 'react'
import {
  useNavigate,
} from 'react-router'

import {
  executeAiClientAction,
} from './aiActionEngine'

import {
  useAiConversation,
} from './aiConversation.store'

export default function AiClientActionRunner() {
  const navigate =
    useNavigate()

  const {
    clientAction,
    clearClientAction,
    appendAssistantMessage,
  } =
    useAiConversation()

  const lastActionRef =
    useRef<string>('')

  useEffect(() => {
    if (!clientAction) {
      return
    }

    const key =
      JSON.stringify(
        clientAction,
      )

    if (
      lastActionRef.current ===
      key
    ) {
      return
    }

    lastActionRef.current =
      key

    void (async () => {
      try {
        const result =
          await executeAiClientAction(
            clientAction,
            navigate,
          )

        if (result?.message) {
          appendAssistantMessage(
            result.message,
          )
        }
      } catch (error) {
        console.error(
          'AI client action nije izvršena:',
          error,
        )

        window.alert(
          error instanceof Error
            ? error.message
            : 'AI radnju nije moguće izvršiti.',
        )
      } finally {
        clearClientAction()
      }
    })()
  }, [
    clientAction,
    appendAssistantMessage,
    clearClientAction,
    navigate,
  ])

  return null
}
