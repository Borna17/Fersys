export type CompanyRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'worker'
  | 'assistant'
  | 'intern'
  | 'accounting'
  | 'viewer'

export type MemberStatus =
  | 'active'
  | 'inactive'
  | 'blocked'

export type PermissionKey =
  | 'dashboard.view'
  | 'customers.view'
  | 'customers.manage'
  | 'workOrders.view'
  | 'workOrders.manage'
  | 'workOrders.viewPrices'
  | 'offers.view'
  | 'offers.manage'
  | 'offers.viewPrices'
  | 'invoices.view'
  | 'incomingInvoices.view'
  | 'finance.view'
  | 'inventory.view'
  | 'inventory.manage'
  | 'inventory.viewCosts'
  | 'calendar.view'
  | 'employees.view'
  | 'employees.manage'
  | 'ai.use'
  | 'settings.manage'

export type EmployeePermissions =
  Partial<Record<PermissionKey, boolean>>

export type CurrentMembership = {
  membershipId: string
  companyId: string
  role: CompanyRole
  status: MemberStatus
  permissions: EmployeePermissions
}

const allPermissions: PermissionKey[] = [
  'dashboard.view',
  'customers.view',
  'customers.manage',
  'workOrders.view',
  'workOrders.manage',
  'workOrders.viewPrices',
  'offers.view',
  'offers.manage',
  'offers.viewPrices',
  'invoices.view',
  'incomingInvoices.view',
  'finance.view',
  'inventory.view',
  'inventory.manage',
  'inventory.viewCosts',
  'calendar.view',
  'employees.view',
  'employees.manage',
  'ai.use',
  'settings.manage',
]

function createPermissions(
  enabled: PermissionKey[],
): Record<PermissionKey, boolean> {
  return Object.fromEntries(
    allPermissions.map((permission) => [
      permission,
      enabled.includes(permission),
    ]),
  ) as Record<PermissionKey, boolean>
}

export const defaultPermissionsByRole: Record<
  CompanyRole,
  Record<PermissionKey, boolean>
> = {
  owner: createPermissions(allPermissions),

  admin: createPermissions(allPermissions),

  manager: createPermissions([
    'dashboard.view',
    'customers.view',
    'customers.manage',
    'workOrders.view',
    'workOrders.manage',
    'workOrders.viewPrices',
    'offers.view',
    'offers.manage',
    'offers.viewPrices',
    'inventory.view',
    'inventory.manage',
    'inventory.viewCosts',
    'calendar.view',
    'employees.view',
    'ai.use',
  ]),

  worker: createPermissions([
    'dashboard.view',
    'customers.view',
    'workOrders.view',
    'workOrders.manage',
    'inventory.view',
    'calendar.view',
    'ai.use',
  ]),

  assistant: createPermissions([
    'dashboard.view',
    'workOrders.view',
    'workOrders.manage',
    'inventory.view',
    'calendar.view',
  ]),

  intern: createPermissions([
    'dashboard.view',
    'workOrders.view',
    'inventory.view',
    'calendar.view',
  ]),

  accounting: createPermissions([
    'dashboard.view',
    'customers.view',
    'offers.view',
    'offers.viewPrices',
    'invoices.view',
    'incomingInvoices.view',
    'finance.view',
    'calendar.view',
  ]),

  viewer: createPermissions([
    'dashboard.view',
    'customers.view',
    'workOrders.view',
    'inventory.view',
    'calendar.view',
  ]),
}

export const roleLabels: Record<
  CompanyRole,
  string
> = {
  owner: 'Vlasnik',
  admin: 'Administrator',
  manager: 'Voditelj',
  worker: 'Radnik',
  assistant: 'Pomoćni radnik',
  intern: 'Praktikant',
  accounting: 'Računovodstvo',
  viewer: 'Samo pregled',
}

export function resolvePermissions(
  role: CompanyRole,
  customPermissions: EmployeePermissions,
): Record<PermissionKey, boolean> {
  const defaults =
    defaultPermissionsByRole[role]

  if (role === 'owner') {
    return defaults
  }

  return {
    ...defaults,
    ...customPermissions,
  }
}

export function parseEmployeePermissions(
  value: unknown,
): EmployeePermissions {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, permissionValue]) =>
        allPermissions.includes(
          key as PermissionKey,
        ) &&
        typeof permissionValue === 'boolean',
    ),
  ) as EmployeePermissions
}

