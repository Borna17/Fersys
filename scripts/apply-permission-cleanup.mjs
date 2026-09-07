import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, source) {
  fs.writeFileSync(path, source)
}

function addAfter(source, anchor, addition) {
  if (source.includes(addition.trim())) return source
  if (!source.includes(anchor)) throw new Error(`Anchor not found: ${anchor}`)
  return source.replace(anchor, `${anchor}${addition}`)
}

function ensureNamedImport(source, fromPath, names) {
  const escaped = fromPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`import \\{([^}]*)\\} from ['\"]${escaped}['\"]`)
  const match = source.match(re)
  if (match) {
    const current = match[1].split(',').map((v) => v.trim()).filter(Boolean)
    for (const name of names) if (!current.includes(name)) current.push(name)
    return source.replace(re, `import { ${current.join(', ')} } from '${fromPath}'`)
  }
  return `import { ${names.join(', ')} } from '${fromPath}'\n${source}`
}

function insertGuard(source, functionName, guardLine) {
  if (source.includes(`${functionName}`) && source.includes(guardLine)) {
    const start = source.indexOf(`export async function ${functionName}`)
    const end = source.indexOf('\n}', start)
    if (start >= 0 && end >= 0 && source.slice(start, end).includes(guardLine)) return source
  }
  const re = new RegExp(`(export async function ${functionName}\\s*\\([\\s\\S]*?\\)\\s*(?::\\s*Promise<[^>]+>)?\\s*\\{)`)
  if (!re.test(source)) throw new Error(`Function not found: ${functionName}`)
  return source.replace(re, `$1\n  ${guardLine}`)
}

function hideButtonsContaining(source, token, condition) {
  const re = /<button\b[\s\S]*?<\/button>/g
  return source.replace(re, (block) => {
    if (!block.includes(token) || block.includes(`display: ${condition}`)) return block
    const close = block.indexOf('>')
    if (close < 0) return block
    return `${block.slice(0, close)} style={{ display: ${condition} ? undefined : 'none' }}${block.slice(close)}`
  })
}

// 1) Permission model
{
  const path = 'src/auth/permissions.ts'
  let s = read(path)

  s = s.replace("  | 'invoices.view'\r\n  | 'invoices.delete'", "  | 'invoices.view'\r\n  | 'invoices.manage'\r\n  | 'invoices.delete'")
  s = s.replace("  | 'incomingInvoices.view'\r\n  | 'incomingInvoices.delete'", "  | 'incomingInvoices.view'\r\n  | 'incomingInvoices.manage'\r\n  | 'incomingInvoices.delete'")
  s = s.replace("  | 'calendar.view'\r\n  | 'calendar.delete'", "  | 'calendar.view'\r\n  | 'calendar.manage'\r\n  | 'calendar.delete'")

  s = s.replace("  'invoices.view',\r\n  'invoices.delete',", "  'invoices.view',\r\n  'invoices.manage',\r\n  'invoices.delete',")
  s = s.replace("  'incomingInvoices.view',\r\n  'incomingInvoices.delete',", "  'incomingInvoices.view',\r\n  'incomingInvoices.manage',\r\n  'incomingInvoices.delete',")
  s = s.replace("  'calendar.view',\r\n  'calendar.delete',", "  'calendar.view',\r\n  'calendar.manage',\r\n  'calendar.delete',")

  s = s.replace("  'invoices.view':\r\n    'Računi',", "  'invoices.view':\r\n    'Pregled izlaznih računa',\r\n\r\n  'invoices.manage':\r\n    'Izrada i uređivanje izlaznih računa',")
  s = s.replace("  'incomingInvoices.view':\r\n    'Ulazni računi',", "  'incomingInvoices.view':\r\n    'Pregled ulaznih računa',\r\n\r\n  'incomingInvoices.manage':\r\n    'Izrada i uređivanje ulaznih računa',")
  s = s.replace("  'calendar.view':\r\n    'Kalendar',", "  'calendar.view':\r\n    'Pregled kalendara',\r\n\r\n  'calendar.manage':\r\n    'Dodavanje i uređivanje događaja',")

  // Preserve sensible existing role behavior while separating read/write.
  s = s.replace("      'calendar.view',\r\n\r\n      'employees.view',", "      'calendar.view',\r\n      'calendar.manage',\r\n\r\n      'employees.view',")
  s = s.replace("      'calendar.view',\r\n\r\n      'ai.use',", "      'calendar.view',\r\n      'calendar.manage',\r\n\r\n      'ai.use',")
  s = s.replace("      'invoices.view',\r\n      'incomingInvoices.view',", "      'invoices.view',\r\n      'invoices.manage',\r\n      'incomingInvoices.view',\r\n      'incomingInvoices.manage',")

  write(path, s)
}

// 2) Generic permission guard
{
  const path = 'src/services/permissionGuard.service.ts'
  let s = read(path)
  if (!s.includes('export async function assertPermission(')) {
    s = s.replace('export async function assertDeletePermission(', 'export async function assertPermission(')
    s = s.replace("    throw new Error('Nemaš dopuštenje za brisanje ovog zapisa. Vlasnik tvrtke može uključiti ovu ovlast u postavkama zaposlenika.')", "    throw new Error('Nemaš dopuštenje za ovu radnju. Vlasnik tvrtke može uključiti ovu ovlast u postavkama zaposlenika.')")
    s += "\nexport async function assertDeletePermission(\n  permission: PermissionKey,\n): Promise<void> {\n  await assertPermission(permission)\n}\n"
  }
  write(path, s)
}

// 3) Service-level write protection
const serviceRules = [
  ['src/services/customers.service.ts', [['createCustomer', "await assertPermission('customers.manage')"], ['updateCustomer', "await assertPermission('customers.manage')"]]],
  ['src/services/invoices.service.ts', [['createInvoice', "await assertPermission('invoices.manage')"], ['updateInvoice', "await assertPermission('invoices.manage')"]]],
  ['src/services/incomingInvoices.service.ts', [['upsertIncomingInvoice', "await assertPermission('incomingInvoices.manage')"], ['deleteIncomingInvoice', "await assertDeletePermission('incomingInvoices.delete')"]]],
  ['src/services/calendar.service.ts', [['createCalendarEvent', "await assertPermission('calendar.manage')"], ['updateCalendarEvent', "await assertPermission('calendar.manage')"], ['deleteCalendarEvent', "await assertDeletePermission('calendar.delete')"]]],
  ['src/services/vehicles.service.ts', [['createVehicle', "await assertPermission('vehicles.manage')"], ['updateVehicle', "await assertPermission('vehicles.manage')"], ['addVehicleService', "await assertPermission('vehicles.manage')"], ['addVehicleExpense', "await assertPermission('vehicles.manage')"]]],
]

for (const [path, rules] of serviceRules) {
  let s = read(path)
  s = ensureNamedImport(s, './permissionGuard.service', ['assertPermission', 'assertDeletePermission'])
  for (const [fn, guard] of rules) {
    if (s.includes(`export async function ${fn}`)) s = insertGuard(s, fn, guard)
  }
  write(path, s)
}

// 4) Router write guards
{
  const path = 'src/router/AppRouter.tsx'
  let s = read(path)
  s = s.replace('<Guard permission="invoices.view" feature="invoices"><NewInvoicePage /></Guard>', '<Guard permission="invoices.manage" feature="invoices"><NewInvoicePage /></Guard>')
  s = s.replace('<Guard permission="incomingInvoices.view" feature="incoming_invoices"><NewIncomingInvoicePage /></Guard>', '<Guard permission="incomingInvoices.manage" feature="incoming_invoices"><NewIncomingInvoicePage /></Guard>')
  write(path, s)
}

// 5) Customers UI
{
  const path = 'src/pages/CustomersPage.tsx'
  let s = read(path)
  s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
  s = s.replace('export function CustomersPage() {\n  const navigate = useNavigate()', "export function CustomersPage() {\n  const navigate = useNavigate()\n  const { can } = useAuth()\n  const canManageCustomers = can('customers.manage')")
  s = s.replace('  async function handleAddCustomer(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n    event.preventDefault()', "  async function handleAddCustomer(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n    event.preventDefault()\n\n    if (!canManageCustomers) {\n      window.alert('Nemaš dopuštenje za dodavanje investitora.')\n      return\n    }")
  s = hideButtonsContaining(s, 'Novi investitor', 'canManageCustomers')
  write(path, s)
}

// 6) Invoice UI
{
  const path = 'src/pages/InvoicesPage.tsx'
  let s = read(path)
  s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
  s = s.replace('export function InvoicesPage() {\n  const navigate = useNavigate()', "export function InvoicesPage() {\n  const navigate = useNavigate()\n  const { can } = useAuth()\n  const canManageInvoices = can('invoices.manage')\n  const canDeleteInvoices = can('invoices.delete')")
  s = s.replace('  async function markPaid(\n    invoice: Invoice,\n  ) {', "  async function markPaid(\n    invoice: Invoice,\n  ) {\n    if (!canManageInvoices) {\n      window.alert('Nemaš dopuštenje za uređivanje računa.')\n      return\n    }")
  s = s.replace('  async function removeInvoice(\n    invoice: Invoice,\n  ) {', "  async function removeInvoice(\n    invoice: Invoice,\n  ) {\n    if (!canDeleteInvoices) {\n      window.alert('Nemaš dopuštenje za brisanje računa.')\n      return\n    }")
  s = s.replace('  async function duplicateInvoice(\n    invoice: Invoice,\n  ) {', "  async function duplicateInvoice(\n    invoice: Invoice,\n  ) {\n    if (!canManageInvoices) {\n      window.alert('Nemaš dopuštenje za izradu računa.')\n      return\n    }")
  s = hideButtonsContaining(s, 'Novi račun', 'canManageInvoices')
  s = hideButtonsContaining(s, '<Pencil', 'canManageInvoices')
  s = hideButtonsContaining(s, '<Copy', 'canManageInvoices')
  s = hideButtonsContaining(s, '<Trash2', 'canDeleteInvoices')
  write(path, s)
}

// 7) Incoming invoice UI
{
  const path = 'src/pages/IncomingInvoicesPage.tsx'
  let s = read(path)
  s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
  s = s.replace('export function IncomingInvoicesPage() {\n  const navigate =\n    useNavigate()', "export function IncomingInvoicesPage() {\n  const navigate =\n    useNavigate()\n  const { can } = useAuth()\n  const canManageIncomingInvoices = can('incomingInvoices.manage')\n  const canDeleteIncomingInvoices = can('incomingInvoices.delete')")
  s = s.replace('  async function removeInvoice(\n    invoice:\n      IncomingInvoice,\n  ) {', "  async function removeInvoice(\n    invoice:\n      IncomingInvoice,\n  ) {\n    if (!canDeleteIncomingInvoices) {\n      window.alert('Nemaš dopuštenje za brisanje ulaznih računa.')\n      return\n    }")
  s = hideButtonsContaining(s, '<Plus', 'canManageIncomingInvoices')
  s = hideButtonsContaining(s, '<Pencil', 'canManageIncomingInvoices')
  s = hideButtonsContaining(s, '<Trash2', 'canDeleteIncomingInvoices')
  write(path, s)
}

// 8) Calendar UI
{
  const path = 'src/pages/CalendarPage.tsx'
  let s = read(path)
  s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
  s = s.replace('export function CalendarPage() {', "export function CalendarPage() {\n  const { can } = useAuth()\n  const canManageCalendar = can('calendar.manage')\n  const canDeleteCalendar = can('calendar.delete')")
  s = s.replace('  async function saveEvent(\n    event:\n      FormEvent<HTMLFormElement>,\n  ) {\n    event.preventDefault()', "  async function saveEvent(\n    event:\n      FormEvent<HTMLFormElement>,\n  ) {\n    event.preventDefault()\n\n    if (!canManageCalendar) {\n      setError('Nemaš dopuštenje za dodavanje ili uređivanje termina.')\n      return\n    }")
  s = s.replace('  async function removeEvent(\n    eventId: string,\n  ) {', "  async function removeEvent(\n    eventId: string,\n  ) {\n    if (!canDeleteCalendar) {\n      setError('Nemaš dopuštenje za brisanje termina.')\n      return\n    }")
  s = hideButtonsContaining(s, '<Plus', 'canManageCalendar')
  s = hideButtonsContaining(s, '<Trash2', 'canDeleteCalendar')
  write(path, s)
}

// 9) Vehicles list UI
{
  const path = 'src/pages/VehiclesPage.tsx'
  let s = read(path)
  s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
  s = s.replace('export function VehiclesPage() {\n  const navigate =\n    useNavigate()', "export function VehiclesPage() {\n  const navigate =\n    useNavigate()\n  const { can } = useAuth()\n  const canManageVehicles = can('vehicles.manage')")
  s = s.replace('  async function submit(\n    event: FormEvent,\n  ) {\n    event.preventDefault()', "  async function submit(\n    event: FormEvent,\n  ) {\n    event.preventDefault()\n\n    if (!canManageVehicles) {\n      setError('Nemaš dopuštenje za dodavanje vozila.')\n      return\n    }")
  s = hideButtonsContaining(s, '<Plus', 'canManageVehicles')
  write(path, s)
}

// 10) Customer profile: prevent cross-module data leakage and hide write/delete actions.
{
  const path = 'src/pages/CustomerProfilePage.tsx'
  let s = read(path)
  s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
  s = s.replace('export function CustomerProfilePage() {\n  const navigate = useNavigate()', "export function CustomerProfilePage() {\n  const navigate = useNavigate()\n  const { can } = useAuth()\n  const canManageCustomers = can('customers.manage')\n  const canDeleteCustomers = can('customers.delete')")

  s = s.replace('          getWorkOrders(),\n          getOffers(),\n          getInvoices<CustomerInvoice>(),', "          can('workOrders.view')\n            ? getWorkOrders()\n            : Promise.resolve([] as CloudWorkOrder[]),\n          can('offers.view')\n            ? getOffers()\n            : Promise.resolve([] as Offer[]),\n          can('invoices.view')\n            ? getInvoices<CustomerInvoice>()\n            : Promise.resolve([] as CustomerInvoice[]),")

  // Filter module tabs as an extra UI layer; data is already protected above.
  s = s.replace('tabs.map(', "tabs.filter((tab) =>\n              tab.id === 'work-orders' ? can('workOrders.view') :\n              tab.id === 'offers' ? can('offers.view') :\n              tab.id === 'invoices' ? can('invoices.view') : true,\n            ).map(")

  s = hideButtonsContaining(s, '<Edit3', 'canManageCustomers')
  s = hideButtonsContaining(s, '<Trash2', 'canDeleteCustomers')
  write(path, s)
}

// 11) Vehicle details UI
{
  const path = 'src/pages/VehicleDetailsPage.tsx'
  if (fs.existsSync(path)) {
    let s = read(path)
    s = ensureNamedImport(s, '../auth/AuthProvider', ['useAuth'])
    s = s.replace('export function VehicleDetailsPage() {', "export function VehicleDetailsPage() {\n  const { can } = useAuth()\n  const canManageVehicles = can('vehicles.manage')\n  const canDeleteVehicles = can('vehicles.delete')")
    s = hideButtonsContaining(s, '<Plus', 'canManageVehicles')
    s = hideButtonsContaining(s, '<Save', 'canManageVehicles')
    s = hideButtonsContaining(s, '<Trash2', 'canDeleteVehicles')
    write(path, s)
  }
}

console.log('Complete permission cleanup applied.')
