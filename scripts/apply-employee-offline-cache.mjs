import fs from 'node:fs'

const path = 'src/services/employees.service.ts'
let source = fs.readFileSync(path, 'utf8')

const importNeedle = "import { assertDeletePermission } from './permissionGuard.service'\n"
if (!source.includes("from './runtimeCache.service'")) {
  source = source.replace(importNeedle, `${importNeedle}import { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'\n`)
}

const oldBlock = `export async function getEmployees(): Promise<\n  CompanyEmployee[]\n> {\n  const { data, error } = await supabase.rpc(\n    'get_company_employees',\n  )\n\n  if (error) {\n    throw new Error(\n      formatSupabaseError(error),\n    )\n  }\n\n  return ((data ?? []) as EmployeeRow[]).map(\n    mapEmployee,\n  )\n}`

const newBlock = `export async function getEmployees(): Promise<\n  CompanyEmployee[]\n> {\n  const companyId = await getCurrentCompanyId()\n  const cacheKey = \`fersys-cache:employees:\${companyId}\`\n  const fresh = readRuntimeCache<CompanyEmployee[]>(cacheKey, 30000)\n  if (fresh) return fresh\n\n  const { data, error } = await supabase.rpc(\n    'get_company_employees',\n  )\n\n  if (error) {\n    const stale = readRuntimeCache<CompanyEmployee[]>(cacheKey, Number.MAX_SAFE_INTEGER, true)\n    if (stale) return stale\n    throw new Error(\n      formatSupabaseError(error),\n    )\n  }\n\n  const mapped = ((data ?? []) as EmployeeRow[]).map(\n    mapEmployee,\n  )\n  writeRuntimeCache(cacheKey, mapped)\n  return mapped\n}`

if (!source.includes(oldBlock)) throw new Error('getEmployees block not found')
source = source.replace(oldBlock, newBlock)
fs.writeFileSync(path, source)
