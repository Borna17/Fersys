import {
  Bot,
  CalendarDays,
  Check,
  CircleAlert,
  LoaderCircle,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

import { isNativeApp } from '../lib/platform'

import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiClientAction,
  type AiProposedAction,
} from '../services/aiAssistant.service'
import { updateOfferStatus } from '../services/offers.service'
import { updateWorkOrderQuickStatus } from '../services/quickStatus.service'
import type { OfferStatus } from '../types/offers'
import type { CloudWorkOrderStatus } from '../services/workOrders.service'

type SpeechRecognitionAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]:
    SpeechRecognitionAlternativeLike
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]:
      SpeechRecognitionResultLike
  }
}

type SpeechRecognitionErrorLike = {
  error: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult:
    | ((
        event:
          SpeechRecognitionEventLike,
      ) => void)
    | null
  onerror:
    | ((
        event:
          SpeechRecognitionErrorLike,
      ) => void)
    | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?:
      SpeechRecognitionConstructor
    webkitSpeechRecognition?:
      SpeechRecognitionConstructor
  }
}

function createMessage(
  role:
    AiAssistantMessage['role'],
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

const welcomeText =
  'Bok! Piši ili govori prirodno, kao u razgovoru. Razumijem investitore/kupce, radne naloge, ponude i kalendar. Možeš reći npr. „napravi investitora Marko Horvat”, „napravi mu nalog sutra u 8”, „stavi zadnju ponudu na prihvaćeno” ili „koji nalozi kasne”. Sve što mijenja podatke prvo traži tvoju potvrdu.'

const AI_CONVERSATION_STORAGE_KEY =
  'fersys_ai_assistant_conversation_v1'

function initialMessages(): AiAssistantMessage[] {
  try {
    const saved = localStorage.getItem(AI_CONVERSATION_STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as AiAssistantMessage[]
  } catch {
    // Pokreni novi razgovor ako lokalna pohrana nije dostupna.
  }
  return [createMessage('assistant', welcomeText)]
}

export function AiAssistantPage() {
  const navigate = useNavigate()
  const [messages, setMessages] =
    useState<AiAssistantMessage[]>(initialMessages)
  const [input, setInput] =
    useState('')
  const [
    isSending,
    setIsSending,
  ] = useState(false)
  const [
    isListening,
    setIsListening,
  ] = useState(false)
  const [
    speechSupported,
    setSpeechSupported,
  ] = useState(true)
  const [error, setError] =
    useState('')
  const [
    proposedAction,
    setProposedAction,
  ] =
    useState<AiProposedAction | null>(
      null,
    )

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null,
    )
  const endRef =
    useRef<HTMLDivElement | null>(
      null,
    )
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    )

  useEffect(() => {
    try {
      localStorage.setItem(
        AI_CONVERSATION_STORAGE_KEY,
        JSON.stringify(messages),
      )
    } catch {
      // Razgovor nastavlja raditi i bez localStoragea.
    }
  }, [messages])

  useEffect(() => {
    if (isNativeApp()) {
      void SpeechRecognition
        .available()
        .then(({ available }) => {
          setSpeechSupported(
            available,
          )
        })
        .catch(() => {
          setSpeechSupported(
            false,
          )
        })

      return
    }

    const Constructor =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition

    if (!Constructor) {
      setSpeechSupported(false)
      return
    }

    const recognition =
      new Constructor()

    recognition.lang = 'hr-HR'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListening(true)
      setError('')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (
      event,
    ) => {
      setIsListening(false)

      if (
        event.error ===
        'not-allowed'
      ) {
        setError(
          'Mikrofon nije dopušten. Omogući pristup mikrofonu u postavkama preglednika.',
        )
        return
      }

      if (
        event.error ===
        'no-speech'
      ) {
        setError(
          'Govor nije prepoznat. Pokušaj ponovno.',
        )
        return
      }

      setError(
        `Glasovni unos nije uspio: ${event.error}`,
      )
    }

    recognition.onresult = (
      event,
    ) => {
      let transcript = ''

      for (
        let index =
          event.resultIndex;
        index <
        event.results.length;
        index += 1
      ) {
        transcript +=
          event.results[index][0]
            ?.transcript ?? ''
      }

      setInput(
        transcript.trim(),
      )
    }

    recognitionRef.current =
      recognition

    return () => {
      recognition.abort()
      recognitionRef.current =
        null
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView(
      {
        behavior: 'smooth',
        block: 'end',
      },
    )
  }, [
    messages,
    proposedAction,
    isSending,
  ])

  useEffect(() => {
    const textarea =
      textareaRef.current

    if (!textarea) return

    textarea.style.height =
      'auto'

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        128,
      )}px`
  }, [input])


  async function runClientAction(
    action: AiClientAction | null,
  ) {
    if (!action) return

    const payload = action.payload

    if (action.type === 'open_customer') {
      const customerId =
        String(payload.customerId ?? '').trim()

      if (customerId) {
        navigate(`/customers/${customerId}`)
      }
      return
    }

    if (action.type === 'open_offer') {
      const offerId =
        String(payload.offerId ?? '').trim()

      if (offerId) {
        navigate(`/offers/${offerId}`)
      }
      return
    }

    if (action.type === 'open_work_order') {
      const workOrderId =
        String(payload.workOrderId ?? '').trim()

      if (workOrderId) {
        navigate(`/work-orders/${workOrderId}`)
      }
      return
    }

    if (action.type === 'create_work_order') {
      sessionStorage.setItem(
        'fersys_ai_work_order_prefill',
        JSON.stringify(payload),
      )
      navigate('/work-orders/new')
      return
    }

    if (action.type === 'create_offer') {
      sessionStorage.setItem(
        'fersys_ai_offer_prefill',
        JSON.stringify(payload),
      )
      navigate('/offers/new')
      return
    }


    if (
      action.type ===
      'change_offer_status'
    ) {
      const offerId =
        String(
          payload.offerId ?? '',
        ).trim()
      const status =
        String(
          payload.status ?? '',
        ).trim() as OfferStatus

      if (
        offerId &&
        status
      ) {
        await updateOfferStatus(
          offerId,
          status,
        )

        setMessages(
          (current) => [
            ...current,
            createMessage(
              'assistant',
              `Status ponude promijenjen je u „${status}”.`,
            ),
          ],
        )
      }
      return
    }

    if (
      action.type ===
      'change_work_order_status'
    ) {
      const workOrderId =
        String(
          payload.workOrderId ?? '',
        ).trim()
      const status =
        String(
          payload.status ?? '',
        ).trim() as CloudWorkOrderStatus

      if (
        workOrderId &&
        status
      ) {
        await updateWorkOrderQuickStatus(
          workOrderId,
          status,
        )

        setMessages(
          (current) => [
            ...current,
            createMessage(
              'assistant',
              `Status radnog naloga promijenjen je u „${status}”.`,
            ),
          ],
        )
      }
      return
    }

    if (action.type === 'generate_offer_pdf') {
      const offerId =
        String(payload.offerId ?? '').trim()

      if (offerId) {
        navigate(`/offers/${offerId}`)
      }
      return
    }

    if (action.type === 'generate_work_order_pdf') {
      const workOrderId =
        String(payload.workOrderId ?? '').trim()

      if (workOrderId) {
        navigate(`/work-orders/${workOrderId}`)
      }
      return
    }

    /*
     * Vozila se zasad ostavljaju backendu / postojećem modulu.
     * Ne izmišljamo nepostojeću rutu.
     */
  }

  async function toggleListening() {
    if (!speechSupported) {
      setError(
        isNativeApp()
          ? 'Glasovno prepoznavanje nije dostupno na ovom uređaju.'
          : 'Ovaj preglednik ne podržava izravno glasovno prepoznavanje. Poruku možeš upisati.',
      )
      return
    }

    if (isNativeApp()) {
      if (isListening) {
        void SpeechRecognition.stop()
        setIsListening(false)
        return
      }

      try {
        setError('')

        const permission =
          await SpeechRecognition
            .checkPermissions()

        if (
          permission
            .speechRecognition !==
          'granted'
        ) {
          const requested =
            await SpeechRecognition
              .requestPermissions()

          if (
            requested
              .speechRecognition !==
            'granted'
          ) {
            setError(
              'Mikrofon nije dopušten. U postavkama telefona omogući mikrofon za FERSYS.',
            )
            return
          }
        }

        setInput('')
        setIsListening(true)

        const result =
          await SpeechRecognition.start({
            language: 'hr-HR',
            maxResults: 3,
            prompt:
              'Govori FERSYS AI pomoćniku',
            popup: false,
            partialResults: false,
          })

        const transcript =
          result.matches?.[0]
            ?.trim() ??
          ''

        if (transcript) {
          setInput(
            transcript,
          )
        } else {
          setError(
            'Govor nije prepoznat. Pokušaj ponovno.',
          )
        }
      } catch (speechError) {
        setError(
          speechError instanceof Error
            ? speechError.message
            : 'Glasovni unos nije uspio.',
        )
      } finally {
        setIsListening(false)
      }

      return
    }

    const recognition =
      recognitionRef.current

    if (!recognition) {
      return
    }

    if (isListening) {
      recognition.stop()
      return
    }

    try {
      setInput('')
      recognition.start()
    } catch {
      recognition.abort()

      window.setTimeout(() => {
        recognition.start()
      }, 100)
    }
  }

  async function sendMessage(
    event?:
      FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault()

    const clean =
      input.trim()

    if (!clean || isSending) {
      return
    }

    const userMessage =
      createMessage(
        'user',
        clean,
      )

    const conversation = [
      ...messages,
      userMessage,
    ]

    setMessages(conversation)
    setInput('')
    setError('')
    setProposedAction(null)
    setIsSending(true)

    try {
      const response =
        await askAiAssistant(
          clean,
          conversation,
        )

      setMessages((current) => [
        ...current,
        createMessage(
          'assistant',
          response.message,
        ),
      ])

      setProposedAction(
        response.proposedAction,
      )

      await runClientAction(
        response.clientAction,
      )
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'AI pomoćnik trenutačno nije dostupan.',
      )
    } finally {
      setIsSending(false)
    }
  }

  async function confirmAction() {
    if (
      !proposedAction ||
      isSending
    ) {
      return
    }

    try {
      setIsSending(true)
      setError('')

      const response =
        await confirmAiAction(
          proposedAction,
        )

      setMessages((current) => [
        ...current,
        createMessage(
          'assistant',
          response.message,
        ),
      ])

      setProposedAction(null)

      await runClientAction(
        response.clientAction,
      )
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Predloženu radnju nije moguće izvršiti.',
      )
    } finally {
      setIsSending(false)
    }
  }

  function clearConversation() {
    if (!window.confirm('Želiš li obrisati cijeli razgovor s AI pomoćnikom?')) return

    localStorage.removeItem(AI_CONVERSATION_STORAGE_KEY)
    setMessages([createMessage('assistant', welcomeText)])
    setInput('')
    setProposedAction(null)
    setError('')
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-var(--fersys-mobile-header-height)-var(--fersys-mobile-nav-height)-var(--fersys-safe-top)-var(--fersys-safe-bottom)-1rem)] w-full max-w-[1500px] flex-col pb-1">
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4 pr-14 sm:pr-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-400">
              <Bot size={23} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                FERSYS AI
              </p>
              <h1 className="mt-1 truncate text-2xl font-black text-white">
                AI pomoćnik
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Govori ili piši. Prije
            promjene podataka AI traži
            tvoju potvrdu.
          </p>
        </div>

        <button
          type="button"
          onClick={clearConversation}
          className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-300 active:scale-95"
          aria-label="Obriši razgovor"
          title="Obriši razgovor"
        >
          <Trash2 size={17} />
        </button>
      </header>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900">
        <div className="fersys-scrollbar-hidden min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pb-4 sm:p-5">
          {messages.map(
            (message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role ===
                  'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                    message.role ===
                    'user'
                      ? 'rounded-br-md bg-blue-600 text-white'
                      : 'rounded-bl-md border border-slate-800 bg-slate-950/70 text-slate-300'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ),
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                AI obrađuje zahtjev...
              </div>
            </div>
          )}

          {proposedAction && (
            <div className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-300">
                  <CalendarDays
                    size={20}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                    PREDLOŽENA RADNJA
                  </p>
                  <h2 className="mt-2 text-lg font-black text-white">
                    {
                      proposedAction.title
                    }
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {
                      proposedAction.description
                    }
                  </p>

                  {proposedAction
                    .warnings.length >
                    0 && (
                    <div className="mt-4 space-y-2">
                      {proposedAction.warnings.map(
                        (warning) => (
                          <div
                            key={warning}
                            className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
                          >
                            <CircleAlert
                              size={16}
                              className="mt-0.5 shrink-0"
                            />
                            {warning}
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() =>
                        void confirmAction()
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-50"
                    >
                      <Check size={17} />
                      Potvrdi
                    </button>

                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() =>
                        setProposedAction(
                          null,
                        )
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-slate-300 disabled:opacity-50"
                    >
                      <X size={17} />
                      Odustani
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <div className="mx-3 mb-2 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-300">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 flex-1 break-words">
              {error}
            </span>
            <button
              type="button"
              onClick={() =>
                setError('')
              }
            >
              <X size={17} />
            </button>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="shrink-0 border-t border-slate-800 bg-slate-950/95 p-2.5 pb-[max(0.625rem,var(--fersys-safe-bottom))] backdrop-blur-xl"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-2 focus-within:border-blue-500">
            <button
              type="button"
              onClick={() =>
                void toggleListening()
              }
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                isListening
                  ? 'animate-pulse bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
              aria-label={
                isListening
                  ? 'Zaustavi mikrofon'
                  : 'Pokreni mikrofon'
              }
            >
              {isListening ? (
                <MicOff size={20} />
              ) : (
                <Mic size={20} />
              )}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                    'Enter' &&
                  !event.shiftKey
                ) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder={
                isListening
                  ? 'Slušam...'
                  : 'Npr. napravi investitora Marko Horvat, pa mu sutra u 8 napravi nalog...'
              }
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-white outline-none placeholder:text-slate-600"
            />

            <button
              type="submit"
              disabled={
                !input.trim() ||
                isSending
              }
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-35"
              aria-label="Pošalji"
            >
              {isSending ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Send size={19} />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <p className="truncate text-[10px] text-slate-600">
              {speechSupported
                ? 'Mikrofon + tipkanje'
                : 'Tipkanje'}
            </p>

            <div className="flex items-center gap-1 text-[10px] font-black text-violet-400">
              <Sparkles size={12} />
              potvrda prije spremanja
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}

export default AiAssistantPage
