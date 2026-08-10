import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const layoutPath = path.join(ROOT, 'src', 'layouts', 'AppLayout.tsx')
const logoPath = path.join(ROOT, 'src', 'components', 'CompanyLogo.tsx')

if (!fs.existsSync(layoutPath)) {
  throw new Error('Nedostaje src/layouts/AppLayout.tsx')
}

if (!fs.existsSync(logoPath)) {
  throw new Error('Nedostaje src/components/CompanyLogo.tsx')
}

let source = fs.readFileSync(layoutPath, 'utf8')

// IMPORTS
if (!source.includes("import CompanyLogo from '../components/CompanyLogo'")) {
  source = source.replace(
    "import OnboardingTutorial from '../components/OnboardingTutorial'\n",
    "import OnboardingTutorial from '../components/OnboardingTutorial'\nimport CompanyLogo from '../components/CompanyLogo'\n",
  )
}

if (!source.includes("from '../services/companyBranding.service'")) {
  source = source.replace(
    "import { supabase } from '../lib/supabase'\n",
    "import { supabase } from '../lib/supabase'\nimport { useCompanyBranding } from '../services/companyBranding.service'\n",
  )
}

// BRANDING HOOK
if (!source.includes('const { branding } =')) {
  source = source.replace(
    /(\s+const\s*\{\s*user,\s*can,\s*\}\s*=\s*useAuth\(\)\s*)/m,
    `$1

  const { branding } =
    useCompanyBranding()
`,
  )
}

// MOBILE PROFILE BUTTON
if (!source.includes('companyName={\n                  branding?.name ||\n                  displayName')) {
  const buttonRegex =
    /<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*setIsProfileMenuOpen\([\s\S]*?aria-label="Otvori korisnički izbornik"[\s\S]*?aria-expanded=\{[\s\S]*?\}\s*>\s*\{initials\}\s*<\/button>/m

  const match = source.match(buttonRegex)

  if (!match) {
    throw new Error(
      'Nisam pronašao mobilni profil gumb. Pošalji screenshot AppLayout.tsx oko "Otvori korisnički izbornik".',
    )
  }

  const replacement = `            <button
              type="button"
              onClick={() =>
                setIsProfileMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={\`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl transition active:scale-95 \${
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
            </button>`

  source = source.replace(buttonRegex, replacement)
}

// MOBILE MENU AVATAR
if (!source.includes('companyName={\n                        branding?.name ||\n                        displayName')) {
  const menuAvatarRegex =
    /<div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white">\s*\{\s*initials\s*\}\s*<\/div>/m

  if (menuAvatarRegex.test(source)) {
    source = source.replace(
      menuAvatarRegex,
      `<CompanyLogo
                      logoUrl={
                        branding?.logoUrl
                      }
                      companyName={
                        branding?.name ||
                        displayName
                      }
                      className="h-11 w-11"
                    />`,
    )
  }
}

// MOBILE MENU COMPANY NAME
const nameRegex =
  /<p className="truncate text-sm font-black text-white">\s*\{\s*displayName\s*\}\s*<\/p>\s*<p className="mt-0\.5 truncate text-xs text-slate-500">\s*\{\s*displayEmail\s*\}\s*<\/p>/m

if (
  !source.includes('branding?.name ||\n                          displayName') &&
  nameRegex.test(source)
) {
  source = source.replace(
    nameRegex,
    `<p className="truncate text-sm font-black text-white">
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
  )
}

fs.writeFileSync(layoutPath, source, 'utf8')

// SAFER CompanyLogo fallback
const companyLogoSource = `import {
  useEffect,
  useState,
} from 'react'

type CompanyLogoProps = {
  logoUrl?: string | null
  companyName: string
  className?: string
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\\\\s+/)
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

fs.writeFileSync(logoPath, companyLogoSource, 'utf8')

const finalSource = fs.readFileSync(layoutPath, 'utf8')

const checks = [
  [
    finalSource.includes("import CompanyLogo from '../components/CompanyLogo'"),
    'CompanyLogo import',
  ],
  [
    finalSource.includes("from '../services/companyBranding.service'"),
    'branding import',
  ],
  [
    finalSource.includes('const { branding } ='),
    'branding hook',
  ],
  [
    finalSource.includes('logoUrl={\n                  branding?.logoUrl'),
    'mobilni header logo',
  ],
]

for (const [ok, name] of checks) {
  if (!ok) {
    throw new Error(`Provjera nije prošla: ${name}`)
  }
}

console.log('')
console.log('✅ Mobilni header sada koristi logo firme')
console.log('✅ Mobilni profil menu koristi logo firme')
console.log('✅ Ako logo ne postoji ostaju inicijali')
console.log('✅ Ako slika loga pukne vraćaju se inicijali')
console.log('')
console.log('Sada pokreni: npm run build')
