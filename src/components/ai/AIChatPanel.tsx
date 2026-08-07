import {
  Bot,
  CalendarDays,
  Check,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router'

import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiProposedAction,
} from '../../services/aiAssistant.service'

type SpeechRecognitionAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
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
    | ((event: SpeechRecognitionEventLike) => void)
    | null
  onerror:
    | ((event: SpeechRecognitionErrorLike) => void)
    | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

type AIChatPanelProps = {
  open: boolean
  onClose: () => void
}

const quickPrompts = [
  {
    label: 'Što imam danas?',
    prompt: 'Što imam danas u kalendaru?',
    icon: CalendarDays,
  },
  {
    label: 'Pronađi kupca',
    prompt: 'Pronađi kupca ',
    icon: UserRound,
  },
  {
    label: 'Pronađi nalog',
    prompt: 'Pronađi zadnji radni nalog.',
    icon: Wrench,
  },
  {
    label: 'Dodaj termin',
    prompt: 'Dodaj termin ',
    icon: Sparkles,
  },
]

function createMessage(
  role: AiAssistantMessage['role'],
  content: string,
): AiAssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

const welcomeText =
  'Kako ti mogu pomoći? Možeš pisati ili govoriti. Prije spremanja promjena tražit ću tvoju potvrdu.'

export default function AIChatPanel({
  open,
  onClose,
}: AIChatPanelProps) {
  const navigate = useNavigate()

  const [messages, setMessages] =
    useState<AiAssistantMessage[]>([
      createMessage('assistant', welcomeText),
    ])

  const [input, setInput] = useState('')
  const [isSending, setIsSending] =
    useState(false)
  const [isListening, setIsListening] =
    useState(false)
  const [speechSupported, setSpeechSupported] =
    useState(true)
  const [error, setError] = useState('')
  const [proposedAction, setProposedAction] =
    useState<AiProposedAction | null>(null)

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null)
  const endRef =
    useRef<HTMLDivElement | null>(null)
  const inputRef =
    useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const Constructor =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition

    if (!Constructor) {
      setSpeechSupported(false)
      return
    }

    const recognition = new Constructor()
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

    recognition.onerror = (event) => {
      setIsListening(false)

      if (event.error === 'not-allowed') {
        setError(
          'Mikrofon nije dopušten. Omogući pristup mikrofonu u pregledniku.',
        )
        return
      }

      if (event.error === 'no-speech') {
        setError(
          'Govor nije prepoznat. Pokušaj ponovno.',
        )
        return
      }

      setError(
        `Glasovni unos nije uspio: ${event.error}`,
      )
    }

    recognition.onresult = (event) => {
      let transcript = ''

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        transcript +=
          event.results[index][0]?.transcript ?? ''
      }

      setInput(transcript.trim())
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) return

    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 120)
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, proposedAction, isSending])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [onClose, open])

  function toggleListening() {
    if (!speechSupported) {
      setError(
        'Ovaj preglednik ne podržava izravno glasovno prepoznavanje.',
      )
      return
    }

    const recognition = recognitionRef.current
    if (!recognition) return

    if (isListening) {
      recognition.stop()
      return
    }

    try {
      setError('')
      recognition.start()
    } catch {
      recognition.abort()
      window.setTimeout(() => {
        recognition.start()
      }, 100)
    }
  }

  async function sendText(text: string) {
    const cleanInput = text.trim()

    if (!cleanInput || isSending) return

    const userMessage = createMessage(
      'user',
      cleanInput,
    )

    const nextConversation = [
      ...messages,
      userMessage,
    ]

    setMessages(nextConversation)
    setInput('')
    setError('')
    setProposedAction(null)
    setIsSending(true)

    try {
      const response = await askAiAssistant(
        cleanInput,
        nextConversation,
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

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault()
    await sendText(input)
  }

  async function confirmAction() {
    if (!proposedAction || isSending) return

    try {
      setIsSending(true)
      setError('')

      const response =
        await confirmAiAction(proposedAction)

      setMessages((current) => [
        ...current,
        createMessage(
          'assistant',
          response.message,
        ),
      ])

      setProposedAction(null)
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Radnju nije moguće izvršiti.',
      )
    } finally {
      setIsSending(false)
    }
  }

  function clearConversation() {
    setMessages([
      createMessage('assistant', welcomeText),
    ])
    setInput('')
    setError('')
    setProposedAction(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] hidden lg:block">
      <button
        type="button"
        aria-label="Zatvori FERSYS AI"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-[460px] max-w-[92vw] flex-col border-l border-slate-800 bg-slate-950 shadow-[-24px_0_60px_rgba(0,0,0,0.45)]">
        <header className="flex h-[86px] shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-950/40">
              <Sparkles size={21} />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white">
                  FERSYS AI
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  Online
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Poslovni AI pomoćnik
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={clearConversation}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-900 hover:text-white"
              title="Novi razgovor"
            >
              <Trash2 size={17} />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/ai')
              }}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-900 hover:text-white"
              title="Otvori cijeli AI pomoćnik"
            >
              <ExternalLink size={17} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-900 hover:text-white"
              aria-label="Zatvori"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {messages.length <= 1 && (
              <div className="mb-6">
                <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-blue-500/5 p-5">
                  <div className="flex items-center gap-2 text-violet-300">
                    <Bot size={19} />
                    <p className="text-xs font-black uppercase tracking-[0.16em]">
                      Brzi početak
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Pitaj me za kupce, naloge, ponude ili kalendar. Za promjene koje utječu na podatke tražit ću potvrdu prije spremanja.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {quickPrompts.map((item) => {
                      const Icon = item.icon

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            if (
                              item.prompt.endsWith(' ')
                            ) {
                              setInput(item.prompt)
                              inputRef.current?.focus()
                            } else {
                              void sendText(item.prompt)
                            }
                          }}
                          className="flex min-h-20 flex-col items-start justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left transition hover:border-violet-500/30 hover:bg-slate-900"
                        >
                          <Icon
                            size={18}
                            className="text-violet-400"
                          />
                          <span className="mt-3 text-xs font-bold text-slate-300">
                            {item.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-blue-600 text-white shadow-lg shadow-blue-950/20'
                        : 'rounded-bl-md border border-slate-800 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
                    <LoaderCircle
                      size={16}
                      className="animate-spin text-violet-400"
                    />
                    AI obrađuje zahtjev...
                  </div>
                </div>
              )}

              {proposedAction && (
                <div className="overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/5">
                  <div className="border-b border-violet-500/15 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        size={17}
                        className="text-violet-300"
                      />
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                        Potrebna potvrda
                      </p>
                    </div>

                    <h3 className="mt-3 font-black text-white">
                      {proposedAction.title}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                      {proposedAction.description}
                    </p>
                  </div>

                  {proposedAction.warnings.length > 0 && (
                    <div className="space-y-2 border-b border-violet-500/15 p-4">
                      {proposedAction.warnings.map(
                        (warning) => (
                          <div
                            key={warning}
                            className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-300"
                          >
                            <CircleAlert
                              size={15}
                              className="mt-0.5 shrink-0"
                            />
                            {warning}
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 p-3">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => {
                        void confirmAction()
                      }}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Check size={16} />
                      Potvrdi
                    </button>

                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() =>
                        setProposedAction(null)
                      }
                      className="min-h-11 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                    >
                      Odustani
                    </button>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-300">
              <CircleAlert
                size={16}
                className="mt-0.5 shrink-0"
              />
              {error}
            </div>
          )}

          <form
            onSubmit={(event) => {
              void sendMessage(event)
            }}
            className="border-t border-slate-800 bg-slate-950 p-4"
          >
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2 transition focus-within:border-violet-500/50 focus-within:ring-4 focus-within:ring-violet-500/5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey
                  ) {
                    event.preventDefault()
                    void sendText(input)
                  }
                }}
                rows={2}
                placeholder="Npr. Pronađi kupca Ivan Horvat..."
                className="max-h-32 min-h-14 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-600"
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                      isListening
                        ? 'bg-red-500/15 text-red-400'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={
                      speechSupported
                        ? 'Govorni unos'
                        : 'Govorni unos nije podržan'
                    }
                  >
                    {isListening ? (
                      <MicOff size={18} />
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>

                  {isListening && (
                    <span className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-red-400">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      Slušam...
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    !input.trim() || isSending
                  }
                  className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Pošalji poruku"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-600">
              AI može pogriješiti. Provjeri važne podatke prije potvrde.
            </p>
          </form>
        </div>
      </aside>
    </div>
  )
}
