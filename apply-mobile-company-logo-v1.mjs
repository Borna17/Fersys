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

if (!source.includes('const { branding } =')) {
  source = source.replace(
`  const {
    user,
    can,
  } = useAuth()

`,
`  const {
    user,
    can,
  } = useAuth()

  const { branding } =
    useCompanyBranding()

`,
  )
}

const oldButton = `            <button
              type="button"
              onClick={() =>
                setIsProfileMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={\`grid h-11 w-11 place-items-center rounded-2xl text-xs font-black text-white transition active:scale-95 \${
                isProfileMenuOpen
                  ? 'bg-blue-500 ring-4 ring-blue-500/15'
                  : 'bg-gradient-to-br from-blue-600 to-violet-600'
              }\`}
              title={
                displayName
              }
              aria-label="Otvori korisnički izbornik"
              aria-expanded={
                isProfileMenuOpen
              }
            >
              {initials}
            </button>`

const newButton = `            <button
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

if (source.includes(oldButton)) {
  source = source.replace(oldButton, newButton)
} else if (!source.includes('branding?.logoUrl')) {
  throw new Error('Nisam pronašao mobilni profil gumb za zamjenu.')
}

const oldMenuLogo = `                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white">
                      {
                        initials
                      }
                    </div>`

const newMenuLogo = `                    <CompanyLogo
                      logoUrl={
                        branding?.logoUrl
                      }
                      companyName={
                        branding?.name ||
                        displayName
                      }
                      className="h-11 w-11"
                    />`

if (source.includes(oldMenuLogo)) {
  source = source.replace(oldMenuLogo, newMenuLogo)
}

const oldMenuName = `                      <p className="truncate text-sm font-black text-white">
                        {
                          displayName
                        }
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {
                          displayEmail
                        }
                      </p>`

const newMenuName = `                      <p className="truncate text-sm font-black text-white">
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
                      </p>`

if (source.includes(oldMenuName)) {
  source = source.replace(oldMenuName, newMenuName)
}

fs.writeFileSync(layoutPath, source, 'utf8')

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

console.log('')
console.log('✅ Mobilni header koristi logo firme')
console.log('✅ Mobilni profil menu koristi logo firme')
console.log('✅ Bez loga ostaju inicijali')
console.log('✅ Neispravan logo URL vraća fallback inicijale')
console.log('')
console.log('Sada pokreni: npm run build')
