import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Link2,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import FersysLoader from '../components/FersysLoader'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  hasCalendarConflict,
  saveGoogleImportedEvent,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarStatus,
} from '../services/calendar.service'

type EventForm = {
  title: string
  customer: string
  date: string
  startTime: string
  endTime: string
  location: string
  workers: string
  description: string
  status: CalendarStatus
}

type GoogleTokenResponse = {
  access_token?: string
  error?: string
}

type GoogleTokenClient = {
  requestAccessToken: (options?: {
    prompt?: string
  }) => void
}

type GoogleCalendarApiEvent = {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: {
    date?: string
    dateTime?: string
  }
  end?: {
    date?: string
    dateTime?: string
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (
              response: GoogleTokenResponse,
            ) => void
            error_callback?: () => void
          }) => GoogleTokenClient
          revoke: (
            token: string,
            callback?: () => void,
          ) => void
        }
      }
    }
  }
}

const GOOGLE_SCOPE =
  'https://www.googleapis.com/auth/calendar.events'

const weekDays = [
  'Pon',
  'Uto',
  'Sri',
  'Čet',
  'Pet',
  'Sub',
  'Ned',
]

const monthNames = [
  'Siječanj',
  'Veljača',
  'Ožujak',
  'Travanj',
  'Svibanj',
  'Lipanj',
  'Srpanj',
  'Kolovoz',
  'Rujan',
  'Listopad',
  'Studeni',
  'Prosinac',
]

function localDateString(
  date: Date,
) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function emptyForm(
  date = localDateString(
    new Date(),
  ),
): EventForm {
  return {
    title: '',
    customer: '',
    date,
    startTime: '08:00',
    endTime: '09:00',
    location: '',
    workers: '',
    description: '',
    status: 'Zakazano',
  }
}

function monthRange(
  date: Date,
) {
  const first =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    )
  const start =
    new Date(first)
  const mondayIndex =
    (first.getDay() + 6) % 7

  start.setDate(
    first.getDate() -
      mondayIndex,
  )

  const end =
    new Date(start)
  end.setDate(
    start.getDate() + 41,
  )

  return {
    from: localDateString(start),
    to: localDateString(end),
  }
}

function loadGoogleScript() {
  return new Promise<void>(
    (resolve, reject) => {
      if (
        window.google?.accounts
          ?.oauth2
      ) {
        resolve()
        return
      }

      const existing =
        document.querySelector(
          'script[data-google-identity]',
        )

      if (existing) {
        existing.addEventListener(
          'load',
          () => resolve(),
        )
        existing.addEventListener(
          'error',
          () => reject(),
        )
        return
      }

      const script =
        document.createElement(
          'script',
        )

      script.src =
        'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity =
        'true'

      script.onload = () =>
        resolve()
      script.onerror = () =>
        reject(
          new Error(
            'Google skripta se nije učitala.',
          ),
        )

      document.head.appendChild(
        script,
      )
    },
  )
}

function googleDate(
  date?: string,
  dateTime?: string,
) {
  if (date) return date

  if (dateTime) {
    return localDateString(
      new Date(dateTime),
    )
  }

  return localDateString(
    new Date(),
  )
}

function googleTime(
  dateTime?: string,
  fallback = '08:00',
) {
  if (!dateTime) {
    return fallback
  }

  const date =
    new Date(dateTime)

  return `${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function statusClass(
  status: CalendarStatus,
) {
  if (status === 'Završeno') {
    return 'bg-emerald-500/15 text-emerald-300'
  }

  if (status === 'U tijeku') {
    return 'bg-blue-500/15 text-blue-300'
  }

  if (status === 'Otkazano') {
    return 'bg-red-500/15 text-red-300'
  }

  return 'bg-violet-500/15 text-violet-300'
}

export function CalendarPage() {
  const [events, setEvents] =
    useState<CalendarEvent[]>([])
  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(new Date())
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    localDateString(
      new Date(),
    ),
  )

  const [
    isModalOpen,
    setIsModalOpen,
  ] = useState(false)
  const [form, setForm] =
    useState<EventForm>(
      emptyForm(),
    )

  const [
    googleAccessToken,
    setGoogleAccessToken,
  ] = useState('')
  const [
    isGoogleLoading,
    setIsGoogleLoading,
  ] = useState(false)

  const [isLoading, setIsLoading] =
    useState(true)
  const [isSaving, setIsSaving] =
    useState(false)
  const [message, setMessage] =
    useState('')
  const [error, setError] =
    useState('')

  const googleClientId =
    import.meta.env
      .VITE_GOOGLE_CLIENT_ID ?? ''

  async function loadEvents() {
    try {
      setIsLoading(true)
      setError('')

      const range =
        monthRange(
          currentMonth,
        )

      const loaded =
        await getCalendarEvents(
          range.from,
          range.to,
        )

      setEvents(loaded)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Termine nije moguće učitati.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [currentMonth])

  useEffect(() => {
    document.body.style.overflow =
      isModalOpen
        ? 'hidden'
        : ''

    return () => {
      document.body.style.overflow =
        ''
    }
  }, [isModalOpen])

  const monthDays =
    useMemo(() => {
      const year =
        currentMonth.getFullYear()
      const month =
        currentMonth.getMonth()
      const first =
        new Date(
          year,
          month,
          1,
        )
      const last =
        new Date(
          year,
          month + 1,
          0,
        )
      const mondayIndex =
        (first.getDay() + 6) %
        7

      const days: Array<{
        date: Date
        dateString: string
        isCurrentMonth: boolean
      }> = []

      for (
        let index =
          mondayIndex;
        index > 0;
        index -= 1
      ) {
        const date =
          new Date(
            year,
            month,
            1 - index,
          )
        days.push({
          date,
          dateString:
            localDateString(
              date,
            ),
          isCurrentMonth:
            false,
        })
      }

      for (
        let day = 1;
        day <= last.getDate();
        day += 1
      ) {
        const date =
          new Date(
            year,
            month,
            day,
          )
        days.push({
          date,
          dateString:
            localDateString(
              date,
            ),
          isCurrentMonth: true,
        })
      }

      while (
        days.length < 42
      ) {
        const previous =
          days[
            days.length - 1
          ].date
        const next =
          new Date(previous)
        next.setDate(
          next.getDate() + 1,
        )

        days.push({
          date: next,
          dateString:
            localDateString(
              next,
            ),
          isCurrentMonth:
            false,
        })
      }

      return days
    }, [currentMonth])

  const selectedEvents =
    useMemo(
      () =>
        events
          .filter(
            (event) =>
              event.date ===
              selectedDate,
          )
          .sort(
            (a, b) =>
              a.startTime.localeCompare(
                b.startTime,
              ),
          ),
      [events, selectedDate],
    )

  function previousMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() -
          1,
        1,
      ),
    )
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() +
          1,
        1,
      ),
    )
  }

  function goToday() {
    const now = new Date()

    setCurrentMonth(now)
    setSelectedDate(
      localDateString(now),
    )
  }

  function openNew(
    date = selectedDate,
  ) {
    setForm(
      emptyForm(date),
    )
    setSelectedDate(date)
    setMessage('')
    setError('')
    setIsModalOpen(true)
  }

  async function saveEvent(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!form.title.trim()) {
      setError(
        'Upiši naziv termina.',
      )
      return
    }

    if (
      form.endTime <=
      form.startTime
    ) {
      setError(
        'Vrijeme završetka mora biti nakon početka.',
      )
      return
    }

    try {
      setIsSaving(true)
      setError('')

      const conflict =
        await hasCalendarConflict(
          form.date,
          form.startTime,
          form.endTime,
        )

      if (conflict) {
        setError(
          `Termin se preklapa s događajem „${conflict.title}” od ${conflict.startTime} do ${conflict.endTime}.`,
        )
        return
      }

      const saved =
        await createCalendarEvent(
          {
            title:
              form.title,
            customer:
              form.customer,
            date: form.date,
            startTime:
              form.startTime,
            endTime:
              form.endTime,
            location:
              form.location,
            workers:
              form.workers,
            description:
              form.description,
            status:
              form.status,
            source: 'manual',
          },
        )

      setEvents((current) =>
        [...current, saved].sort(
          (a, b) =>
            `${a.date} ${a.startTime}`.localeCompare(
              `${b.date} ${b.startTime}`,
            ),
        ),
      )

      setSelectedDate(
        form.date,
      )
      setIsModalOpen(false)
      setMessage(
        'Termin je spremljen.',
      )
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Termin nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function removeEvent(
    eventId: string,
  ) {
    if (
      !window.confirm(
        'Želiš li obrisati ovaj termin?',
      )
    ) {
      return
    }

    try {
      setIsSaving(true)
      setError('')

      await deleteCalendarEvent(
        eventId,
      )

      setEvents((current) =>
        current.filter(
          (event) =>
            event.id !== eventId,
        ),
      )

      setMessage(
        'Termin je obrisan.',
      )
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Termin nije moguće obrisati.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function connectGoogle() {
    if (!googleClientId) {
      setError(
        'Nedostaje VITE_GOOGLE_CLIENT_ID u .env datoteci.',
      )
      return
    }

    setIsGoogleLoading(true)
    setError('')

    try {
      await loadGoogleScript()

      const oauth =
        window.google?.accounts
          .oauth2

      if (!oauth) {
        throw new Error(
          'Google autorizacija nije dostupna.',
        )
      }

      const tokenClient =
        oauth.initTokenClient({
          client_id:
            googleClientId,
          scope: GOOGLE_SCOPE,
          callback: (
            response,
          ) => {
            setIsGoogleLoading(
              false,
            )

            if (
              response.error ||
              !response.access_token
            ) {
              setError(
                'Google povezivanje nije uspjelo.',
              )
              return
            }

            setGoogleAccessToken(
              response.access_token,
            )
            setMessage(
              'Google Kalendar je povezan.',
            )
          },
          error_callback: () => {
            setIsGoogleLoading(
              false,
            )
            setError(
              'Google prozor je zatvoren ili blokiran.',
            )
          },
        })

      tokenClient.requestAccessToken(
        {
          prompt: 'consent',
        },
      )
    } catch (connectError) {
      setIsGoogleLoading(false)
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Google povezivanje nije uspjelo.',
      )
    }
  }

  function disconnectGoogle() {
    if (
      googleAccessToken &&
      window.google?.accounts
        .oauth2
    ) {
      window.google.accounts.oauth2.revoke(
        googleAccessToken,
      )
    }

    setGoogleAccessToken('')
    setMessage(
      'Google Kalendar je odspojen.',
    )
  }

  async function importGoogle() {
    if (!googleAccessToken) {
      setError(
        'Prvo poveži Google Kalendar.',
      )
      return
    }

    setIsGoogleLoading(true)
    setError('')

    const timeMin =
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      ).toISOString()

    const timeMax =
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() +
          1,
        1,
      ).toISOString()

    const url =
      new URL(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      )

    url.searchParams.set(
      'timeMin',
      timeMin,
    )
    url.searchParams.set(
      'timeMax',
      timeMax,
    )
    url.searchParams.set(
      'singleEvents',
      'true',
    )
    url.searchParams.set(
      'orderBy',
      'startTime',
    )
    url.searchParams.set(
      'maxResults',
      '250',
    )

    try {
      const response =
        await fetch(url, {
          headers: {
            Authorization:
              `Bearer ${googleAccessToken}`,
          },
        })

      if (!response.ok) {
        throw new Error(
          'Google API greška.',
        )
      }

      const data =
        (await response.json()) as {
          items?:
            GoogleCalendarApiEvent[]
        }

      const imported =
        await Promise.all(
          (data.items ?? [])
            .filter(
              (event) =>
                event.id,
            )
            .map(
              async (event) =>
                saveGoogleImportedEvent(
                  {
                    googleEventId:
                      String(
                        event.id,
                      ),
                    title:
                      event.summary ??
                      'Google događaj',
                    customer: '',
                    date:
                      googleDate(
                        event.start
                          ?.date,
                        event.start
                          ?.dateTime,
                      ),
                    startTime:
                      googleTime(
                        event.start
                          ?.dateTime,
                        '08:00',
                      ),
                    endTime:
                      googleTime(
                        event.end
                          ?.dateTime,
                        '09:00',
                      ),
                    location:
                      event.location ??
                      '',
                    workers: '',
                    description:
                      event.description ??
                      '',
                    status:
                      'Zakazano',
                  },
                ),
            ),
        )

      await loadEvents()

      setMessage(
        `Uvezeno ili osvježeno: ${imported.length} Google događaja.`,
      )
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Uvoz iz Google Kalendara nije uspio.',
      )
    } finally {
      setIsGoogleLoading(false)
    }
  }

  async function sendToGoogle(
    calendarEvent:
      CalendarEvent,
  ) {
    if (!googleAccessToken) {
      setError(
        'Prvo poveži Google Kalendar.',
      )
      return
    }

    if (
      calendarEvent.googleEventId
    ) {
      setMessage(
        'Termin je već povezan s Google Kalendarom.',
      )
      return
    }

    setIsGoogleLoading(true)
    setError('')

    const startDateTime =
      new Date(
        `${calendarEvent.date}T${calendarEvent.startTime}:00`,
      ).toISOString()

    const endDateTime =
      new Date(
        `${calendarEvent.date}T${calendarEvent.endTime}:00`,
      ).toISOString()

    try {
      const response =
        await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${googleAccessToken}`,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(
              {
                summary:
                  calendarEvent.title,
                location:
                  calendarEvent.location,
                description: [
                  calendarEvent.customer
                    ? `Investitor: ${calendarEvent.customer}`
                    : '',
                  calendarEvent.workers
                    ? `Radnici: ${calendarEvent.workers}`
                    : '',
                  calendarEvent.description,
                ]
                  .filter(Boolean)
                  .join('\n'),
                start: {
                  dateTime:
                    startDateTime,
                  timeZone:
                    'Europe/Zagreb',
                },
                end: {
                  dateTime:
                    endDateTime,
                  timeZone:
                    'Europe/Zagreb',
                },
              },
            ),
          },
        )

      if (!response.ok) {
        throw new Error(
          'Google API greška.',
        )
      }

      const googleEvent =
        (await response.json()) as
          GoogleCalendarApiEvent

      const updated =
        await updateCalendarEvent(
          calendarEvent.id,
          {
            googleEventId:
              googleEvent.id ??
              '',
          },
        )

      setEvents((current) =>
        current.map(
          (event) =>
            event.id ===
            updated.id
              ? updated
              : event,
        ),
      )

      setMessage(
        'Termin je poslan u Google Kalendar.',
      )
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Slanje u Google Kalendar nije uspjelo.',
      )
    } finally {
      setIsGoogleLoading(false)
    }
  }

  if (isLoading) {
    return (
      <FersysLoader text="Učitavanje kalendara..." />
    )
  }

  const today =
    localDateString(
      new Date(),
    )

  return (
    <>
      <section className="mx-auto w-full max-w-[1700px] space-y-4 pb-6 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              ORGANIZACIJA POSLOVA
            </p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Kalendar
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Termini tvrtke, Google
              Kalendar i raspored radnika
              na jednom mjestu.
            </p>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <Metric
              label="Mjesec"
              value={`${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}.`}
            />
            <Metric
              label="Termini"
              value={String(
                events.length,
              )}
            />
            <Metric
              label="Google"
              value={
                googleAccessToken
                  ? 'Povezan'
                  : 'Nije povezan'
              }
            />
          </div>

          <div className="relative mt-4 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() =>
                void loadEvents()
              }
              className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-black text-slate-200 sm:inline-flex"
            >
              <RefreshCw
                size={17}
              />
              Osvježi
            </button>

            {googleAccessToken ? (
              <>
                <button
                  type="button"
                  disabled={
                    isGoogleLoading
                  }
                  onClick={() =>
                    void importGoogle()
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 text-sm font-black text-blue-300 disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={
                      isGoogleLoading
                        ? 'animate-spin'
                        : ''
                    }
                  />
                  Sinkroniziraj Google
                </button>

                <button
                  type="button"
                  onClick={
                    disconnectGoogle
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-black text-red-300"
                >
                  <Unlink
                    size={17}
                  />
                  Odspoji Google
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={
                  isGoogleLoading
                }
                onClick={() =>
                  void connectGoogle()
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 text-sm font-black text-blue-300 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Link2
                    size={17}
                  />
                )}
                Poveži Google Kalendar
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                openNew()
              }
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white sm:min-h-12"
            >
              <Plus size={19} />
              Novi termin
            </button>
          </div>
        </section>

        {message && (
          <Notice
            type="success"
            text={message}
            onClose={() =>
              setMessage('')
            }
          />
        )}

        {error && (
          <Notice
            type="error"
            text={error}
            onClose={() =>
              setError('')
            }
          />
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 p-3 sm:p-5">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={
                    previousMonth
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-slate-300"
                >
                  <ChevronLeft
                    size={19}
                  />
                </button>
                <button
                  type="button"
                  onClick={
                    nextMonth
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-slate-300"
                >
                  <ChevronRight
                    size={19}
                  />
                </button>

                <h2 className="ml-1 truncate text-base font-black text-white sm:text-xl">
                  {monthNames[
                    currentMonth.getMonth()
                  ]}{' '}
                  {currentMonth.getFullYear()}.
                </h2>
              </div>

              <button
                type="button"
                onClick={goToday}
                className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-slate-300"
              >
                Danas
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
              {weekDays.map(
                (day) => (
                  <div
                    key={day}
                    className="px-1 py-2 text-center text-[9px] font-black uppercase tracking-wider text-slate-500 sm:py-3 sm:text-xs"
                  >
                    {day}
                  </div>
                ),
              )}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map(
                (day) => {
                  const dayEvents =
                    events
                      .filter(
                        (event) =>
                          event.date ===
                          day.dateString,
                      )
                      .sort(
                        (a, b) =>
                          a.startTime.localeCompare(
                            b.startTime,
                          ),
                      )

                  const isToday =
                    day.dateString ===
                    today
                  const isSelected =
                    day.dateString ===
                    selectedDate

                  return (
                    <button
                      key={
                        day.dateString
                      }
                      type="button"
                      onClick={() =>
                        setSelectedDate(
                          day.dateString,
                        )
                      }
                      onDoubleClick={() =>
                        openNew(
                          day.dateString,
                        )
                      }
                      className={`min-h-[72px] border-b border-r border-slate-800 p-1 text-left sm:min-h-32 sm:p-2 ${
                        day.isCurrentMonth
                          ? 'bg-slate-900'
                          : 'bg-slate-950/45'
                      } ${
                        isSelected
                          ? 'ring-2 ring-inset ring-violet-500'
                          : ''
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black sm:h-8 sm:w-8 ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : day.isCurrentMonth
                              ? 'text-slate-300'
                              : 'text-slate-600'
                        }`}
                      >
                        {day.date.getDate()}
                      </span>

                      <div className="mt-1 space-y-1 sm:mt-2">
                        {dayEvents
                          .slice(0, 1)
                          .map(
                            (
                              calendarEvent,
                            ) => (
                              <div
                                key={
                                  calendarEvent.id
                                }
                                className={`truncate rounded-md px-1 py-1 text-[9px] font-bold sm:px-2 sm:text-[11px] ${statusClass(
                                  calendarEvent.status,
                                )}`}
                              >
                                {
                                  calendarEvent.startTime
                                }{' '}
                                {
                                  calendarEvent.title
                                }
                              </div>
                            ),
                          )}

                        {dayEvents.length >
                          1 && (
                          <p className="px-1 text-[9px] font-bold text-slate-500">
                            +
                            {dayEvents.length -
                              1}{' '}
                            još
                          </p>
                        )}
                      </div>
                    </button>
                  )
                },
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-400">
                  ODABRANI DAN
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  {new Date(
                    `${selectedDate}T12:00:00`,
                  ).toLocaleDateString(
                    'hr-HR',
                    {
                      weekday:
                        'long',
                      day: 'numeric',
                      month: 'long',
                    },
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  openNew(
                    selectedDate,
                  )
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"
              >
                <Plus size={19} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedEvents.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
                  <CalendarDays
                    size={32}
                    className="mx-auto text-slate-600"
                  />
                  <p className="mt-3 font-black text-slate-300">
                    Nema termina
                  </p>
                </div>
              ) : (
                selectedEvents.map(
                  (
                    calendarEvent,
                  ) => (
                    <article
                      key={
                        calendarEvent.id
                      }
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-blue-400">
                            {
                              calendarEvent.startTime
                            }{' '}
                            –{' '}
                            {
                              calendarEvent.endTime
                            }
                          </p>
                          <h3 className="mt-1 break-words font-black text-white">
                            {
                              calendarEvent.title
                            }
                          </h3>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${statusClass(
                            calendarEvent.status,
                          )}`}
                        >
                          {
                            calendarEvent.status
                          }
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs text-slate-400">
                        {calendarEvent.customer && (
                          <InfoLine
                            icon={
                              <UserRound
                                size={14}
                              />
                            }
                            text={
                              calendarEvent.customer
                            }
                          />
                        )}
                        {calendarEvent.location && (
                          <InfoLine
                            icon={
                              <MapPin
                                size={14}
                              />
                            }
                            text={
                              calendarEvent.location
                            }
                          />
                        )}
                        {calendarEvent.workers && (
                          <InfoLine
                            icon={
                              <Users
                                size={14}
                              />
                            }
                            text={
                              calendarEvent.workers
                            }
                          />
                        )}
                        <InfoLine
                          icon={
                            <Clock3
                              size={14}
                            />
                          }
                          text={`${calendarEvent.startTime} – ${calendarEvent.endTime}`}
                        />
                      </div>

                      {calendarEvent.description && (
                        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                          {
                            calendarEvent.description
                          }
                        </p>
                      )}

                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <button
                          type="button"
                          disabled={
                            !googleAccessToken ||
                            Boolean(
                              calendarEvent.googleEventId,
                            )
                          }
                          onClick={() =>
                            void sendToGoogle(
                              calendarEvent,
                            )
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-500/10 px-3 text-xs font-black text-blue-300 disabled:opacity-35"
                        >
                          <ExternalLink
                            size={14}
                          />
                          {calendarEvent.googleEventId
                            ? 'Na Googleu'
                            : 'Pošalji na Google'}
                        </button>

                        <button
                          type="button"
                          disabled={
                            isSaving
                          }
                          onClick={() =>
                            void removeEvent(
                              calendarEvent.id,
                            )
                          }
                          className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-300 disabled:opacity-50"
                        >
                          <Trash2
                            size={15}
                          />
                        </button>
                      </div>
                    </article>
                  ),
                )
              )}
            </div>
          </aside>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-end bg-black/75 pt-[var(--fersys-safe-top)] backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Novi termin"
        >
          <div className="flex max-h-[calc(100dvh-var(--fersys-safe-top))] w-full flex-col overflow-hidden rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[94dvh] sm:max-w-2xl sm:rounded-3xl sm:border">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                  NOVI TERMIN
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  Dodaj u kalendar
                </h2>
              </div>

              <button
                type="button"
                disabled={
                  isSaving
                }
                onClick={() =>
                  setIsModalOpen(
                    false,
                  )
                }
                className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-400 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={saveEvent}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <Field label="Naziv termina *">
                  <input
                    value={form.title}
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          title:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Servis klima uređaja"
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none focus:border-violet-500"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Investitor">
                    <input
                      value={
                        form.customer
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            customer:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="Ime ili naziv"
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none focus:border-violet-500"
                    />
                  </Field>

                  <Field label="Datum">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            date:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none [color-scheme:dark] focus:border-violet-500"
                    />
                  </Field>

                  <Field label="Početak">
                    <input
                      type="time"
                      value={
                        form.startTime
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            startTime:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none [color-scheme:dark] focus:border-violet-500"
                    />
                  </Field>

                  <Field label="Završetak">
                    <input
                      type="time"
                      value={
                        form.endTime
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            endTime:
                              event.target
                                .value,
                          }),
                        )
                      }
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none [color-scheme:dark] focus:border-violet-500"
                    />
                  </Field>

                  <Field label="Lokacija">
                    <input
                      value={
                        form.location
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            location:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="Adresa ili mjesto"
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none focus:border-violet-500"
                    />
                  </Field>

                  <Field label="Radnici">
                    <input
                      value={
                        form.workers
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (current) => ({
                            ...current,
                            workers:
                              event.target
                                .value,
                          }),
                        )
                      }
                      placeholder="Borna, Dinko..."
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none focus:border-violet-500"
                    />
                  </Field>
                </div>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          status:
                            event.target
                              .value as CalendarStatus,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-white outline-none focus:border-violet-500"
                  >
                    <option value="Zakazano">
                      Zakazano
                    </option>
                    <option value="U tijeku">
                      U tijeku
                    </option>
                    <option value="Završeno">
                      Završeno
                    </option>
                    <option value="Otkazano">
                      Otkazano
                    </option>
                  </select>
                </Field>

                <Field label="Opis">
                  <textarea
                    rows={4}
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Opis radova, napomena ili materijal..."
                    className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-violet-500"
                  />
                </Field>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-300">
                    {error}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-800 bg-slate-900/98 p-3 pb-[max(0.75rem,var(--fersys-safe-bottom))] sm:flex sm:justify-end sm:gap-3 sm:p-5">
                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    setIsModalOpen(
                      false,
                    )
                  }
                  className="hidden min-h-12 rounded-2xl bg-slate-800 px-5 font-black text-slate-300 disabled:opacity-50 sm:inline-flex sm:items-center"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 font-black text-white disabled:opacity-50 sm:w-auto"
                >
                  {isSaving && (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  )}
                  {isSaving
                    ? 'Spremanje...'
                    : 'Spremi termin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSaving &&
        !isModalOpen && (
          <FersysLoader
            fullScreen
            text="Spremanje promjena..."
          />
        )}
    </>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.035] px-3 py-3">
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-white">
        {value}
      </p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-300">
        {label}
      </span>
      <div className="mt-2">
        {children}
      </div>
    </label>
  )
}

function InfoLine({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string
}) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-slate-500">
        {icon}
      </span>
      <span className="break-words">
        {text}
      </span>
    </p>
  )
}

function Notice({
  type,
  text,
  onClose,
}: {
  type: 'success' | 'error'
  text: string
  onClose: () => void
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
        type === 'success'
          ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
          : 'border-red-500/20 bg-red-500/10 text-red-300'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        {type === 'error' && (
          <CircleAlert
            size={17}
            className="mt-0.5 shrink-0"
          />
        )}
        <span className="break-words">
          {text}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0"
      >
        <X size={17} />
      </button>
    </div>
  )
}

export default CalendarPage
