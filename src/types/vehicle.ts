export type VehicleStatus =
  | 'Aktivno'
  | 'Na servisu'
  | 'Neaktivno'

export type VehicleFuel =
  | 'Dizel'
  | 'Benzin'
  | 'Hibrid'
  | 'Električno'
  | 'LPG'
  | 'Ostalo'

export type Vehicle = {
  id: string
  companyId: string
  createdBy: string
  registration: string
  make: string
  model: string
  year: number | null
  vin: string
  mileage: number
  fuel: VehicleFuel
  color: string
  status: VehicleStatus
  assignedEmployeeId: string
  assignedEmployeeName: string
  registrationExpiresOn: string
  insuranceExpiresOn: string
  nextServiceDate: string
  nextServiceMileage: number | null
  imageUrl: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type VehicleServiceRecord = {
  id: string
  vehicleId: string
  companyId: string
  serviceDate: string
  mileage: number | null
  title: string
  description: string
  provider: string
  cost: number
  nextServiceDate: string
  nextServiceMileage: number | null
  createdAt: string
}

export type VehicleExpenseCategory =
  | 'Gorivo'
  | 'Servis'
  | 'Registracija'
  | 'Osiguranje'
  | 'Gume'
  | 'Cestarina'
  | 'Ostalo'

export type VehicleExpense = {
  id: string
  vehicleId: string
  companyId: string
  expenseDate: string
  category: VehicleExpenseCategory
  description: string
  amount: number
  mileage: number | null
  createdAt: string
}
