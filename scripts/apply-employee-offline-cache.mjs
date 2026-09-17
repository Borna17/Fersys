import fs from 'node:fs'

const path = 'src/services/employees.service.ts'
let source = fs.readFileSync(path, 'utf8')

const importNeedle = "import { assertDeletePermission } from './permissionGuard.service'"
if (!source.includes("from './runtimeCache.service'")) {
  source = source.replace(importNeedle, `${importNeedle}\nimport { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'`)
}

const start = source.indexOf('export async function getEmployees(): Promise<')
const end = source.indexOf('\nexport async function getInvitations()', start)
if (start < 0 || end < 0) throw new Error('getEmployees boundaries not found')

const newBlock = `export async function getEmployees(): Promise<
  CompanyEmployee[]
> {
  const companyId = await getCurrentCompanyId()
  const cacheKey = \`fersys-cache:employees:\${companyId}\`
  const fresh = readRuntimeCache<CompanyEmployee[]>(cacheKey, 30000)
  if (fresh) return fresh

  const { data, error } = await supabase.rpc(
    'get_company_employees',
  )

  if (error) {
    const stale = readRuntimeCache<CompanyEmployee[]>(cacheKey, Number.MAX_SAFE_INTEGER, true)
    if (stale) return stale
    throw new Error(
      formatSupabaseError(error),
    )
  }

  const mapped = ((data ?? []) as EmployeeRow[]).map(
    mapEmployee,
  )
  writeRuntimeCache(cacheKey, mapped)
  return mapped
}
`

source = source.slice(0, start) + newBlock + source.slice(end + 1)
source = source.split('\n').map((line) => line.trimEnd()).join('\n')
fs.writeFileSync(path, source)
