import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const SUPPORT = path.join(ROOT, 'FERSYS_MODULE_SETUP_V1')

function head(file) {
  return execFileSync('git', ['show', `HEAD:${file}`], {
    cwd: ROOT,
    encoding: 'utf8',
  })
}

function need(source, oldText, newText, label) {
  if (!source.includes(oldText)) {
    throw new Error(`Nisam pronašao: ${label}. NIŠTA nije spremljeno.`)
  }
  return source.replace(oldText, newText)
}

function readSupport(name) {
  const p = path.join(SUPPORT, name)
  if (!fs.existsSync(p)) {
    throw new Error(`Nedostaje ${p}`)
  }
  return fs.readFileSync(p, 'utf8')
}

function write(rel, content) {
  const p = path.join(ROOT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content, 'utf8')
}

let layout = head('src/layouts/AppLayout.tsx')
let sidebar = head('src/components/Sidebar.tsx')
let settings = head('src/pages/SettingsPage.tsx')

// APP LAYOUT — prema stvarnom GitHub kodu
layout = need(
  layout,
  "import CompanyLogo from '../components/CompanyLogo'\nimport OnboardingTutorial from '../components/OnboardingTutorial'\n",
  "import CompanyLogo from '../components/CompanyLogo'\nimport ModuleSetupModal from '../components/onboarding/ModuleSetupModal'\nimport OnboardingTutorial from '../components/OnboardingTutorial'\n",
  'AppLayout component import',
)

layout = need(
  layout,
  "import { useCompanyBranding } from '../services/companyBranding.service'\nimport {\n  getOnboardingProgress,\n",
  "import { useCompanyBranding } from '../services/companyBranding.service'\nimport { useCompanyModules } from '../services/companyModules.service'\nimport {\n  getOnboardingProgress,\n",
  'AppLayout service import',
)

layout = need(
  layout,
  "  const {\n    user,\n    can,\n  } = useAuth()\n",
  "  const {\n    user,\n    can,\n    role,\n  } = useAuth()\n",
  'AppLayout useAuth',
)

layout = need(
  layout,
  "  const {\n    hasFeature,\n  } = useSubscription()\n",
  "  const {\n    hasFeature,\n  } = useSubscription()\n\n  const {\n    enabledModules,\n    setupCompleted: moduleSetupCompleted,\n    isLoading: isModulesLoading,\n    isPathEnabled,\n    save: saveCompanyModules,\n  } = useCompanyModules()\n",
  'AppLayout subscription hook',
)

layout = need(
  layout,
  "        mobileNavigation.filter(\n          (item) =>\n            can(\n              item.permission,\n            ),\n        ),\n      [can],\n",
  "        mobileNavigation.filter(\n          (item) =>\n            can(\n              item.permission,\n            ) &&\n            isPathEnabled(\n              item.path,\n            ),\n        ),\n      [can, isPathEnabled],\n",
  'mobile navigation filter',
)

layout = need(
  layout,
  "        quickActions.filter(\n          (action) =>\n            can(\n              action.permission,\n            ),\n        ),\n      [can],\n",
  "        quickActions.filter(\n          (action) =>\n            can(\n              action.permission,\n            ) &&\n            isPathEnabled(\n              action.path,\n            ),\n        ),\n      [can, isPathEnabled],\n",
  'quick actions filter',
)

layout = need(
  layout,
  "      {isOnboardingOpen &&\n        onboardingProgress && (\n",
  "      <ModuleSetupModal\n        open={!isModulesLoading && role === 'owner' && !moduleSetupCompleted}\n        initialModules={enabledModules}\n        onSave={async (modules) => {\n          await saveCompanyModules(modules, true)\n        }}\n      />\n\n      {isOnboardingOpen &&\n        onboardingProgress && (\n",
  'module setup modal',
)

// SIDEBAR
sidebar = need(
  sidebar,
  "import {\n  useCompanyBranding,\n} from '../services/companyBranding.service'\n",
  "import {\n  useCompanyBranding,\n} from '../services/companyBranding.service'\n\nimport {\n  useCompanyModules,\n} from '../services/companyModules.service'\n",
  'Sidebar service import',
)

sidebar = need(
  sidebar,
  "  const {\n    hasFeature,\n  } = useSubscription()\n",
  "  const {\n    hasFeature,\n  } = useSubscription()\n\n  const {\n    isPathEnabled,\n  } = useCompanyModules()\n",
  'Sidebar module hook',
)

sidebar = need(
  sidebar,
  "        navigationItems.filter(\n          (item) =>\n            can(\n              item.permission,\n            ),\n        ),\n      [can],\n",
  "        navigationItems.filter(\n          (item) =>\n            can(\n              item.permission,\n            ) &&\n            isPathEnabled(\n              item.path,\n            ),\n        ),\n      [can, isPathEnabled],\n",
  'Sidebar navigation filter',
)

// SETTINGS
settings = need(
  settings,
  "  LayoutDashboard,\n  LockKeyhole,\n",
  "  LayoutDashboard,\n  LockKeyhole,\n  SlidersHorizontal,\n",
  'Settings icon import',
)

settings = need(
  settings,
  "import DocumentLivePreview from '../components/settings/DocumentLivePreview'\n",
  "import DocumentLivePreview from '../components/settings/DocumentLivePreview'\nimport ModulesSettingsTab from '../components/settings/ModulesSettingsTab'\n",
  'Settings component import',
)

settings = need(
  settings,
  "type SettingsTab =\n  | 'overview'\n  | 'company'\n",
  "type SettingsTab =\n  | 'overview'\n  | 'modules'\n  | 'company'\n",
  'Settings tab type',
)

settings = need(
  settings,
  "  {\n    id: 'company',\n    label: 'Tvrtka',\n    icon: Building2,\n  },\n",
  "  {\n    id: 'modules',\n    label: 'Moduli',\n    icon: SlidersHorizontal,\n  },\n  {\n    id: 'company',\n    label: 'Tvrtka',\n    icon: Building2,\n  },\n",
  'Settings modules tab',
)

settings = need(
  settings,
  "        {activeTab === 'company' && (\n",
  "        {activeTab === 'modules' && (\n          <ModulesSettingsTab />\n        )}\n\n        {activeTab === 'company' && (\n",
  'Settings modules content',
)

// Support files moraju postojati prije ikakvog zapisa
const service = readSupport('companyModules.service.ts')
const modal = readSupport('ModuleSetupModal.tsx')
const modulesTab = readSupport('ModulesSettingsTab.tsx')

// Tek sada zapisujemo
write('src/layouts/AppLayout.tsx', layout)
write('src/components/Sidebar.tsx', sidebar)
write('src/pages/SettingsPage.tsx', settings)
write('src/services/companyModules.service.ts', service)
write('src/components/onboarding/ModuleSetupModal.tsx', modal)
write('src/components/settings/ModulesSettingsTab.tsx', modulesTab)

console.log('')
console.log('✅ AppLayout izmijenjen prema stvarnom GitHub kodu')
console.log('✅ Sidebar povezan s modulima')
console.log('✅ Mobilna navigacija i brze akcije povezane')
console.log('✅ Postavke dobile karticu Moduli')
console.log('✅ Support datoteke raspoređene u src')
console.log('')
console.log('Sada pokreni: npm run build')
