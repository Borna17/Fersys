import fs from 'node:fs'

// Release parity patch v1.0.4 / build 5.
function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, value) {
  fs.writeFileSync(path, value, 'utf8')
}

function replaceOnce(path, from, to) {
  const source = read(path)
  if (source.includes(to)) return false
  if (!source.includes(from)) {
    throw new Error(`Anchor not found in ${path}: ${from}`)
  }
  write(path, source.replace(from, to))
  return true
}

// 1) Mobile notification bell must live in the actual mobile header.
replaceOnce(
  'src/layouts/AppLayout.tsx',
  "import AppUpdatePrompt from '../components/AppUpdatePrompt'\nimport CompanyLogo from '../components/CompanyLogo'",
  "import AppUpdatePrompt from '../components/AppUpdatePrompt'\nimport MobileNotificationBell from '../components/MobileNotificationBell'\nimport CompanyLogo from '../components/CompanyLogo'",
)

replaceOnce(
  'src/layouts/AppLayout.tsx',
  '          <div className="w-11" />',
  '          <MobileNotificationBell />',
)

// 2) Remove the old lazy/floating mount so web and native use one identical bell.
let main = read('src/main.tsx')
main = main.replace(
  "const MobileNotificationBell = lazy(() => import('./components/MobileNotificationBell'))\n",
  '',
)
main = main.replace(
  "      {/* Na mobitelu je ovo jedino zvonce: obavijesti + Što traži pažnju. */}\n      {isMobile && <MobileNotificationBell />}\n\n",
  '',
)
write('src/main.tsx', main)

// 3) The bell is now an inline header control, not an independently fixed overlay.
replaceOnce(
  'src/components/MobileNotificationBell.tsx',
  'className="fersys-mobile-fixed-top fixed z-[85] md:hidden"',
  'className="relative z-[45] md:hidden"',
)

// 4) Prevent the old floating mobile search button from occupying the same top-left slot.
replaceOnce(
  'src/components/GlobalSearch.tsx',
  'className="fixed left-4 top-[calc(0.65rem+env(safe-area-inset-top))] z-[38] grid h-11 w-11 place-items-center rounded-2xl text-slate-400 transition active:bg-slate-800 active:text-white md:hidden"',
  'className="hidden"',
)

// 5) Enforce the intended Play release identity in source.
let gradle = read('android/app/build.gradle')
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 5')
gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "1.0.4"')
write('android/app/build.gradle', gradle)

console.log('Applied FERSYS mobile/native parity patch for Android 1.0.4 (5).')
