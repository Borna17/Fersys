from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# 1) Always use the current FERSYS symbol in the in-app brand header.
p = Path('src/components/Sidebar.tsx')
s = p.read_text(encoding='utf-8')
old = '''      {expanded ? (\n        <img\n          src="/logo.svg"\n          alt="FERSYS Business"\n          className="h-10 w-auto max-w-[165px] object-contain object-left"\n        />\n      ) : (\n        <img\n          src={fersysIcon}\n          alt="FERSYS Business"\n          className="h-11 w-11 shrink-0 object-contain"\n        />\n      )}'''
new = '''      {expanded ? (\n        <div className="flex items-center gap-3">\n          <img\n            src={fersysIcon}\n            alt="FERSYS"\n            className="h-11 w-11 shrink-0 object-contain"\n          />\n          <div className="min-w-0">\n            <div className="text-lg font-black tracking-[0.08em] text-white">FERSYS</div>\n            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Business</div>\n          </div>\n        </div>\n      ) : (\n        <img\n          src={fersysIcon}\n          alt="FERSYS"\n          className="h-11 w-11 shrink-0 object-contain"\n        />\n      )}'''
s = replace_once(s, old, new, 'Sidebar FERSYS brand')
p.write_text(s, encoding='utf-8')

# 2) Show a real FERSYS loading layer in native apps while React/native content settles.
p = Path('src/main.tsx')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "import FieldTodayPanel from './components/FieldTodayPanel'\n",
    "import FieldTodayPanel from './components/FieldTodayPanel'\nimport FersysLoader from './components/FersysLoader'\n",
    'FersysLoader import',
)
anchor = '''function DeferredEnhancements() {'''
loader = '''function NativeStartupLoader() {\n  const [visible, setVisible] = useState(() => isNativeApp())\n\n  useEffect(() => {\n    if (!visible) return\n    const timer = window.setTimeout(() => setVisible(false), 1100)\n    return () => window.clearTimeout(timer)\n  }, [visible])\n\n  if (!visible) return null\n  return <FersysLoader fullScreen text="FERSYS se učitava..." />\n}\n\n'''
s = replace_once(s, anchor, loader + anchor, 'Native startup loader')
s = replace_once(
    s,
    "      <App />\n      <AppLanguageRuntime />",
    "      <App />\n      <NativeStartupLoader />\n      <AppLanguageRuntime />",
    'Native startup loader mount',
)
p.write_text(s, encoding='utf-8')

# 3) Native Work Order download uses the native share/save sheet instead of a browser download.
p = Path('src/pages/WorkOrderDetailsPage.tsx')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "import {\n  useNavigate,\n  useParams,\n} from 'react-router'\n",
    "import {\n  useNavigate,\n  useParams,\n} from 'react-router'\nimport { Capacitor } from '@capacitor/core'\n",
    'Capacitor work order import',
)
old = '''      await Promise.resolve(\n        downloadWorkOrderPdf(\n          canViewPrices\n            ? order\n            : redactWorkOrderPrices(\n                order,\n              ),\n          branding,\n        ),\n      )'''
new = '''      const printableOrder = canViewPrices\n        ? order\n        : redactWorkOrderPrices(order)\n\n      if (Capacitor.isNativePlatform()) {\n        await shareWorkOrderPdf(printableOrder, branding)\n      } else {\n        await Promise.resolve(\n          downloadWorkOrderPdf(printableOrder, branding),\n        )\n      }'''
s = replace_once(s, old, new, 'Native work order PDF download')
p.write_text(s, encoding='utf-8')

# 4) Native Offer download also uses Filesystem + native share/save sheet.
p = Path('src/utils/offerPdf.ts')
s = p.read_text(encoding='utf-8')
s = replace_once(
    s,
    "import { jsPDF } from 'jspdf'\n",
    "import { jsPDF } from 'jspdf'\nimport { Capacitor } from '@capacitor/core'\n",
    'Capacitor offer import',
)
anchor = '''  notifyDownloadPreparing(\n    fileName,\n  )\n\n  try {'''
replacement = '''  notifyDownloadPreparing(\n    fileName,\n  )\n\n  try {\n    if (Capacitor.isNativePlatform()) {\n      const { blob } = await createOfferPdfBlob(data, customSettings)\n      const [{ Filesystem, Directory }, { Share }] = await Promise.all([\n        import('@capacitor/filesystem'),\n        import('@capacitor/share'),\n      ])\n\n      const base64 = await new Promise<string>((resolve, reject) => {\n        const reader = new FileReader()\n        reader.onload = () => {\n          if (typeof reader.result !== 'string') {\n            reject(new Error('PDF nije moguće pripremiti.'))\n            return\n          }\n          resolve(reader.result.split(',')[1] || '')\n        }\n        reader.onerror = () => reject(new Error('PDF nije moguće pripremiti.'))\n        reader.readAsDataURL(blob)\n      })\n\n      const saved = await Filesystem.writeFile({\n        path: `fersys-share/${fileName}`,\n        data: base64,\n        directory: Directory.Cache,\n        recursive: true,\n      })\n\n      await Share.share({\n        title: fileName.replace(/\\.pdf$/i, ''),\n        files: [saved.uri],\n        dialogTitle: 'Spremi ili podijeli PDF ponude',\n      })\n      return\n    }'''
s = replace_once(s, anchor, replacement, 'Native offer PDF download')
p.write_text(s, encoding='utf-8')

# 5) Web notification previews use the current app icon, never the retired Android asset.
for file_name in [
    'src/components/MobileNotificationBell.tsx',
    'supabase/functions/push-notifications/index.ts',
    'supabase/functions/campaign-notifications/index.ts',
]:
    p = Path(file_name)
    if not p.exists():
        continue
    s = p.read_text(encoding='utf-8')
    s = s.replace('/pwa-192x192.png', '/fersys-app-icon-1024.png')
    s = s.replace('/fersys-android-icon-512.png', '/fersys-app-icon-1024.png')
    p.write_text(s, encoding='utf-8')

# 6) Make the left mobile notification slot explicit and resistant to layout shifts.
p = Path('src/layouts/AppLayout.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace(
    '<div className="flex items-center justify-start">\n            <MobileNotificationBell />\n          </div>',
    '<div className="relative z-40 flex min-w-0 items-center justify-start">\n            <MobileNotificationBell />\n          </div>',
    1,
)
p.write_text(s, encoding='utf-8')

print('iOS parity 1.0.11 patch applied')
