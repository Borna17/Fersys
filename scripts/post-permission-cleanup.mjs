import fs from 'node:fs'

function stripLine(source, code) {
  return source.replace(
    new RegExp(`^[\\t ]*${code.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\r?$`, 'gm'),
    '',
  )
}

const removals = {
  'src/pages/CalendarPage.tsx': [
    "const canDeleteCalendar = can('calendar.delete')",
  ],
  'src/pages/CustomerProfilePage.tsx': [
    "const canManageCustomers = can('customers.manage')",
    "const canDeleteCustomers = can('customers.delete')",
  ],
  'src/pages/IncomingInvoicesPage.tsx': [
    "const canManageIncomingInvoices = can('incomingInvoices.manage')",
  ],
  'src/pages/VehicleDetailsPage.tsx': [
    "const canManageVehicles = can('vehicles.manage')",
    "const canDeleteVehicles = can('vehicles.delete')",
  ],
}

for (const [path, lines] of Object.entries(removals)) {
  if (!fs.existsSync(path)) continue
  let source = fs.readFileSync(path, 'utf8')
  for (const line of lines) source = stripLine(source, line)

  if (path === 'src/pages/VehicleDetailsPage.tsx') {
    source = source.replace(/^\s*const \{ can \} = useAuth\(\)\r?\n/m, '')
    if (!source.includes('useAuth(')) {
      source = source.replace(/^import \{ useAuth \} from '\.\.\/auth\/AuthProvider'\r?\n/m, '')
    }
  }

  fs.writeFileSync(path, source)
}

console.log('Permission cleanup post-processing complete.')
