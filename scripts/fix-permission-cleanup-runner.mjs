import fs from 'node:fs'

const path = 'scripts/apply-permission-cleanup.mjs'
let source = fs.readFileSync(path, 'utf8')

// Generic service functions such as createInvoice<T>() need to be matched too.
source = source.replace(
  /const re = new RegExp\(`\(export async function \$\{functionName\}.*?`\)\n/,
  "const re = new RegExp(`(export async function ${functionName}(?:\\\\s*<[^>{}]+>)?\\\\s*\\\\([\\\\s\\\\S]*?\\\\)\\\\s*(?::\\\\s*Promise<[^>]+>)?\\\\s*\\\\{)`)\n",
)

// Do not mutate JSX start tags using the old generic button helper. It can
// mistake the > from arrow functions in JSX attributes for the tag ending.
source = source
  .split('\n')
  .filter((line) => !line.trim().startsWith('s = hideButtonsContaining('))
  .join('\n')

// These UI-only constants were originally meant for generic button hiding.
// The security boundary is enforced by route + service guards; remove only
// declarations that would otherwise be unused after disabling unsafe JSX edits.
for (const declaration of [
  "  const canManageCalendar = can('calendar.manage')\n",
  "  const canDeleteCalendar = can('calendar.delete')\n",
  "  const canManageCustomers = can('customers.manage')\n  const canDeleteCustomers = can('customers.delete')\n",
  "  const canManageIncomingInvoices = can('incomingInvoices.manage')\n",
  "  const canManageVehicles = can('vehicles.manage')\n  const canDeleteVehicles = can('vehicles.delete')\n",
]) {
  source = source.replace(declaration, '')
}

fs.writeFileSync(path, source)
console.log('Permission cleanup runner made build-safe.')
