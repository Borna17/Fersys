import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PACKAGE_DIR =
  path.dirname(
    decodeURIComponent(
      new URL(
        import.meta.url,
      ).pathname,
    ),
  )

function normalize(
  value,
) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

function readProject(
  rel,
) {
  const file =
    path.join(
      ROOT,
      rel,
    )

  if (
    !fs.existsSync(file)
  ) {
    throw new Error(
      `Nedostaje ${rel}`,
    )
  }

  return normalize(
    fs.readFileSync(
      file,
      'utf8',
    ),
  )
}

function readPackage(
  name,
) {
  const file =
    path.join(
      PACKAGE_DIR,
      name,
    )

  if (
    !fs.existsSync(file)
  ) {
    throw new Error(
      `U paketu nedostaje ${name}`,
    )
  }

  return normalize(
    fs.readFileSync(
      file,
      'utf8',
    ),
  )
}

function replaceOne(
  source,
  regex,
  replacement,
  label,
) {
  const matches =
    source.match(regex)

  if (!matches) {
    throw new Error(
      `Nisam pronašao dio: ${label}. NIŠTA nije spremljeno.`,
    )
  }

  return source.replace(
    regex,
    replacement,
  )
}

function backup(
  rel,
  source,
) {
  const backupDir =
    path.join(
      ROOT,
      '.fersys-backup-modules',
    )

  const file =
    path.join(
      backupDir,
      rel,
    )

  fs.mkdirSync(
    path.dirname(file),
    {
      recursive: true,
    },
  )

  fs.writeFileSync(
    file,
    source,
    'utf8',
  )
}

function write(
  rel,
  source,
) {
  const file =
    path.join(
      ROOT,
      rel,
    )

  fs.mkdirSync(
    path.dirname(file),
    {
      recursive: true,
    },
  )

  fs.writeFileSync(
    file,
    source,
    'utf8',
  )
}

// --------------------------------------------------
// 0. UČITAJ SVE PRIJE IKAKVOG PISANJA
// --------------------------------------------------
const layoutPath =
  'src/layouts/AppLayout.tsx'

const sidebarPath =
  'src/components/Sidebar.tsx'

const settingsPath =
  'src/pages/SettingsPage.tsx'

const originalLayout =
  readProject(layoutPath)

const originalSidebar =
  readProject(sidebarPath)

const originalSettings =
  readProject(settingsPath)

const modulesService =
  readPackage(
    'companyModules.service.ts',
  )

const moduleModal =
  readPackage(
    'ModuleSetupModal.tsx',
  )

const modulesTab =
  readPackage(
    'ModulesSettingsTab.tsx',
  )

let layout =
  originalLayout

let sidebar =
  originalSidebar

let settings =
  originalSettings

// --------------------------------------------------
// 1. APP LAYOUT
// --------------------------------------------------
if (
  !layout.includes(
    "ModuleSetupModal from '../components/onboarding/ModuleSetupModal'",
  )
) {
  layout =
    replaceOne(
      layout,
      /import CompanyLogo from '\.\.\/components\/CompanyLogo'\n/,
      `import CompanyLogo from '../components/CompanyLogo'
import ModuleSetupModal from '../components/onboarding/ModuleSetupModal'
`,
      'CompanyLogo import u AppLayout',
    )
}

if (
  !layout.includes(
    "useCompanyModules",
  )
) {
  layout =
    replaceOne(
      layout,
      /import \{ useCompanyBranding \} from '\.\.\/services\/companyBranding\.service'\n/,
      `import { useCompanyBranding } from '../services/companyBranding.service'
import { useCompanyModules } from '../services/companyModules.service'
`,
      'companyBranding import u AppLayout',
    )
}

if (
  !/\brole,\n\s*\} = useAuth\(\)/.test(
    layout,
  )
) {
  layout =
    replaceOne(
      layout,
      /const \{\n\s*user,\n\s*can,\n\s*\} = useAuth\(\)/,
      `const {
    user,
    can,
    role,
  } = useAuth()`,
      'useAuth u AppLayout',
    )
}

if (
  !layout.includes(
    'moduleSetupCompleted',
  )
) {
  layout =
    replaceOne(
      layout,
      /  const \{\n\s*hasFeature,\n\s*\} = useSubscription\(\)\n/,
      `  const {
    hasFeature,
  } = useSubscription()

  const {
    enabledModules,
    setupCompleted:
      moduleSetupCompleted,
    isLoading:
      isModulesLoading,
    isPathEnabled,
    save:
      saveCompanyModules,
  } = useCompanyModules()
`,
      'useSubscription u AppLayout',
    )
}

if (
  !layout.includes(
    'isPathEnabled(\n              item.path',
  )
) {
  layout =
    replaceOne(
      layout,
      /mobileNavigation\.filter\(\n\s*\(item\) =>\n\s*can\(\n\s*item\.permission,\n\s*\),\n\s*\),\n\s*\[can\],/,
      `mobileNavigation.filter(
          (item) =>
            can(
              item.permission,
            ) &&
            isPathEnabled(
              item.path,
            ),
        ),
      [
        can,
        isPathEnabled,
      ],`,
      'filter mobilne navigacije',
    )
}

if (
  !layout.includes(
    'isPathEnabled(\n              action.path',
  )
) {
  layout =
    replaceOne(
      layout,
      /quickActions\.filter\(\n\s*\(action\) =>\n\s*can\(\n\s*action\.permission,\n\s*\),\n\s*\),\n\s*\[can\],/,
      `quickActions.filter(
          (action) =>
            can(
              action.permission,
            ) &&
            isPathEnabled(
              action.path,
            ),
        ),
      [
        can,
        isPathEnabled,
      ],`,
      'filter brzih akcija',
    )
}

if (
  !layout.includes(
    '<ModuleSetupModal',
  )
) {
  layout =
    replaceOne(
      layout,
      /\n\s*\{isOnboardingOpen &&\n\s*onboardingProgress && \(\n/,
      `
      <ModuleSetupModal
        open={
          !isModulesLoading &&
          role === 'owner' &&
          !moduleSetupCompleted
        }
        initialModules={
          enabledModules
        }
        onSave={async (
          modules,
        ) => {
          await saveCompanyModules(
            modules,
            true,
          )
        }}
      />

      {moduleSetupCompleted &&
        isOnboardingOpen &&
        onboardingProgress && (
`,
      'render onboardinga',
    )
}

// --------------------------------------------------
// 2. SIDEBAR
// --------------------------------------------------
if (
  !sidebar.includes(
    'useCompanyModules',
  )
) {
  sidebar =
    replaceOne(
      sidebar,
      /import \{\n\s*useCompanyBranding,\n\s*\} from '\.\.\/services\/companyBranding\.service'\n/,
      `import {
  useCompanyBranding,
} from '../services/companyBranding.service'

import {
  useCompanyModules,
} from '../services/companyModules.service'
`,
      'companyBranding import u Sidebaru',
    )
}

if (
  !sidebar.includes(
    'const {\n    isPathEnabled,\n  } = useCompanyModules()',
  )
) {
  sidebar =
    replaceOne(
      sidebar,
      /  const \{\n\s*hasFeature,\n\s*\} = useSubscription\(\)\n/,
      `  const {
    hasFeature,
  } = useSubscription()

  const {
    isPathEnabled,
  } = useCompanyModules()
`,
      'useSubscription u Sidebaru',
    )
}

if (
  !sidebar.includes(
    'isPathEnabled(\n              item.path',
  )
) {
  sidebar =
    replaceOne(
      sidebar,
      /navigationItems\.filter\(\n\s*\(item\) =>\n\s*can\(\n\s*item\.permission,\n\s*\),\n\s*\),\n\s*\[can\],/,
      `navigationItems.filter(
          (item) =>
            can(
              item.permission,
            ) &&
            isPathEnabled(
              item.path,
            ),
        ),
      [
        can,
        isPathEnabled,
      ],`,
      'filter Sidebar navigacije',
    )
}

// --------------------------------------------------
// 3. SETTINGS
// --------------------------------------------------
if (
  !settings.includes(
    'SlidersHorizontal',
  )
) {
  settings =
    replaceOne(
      settings,
      /  LayoutDashboard,\n/,
      `  LayoutDashboard,
  SlidersHorizontal,
`,
      'Settings lucide import',
    )
}

if (
  !settings.includes(
    "ModulesSettingsTab from '../components/settings/ModulesSettingsTab'",
  )
) {
  settings =
    replaceOne(
      settings,
      /import DocumentLivePreview from '\.\.\/components\/settings\/DocumentLivePreview'\n/,
      `import DocumentLivePreview from '../components/settings/DocumentLivePreview'
import ModulesSettingsTab from '../components/settings/ModulesSettingsTab'
`,
      'Settings module component import',
    )
}

if (
  !settings.includes(
    "| 'modules'",
  )
) {
  settings =
    replaceOne(
      settings,
      /type SettingsTab =\n\s*\| 'overview'\n/,
      `type SettingsTab =
  | 'overview'
  | 'modules'
`,
      'SettingsTab type',
    )
}

if (
  !settings.includes(
    "id: 'modules'",
  )
) {
  settings =
    replaceOne(
      settings,
      /  \{\n\s*id: 'company',\n\s*label: 'Tvrtka',\n\s*icon: Building2,\n\s*\},/,
      `  {
    id: 'modules',
    label: 'Moduli',
    icon: SlidersHorizontal,
  },
  {
    id: 'company',
    label: 'Tvrtka',
    icon: Building2,
  },`,
      'Settings tab Tvrtka',
    )
}

if (
  !settings.includes(
    '<ModulesSettingsTab />',
  )
) {
  settings =
    replaceOne(
      settings,
      /\n\s*\{activeTab === 'company' && \(\n/,
      `
        {activeTab === 'modules' && (
          <ModulesSettingsTab />
        )}

        {activeTab === 'company' && (
`,
      'Settings company render',
    )
}

// --------------------------------------------------
// 4. FINALNE PROVJERE
// --------------------------------------------------
const checks = [
  [
    layout.includes(
      "useCompanyModules",
    ),
    'AppLayout import',
  ],
  [
    layout.includes(
      'moduleSetupCompleted',
    ),
    'AppLayout setup state',
  ],
  [
    layout.includes(
      '<ModuleSetupModal',
    ),
    'AppLayout modal',
  ],
  [
    sidebar.includes(
      'useCompanyModules',
    ),
    'Sidebar hook',
  ],
  [
    settings.includes(
      "id: 'modules'",
    ),
    'Settings tab',
  ],
  [
    settings.includes(
      '<ModulesSettingsTab />',
    ),
    'Settings content',
  ],
]

for (
  const [
    ok,
    name,
  ] of checks
) {
  if (!ok) {
    throw new Error(
      `Finalna provjera nije prošla: ${name}. NIŠTA nije spremljeno.`,
    )
  }
}

// --------------------------------------------------
// 5. BACKUP PA TEK ONDA PISANJE
// --------------------------------------------------
backup(
  layoutPath,
  originalLayout,
)

backup(
  sidebarPath,
  originalSidebar,
)

backup(
  settingsPath,
  originalSettings,
)

write(
  layoutPath,
  layout,
)

write(
  sidebarPath,
  sidebar,
)

write(
  settingsPath,
  settings,
)

write(
  'src/services/companyModules.service.ts',
  modulesService,
)

write(
  'src/components/onboarding/ModuleSetupModal.tsx',
  moduleModal,
)

write(
  'src/components/settings/ModulesSettingsTab.tsx',
  modulesTab,
)

console.log('')
console.log('✅ Backup napravljen u .fersys-backup-modules')
console.log('✅ AppLayout povezan s modulima')
console.log('✅ Sidebar povezan s modulima')
console.log('✅ Mobilna navigacija filtrira module')
console.log('✅ Brze akcije filtriraju module')
console.log('✅ Postavke imaju karticu Moduli')
console.log('✅ Novi owner prvo bira što mu treba')
console.log('')
console.log('Sada pokreni: npm run build')
