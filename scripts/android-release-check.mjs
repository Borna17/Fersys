import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const passed = []

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function ok(message) {
  passed.push(message)
}

function fail(message) {
  errors.push(message)
}

console.log('\nFERSYS ANDROID RELEASE QA')
console.log('=========================\n')

const requiredFiles = [
  'dist/index.html',
  'capacitor.config.ts',
  'android/app/build.gradle',
  'vite.config.ts',
  'src/components/GoogleCalendarOAuthBridge.tsx',
  'src/layouts/AppLayout.tsx',
  'src/pages/NewWorkOrderPage.tsx',
  'src/utils/workOrderPdf.ts',
]

for (const file of requiredFiles) {
  if (!exists(file)) fail(`Nedostaje ${file}.`)
}

if (!errors.length) ok('Svi Android release ulazi postoje.')

if (exists('capacitor.config.ts')) {
  const capacitor = read('capacitor.config.ts')
  if (!capacitor.includes("appId: 'com.fersys.app'")) fail('Capacitor appId nije com.fersys.app.')
  if (!capacitor.includes("webDir: 'dist'")) fail("Capacitor webDir nije 'dist'.")
  if (!errors.some((item) => item.includes('Capacitor'))) ok('Capacitor koristi produkcijski appId i dist bundle.')
}

if (exists('android/app/build.gradle')) {
  const gradle = read('android/app/build.gradle')
  if (!gradle.includes('versionCode 9') || !gradle.includes('versionName "1.0.7"')) {
    fail('Android verzija nije 1.0.7 / code 9.')
  } else {
    ok('Android verzija je 1.0.7 / code 9.')
  }
}

if (exists('src/components/GoogleCalendarOAuthBridge.tsx')) {
  const oauth = read('src/components/GoogleCalendarOAuthBridge.tsx')
  const localhostMatches = oauth.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi) || []
  const executableLocalhost = localhostMatches.filter((url) => {
    const index = oauth.indexOf(url)
    const lineStart = oauth.lastIndexOf('\n', index) + 1
    const lineEnd = oauth.indexOf('\n', index)
    const line = oauth.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
    return !line.startsWith('*') && !line.startsWith('//')
  })

  if (executableLocalhost.length) {
    fail(`Google Calendar bridge sadrži izvršni localhost URL: ${executableLocalhost.join(', ')}`)
  } else {
    ok('Google Calendar native OAuth nema izvršni localhost redirect; primjer je samo komentar.')
  }
}

if (exists('vite.config.ts')) {
  const vite = read('vite.config.ts')
  const globBlock = vite.match(/globPatterns:\s*\[([\s\S]*?)\]/)?.[1] || ''
  if (/pdf/i.test(globBlock)) {
    fail('PWA globPatterns uključuje PDF; veliki korisnički priručnik ne smije u precache.')
  } else {
    ok('Veliki PDF priručnik nije uključen u PWA precache globPatterns.')
  }

  if (!vite.includes('maximumFileSizeToCacheInBytes')) {
    fail('PWA nema eksplicitno ograničenje veličine precache datoteka.')
  }
}

if (exists('dist')) {
  const manual = path.join(root, 'dist/FERSYS-Korisnicki-prirucnik.pdf')
  if (fs.existsSync(manual)) {
    const sizeMb = fs.statSync(manual).size / 1024 / 1024
    ok(`Korisnički priručnik je ${sizeMb.toFixed(2)} MB i ostaje download asset, izvan precachea.`)
  }
}

const featureChecks = [
  ['src/layouts/AppLayout.tsx', 'Centar obavijesti'],
  ['src/pages/NewWorkOrderPage.tsx', 'fersys_emergency_new_work_order_v1'],
  ['src/utils/workOrderPdf.ts', 'Automatski raspored PDF-a nije uspio smjestiti sav sadržaj bez rezanja.'],
]

for (const [file, marker] of featureChecks) {
  if (exists(file) && !read(file).includes(marker)) fail(`${file} nema očekivani završni marker: ${marker}`)
}

if (!errors.length) ok('Ključne završne Android funkcije su prisutne u sourceu.')

for (const item of passed) console.log(`✓ ${item}`)

if (errors.length) {
  console.log('\nBLOCKERI\n--------')
  for (const item of errors) console.log(`✗ ${item}`)
  console.log(`\nANDROID RELEASE NIJE SPREMAN · ${errors.length} blocker(a).\n`)
  process.exit(1)
}

console.log('\nANDROID RELEASE QA PROŠAO BEZ BLOCKERA.\n')
