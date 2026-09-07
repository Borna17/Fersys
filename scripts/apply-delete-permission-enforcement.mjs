import fs from 'node:fs'

const guardPath = 'src/services/permissionGuard.service.ts'
const guardSource = `import { supabase } from '../lib/supabase'\nimport {\n  parseEmployeePermissions,\n  resolvePermissions,\n  type CompanyRole,\n  type MemberStatus,\n  type PermissionKey,\n} from '../auth/permissions'\n\ntype AccessRow = {\n  role: CompanyRole\n  status: MemberStatus\n  permissions: unknown\n}\n\nexport async function assertDeletePermission(\n  permission: PermissionKey,\n): Promise<void> {\n  const { data, error } = await supabase.rpc('get_current_user_access')\n  if (error) throw error\n\n  const row = (Array.isArray(data) ? data[0] : data) as AccessRow | null\n  if (!row || row.status !== 'active') {\n    throw new Error('Račun nema aktivan pristup tvrtki.')\n  }\n\n  const resolved = resolvePermissions(\n    row.role,\n    parseEmployeePermissions(row.permissions),\n  )\n\n  if (!resolved[permission]) {\n    throw new Error('Nemaš dopuštenje za brisanje ovog zapisa. Vlasnik tvrtke može uključiti ovu ovlast u postavkama zaposlenika.')\n  }\n}\n`
fs.writeFileSync(guardPath, guardSource)

const mappings = {
  'src/services/customers.service.ts': 'customers.delete',
  'src/services/workOrders.service.ts': 'workOrders.delete',
  'src/services/offers.service.ts': 'offers.delete',
  'src/services/invoices.service.ts': 'invoices.delete',
  'src/services/incomingInvoices.service.ts': 'incomingInvoices.delete',
  'src/services/inventory.service.ts': 'inventory.delete',
  'src/services/vehicles.service.ts': 'vehicles.delete',
  'src/services/deliveryNotes.service.ts': 'deliveryNotes.delete',
  'src/services/employees.service.ts': 'employees.delete',
}

for (const [path, permission] of Object.entries(mappings)) {
  if (!fs.existsSync(path)) continue
  let source = fs.readFileSync(path, 'utf8')
  if (!/export async function delete[A-Za-z0-9_]+\s*\(/.test(source)) continue

  const nl = source.includes('\r\n') ? '\r\n' : '\n'
  const guard = `await assertDeletePermission('${permission}')`
  const functionRegex = /export async function (delete[A-Za-z0-9_]+)\s*\([^)]*\)(?:\s*:\s*[^\{]+)?\s*\{/g
  let patched = false

  source = source.replace(functionRegex, (match, _functionName, offset) => {
    const tail = source.slice(offset, offset + match.length + 260)
    if (tail.includes(guard)) return match
    patched = true
    return `${match}${nl}  ${guard}`
  })

  if (patched || source.includes(guard)) {
    const importLine = `import { assertDeletePermission } from './permissionGuard.service'`
    if (!source.includes(importLine)) {
      const firstImportEnd = source.indexOf(nl)
      source = source.slice(0, firstImportEnd + nl.length) + importLine + nl + source.slice(firstImportEnd + nl.length)
    }
  }

  fs.writeFileSync(path, source)
}

console.log('Delete permission checks applied to available delete service functions.')
