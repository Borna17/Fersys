import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-final-mobile-backup', stamp)

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function write(rel, content) {
  const target = path.join(root, rel)
  const backup = path.join(backupRoot, rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(target, backup)
  fs.writeFileSync(target, content, 'utf8')
  console.log(`✓ ${rel}`)
}

function replaceRequired(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text
  if (!text.includes(oldValue)) {
    throw new Error(`Nisam pronašao očekivani dio za: ${label}`)
  }
  return text.replace(oldValue, newValue)
}

function patchInventoryPage() {
  const rel = 'src/pages/InventoryPage.tsx'
  let text = read(rel)

  text = replaceRequired(
    text,
    '<section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">',
    '<section className="mx-auto w-full max-w-[1600px] space-y-4 pb-28 sm:space-y-6 sm:pb-10">',
    'InventoryPage mobile bottom spacing',
  )

  const anchor = `      {filteredItems.length ===\n      0 ? (`
  const mobileButton = `      {canManageInventory && (\n        <div className="fixed inset-x-0 bottom-[calc(4.55rem+env(safe-area-inset-bottom))] z-30 px-3 md:hidden">\n          <button\n            type="button"\n            onClick={() => navigate('/inventory/items/new')}\n            className="mx-auto flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-black text-white shadow-2xl shadow-sky-950/60 active:scale-[0.99]"\n          >\n            <Plus size={20} />\n            Dodaj novi artikl\n          </button>\n        </div>\n      )}\n\n`
  if (!text.includes('Dodaj novi artikl')) {
    if (!text.includes(anchor)) throw new Error('Nisam pronašao mjesto za mobile Novi artikl gumb.')
    text = text.replace(anchor, mobileButton + anchor)
  }

  text = text.replace(
    'className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white active:scale-95 sm:flex sm:w-auto sm:gap-2 sm:px-5"',
    'className="hidden h-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 px-5 text-white active:scale-95 sm:flex sm:gap-2"',
  )
  text = text.replace(
    '<span className="hidden text-sm font-black sm:inline">\n                Novi artikl\n              </span>',
    '<span className="text-sm font-black">\n                Novi artikl\n              </span>',
  )

  write(rel, text)
}

function patchAppLayout() {
  const rel = 'src/layouts/AppLayout.tsx'
  let text = read(rel)

  if (!text.includes('PackagePlus,')) {
    text = replaceRequired(
      text,
      '  Plus,\n  ReceiptText,',
      '  Plus,\n  PackagePlus,\n  ReceiptText,',
      'AppLayout PackagePlus import',
    )
  }

  const vehicleAction = `  {\n    title: 'Novo vozilo',\n    description:\n      'Dodaj vozilo tvrtke',\n    path: '/vehicles?new=1',\n    icon: CarFront,\n    permission:\n      'vehicles.manage',\n  },\n]`
  const inventoryAction = `  {\n    title: 'Novo vozilo',\n    description:\n      'Dodaj vozilo tvrtke',\n    path: '/vehicles?new=1',\n    icon: CarFront,\n    permission:\n      'vehicles.manage',\n  },\n  {\n    title: 'Novi artikl',\n    description:\n      'Dodaj materijal u skladište',\n    path: '/inventory/items/new',\n    icon: PackagePlus,\n    permission:\n      'inventory.manage',\n    feature: 'inventory',\n  },\n]`
  if (!text.includes("title: 'Novi artikl'")) {
    text = replaceRequired(text, vehicleAction, inventoryAction, 'AppLayout inventory quick action')
  }

  text = text.replace(
    'className="relative z-10 w-full rounded-t-[2rem] border-t border-slate-700 bg-slate-900 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"',
    'className="relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] border-t border-slate-700 bg-slate-900 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl"',
  )

  write(rel, text)
}

function patchProfilePage() {
  const rel = 'src/pages/ProfilePage.tsx'
  let text = read(rel)
  text = text.replace(
    '<section className="mx-auto max-w-5xl">',
    '<section className="mx-auto max-w-5xl space-y-4 pb-10 sm:space-y-6">',
  )
  text = text.replace('className="h-28 bg-gradient-to-r', 'className="h-20 bg-gradient-to-r')
  text = text.replace('className="-mt-12 flex flex-col gap-4 px-5 pb-6', 'className="-mt-10 flex flex-col gap-3 px-4 pb-5 sm:-mt-12 sm:gap-4 sm:px-7 sm:pb-6')
  text = text.replace('className="h-24 w-24 rounded-3xl"', 'className="h-20 w-20 rounded-3xl sm:h-24 sm:w-24"')
  text = text.replace('className={`mt-5 flex items-start', 'className={`flex items-start')
  text = text.replace('className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"', 'className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]"')
  text = text.replaceAll('className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950', 'className="h-14 w-full rounded-2xl border border-slate-800 bg-slate-800')
  text = text.replace('className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"', 'className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition active:scale-[0.99] hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"')
  text = text.replace('className="mt-5 inline-flex min-h-11 w-full items-center', 'className="mt-5 inline-flex h-12 w-full items-center')
  write(rel, text)
}

function patchAuthCallback() {
  const rel = 'src/pages/AuthCallbackPage.tsx'
  let text = read(rel)
  text = text.replace(
    '<div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center shadow-2xl shadow-black/50 sm:p-9">',
    '<div className="w-full max-w-md rounded-[1.75rem] border border-slate-800 bg-slate-900 p-5 text-center shadow-2xl shadow-black/50 sm:max-w-lg sm:rounded-3xl sm:p-9">',
  )
  text = text.replaceAll('className="flex min-h-12 items-center justify-center rounded-xl', 'className="flex h-14 items-center justify-center rounded-2xl')
  write(rel, text)
}

function patchNotFound() {
  const rel = 'src/pages/NotFoundPage.tsx'
  let text = read(rel)
  text = text.replace(
    '<main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">',
    '<main className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-5 py-10 text-center text-white">',
  )
  text = text.replace('className="text-7xl font-extrabold text-blue-500"', 'className="text-6xl font-black tracking-tight text-blue-500 sm:text-7xl"')
  text = text.replace('className="mt-4 text-xl text-slate-400"', 'className="mt-4 text-base leading-7 text-slate-400 sm:text-xl"')
  text = text.replace('className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"', 'className="mt-8 flex h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-blue-600 px-6 font-black hover:bg-blue-500"')
  write(rel, text)
}

function patchAdminLayout() {
  const rel = 'src/admin/AdminLayout.tsx'
  let text = read(rel)
  const anchor = `      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">\n        <button`
  const replacement = `      <main className="min-w-0 flex-1 overflow-x-hidden p-3 pb-8 sm:p-6 lg:p-8">\n        <nav className="mb-4 grid grid-cols-4 gap-2 md:hidden">\n          {items.map((item) => {\n            const Icon = item.icon\n\n            return (\n              <NavLink\n                key={item.path}\n                to={item.path}\n                end={item.path === '/admin'}\n                className={({ isActive }) =>\n                  \`flex min-h-[70px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 text-center text-[10px] font-black transition \${\n                    isActive\n                      ? 'border-violet-500/40 bg-violet-600 text-white'\n                      : 'border-slate-800 bg-slate-900 text-slate-400'\n                  }\`\n                }\n              >\n                <Icon size={19} />\n                <span className="w-full truncate">{item.name}</span>\n              </NavLink>\n            )\n          })}\n        </nav>\n\n        <button`
  if (!text.includes('min-h-[70px]')) {
    text = replaceRequired(text, anchor, replacement, 'AdminLayout mobile navigation')
  }
  text = text.replace('className="mb-5 inline-flex min-h-11 items-center', 'className="mb-4 inline-flex min-h-11 items-center')
  write(rel, text)
}

function patchVitePwa() {
  const rel = 'vite.config.ts'
  let text = read(rel)
  const invoiceShortcut = `          {\n            name: 'Novi račun',\n            short_name: 'Račun',\n            url: '/invoices/new',\n            icons: [\n              {\n                src: '/pwa-192x192.png',\n                sizes: '192x192',\n                type: 'image/png',\n              },\n            ],\n          },\n        ],`
  const withInventory = `          {\n            name: 'Novi račun',\n            short_name: 'Račun',\n            url: '/invoices/new',\n            icons: [\n              {\n                src: '/pwa-192x192.png',\n                sizes: '192x192',\n                type: 'image/png',\n              },\n            ],\n          },\n          {\n            name: 'Novi artikl',\n            short_name: 'Artikl',\n            url: '/inventory/items/new',\n            icons: [\n              {\n                src: '/pwa-192x192.png',\n                sizes: '192x192',\n                type: 'image/png',\n              },\n            ],\n          },\n        ],`
  if (!text.includes("short_name: 'Artikl'")) {
    text = replaceRequired(text, invoiceShortcut, withInventory, 'PWA inventory shortcut')
  }
  write(rel, text)
}

function patchIndexCss() {
  const rel = 'src/index.css'
  let text = read(rel)
  if (!text.includes('scroll-padding-bottom')) {
    text += `\n\n/* Mobile/PWA: sadržaj i anchor fokus ne završavaju ispod donje navigacije. */\n@media (max-width: 767px) {\n  html {\n    scroll-padding-bottom: calc(6rem + env(safe-area-inset-bottom));\n  }\n\n  button,\n  [role="button"] {\n    min-width: 0;\n  }\n}\n`
  }
  write(rel, text)
}

const patches = [
  patchInventoryPage,
  patchAppLayout,
  patchProfilePage,
  patchAuthCallback,
  patchNotFound,
  patchAdminLayout,
  patchVitePwa,
  patchIndexCss,
]

console.log('FERSYS final mobile audit patch...')
console.log(`Backup: ${backupRoot}`)

try {
  for (const patch of patches) patch()
  console.log('\n✓ Sve završne mobile izmjene su primijenjene.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('\n✗ Patch je zaustavljen:', error instanceof Error ? error.message : error)
  console.error(`Backup već izmijenjenih datoteka nalazi se u: ${backupRoot}`)
  process.exit(1)
}

