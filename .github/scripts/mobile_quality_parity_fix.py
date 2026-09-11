from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

Path('src/components/AppLanguageRuntime.tsx').write_text(r'''import { useEffect } from 'react'
import { getAppLanguage, translateUiText, type AppLanguage } from '../services/appLanguage.service'

const originals = new WeakMap<Text, string>()

function applyLanguage(language: AppLanguage) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    const parent = text.parentElement
    const current = text.nodeValue ?? ''
    if (!originals.has(text)) originals.set(text, current)
    const original = originals.get(text) ?? current
    if (parent && !['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName) && original.trim()) {
      const translated = translateUiText(original.trim(), language)
      const target = `${original.match(/^\s*/)?.[0] ?? ''}${translated}${original.match(/\s*$/)?.[0] ?? ''}`
      if (text.nodeValue !== target) text.nodeValue = target
    }
    node = walker.nextNode()
  }
}

export default function AppLanguageRuntime() {
  useEffect(() => {
    let language = getAppLanguage()
    document.documentElement.lang = language
    let queued = false
    const apply = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        applyLanguage(language)
      })
    }
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    const onLanguage = (event: Event) => {
      language = (event as CustomEvent<AppLanguage>).detail ?? getAppLanguage()
      document.documentElement.lang = language
      apply()
    }
    window.addEventListener('fersys:language-changed', onLanguage)
    apply()
    return () => {
      observer.disconnect()
      window.removeEventListener('fersys:language-changed', onLanguage)
    }
  }, [])
  return null
}
''', encoding='utf-8')

Path('src/services/runtimeCache.service.ts').write_text(r'''type CacheEnvelope<T> = { savedAt: number; value: T }

export function readRuntimeCache<T>(key: string, maxAgeMs: number, allowStale = false): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEnvelope<T>
    if (!parsed || typeof parsed.savedAt !== 'number') return null
    if (!allowStale && Date.now() - parsed.savedAt > maxAgeMs) return null
    return parsed.value
  } catch {
    return null
  }
}

export function writeRuntimeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies CacheEnvelope<T>))
  } catch {
    // Cache never blocks normal app flow.
  }
}
''', encoding='utf-8')

path = Path('src/main.tsx')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "import ActivityTracker from './components/ActivityTracker'\n", "import ActivityTracker from './components/ActivityTracker'\nimport AppLanguageRuntime from './components/AppLanguageRuntime'\n", 'main language import')
text = replace_once(text, "      <App />\n      <ActivityTracker />", "      <App />\n      <AppLanguageRuntime />\n      <ActivityTracker />", 'main language mount')
path.write_text(text, encoding='utf-8')

path = Path('src/pages/AccountPage.tsx')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "import {\n  useAuth,\n} from '../auth/AuthProvider'\n", "import {\n  useAuth,\n} from '../auth/AuthProvider'\nimport AppLanguageSelector from '../components/AppLanguageSelector'\n", 'account language import')
text = replace_once(text, "      </header>\n\n      <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">", "      </header>\n\n      <AppLanguageSelector />\n\n      <div className=\"grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">", 'account language card')
path.write_text(text, encoding='utf-8')

path = Path('src/pages/CustomersPage.tsx')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "  MapPin,\n", "  LocateFixed,\n  MapPin,\n", 'customer location icon')
text = replace_once(text, "  const [notes, setNotes] = useState('')\n", "  const [notes, setNotes] = useState('')\n  const [isLocating, setIsLocating] = useState(false)\n", 'customer locating state')
anchor = """  async function handleAddCustomer(\n    event: FormEvent<HTMLFormElement>,\n  ) {"""
helper = r'''  async function fillCurrentLocation() {
    if (!navigator.geolocation) {
      window.alert('Ovaj uređaj ne podržava dohvat lokacije.')
      return
    }
    try {
      setIsLocating(true)
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 15000,
        })
      })
      const { latitude, longitude } = position.coords
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1&accept-language=hr`)
      if (!response.ok) throw new Error('Adresu nije moguće dohvatiti.')
      const result = await response.json() as { address?: Record<string, string> }
      const address = result.address ?? {}
      const road = address.road || address.pedestrian || address.residential || address.footway || ''
      const house = address.house_number || ''
      const foundCity = address.city || address.town || address.village || address.municipality || address.county || ''
      const foundPostal = address.postcode || ''
      if (road || house) setStreet([road, house].filter(Boolean).join(' '))
      if (foundCity) setCity(foundCity)
      if (foundPostal) setPostalCode(foundPostal.replace(/\D/g, '').slice(0, 5))
      if (!road && !foundCity) window.alert('Lokacija je pronađena, ali adresu treba ručno dopuniti.')
    } catch (error) {
      window.alert(error instanceof Error ? `Lokacija nije dohvaćena: ${error.message}` : 'Lokacija nije dohvaćena.')
    } finally {
      setIsLocating(false)
    }
  }

'''+anchor
text = replace_once(text, anchor, helper, 'customer location helper')
old_field = r'''                  <Field
                    label="Ulica i kućni broj"
                    className="md:col-span-2"
                  >
                    <input
                      value={street}
                      onChange={(event) =>
                        setStreet(
                          event.target.value,
                        )
                      }
                      placeholder="Ulica i kućni broj"
                      className={inputClass}
                    />
                  </Field>'''
new_field = r'''                  <Field
                    label="Ulica i kućni broj"
                    className="md:col-span-2"
                  >
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={() => void fillCurrentLocation()}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 text-xs font-black text-blue-300 disabled:opacity-50"
                      >
                        <LocateFixed size={16} className={isLocating ? 'animate-pulse' : ''} />
                        {isLocating ? 'Tražim lokaciju...' : 'Trenutna lokacija'}
                      </button>
                    </div>
                    <input
                      value={street}
                      onChange={(event) =>
                        setStreet(
                          event.target.value,
                        )
                      }
                      placeholder="Ulica i kućni broj"
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Automatsku adresu možeš ručno ispraviti prije spremanja.</p>
                  </Field>'''
text = replace_once(text, old_field, new_field, 'customer location field')
path.write_text(text, encoding='utf-8')

path = Path('src/services/customers.service.ts')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "import { assertCanCreate } from '../subscription/subscription.service'\n", "import { assertCanCreate } from '../subscription/subscription.service'\nimport { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'\n", 'customer cache import')
old_get = r'''export async function getCustomers():
Promise<Customer[]> {
  const { data, error } =
    await supabase
      .from('customers')
      .select('*')
      .is(
        'deleted_at',
        null,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

  if (error) {
    throw error
  }

  return (
    (data ?? []) as CustomerRow[]
  ).map(mapCustomer)
}'''
new_get = r'''export async function getCustomers():
Promise<Customer[]> {
  const companyId = await getCurrentCompanyId()
  const cacheKey = `fersys-cache:customers:${companyId}`
  const fresh = readRuntimeCache<Customer[]>(cacheKey, 30000)
  if (fresh) return fresh

  const { data, error } = await supabase
    .from('customers')
    .select('id,company_id,type,name,contact_person,logo_data_url,oib,tax_id,phone,email,street,city,postal_code,iban,notes,work_orders_count,total_spent,status,created_at,updated_at,deleted_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    const stale = readRuntimeCache<Customer[]>(cacheKey, Number.MAX_SAFE_INTEGER, true)
    if (stale) return stale
    throw error
  }

  const mapped = ((data ?? []) as CustomerRow[]).map(mapCustomer)
  writeRuntimeCache(cacheKey, mapped)
  return mapped
}'''
text = replace_once(text, old_get, new_get, 'customer cached list')
path.write_text(text, encoding='utf-8')

path = Path('src/services/workOrders.service.ts')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "import { captureCurrentWeatherSnapshot } from './weather.service'\n", "import { captureCurrentWeatherSnapshot } from './weather.service'\nimport { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'\n", 'work order cache import')
old_get_wo = r'''export async function getWorkOrders(): Promise<
  CloudWorkOrder[]
> {
  const { data, error } = await supabase.rpc(
    'get_secure_work_orders',
  )

  if (error) {
    throw error
  }

  return ((data ?? []) as WorkOrderRow[]).map(
    mapWorkOrder,
  )
}'''
new_get_wo = r'''export async function getWorkOrders(): Promise<
  CloudWorkOrder[]
> {
  const companyId = await getCurrentCompanyId()
  const cacheKey = `fersys-cache:work-orders:${companyId}`
  const fresh = readRuntimeCache<CloudWorkOrder[]>(cacheKey, 15000)
  if (fresh) return fresh

  const { data, error } = await supabase.rpc('get_secure_work_orders')
  if (error) {
    const stale = readRuntimeCache<CloudWorkOrder[]>(cacheKey, Number.MAX_SAFE_INTEGER, true)
    if (stale) return stale
    throw error
  }

  const mapped = ((data ?? []) as WorkOrderRow[]).map(mapWorkOrder)
  writeRuntimeCache(cacheKey, mapped)
  return mapped
}'''
text = replace_once(text, old_get_wo, new_get_wo, 'work order cached list')
path.write_text(text, encoding='utf-8')

print('location language performance patch applied')
