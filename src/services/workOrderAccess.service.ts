import { supabase } from '../lib/supabase'
import {
  getEmployees,
  type CompanyEmployee,
} from './employees.service'
import type { CloudWorkOrder } from './workOrders.service'

export type WorkOrderEditAccess = {
  allowed: boolean
  reason: string
  currentEmployee: CompanyEmployee | null
}

const FULL_EDIT_ROLES: CompanyEmployee['role'][] = [
  'owner',
  'admin',
  'manager',
]

const LIMITED_EDIT_ROLES: CompanyEmployee['role'][] = [
  'worker',
  'assistant',
  'intern',
]

function normalizeName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('hr-HR')
    .replace(/\s+/g, ' ')
}

export async function getWorkOrderEditAccess(
  order: CloudWorkOrder,
): Promise<WorkOrderEditAccess> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    return {
      allowed: false,
      reason: 'Korisnik nije prijavljen.',
      currentEmployee: null,
    }
  }

  const employees =
    await getEmployees()

  const currentEmployee =
    employees.find(
      (employee) =>
        employee.userId === user.id,
    ) ?? null

  if (!currentEmployee) {
    return {
      allowed: false,
      reason:
        'Prijavljeni korisnik nije pronađen među zaposlenicima tvrtke.',
      currentEmployee: null,
    }
  }

  if (
    currentEmployee.status !==
    'active'
  ) {
    return {
      allowed: false,
      reason:
        'Neaktivan korisnik ne može uređivati radne naloge.',
      currentEmployee,
    }
  }

  if (
    FULL_EDIT_ROLES.includes(
      currentEmployee.role,
    )
  ) {
    return {
      allowed: true,
      reason:
        'Uloga ima pravo uređivati sve radne naloge.',
      currentEmployee,
    }
  }

  if (
    !LIMITED_EDIT_ROLES.includes(
      currentEmployee.role,
    )
  ) {
    return {
      allowed: false,
      reason:
        'Ova uloga nema pravo uređivati radne naloge.',
      currentEmployee,
    }
  }

  const {
    data: creatorRow,
    error: creatorError,
  } = await supabase
    .from('work_orders')
    .select('created_by')
    .eq('id', order.id)
    .maybeSingle()

  if (creatorError) {
    throw creatorError
  }

  const isCreator =
    creatorRow?.created_by ===
    user.id

  const employeeName =
    normalizeName(
      currentEmployee.fullName,
    )

  const isAssigned =
    order.assignedWorkers.some(
      (workerName) =>
        normalizeName(
          workerName,
        ) === employeeName,
    )

  if (
    isCreator ||
    isAssigned
  ) {
    return {
      allowed: true,
      reason: isCreator
        ? 'Korisnik je izradio ovaj radni nalog.'
        : 'Korisnik je dodijeljen na ovaj radni nalog.',
      currentEmployee,
    }
  }

  return {
    allowed: false,
    reason:
      'Radnik može uređivati samo nalog koji je sam izradio ili na kojem je dodijeljen.',
    currentEmployee,
  }
}