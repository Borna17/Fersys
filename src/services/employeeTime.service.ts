import * as XLSX from 'xlsx'

import { supabase } from '../lib/supabase'
import { getEmployees, type CompanyEmployee } from './employees.service'

export type WorkforcePerson = {
  id: string
  companyId: string
  membershipId: string
  fullName: string
  employeeCode: string
  employmentType: 'employee' | 'contractor' | 'temporary' | 'other'
  hourlyRate: number | null
  monthlySalary: number | null
  targetMonthlyHours: number | null
  note: string
  isActive: boolean
}

export type EmployeeTimeEntry = {
  id: string
  companyId: string
  workerId: string
  workOrderId: string
  workDate: string
  startTime: string
  endTime: string
  breakMinutes: number
  regularHours: number
  overtimeHours: number
  nightHours: number
  sundayHours: number
  holidayHours: number
  vacationHours: number
  sickLeaveHours: number
  paidLeaveHours: number
  travelHours: number
  note: string
  source: 'manual' | 'ai' | 'work_order' | 'timer' | 'import'
  sourceRef: string
}

export type SaveTimeEntryInput = Omit<EmployeeTimeEntry, 'id' | 'companyId'> & { id?: string }

async function currentCompanyId() {
  const { data, error } = await supabase.rpc('current_company_id')
  if (error) throw error
  if (!data) throw new Error('Aktivna tvrtka nije pronađena.')
  return String(data)
}

function n(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapWorker(row: any): WorkforcePerson {
  return {
    id: String(row.id), companyId: String(row.company_id), membershipId: row.membership_id ?? '',
    fullName: row.full_name ?? '', employeeCode: row.employee_code ?? '', employmentType: row.employment_type ?? 'employee',
    hourlyRate: row.hourly_rate == null ? null : n(row.hourly_rate), monthlySalary: row.monthly_salary == null ? null : n(row.monthly_salary),
    targetMonthlyHours: row.target_monthly_hours == null ? null : n(row.target_monthly_hours), note: row.note ?? '', isActive: row.is_active !== false,
  }
}

function mapEntry(row: any): EmployeeTimeEntry {
  return {
    id: String(row.id), companyId: String(row.company_id), workerId: String(row.worker_id), workOrderId: row.work_order_id ?? '',
    workDate: row.work_date, startTime: row.start_time?.slice(0, 5) ?? '', endTime: row.end_time?.slice(0, 5) ?? '',
    breakMinutes: n(row.break_minutes), regularHours: n(row.regular_hours), overtimeHours: n(row.overtime_hours), nightHours: n(row.night_hours),
    sundayHours: n(row.sunday_hours), holidayHours: n(row.holiday_hours), vacationHours: n(row.vacation_hours), sickLeaveHours: n(row.sick_leave_hours),
    paidLeaveHours: n(row.paid_leave_hours), travelHours: n(row.travel_hours), note: row.note ?? '', source: row.source ?? 'manual', sourceRef: row.source_ref ?? '',
  }
}

export async function getWorkforcePeople() {
  const companyId = await currentCompanyId()
  const { data, error } = await supabase.from('workforce_people').select('*').eq('company_id', companyId).order('is_active', { ascending: false }).order('full_name')
  if (error) throw error
  return (data ?? []).map(mapWorker)
}

export async function syncAppEmployees(employees: CompanyEmployee[]) {
  const companyId = await currentCompanyId()
  const active = employees.filter((employee) => employee.status === 'active' && employee.role !== 'viewer')
  if (!active.length) return getWorkforcePeople()
  const rows = active.map((employee) => ({ company_id: companyId, membership_id: employee.membershipId, full_name: employee.fullName, is_active: true }))
  const { error } = await supabase.from('workforce_people').upsert(rows, { onConflict: 'company_id,membership_id', ignoreDuplicates: false })
  if (error) throw error
  return getWorkforcePeople()
}

export async function createExternalWorker(input: { fullName: string; employeeCode?: string; hourlyRate?: number | null; monthlySalary?: number | null; targetMonthlyHours?: number | null; note?: string }) {
  const companyId = await currentCompanyId()
  const fullName = input.fullName.trim()
  if (!fullName) throw new Error('Ime radnika je obavezno.')
  const { data, error } = await supabase.from('workforce_people').insert({
    company_id: companyId, full_name: fullName, employee_code: input.employeeCode?.trim() || null,
    hourly_rate: input.hourlyRate ?? null, monthly_salary: input.monthlySalary ?? null, target_monthly_hours: input.targetMonthlyHours ?? null,
    note: input.note?.trim() || null, created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  }).select('*').single()
  if (error) throw error
  return mapWorker(data)
}

export async function updateWorkforcePerson(id: string, patch: Partial<Pick<WorkforcePerson, 'fullName' | 'employeeCode' | 'hourlyRate' | 'monthlySalary' | 'targetMonthlyHours' | 'note' | 'isActive'>>) {
  const companyId = await currentCompanyId()
  const values: Record<string, unknown> = {}
  if (patch.fullName !== undefined) values.full_name = patch.fullName.trim()
  if (patch.employeeCode !== undefined) values.employee_code = patch.employeeCode.trim() || null
  if (patch.hourlyRate !== undefined) values.hourly_rate = patch.hourlyRate
  if (patch.monthlySalary !== undefined) values.monthly_salary = patch.monthlySalary
  if (patch.targetMonthlyHours !== undefined) values.target_monthly_hours = patch.targetMonthlyHours
  if (patch.note !== undefined) values.note = patch.note.trim() || null
  if (patch.isActive !== undefined) values.is_active = patch.isActive
  const { error } = await supabase.from('workforce_people').update(values).eq('id', id).eq('company_id', companyId)
  if (error) throw error
}

export async function getEmployeeTimeEntries(year: number, month: number) {
  const companyId = await currentCompanyId()
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  const { data, error } = await supabase.from('employee_time_entries').select('*').eq('company_id', companyId).gte('work_date', from).lt('work_date', next).order('work_date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapEntry)
}

export async function saveEmployeeTimeEntry(input: SaveTimeEntryInput) {
  const companyId = await currentCompanyId()
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  const row = {
    company_id: companyId, worker_id: input.workerId, work_order_id: input.workOrderId || null, work_date: input.workDate,
    start_time: input.startTime || null, end_time: input.endTime || null, break_minutes: Math.max(0, input.breakMinutes || 0),
    regular_hours: Math.max(0, input.regularHours || 0), overtime_hours: Math.max(0, input.overtimeHours || 0), night_hours: Math.max(0, input.nightHours || 0),
    sunday_hours: Math.max(0, input.sundayHours || 0), holiday_hours: Math.max(0, input.holidayHours || 0), vacation_hours: Math.max(0, input.vacationHours || 0),
    sick_leave_hours: Math.max(0, input.sickLeaveHours || 0), paid_leave_hours: Math.max(0, input.paidLeaveHours || 0), travel_hours: Math.max(0, input.travelHours || 0),
    note: input.note?.trim() || null, source: input.source || 'manual', source_ref: input.sourceRef || null, created_by: userId,
  }
  if (input.id) {
    const { data, error } = await supabase.from('employee_time_entries').update(row).eq('id', input.id).eq('company_id', companyId).select('*').single()
    if (error) throw error
    return mapEntry(data)
  }
  if (row.source_ref) {
    const { data, error } = await supabase.from('employee_time_entries').upsert(row, { onConflict: 'company_id,worker_id,source,source_ref' }).select('*').single()
    if (error) throw error
    return mapEntry(data)
  }
  const { data, error } = await supabase.from('employee_time_entries').insert(row).select('*').single()
  if (error) throw error
  return mapEntry(data)
}

export async function deleteEmployeeTimeEntry(id: string) {
  const companyId = await currentCompanyId()
  const { error } = await supabase.from('employee_time_entries').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
}

export function summarizeWorker(worker: WorkforcePerson, entries: EmployeeTimeEntry[]) {
  const own = entries.filter((entry) => entry.workerId === worker.id)
  const sum = (key: keyof EmployeeTimeEntry) => own.reduce((total, entry) => total + n(entry[key]), 0)
  const regular = sum('regularHours')
  const overtime = sum('overtimeHours')
  const recorded = regular + overtime + sum('vacationHours') + sum('sickLeaveHours') + sum('paidLeaveHours')
  const baseEstimate = worker.hourlyRate == null ? null : regular * worker.hourlyRate + overtime * worker.hourlyRate * 1.5
  return { regular, overtime, night: sum('nightHours'), sunday: sum('sundayHours'), holiday: sum('holidayHours'), vacation: sum('vacationHours'), sick: sum('sickLeaveHours'), paidLeave: sum('paidLeaveHours'), travel: sum('travelHours'), recorded, baseEstimate }
}

export function exportEmployeeTimeExcel(workers: WorkforcePerson[], entries: EmployeeTimeEntry[], year: number, month: number) {
  const names = new Map(workers.map((worker) => [worker.id, worker.fullName]))
  const rows = entries.map((entry) => ({ Datum: entry.workDate, Radnik: names.get(entry.workerId) ?? '—', 'Redovni sati': entry.regularHours, Prekovremeni: entry.overtimeHours, 'Nocni sati': entry.nightHours, Nedjelja: entry.sundayHours, Blagdan: entry.holidayHours, Godisnji: entry.vacationHours, Bolovanje: entry.sickLeaveHours, 'Placeni dopust': entry.paidLeaveHours, Put: entry.travelHours, Napomena: entry.note, Izvor: entry.source }))
  const summary = workers.map((worker) => ({ Radnik: worker.fullName, ...summarizeWorker(worker, entries) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Evidencija')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Obracun')
  XLSX.writeFile(wb, `FERSYS-sati-${year}-${String(month).padStart(2, '0')}.xlsx`)
}

function normalized(value: string) {
  return value.toLocaleLowerCase('hr-HR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function dateFromText(text: string) {
  const today = new Date()
  if (/\bjucer\b/.test(normalized(text))) today.setDate(today.getDate() - 1)
  if (/\bsutra\b/.test(normalized(text))) today.setDate(today.getDate() + 1)
  return today.toISOString().slice(0, 10)
}

export async function tryHandleEmployeeTimeAiCommand(text: string): Promise<string | null> {
  const clean = normalized(text)
  if (!/(radio|radila|odradio|odradila|prekovremen|godisnj|bolovanj|placeni dopust|koliko.*radio|koliko.*radila)/.test(clean)) return null
  const workers = await syncAppEmployees(await getEmployees())
  const matched = workers.filter((worker) => normalized(text).includes(normalized(worker.fullName)) || normalized(worker.fullName).split(/\s+/).some((part) => part.length >= 3 && clean.includes(part)))
  if (matched.length !== 1) return matched.length > 1 ? 'Pronašao sam više radnika s tim imenom. Napiši ime i prezime.' : null
  const worker = matched[0]
  const now = new Date()
  if (/koliko.*(ovaj|ovog).*mjesec/.test(clean)) {
    const entries = await getEmployeeTimeEntries(now.getFullYear(), now.getMonth() + 1)
    const s = summarizeWorker(worker, entries)
    return `${worker.fullName} ovaj mjesec ima ${s.regular.toFixed(2)} redovnih i ${s.overtime.toFixed(2)} prekovremenih sati. Ukupno evidentirano: ${s.recorded.toFixed(2)} h.`
  }
  const numbers = [...clean.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:h|sat|sati|sata)/g)].map((m) => Number(m[1].replace(',', '.')))
  const first = numbers[0] ?? 8
  const overtimeMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:h|sat|sati|sata)?\s*prekovremen/)
  const overtime = overtimeMatch ? Number(overtimeMatch[1].replace(',', '.')) : 0
  const leave = /godisnj/.test(clean) ? 'vacation' : /bolovanj/.test(clean) ? 'sick' : /placeni dopust/.test(clean) ? 'paid' : 'work'
  const workDate = dateFromText(text)
  await saveEmployeeTimeEntry({ workerId: worker.id, workOrderId: '', workDate, startTime: '', endTime: '', breakMinutes: 0,
    regularHours: leave === 'work' ? Math.max(0, first - overtime) : 0, overtimeHours: leave === 'work' ? overtime : 0, nightHours: /nocn/.test(clean) ? first : 0,
    sundayHours: /nedjelj/.test(clean) ? first : 0, holidayHours: /blagdan/.test(clean) ? first : 0, vacationHours: leave === 'vacation' ? first : 0,
    sickLeaveHours: leave === 'sick' ? first : 0, paidLeaveHours: leave === 'paid' ? first : 0, travelHours: 0, note: 'Uneseno putem FERSYS AI', source: 'ai', sourceRef: `ai:${workDate}:${worker.id}` })
  return `Evidencija je spremljena za ${worker.fullName}: ${workDate}, ${first.toFixed(2)} h${overtime ? ` (${overtime.toFixed(2)} h prekovremeno)` : ''}.`
}


export async function recordWorkOrderHoursFromCompletedOrder(workOrderId: string) {
  const companyId = await currentCompanyId()
  const { data: order, error } = await supabase
    .from('work_orders')
    .select('id, company_id, work_date, duration_minutes, assigned_workers, status')
    .eq('id', workOrderId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  if (!order || order.status !== 'Završen') return

  const durationHours = Math.max(0, Number(order.duration_minutes) || 0) / 60
  const names = Array.isArray(order.assigned_workers)
    ? order.assigned_workers.filter((value): value is string => typeof value === 'string')
    : []
  if (!durationHours || !names.length) return

  const workers = await syncAppEmployees(await getEmployees())
  for (const name of names) {
    const key = normalized(name.trim())
    const worker = workers.find((candidate) => normalized(candidate.fullName.trim()) === key)
    if (!worker) continue
    await saveEmployeeTimeEntry({
      workerId: worker.id,
      workOrderId,
      workDate: order.work_date,
      startTime: '',
      endTime: '',
      breakMinutes: 0,
      regularHours: durationHours,
      overtimeHours: 0,
      nightHours: 0,
      sundayHours: 0,
      holidayHours: 0,
      vacationHours: 0,
      sickLeaveHours: 0,
      paidLeaveHours: 0,
      travelHours: 0,
      note: 'Automatski iz završenog radnog naloga',
      source: 'work_order',
      sourceRef: `work-order:${workOrderId}`,
    })
  }
}
