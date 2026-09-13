import * as XLSX from 'xlsx'

import { supabase } from '../lib/supabase'

export type Intern = {
  id: string
  companyId: string
  fullName: string
  schoolName: string
  programName: string
  startDate: string
  endDate: string
  targetHours: number | null
  notes: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type InternTimeEntry = {
  id: string
  companyId: string
  internId: string
  workDate: string
  hours: number
  note: string
  createdAt: string
  updatedAt: string
}

export type CreateInternInput = {
  fullName: string
  schoolName?: string
  programName?: string
  startDate?: string
  endDate?: string
  targetHours?: number | null
  notes?: string
}

export type UpsertInternTimeInput = {
  internId: string
  workDate: string
  hours: number
  note?: string
}

type InternRow = {
  id: string
  company_id: string
  full_name: string
  school_name: string | null
  program_name: string | null
  start_date: string | null
  end_date: string | null
  target_hours: number | string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type EntryRow = {
  id: string
  company_id: string
  intern_id: string
  work_date: string
  hours: number | string
  note: string | null
  created_at: string
  updated_at: string
}

async function currentCompanyId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_company_id')
  if (error) throw error
  if (!data) throw new Error('Aktivna tvrtka nije pronađena.')
  return String(data)
}

function mapIntern(row: InternRow): Intern {
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name,
    schoolName: row.school_name ?? '',
    programName: row.program_name ?? '',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    targetHours: row.target_hours == null ? null : Number(row.target_hours),
    notes: row.notes ?? '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEntry(row: EntryRow): InternTimeEntry {
  return {
    id: row.id,
    companyId: row.company_id,
    internId: row.intern_id,
    workDate: row.work_date,
    hours: Number(row.hours),
    note: row.note ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getInterns(): Promise<Intern[]> {
  const companyId = await currentCompanyId()
  const { data, error } = await supabase
    .from('interns')
    .select('*')
    .eq('company_id', companyId)
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true })

  if (error) throw error
  return ((data ?? []) as InternRow[]).map(mapIntern)
}

export async function createIntern(input: CreateInternInput): Promise<Intern> {
  const fullName = input.fullName.trim()
  if (fullName.length < 2) throw new Error('Upiši ime i prezime praktikanta.')

  const companyId = await currentCompanyId()
  const { data, error } = await supabase
    .from('interns')
    .insert({
      company_id: companyId,
      full_name: fullName,
      school_name: input.schoolName?.trim() || null,
      program_name: input.programName?.trim() || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      target_hours:
        input.targetHours == null || !Number.isFinite(Number(input.targetHours))
          ? null
          : Math.max(0, Number(input.targetHours)),
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapIntern(data as InternRow)
}

export async function setInternActive(id: string, isActive: boolean): Promise<void> {
  const companyId = await currentCompanyId()
  const { error } = await supabase
    .from('interns')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) throw error
}

export async function deleteIntern(id: string): Promise<void> {
  const companyId = await currentCompanyId()
  const { error } = await supabase
    .from('interns')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) throw error
}

export async function getInternTimeEntries(
  internId: string,
  from?: string,
  to?: string,
): Promise<InternTimeEntry[]> {
  const companyId = await currentCompanyId()
  let query = supabase
    .from('intern_time_entries')
    .select('*')
    .eq('company_id', companyId)
    .eq('intern_id', internId)
    .order('work_date', { ascending: false })

  if (from) query = query.gte('work_date', from)
  if (to) query = query.lte('work_date', to)

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as EntryRow[]).map(mapEntry)
}

export async function upsertInternTimeEntry(
  input: UpsertInternTimeInput,
): Promise<InternTimeEntry> {
  const hours = Number(input.hours)
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    throw new Error('Broj sati mora biti veći od 0 i najviše 24.')
  }

  const companyId = await currentCompanyId()
  const { data, error } = await supabase
    .from('intern_time_entries')
    .upsert(
      {
        company_id: companyId,
        intern_id: input.internId,
        work_date: input.workDate,
        hours: Math.round(hours * 100) / 100,
        note: input.note?.trim() || null,
      },
      { onConflict: 'intern_id,work_date' },
    )
    .select('*')
    .single()

  if (error) throw error
  return mapEntry(data as EntryRow)
}

export async function deleteInternTimeEntry(id: string): Promise<void> {
  const companyId = await currentCompanyId()
  const { error } = await supabase
    .from('intern_time_entries')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) throw error
}

export function sumInternHours(entries: InternTimeEntry[]): number {
  return Math.round(entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0) * 100) / 100
}

export function exportInternEntriesToExcel(
  intern: Intern,
  entries: InternTimeEntry[],
  label: string,
) {
  const rows = entries
    .slice()
    .sort((a, b) => a.workDate.localeCompare(b.workDate))
    .map((entry) => ({
      Datum: entry.workDate,
      Dan: new Intl.DateTimeFormat('hr-HR', { weekday: 'long' }).format(new Date(`${entry.workDate}T12:00:00`)),
      Sati: entry.hours,
      Napomena: entry.note,
    }))

  rows.push({
    Datum: '',
    Dan: '',
    Sati: sumInternHours(entries),
    Napomena: 'UKUPNO SATI',
  })

  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 45 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Evidencija sati')

  const safeName = intern.fullName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
  const safeLabel = label.replace(/[^\p{L}\p{N}-]+/gu, '-')
  XLSX.writeFile(workbook, `FERSYS-praktikant-${safeName}-${safeLabel}.xlsx`)
}

function normalizeCroatian(value: string) {
  return value
    .toLocaleLowerCase('hr-HR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

function localIsoDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function tryInternAiTimeCommand(message: string): Promise<{
  handled: boolean
  message?: string
}> {
  const normalized = normalizeCroatian(message)
  if (!/\b(praktikant|praktikanta|praktikantica|praktikantice|praksa)\b/.test(normalized)) {
    return { handled: false }
  }
  if (!/\b(odradio|odradila|radio|radila|upisi|unesi|evidentiraj|dodaj)\b/.test(normalized)) {
    return { handled: false }
  }

  const hoursMatch = normalized.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:h|sat|sata|sati)\b/)
  if (!hoursMatch) return { handled: false }

  const hours = Number(hoursMatch[1].replace(',', '.'))
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { handled: true, message: 'Broj sati mora biti između 0 i 24.' }
  }

  let workDate = localIsoDate(0)
  if (/\bjucer\b/.test(normalized)) workDate = localIsoDate(-1)
  if (/\bsutra\b/.test(normalized)) workDate = localIsoDate(1)

  const interns = await getInterns()
  const active = interns.filter((intern) => intern.isActive)
  const withoutCommandWords = normalized
    .replace(/\b(upisi|unesi|evidentiraj|dodaj|da|je|praktikant|praktikanta|praktikantica|praktikantice|praksa|odradio|odradila|radio|radila|danas|jucer|sutra|sati|sata|sat|h)\b/g, ' ')
    .replace(/\d{1,2}(?:[.,]\d{1,2})?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const candidates = active.filter((intern) => {
    const name = normalizeCroatian(intern.fullName)
    return name.includes(withoutCommandWords) || withoutCommandWords.includes(name)
  })

  if (candidates.length === 0) {
    const partial = active.filter((intern) => {
      const tokens = normalizeCroatian(intern.fullName).split(/\s+/).filter(Boolean)
      return tokens.some((token) => token.length >= 3 && normalized.includes(token))
    })
    candidates.push(...partial)
  }

  const unique = [...new Map(candidates.map((item) => [item.id, item])).values()]
  if (unique.length === 0) {
    return {
      handled: true,
      message: 'Nisam pronašao tog praktikanta. Dodaj ga prvo u Zaposlenici → Praktikanti pa pokušaj ponovno.',
    }
  }
  if (unique.length > 1) {
    return {
      handled: true,
      message: `Pronašao sam više praktikanta: ${unique.map((item) => item.fullName).join(', ')}. Napiši ime i prezime.`,
    }
  }

  const intern = unique[0]
  await upsertInternTimeEntry({ internId: intern.id, workDate, hours })

  return {
    handled: true,
    message: `Upisano: ${intern.fullName} — ${workDate} — ${hours.toLocaleString('hr-HR')} h.`,
  }
}
