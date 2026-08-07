import { supabase } from '../lib/supabase'

import type {
  Vehicle,
  VehicleExpense,
  VehicleExpenseCategory,
  VehicleFuel,
  VehicleServiceRecord,
  VehicleStatus,
} from '../types/vehicle'

type VehicleRow = {
  id: string
  company_id: string
  created_by: string
  registration: string
  make: string
  model: string
  year: number | null
  vin: string | null
  mileage: number | null
  fuel: VehicleFuel
  color: string | null
  status: VehicleStatus
  assigned_employee_id: string | null
  assigned_employee_name: string | null
  registration_expires_on: string | null
  insurance_expires_on: string | null
  next_service_date: string | null
  next_service_mileage: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type ServiceRow = {
  id: string
  vehicle_id: string
  company_id: string
  service_date: string
  mileage: number | null
  title: string
  description: string | null
  provider: string | null
  cost: number | null
  next_service_date: string | null
  next_service_mileage: number | null
  created_at: string
}

type ExpenseRow = {
  id: string
  vehicle_id: string
  company_id: string
  expense_date: string
  category: VehicleExpenseCategory
  description: string | null
  amount: number
  mileage: number | null
  created_at: string
}

export type CreateVehicleInput = {
  registration: string
  make: string
  model: string
  year?: number | null
  vin?: string
  mileage?: number
  fuel?: VehicleFuel
  color?: string
  status?: VehicleStatus
  assignedEmployeeId?: string
  assignedEmployeeName?: string
  registrationExpiresOn?: string
  insuranceExpiresOn?: string
  nextServiceDate?: string
  nextServiceMileage?: number | null
  imageUrl?: string
  notes?: string
}

export type UpdateVehicleInput =
  Partial<CreateVehicleInput>

export type CreateServiceInput = {
  serviceDate: string
  mileage?: number | null
  title: string
  description?: string
  provider?: string
  cost?: number
  nextServiceDate?: string
  nextServiceMileage?: number | null
}

export type CreateExpenseInput = {
  expenseDate: string
  category: VehicleExpenseCategory
  description?: string
  amount: number
  mileage?: number | null
}

function mapVehicle(
  row: VehicleRow,
): Vehicle {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    registration: row.registration,
    make: row.make,
    model: row.model,
    year: row.year,
    vin: row.vin ?? '',
    mileage: row.mileage ?? 0,
    fuel: row.fuel,
    color: row.color ?? '',
    status: row.status,
    assignedEmployeeId:
      row.assigned_employee_id ?? '',
    assignedEmployeeName:
      row.assigned_employee_name ?? '',
    registrationExpiresOn:
      row.registration_expires_on ?? '',
    insuranceExpiresOn:
      row.insurance_expires_on ?? '',
    nextServiceDate:
      row.next_service_date ?? '',
    nextServiceMileage:
      row.next_service_mileage,
    imageUrl: row.image_url ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapService(
  row: ServiceRow,
): VehicleServiceRecord {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    companyId: row.company_id,
    serviceDate: row.service_date,
    mileage: row.mileage,
    title: row.title,
    description: row.description ?? '',
    provider: row.provider ?? '',
    cost: Number(row.cost ?? 0),
    nextServiceDate:
      row.next_service_date ?? '',
    nextServiceMileage:
      row.next_service_mileage,
    createdAt: row.created_at,
  }
}

function mapExpense(
  row: ExpenseRow,
): VehicleExpense {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    companyId: row.company_id,
    expenseDate: row.expense_date,
    category: row.category,
    description: row.description ?? '',
    amount: Number(row.amount ?? 0),
    mileage: row.mileage,
    createdAt: row.created_at,
  }
}

async function getCompanyId() {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'current_company_id',
    )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Aktivna tvrtka nije pronađena.',
    )
  }

  return String(data)
}

async function getUserId() {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  return data.user.id
}

export async function getVehicles() {
  const companyId =
    await getCompanyId()

  const {
    data,
    error,
  } =
    await supabase
      .from('vehicles')
      .select('*')
      .eq(
        'company_id',
        companyId,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

  if (error) throw error

  return (
    (data ?? []) as VehicleRow[]
  ).map(mapVehicle)
}

export async function getVehicleById(
  id: string,
) {
  const companyId =
    await getCompanyId()

  const {
    data,
    error,
  } =
    await supabase
      .from('vehicles')
      .select('*')
      .eq(
        'company_id',
        companyId,
      )
      .eq('id', id)
      .maybeSingle()

  if (error) throw error

  return data
    ? mapVehicle(
        data as VehicleRow,
      )
    : null
}

export async function createVehicle(
  input: CreateVehicleInput,
) {
  const [
    companyId,
    userId,
  ] =
    await Promise.all([
      getCompanyId(),
      getUserId(),
    ])

  const registration =
    input.registration
      .trim()
      .toUpperCase()

  if (!registration) {
    throw new Error(
      'Registracija vozila je obavezna.',
    )
  }

  if (
    !input.make.trim() ||
    !input.model.trim()
  ) {
    throw new Error(
      'Marka i model su obavezni.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('vehicles')
      .insert({
        company_id:
          companyId,
        created_by:
          userId,
        registration,
        make:
          input.make.trim(),
        model:
          input.model.trim(),
        year:
          input.year ?? null,
        vin:
          input.vin?.trim() ||
          null,
        mileage:
          Math.max(
            0,
            input.mileage ?? 0,
          ),
        fuel:
          input.fuel ??
          'Dizel',
        color:
          input.color?.trim() ||
          null,
        status:
          input.status ??
          'Aktivno',
        assigned_employee_id:
          input.assignedEmployeeId ||
          null,
        assigned_employee_name:
          input.assignedEmployeeName?.trim() ||
          null,
        registration_expires_on:
          input.registrationExpiresOn ||
          null,
        insurance_expires_on:
          input.insuranceExpiresOn ||
          null,
        next_service_date:
          input.nextServiceDate ||
          null,
        next_service_mileage:
          input.nextServiceMileage ??
          null,
        image_url:
          input.imageUrl?.trim() ||
          null,
        notes:
          input.notes?.trim() ||
          null,
      })
      .select('*')
      .single()

  if (error) throw error

  return mapVehicle(
    data as VehicleRow,
  )
}

export async function updateVehicle(
  id: string,
  input: UpdateVehicleInput,
) {
  const companyId =
    await getCompanyId()

  const patch:
    Record<string, unknown> = {
      updated_at:
        new Date().toISOString(),
  }

  if (
    input.registration !==
    undefined
  ) {
    patch.registration =
      input.registration
        .trim()
        .toUpperCase()
  }

  if (input.make !== undefined) {
    patch.make =
      input.make.trim()
  }

  if (
    input.model !== undefined
  ) {
    patch.model =
      input.model.trim()
  }

  if (input.year !== undefined) {
    patch.year =
      input.year ?? null
  }

  if (input.vin !== undefined) {
    patch.vin =
      input.vin.trim() ||
      null
  }

  if (
    input.mileage !== undefined
  ) {
    patch.mileage =
      Math.max(
        0,
        input.mileage,
      )
  }

  if (input.fuel !== undefined) {
    patch.fuel =
      input.fuel
  }

  if (
    input.color !== undefined
  ) {
    patch.color =
      input.color.trim() ||
      null
  }

  if (
    input.status !== undefined
  ) {
    patch.status =
      input.status
  }

  if (
    input.assignedEmployeeId !==
    undefined
  ) {
    patch.assigned_employee_id =
      input.assignedEmployeeId ||
      null
  }

  if (
    input.assignedEmployeeName !==
    undefined
  ) {
    patch.assigned_employee_name =
      input.assignedEmployeeName
        .trim() ||
      null
  }

  if (
    input.registrationExpiresOn !==
    undefined
  ) {
    patch.registration_expires_on =
      input.registrationExpiresOn ||
      null
  }

  if (
    input.insuranceExpiresOn !==
    undefined
  ) {
    patch.insurance_expires_on =
      input.insuranceExpiresOn ||
      null
  }

  if (
    input.nextServiceDate !==
    undefined
  ) {
    patch.next_service_date =
      input.nextServiceDate ||
      null
  }

  if (
    input.nextServiceMileage !==
    undefined
  ) {
    patch.next_service_mileage =
      input.nextServiceMileage ??
      null
  }

  if (
    input.imageUrl !== undefined
  ) {
    patch.image_url =
      input.imageUrl.trim() ||
      null
  }

  if (
    input.notes !== undefined
  ) {
    patch.notes =
      input.notes.trim() ||
      null
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('vehicles')
      .update(patch)
      .eq(
        'company_id',
        companyId,
      )
      .eq('id', id)
      .select('*')
      .single()

  if (error) throw error

  return mapVehicle(
    data as VehicleRow,
  )
}

export async function deleteVehicle(
  id: string,
) {
  const companyId =
    await getCompanyId()

  const { error } =
    await supabase
      .from('vehicles')
      .delete()
      .eq(
        'company_id',
        companyId,
      )
      .eq('id', id)

  if (error) throw error
}

export async function getVehicleServices(
  vehicleId: string,
) {
  const companyId =
    await getCompanyId()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehicle_service_records',
      )
      .select('*')
      .eq(
        'company_id',
        companyId,
      )
      .eq(
        'vehicle_id',
        vehicleId,
      )
      .order(
        'service_date',
        {
          ascending: false,
        },
      )

  if (error) throw error

  return (
    (data ?? []) as ServiceRow[]
  ).map(mapService)
}

export async function addVehicleService(
  vehicleId: string,
  input: CreateServiceInput,
) {
  const companyId =
    await getCompanyId()

  if (!input.title.trim()) {
    throw new Error(
      'Naziv servisa je obavezan.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehicle_service_records',
      )
      .insert({
        vehicle_id:
          vehicleId,
        company_id:
          companyId,
        service_date:
          input.serviceDate,
        mileage:
          input.mileage ??
          null,
        title:
          input.title.trim(),
        description:
          input.description?.trim() ||
          null,
        provider:
          input.provider?.trim() ||
          null,
        cost:
          Math.max(
            0,
            input.cost ?? 0,
          ),
        next_service_date:
          input.nextServiceDate ||
          null,
        next_service_mileage:
          input.nextServiceMileage ??
          null,
      })
      .select('*')
      .single()

  if (error) throw error

  const updates:
    UpdateVehicleInput = {}

  if (
    input.mileage !== null &&
    input.mileage !== undefined
  ) {
    updates.mileage =
      input.mileage
  }

  if (
    input.nextServiceDate
  ) {
    updates.nextServiceDate =
      input.nextServiceDate
  }

  if (
    input.nextServiceMileage !==
      null &&
    input.nextServiceMileage !==
      undefined
  ) {
    updates.nextServiceMileage =
      input.nextServiceMileage
  }

  if (
    Object.keys(updates).length >
    0
  ) {
    await updateVehicle(
      vehicleId,
      updates,
    )
  }

  return mapService(
    data as ServiceRow,
  )
}

export async function getVehicleExpenses(
  vehicleId: string,
) {
  const companyId =
    await getCompanyId()

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehicle_expenses',
      )
      .select('*')
      .eq(
        'company_id',
        companyId,
      )
      .eq(
        'vehicle_id',
        vehicleId,
      )
      .order(
        'expense_date',
        {
          ascending: false,
        },
      )

  if (error) throw error

  return (
    (data ?? []) as ExpenseRow[]
  ).map(mapExpense)
}

export async function addVehicleExpense(
  vehicleId: string,
  input: CreateExpenseInput,
) {
  const companyId =
    await getCompanyId()

  if (input.amount < 0) {
    throw new Error(
      'Iznos troška ne može biti negativan.',
    )
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'vehicle_expenses',
      )
      .insert({
        vehicle_id:
          vehicleId,
        company_id:
          companyId,
        expense_date:
          input.expenseDate,
        category:
          input.category,
        description:
          input.description?.trim() ||
          null,
        amount:
          input.amount,
        mileage:
          input.mileage ??
          null,
      })
      .select('*')
      .single()

  if (error) throw error

  return mapExpense(
    data as ExpenseRow,
  )
}
