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

function getLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createEmptyForm(): EventForm {
  return {
    title: '',
    customer: '',
    date: getLocalDateString(new Date()),
    startTime: '08:00',
    endTime: '09:00',
    location: '',
    workers: '',
    description: '',
    status: 'Zakazano',
  }
}

function getMonthRange(date: Date) {
  const first = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  )

  const last = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  )

  const calendarStart =
    new Date(first)

  const mondayIndex =
    (first.getDay() + 6) % 7

  calendarStart.setDate(
    first.getDate() - mondayIndex,
  )

  const calendarEnd =
    new Date(calendarStart)

  calendarEnd.setDate(
    calendarStart.getDate() + 41,
  )

  return {
    from:
      getLocalDateString(
        calendarStart,
      ),
    to:
      getLocalDateString(
        calendarEnd,
      ),
    monthLast:
      getLocalDateString(last),
  }
}

function loadGoogleScript() {
  return new Promise<void>(
    (resolve, reject) => {
      if (
        window.google?.accounts?.oauth2
      ) {
        resolve()
        return
      }

      const existingScript =
        document.querySelector(
          'script[data-google-identity]',
        )

      if (existingScript) {
        existingScript.addEventListener(
          'load',
          () => resolve(),
        )
        existingScript.addEventListener(
          'error',
          () => reject(),
        )
        return
      }

      const script =
        document.createElement('script')

      script.src =
        'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity =
        'true'
      script.onload = () => resolve()
      script.onerror = () =>
        reject(
          new Error(
            'Google skripta se nije učitala.',
          ),
        )

      document.head.appendChild(script)
    },
  )
}

function formatTimeFromGoogle(
  dateTime?: string,
) {
  if (!dateTime) {
    return '08:00'
  }

  const date = new Date(dateTime)

  return `${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function formatDateFromGoogle(
  date?: string,
  dateTime?: string,
) {
  if (date) {
    return date
  }

  if (dateTime) {
    return getLocalDateString(
      new Date(dateTime),
    )
  }

  return getLocalDateString(
    new Date(),
  )
}

function getStatusClassName(
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

  const [currentMonth, setCurrentMonth] =
    useState(new Date())

  const [selectedDate, setSelectedDate] =
    useState(
      getLocalDateString(new Date()),
    )

  const [isModalOpen, setIsModalOpen] =
    useState(false)

  const [form, setForm] =
    useState<EventForm>(
      createEmptyForm(),
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
        getMonthRange(currentMonth)

      const loadedEvents =
        await getCalendarEvents(
          range.from,
          range.to,
        )

      setEvents(loadedEvents)
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

  const monthDays = useMemo(() => {
    const year =
      currentMonth.getFullYear()

    const month =
      currentMonth.getMonth()

    const firstDay =
      new Date(year, month, 1)

    const lastDay =
      new Date(
        year,
        month + 1,
        0,
      )

    const mondayIndex =
      (firstDay.getDay() + 6) % 7

    const days: Array<{
      date: Date
      dateString: string
      isCurrentMonth: boolean
    }> = []

    for (
      let index = mondayIndex;
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
          getLocalDateString(date),
        isCurrentMonth: false,
      })
    }

    for (
      let day = 1;
      day <= lastDay.getDate();
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
          getLocalDateString(date),
        isCurrentMonth: true,
      })
    }

    while (days.length < 42) {
      const lastDate =
        days[days.length - 1].date

      const nextDate =
        new Date(lastDate)

      nextDate.setDate(
        nextDate.getDate() + 1,
      )

      days.push({
        date: nextDate,
        dateString:
          getLocalDateString(nextDate),
        isCurrentMonth: false,
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
            (first, second) =>
              first.startTime.localeCompare(
                second.startTime,
              ),
          ),
      [
        events,
        selectedDate,
      ],
    )

  function previousMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1,
      ),
    )
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      ),
    )
  }

  function goToToday() {
    const today = new Date()

    setCurrentMonth(today)
    setSelectedDate(
      getLocalDateString(today),
    )
  }

  function openNewEvent(
    date = selectedDate,
  ) {
    setForm({
      ...createEmptyForm(),
      date,
    })

    setSelectedDate(date)
    setMessage('')
    setError('')
    setIsModalOpen(true)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
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

      const savedEvent =
        await createCalendarEvent({
          title: form.title,
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
          status: form.status,
          source: 'manual',
        })

      setEvents((current) =>
        [...current, savedEvent].sort(
          (first, second) =>
            `${first.date} ${first.startTime}`.localeCompare(
              `${second.date} ${second.startTime}`,
            ),
        ),
      )

      setSelectedDate(form.date)
      setIsModalOpen(false)
      setMessage(
        'Termin je spremljen u Supabase.',
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

  async function deleteEvent(
    eventId: string,
  ) {
    const confirmed =
      window.confirm(
        'Želiš li obrisati ovaj termin?',
      )

    if (!confirmed) {
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

  async function connectGoogleCalendar() {
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

      if (
        !window.google?.accounts
          .oauth2
      ) {
        throw new Error(
          'Google autorizacija nije dostupna.',
        )
      }

      const tokenClient =
        window.google.accounts.oauth2.initTokenClient(
          {
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
                'Google Kalendar je uspješno povezan.',
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
          },
        )

      tokenClient.requestAccessToken(
        {
          prompt: 'consent',
        },
      )
    } catch {
      setIsGoogleLoading(false)
      setError(
        'Nije moguće pokrenuti Google povezivanje.',
      )
    }
  }

  function disconnectGoogleCalendar() {
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

  async function importFromGoogle() {
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
        currentMonth.getMonth() + 1,
        1,
      ).toISOString()

    const url = new URL(
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
          items?: GoogleCalendarApiEvent[]
        }

      const imported =
        await Promise.all(
          (data.items ?? [])
            .filter(
              (googleEvent) =>
                googleEvent.id,
            )
            .map(
              async (
                googleEvent,
              ) =>
                saveGoogleImportedEvent(
                  {
                    googleEventId:
                      String(
                        googleEvent.id,
                      ),
                    title:
                      googleEvent.summary ??
                      'Google događaj',
                    customer: '',
                    date:
                      formatDateFromGoogle(
                        googleEvent.start
                          ?.date,
                        googleEvent.start
                          ?.dateTime,
                      ),
                    startTime:
                      formatTimeFromGoogle(
                        googleEvent.start
                          ?.dateTime,
                      ),
                    endTime:
                      formatTimeFromGoogle(
                        googleEvent.end
                          ?.dateTime,
                      ),
                    location:
                      googleEvent.location ??
                      '',
                    workers: '',
                    description:
                      googleEvent.description ??
                      '',
                    status:
                      'Zakazano',
                  },
                ),
            ),
        )

      await loadEvents()

      setMessage(
        `Uvezeno ili osvježeno je ${imported.length} događaja iz Google Kalendara.`,
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

  async function sendEventToGoogle(
    calendarEvent: CalendarEvent,
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
        'Ovaj termin je već povezan s Google Kalendarom.',
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
            body: JSON.stringify({
              summary:
                calendarEvent.title,
              location:
                calendarEvent.location,
              description: [
                calendarEvent.customer
                  ? `Kupac: ${calendarEvent.customer}`
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
            }),
          },
        )

      if (!response.ok) {
        throw new Error(
          'Google API greška.',
        )
      }

      const googleEvent =
        (await response.json()) as GoogleCalendarApiEvent

      const updated =
        await updateCalendarEvent(
          calendarEvent.id,
          {
            googleEventId:
              googleEvent.id ?? '',
          },
        )

      setEvents((current) =>
        current.map((event) =>
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

  return (
    <section className="mx-auto w-full max-w-[1700px] space-y-4 pb-10 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              ORGANIZACIJA POSLOVA
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Kalendar
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Termini tvrtke, Google Kalendar i raspored radnika na jednom mjestu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openNewEvent()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white active:scale-95 sm:hidden"
            aria-label="Novi termin"
          >
            <Plus size={21} />
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <HeroMetric label="Mjesec" value={`${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}.`} />
          <HeroMetric label="Termini" value={String(events.length)} />
          <HeroMetric label="Google" value={googleAccessToken ? 'Povezan' : 'Nije povezan'} />
        </div>

        <div className="relative mt-4 hidden flex-wrap gap-2 sm:flex">
          <button
            type="button"
            onClick={() =>
              void loadEvents()
            }
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
          >
            <RefreshCw size={18} />
            Osvježi
          </button>

          {googleAccessToken ? (
            <>
              <button
                type="button"
                onClick={() =>
                  void importFromGoogle()
                }
                disabled={
                  isGoogleLoading
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
              >
                <RefreshCw
                  size={18}
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
                  disconnectGoogleCalendar
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500/20"
              >
                <Unlink size={18} />
                Odspoji Google
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                void connectGoogleCalendar()
              }
              disabled={
                isGoogleLoading
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Link2 size={18} />
              )}

              Poveži Google Kalendar
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              openNewEvent()
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.02]"
          >
            <Plus size={18} />
            Novi termin
          </button>
        </div>
      </section>

      {message && (
        <div className="flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
          <span>{message}</span>

          <button
            type="button"
            onClick={() =>
              setMessage('')
            }
            className="text-blue-300 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <div className="flex items-start gap-3">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-3 sm:p-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={
                  previousMonth
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>

              <h2 className="ml-1 min-w-0 truncate text-base font-black text-white sm:text-xl">
                {
                  monthNames[
                    currentMonth.getMonth()
                  ]
                }{' '}
                {currentMonth.getFullYear()}.
              </h2>
            </div>

            <button
              type="button"
              onClick={goToToday}
              className="shrink-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300"
            >
              Danas
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-1 py-2 text-center text-[9px] font-black uppercase tracking-wider text-slate-500 sm:px-2 sm:py-3 sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayEvents =
                events
                  .filter(
                    (event) =>
                      event.date ===
                      day.dateString,
                  )
                  .sort(
                    (
                      first,
                      second,
                    ) =>
                      first.startTime.localeCompare(
                        second.startTime,
                      ),
                  )

              const isToday =
                day.dateString ===
                getLocalDateString(
                  new Date(),
                )

              const isSelected =
                day.dateString ===
                selectedDate

              return (
                <button
                  key={day.dateString}
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      day.dateString,
                    )
                  }
                  onDoubleClick={() =>
                    openNewEvent(
                      day.dateString,
                    )
                  }
                  className={`min-h-[72px] border-b border-r border-slate-800 p-1 text-left transition sm:min-h-32 sm:p-2 ${
                    day.isCurrentMonth
                      ? 'bg-slate-900'
                      : 'bg-slate-950/50'
                  } ${
                    isSelected
                      ? 'ring-2 ring-inset ring-blue-500'
                      : 'hover:bg-slate-800/70'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm ${
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
                            className={`truncate rounded-md px-1.5 py-1 text-[9px] font-semibold sm:px-2 sm:text-[11px] ${getStatusClassName(
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
                      <p className="px-1 text-[9px] font-semibold text-slate-500 sm:text-[10px]">
                        +
                        {dayEvents.length -
                          1}{' '}
                        još
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-400">
                Odabrani dan
              </p>

              <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
                {new Date(
                  `${selectedDate}T12:00:00`,
                ).toLocaleDateString(
                  'hr-HR',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  },
                )}
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                openNewEvent(
                  selectedDate,
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
            {selectedEvents.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
                <CalendarDays
                  size={38}
                  className="mx-auto text-slate-600"
                />

                <p className="mt-4 font-semibold text-slate-300">
                  Nema termina
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Dodaj prvi termin za ovaj dan.
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
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-blue-400">
                          {
                            calendarEvent.startTime
                          }{' '}
                          –{' '}
                          {
                            calendarEvent.endTime
                          }
                        </p>

                        <h3 className="mt-1 font-bold text-white">
                          {
                            calendarEvent.title
                          }
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClassName(
                          calendarEvent.status,
                        )}`}
                      >
                        {
                          calendarEvent.status
                        }
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-400">
                      {calendarEvent.customer && (
                        <p className="flex items-center gap-2">
                          <UserRound
                            size={15}
                          />
                          {
                            calendarEvent.customer
                          }
                        </p>
                      )}

                      {calendarEvent.location && (
                        <p className="flex items-center gap-2">
                          <MapPin
                            size={15}
                          />
                          {
                            calendarEvent.location
                          }
                        </p>
                      )}

                      {calendarEvent.workers && (
                        <p className="flex items-center gap-2">
                          <Users
                            size={15}
                          />
                          {
                            calendarEvent.workers
                          }
                        </p>
                      )}

                      <p className="flex items-center gap-2">
                        <Clock3
                          size={15}
                        />
                        {
                          calendarEvent.startTime
                        }{' '}
                        –{' '}
                        {
                          calendarEvent.endTime
                        }
                      </p>
                    </div>

                    {calendarEvent.description && (
                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        {
                          calendarEvent.description
                        }
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void sendEventToGoogle(
                            calendarEvent,
                          )
                        }
                        disabled={
                          !googleAccessToken ||
                          Boolean(
                            calendarEvent.googleEventId,
                          )
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ExternalLink
                          size={15}
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
                          void deleteEvent(
                            calendarEvent.id,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2
                          size={16}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:border">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-sm font-semibold text-violet-400">
                  Novi unos
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Dodaj termin
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
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-6"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Naziv termina *
                </span>

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Primjer: Servis klima uređaja"
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Kupac
                  </span>

                  <input
                    type="text"
                    value={
                      form.customer
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          customer:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Ime kupca ili tvrtke"
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Datum
                  </span>

                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          date:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Početak
                  </span>

                  <input
                    type="time"
                    value={
                      form.startTime
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          startTime:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Završetak
                  </span>

                  <input
                    type="time"
                    value={
                      form.endTime
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          endTime:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Lokacija
                  </span>

                  <input
                    type="text"
                    value={
                      form.location
                    }
                    onChange={(event) =>
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
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-300">
                    Radnici
                  </span>

                  <input
                    type="text"
                    value={
                      form.workers
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          workers:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Ime radnika"
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        status:
                          event.target
                            .value as CalendarStatus,
                      }),
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-white outline-none focus:border-blue-500"
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
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">
                  Opis
                </span>

                <textarea
                  rows={4}
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Napomena, opis radova ili potrebni materijal..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
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
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                >
                  Odustani
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 font-bold text-white transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {isSaving && (
                    <LoaderCircle
                      size={18}
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <button
          type="button"
          onClick={() => openNewEvent()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-black text-white"
        >
          <Plus size={18} />
          Novi termin
        </button>
      </div>

      {isSaving && !isModalOpen && (
        <FersysLoader
          fullScreen
          text="Spremanje promjena..."
        />
      )}
    </section>
  )
}

function HeroMetric({
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
