import fs from 'node:fs'

// Applies the actual router wiring and is safe to run repeatedly.
const path = 'src/router/AppRouter.tsx'
let source = fs.readFileSync(path, 'utf8')

if (!source.includes("../admin/AdminAuditPage")) {
  const anchor = "const AdminRewardsPage = lazy(\n  () => import('../admin/AdminRewardsPage').then((module) => ({ default: module.AdminRewardsPage })),\n)"
  if (!source.includes(anchor)) throw new Error('AdminRewardsPage lazy anchor nije pronađen.')
  source = source.replace(
    anchor,
    `${anchor}\nconst AdminAuditPage = lazy(\n  () => import('../admin/AdminAuditPage'),\n)\nconst AdminSystemPage = lazy(\n  () => import('../admin/AdminSystemPage'),\n)`,
  )
}

if (!source.includes('path="/admin/audit"')) {
  const anchor = '          <Route path="/admin/rewards" element={<AdminRewardsPage />} />'
  if (!source.includes(anchor)) throw new Error('Admin route anchor nije pronađen.')
  source = source.replace(
    anchor,
    `          <Route path="/admin/audit" element={<AdminAuditPage />} />\n          <Route path="/admin/system" element={<AdminSystemPage />} />\n${anchor}`,
  )
}

fs.writeFileSync(path, source)
console.log('Admin audit/system rute su dodane.')
