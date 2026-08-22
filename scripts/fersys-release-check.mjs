import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const errors = []
const warnings = []
const passed = []

function ok(message) {
  passed.push(message)
}

function fail(message) {
  errors.push(message)
}

function warn(message) {
  warnings.push(message)
}

function exists(relativePath) {
  return fs.existsSync(
    path.join(root, relativePath),
  )
}

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    'utf8',
  )
}

function walk(directory) {
  const absolute =
    path.join(root, directory)

  if (!fs.existsSync(absolute)) {
    return []
  }

  const output = []

  for (
    const entry of
      fs.readdirSync(
        absolute,
        {
          withFileTypes: true,
        },
      )
  ) {
    const relative =
      path.join(
        directory,
        entry.name,
      )

    if (entry.isDirectory()) {
      output.push(
        ...walk(relative),
      )
    } else {
      output.push(relative)
    }
  }

  return output
}

function sourceFiles() {
  return walk('src').filter(
    (file) =>
      /\.(ts|tsx|js|jsx|css|html)$/i.test(
        file,
      ),
  )
}

function lineNumber(
  text,
  index,
) {
  return (
    text
      .slice(0, index)
      .split('\n').length
  )
}

console.log('')
console.log('FERSYS FINAL RELEASE CHECK')
console.log('==========================')
console.log('')

const requiredFiles = [
  'src/components/RealtimeOutlet.tsx',
  'src/components/GlobalSearch.tsx',
  'src/components/BusinessAlerts.tsx',
  'src/components/BusinessFlowActions.tsx',
  'src/components/WorkOrderFieldMode.tsx',
  'src/components/OfflineSyncStatus.tsx',
  'src/components/DailyBriefPanel.tsx',
  'src/components/MobileUxPolish.tsx',
  'src/components/FloatingUiGuard.tsx',
  'src/components/SafeRenderBoundary.tsx',
  'src/components/RuntimeHealthGuard.tsx',
  'src/services/businessReminders.service.ts',
  'src/services/smartFollowUp.service.ts',
  'src/services/dailyBrief.service.ts',
  'src/services/drafts.service.ts',
  'src/services/workOrderField.service.ts',
]

for (const file of requiredFiles) {
  if (!exists(file)) {
    fail(
      `Nedostaje očekivani FERSYS fajl: ${file}`,
    )
  }
}

if (
  requiredFiles.every(exists)
) {
  ok(
    'Sve komponente iz faza 3–11 su prisutne.',
  )
}

const files =
  sourceFiles()

if (!files.length) {
  fail(
    'Nije pronađen src direktorij ili nema source fajlova.',
  )
}

const conflictPattern =
  /^(<<<<<<<|=======|>>>>>>>)/gm

const debuggerPattern =
  /\bdebugger\s*;?/g

const localUrlPattern =
  /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi

/*
 * Važno:
 * Firebase Web API key (AIza...) NIJE server-side tajna.
 * Firebase web konfiguracija se namjerno isporučuje browseru.
 * Zato ga ovdje NE tretiramo kao release blocker.
 */
const hardcodedSecretPatterns = [
  {
    label: 'OpenAI API key',
    regex:
      /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: 'OpenAI project API key',
    regex:
      /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: 'GitHub personal access token',
    regex:
      /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    label: 'Supabase service-role / JWT vrijednost',
    regex:
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  },
]

for (const file of files) {
  const text = read(file)

  for (
    const match of
      text.matchAll(
        conflictPattern,
      )
  ) {
    fail(
      `${file}:${lineNumber(
        text,
        match.index ?? 0,
      )} sadrži Git conflict marker.`,
    )
  }

  for (
    const match of
      text.matchAll(
        debuggerPattern,
      )
  ) {
    fail(
      `${file}:${lineNumber(
        text,
        match.index ?? 0,
      )} sadrži debugger statement.`,
    )
  }

  for (
    const match of
      text.matchAll(
        localUrlPattern,
      )
  ) {
    fail(
      `${file}:${lineNumber(
        text,
        match.index ?? 0,
      )} sadrži production-rizičan lokalni URL: ${match[0]}`,
    )
  }

  for (
    const pattern of
      hardcodedSecretPatterns
  ) {
    for (
      const match of
        text.matchAll(
          pattern.regex,
        )
    ) {
      fail(
        `${file}:${lineNumber(
          text,
          match.index ?? 0,
        )} izgleda kao hardkodirani ${pattern.label}.`,
      )
    }
  }
}

if (
  !errors.some(
    (message) =>
      message.includes(
        'conflict marker',
      ),
  )
) {
  ok(
    'Nema Git conflict markera u sourceu.',
  )
}

if (
  !errors.some(
    (message) =>
      message.includes(
        'debugger statement',
      ),
  )
) {
  ok(
    'Nema debugger statementa u sourceu.',
  )
}

if (
  !errors.some(
    (message) =>
      message.includes(
        'lokalni URL',
      ),
  )
) {
  ok(
    'Nema localhost/127.0.0.1 URL-ova u production sourceu.',
  )
}

if (
  !errors.some(
    (message) =>
      message.includes(
        'hardkodirani',
      ),
  )
) {
  ok(
    'Nisu pronađene očite hardkodirane serverske tajne.',
  )
}

const pwaAssets = [
  'public/favicon.ico',
  'public/favicon-32x32.png',
  'public/favicon-64x64.png',
  'public/apple-touch-icon.png',
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
  'public/pwa-maskable-512x512.png',
  'public/firebase-messaging-sw.js',
]

const missingPwa =
  pwaAssets.filter(
    (file) =>
      !exists(file),
  )

if (missingPwa.length) {
  for (
    const file of
      missingPwa
  ) {
    fail(
      `Nedostaje PWA asset: ${file}`,
    )
  }
} else {
  ok(
    'Svi PWA/favicon asseti iz vite.config.ts postoje.',
  )
}

if (!exists('dist/index.html')) {
  fail(
    'dist/index.html ne postoji. Prvo pokreni npm run build.',
  )
} else {
  ok(
    'Production dist/index.html postoji.',
  )
}

if (exists('dist')) {
  const distFiles =
    walk('dist')

  let totalBytes = 0
  let largest = null

  for (
    const file of
      distFiles
  ) {
    const absolute =
      path.join(root, file)

    const stat =
      fs.statSync(
        absolute,
      )

    if (!stat.isFile()) {
      continue
    }

    totalBytes +=
      stat.size

    if (
      !largest ||
      stat.size >
        largest.size
    ) {
      largest = {
        file,
        size: stat.size,
      }
    }

    if (
      /\.(js|css)$/i.test(
        file,
      ) &&
      stat.size >
        2.5 *
          1024 *
          1024
    ) {
      warn(
        `${file} je ${(
          stat.size /
          1024 /
          1024
        ).toFixed(
          2,
        )} MB. Vrijedi provjeriti bundle splitting.`,
      )
    }

    if (
      stat.size >
      5 *
        1024 *
        1024
    ) {
      fail(
        `${file} je ${(
          stat.size /
          1024 /
          1024
        ).toFixed(
          2,
        )} MB i prelazi PWA maximumFileSizeToCacheInBytes od 5 MB.`,
      )
    }
  }

  ok(
    `Build output: ${(
      totalBytes /
      1024 /
      1024
    ).toFixed(
      2,
    )} MB${
      largest
        ? ` · najveći fajl ${largest.file} (${(
            largest.size /
            1024 /
            1024
          ).toFixed(
            2,
          )} MB)`
        : ''
    }.`,
  )
}

if (
  exists(
    'package.json',
  )
) {
  try {
    const pkg =
      JSON.parse(
        read(
          'package.json',
        ),
      )

    if (
      pkg.scripts?.build !==
      'tsc -b && vite build'
    ) {
      warn(
        'package.json build skripta više nije standardni "tsc -b && vite build". Provjeri je li to namjerna promjena.',
      )
    } else {
      ok(
        'Build radi TypeScript provjeru prije Vite production builda.',
      )
    }

    if (
      !pkg.scripts?.lint
    ) {
      warn(
        'package.json nema lint skriptu.',
      )
    } else {
      ok(
        'ESLint skripta je dostupna.',
      )
    }
  } catch {
    fail(
      'package.json nije valjan JSON.',
    )
  }
}

if (
  exists(
    'src/components/RealtimeOutlet.tsx',
  )
) {
  const realtime =
    read(
      'src/components/RealtimeOutlet.tsx',
    )

  const expectedLayers = [
    'GlobalSearch',
    'OfflineSyncStatus',
    'BusinessAlerts',
    'BusinessFlowActions',
    'WorkOrderFieldMode',
    'DailyBriefPanel',
    'SafeRenderBoundary',
    'RuntimeHealthGuard',
  ]

  for (
    const layer of
      expectedLayers
  ) {
    if (
      !realtime.includes(
        layer,
      )
    ) {
      fail(
        `RealtimeOutlet više ne uključuje ${layer}.`,
      )
    }
  }

  if (
    expectedLayers.every(
      (layer) =>
        realtime.includes(
          layer,
        ),
    )
  ) {
    ok(
      'RealtimeOutlet sadrži sve završne globalne slojeve.',
    )
  }
}

console.log('PROLAZI')
console.log('-------')

for (
  const message of
    passed
) {
  console.log(
    `✓ ${message}`,
  )
}

if (
  warnings.length
) {
  console.log('')
  console.log(
    'UPOZORENJA',
  )
  console.log(
    '----------',
  )

  for (
    const message of
      warnings
  ) {
    console.log(
      `! ${message}`,
    )
  }
}

if (
  errors.length
) {
  console.log('')
  console.log(
    'BLOCKERI',
  )
  console.log(
    '--------',
  )

  for (
    const message of
      errors
  ) {
    console.log(
      `✗ ${message}`,
    )
  }

  console.log('')
  console.log(
    `RELEASE NIJE SPREMAN · ${errors.length} blocker(a).`,
  )

  process.exit(1)
}

console.log('')

console.log(
  warnings.length
    ? `RELEASE PROVJERA PROŠLA · ${warnings.length} upozorenja.`
    : 'RELEASE PROVJERA PROŠLA BEZ BLOCKERA.',
)
