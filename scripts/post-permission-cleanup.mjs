import fs from 'node:fs'

const removals = {
  'src/pages/CalendarPage.tsx': [
    "  const canManageCalendar = can('calendar.manage')\n",
    "  const canDeleteCalendar = can('calendar.delete')\n",
  ],
  'src/pages/CustomerProfilePage.tsx': [
    "  const canManageCustomers = can('customers.manage')\n",
    "  const canDeleteCustomers = can('customers.delete')\n",
  ],
  'src/pages/IncomingInvoicesPage.tsx': [
    "  const canManageIncomingInvoices = can('incomingInvoices.manage')\n",
  ],
  'src/pages/VehicleDetailsPage.tsx': [
    "  const canManageVehicles = can('vehicles.manage')\n",
    "  const canDeleteVehicles = can('vehicles.delete')\n",
  ],
}

for (const [path, lines] of Object.entries(removals)) {
  if (!fs.existsSync(path)) continue
  let source = fs.readFileSync(path, 'utf8')
  for (const line of lines) source = source.replace(line, '')
  fs.writeFileSync(path, source)
}

console.log('Permission cleanup post-processing complete.')
