from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# Notify the investor when a work order is completed. Notification failure must
# never block saving the work order itself.
path = Path('src/services/workOrders.service.ts')
text = path.read_text(encoding='utf-8')
old = """  workOrderVersionById.set(\n    updated.id,\n    updated.updatedAt,\n  )\n\n  return updated\n}"""
new = """  workOrderVersionById.set(\n    updated.id,\n    updated.updatedAt,\n  )\n\n  if (\n    input.status === 'Završen' &&\n    existing.status !== 'Završen'\n  ) {\n    void supabase.functions.invoke(\n      'field-service-customer-notify',\n      {\n        body: {\n          workOrderId,\n          eventType: 'work_completed',\n        },\n      },\n    ).then(({ error: notificationError }) => {\n      if (notificationError) {\n        console.warn(\n          '[FERSYS] Radni nalog je spremljen, ali obavijest investitoru nije poslana:',\n          notificationError,\n        )\n      }\n    }).catch((notificationError) => {\n      console.warn(\n        '[FERSYS] Radni nalog je spremljen, ali obavijest investitoru nije poslana:',\n        notificationError,\n      )\n    })\n  }\n\n  return updated\n}"""
text = replace_once(text, old, new, 'completion notification')
path.write_text(text, encoding='utf-8')

# Clear short list caches after mutations so a freshly changed row never looks
# stale for 15/30 seconds.
path = Path('src/services/runtimeCache.service.ts')
text = path.read_text(encoding='utf-8')
text += """\nexport function clearRuntimeCache(key: string) {\n  try {\n    localStorage.removeItem(key)\n  } catch {\n    // Cache cleanup never blocks app flow.\n  }\n}\n\nexport function clearRuntimeCachePrefix(prefix: string) {\n  try {\n    for (let index = localStorage.length - 1; index >= 0; index -= 1) {\n      const key = localStorage.key(index)\n      if (key?.startsWith(prefix)) localStorage.removeItem(key)\n    }\n  } catch {\n    // Cache cleanup never blocks app flow.\n  }\n}\n"""
path.write_text(text, encoding='utf-8')

# Offline status makes it explicit when the app is using locally cached data.
Path('src/components/OfflineReadyNotice.tsx').write_text(r'''import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineReadyNotice() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed bottom-[max(1rem,var(--fersys-safe-bottom))] left-1/2 z-[190] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex gap-3">
        <WifiOff size={20} className="mt-0.5 shrink-0 text-amber-300" />
        <div>
          <p className="font-black text-white">Aplikacija je offline</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Prikazuju se zadnje spremljeni investitori i radni nalozi. Nedovršeni radni nalog ostaje spremljen kao nacrt dok se internet ne vrati.</p>
        </div>
      </div>
    </div>
  )
}
''', encoding='utf-8')

path = Path('src/main.tsx')
text = path.read_text(encoding='utf-8')
text = replace_once(text, "import FieldTodayPanel from './components/FieldTodayPanel'\n", "import FieldTodayPanel from './components/FieldTodayPanel'\nimport OfflineReadyNotice from './components/OfflineReadyNotice'\n", 'offline import')
text = replace_once(text, "      <FieldTodayPanel />\n      <ActivityTracker />", "      <FieldTodayPanel />\n      <OfflineReadyNotice />\n      <ActivityTracker />", 'offline mount')
path.write_text(text, encoding='utf-8')

print('pre-release stage two applied')
