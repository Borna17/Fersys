import fs from 'node:fs'

const rules = {
  'src/pages/CalendarPage.tsx': [
    "const { can } = useAuth()",
    "const canManageCalendar = can('calendar.manage')",
    "const canDeleteCalendar = can('calendar.delete')",
    "import { useAuth } from '../auth/AuthProvider'",
  ],
  'src/pages/CustomerProfilePage.tsx': [
    "const canManageCustomers = can('customers.manage')",
    "const canDeleteCustomers = can('customers.delete')",
  ],
  'src/pages/IncomingInvoicesPage.tsx': [
    "const canManageIncomingInvoices = can('incomingInvoices.manage')",
  ],
  'src/pages/VehicleDetailsPage.tsx': [
    "const { can } = useAuth()",
    "const canManageVehicles = can('vehicles.manage')",
    "const canDeleteVehicles = can('vehicles.delete')",
    "import { useAuth } from '../auth/AuthProvider'",
  ],
}

for (const [path, fragments] of Object.entries(rules)) {
  if (!fs.existsSync(path)) continue
  const source = fs.readFileSync(path, 'utf8')
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  const output = source
    .split(/\r?\n/)
    .filter((line) => !fragments.some((fragment) => line.includes(fragment)))
    .join(newline)
  fs.writeFileSync(path, output)
}

console.log('Permission cleanup post-processing complete.')
