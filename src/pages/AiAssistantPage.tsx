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

import {
  askAiAssistant,
  confirmAiAction,
  type AiAssistantMessage,
  type AiProposedAction,
} from '../services/aiAssistant.service'

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

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

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

const welcomeMessage = createMessage(
  'assistant',
  'Pozdrav! Možeš mi pisati ili govoriti. Primjer: „Rezerviraj 20. 8. u 10 sati montažu klime kod Ivana Horvata.” Prije spremanja uvijek ću prikazati pregled i tražiti potvrdu.',
)

export function AiAssistantPage() {
  const [messages, setMessages] =
    useState<AiAssistantMessage[]>([
      welcomeMessage,
    ])

  const [input, setInput] =
    useState('')

  const [isSending, setIsSending] =
    useState(false)

  const [isListening, setIsListening] =
    useState(false)

  const [speechSupported, setSpeechSupported] =
    useState(true)

  const [error, setError] =
    useState('')

  const [
    proposedAction,
    setProposedAction,
  ] = useState<AiProposedAction | null>(
    null,
  )

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null,
    )

  const endRef =
    useRef<HTMLDivElement | null>(null)

  useEffect(() => {
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

    recognition.onerror = (event) => {
      setIsListening(false)

      if (event.error === 'not-allowed') {
        setError(
          'Pristup mikrofonu nije dopušten. Omogućite mikrofon u postavkama preglednika.',
        )
        return
      }

      if (event.error === 'no-speech') {
        setError(
          'Govor nije prepoznat. Pokušajte ponovno.',
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
          event.results[index][0]
            ?.transcript ?? ''
      }

      setInput(transcript.trim())
    }

    recognitionRef.current =
      recognition

    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [
    messages,
    proposedAction,
    isSending,
  ])

  function toggleListening() {
    if (!speechSupported) {
      setError(
        'Ovaj preglednik ne podržava izravno glasovno prepoznavanje. Poruku možeš upisati, a kasnije ćemo dodati univerzalno snimanje i AI transkripciju.',
      )
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
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault()

    const cleanInput = input.trim()

    if (
      !cleanInput ||
      isSending
    ) {
      return
    }

    const userMessage =
      createMessage(
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
      const response =
        await askAiAssistant(
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
    setMessages([
      createMessage(
        'assistant',
        welcomeMessage.content,
      ),
    ])

    setInput('')
    setProposedAction(null)
    setError('')
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-110px)] w-full max-w-[1500px] flex-col pb-2 sm:min-h-[calc(100vh-150px)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4 sm:pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-400">
              <Bot size={25} />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-400">
                FERSYS AI
              </p>

              <h1 className="mt-1 text-3xl font-black text-white">
                AI pomoćnik
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Govori ili piši. AI prvo priprema radnju i traži tvoju potvrdu prije spremanja.
          </p>
        </div>

        <button
          type="button"
          onClick={clearConversation}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-300 transition active:scale-95 hover:bg-slate-700 hover:text-white sm:flex sm:w-auto sm:gap-2 sm:px-4"
          aria-label="Novi razgovor"
        >
          <Trash2 size={17} />
          <span className="hidden sm:inline">Novi razgovor</span>
        </button>
      </div>

      <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 sm:mt-6 xl:grid-cols-[1fr_340px] xl:gap-6">
        <div className="flex min-h-[calc(100dvh-250px)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 sm:min-h-[650px] sm:rounded-3xl">
          <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-4 sm:space-y-5 sm:p-6">
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
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] sm:leading-7 ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-blue-600 text-white'
                      : 'rounded-bl-md border border-slate-800 bg-slate-950/70 text-slate-300'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  AI obrađuje zahtjev...
                </div>
              </div>
            )}

            {proposedAction && (
              <div className="rounded-3xl border border-violet-500/30 bg-violet-500/10 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-300">
                    <CalendarDays size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                      Predložena radnja
                    </p>

                    <h2 className="mt-2 text-lg font-black text-white">
                      {proposedAction.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {proposedAction.description}
                    </p>

                    {proposedAction.warnings.length >
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

                    <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:gap-3">
                      <button
                        type="button"
                        disabled={isSending}
                        onClick={() => {
                          void confirmAction()
                        }}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check size={17} />
                        Potvrdi i spremi
                      </button>

                      <button
                        type="button"
                        disabled={isSending}
                        onClick={() =>
                          setProposedAction(null)
                        }
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 text-sm font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
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
            <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mx-6">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span className="min-w-0 flex-1 break-words">
                {error}
              </span>

              <button
                type="button"
                onClick={() => setError('')}
                className="shrink-0 text-red-300 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <form
            onSubmit={sendMessage}
            className="sticky bottom-0 border-t border-slate-800 bg-slate-950/95 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-4"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-2 focus-within:border-blue-500">
              <button
                type="button"
                onClick={toggleListening}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
                  isListening
                    ? 'animate-pulse bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                aria-label={
                  isListening
                    ? 'Zaustavi slušanje'
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
                rows={1}
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
                    void sendMessage()
                  }
                }}
                placeholder={
                  isListening
                    ? 'Slušam...'
                    : 'Napiši ili izgovori zahtjev...'
                }
                className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-slate-500"
              />

              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  isSending
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Pošalji poruku"
              >
                <Send size={19} />
              </button>
            </div>

            <p className="mt-2 hidden px-2 text-xs text-slate-500 sm:block">
              Enter šalje poruku, Shift + Enter dodaje novi red.
            </p>
          </form>
        </div>

        <aside className="space-y-4 sm:space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="text-violet-400" />

              <h2 className="font-black text-white">
                Primjeri naredbi
              </h2>
            </div>

            <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1 xl:block xl:space-y-3 xl:overflow-visible">
              {[
                'Rezerviraj 20. 8. u 10 sati montažu klime.',
                'Provjeri imam li slobodan termin sutra poslije 12.',
                'Prikaži današnje radne naloge.',
                'Koliko imam otvorenih ponuda?',
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() =>
                    setInput(example)
                  }
                  className="min-w-[250px] snap-start rounded-2xl bg-slate-800/70 px-4 py-3 text-left text-sm leading-6 text-slate-300 transition active:scale-[0.99] hover:bg-slate-800 hover:text-white xl:w-full xl:min-w-0"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <h2 className="font-black text-blue-300">
              Sigurno izvršavanje
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              AI neće samostalno spremiti termin, kupca, ponudu ili nalog. Prvo prikazuje pregled, upozorenja i traži potvrdu.
            </p>
          </div>

          {!speechSupported && (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
              <h2 className="font-black text-amber-300">
                Mikrofon nije podržan
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Pisanje radi normalno. U sljedećoj fazi dodat ćemo snimanje zvuka i AI transkripciju koja radi i na preglednicima bez ugrađenog prepoznavanja govora.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
