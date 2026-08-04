import { supabase } from '../lib/supabase'

export type CalendarStatus =
  | 'Zakazano'
  | 'U tijeku'
  | 'Završeno'
  | 'Otkazano'

export type CalendarSource =
  | 'manual'
  | 'ai'
  | 'work_order'
  | 'google'

export type CalendarEvent = {
  id: string
  companyId: string
  createdBy: string
  customerId: string
  title: string
  customer: string
  date: string
  startTime: string
  endTime: string
  location: string
  workers: string
  description: string
  status: CalendarStatus
  source: CalendarSource
  googleEventId: string
  createdAt: string
  updatedAt: string
}

export type CreateCalendarEventInput = {
  customerId?: string
  title: string
  customer?: string
  date: string
  startTime: string
  endTime: string
  location?: string
  workers?: string
  description?: string
  status?: CalendarStatus
  source?: CalendarSource
  googleEventId?: string
}

type CalendarEventRow = {
  id: string
  company_id: string
  created_by: string | null
  customer_id: string | null
  title: string
  customer_name: string | null
  event_date: string
  start_time: string
  end_time: string
  location: string | null
  workers: string | null
  description: string | null
  status: CalendarStatus
  source: CalendarSource
  google_event_id: string | null
  created_at: string
  updated_at: string
}

function mapCalendarEvent(
  row: CalendarEventRow,
): CalendarEvent {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by ?? '',
    customerId: row.customer_id ?? '',
    title: row.title,
    customer: row.customer_name ?? '',
    date: row.event_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    location: row.location ?? '',
    workers: row.workers ?? '',
    description: row.description ?? '',
    status: row.status,
    source: row.source,
    googleEventId:
      row.google_event_id ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getCurrentCompanyId() {
  const { data, error } = await supabase.rpc(
    'current_company_id',
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Prijavljeni korisnik nije povezan s tvrtkom.',
    )
  }

  return String(data)
}

export async function getCalendarEvents(
  dateFrom?: string,
  dateTo?: string,
): Promise<CalendarEvent[]> {
  let query = supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', {
      ascending: true,
    })
    .order('start_time', {
      ascending: true,
    })

  if (dateFrom) {
    query = query.gte(
      'event_date',
      dateFrom,
    )
  }

  if (dateTo) {
    query = query.lte(
      'event_date',
      dateTo,
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (
    (data ?? []) as CalendarEventRow[]
  ).map(mapCalendarEvent)
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  if (!input.title.trim()) {
    throw new Error(
      'Naziv termina je obavezan.',
    )
  }

  if (!input.date) {
    throw new Error(
      'Datum termina je obavezan.',
    )
  }

  if (
    !input.startTime ||
    !input.endTime ||
    input.endTime <= input.startTime
  ) {
    throw new Error(
      'Vrijeme završetka mora biti nakon početka.',
    )
  }

  const companyId =
    await getCurrentCompanyId()

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      company_id: companyId,
      created_by: user?.id ?? null,
      customer_id:
        input.customerId || null,
      title: input.title.trim(),
      customer_name:
        input.customer?.trim() || null,
      event_date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      location:
        input.location?.trim() || null,
      workers:
        input.workers?.trim() || null,
      description:
        input.description?.trim() || null,
      status:
        input.status ?? 'Zakazano',
      source:
        input.source ?? 'manual',
      google_event_id:
        input.googleEventId || null,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapCalendarEvent(
    data as CalendarEventRow,
  )
}

export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CreateCalendarEventInput>,
): Promise<CalendarEvent> {
  const payload: Record<string, unknown> =
    {}

  if (updates.customerId !== undefined) {
    payload.customer_id =
      updates.customerId || null
  }

  if (updates.title !== undefined) {
    payload.title = updates.title.trim()
  }

  if (updates.customer !== undefined) {
    payload.customer_name =
      updates.customer.trim() || null
  }

  if (updates.date !== undefined) {
    payload.event_date = updates.date
  }

  if (
    updates.startTime !== undefined
  ) {
    payload.start_time =
      updates.startTime
  }

  if (
    updates.endTime !== undefined
  ) {
    payload.end_time = updates.endTime
  }

  if (updates.location !== undefined) {
    payload.location =
      updates.location.trim() || null
  }

  if (updates.workers !== undefined) {
    payload.workers =
      updates.workers.trim() || null
  }

  if (
    updates.description !== undefined
  ) {
    payload.description =
      updates.description.trim() || null
  }

  if (updates.status !== undefined) {
    payload.status = updates.status
  }

  if (updates.source !== undefined) {
    payload.source = updates.source
  }

  if (
    updates.googleEventId !== undefined
  ) {
    payload.google_event_id =
      updates.googleEventId || null
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update(payload)
    .eq('id', eventId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapCalendarEvent(
    data as CalendarEventRow,
  )
}

export async function deleteCalendarEvent(
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) {
    throw error
  }
}

export async function hasCalendarConflict(
  date: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string,
): Promise<CalendarEvent | null> {
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('event_date', date)
    .neq('status', 'Otkazano')
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1)

  if (excludeEventId) {
    query = query.neq(
      'id',
      excludeEventId,
    )
  }

  const { data, error } =
    await query.maybeSingle()

  if (error) {
    throw error
  }

  return data
    ? mapCalendarEvent(
        data as CalendarEventRow,
      )
    : null
}

export async function saveGoogleImportedEvent(
  input: CreateCalendarEventInput & {
    googleEventId: string
  },
): Promise<CalendarEvent> {
  const { data: existing, error } =
    await supabase
      .from('calendar_events')
      .select('*')
      .eq(
        'google_event_id',
        input.googleEventId,
      )
      .maybeSingle()

  if (error) {
    throw error
  }

  if (existing) {
    return updateCalendarEvent(
      String(existing.id),
      {
        ...input,
        source: 'google',
      },
    )
  }

  return createCalendarEvent({
    ...input,
    source: 'google',
  })
}
