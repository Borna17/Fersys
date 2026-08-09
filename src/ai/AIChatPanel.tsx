import {
  Bot,
  Check,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Mic,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'

import {
  useAiConversation,
} from './aiConversation.store'
import {
  useAiVoiceRecorder,
} from './useAiVoiceRecorder'

type Props = {
  open: boolean
  onClose: () => void
}

const quickPrompts = [
  'Pronađi investitora Ivan Horvat',
  'Pronađi investitora i pokaži sve njegove ponude: ',
  'Pronađi zadnji radni nalog',
  'Što imam danas u kalendaru?',
]

export default function AIChatPanel({
  open,
  onClose,
}: Props) {
  const navigate = useNavigate()
  const [input, setInput] =
    useState('')

  const endRef =
    useRef<HTMLDivElement | null>(
      null,
    )

  const {
    messages,
    proposedAction,
    isSending,
    error,
    setError,
    send,
    confirm,
    cancelAction,
    clear,
  } = useAiConversation()

  const {
    isRecording,
    isTranscribing,
    voiceError,
    startRecording,
    stopRecording,
  } = useAiVoiceRecorder(
    (text) => {
      setInput(text)
    },
  )

  useEffect(() => {
    if (!open) return

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === 'Escape'
      ) {
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      onKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        onKeyDown,
      )
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open) return

    requestAnimationFrame(() => {
      endRef.current
        ?.scrollIntoView({
          behavior: 'smooth',
        })
    })
  }, [
    open,
    messages,
    proposedAction,
    isSending,
  ])

  async function submit() {
    const value =
      input.trim()

    if (!value) return

    setInput('')
    setError('')

    await send(value)
  }

  if (
    !open ||
    typeof document ===
      'undefined'
  ) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0"
      style={{
        zIndex: 2147483647,
      }}
    >
      <button
        type="button"
        aria-label="Zatvori AI"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[3px]"
      />

      <aside
        className="absolute bottom-0 right-0 top-0 flex w-[540px] max-w-[96vw] flex-col overflow-hidden border-l border-slate-700 shadow-[-30px_0_80px_rgba(0,0,0,0.65)]"
        style={{
          background:
            '#020617',
        }}
      >
        <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-5">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
              <Sparkles size={22} />
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  FERSYS AI
                </h2>

                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  Online
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Pretražuje tvoje FERSYS podatke
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clear}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-900 hover:text-white"
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
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-900 hover:text-white"
              title="Otvori cijeli AI"
            >
              <ExternalLink size={17} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-900 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-950 px-5 py-5">
          {messages.length === 1 && (
            <div className="mb-5 rounded-3xl border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="flex items-center gap-2 text-violet-300">
                <Bot size={18} />
                <span className="text-xs font-black uppercase tracking-[0.15em]">
                  Primjeri
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {quickPrompts.map(
                  (prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        if (
                          prompt.endsWith(
                            ' ',
                          )
                        ) {
                          setInput(
                            prompt,
                          )
                        } else {
                          void send(
                            prompt,
                          )
                        }
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-left text-xs font-semibold text-slate-300 hover:border-violet-500/30"
                    >
                      <Search
                        size={15}
                        className="shrink-0 text-violet-400"
                      />
                      {prompt}
                    </button>
                  ),
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

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-violet-200">
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  AI pretražuje i obrađuje podatke...
                </div>
              </div>
            )}

            {proposedAction && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Potrebna potvrda
                </p>

                <h3 className="mt-2 font-black text-white">
                  {
                    proposedAction.title
                  }
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {
                    proposedAction.description
                  }
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void confirm()
                    }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white"
                  >
                    <Check size={16} />
                    Potvrdi
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelAction
                    }
                    className="h-11 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                  >
                    Odustani
                  </button>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {(error || voiceError) && (
          <div className="shrink-0 border-t border-red-500/10 bg-red-500/5 px-5 py-3">
            <div className="flex items-start gap-2 text-xs leading-5 text-red-300">
              <CircleAlert
                size={16}
                className="mt-0.5 shrink-0"
              />
              {error || voiceError}
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-2 focus-within:border-violet-500">
            <textarea
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
                  void submit()
                }
              }}
              rows={3}
              placeholder="Npr. Pronađi Ivana Horvata i pokaži sve njegove ponude..."
              className="max-h-32 min-h-[72px] w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={
                  isTranscribing
                }
                onClick={() => {
                  if (
                    isRecording
                  ) {
                    stopRecording()
                  } else {
                    void startRecording()
                  }
                }}
                className={`flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold ${
                  isRecording
                    ? 'bg-red-500/15 text-red-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square
                      size={14}
                      fill="currentColor"
                    />
                    Zaustavi
                  </>
                ) : isTranscribing ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                    Pretvaram govor...
                  </>
                ) : (
                  <>
                    <Mic size={17} />
                    Govori
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  void submit()
                }}
                disabled={
                  !input.trim() ||
                  isSending ||
                  isTranscribing
                }
                className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-600">
            Razgovor se automatski čuva i vidi i na stranici AI pomoćnika.
          </p>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
