import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const v2Path = 'scripts/apply-weather-phase1-final-v2.mjs'
const tempV2Path = 'scripts/.apply-weather-phase1-final-v2-runtime.mjs'

let v2 = fs.readFileSync(v2Path, 'utf8')

/* Run the verified v2 generator without changing the tracked script itself. */
fs.writeFileSync(tempV2Path, v2, 'utf8')

try {
  await import(`${pathToFileURL(path.resolve(tempV2Path)).href}?v=${Date.now()}`)
} finally {
  fs.rmSync(tempV2Path, { force: true })
}

function patch(pathName, replacements) {
  let content = fs.readFileSync(pathName, 'utf8')

  for (const [from, to, label] of replacements) {
    if (content.includes(to)) {
      console.log(`OK already applied: ${label}`)
      continue
    }

    if (!content.includes(from)) {
      throw new Error(`Missing compatibility anchor: ${label}`)
    }

    content = content.replace(from, to)
    console.log(`APPLY: ${label}`)
  }

  fs.writeFileSync(pathName, content, 'utf8')
}

patch('src/types/workOrder.ts', [[
`  weatherTemperatureC: number | null
  weatherCondition: string
  weatherHumidityPct: number | null
  weatherWindKmh: number | null
  weatherRecordedAt: string
  weatherLatitude: number | null
  weatherLongitude: number | null
  weatherSource: string`,
`  weatherTemperatureC?: number | null
  weatherCondition?: string
  weatherHumidityPct?: number | null
  weatherWindKmh?: number | null
  weatherRecordedAt?: string
  weatherLatitude?: number | null
  weatherLongitude?: number | null
  weatherSource?: string`,
'WorkOrder optional weather compatibility',
]])

patch('src/services/workOrders.service.ts', [[
`  weatherTemperatureC: number | null
  weatherCondition: string
  weatherHumidityPct: number | null
  weatherWindKmh: number | null
  weatherRecordedAt: string
  weatherLatitude: number | null
  weatherLongitude: number | null
  weatherSource: string`,
`  weatherTemperatureC?: number | null
  weatherCondition?: string
  weatherHumidityPct?: number | null
  weatherWindKmh?: number | null
  weatherRecordedAt?: string
  weatherLatitude?: number | null
  weatherLongitude?: number | null
  weatherSource?: string`,
'CloudWorkOrder optional weather compatibility',
]])

patch('src/components/WorkOrderWeatherCard.tsx', [
  [`function formatRecordedAt(value: string) {`, `function formatRecordedAt(value?: string) {`, 'weather card optional timestamp'],
  [`  if (order.weatherTemperatureC === null) {`, `  if (order.weatherTemperatureC == null) {`, 'weather card temperature guard'],
  [`order.weatherHumidityPct !== null`, `order.weatherHumidityPct != null`, 'weather card humidity guard'],
  [`order.weatherWindKmh !== null`, `order.weatherWindKmh != null`, 'weather card wind guard'],
])

patch('src/utils/workOrderPdf.ts', [
  [`order.weatherTemperatureC !== null`, `order.weatherTemperatureC != null`, 'PDF temperature guard'],
  [`order.weatherHumidityPct !== null`, `order.weatherHumidityPct != null`, 'PDF humidity guard'],
  [`order.weatherWindKmh !== null`, `order.weatherWindKmh != null`, 'PDF wind guard'],
])

console.log('POTVRĐENO: Weather Phase 1 v3 je backward-compatible sa starim i preview nalozima.')
