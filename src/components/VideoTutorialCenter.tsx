import {
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock3,
  Film,
  ListVideo,
  Play,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useLocation,
} from 'react-router'

import {
  findTutorialForPath,
  videoTutorials,
  type VideoTutorial,
} from '../tutorials/videoTutorials'

const WATCHED_KEY =
  'fersys_video_tutorials_watched_v1'

function readWatched() {
  try {
    const parsed =
      JSON.parse(
        localStorage.getItem(
          WATCHED_KEY,
        ) ??
        '[]',
      )

    return new Set<string>(
      Array.isArray(parsed)
        ? parsed.filter(
            (
              value,
            ): value is string =>
              typeof value ===
              'string',
          )
        : [],
    )
  } catch {
    return new Set<string>()
  }
}

function saveWatched(
  watched:
    Set<string>,
) {
  localStorage.setItem(
    WATCHED_KEY,
    JSON.stringify(
      [...watched],
    ),
  )
}

export default function VideoTutorialCenter() {
  const location =
    useLocation()

  const [
    selected,
    setSelected,
  ] =
    useState<
      VideoTutorial | null
    >(null)

  const [
    libraryOpen,
    setLibraryOpen,
  ] =
    useState(false)

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    watched,
    setWatched,
  ] =
    useState(
      () =>
        readWatched(),
    )

  const current =
    useMemo(
      () =>
        findTutorialForPath(
          location.pathname,
        ),
      [location.pathname],
    )

  const hidden =
    /^\/(login|register|reset-password|auth|admin)(?:\/|$)/.test(
      location.pathname,
    )

  useEffect(() => {
    setSelected(null)
    setLibraryOpen(false)
    setSearch('')
  }, [location.pathname])

  if (hidden) {
    return null
  }

  function markWatched(
    tutorial:
      VideoTutorial,
  ) {
    setWatched(
      (currentSet) => {
        const next =
          new Set(
            currentSet,
          )

        next.add(
          tutorial.id,
        )

        saveWatched(
          next,
        )

        return next
      },
    )
  }

  function openTutorial(
    tutorial:
      VideoTutorial,
  ) {
    setLibraryOpen(
      false,
    )
    setSelected(
      tutorial,
    )
  }

  return (
    <>
      {current && (
        <button
          type="button"
          onClick={() =>
            openTutorial(
              current,
            )
          }
          className="fixed bottom-[5.8rem] left-3 z-[68] inline-flex min-h-11 items-center gap-2 rounded-2xl border border-blue-400/20 bg-slate-900/95 px-3.5 text-xs font-black text-white shadow-2xl shadow-black/35 backdrop-blur-xl transition active:scale-[0.97] md:bottom-6 md:left-auto md:right-6 md:min-h-12 md:px-4 md:text-sm"
          title={`Video pomoć: ${current.shortTitle}`}
          aria-label={`Otvori video pomoć za ${current.shortTitle}`}
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white">
            <Play
              size={15}
              fill="currentColor"
            />
            {!watched.has(
              current.id,
            ) && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
            )}
          </span>

          <span className="hidden sm:inline">
            Video pomoć
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() =>
          setLibraryOpen(
            true,
          )
        }
        className="fixed bottom-[5.8rem] left-[4.2rem] z-[67] grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900/95 text-slate-300 shadow-xl backdrop-blur-xl active:scale-[0.97] md:bottom-6 md:left-auto md:right-[10.2rem]"
        title="Svi video tutorijali"
        aria-label="Otvori sve video tutorijale"
      >
        <ListVideo
          size={19}
        />
      </button>

      {selected && (
        <TutorialModal
          tutorial={
            selected
          }
          watched={
            watched.has(
              selected.id,
            )
          }
          onMarkWatched={() =>
            markWatched(
              selected,
            )
          }
          onClose={() =>
            setSelected(
              null,
            )
          }
          onLibrary={() => {
            setSelected(
              null,
            )
            setLibraryOpen(
              true,
            )
          }}
        />
      )}

      {libraryOpen && (
        <TutorialLibrary
          search={
            search
          }
          watched={
            watched
          }
          onSearch={
            setSearch
          }
          onClose={() =>
            setLibraryOpen(
              false,
            )
          }
          onOpen={
            openTutorial
          }
          onReset={() => {
            const next =
              new Set<string>()

            setWatched(
              next,
            )
            saveWatched(
              next,
            )
          }}
        />
      )}
    </>
  )
}

function TutorialModal({
  tutorial,
  watched,
  onMarkWatched,
  onClose,
  onLibrary,
}: {
  tutorial:
    VideoTutorial
  watched: boolean
  onMarkWatched:
    () => void
  onClose:
    () => void
  onLibrary:
    () => void
}) {
  const videoRef =
    useRef<
      HTMLVideoElement | null
    >(null)

  const [
    videoUnavailable,
    setVideoUnavailable,
  ] =
    useState(false)

  useEffect(() => {
    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[230] overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-xl sm:p-5"
      onMouseDown={
        onClose
      }
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center">
        <section
          className="w-full overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/70"
          onMouseDown={(
            event,
          ) =>
            event.stopPropagation()
          }
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                FERSYS VIDEO POMOĆ
              </p>

              <h2 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">
                {tutorial.title}
              </h2>

              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Clock3
                  size={14}
                />
                {tutorial.duration}
              </div>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400"
              aria-label="Zatvori video"
            >
              <X
                size={19}
              />
            </button>
          </header>

          <div className="grid lg:grid-cols-[1.45fr_.8fr]">
            <main className="border-b border-slate-800 p-4 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-black">
                {!videoUnavailable ? (
                  <video
                    ref={
                      videoRef
                    }
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                    onPlay={() =>
                      onMarkWatched()
                    }
                    onEnded={() =>
                      onMarkWatched()
                    }
                    onError={() =>
                      setVideoUnavailable(
                        true,
                      )
                    }
                  >
                    <source
                      src={
                        tutorial.videoSrc
                      }
                      type="video/mp4"
                    />
                  </video>
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center">
                    <div>
                      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                        <Film
                          size={30}
                        />
                      </span>

                      <h3 className="mt-4 text-lg font-black text-white">
                        Video još nije dodan
                      </h3>

                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                        Kod je spreman. Kada izradiš video, samo ga stavi kao
                        <strong className="text-slate-200">
                          {' '}
                          public{tutorial.videoSrc}
                        </strong>
                        . Ne treba mijenjati ovaj modal.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {
                  tutorial.description
                }
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {!watched && (
                  <button
                    type="button"
                    onClick={
                      onMarkWatched
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white"
                  >
                    <CheckCircle2
                      size={17}
                    />
                    Označi pogledano
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    onLibrary
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-white"
                >
                  <ListVideo
                    size={17}
                  />
                  Svi tutorijali
                </button>
              </div>
            </main>

            <aside className="p-4 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                STORYBOARD
              </p>

              <div className="mt-4 space-y-2.5">
                {tutorial.steps.map(
                  (
                    step,
                    index,
                  ) => (
                    <div
                      key={`${tutorial.id}-${step.time}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/10 text-[10px] font-black text-blue-300">
                          {index +
                            1}
                        </span>

                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[9px] font-black text-slate-400">
                          {
                            step.time
                          }
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-black text-white">
                        {
                          step.title
                        }
                      </p>

                      <p className="mt-1.5 text-xs leading-5 text-slate-400">
                        {
                          step.text
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}

function TutorialLibrary({
  search,
  watched,
  onSearch,
  onClose,
  onOpen,
  onReset,
}: {
  search: string
  watched:
    Set<string>
  onSearch:
    (
      value: string,
    ) => void
  onClose:
    () => void
  onOpen:
    (
      tutorial:
        VideoTutorial,
    ) => void
  onReset:
    () => void
}) {
  useEffect(() => {
    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [])

  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        if (!query) {
          return videoTutorials
        }

        return videoTutorials.filter(
          (tutorial) =>
            [
              tutorial.title,
              tutorial.shortTitle,
              tutorial.description,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    query,
                  ),
            ),
        )
      },
      [search],
    )

  return (
    <div
      className="fixed inset-0 z-[225] overflow-y-auto bg-slate-950/95 p-3 backdrop-blur-xl sm:p-5"
      onMouseDown={
        onClose
      }
    >
      <div className="mx-auto w-full max-w-6xl py-4 sm:py-8">
        <section
          className="overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl"
          onMouseDown={(
            event,
          ) =>
            event.stopPropagation()
          }
        >
          <header className="border-b border-slate-800 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">
                  FERSYS CENTAR ZA UČENJE
                </p>

                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  Video tutorijali
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Kratki vodiči za svaku važnu funkciju. Otvori ih kad god ti zatreba pomoć.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  onClose
                }
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400"
              >
                <X
                  size={19}
                />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    onSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Pretraži tutorijale..."
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>

              <button
                type="button"
                onClick={
                  onReset
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-black text-slate-300"
              >
                <RotateCcw
                  size={16}
                />
                Resetiraj pogledano
              </button>
            </div>
          </header>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {filtered.map(
              (tutorial) => {
                const isWatched =
                  watched.has(
                    tutorial.id,
                  )

                return (
                  <button
                    type="button"
                    key={
                      tutorial.id
                    }
                    onClick={() =>
                      onOpen(
                        tutorial,
                      )
                    }
                    className="group rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-left transition hover:border-blue-500/40 hover:bg-blue-500/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                        <CirclePlay
                          size={21}
                        />
                      </span>

                      <div className="flex items-center gap-2">
                        {isWatched && (
                          <CheckCircle2
                            size={17}
                            className="text-emerald-400"
                          />
                        )}

                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[9px] font-black text-slate-400">
                          {
                            tutorial.duration
                          }
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-4 text-base font-black text-white">
                      {
                        tutorial.shortTitle
                      }
                    </h3>

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                      {
                        tutorial.description
                      }
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs font-black text-blue-300">
                      <span>
                        Otvori vodič
                      </span>
                      <ChevronRight
                        size={16}
                        className="transition group-hover:translate-x-1"
                      />
                    </div>
                  </button>
                )
              },
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
