import fs from 'node:fs'

function patchFile(path, patches) {
  let source = fs.readFileSync(path, 'utf8')

  for (const [from, to, label] of patches) {
    if (!source.includes(from)) {
      throw new Error(`Patch anchor not found in ${path}: ${label}`)
    }
    source = source.replace(from, to)
  }

  fs.writeFileSync(path, source)
  console.log(`Patched ${path}`)
}

patchFile('src/services/customers.service.ts', [
  [
    "import { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'",
    "import { clearRuntimeCachePrefix, readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'",
    'runtime cache import',
  ],
  [
    "type CustomerRow = {",
    "const CUSTOMERS_CHANGED_EVENT = 'fersys:customers-changed'\n\nfunction notifyCustomersChanged() {\n  clearRuntimeCachePrefix('fersys-cache:customers:')\n\n  if (typeof window !== 'undefined') {\n    window.dispatchEvent(new Event(CUSTOMERS_CHANGED_EVENT))\n  }\n}\n\ntype CustomerRow = {",
    'customer change notifier',
  ],
  [
    "  return mapCustomer(\n    data as CustomerRow,\n  )\n}\n\nexport async function updateCustomer(",
    "  const customer = mapCustomer(\n    data as CustomerRow,\n  )\n\n  notifyCustomersChanged()\n  return customer\n}\n\nexport async function updateCustomer(",
    'create customer refresh',
  ],
  [
    "  return mapCustomer(\n    data as CustomerRow,\n  )\n}\n\n/**\n * Investitore ne brišemo fizički",
    "  const customer = mapCustomer(\n    data as CustomerRow,\n  )\n\n  notifyCustomersChanged()\n  return customer\n}\n\n/**\n * Investitore ne brišemo fizički",
    'update customer refresh',
  ],
  [
    "  if (!data) {\n    throw new Error(\n      'Investitor nije pronađen ili je već obrisan.',\n    )\n  }\n}",
    "  if (!data) {\n    throw new Error(\n      'Investitor nije pronađen ili je već obrisan.',\n    )\n  }\n\n  notifyCustomersChanged()\n}",
    'delete customer refresh',
  ],
])

patchFile('src/pages/DashboardPage.tsx', [
  [
    "  useEffect(() => {\n    let cancelled =\n      false\n\n    void (async () => {",
    "  useEffect(() => {\n    const handleCustomersChanged = () => {\n      try {\n        localStorage.removeItem(\n          cacheKey(companyId),\n        )\n      } catch {\n        // Cache invalidation must never block a live refresh.\n      }\n\n      setRefreshKey(\n        (current) => current + 1,\n      )\n    }\n\n    window.addEventListener(\n      'fersys:customers-changed',\n      handleCustomersChanged,\n    )\n\n    return () => {\n      window.removeEventListener(\n        'fersys:customers-changed',\n        handleCustomersChanged,\n      )\n    }\n  }, [companyId])\n\n  useEffect(() => {\n    let cancelled =\n      false\n\n    void (async () => {",
    'dashboard customer refresh listener',
  ],
])

patchFile('src/components/BusinessFlowActions.tsx', [
  [
    'className="fixed bottom-[calc(9.75rem+var(--fersys-safe-bottom))] right-3 z-[55] inline-flex h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 overflow-hidden rounded-2xl border border-blue-400/20 bg-slate-900/95 px-4 text-sm font-black text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition active:scale-95 md:bottom-6 md:right-6 md:h-12 md:max-w-none"',
    'className="fixed bottom-[calc(5.75rem+var(--fersys-safe-bottom))] right-4 z-[55] inline-flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-blue-400/25 bg-slate-900/95 p-0 text-sm font-black text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition active:scale-95 md:bottom-6 md:right-6 md:h-12 md:w-auto md:rounded-2xl md:px-4"',
    'business flow mobile position',
  ],
  [
    "        <span>\n          Poslovni tok\n        </span>",
    "        <span className=\"hidden md:inline\">\n          Poslovni tok\n        </span>",
    'business flow mobile label',
  ],
  [
    'className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-slate-950"',
    'className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-slate-950 md:static"',
    'business flow badge',
  ],
])

patchFile('src/admin/AdminSupportPage.tsx', [
  [
    "        {[\n          'resolved',\n          'closed',\n        ].includes(status) && (\n          <button\n            type=\"button\"\n            disabled={deleting}\n            onClick={() =>\n              void deleteTicket()\n            }\n            className=\"inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50\"\n          >\n            <Trash2 size={17} />\n            {deleting\n              ? 'Brisanje...'\n              : 'Obriši ticket'}\n          </button>\n        )}",
    "        <button\n          type=\"button\"\n          disabled={deleting}\n          onClick={() =>\n            void deleteTicket()\n          }\n          className=\"inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50\"\n        >\n          <Trash2 size={17} />\n          {deleting\n            ? 'Brisanje...'\n            : 'Obriši ticket'}\n        </button>",
    'always visible ticket delete action',
  ],
])

patchFile('src/utils/offerPdf.ts', [
  [
    "  const finalUnitsCapacity =\n    hasImages\n      ? 5.4\n      : settings.density ===\n          'compact'\n        ? 9.0\n        : 8.2",
    "  const finalUnitsCapacity =\n    hasImages\n      ? 7.2\n      : settings.density ===\n          'compact'\n        ? 9.0\n        : 8.2",
    'offer final page image capacity',
  ],
])

console.log('FERSYS 1.x user-reported polish fixes applied.')
