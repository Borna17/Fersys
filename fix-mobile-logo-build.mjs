import fs from 'node:fs'
import path from 'node:path'

const file =
  path.join(
    process.cwd(),
    'src',
    'layouts',
    'AppLayout.tsx',
  )

if (!fs.existsSync(file)) {
  throw new Error(
    'Nedostaje src/layouts/AppLayout.tsx',
  )
}

let source =
  fs.readFileSync(
    file,
    'utf8',
  )

// 1. Makni lokalnu varijablu initials.
// Više nije potrebna jer CompanyLogo sam radi fallback inicijale.
source = source.replace(
  /\r?\n  const initials =\r?\n    getInitials\(\r?\n      displayName,\r?\n    \)\r?\n/,
  '\n',
)

// 2. Makni getInitials helper ako se više nigdje ne koristi.
if (
  !source.includes(
    'getInitials(',
  )
) {
  // već maknuto
} else {
  const withoutHelper =
    source.replace(
      /\r?\nfunction getInitials\(\r?\n  value: string,\r?\n\) \{[\s\S]*?\r?\n\}\r?\n\r?\nexport default function AppLayout\(\) \{/,
      '\nexport default function AppLayout() {',
    )

  source = withoutHelper
}

// Provjera: initials više ne smije postojati kao varijabla.
if (
  /\bconst initials\b/.test(
    source,
  )
) {
  throw new Error(
    'const initials je još uvijek pronađen. Datoteka nije spremljena.',
  )
}

// Provjera: mobilni logo mora ostati.
if (
  !source.includes(
    'branding?.logoUrl',
  ) ||
  !source.includes(
    '<CompanyLogo',
  )
) {
  throw new Error(
    'Mobilni CompanyLogo nije pronađen. Datoteka nije spremljena.',
  )
}

fs.writeFileSync(
  file,
  source,
  'utf8',
)

console.log('')
console.log('✅ Maknut neiskorišteni initials')
console.log('✅ Maknut getInitials helper ako više nije potreban')
console.log('✅ CompanyLogo je ostao netaknut')
console.log('')
console.log('Sada pokreni: npm run build')
