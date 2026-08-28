import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8')
}

function replaceOnce(content, from, to, label) {
  if (content.includes(to)) {
    console.log(`OK already applied: ${label}`)
    return content
  }

  const first = content.indexOf(from)
  if (first < 0) {
    throw new Error(`Missing expected anchor: ${label}`)
  }

  const second = content.indexOf(from, first + from.length)
  if (second >= 0) {
    throw new Error(`Anchor is not unique: ${label}`)
  }

  console.log(`APPLY: ${label}`)
  return content.slice(0, first) + to + content.slice(first + from.length)
}

// 1) Weather provider: commercial key when configured, evaluation endpoint while FERSYS is still in testing.
{
  const path = 'src/services/weather.service.ts'
  let content = read(path)

  const from = `function apiConfig() {\n  const key = String(import.meta.env.VITE_OPEN_METEO_API_KEY ?? '').trim()\n\n  if (key) {\n    return {\n      baseUrl: 'https://customer-api.open-meteo.com/v1/forecast',\n      apiKey: key,\n    }\n  }\n\n  if (import.meta.env.DEV) {\n    return {\n      baseUrl: 'https://api.open-meteo.com/v1/forecast',\n      apiKey: '',\n    }\n  }\n\n  throw new Error('FERSYS Weather još nema konfiguriran komercijalni weather API ključ.')\n}`

  const to = `function apiConfig() {\n  const key = String(import.meta.env.VITE_OPEN_METEO_API_KEY ?? '').trim()\n\n  if (key) {\n    return {\n      baseUrl: 'https://customer-api.open-meteo.com/v1/forecast',\n      apiKey: key,\n    }\n  }\n\n  /*\n   * FERSYS je trenutno u evaluation/testing fazi. Open-Meteo free endpoint\n   * koristi se samo dok se ne postavi komercijalni API ključ. Prije javnog\n   * komercijalnog puštanja obavezno postaviti VITE_OPEN_METEO_API_KEY.\n   */\n  return {\n    baseUrl: 'https://api.open-meteo.com/v1/forecast',\n    apiKey: '',\n  }\n}`

  content = replaceOnce(content, from, to, 'weather evaluation/commercial provider')
  write(path, content)
}

// 2) Shared WorkOrder type used by PDF.
{
  const path = 'src/types/workOrder.ts'
  let content = read(path)

  const from = `  images: WorkOrderImage[]\n\n  status: WorkOrderStatus`
  const to = `  images: WorkOrderImage[]\n\n  weatherTemperatureC: number | null\n  weatherCondition: string\n  weatherHumidityPct: number | null\n  weatherWindKmh: number | null\n  weatherRecordedAt: string\n  weatherLatitude: number | null\n  weatherLongitude: number | null\n  weatherSource: string\n\n  status: WorkOrderStatus`

  content = replaceOnce(content, from, to, 'WorkOrder weather fields')
  write(path, content)
}

// 3) Cloud work-order service: read weather fields and attach a non-blocking snapshot after creation.
{
  const path = 'src/services/workOrders.service.ts'
  let content = read(path)

  content = replaceOnce(
    content,
    `import { getWorkOrderImagesForDisplay } from './workOrderImages.service'`,
    `import { getWorkOrderImagesForDisplay } from './workOrderImages.service'\nimport { captureCurrentWeatherSnapshot } from './weather.service'`,
    'weather service import',
  )

  content = replaceOnce(
    content,
    `  images: CloudWorkOrderImage[]\n\n  status: CloudWorkOrderStatus`,
    `  images: CloudWorkOrderImage[]\n\n  weatherTemperatureC: number | null\n  weatherCondition: string\n  weatherHumidityPct: number | null\n  weatherWindKmh: number | null\n  weatherRecordedAt: string\n  weatherLatitude: number | null\n  weatherLongitude: number | null\n  weatherSource: string\n\n  status: CloudWorkOrderStatus`,
    'CloudWorkOrder weather fields',
  )

  content = replaceOnce(
    content,
    `  images: unknown\n\n  status: CloudWorkOrderStatus`,
    `  images: unknown\n\n  weather_temperature_c: number | string | null\n  weather_condition: string | null\n  weather_humidity_pct: number | string | null\n  weather_wind_kmh: number | string | null\n  weather_recorded_at: string | null\n  weather_latitude: number | string | null\n  weather_longitude: number | string | null\n  weather_source: string | null\n\n  status: CloudWorkOrderStatus`,
    'WorkOrderRow weather columns',
  )

  content = replaceOnce(
    content,
    `    images: parseImages(row.images),\n\n    status: row.status,`,
    `    images: parseImages(row.images),\n\n    weatherTemperatureC:\n      row.weather_temperature_c === null\n        ? null\n        : Number(row.weather_temperature_c),\n    weatherCondition:\n      row.weather_condition ?? '',\n    weatherHumidityPct:\n      row.weather_humidity_pct === null\n        ? null\n        : Number(row.weather_humidity_pct),\n    weatherWindKmh:\n      row.weather_wind_kmh === null\n        ? null\n        : Number(row.weather_wind_kmh),\n    weatherRecordedAt:\n      row.weather_recorded_at ?? '',\n    weatherLatitude:\n      row.weather_latitude === null\n        ? null\n        : Number(row.weather_latitude),\n    weatherLongitude:\n      row.weather_longitude === null\n        ? null\n        : Number(row.weather_longitude),\n    weatherSource:\n      row.weather_source ?? '',\n\n    status: row.status,`,
    'map work-order weather snapshot',
  )

  content = replaceOnce(
    content,
    `export async function createWorkOrder(\n  input: CreateWorkOrderInput,\n): Promise<CloudWorkOrder> {`,
    `async function attachWeatherSnapshot(\n  workOrderId: string,\n) {\n  try {\n    const snapshot =\n      await captureCurrentWeatherSnapshot()\n\n    const { error } = await supabase\n      .from('work_orders')\n      .update({\n        weather_temperature_c:\n          snapshot.temperatureC,\n        weather_condition:\n          snapshot.condition,\n        weather_humidity_pct:\n          snapshot.humidityPct,\n        weather_wind_kmh:\n          snapshot.windKmh,\n        weather_recorded_at:\n          snapshot.recordedAt,\n        weather_latitude:\n          snapshot.latitude,\n        weather_longitude:\n          snapshot.longitude,\n        weather_source:\n          snapshot.source,\n      })\n      .eq('id', workOrderId)\n\n    if (error) {\n      throw error\n    }\n  } catch (error) {\n    /* Weather je dodatni kontekst i nikada ne smije blokirati spremanje naloga. */\n    console.warn(\n      '[FERSYS Weather] Snapshot radnog naloga nije spremljen:',\n      error,\n    )\n  }\n}\n\nexport async function createWorkOrder(\n  input: CreateWorkOrderInput,\n): Promise<CloudWorkOrder> {`,
    'non-blocking weather snapshot helper',
  )

  content = replaceOnce(
    content,
    `  workOrderVersionById.set(\n    created.id,\n    created.updatedAt,\n  )\n\n  return created`,
    `  workOrderVersionById.set(\n    created.id,\n    created.updatedAt,\n  )\n\n  /*\n   * Nalog je već sigurno spremljen. Vrijeme dohvaćamo u pozadini kako GPS ili\n   * weather API ne bi usporavali korisnika na terenu.\n   */\n  void attachWeatherSnapshot(\n    created.id,\n  )\n\n  return created`,
    'start weather snapshot after create',
  )

  write(path, content)
}

// 4) Dashboard weather card.
{
  const path = 'src/pages/DashboardPage.tsx'
  let content = read(path)

  content = replaceOnce(
    content,
    `import MissionCenter from '../components/MissionCenter'`,
    `import MissionCenter from '../components/MissionCenter'\nimport WeatherDashboardCard from '../components/WeatherDashboardCard'`,
    'Dashboard weather component import',
  )

  content = replaceOnce(
    content,
    `      {quickActions.length >\n        0 && (`,
    `      <WeatherDashboardCard />\n\n      {quickActions.length >\n        0 && (`,
    'Dashboard weather card render',
  )

  write(path, content)
}

// 5) Work-order details weather snapshot card.
{
  const path = 'src/pages/WorkOrderDetailsPage.tsx'
  let content = read(path)

  content = replaceOnce(
    content,
    `import FersysLoader from '../components/FersysLoader'`,
    `import FersysLoader from '../components/FersysLoader'\nimport WorkOrderWeatherCard from '../components/WorkOrderWeatherCard'`,
    'Work-order weather card import',
  )

  content = replaceOnce(
    content,
    `        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">`,
    `        <WorkOrderWeatherCard order={order} />\n\n        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">`,
    'Work-order weather card render',
  )

  write(path, content)
}

// 6) PDF snapshot + make sure continuation pages really use up to 15 materials.
{
  const path = 'src/utils/workOrderPdf.ts'
  let content = read(path)

  const priorityRow = `        <div class="meta-row">\n          <span>Prioritet</span>\n          <strong>\${esc(order.priority || '—')}</strong>\n        </div>\n\n        <div class="meta-row">\n          <span>Izvršitelji</span>`

  const priorityWeatherRow = `        <div class="meta-row">\n          <span>Prioritet</span>\n          <strong>\${esc(order.priority || '—')}</strong>\n        </div>\n\n        \${\n          order.weatherTemperatureC !== null\n            ? \`\n              <div class="meta-row">\n                <span>Vrijeme na terenu</span>\n                <strong>\${esc(\n                  \`\${Math.round(order.weatherTemperatureC)} °C · \${order.weatherCondition || '—'}\`,\n                )}</strong>\n              </div>\n\n              <div class="meta-row">\n                <span>Vlaga / vjetar</span>\n                <strong>\${esc(\n                  \`\${\n                    order.weatherHumidityPct !== null\n                      ? \`\${Math.round(order.weatherHumidityPct)} %\`\n                      : '—'\n                  } · \${\n                    order.weatherWindKmh !== null\n                      ? \`\${Math.round(order.weatherWindKmh)} km/h\`\n                      : '—'\n                  }\`,\n                )}</strong>\n              </div>\n            \`\n            : ''\n        }\n\n        <div class="meta-row">\n          <span>Izvršitelji</span>`

  content = replaceOnce(
    content,
    priorityRow,
    priorityWeatherRow,
    'PDF weather snapshot rows',
  )

  const paginationPatterns = [
    ['const nextMaterialLimit = compact ? 13 : 10', 'const nextMaterialLimit = 15'],
    ['const nextMaterialLimit = 10', 'const nextMaterialLimit = 15'],
    ['const nextMaterialLimit = compact ? 15 : 15', 'const nextMaterialLimit = 15'],
  ]

  if (!content.includes('const nextMaterialLimit = 15')) {
    let changed = false
    for (const [from, to] of paginationPatterns) {
      if (content.includes(from)) {
        content = content.replace(from, to)
        changed = true
        console.log('APPLY: PDF continuation material limit = 15')
        break
      }
    }

    if (!changed) {
      console.warn('WARN: nextMaterialLimit anchor was not found; pagination code may already use a different dynamic implementation.')
    }
  } else {
    console.log('OK already applied: PDF continuation material limit = 15')
  }

  write(path, content)
}

// Final static verification before TypeScript/Vite build.
const requiredChecks = [
  ['src/services/workOrders.service.ts', 'weatherTemperatureC'],
  ['src/services/workOrders.service.ts', 'attachWeatherSnapshot'],
  ['src/pages/DashboardPage.tsx', '<WeatherDashboardCard />'],
  ['src/pages/WorkOrderDetailsPage.tsx', '<WorkOrderWeatherCard order={order} />'],
  ['src/utils/workOrderPdf.ts', 'Vrijeme na terenu'],
  ['src/types/workOrder.ts', 'weatherRecordedAt'],
]

for (const [path, expected] of requiredChecks) {
  if (!read(path).includes(expected)) {
    throw new Error(`Verification failed: ${path} does not contain ${expected}`)
  }
}

console.log('POTVRĐENO: FERSYS Weather Phase 1 je povezan s nalogom, Dashboardom i PDF-om.')
