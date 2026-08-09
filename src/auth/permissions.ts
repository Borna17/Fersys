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

  | 'vehicles.view'
  | 'vehicles.manage'

  | 'calendar.view'

  | 'employees.view'
  | 'employees.manage'

  | 'ai.use'

  | 'settings.manage'

export type EmployeePermissions =
  Partial<
    Record<
      PermissionKey,
      boolean
    >
  >

export type CurrentMembership = {
  membershipId: string
  companyId: string
  role: CompanyRole
  status: MemberStatus
  permissions: EmployeePermissions
}

export const allPermissions:
  PermissionKey[] = [
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

  'vehicles.view',
  'vehicles.manage',

  'calendar.view',

  'employees.view',
  'employees.manage',

  'ai.use',

  'settings.manage',
]

function createPermissions(
  enabled: PermissionKey[],
): Record<
  PermissionKey,
  boolean
> {
  return Object.fromEntries(
    allPermissions.map(
      (permission) => [
        permission,
        enabled.includes(
          permission,
        ),
      ],
    ),
  ) as Record<
    PermissionKey,
    boolean
  >
}

export const defaultPermissionsByRole:
Record<
  CompanyRole,
  Record<
    PermissionKey,
    boolean
  >
> = {
  /*
   * VLASNIK
   *
   * Vlasnik ima pristup svemu.
   * Njegove ovlasti se ne mogu
   * ugasiti custom postavkama.
   */
  owner:
    createPermissions(
      allPermissions,
    ),

  /*
   * ADMINISTRATOR
   *
   * Administrator po zadanom
   * može koristiti cijeli sustav.
   */
  admin:
    createPermissions(
      allPermissions,
    ),

  /*
   * VODITELJ
   *
   * Voditelj vidi operativne
   * dijelove firme, ali nema
   * pristup financijama,
   * računima ni glavnim
   * postavkama firme.
   */
  manager:
    createPermissions([
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

      'vehicles.view',
      'vehicles.manage',

      'calendar.view',

      'employees.view',

      'ai.use',
    ]),

  /*
   * RADNIK
   *
   * Ovo je najvažniji default.
   *
   * Radnik po zadanom:
   * - vidi dashboard
   * - vidi kupce
   * - može raditi s investitorima
   * - vidi i radi radne naloge
   * - NE vidi cijene naloga
   * - vidi skladište
   * - može dodavati/uzimati materijal
   * - NE vidi nabavne cijene
   * - koristi kalendar
   * - koristi AI
   *
   * Ne vidi:
   * - ponude
   * - račune
   * - financije
   * - vozila
   * - zaposlenike
   * - postavke firme
   */
  worker:
    createPermissions([
      'dashboard.view',

      'customers.view',
      'customers.manage',

      'workOrders.view',
      'workOrders.manage',

      'inventory.view',
      'inventory.manage',

      'calendar.view',

      'ai.use',
    ]),

  /*
   * POMOĆNI RADNIK
   *
   * Osnovni terenski pristup.
   */
  assistant:
    createPermissions([
      'dashboard.view',

      'customers.view',

      'workOrders.view',
      'workOrders.manage',

      'inventory.view',
      'inventory.manage',

      'calendar.view',

      'ai.use',
    ]),

  /*
   * PRAKTIKANT
   *
   * Uglavnom pregled.
   * Vlasnik mu može pojedinačno
   * uključiti dodatne ovlasti.
   */
  intern:
    createPermissions([
      'dashboard.view',

      'customers.view',

      'workOrders.view',

      'inventory.view',

      'calendar.view',
    ]),

  /*
   * RAČUNOVODSTVO
   *
   * Financijski dijelovi,
   * ali bez operativnog
   * upravljanja firmom.
   */
  accounting:
    createPermissions([
      'dashboard.view',

      'customers.view',

      'offers.view',
      'offers.viewPrices',

      'invoices.view',
      'incomingInvoices.view',

      'finance.view',

      'calendar.view',
    ]),

  /*
   * SAMO PREGLED
   */
  viewer:
    createPermissions([
      'dashboard.view',

      'customers.view',

      'workOrders.view',

      'inventory.view',

      'calendar.view',
    ]),
}

export const roleLabels:
Record<
  CompanyRole,
  string
> = {
  owner: 'Vlasnik',

  admin:
    'Administrator',

  manager:
    'Voditelj',

  worker:
    'Radnik',

  assistant:
    'Pomoćni radnik',

  intern:
    'Praktikant',

  accounting:
    'Računovodstvo',

  viewer:
    'Samo pregled',
}

/*
 * Nazivi ovlasti koji se mogu
 * koristiti u postavkama
 * zaposlenika.
 */
export const permissionLabels:
Record<
  PermissionKey,
  string
> = {
  'dashboard.view':
    'Dashboard',

  'customers.view':
    'Pregled investitora',

  'customers.manage':
    'Dodavanje i uređivanje investitora',

  'workOrders.view':
    'Pregled radnih naloga',

  'workOrders.manage':
    'Izrada i uređivanje radnih naloga',

  'workOrders.viewPrices':
    'Pregled cijena radnih naloga',

  'offers.view':
    'Pregled ponuda',

  'offers.manage':
    'Izrada i uređivanje ponuda',

  'offers.viewPrices':
    'Pregled cijena ponuda',

  'invoices.view':
    'Računi',

  'incomingInvoices.view':
    'Ulazni računi',

  'finance.view':
    'Financije',

  'inventory.view':
    'Pregled skladišta',

  'inventory.manage':
    'Dodavanje i uzimanje materijala',

  'inventory.viewCosts':
    'Pregled nabavnih cijena',

  'vehicles.view':
    'Pregled vozila',

  'vehicles.manage':
    'Dodavanje i uređivanje vozila',

  'calendar.view':
    'Kalendar',

  'employees.view':
    'Pregled zaposlenika',

  'employees.manage':
    'Upravljanje zaposlenicima',

  'ai.use':
    'AI pomoćnik',

  'settings.manage':
    'Postavke firme',
}

export function resolvePermissions(
  role: CompanyRole,
  customPermissions:
    EmployeePermissions,
): Record<
  PermissionKey,
  boolean
> {
  const defaults =
    defaultPermissionsByRole[
      role
    ]

  /*
   * Vlasniku se prava nikada
   * ne mogu slučajno ugasiti.
   */
  if (role === 'owner') {
    return defaults
  }

  /*
   * Za sve ostale:
   *
   * prvo default prava ranka,
   * zatim pojedinačne izmjene
   * koje je vlasnik spremio.
   *
   * Primjer:
   *
   * worker default:
   * vehicles.view = false
   *
   * vlasnik uključi samo Marku:
   * vehicles.view = true
   *
   * Marko vidi vozila,
   * ostali radnici ne.
   */
  return {
    ...defaults,
    ...customPermissions,
  }
}

export function parseEmployeePermissions(
  value: unknown,
): EmployeePermissions {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(
      value,
    ).filter(
      ([
        key,
        permissionValue,
      ]) =>
        allPermissions.includes(
          key as PermissionKey,
        ) &&
        typeof permissionValue ===
          'boolean',
    ),
  ) as EmployeePermissions
}