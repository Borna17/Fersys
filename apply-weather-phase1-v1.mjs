import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8')
}

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Nije pronađen očekivani dio koda: ${label}`)
  }
  return source.replace(from, to)
}

// 1) Cloud work-order service: capture immutable weather on CREATE.
{
  const path = 'src/services/workOrders.service.ts'
  let s = read(path)

  if (!s.includes("from './weather.service'")) {
    s = replaceOnce(
      s,
      "import { getWorkOrderImagesForDisplay } from './workOrderImages.service'",
      "import { getWorkOrderImagesForDisplay } from './workOrderImages.service'\nimport {\n  captureCurrentWeatherSnapshot,\n  type WeatherSnapshot,\n} from './weather.service'",
      'weather import u workOrders.service.ts',
    )
  }

  if (!s.includes('weather: WeatherSnapshot | null')) {
    s = replaceOnce(
      s,
      '  images: CloudWorkOrderImage[]\n\n  status: CloudWorkOrderStatus',
      '  images: CloudWorkOrderImage[]\n\n  weather: WeatherSnapshot | null\n\n  status: CloudWorkOrderStatus',
      'CloudWorkOrder weather polje',
    )
  }

  if (!s.includes('weather_temperature_c: number | string | null')) {
    s = replaceOnce(
      s,
      '  images: unknown\n\n  status: CloudWorkOrderStatus',
      `  images: unknown\n\n  weather_temperature_c: number | string | null\n  weather_condition: string | null\n  weather_humidity_pct: number | string | null\n  weather_wind_kmh: number | string | null\n  weather_recorded_at: string | null\n  weather_latitude: number | string | null\n  weather_longitude: number | string | null\n  weather_source: string | null\n\n  status: CloudWorkOrderStatus`,
      'WorkOrderRow weather stupci',
    )
  }

  if (!s.includes('weather: row.weather_recorded_at')) {
    s = replaceOnce(
      s,
      '    images: parseImages(row.images),\n\n    status: row.status,',
      `    images: parseImages(row.images),\n\n    weather: row.weather_recorded_at\n      ? {\n          temperatureC: Number(row.weather_temperature_c) || 0,\n          condition: row.weather_condition ?? '—',\n          humidityPct: row.weather_humidity_pct == null\n            ? null\n            : Number(row.weather_humidity_pct),\n          windKmh: row.weather_wind_kmh == null\n            ? null\n            : Number(row.weather_wind_kmh),\n          recordedAt: row.weather_recorded_at,\n          latitude: Number(row.weather_latitude) || 0,\n          longitude: Number(row.weather_longitude) || 0,\n          source: 'open-meteo',\n        }\n      : null,\n\n    status: row.status,`,
      'mapWorkOrder weather',
    )
  }

  if (!s.includes('function weatherDatabasePayload(')) {
    const marker = 'export async function getWorkOrders(): Promise<'
    const helper = `function weatherDatabasePayload(\n  weather: WeatherSnapshot | null,\n) {\n  return {\n    weather_temperature_c: weather?.temperatureC ?? null,\n    weather_condition: weather?.condition ?? null,\n    weather_humidity_pct: weather?.humidityPct ?? null,\n    weather_wind_kmh: weather?.windKmh ?? null,\n    weather_recorded_at: weather?.recordedAt ?? null,\n    weather_latitude: weather?.latitude ?? null,\n    weather_longitude: weather?.longitude ?? null,\n    weather_source: weather?.source ?? null,\n  }\n}\n\n`
    s = replaceOnce(s, marker, helper + marker, 'weatherDatabasePayload helper')
  }

  if (!s.includes('const weatherSnapshot =')) {
    s = replaceOnce(
      s,
      '  const orderNumber =\n    await generateOrderNumber(companyId)\n',
      `  const orderNumber =\n    await generateOrderNumber(companyId)\n\n  // Vrijeme je dodatni podatak: nalog se mora spremiti i ako GPS/API nije dostupan.\n  const weatherSnapshot =\n    await captureCurrentWeatherSnapshot()\n      .catch((error) => {\n        console.warn('[FERSYS Weather] Vrijeme nije spremljeno uz nalog:', error)\n        return null\n      })\n`,
      'capture weather pri kreiranju naloga',
    )
  }

  if (!s.includes('...weatherDatabasePayload(weatherSnapshot)')) {
    s = replaceOnce(
      s,
      '      created_by: user?.id ?? null,\n      ...createDatabasePayload(input),',
      '      created_by: user?.id ?? null,\n      ...createDatabasePayload(input),\n      ...weatherDatabasePayload(weatherSnapshot),',
      'weather payload pri INSERT-u',
    )
  }

  write(path, s)
}

// 2) Shared WorkOrder type used by PDF.
{
  const path = 'src/types/workOrder.ts'
  let s = read(path)

  if (!s.includes('export type WorkOrderWeather =')) {
    s = replaceOnce(
      s,
      'export type WorkOrderImage = {\n  id: string\n  name: string\n  dataUrl: string\n}\n',
      `export type WorkOrderImage = {\n  id: string\n  name: string\n  dataUrl: string\n}\n\nexport type WorkOrderWeather = {\n  temperatureC: number\n  condition: string\n  humidityPct: number | null\n  windKmh: number | null\n  recordedAt: string\n  latitude: number\n  longitude: number\n  source: string\n}\n`,
      'WorkOrderWeather type',
    )
  }

  if (!s.includes('  weather?: WorkOrderWeather | null')) {
    s = replaceOnce(
      s,
      '  images: WorkOrderImage[]\n\n  status: WorkOrderStatus',
      '  images: WorkOrderImage[]\n\n  weather?: WorkOrderWeather | null\n\n  status: WorkOrderStatus',
      'WorkOrder weather property',
    )
  }

  write(path, s)
}

// 3) PDF: show the captured conditions in PODACI NALOGA.
{
  const path = 'src/utils/workOrderPdf.ts'
  let s = read(path)

  if (!s.includes('<span>Vrijeme na lokaciji</span>')) {
    const from = `        <div class=\"meta-row\">\n          <span>Prioritet</span>\n          <strong>\${esc(order.priority || '—')}</strong>\n        </div>\n\n        <div class=\"meta-row\">\n          <span>Izvršitelji</span>`
    const to = `        <div class=\"meta-row\">\n          <span>Prioritet</span>\n          <strong>\${esc(order.priority || '—')}</strong>\n        </div>\n\n        \${\n          order.weather\n            ? \`\n              <div class=\"meta-row\">\n                <span>Vrijeme na lokaciji</span>\n                <strong>\${esc(\n                  \`\${number(order.weather.temperatureC)} °C · \${order.weather.condition}\`,\n                )}</strong>\n              </div>\n              <div class=\"meta-row\">\n                <span>Vlaga / vjetar</span>\n                <strong>\${esc(\n                  \`\${order.weather.humidityPct ?? '—'}% · \${\n                    order.weather.windKmh == null\n                      ? '—'\n                      : \`\${number(order.weather.windKmh)} km/h\`\n                  }\`,\n                )}</strong>\n              </div>\n            \`\n            : ''\n        }\n\n        <div class=\"meta-row\">\n          <span>Izvršitelji</span>`
    s = replaceOnce(s, from, to, 'PDF weather prikaz')
  }

  write(path, s)
}

// 4) Dashboard: compact current-weather card.
{
  const path = 'src/pages/DashboardPage.tsx'
  let s = read(path)

  if (!s.includes('CloudSun,')) {
    s = replaceOnce(s, '  Clock3,\n', '  Clock3,\n  CloudSun,\n', 'CloudSun import')
  }

  if (!s.includes("from '../services/weather.service'")) {
    s = replaceOnce(
      s,
      "} from '../services/dashboardFast.service'\n",
      "} from '../services/dashboardFast.service'\nimport {\n  getTodayWeatherForCurrentLocation,\n  type DailyWeather,\n} from '../services/weather.service'\n",
      'Dashboard weather import',
    )
  }

  if (!s.includes('const [\n    weather,')) {
    const marker = '  useEffect(() => {\n    const cached ='
    const addition = `  const [\n    weather,\n    setWeather,\n  ] = useState<DailyWeather | null>(null)\n\n  const [\n    weatherLoading,\n    setWeatherLoading,\n  ] = useState(false)\n\n  useEffect(() => {\n    let cancelled = false\n\n    void (async () => {\n      try {\n        setWeatherLoading(true)\n        const next = await getTodayWeatherForCurrentLocation()\n        if (!cancelled) setWeather(next)\n      } catch (error) {\n        console.warn('[FERSYS Weather] Dashboard prognoza nije dostupna:', error)\n      } finally {\n        if (!cancelled) setWeatherLoading(false)\n      }\n    })()\n\n    return () => {\n      cancelled = true\n    }\n  }, [])\n\n`
    s = replaceOnce(s, marker, addition + marker, 'Dashboard weather state/effect')
  }

  if (!s.includes('DANAŠNJE VRIJEME')) {
    const marker = '      {quickActions.length >\n        0 && ('
    const card = `      {(weather || weatherLoading) && (\n        <section className=\"min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-5\">\n          <div className=\"flex items-center gap-3\">\n            <span className=\"grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-300\">\n              <CloudSun size={21} />\n            </span>\n\n            <div className=\"min-w-0 flex-1\">\n              <p className=\"text-[10px] font-black uppercase tracking-[0.18em] text-slate-500\">\n                DANAŠNJE VRIJEME\n              </p>\n\n              {weather ? (\n                <>\n                  <p className=\"mt-1 text-lg font-black text-white\">\n                    {Math.round(weather.temperatureC)} °C · {weather.condition}\n                  </p>\n                  <p className=\"mt-1 text-xs text-slate-400\">\n                    {weather.minC == null || weather.maxC == null\n                      ? 'Prognoza za trenutnu lokaciju'\n                      : \`Min \${Math.round(weather.minC)} °C · Max \${Math.round(weather.maxC)} °C\`}\n                    {weather.precipitationProbabilityPct == null\n                      ? ''\n                      : \` · Kiša \${Math.round(weather.precipitationProbabilityPct)}%\`}\n                  </p>\n                </>\n              ) : (\n                <p className=\"mt-1 text-sm font-bold text-slate-400\">\n                  Učitavam vrijeme za trenutnu lokaciju...\n                </p>\n              )}\n            </div>\n          </div>\n        </section>\n      )}\n\n`
    s = replaceOnce(s, marker, card + marker, 'Dashboard weather card')
  }

  write(path, s)
}

const checks = [
  ['src/services/workOrders.service.ts', '...weatherDatabasePayload(weatherSnapshot)'],
  ['src/types/workOrder.ts', 'weather?: WorkOrderWeather | null'],
  ['src/utils/workOrderPdf.ts', '<span>Vrijeme na lokaciji</span>'],
  ['src/pages/DashboardPage.tsx', 'DANAŠNJE VRIJEME'],
]

for (const [path, needle] of checks) {
  if (!read(path).includes(needle)) {
    throw new Error(`Završna provjera nije prošla: ${path} -> ${needle}`)
  }
}

console.log('POTVRĐENO: FERSYS Weather faza 1 je spojena u kod.')
console.log('POTVRĐENO: Novi radni nalog pokušava spremiti temperaturu, uvjete, vlagu, vjetar, GPS i vrijeme mjerenja.')
console.log('POTVRĐENO: PDF prikazuje spremljene vremenske uvjete, a Dashboard ima karticu vremena.')
console.log('NAPOMENA: U productionu postavi VITE_OPEN_METEO_API_KEY za komercijalni Open-Meteo endpoint.')
