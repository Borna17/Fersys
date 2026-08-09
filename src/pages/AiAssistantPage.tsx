import {
  Bot,
  Check,
  CircleAlert,
  LoaderCircle,
  Mic,
  Send,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useAiConversation,
} from '../ai/aiConversation.store'
import {
  useAiVoiceRecorder,
} from '../ai/useAiVoiceRecorder'

export function AiAssistantPage() {
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
    (text) => setInput(text),
  )

  useEffect(() => {
    endRef.current
      ?.scrollIntoView({
        behavior: 'smooth',
      })
  }, [
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

  return (
    <section className="mx-auto flex min-h-[calc(100vh-150px)] w-full max-w-[1500px] flex-col">
      <div className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-center lg:justify-between">
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

          <p className="mt-3 max-w-3xl text-slate-400">
            Isti razgovor koji započneš iz gornjeg AI gumba nastavlja se ovdje.
          </p>
        </div>

        <button
          type="button"
          onClick={clear}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-bold text-slate-300 hover:bg-slate-700"
        >
          <Trash2 size={17} />
          Novi razgovor
        </button>
      </div>

      <div className="mt-6 flex min-h-[680px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="mx-auto max-w-4xl space-y-5">
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
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-4 text-sm leading-7 ${
                      message.role ===
                      'user'
                        ? 'rounded-br-md bg-blue-600 text-white'
                        : 'rounded-bl-md border border-slate-800 bg-slate-950/70 text-slate-300'
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
                <div className="flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 text-sm text-violet-200">
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                  AI pretražuje FERSYS podatke...
                </div>
              </div>
            )}

            {proposedAction && (
              <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Sparkles
                    size={18}
                  />

                  <span className="text-xs font-black uppercase tracking-wider">
                    Potrebna potvrda
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-black text-white">
                  {
                    proposedAction.title
                  }
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                  {
                    proposedAction.description
                  }
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void confirm()
                    }}
                    className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white"
                  >
                    <Check size={17} />
                    Potvrdi
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelAction
                    }
                    className="h-11 rounded-xl bg-slate-800 px-5 text-sm font-bold text-slate-300"
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
          <div className="border-t border-red-500/10 bg-red-500/5 px-6 py-3">
            <div className="mx-auto flex max-w-4xl items-start gap-2 text-sm text-red-300">
              <CircleAlert
                size={17}
                className="mt-0.5"
              />
              {error || voiceError}
            </div>
          </div>
        )}

        <div className="border-t border-slate-800 bg-slate-950/60 p-5">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 p-2 focus-within:border-violet-500">
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
              placeholder="Pitaj što želiš o investitorima, ponuda, radnim nalozima ili kalendaru..."
              className="w-full resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600"
            />

            <div className="flex items-center justify-between">
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
                    : 'text-slate-400 hover:bg-slate-800'
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
        </div>
      </div>
    </section>
  )
}
