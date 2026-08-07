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
        await executeAiClientAction(
          clientAction,
          navigate,
        )
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
    clearClientAction,
    navigate,
  ])

  return null
}
