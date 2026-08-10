import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()

function fromHead(file) {
  try {
    return execFileSync(
      'git',
      ['show', `HEAD:${file}`],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    )
  } catch (error) {
    throw new Error(
      `Ne mogu učitati čistu HEAD verziju datoteke ${file}. Provjeri da si u glavnoj Fersys mapi i da je zadnja ispravna verzija commitana.`,
    )
  }
}

function mustReplace(
  source,
  pattern,
  replacement,
  label,
) {
  if (!pattern.test(source)) {
    throw new Error(
      `Nisam pronašao očekivani dio koda: ${label}. NIŠTA nije spremljeno.`,
    )
  }

  pattern.lastIndex = 0
  return source.replace(
    pattern,
    replacement,
  )
}

const layoutFile =
  'src/layouts/AppLayout.tsx'

const logoFile =
  'src/components/CompanyLogo.tsx'

// VAŽNO:
// Namjerno polazimo od zadnje COMMITANE verzije,
// ne od datoteka koje su prethodne skripte možda djelomično izmijenile.
let layout =
  fromHead(layoutFile)

// 1) CompanyLogo import
layout =
  mustReplace(
    layout,
    /import OnboardingTutorial from '\.\.\/components\/OnboardingTutorial'\r?\n/,
    `import CompanyLogo from '../components/CompanyLogo'
import OnboardingTutorial from '../components/OnboardingTutorial'
`,
    'import OnboardingTutorial',
  )

// 2) Branding hook import
layout =
  mustReplace(
    layout,
    /import \{ supabase \} from '\.\.\/lib\/supabase'\r?\n/,
    `import { supabase } from '../lib/supabase'
import { useCompanyBranding } from '../services/companyBranding.service'
`,
    'supabase import',
  )

// 3) Branding state/hook inside AppLayout
layout =
  mustReplace(
    layout,
    /  const \{\r?\n    user,\r?\n    can,\r?\n  \} = useAuth\(\)\r?\n/,
    `  const {
    user,
    can,
  } = useAuth()

  const { branding } =
    useCompanyBranding()
`,
    'useAuth blok',
  )

// 4) Mobilni profilni gumb:
//    korisnički inicijali -> logo firme.
//    Ako firma nema logo, CompanyLogo automatski prikazuje inicijale firme.
layout =
  mustReplace(
    layout,
    /            <button\r?\n              type="button"\r?\n              onClick=\{\(\) =>\r?\n                setIsProfileMenuOpen\(\r?\n                  \(current\) =>\r?\n                    !current,\r?\n                \)\r?\n              \}\r?\n              className=\{`grid h-11 w-11 place-items-center rounded-2xl text-xs font-black text-white transition active:scale-95 \$\{\r?\n                isProfileMenuOpen\r?\n                  \? 'bg-blue-500 ring-4 ring-blue-500\/15'\r?\n                  : 'bg-gradient-to-br from-blue-600 to-violet-600'\r?\n              \}`\}\r?\n              title=\{\r?\n                displayName\r?\n              \}\r?\n              aria-label="Otvori korisnički izbornik"\r?\n              aria-expanded=\{\r?\n                isProfileMenuOpen\r?\n              \}\r?\n            >\r?\n              \{initials\}\r?\n            <\/button>/,
    `            <button
              type="button"
              onClick={() =>
                setIsProfileMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={\`flex h-11 w-11 items-center justify-center rounded-2xl transition active:scale-95 \${
                isProfileMenuOpen
                  ? 'ring-4 ring-blue-500/20'
                  : ''
              }\`}
              title={
                branding?.name ||
                displayName
              }
              aria-label="Otvori korisnički izbornik"
              aria-expanded={
                isProfileMenuOpen
              }
            >
              <CompanyLogo
                logoUrl={
                  branding?.logoUrl
                }
                companyName={
                  branding?.name ||
                  displayName
                }
                className="h-11 w-11"
              />
            </button>`,
    'mobilni profilni gumb',
  )

// 5) Logo u otvorenom mobilnom profilu
layout =
  mustReplace(
    layout,
    /                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white">\r?\n                      \{\r?\n                        initials\r?\n                      \}\r?\n                    <\/div>/,
    `                    <CompanyLogo
                      logoUrl={
                        branding?.logoUrl
                      }
                      companyName={
                        branding?.name ||
                        displayName
                      }
                      className="h-11 w-11"
                    />`,
    'logo unutar mobilnog profila',
  )

// 6) U profilu prikaži naziv firme, zatim korisnika i e-mail.
layout =
  mustReplace(
    layout,
    /                      <p className="truncate text-sm font-black text-white">\r?\n                        \{\r?\n                          displayName\r?\n                        \}\r?\n                      <\/p>\r?\n\r?\n                      <p className="mt-0\.5 truncate text-xs text-slate-500">\r?\n                        \{\r?\n                          displayEmail\r?\n                        \}\r?\n                      <\/p>/,
    `                      <p className="truncate text-sm font-black text-white">
                        {branding?.name ||
                          displayName}
                      </p>

                      {branding?.name && (
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-300">
                          {displayName}
                        </p>
                      )}

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {
                          displayEmail
                        }
                      </p>`,
    'naziv firme u mobilnom profilu',
  )

// 7) CompanyLogo:
//    - pravi logo kad postoji
//    - inicijali samo kao fallback
//    - fallback i ako URL slike više ne radi
const companyLogo = `import {
  useEffect,
  useState,
} from 'react'

type CompanyLogoProps = {
  logoUrl?: string | null
  companyName: string
  className?: string
}

function getInitials(
  value: string,
) {
  const parts = value
    .trim()
    .split(/\\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'FT'
  }

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? '',
    )
    .join('')
}

export default function CompanyLogo({
  logoUrl,
  companyName,
  className = 'h-11 w-11',
}: CompanyLogoProps) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [logoUrl])

  if (
    logoUrl &&
    !imageFailed
  ) {
    return (
      <span
        className={\`grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white shadow-lg shadow-black/15 \${className}\`}
        title={companyName}
      >
        <img
          src={logoUrl}
          alt={\`Logo tvrtke \${companyName}\`}
          className="h-full w-full object-contain p-1.5"
          onError={() =>
            setImageFailed(true)
          }
        />
      </span>
    )
  }

  return (
    <span
      className={\`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 font-black text-white shadow-lg shadow-blue-950/30 \${className}\`}
      title={companyName}
    >
      {getInitials(companyName)}
    </span>
  )
}
`

// Provjere PRIJE pisanja bilo čega.
const requiredChecks = [
  [
    layout.includes(
      "import CompanyLogo from '../components/CompanyLogo'",
    ),
    'CompanyLogo import',
  ],
  [
    layout.includes(
      "import { useCompanyBranding } from '../services/companyBranding.service'",
    ),
    'useCompanyBranding import',
  ],
  [
    layout.includes(
      'const { branding } =',
    ),
    'branding hook',
  ],
  [
    layout.includes(
      'logoUrl={\n                  branding?.logoUrl',
    ),
    'mobilni header logo',
  ],
  [
    layout.includes(
      'logoUrl={\n                        branding?.logoUrl',
    ),
    'mobilni menu logo',
  ],
]

for (
  const [
    ok,
    label,
  ] of requiredChecks
) {
  if (!ok) {
    throw new Error(
      `Interna provjera nije prošla: ${label}. NIŠTA nije spremljeno.`,
    )
  }
}

// Tek sada zapisujemo obje gotove datoteke.
fs.writeFileSync(
  path.join(ROOT, layoutFile),
  layout,
  'utf8',
)

fs.writeFileSync(
  path.join(ROOT, logoFile),
  companyLogo,
  'utf8',
)

console.log('')
console.log('✅ Učitana čista zadnja commitana verzija s Git-a')
console.log('✅ AppLayout.tsx izmijenjen')
console.log('✅ CompanyLogo.tsx izmijenjen')
console.log('✅ Mobilni header koristi logo firme')
console.log('✅ Mobilni profil koristi logo firme')
console.log('✅ Inicijali ostaju samo fallback')
console.log('')
console.log('Sada pokreni: npm run build')
