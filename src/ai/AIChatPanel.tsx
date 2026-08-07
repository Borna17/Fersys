import {
  Bot,
  CalendarDays,
  Check,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Mic,
  Send,
  Sparkles,
  Square,
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
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'

import {
  askAiAssistant,
  confirmAiAction,
  transcribeAiAudio,
  type AiAssistantMessage,
  type AiProposedAction,
} from '../services/aiAssistant.service'

type AIChatPanelProps = {
  open: boolean
  onClose: () => void
}

const quickPrompts = [
  {
    label: 'Što imam danas?',
    prompt:
      'Što imam danas u kalendaru?',
    icon: CalendarDays,
  },
  {
    label: 'Pronađi kupca',
    prompt:
      'Pronađi kupca ',
    icon: UserRound,
  },
  {
    label: 'Kupac + ponude',
    prompt:
      'Pronađi kupca i pokaži sve njegove ponude: ',
    icon: Sparkles,
  },
  {
    label: 'Pronađi nalog',
    prompt:
      'Pronađi zadnji radni nalog.',
    icon: Wrench,
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
    createdAt:
      new Date().toISOString(),
  }
}

const welcomeText =
  'Kako ti mogu pomoći? Pitaj prirodno, npr. „Pronađi Ivana Horvata i pokaži sve njegove ponude i otvorene naloge.”'

export default function AIChatPanel({
  open,
  onClose,
}: AIChatPanelProps) {
  const navigate = useNavigate()

  const [messages, setMessages] =
    useState<AiAssistantMessage[]>([
      createMessage(
        'assistant',
        welcomeText,
      ),
    ])

  const [input, setInput] =
    useState('')

  const [isSending, setIsSending] =
    useState(false)

  const [isRecording, setIsRecording] =
    useState(false)

  const [
    isTranscribing,
    setIsTranscribing,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [
    proposedAction,
    setProposedAction,
  ] =
    useState<AiProposedAction | null>(
      null,
    )

  const endRef =
    useRef<HTMLDivElement | null>(null)

  const inputRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    )

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null)

  const mediaStreamRef =
    useRef<MediaStream | null>(null)

  const audioChunksRef =
    useRef<Blob[]>([])

  useEffect(() => {
    if (!open) return

    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 120)

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [onClose, open])

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [
    messages,
    proposedAction,
    isSending,
    isTranscribing,
  ])

  useEffect(() => {
    return () => {
      mediaRecorderRef.current
        ?.stop()

      mediaStreamRef.current
        ?.getTracks()
        .forEach(
          (track) => track.stop(),
        )
    }
  }, [])

  async function startRecording() {
    if (
      isRecording ||
      isTranscribing
    ) {
      return
    }

    try {
      setError('')

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          'Ovaj preglednik ne podržava snimanje mikrofona.',
        )
      }

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          })

      mediaStreamRef.current = stream
      audioChunksRef.current = []

      const preferredMimeType =
        MediaRecorder.isTypeSupported(
          'audio/webm;codecs=opus',
        )
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported(
                'audio/mp4',
              )
            ? 'audio/mp4'
            : ''

      const recorder =
        preferredMimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType:
                  preferredMimeType,
              },
            )
          : new MediaRecorder(stream)

      recorder.ondataavailable = (
        event,
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data,
          )
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(
          audioChunksRef.current,
          {
            type:
              recorder.mimeType ||
              'audio/webm',
          },
        )

        mediaStreamRef.current
          ?.getTracks()
          .forEach(
            (track) => track.stop(),
          )

        mediaStreamRef.current =
          null

        if (blob.size === 0) {
          setError(
            'Snimka je prazna. Pokušaj ponovno.',
          )
          return
        }

        try {
          setIsTranscribing(true)

          const transcript =
            await transcribeAiAudio(
              blob,
            )

          setInput(transcript)

          window.setTimeout(() => {
            inputRef.current?.focus()
          }, 50)
        } catch (value) {
          setError(
            value instanceof Error
              ? value.message
              : 'Govor nije moguće prepoznati.',
          )
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current =
        recorder

      recorder.start()
      setIsRecording(true)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Mikrofon nije moguće pokrenuti.',
      )
    }
  }

  function stopRecording() {
    const recorder =
      mediaRecorderRef.current

    if (
      !recorder ||
      recorder.state === 'inactive'
    ) {
      return
    }

    recorder.stop()
    setIsRecording(false)
  }

  async function sendText(
    text: string,
  ) {
    const cleanInput = text.trim()

    if (
      !cleanInput ||
      isSending ||
      isTranscribing
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

    setMessages(
      nextConversation,
    )
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
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
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
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Radnju nije moguće izvršiti.',
      )
    } finally {
      setIsSending(false)
    }
  }

  function clearConversation() {
    setMessages([
      createMessage(
        'assistant',
        welcomeText,
      ),
    ])

    setInput('')
    setError('')
    setProposedAction(null)
  }

  if (
    !open ||
    typeof document === 'undefined'
  ) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Zatvori FERSYS AI"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-[500px] max-w-[96vw] flex-col border-l border-slate-800 bg-slate-950 shadow-[-24px_0_60px_rgba(0,0,0,0.55)]">
        <header className="flex h-[86px] shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
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
              onClick={
                clearConversation
              }
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
              title="Otvori puni AI"
            >
              <ExternalLink
                size={17}
              />
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
              <div className="mb-6 rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 to-blue-500/5 p-5">
                <div className="flex items-center gap-2 text-violet-300">
                  <Bot size={19} />
                  <p className="text-xs font-black uppercase tracking-[0.16em]">
                    Pitaj prirodno
                  </p>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Možeš kombinirati više stvari u jednoj poruci. Primjer: „Pronađi Ivana Horvata i pokaži sve njegove ponude i radne naloge.”
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {quickPrompts.map(
                    (item) => {
                      const Icon =
                        item.icon

                      return (
                        <button
                          key={
                            item.label
                          }
                          type="button"
                          onClick={() => {
                            if (
                              item.prompt.endsWith(
                                ' ',
                              )
                            ) {
                              setInput(
                                item.prompt,
                              )
                              inputRef.current
                                ?.focus()
                            } else {
                              void sendText(
                                item.prompt,
                              )
                            }
                          }}
                          className="flex min-h-20 flex-col items-start justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left transition hover:border-violet-500/30"
                        >
                          <Icon
                            size={18}
                            className="text-violet-400"
                          />

                          <span className="mt-3 text-xs font-bold text-slate-300">
                            {
                              item.label
                            }
                          </span>
                        </button>
                      )
                    },
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
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
                      className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role ===
                        'user'
                          ? 'rounded-br-md bg-blue-600 text-white'
                          : 'rounded-bl-md border border-slate-800 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {
                        message.content
                      }
                    </div>
                  </div>
                ),
              )}

              {(isSending ||
                isTranscribing) && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
                    <LoaderCircle
                      size={16}
                      className="animate-spin text-violet-400"
                    />
                    {isTranscribing
                      ? 'Pretvaram govor u tekst...'
                      : 'AI obrađuje zahtjev...'}
                  </div>
                </div>
              )}

              {proposedAction && (
                <div className="overflow-hidden rounded-2xl border border-violet-500/30 bg-violet-500/5">
                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
                      Potrebna potvrda
                    </p>

                    <h3 className="mt-3 font-black text-white">
                      {
                        proposedAction.title
                      }
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                      {
                        proposedAction.description
                      }
                    </p>

                    {proposedAction
                      .warnings.length >
                      0 && (
                      <div className="mt-4 space-y-2">
                        {proposedAction.warnings.map(
                          (
                            warning: string,
                          ) => (
                            <div
                              key={
                                warning
                              }
                              className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                            >
                              <CircleAlert
                                size={
                                  15
                                }
                              />
                              {
                                warning
                              }
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void confirmAction()
                        }}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white"
                      >
                        <Check
                          size={16}
                        />
                        Potvrdi
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setProposedAction(
                            null,
                          )
                        }
                        className="min-h-11 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                      >
                        Odustani
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              <CircleAlert
                size={16}
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-2 focus-within:border-violet-500/50">
              <textarea
                ref={inputRef}
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
                    void sendText(
                      input,
                    )
                  }
                }}
                rows={2}
                placeholder="Npr. Pronađi Ivana i pokaži sve njegove ponude..."
                className="max-h-32 min-h-14 w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      isRecording
                    ) {
                      stopRecording()
                    } else {
                      void startRecording()
                    }
                  }}
                  disabled={
                    isTranscribing
                  }
                  className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${
                    isRecording
                      ? 'bg-red-500/15 text-red-400'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square
                        size={15}
                        fill="currentColor"
                      />
                      Zaustavi
                    </>
                  ) : (
                    <>
                      <Mic
                        size={18}
                      />
                      Govori
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    isSending ||
                    isTranscribing
                  }
                  className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-40"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-600">
              Za promjene podataka AI će tražiti potvrdu.
            </p>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
